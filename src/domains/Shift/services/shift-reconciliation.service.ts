import prisma from '@src/database/client';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { GetShiftReconciliationResponse } from '@src/domains/Shift/types/shift.types';
import { Role } from '@src/shared/config/permissions';

export class ShiftReconciliationService {
  static async getReconciliation(
    shiftId: number,
    currentUserId: number,
    currentUserRole: string,
    currentTenantId?: number
  ): Promise<GetShiftReconciliationResponse> {
    if (currentUserRole !== Role.ADMIN) {
      throw new BusinessLogicException('Only admin can access shift reconciliation', 'FORBIDDEN', 403);
    }

    const shiftWhere: any = { shiftId };
    // Ensure admin can only reconcile shifts from their own tenant
    if (currentTenantId) {
      shiftWhere.user = { tenantId: currentTenantId };
    }

    const shift = await prisma.shift.findFirst({
      where: shiftWhere,
      select: {
        shiftId: true,
        stockVersion: true,
        startTime: true,
        endTime: true,
        expectedCash: true,
        actualCash: true,
      },
    });
    if (!shift) throw new ValidationException('Shift not found');

    const snapshotStocksPromise =
      shift.stockVersion != null
        ? prisma.stock.findMany({
          where: { stockVersion: shift.stockVersion },
          include: { product: { select: { productId: true, productName: true, price: true } } },
        })
        : Promise.resolve([]);

    const [
      ordersAgg,
      soldByProduct,
      movementByProduct,
      actualStocks,
      orderItems,
      snapshotStocks,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { shiftId },
        _count: { orderId: true },
        _sum: { totalAmount: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { shiftId } },
        _sum: { quantity: true },
      }),
      prisma.stockMovement.groupBy({
        by: ['productId', 'movementType'],
        where: { shiftId },
        _sum: { quantity: true },
      }),
      prisma.stock.findMany({
        include: { product: { select: { productId: true, productName: true, price: true } } },
      }),
      prisma.orderItem.findMany({
        where: { order: { shiftId } },
        select: {
          orderItemId: true,
          productId: true,
          unitPrice: true,
          product: { select: { productId: true, productName: true, price: true } },
        },
      }),
      snapshotStocksPromise,
    ]);

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_SHIFT_RECONCILIATION',
      resource: 'Shift',
      entityId: shiftId,
    });

    const expectedCash = Number(shift.expectedCash ?? 0);
    const actualCash = Number(shift.actualCash ?? 0);

    const activeSnapshotStocks = snapshotStocks.length > 0 ? snapshotStocks : actualStocks;

    const numberOrZero = (value: unknown): number => {
      if (value == null) return 0;
      return Number(value);
    };

    const priceEqual = (a: number, b: number): boolean => {
      return Math.abs(a - b) < 0.0001;
    };

    const snapshotByProduct = new Map<
      number,
      { quantity: number; productName: string | null; price: number | null }
    >();
    activeSnapshotStocks.forEach((s: any) => {
      snapshotByProduct.set(s.productId, {
        quantity: numberOrZero(s.quantity),
        productName: s.product?.productName ?? null,
        price: s.product?.price != null ? Number(s.product.price) : null,
      });
    });

    const actualByProduct = new Map<
      number,
      { quantity: number; productName: string | null; price: number | null }
    >();
    actualStocks.forEach((s: any) => {
      actualByProduct.set(s.productId, {
        quantity: numberOrZero(s.quantity),
        productName: s.product?.productName ?? null,
        price: s.product?.price != null ? Number(s.product.price) : null,
      });
    });

    const soldByProductMap = new Map<number, number>();
    soldByProduct.forEach((p: any) => {
      soldByProductMap.set(p.productId, numberOrZero(p._sum?.quantity));
    });

    const movementNetByProduct = new Map<number, number>();
    movementByProduct.forEach((m: any) => {
      const quantity = numberOrZero(m._sum?.quantity);
      let delta = 0;
      switch (m.movementType) {
        case 'STOCK_IN':
        case 'RETURN':
          delta = quantity;
          break;
        case 'STOCK_OUT':
          delta = -quantity;
          break;
        case 'ADJUSTMENT':
          delta = quantity;
          break;
        default:
          delta = quantity;
      }
      movementNetByProduct.set(m.productId, (movementNetByProduct.get(m.productId) ?? 0) + delta);
    });

    const productNameById = new Map<number, string | null>();
    [...snapshotByProduct.entries(), ...actualByProduct.entries()].forEach(([productId, meta]) => {
      if (!productNameById.has(productId)) productNameById.set(productId, meta.productName);
    });
    orderItems.forEach((item: any) => {
      if (!productNameById.has(item.productId)) {
        productNameById.set(item.productId, item.product?.productName ?? null);
      }
    });

    const productIds = new Set<number>();
    snapshotByProduct.forEach((_v, k) => productIds.add(k));
    actualByProduct.forEach((_v, k) => productIds.add(k));
    soldByProductMap.forEach((_v, k) => productIds.add(k));
    movementNetByProduct.forEach((_v, k) => productIds.add(k));

    const stockConflicts: GetShiftReconciliationResponse['reconciliation']['stockConflicts'] = [];
    const negativeStockWarnings: GetShiftReconciliationResponse['reconciliation']['negativeStockWarnings'] = [];

    productIds.forEach((productId) => {
      const snapshotQty = snapshotByProduct.get(productId)?.quantity ?? 0;
      const actualQty = actualByProduct.get(productId)?.quantity ?? 0;
      const soldQty = soldByProductMap.get(productId) ?? 0;
      const movementNet = movementNetByProduct.get(productId) ?? 0;
      const expectedQty = snapshotQty - soldQty + movementNet;
      const difference = actualQty - expectedQty;
      const productName = productNameById.get(productId) ?? null;

      if (!priceEqual(actualQty, expectedQty)) {
        stockConflicts.push({
          product_id: productId,
          product_name: productName,
          expected_quantity: expectedQty,
          actual_quantity: actualQty,
          difference,
        });
      }

      if (expectedQty < 0 || actualQty < 0) {
        let reason: 'EXPECTED_NEGATIVE' | 'ACTUAL_NEGATIVE' | 'BOTH_NEGATIVE' = 'EXPECTED_NEGATIVE';
        if (expectedQty < 0 && actualQty < 0) {
          reason = 'BOTH_NEGATIVE';
        } else if (actualQty < 0) {
          reason = 'ACTUAL_NEGATIVE';
        }
        negativeStockWarnings.push({
          product_id: productId,
          product_name: productName,
          expected_quantity: expectedQty,
          actual_quantity: actualQty,
          reason,
        });
      }
    });

    const priceMismatches: GetShiftReconciliationResponse['reconciliation']['priceMismatches'] = [];
    orderItems.forEach((item: any) => {
      const actualPrice = numberOrZero(item.unitPrice);
      const snapshotPrice = snapshotByProduct.get(item.productId)?.price ?? null;
      const fallbackPrice =
        item.product?.price != null ? Number(item.product.price) : actualByProduct.get(item.productId)?.price ?? null;
      const expectedPrice = snapshotPrice != null ? snapshotPrice : fallbackPrice;

      if (expectedPrice == null) {
        return;
      }

      if (!priceEqual(actualPrice, expectedPrice)) {
        priceMismatches.push({
          product_id: item.productId,
          product_name: item.product?.productName ?? productNameById.get(item.productId) ?? null,
          order_item_id: item.orderItemId,
          expected_price: expectedPrice,
          actual_price: actualPrice,
        });
      }
    });

    return {
      shift_id: shiftId,
      reconciliation: {
        expected_cash: expectedCash,
        actual_cash: actualCash,
        difference: actualCash - expectedCash,
        orders_summary: {
          total_orders: ordersAgg._count.orderId ?? 0,
          total_amount: Number(ordersAgg._sum.totalAmount ?? 0),
          cash_collected: Number(ordersAgg._sum.totalAmount ?? 0),
        },
        stock_movements: soldByProduct.map((p: any) => ({
          product_id: p.productId,
          product_name: null,
          quantity_sold: Number(p._sum.quantity ?? 0),
          stock_deduction: Number(p._sum.quantity ?? 0),
        })),
        stockConflicts,
        negativeStockWarnings,
        priceMismatches,
      },
    };
  }
}
