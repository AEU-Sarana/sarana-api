import  prisma  from '@src/database/client';
import { StockService } from '@src/domains/Stock/services/stock.service';
import {
  SyncOrdersRequest,
  SyncOrdersResponse,
  GetSyncStatusRequest,
  GetSyncStatusResponse,
} from '@src/domains/Order/types/order.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';

export class OrderSyncService {
  /**
   * Sync orders from mobile device (batch, idempotent)
   * - UUID-based idempotency (no duplicates)
   * - Auto stock deduction (Stock Out)
   * - Returns sync status per order
   */
  static async syncOrders(
    request: SyncOrdersRequest,
    currentUserId: number
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
        const result = await prisma.$transaction(async (tx) => {
          // Check if order exists by UUID (idempotency)
          const existingOrder = await tx.order.findUnique({
            where: { orderUuid: orderData.order_uuid },
            include: { orderItems: true },
          });

          if (existingOrder) {
            // Update existing order (idempotency: retry safe)
            const updated = await tx.order.update({
              where: { orderId: existingOrder.orderId },
              data: {
                receiptNumber: orderData.receipt_number,
                shiftId: orderData.shift_id,
                sellerId: orderData.seller_id || currentUserId,
                orderDate: new Date(orderData.order_date),
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

              await tx.orderItem.create({
                data: {
                  orderId: updated.orderId,
                  productId: item.product_id,
                  productName: productName,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  discountAmount: item.discount_amount || 0,
                  subtotal: item.subtotal,
                },
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
                orderDate: new Date(orderData.order_date),
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

              await tx.orderItem.create({
                data: {
                  orderId: newOrder.orderId,
                  productId: item.product_id,
                  productName: productName,
                  quantity: item.quantity,
                  unitPrice: item.unit_price,
                  discountAmount: item.discount_amount || 0,
                  subtotal: item.subtotal,
                },
              });
            }

            // Auto stock deduction (Stock Out)
            for (const item of orderData.items) {
              await StockService.stockOut(
                item.product_id,
                item.quantity,
                item.unit_price,
                newOrder.orderId,
                orderData.shift_id,
                currentUserId
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
      } catch (error: any) {
        logger.error('Order sync error', { error: error.message, order_uuid: orderData.order_uuid });
        failedCount++;
        results.push({
          order_uuid: orderData.order_uuid,
          order_id: null,
          status: 'failed',
          error: error.message,
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