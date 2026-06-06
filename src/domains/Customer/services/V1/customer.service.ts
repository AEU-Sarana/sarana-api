import prisma from '@src/database/client';
import {
  ListCustomersRequest,
  ListCustomersResponse,
  CustomerResponse,
  CustomerPurchase,
} from '../../types';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { logger } from '@src/shared/utils/logger';

export class CustomerService {
  /**
   * List customers with pagination, search, and Telegram filter.
   * Includes their aggregated purchase history.
   */
  static async listCustomers(
    request: ListCustomersRequest,
    currentUserId: number
  ): Promise<ListCustomersResponse> {
    const { page = 1, limit = 20, search, telegramFilter = 'all' } = request;

    // Build the query filter
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (telegramFilter === 'linked') {
      where.customerTelegramLink = { isNot: null };
    } else if (telegramFilter === 'unlinked') {
      where.customerTelegramLink = null;
    }

    // Get total count of matching records
    const total = await prisma.customer.count({ where });

    // Fetch paginated customers
    const skip = (page - 1) * limit;
    const dbCustomers = await prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        customerTelegramLink: true,
      },
    });

    // For each customer on the current page, resolve their purchases
    const customers: CustomerResponse[] = await Promise.all(
      dbCustomers.map(async (customer) => {
        let purchases: CustomerPurchase[] = [];
        let lastBuyAt: Date | null = null;
        let totalPaid = 0;

        if (customer.customerTelegramLink) {
          const telegramChatId = customer.customerTelegramLink.telegramChatId;

          // 1. Find all orders delivered to this chat ID
          const deliveries = await prisma.receiptDelivery.findMany({
            where: {
              telegramChatId,
              status: 'SENT',
            },
            select: { orderId: true },
          });

          const orderIds = deliveries.map((d) => d.orderId);

          // 2. Aggregate purchases, sum total paid, and find last delivery date
          if (orderIds.length > 0) {
            const [grouped, paymentsSum, lastDelivery] = await Promise.all([
              prisma.orderItem.groupBy({
                by: ['productId', 'productName'],
                where: {
                  orderId: { in: orderIds },
                },
                _sum: {
                  quantity: true,
                  subtotal: true,
                },
              }),
              prisma.orderPayment.aggregate({
                where: {
                  orderId: { in: orderIds },
                },
                _sum: {
                  receivedAmount: true,
                },
              }),
              prisma.receiptDelivery.findFirst({
                where: {
                  telegramChatId,
                  status: 'SENT',
                },
                orderBy: {
                  sentAt: 'desc',
                },
                select: {
                  sentAt: true,
                },
              }),
            ]);

            purchases = grouped.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item._sum.quantity ?? 0,
              totalSpent: Number(item._sum.subtotal ?? 0),
            }));

            totalPaid = Number(paymentsSum._sum.receivedAmount ?? 0);
            lastBuyAt = lastDelivery?.sentAt ?? null;
          }
        }

        return {
          customerId: customer.customerId,
          fullName: customer.fullName,
          phone: customer.phone,
          email: customer.email,
          deviceId: customer.deviceId,
          telegramLinked: !!customer.customerTelegramLink,
          createdAt: customer.createdAt,
          lastBuyAt,
          totalPaid,
          purchases,
        };
      })
    );

    // Audit log this search/view
    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_CUSTOMERS',
      entityType: 'Customer',
      oldValues: { filters: { search, telegramFilter, page, limit } },
    });

    return {
      customers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
