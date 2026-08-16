import prisma from '@src/database/client';
import {
  ListOrdersRequest,
  ListOrdersResponse,
  GetOrderResponse,
  CreateOrderRequest,
  CreateOrderResponse,
} from '@src/domains/Order/types/order.types';
import { ForbiddenException, NotFoundException, ValidationException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { Role } from '@src/shared/config/permissions';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { ReceiptLinkService } from '@src/domains/Receipt/services/V1/receipt-link.service';
import { ReceiptLinkStatus } from '@src/domains/Receipt/enums/V1/receipt-link-status.enum';
import { TelegramAdminOrderNotifyService } from '@src/domains/TelegramAdminBot/services/telegram-admin-order-notify.service';
import { eventBus } from '@src/shared/events/event-bus';

type CurrentUserContext = {
  userId: number;
  role: string;
};

const ADMIN_ROLES = new Set<string>([
  Role.ADMIN,
  'COMPANY_ADMIN',
  'OWNER',
  'MANAGER',
]);

const isAdminRole = (role?: string): boolean => (role ? ADMIN_ROLES.has(role) : false);

export class OrderService {
  /**
   * List orders with role-based filtering
   * - Seller: Only own orders
   * - Admin: All orders (global list, as multi-tenancy is removed)
   */
  static async listOrders(
    request: ListOrdersRequest,
    currentUser: CurrentUserContext
  ): Promise<ListOrdersResponse> {
    const { page = 1, limit = 50, seller_id, start_date, end_date } = request;
    const { userId: currentUserId, role: currentUserRole } = currentUser;

    const where: any = {};

    // Role-based filtering
    if (currentUserRole === Role.CASHIER) {
      if (seller_id && seller_id !== currentUserId) {
        logger.warn('Order list access denied: seller cannot view other sellers', {
          userId: currentUserId,
          role: currentUserRole,
          orderId: null,
        });
        throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
      }

      where.sellerId = currentUserId;
    } else {
      // Admin and other roles with assigned permission (e.g. RECEIVER)
      if (seller_id) {
        where.sellerId = seller_id;
      }
    }

    if (start_date || end_date) {
      where.orderDate = {};
      if (start_date) where.orderDate.gte = new Date(start_date);
      if (end_date) where.orderDate.lte = new Date(end_date);
    }

    const total = await prisma.order.count({ where });
    const skip = (page - 1) * limit;

    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { orderDate: 'desc' },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
        receipt_links: {
          select: {
            receiptLinkId: true,
            linkStatus: true,
            expiresAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_ORDERS',
      resource: 'Order',
      details: { filters: { seller_id, start_date, end_date } },
    });

    return {
      orders: orders.map((o) => {
        const latestReceiptLink = o.receipt_links[0] || null;

        return {
          order_id: o.orderId,
          receipt_number: o.receiptNumber,
          shift_id: null,
          seller_id: o.sellerId,
          seller_name: o.user?.fullName || null,
          order_date: o.orderDate,
          total_amount: Number(o.totalAmount),
          discount_amount: Number(o.discountAmount),
          tax_amount: Number(o.taxAmount),
          service_fee: Number(o.serviceFee),
          exchange_rate: 4000,
          payment_method: o.paymentMethod,
          has_receipt_link: !!latestReceiptLink,
          receipt_link_status: latestReceiptLink?.linkStatus || null,
          created_at: o.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get order details by ID
   * - Seller: Own orders only
   * - Admin: All orders
   */
  static async getOrder(
    orderId: number,
    currentUser: CurrentUserContext
  ): Promise<GetOrderResponse> {
    const { userId: currentUserId, role: currentUserRole } = currentUser;
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
        order_items: {
          include: {
            product: {
              select: {
                productId: true,
                productName: true,
                productCode: true,
              },
            },
          },
        },
        receipt_links: {
          select: {
            receiptLinkId: true,
            linkStatus: true,
            expiresAt: true,
            code: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        order_payments: {
          select: {
            receivedAmount: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found', 'ORDER_NOT_FOUND');
    }

    // Role-based access control
    if (currentUserRole === Role.CASHIER) {
      if (order.sellerId !== currentUserId) {
        logger.warn('Order access denied: seller cannot view other orders', {
          userId: currentUserId,
          role: currentUserRole,
          orderId,
        });
        throw new ForbiddenException('You do not have permission to access this order', 'ORDER_ACCESS_DENIED');
      }
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_ORDER',
      resource: 'Order',
      entityId: orderId,
    });

    const latestReceiptLink = order.receipt_links[0] || null;
    const receivedAmount = order.order_payments.reduce(
      (sum, payment) => sum + Number(payment.receivedAmount),
      0
    );

    return {
      order_id: order.orderId,
      receipt_number: order.receiptNumber,
      shift_id: null,
      seller_id: order.sellerId,
      seller_name: order.user?.fullName || null,
      order_date: order.orderDate,
      total_amount: Number(order.totalAmount),
      discount_amount: Number(order.discountAmount),
      tax_amount: Number(order.taxAmount),
      service_fee: Number(order.serviceFee),
      exchange_rate: 4000,
      payment_method: order.paymentMethod,
      received_amount: receivedAmount,
      has_receipt_link: !!latestReceiptLink,
      receipt_link_status: latestReceiptLink?.linkStatus || null,
      items: order.order_items.map((item) => ({
        order_item_id: item.orderItemId,
        product_id: item.productId,
        product_name: item.product?.productName || null,
        quantity: item.quantity,
        unit_price: Number(item.unitPrice),
        discount_amount: Number(item.discountAmount),
        subtotal: Number(item.subtotal),
      })),
      created_at: order.createdAt,
    };
  }

  /**
   * Create a simple online order (generates UUID & receipt number automatically)
   */
  static async createOrder(
    request: CreateOrderRequest,
    currentUser: CurrentUserContext
  ): Promise<CreateOrderResponse> {
    // Generate receipt number: RCP-YYYYMMDD-HHMMSS-RAND
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    const receiptNumber = `RCP-${dateStr}-${timeStr}-${rand}`;

    // Calculate sum of item subtotals
    const itemsSubtotal = request.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = itemsSubtotal - (request.discount_amount || 0) + (request.tax_amount || 0) + (request.service_fee || 0);

    const orderId = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          receiptNumber: receiptNumber,
          sellerId: currentUser.userId,
          orderDate: now,
          totalAmount: Number(totalAmount.toFixed(2)),
          discountAmount: request.discount_amount || 0,
          taxAmount: request.tax_amount || 0,
          serviceFee: request.service_fee || 0,
          paymentMethod: request.payment_method,
        },
      });

      // 2. Create order payment record
      const receivedAmountVal = request.received_amount ?? totalAmount;
      await tx.orderPayment.create({
        data: {
          orderId: newOrder.orderId,
          receivedAmount: receivedAmountVal,
        },
      });

      // 3. Process items and decrement stock
      for (const item of request.items) {
        const product = await tx.product.findUnique({
          where: { productId: item.product_id },
          select: { productName: true, lastPurchaseCost: true },
        });
        if (!product) {
          throw new ValidationException(`Product with ID ${item.product_id} not found`);
        }

        const productName = product.productName;
        const fallbackUnitCost = product.lastPurchaseCost != null ? Number(product.lastPurchaseCost) : 0;

        // FIFO Stock Out deduction
        const { totalCost: fifoCOGS } = await StockService.stockOut(
          item.product_id,
          item.quantity,
          item.unit_price,
          newOrder.orderId,
          currentUser.userId,
          tx,
          { allowNegative: true, reason: 'ORDER_CREATE' }
        );

        const finalCOGS = fifoCOGS > 0 ? fifoCOGS : fallbackUnitCost * item.quantity;

        await tx.orderItem.create({
          data: {
            orderId: newOrder.orderId,
            productId: item.product_id,
            productName,
            quantity: item.quantity,
            unitPrice: item.unit_price,
            costPerUnitAtSale: finalCOGS / item.quantity,
            cogsLineTotal: finalCOGS,
            discountAmount: item.discount_amount || 0,
            subtotal: item.subtotal,
          },
        });
      }

      // 4. Generate secure ReceiptLink
      const secureCode = ReceiptLinkService.generateSecureCode();
      await tx.receiptLink.create({
        data: {
          orderId: newOrder.orderId,
          code: secureCode,
          linkStatus: ReceiptLinkStatus.PENDING,
          expiresAt: new Date(Date.now() + 20 * 60 * 1000),
          createdBy: currentUser.userId,
        },
      });

      return newOrder.orderId;
    });

    // Send notifications/events in background
    setImmediate(() => {
      // Trigger Telegram notification
      TelegramAdminOrderNotifyService.notifyOrderSyncSuccess({
        order: {
          receipt_number: receiptNumber,
          order_date: now.toISOString(),
          total_amount: totalAmount,
          discount_amount: request.discount_amount || 0,
          tax_amount: request.tax_amount || 0,
          service_fee: request.service_fee || 0,
          payment_method: request.payment_method,
          received_amount: request.received_amount ?? totalAmount,
          items: request.items.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            subtotal: item.subtotal,
          })),
        },
        status: 'synced',
        orderId: orderId,
        fallbackSellerId: currentUser.userId,
        orderDate: now,
      }).catch((notifyError: unknown) => {
        logger.error('Telegram order notification failed', { error: notifyError });
      });

      // Emit event for real-time receipt printer waits
      eventBus.emit(`order_synced:${orderId}`, { orderId });
    });

    // Create Audit Log
    await auditLogService.createAuditLog({
      userId: currentUser.userId,
      action: 'CREATE_ORDER',
      resource: 'Order',
      entityId: orderId,
      details: { receiptNumber, totalAmount },
    });

    return await this.getOrder(orderId, currentUser);
  }
}
