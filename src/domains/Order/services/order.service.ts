import  prisma  from '@src/database/client';
import {
  ListOrdersRequest,
  ListOrdersResponse,
  GetOrderResponse,
} from '@src/domains/Order/types/order.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { logger } from '@src/shared/utils/logger';
import { auditLogService } from '@src/shared/services/audit-log.service';

export class OrderService {
  /**
   * List orders with role-based filtering
   * - Seller: Only own orders (seller_id from token)
   * - Admin: All orders (can filter by seller_id)
   */
  static async listOrders(
    request: ListOrdersRequest,
    currentUserId: number,
    currentUserRole: string
  ): Promise<ListOrdersResponse> {
    const { page = 1, limit = 50, shift_id, seller_id, start_date, end_date } = request;

    const where: any = {};

    // Role-based filtering
    if (currentUserRole === 'SELLER') {
      where.sellerId = currentUserId; // Seller only sees own orders
    } else if (seller_id) {
      where.sellerId = seller_id; // Admin can filter by seller
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
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_ORDERS',
      resource: 'Order',
      details: { filters: { shift_id, seller_id, start_date, end_date } },
    });

    return {
      orders: orders.map((o) => ({
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
        payment_method: o.paymentMethod,
        created_at: o.createdAt,
      })),
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
   * - Seller: Can only access own orders
   * - Admin: Can access any order
   */
  static async getOrder(
    orderId: number,
    currentUserId: number,
    currentUserRole: string
  ): Promise<GetOrderResponse> {
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
      },
    });

    if (!order) {
      throw new ValidationException('Order not found');
    }

    // Role-based access control
    if (currentUserRole === 'SELLER' && order.sellerId !== currentUserId) {
      throw new ValidationException('You can only access your own orders');
    }

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_ORDER',
      resource: 'Order',
      entityId: orderId,
    });

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
      payment_method: order.paymentMethod,
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