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
  tenantId?: number;
};

const ADMIN_ROLES = new Set<string>([
  Role.ADMIN,
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'OWNER',
  'MANAGER',
]);

const isAdminRole = (role?: string): boolean => (role ? ADMIN_ROLES.has(role) : false);

export class OrderService {
  /**
   * List orders with role-based filtering
   * - Seller: Only own orders
   * - Admin: Orders within the same tenant
   */
  static async listOrders(
    request: ListOrdersRequest,
    currentUser: CurrentUserContext
  ): Promise<ListOrdersResponse> {
    const { page = 1, limit = 50, shift_id, seller_id, start_date, end_date } = request;
    const { userId: currentUserId, role: currentUserRole, tenantId: currentUserTenantId } = currentUser;

    const where: any = {};

    // Role-based filtering
    if (isAdminRole(currentUserRole)) {
      if (currentUserTenantId == null) {
        logger.warn('Order list access denied: missing tenant scope', {
          userId: currentUserId,
          role: currentUserRole,
          userTenant: currentUserTenantId ?? null,
          orderId: null,
          orderTenant: null,
        });
        throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
      }

      where.tenantId = currentUserTenantId;

      if (seller_id) {
        const seller = await prisma.user.findUnique({
          where: { userId: seller_id },
          select: { tenantId: true },
        });

        if (!seller || seller.tenantId !== currentUserTenantId) {
          logger.warn('Order list access denied: seller outside tenant', {
            userId: currentUserId,
            role: currentUserRole,
            userTenant: currentUserTenantId,
            orderId: null,
            orderTenant: seller?.tenantId ?? null,
          });
          throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
        }

        where.sellerId = seller_id;
      }
    } else if (currentUserRole === Role.SELLER) {
      if (seller_id && seller_id !== currentUserId) {
        logger.warn('Order list access denied: seller cannot view other sellers', {
          userId: currentUserId,
          role: currentUserRole,
          userTenant: currentUserTenantId ?? null,
          orderId: null,
          orderTenant: null,
        });
        throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
      }

      where.sellerId = currentUserId;
    } else {
      logger.warn('Order list access denied: unsupported role', {
        userId: currentUserId,
        role: currentUserRole,
        userTenant: currentUserTenantId ?? null,
        orderId: null,
        orderTenant: null,
      });
      throw new ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
    }

    if (shift_id) where.shiftId = shift_id;
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
        shift: {
          select: {
            exchangeRate: true,
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
      details: { filters: { shift_id, seller_id, start_date, end_date } },
    });

    return {
      orders: orders.map((o) => {
        const latestReceiptLink = o.receipt_links[0] || null;

        return {
          order_id: o.orderId,
          order_uuid: o.orderUuid,
          receipt_number: o.receiptNumber,
          shift_id: o.shiftId,
          seller_id: o.sellerId,
          seller_name: o.user?.fullName || null,
          order_date: o.orderDate,
          total_amount: Number(o.totalAmount),
          discount_amount: Number(o.discountAmount),
          tax_amount: Number(o.taxAmount),
          service_fee: Number(o.serviceFee),
          exchange_rate: Number(o.shift?.exchangeRate ?? 4000),
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
   * - Admin: Orders within the same tenant
   */
  static async getOrder(
    orderId: number,
    currentUser: CurrentUserContext
  ): Promise<GetOrderResponse> {
    const { userId: currentUserId, role: currentUserRole, tenantId: currentUserTenantId } = currentUser;
    const order = await prisma.order.findUnique({
      where: { orderId },
      include: {
        user: {
          select: {
            userId: true,
            fullName: true,
          },
        },
        shift: {
          select: {
            exchangeRate: true,
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
    if (currentUserRole === Role.SELLER) {
      if (order.sellerId !== currentUserId) {
        logger.warn('Order access denied: seller cannot view other orders', {
          userId: currentUserId,
          role: currentUserRole,
          userTenant: currentUserTenantId ?? null,
          orderId,
          orderTenant: order.tenantId ?? null,
        });
        throw new ForbiddenException('You do not have permission to access this order', 'ORDER_ACCESS_DENIED');
      }
    } else if (isAdminRole(currentUserRole)) {
      if (currentUserTenantId == null || order.tenantId !== currentUserTenantId) {
        logger.warn('Order access denied: admin tenant mismatch', {
          userId: currentUserId,
          role: currentUserRole,
          userTenant: currentUserTenantId ?? null,
          orderId,
          orderTenant: order.tenantId ?? null,
        });
        throw new ForbiddenException('You do not have permission to access this order', 'ORDER_ACCESS_DENIED');
      }
    } else {
      logger.warn('Order access denied: unsupported role', {
        userId: currentUserId,
        role: currentUserRole,
        userTenant: currentUserTenantId ?? null,
        orderId,
        orderTenant: order.tenantId ?? null,
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
      shift_id: order.shiftId,
      seller_id: order.sellerId,
      seller_name: order.user?.fullName || null,
      order_date: order.orderDate,
      total_amount: Number(order.totalAmount),
      discount_amount: Number(order.discountAmount),
      tax_amount: Number(order.taxAmount),
      service_fee: Number(order.serviceFee),
      exchange_rate: Number(order.shift?.exchangeRate ?? 4000),
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
