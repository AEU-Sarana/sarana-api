import prisma from '@src/database/client';
import { StockService } from '@src/domains/Stock/services/stock.service';
import {
  SyncOrdersRequest,
  SyncOrdersResponse,
  GetSyncStatusRequest,
  GetSyncStatusResponse,
} from '@src/domains/Order/types/order.types';
import { ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { TelegramAdminOrderNotifyService } from '@src/domains/TelegramAdminBot/services/telegram-admin-order-notify.service';
import { parseClientDateTime } from '@src/shared/utils/date-utils';
import { ReceiptLinkService } from '@src/domains/Receipt/services/V1/receipt-link.service';
import { ReceiptLinkStatus } from '@src/domains/Receipt/enums/V1/receipt-link-status.enum';
import { add } from 'date-fns';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class OrderSyncService {
  /**
   * Sync orders from mobile device (batch, idempotent)
   * - UUID-based idempotency (no duplicates)
   * - Auto stock deduction (Stock Out)
   * - Returns sync status per order
   */
  static async syncOrders(
    request: SyncOrdersRequest,
    currentUserId: number,
    currentUserTenantId?: number
  ): Promise<SyncOrdersResponse> {
    const { orders } = request;

    if (!orders || orders.length === 0) {
      throw new ValidationException('Orders array is required');
    }

    const results: Array<{
      order_uuid: string;
      order_id: number | null;
      status: 'synced' | 'updated' | 'failed';
      error?: string;
    }> = [];

    let syncedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    // Process each order in transaction
    for (const orderData of orders) {
      try {
        let orderDate: Date;
        try {
          orderDate = parseClientDateTime(orderData.order_date);
        } catch {
          throw new ValidationException(
            'Invalid order_date. Expected ISO8601 (with timezone) or YYYY-MM-DD HH:mm in Asia/Phnom_Penh.'
          );
        }

        const result = await prisma.$transaction(async (tx) => {
          const productIds = Array.from(
            new Set(orderData.items.map((item) => item.product_id))
          );
          const products = await tx.product.findMany({
            where: { productId: { in: productIds } },
            select: { productId: true, avgCost: true, lastPurchaseCost: true },
          });
          const costMap = new Map(
            products.map((p) => [
              p.productId,
              {
                avgCost: p.avgCost != null ? Number(p.avgCost) : null,
                lastPurchaseCost: p.lastPurchaseCost != null ? Number(p.lastPurchaseCost) : null,
              },
            ])
          );
          const resolveCostPerUnit = (productId: number) => {
            const costInfo = costMap.get(productId);
            if (costInfo?.avgCost != null) return costInfo.avgCost;
            if (costInfo?.lastPurchaseCost != null) return costInfo.lastPurchaseCost;
            logger.warn('Missing avgCost for product, defaulting cost to 0', { productId });
            return 0;
          };

          // Check if order exists by UUID (idempotency)
          const existingOrder = await tx.order.findUnique({
            where: { orderUuid: orderData.order_uuid },
            include: { order_items: true },
          });

          if (existingOrder) {
            // Update existing order (idempotency: retry safe)
            const updated = await tx.order.update({
              where: { orderId: existingOrder.orderId },
              data: {
                receiptNumber: orderData.receipt_number,
                shiftId: orderData.shift_id,
                sellerId: orderData.seller_id || currentUserId,
                ...(currentUserTenantId != null ? { tenantId: currentUserTenantId } : {}),
                orderDate,
                totalAmount: orderData.total_amount,
                discountAmount: orderData.discount_amount || 0,
                taxAmount: orderData.tax_amount || 0,
                serviceFee: orderData.service_fee || 0,
                paymentMethod: orderData.payment_method,
                updatedAt: new Date(),
              },
            });

            // Update order items
            await tx.orderItem.deleteMany({
              where: { orderId: existingOrder.orderId },
            });

            for (const item of orderData.items) {
              // Fetch product name if not provided
              let productName = item.product_name;
              if (!productName) {
                const product = await tx.product.findUnique({
                  where: { productId: item.product_id },
                  select: { productName: true },
                });
                productName = product?.productName || 'Unknown Product';
              }

              const costPerUnitAtSale = resolveCostPerUnit(item.product_id);
              await tx.orderItem.create({
                data: {
                  orderId: updated.orderId,
                  productId: item.product_id,
                  productName: productName,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  costPerUnitAtSale,
                  cogsLineTotal: costPerUnitAtSale * item.quantity,
                  discountAmount: item.discount_amount || 0,
                  subtotal: item.subtotal,
                },
              });
            }

            // SECURE UPGRADE: If existing order has no receipt link, generate one
            const hasLink = await tx.receiptLink.findFirst({
              where: { orderId: existingOrder.orderId }
            });

            if (!hasLink) {
              const secureCode = ReceiptLinkService.generateSecureCode();
              await tx.receiptLink.create({
                data: {
                  orderId: existingOrder.orderId,
                  code: secureCode,
                  linkStatus: ReceiptLinkStatus.PENDING,
                  expiresAt: add(new Date(), { minutes: 20 }),
                  createdBy: currentUserId,
                }
              });
            }

            updatedCount++;
            return {
              order_uuid: orderData.order_uuid,
              order_id: updated.orderId,
              status: 'updated' as const,
            };
          } else {
            // Create new order
            const newOrder = await tx.order.create({
              data: {
                orderUuid: orderData.order_uuid,
                receiptNumber: orderData.receipt_number,
                shiftId: orderData.shift_id,
                sellerId: orderData.seller_id || currentUserId,
                ...(currentUserTenantId != null ? { tenantId: currentUserTenantId } : {}),
                orderDate,
                totalAmount: orderData.total_amount,
                discountAmount: orderData.discount_amount || 0,
                taxAmount: orderData.tax_amount || 0,
                serviceFee: orderData.service_fee || 0,
                paymentMethod: orderData.payment_method,
              },
            });

            // Create order items
            for (const item of orderData.items) {
              // Fetch product name if not provided
              let productName = item.product_name;
              if (!productName) {
                const product = await tx.product.findUnique({
                  where: { productId: item.product_id },
                  select: { productName: true },
                });
                productName = product?.productName || 'Unknown Product';
              }

              const costPerUnitAtSale = resolveCostPerUnit(item.product_id);
              await tx.orderItem.create({
                data: {
                  orderId: newOrder.orderId,
                  productId: item.product_id,
                  productName: productName,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  costPerUnitAtSale,
                  cogsLineTotal: costPerUnitAtSale * item.quantity,
                  discountAmount: item.discount_amount || 0,
                  subtotal: item.subtotal,
                },
              });
            }

            // 3. SECURE UPGRADE: Automatically generate a secure ReceiptLink for new orders
            const secureCode = ReceiptLinkService.generateSecureCode();
            await tx.receiptLink.create({
              data: {
                orderId: newOrder.orderId,
                code: secureCode,
                linkStatus: ReceiptLinkStatus.PENDING,
                expiresAt: add(new Date(), { minutes: 20 }),
                createdBy: currentUserId,
              }
            });

            // Auto stock deduction (Stock Out)
            for (const item of orderData.items) {
              await StockService.stockOut(
                item.product_id,
                item.quantity,
                item.unit_price,
                newOrder.orderId,
                orderData.shift_id,
                currentUserId,
                tx,
                { allowNegative: true, reason: 'ORDER_SYNC' }
              );
            }

            syncedCount++;
            return {
              order_uuid: orderData.order_uuid,
              order_id: newOrder.orderId,
              status: 'synced' as const,
            };
          }
        });

        results.push(result);

        await auditLogService.createAuditLog({
          userId: currentUserId,
          action: 'SYNC_ORDER',
          resource: 'Order',
          entityId: result.order_id || 0,
          details: { order_uuid: orderData.order_uuid, status: result.status },
        });

        if (result.status === 'synced' || result.status === 'updated') {
          setImmediate(() => {
            TelegramAdminOrderNotifyService.notifyOrderSyncSuccess({
              order: orderData,
              status: result.status,
              orderId: result.order_id || undefined,
              fallbackSellerId: currentUserId,
              orderDate,
            }).catch((notifyError: unknown) => {
              logger.error('Telegram admin notify error', {
                error: notifyError instanceof Error ? notifyError.message : String(notifyError),
                order_uuid: orderData.order_uuid,
              });
            });
          });
        }
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error);
        logger.error('Order sync error', { error: errorMessage, order_uuid: orderData.order_uuid });
        failedCount++;
        results.push({
          order_uuid: orderData.order_uuid,
          order_id: null,
          status: 'failed',
          error: errorMessage,
        });
      }
    }

    return {
      synced: syncedCount,
      updated: updatedCount,
      failed: failedCount,
      orders: results,
    };
  }

  /**
   * Get sync status for orders by UUIDs
   */
  static async getSyncStatus(
    request: GetSyncStatusRequest
  ): Promise<GetSyncStatusResponse> {
    const { order_uuids } = request;

    if (!order_uuids || order_uuids.length === 0) {
      throw new ValidationException('Order UUIDs array is required');
    }

    const orders = await prisma.order.findMany({
      where: {
        orderUuid: { in: order_uuids },
      },
      select: {
        orderId: true,
        orderUuid: true,
      },
    });

    const syncedUuids = new Set(orders.map((o) => o.orderUuid));
    const statuses = order_uuids.map((uuid) => {
      const order = orders.find((o) => o.orderUuid === uuid);
      return {
        order_uuid: uuid,
        synced: !!order,
        order_id: order?.orderId || null,
      };
    });

    return { statuses };
  }
}
