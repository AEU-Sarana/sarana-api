import prisma from '@src/database/client';
import {
  ListCustomersRequest,
  ListCustomersResponse,
  CustomerResponse,
  CustomerPurchase,
  CreateCustomerPayload,
  UpdateCustomerPayload,
} from '../../types';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';

export class CustomerService {
  /**
   * List customers with pagination, search, and calculated metrics.
   */
  static async listCustomers(
    request: ListCustomersRequest,
    currentUserId: number
  ): Promise<ListCustomersResponse> {
    const { page = 1, limit = 20, search } = request;

    // Build the query filter
    const where: any = {};

    if (search && search !== 'undefined' && search.trim()) {
      const searchTerm = search.trim();
      where.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { phone: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Get total count of matching records
    const total = await prisma.customer.count({ where });

    // Fetch paginated customers with order details
    const skip = (page - 1) * limit;
    const dbCustomers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      include: {
        orders: {
          where: { orderStatus: 'COMPLETED' },
          select: {
            orderId: true,
            orderDate: true,
            paidAmount: true,
            totalAmount: true,
            order_items: {
              select: {
                productId: true,
                productName: true,
                quantity: true,
                subtotal: true,
              },
            },
          },
          orderBy: { orderDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const customers: CustomerResponse[] = dbCustomers.map((customer: any) => {
      const orders = customer.orders || [];
      const totalPaid = orders.reduce((sum: number, o: any) => sum + Number(o.paidAmount || 0), 0);
      const lastBuyAt = orders.length > 0 ? orders[0].orderDate : null;

      // Consolidate purchases per product
      const productMap: Record<number, CustomerPurchase> = {};
      orders.forEach((o: any) => {
        (o.order_items || []).forEach((item: any) => {
          if (!productMap[item.productId]) {
            productMap[item.productId] = {
              productId: item.productId,
              productName: item.productName,
              quantity: 0,
              totalSpent: 0,
            };
          }
          productMap[item.productId].quantity += item.quantity;
          productMap[item.productId].totalSpent += Number(item.subtotal || 0);
        });
      });

      return {
        customerId: customer.customerId,
        fullName: customer.fullName,
        phone: customer.phone,
        email: customer.email,
        deviceId: customer.deviceId,
        totalDebt: Number(customer.totalDebt || 0),
        createdAt: customer.createdAt,
        lastBuyAt,
        totalPaid,
        ordersCount: orders.length,
        purchases: Object.values(productMap).sort((a, b) => b.totalSpent - a.totalSpent),
      };
    });

    // Audit log this search/view
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_CUSTOMERS',
      entityType: 'Customer',
      oldValues: { filters: { search, page, limit } },
    });

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Create a new customer
   */
  static async createCustomer(
    payload: CreateCustomerPayload,
    currentUserId: number
  ) {
    const customer = await prisma.customer.create({
      data: {
        fullName: payload.full_name.trim(),
        phone: payload.phone ? payload.phone.trim() : null,
        email: payload.email ? payload.email.trim() : null,
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CREATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customer.customerId,
      newValues: payload as any,
    });

    return customer;
  }

  /**
   * Update existing customer
   */
  static async updateCustomer(
    customerId: number,
    payload: UpdateCustomerPayload,
    currentUserId: number
  ) {
    const existing = await prisma.customer.findUnique({
      where: { customerId },
    });
    if (!existing) {
      const error: any = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.customer.update({
      where: { customerId },
      data: {
        fullName: payload.full_name !== undefined ? payload.full_name.trim() : existing.fullName,
        phone: payload.phone !== undefined ? (payload.phone ? payload.phone.trim() : null) : existing.phone,
        email: payload.email !== undefined ? (payload.email ? payload.email.trim() : null) : existing.email,
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'UPDATE_CUSTOMER',
      entityType: 'Customer',
      entityId: customerId,
      oldValues: { fullName: existing.fullName, phone: existing.phone, email: existing.email },
      newValues: payload as any,
    });

    return updated;
  }

  /**
   * Get single customer details with order timeline and payment history
   */
  static async getCustomerDetails(customerId: number) {
    const customer = await prisma.customer.findUnique({
      where: { customerId },
      include: {
        orders: {
          orderBy: { orderDate: 'desc' },
          take: 20,
          include: {
            order_items: true,
          },
        },
        customer_payments: {
          orderBy: { paymentDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!customer) {
      const error: any = new Error('Customer not found');
      error.statusCode = 404;
      throw error;
    }

    const completedOrders = (customer.orders || []).filter((o: any) => o.orderStatus === 'COMPLETED');
    const totalPaid = completedOrders.reduce((sum: number, o: any) => sum + Number(o.paidAmount || 0), 0);
    const lastBuyAt = completedOrders.length > 0 ? completedOrders[0].orderDate : null;

    return {
      customerId: customer.customerId,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      deviceId: customer.deviceId,
      totalDebt: Number(customer.totalDebt || 0),
      createdAt: customer.createdAt,
      lastBuyAt,
      totalPaid,
      ordersCount: completedOrders.length,
      orders: customer.orders,
      customerPayments: customer.customer_payments,
    };
  }
}
