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
   * List customers with pagination and search.
   */
  static async listCustomers(
    request: ListCustomersRequest,
    currentUserId: number
  ): Promise<ListCustomersResponse> {
    const { page = 1, limit = 20, search } = request;

    // Build the query filter
    const where: any = {};

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
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
    });

    const customers: CustomerResponse[] = dbCustomers.map((customer) => ({
      customerId: customer.customerId,
      fullName: customer.fullName,
      phone: customer.phone,
      email: customer.email,
      deviceId: customer.deviceId,
      createdAt: customer.createdAt,
      lastBuyAt: null,
      totalPaid: 0,
      purchases: [],
    }));

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
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
