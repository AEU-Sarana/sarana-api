import prisma from '@src/database/client';
import {
  ListOrdersRequest,
  ListOrdersResponse,
  GetOrderResponse,
} from '@src/domains/Order/types/order.types';
import { ForbiddenException, NotFoundException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { Role } from '@src/shared/config/permissions';

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
    if (isAdminRole(currentUserRole)) {
      if (seller_id) {
        where.sellerId = seller_id;
      }
    } else if (currentUserRole === Role.CASHIER) {
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
      logger.warn('Order list access denied: unsupported role', {
        userId: currentUserId,
        role: currentUserRole,
        orderId: null,
      });
      throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
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
          order_uuid: o.orderUuid,
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
    } else if (isAdminRole(currentUserRole)) {
      // Admins have global access as multi-tenancy is removed
    } else {
      logger.warn('Order access denied: unsupported role', {
        userId: currentUserId,
        role: currentUserRole,
        orderId,
      });
      throw new ForbiddenException('You do not have permission to access this order', 'ORDER_ACCESS_DENIED');
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
      order_uuid: order.orderUuid,
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
}
