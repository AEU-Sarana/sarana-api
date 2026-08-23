import prisma from '@src/database/client';
import { NotFoundException, ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';

export interface RecordCustomerPaymentInput {
  customerId: number;
  orderId?: number;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate?: string;
}

export class CustomerPaymentService {
  static generatePaymentNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `CPAY-${dateStr}-${rand}`;
  }

  /**
   * Record a debt repayment made by a customer
   */
  static async recordPayment(input: RecordCustomerPaymentInput, userId: number) {
    const { customerId, orderId, amount, paymentMethod, referenceNumber, notes, paymentDate } = input;

    if (!customerId) {
      throw new ValidationException('Customer ID is required');
    }
    if (!amount || amount <= 0) {
      throw new ValidationException('Payment amount must be greater than 0');
    }
    if (!paymentMethod) {
      throw new ValidationException('Payment method is required');
    }

    const customer = await prisma.customer.findUnique({ where: { customerId } });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const paymentNum = this.generatePaymentNumber();
    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    const paymentRecord = await prisma.$transaction(async (tx) => {
      // 1. Create payment entry
      const createdPayment = await tx.customerPayment.create({
        data: {
          paymentNumber: paymentNum,
          customerId: customerId,
          orderId: orderId || null,
          amount,
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber || null,
          paymentDate: pDate,
          notes: notes || null,
          createdBy: userId,
        },
      });

      // 2. Update specific Order if provided
      if (orderId) {
        const order = await tx.order.findUnique({ where: { orderId } });
        if (order) {
          const newPaidAmount = Number(order.paidAmount) + amount;
          const newBalanceDue = Math.max(0, Number(order.totalAmount) - newPaidAmount);
          const newPaymentStatus = newBalanceDue <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

          await tx.order.update({
            where: { orderId },
            data: {
              paidAmount: newPaidAmount,
              balanceDue: newBalanceDue,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date(),
            },
          });
        }
      }

      // 3. Update Customer Total Debt atomically
      const currentDebt = Number(customer.totalDebt);
      const newTotalDebt = Math.max(0, currentDebt - amount);
      await tx.customer.update({
        where: { customerId },
        data: {
          totalDebt: newTotalDebt,
          updatedAt: new Date(),
        },
      });

      return createdPayment;
    });

    await auditLogService.createAuditLog({
      userId,
      action: 'RECORD_CUSTOMER_PAYMENT',
      resource: 'CustomerPayment',
      entityId: paymentRecord.paymentId,
      details: { paymentNum, customerId, orderId, amount, paymentMethod },
    });

    return paymentRecord;
  }

  /**
   * Get Customer Debt Summary Metrics & Outstanding Debt List
   */
  static async getCustomerDebtOverview() {
    const now = new Date();

    // 1. Total Aggregated Customer Debt
    const aggregateResult = await prisma.customer.aggregate({
      _sum: { totalDebt: true },
    });
    const totalDebt = Number(aggregateResult._sum.totalDebt || 0);

    // 2. Overdue Customer Debt (Orders where paymentStatus != PAID and paymentDueDate < NOW)
    const overdueOrders = await prisma.order.findMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        paymentDueDate: { lt: now },
      },
      select: { balanceDue: true },
    });
    const overdueDebt = overdueOrders.reduce((sum, o) => sum + Number(o.balanceDue), 0);

    // 3. Debt collected this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPayments = await prisma.customerPayment.aggregate({
      _sum: { amount: true },
      where: { paymentDate: { gte: startOfMonth } },
    });
    const collectedThisMonth = Number(monthlyPayments._sum.amount || 0);

    // 4. Customer Debt Breakdown list
    const customersWithDebt = await prisma.customer.findMany({
      where: { totalDebt: { gt: 0 } },
      orderBy: { totalDebt: 'desc' },
      include: {
        orders: {
          where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
          select: {
            orderId: true,
            receiptNumber: true,
            totalAmount: true,
            paidAmount: true,
            balanceDue: true,
            paymentStatus: true,
            paymentDueDate: true,
            orderDate: true,
          },
        },
      },
    });

    const customerDebts = customersWithDebt.map((c) => {
      const openOrders = c.orders;
      const oldestDueDate = openOrders.reduce((oldest: Date | null, o) => {
        if (!o.paymentDueDate) return oldest;
        if (!oldest || o.paymentDueDate < oldest) return o.paymentDueDate;
        return oldest;
      }, null);

      const isOverdue = oldestDueDate ? oldestDueDate < now : false;

      return {
        customerId: c.customerId,
        fullName: c.fullName || 'Anonymous Customer',
        phone: c.phone,
        email: c.email,
        totalDebt: Number(c.totalDebt),
        openOrderCount: openOrders.length,
        oldestDueDate,
        isOverdue,
        openOrders: openOrders.map((o) => ({
          orderId: o.orderId,
          receiptNumber: o.receiptNumber,
          totalAmount: Number(o.totalAmount),
          paidAmount: Number(o.paidAmount),
          balanceDue: Number(o.balanceDue),
          paymentStatus: o.paymentStatus,
          dueDate: o.paymentDueDate,
          orderDate: o.orderDate,
        })),
      };
    });

    return {
      metrics: {
        totalDebt,
        overdueDebt,
        collectedThisMonth,
      },
      customerDebts,
    };
  }

  /**
   * Get payment history for customer debt repayments
   */
  static async getPaymentHistory(params: {
    customerId?: number;
    orderId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.customerId) where.customerId = params.customerId;
    if (params.orderId) where.orderId = params.orderId;

    const [payments, total] = await Promise.all([
      prisma.customerPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          customer: { select: { customerId: true, fullName: true, phone: true } },
          order: { select: { orderId: true, receiptNumber: true } },
          user: { select: { userId: true, fullName: true } },
        },
      }),
      prisma.customerPayment.count({ where }),
    ]);

    return {
      payments: payments.map((p) => ({
        paymentId: p.paymentId,
        paymentNumber: p.paymentNumber,
        customerId: p.customerId,
        customerName: p.customer?.fullName || `Customer #${p.customerId}`,
        customerPhone: p.customer?.phone,
        orderId: p.orderId,
        receiptNumber: p.order?.receiptNumber,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        paymentDate: p.paymentDate,
        notes: p.notes,
        createdBy: p.createdBy,
        createdByName: p.user?.fullName,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
