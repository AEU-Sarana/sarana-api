import prisma from '@src/database/client';
import { NotFoundException, ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';

export interface RecordSupplierPaymentInput {
  supplierId: number;
  poId?: number;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  paymentDate?: string;
}

export class SupplierPaymentService {
  static generatePaymentNumber(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PAY-${dateStr}-${rand}`;
  }

  /**
   * Record a payment made to a supplier (paying down debt)
   */
  static async recordPayment(input: RecordSupplierPaymentInput, userId: number) {
    const { supplierId, poId, amount, paymentMethod, referenceNumber, notes, paymentDate } = input;

    if (!supplierId) {
      throw new ValidationException('Supplier ID is required');
    }
    if (!amount || amount <= 0) {
      throw new ValidationException('Payment amount must be greater than 0');
    }
    if (!paymentMethod) {
      throw new ValidationException('Payment method is required');
    }

    const supplier = await prisma.supplier.findUnique({ where: { supplierId } });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    const paymentNum = this.generatePaymentNumber();
    const pDate = paymentDate ? new Date(paymentDate) : new Date();

    const paymentRecord = await prisma.$transaction(async (tx) => {
      // 1. Create payment entry
      const createdPayment = await tx.supplierPayment.create({
        data: {
          paymentNumber: paymentNum,
          supplierId: supplierId,
          poId: poId || null,
          amount,
          paymentMethod: paymentMethod,
          referenceNumber: referenceNumber || null,
          paymentDate: pDate,
          notes: notes || null,
          createdBy: userId,
        },
      });

      // 2. Update specific PO if provided
      if (poId) {
        const po = await tx.purchaseOrder.findUnique({ where: { poId } });
        if (po) {
          const newPaidAmount = Number(po.paidAmount) + amount;
          const newBalanceDue = Math.max(0, Number(po.totalAmount) - newPaidAmount);
          const newPaymentStatus = newBalanceDue <= 0 ? 'PAID' : newPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';

          await tx.purchaseOrder.update({
            where: { poId },
            data: {
              paidAmount: newPaidAmount,
              balanceDue: newBalanceDue,
              paymentStatus: newPaymentStatus,
              updatedAt: new Date(),
            },
          });
        }
      }

      // 3. Update Supplier Total Debt atomically
      const currentDebt = Number(supplier.totalDebt);
      const newTotalDebt = Math.max(0, currentDebt - amount);
      await tx.supplier.update({
        where: { supplierId },
        data: {
          totalDebt: newTotalDebt,
          updatedAt: new Date(),
        },
      });

      return createdPayment;
    });

    await auditLogService.createAuditLog({
      userId,
      action: 'RECORD_SUPPLIER_PAYMENT',
      resource: 'SupplierPayment',
      entityId: paymentRecord.paymentId,
      details: { paymentNum, supplierId, poId, amount, paymentMethod },
    });

    return paymentRecord;
  }

  /**
   * Get Supplier Debt Summary Metrics & Outstanding Debt List
   */
  static async getSupplierDebtOverview() {
    const now = new Date();

    // 1. Total Aggregated Debt across all active suppliers
    const aggregateResult = await prisma.supplier.aggregate({
      _sum: { totalDebt: true },
      where: { isActive: true },
    });
    const totalDebt = Number(aggregateResult._sum.totalDebt || 0);

    // 2. Overdue Debt (POs where paymentStatus != PAID and paymentDueDate < NOW)
    const overduePOs = await prisma.purchaseOrder.findMany({
      where: {
        paymentStatus: { in: ['UNPAID', 'PARTIAL'] },
        paymentDueDate: { lt: now },
      },
      select: { balanceDue: true },
    });
    const overdueDebt = overduePOs.reduce((sum, po) => sum + Number(po.balanceDue), 0);

    // 3. Payments made this month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlyPayments = await prisma.supplierPayment.aggregate({
      _sum: { amount: true },
      where: { paymentDate: { gte: startOfMonth } },
    });
    const paidThisMonth = Number(monthlyPayments._sum.amount || 0);

    // 4. Supplier Debt Breakdown list
    const suppliersWithDebt = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { totalDebt: 'desc' },
      include: {
        purchase_orders: {
          where: { paymentStatus: { in: ['UNPAID', 'PARTIAL'] } },
          select: {
            poId: true,
            poNumber: true,
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

    const supplierDebts = suppliersWithDebt.map((s) => {
      const openPOs = s.purchase_orders;
      const oldestDueDate = openPOs.reduce((oldest: Date | null, po) => {
        if (!po.paymentDueDate) return oldest;
        if (!oldest || po.paymentDueDate < oldest) return po.paymentDueDate;
        return oldest;
      }, null);

      const isOverdue = oldestDueDate ? oldestDueDate < now : false;

      return {
        supplierId: s.supplierId,
        companyName: s.companyName,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        paymentTerms: s.paymentTerms,
        totalDebt: Number(s.totalDebt),
        openPOCount: openPOs.length,
        oldestDueDate,
        isOverdue,
        openPOs: openPOs.map((po) => ({
          poId: po.poId,
          poNumber: po.poNumber,
          totalAmount: Number(po.totalAmount),
          paidAmount: Number(po.paidAmount),
          balanceDue: Number(po.balanceDue),
          paymentStatus: po.paymentStatus,
          dueDate: po.paymentDueDate,
          orderDate: po.orderDate,
        })),
      };
    });

    return {
      metrics: {
        totalDebt,
        overdueDebt,
        paidThisMonth,
      },
      supplierDebts,
    };
  }

  /**
   * Get payment history for a specific supplier or all suppliers
   */
  static async getPaymentHistory(params: {
    supplierId?: number;
    poId?: number;
    page?: number;
    limit?: number;
  }) {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.supplierId) where.supplierId = params.supplierId;
    if (params.poId) where.poId = params.poId;

    const [payments, total] = await Promise.all([
      prisma.supplierPayment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { paymentDate: 'desc' },
        include: {
          supplier: { select: { supplierId: true, companyName: true } },
          purchaseOrder: { select: { poId: true, poNumber: true } },
          user: { select: { userId: true, fullName: true } },
        },
      }),
      prisma.supplierPayment.count({ where }),
    ]);

    return {
      payments: payments.map((p) => ({
        paymentId: p.paymentId,
        paymentNumber: p.paymentNumber,
        supplierId: p.supplierId,
        supplierName: p.supplier?.companyName,
        poId: p.poId,
        poNumber: p.purchaseOrder?.poNumber,
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
