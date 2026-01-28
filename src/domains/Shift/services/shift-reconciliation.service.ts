import prisma from '@src/database/client';
import { ValidationException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { GetShiftReconciliationResponse } from '@src/domains/Shift/types/shift.types';

export class ShiftReconciliationService {
  static async getReconciliation(shiftId: number, currentUserId: number): Promise<GetShiftReconciliationResponse> {
    const shift = await prisma.shift.findUnique({ where: { shiftId } });
    if (!shift) throw new ValidationException('Shift not found');

    const ordersAgg = await prisma.order.aggregate({
      where: { shiftId },
      _count: { orderId: true },
      _sum: { totalAmount: true },
    });

    // Example: summarize sold quantities by product from order_items
    const soldByProduct = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: { order: { shiftId } },
      _sum: { quantity: true },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_SHIFT_RECONCILIATION',
      resource: 'Shift',
      entityId: shiftId,
    });

    const expectedCash = Number(shift.expectedCash ?? 0);
    const actualCash = Number(shift.actualCash ?? 0);

    return {
      shift_id: shiftId,
      reconciliation: {
        expected_cash: expectedCash,
        actual_cash: actualCash,
        difference: actualCash - expectedCash,
        orders_summary: {
          total_orders: ordersAgg._count.orderId ?? 0,
          total_amount: Number(ordersAgg._sum.totalAmount ?? 0),
          cash_collected: Number(ordersAgg._sum.totalAmount ?? 0), // phase 1: CASH only
        },
        stock_movements: soldByProduct.map((p: any) => ({
          product_id: p.productId,
          product_name: null, // join product name if needed
          quantity_sold: Number(p._sum.quantity ?? 0),
          stock_deduction: Number(p._sum.quantity ?? 0),
        })),
      },
    };
  }
}