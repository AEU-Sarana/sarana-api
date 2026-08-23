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
          has_receipt_link: false,
          receipt_link_status: null,
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
      has_receipt_link: false,
      receipt_link_status: null,
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
    const totalAmount = Number((itemsSubtotal - (request.discount_amount || 0) + (request.tax_amount || 0) + (request.service_fee || 0)).toFixed(2));

    // Calculate Payment & Customer Debt
    let initialPaidAmount = totalAmount;
    if (request.payment_type === 'DEBT') {
      initialPaidAmount = 0;
    } else if (request.payment_type === 'PARTIAL') {
      initialPaidAmount = Math.min(request.initial_paid_amount || 0, totalAmount);
    } else if (request.payment_type === 'PAID') {
      initialPaidAmount = totalAmount;
    } else {
      initialPaidAmount = Math.min(request.initial_paid_amount ?? request.received_amount ?? totalAmount, totalAmount);
    }

    const balanceDue = Math.max(0, totalAmount - initialPaidAmount);
    const paymentStatus = balanceDue <= 0 ? 'PAID' : initialPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
    const dueDate = request.payment_due_date ? new Date(request.payment_due_date) : (balanceDue > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null);

    const orderId = await prisma.$transaction(async (tx) => {
      // 1. Create order
      const newOrder = await tx.order.create({
        data: {
          receiptNumber: receiptNumber,
          sellerId: currentUser.userId,
          customerId: request.customer_id || null,
          orderDate: now,
          totalAmount: totalAmount,
          paidAmount: initialPaidAmount,
          balanceDue: balanceDue,
          paymentStatus: paymentStatus,
          paymentDueDate: dueDate,
          discountAmount: request.discount_amount || 0,
          taxAmount: request.tax_amount || 0,
          serviceFee: request.service_fee || 0,
          paymentMethod: request.payment_method,
        },
      });

      // 2. Update Customer Total Debt if balance due > 0
      if (request.customer_id && balanceDue > 0) {
        await tx.customer.update({
          where: { customerId: request.customer_id },
          data: {
            totalDebt: { increment: balanceDue },
            updatedAt: now,
          },
        });
      }

      // 3. Create order payment record
      const receivedAmountVal = request.received_amount ?? initialPaidAmount;
      await tx.orderPayment.create({
        data: {
          orderId: newOrder.orderId,
          receivedAmount: receivedAmountVal,
        },
      });

      // 4. Record initial customer debt repayment if deposit paid
      if (request.customer_id && initialPaidAmount > 0 && balanceDue > 0) {
        const cpayRand = Math.random().toString(36).slice(2, 6).toUpperCase();
        await tx.customerPayment.create({
          data: {
            paymentNumber: `CPAY-${dateStr}-${cpayRand}`,
            customerId: request.customer_id,
            orderId: newOrder.orderId,
            amount: initialPaidAmount,
            paymentMethod: request.payment_method,
            notes: 'Initial deposit paid at POS checkout',
            createdBy: currentUser.userId,
          },
        });
      }

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
