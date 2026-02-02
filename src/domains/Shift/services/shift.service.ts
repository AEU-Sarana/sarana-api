import prisma from '@src/database/client';
import { StockService } from '@src/domains/Stock/services/stock.service';
import { OrderService } from '@src/domains/Order/services/order.service';
import {
  StartShiftRequest,
  StartShiftResponse,
  CloseShiftRequest,
  CloseShiftResponse,
  ListShiftsRequest,
  ListShiftsResponse,
  GetShiftResponse,
} from '@src/domains/Shift/types/shift.types';
import { ValidationException, BusinessLogicException } from '@src/shared/exceptions';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { eventBus } from '@src/shared/events/event-bus';
import { ShiftClosedEvent } from '../events/shift-closed.event';

export class ShiftService {
  /**
   * Start shift
   * - Enforce one ACTIVE shift per seller
   * - Pull stock snapshot for mobile + capture stock version
   */
  static async startShift(
    request: StartShiftRequest,
    currentUserId: number,
    currentUserRole: string
  ): Promise<StartShiftResponse> {
    const { opening_cash } = request;

    // Seller starts their own shift; Admin can start for self (or implement start-for-seller if needed)
    const sellerId = currentUserId;

    const active = await prisma.shift.findFirst({
      where: { sellerId, status: 'ACTIVE' },
    });
    if (active) throw new BusinessLogicException('You already have an active shift');

    // Pull stock snapshot (server → device)
    // StockService exposes `getStock()`. When called with a `version` param it will
    // also include `version` + `last_sync_time` in the response (used by sync clients).
    const stockSnapshot = await StockService.getStock({ version: 0, page: 1, limit: 1000 }, currentUserId);

    const shift = await prisma.shift.create({
      data: {
        sellerId,
        shiftDate: new Date(),
        startTime: new Date(),
        openingCash: opening_cash,
        status: 'ACTIVE',
        // `getStock()` returns a union. Only list responses include version metadata.
        stockVersion: 'version' in stockSnapshot ? (stockSnapshot.version ?? null) : null,
        lastSyncTime:
          'last_sync_time' in stockSnapshot && stockSnapshot.last_sync_time
            ? new Date(stockSnapshot.last_sync_time)
            : new Date(),
      },
    });

    // Normalize stock snapshot into the contract shape
    let stockVersion: number | null = null;
    let lastSyncTime: Date | null = null;
    let products: any[] = [];

    if ('stocks' in stockSnapshot) {
      stockVersion = 'version' in stockSnapshot ? stockSnapshot.version ?? null : null;
      lastSyncTime = stockSnapshot.last_sync_time ?? null;

      products = stockSnapshot.stocks.map((s: any) => ({
        product_id: s.product_id,
        product_code: s.product_code,
        product_name: s.product_name,
        price: typeof s.price === 'number' ? s.price : null,
        stock: {
          quantity: s.quantity,
          stock_version: s.stock_version ?? null,
        },
      }));
    }

    const stockResponse = {
      version: stockVersion,
      last_sync_time: lastSyncTime ? lastSyncTime.toISOString() : null,
      products,
    };

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'START_SHIFT',
      resource: 'Shift',
      entityId: shift.shiftId,
      details: { opening_cash, stock_version: 'version' in stockSnapshot ? stockSnapshot.version : undefined },
    });

    return {
      shift_id: shift.shiftId,
      seller_id: shift.sellerId,
      shift_date: shift.shiftDate.toISOString().slice(0, 10),
      start_time: shift.startTime.toISOString(),
      opening_cash: Number(shift.openingCash),
      status: shift.status,
      stock: stockResponse,
      created_at: shift.createdAt.toISOString(),
    };
  }

  /**
   * Close shift
   * - Only ACTIVE shift can be closed
   * - Compute expected_cash, short_amount, over_amount
   * - Totals based on orders within shift (server-side)
  */
  static async closeShift(
    shiftId: number,
    request: CloseShiftRequest,
    currentUserId: number,
    currentUserRole: string
  ): Promise<CloseShiftResponse> {
    const shift = await prisma.shift.findUnique({ where: { shiftId } });
    if (!shift) throw new ValidationException('Shift not found');

    const pendingOrdersCount = request.pending_orders_count;
    const closeMode = request.close_mode ?? (request.force_close ? 'FORCED' : 'NORMAL');
    const forceClose = closeMode === 'FORCED';
    const forceCloseReason = request.force_close_reason?.toString().trim() || '';

    // Seller can only close own shift
    if (currentUserRole === 'SELLER' && shift.sellerId !== currentUserId) {
      throw new ValidationException('You can only close your own shift');
    }

    if (shift.status !== 'ACTIVE') {
      throw new BusinessLogicException('Shift is already closed');
    }

    if (pendingOrdersCount > 0 && !forceClose) {
      throw new BusinessLogicException(
        'You have pending orders. Sync orders before closing the shift.',
        'SHIFT_CLOSE_BLOCKED_PENDING_ORDERS',
        409,
        { pending_orders_count: pendingOrdersCount }
      );
    }

    if (forceClose) {
      if (currentUserRole !== 'ADMIN') {
        throw new BusinessLogicException('Only admin can force close the shift', 'FORBIDDEN', 403);
      }
      if (!forceCloseReason) {
        throw new ValidationException('force_close_reason is required when close_mode is FORCED');
      }
    }

    // Compute totals from orders linked to shift
    const ordersAgg = await prisma.order.aggregate({
      where: { shiftId },
      _count: { orderId: true },
      _sum: { totalAmount: true },
    });

    const totalSalesCount = ordersAgg._count.orderId ?? 0;
    const totalSalesAmount = Number(ordersAgg._sum.totalAmount ?? 0);

    const expectedCash = Number(shift.openingCash) + totalSalesAmount;
    const actualCash = request.actual_cash;

    const shortAmount = actualCash < expectedCash ? expectedCash - actualCash : 0;
    const overAmount = actualCash > expectedCash ? actualCash - expectedCash : 0;

    const updated = await prisma.shift.update({
      where: { shiftId },
      data: {
        endTime: new Date(),
        actualCash,
        expectedCash,
        shortAmount,
        overAmount,
        totalSalesCount,
        totalSalesAmount,
        status: 'CLOSED',
        reportSentStatus: 'PENDING',
        closeMode,
        forceCloseReason: forceClose ? forceCloseReason : null,
      },
    });

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'CLOSE_SHIFT',
      resource: 'Shift',
      entityId: shiftId,
      details: { actual_cash: actualCash, expected_cash: expectedCash, shortAmount, overAmount },
    });

    eventBus.emit('shift.closed', {
      shift_id: updated.shiftId,
      seller_id: updated.sellerId,
      total_sales_count: updated.totalSalesCount ?? 0,
      total_sales_amount: Number(updated.totalSalesAmount ?? 0),
      expected_cash: Number(updated.expectedCash ?? 0),
      actual_cash: Number(updated.actualCash ?? 0),
      short_amount: Number(updated.shortAmount ?? 0),
      over_amount: Number(updated.overAmount ?? 0),
      closed_at: updated.endTime!,
      performed_by: currentUserId,
      performed_by_role: currentUserRole,
    } satisfies ShiftClosedEvent);

    return {
      shift_id: updated.shiftId,
      end_time: updated.endTime!,
      actual_cash: Number(updated.actualCash ?? 0),
      expected_cash: Number(updated.expectedCash ?? 0),
      short_amount: Number(updated.shortAmount ?? 0),
      over_amount: Number(updated.overAmount ?? 0),
      total_sales_count: updated.totalSalesCount ?? 0,
      total_sales_amount: Number(updated.totalSalesAmount ?? 0),
      status: updated.status,
      report_sent_status: updated.reportSentStatus ?? 'PENDING',
      updated_at: updated.updatedAt,
    };
  }

  /**
   * List shifts with role-based filtering
   */
  static async listShifts(
    request: ListShiftsRequest,
    currentUserId: number,
    currentUserRole: string
  ): Promise<ListShiftsResponse> {
    const { page = 1, limit = 20, seller_id, status, start_date, end_date } = request;

    const where: any = {};
    if (currentUserRole === 'SELLER') {
      where.sellerId = currentUserId;
    } else if (seller_id) {
      where.sellerId = seller_id;
    }
    if (status) where.status = status;
    if (start_date || end_date) {
      where.shiftDate = {};
      if (start_date) {
        // Convert date string to Date object (start of day)
        const startDate = new Date(start_date);
        startDate.setHours(0, 0, 0, 0);
        where.shiftDate.gte = startDate;
      }
      if (end_date) {
        // Convert date string to Date object (end of day)
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        where.shiftDate.lte = endDate;
      }
    }

    const total = await prisma.shift.count({ where });
    const skip = (page - 1) * limit;

    const shifts = await prisma.shift.findMany({
      where,
      skip,
      take: limit,
      orderBy: { startTime: 'desc' },
      include: {
        seller: { select: { userId: true, fullName: true } },
      },
    });

    // Get all unique sellers who have shifts (for filtering dropdown)
    const allShifts = await prisma.shift.findMany({
      select: {
        sellerId: true,
        seller: {
          select: {
            userId: true,
            fullName: true,
          },
        },
      },
    });

    // Extract unique sellers
    const uniqueSellers = new Map<number, { id: number; name: string }>();
    allShifts.forEach((shift) => {
      if (shift.seller) {
        uniqueSellers.set(shift.seller.userId, {
          id: shift.seller.userId,
          name: shift.seller.fullName,
        });
      }
    });

    const sellers = Array.from(uniqueSellers.values()).sort((a, b) => a.name.localeCompare(b.name));

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'LIST_SHIFTS',
      resource: 'Shift',
      details: { filters: { seller_id, status, start_date, end_date } },
    });

    return {
      shifts: shifts.map((s: any) => ({
        shift_id: s.shiftId,
        seller_id: s.sellerId,
        seller_name: s.seller?.fullName ?? null,
        shift_date: s.shiftDate.toISOString().slice(0, 10),
        start_time: s.startTime,
        end_time: s.endTime,
        opening_cash: Number(s.openingCash),
        actual_cash: s.actualCash != null ? Number(s.actualCash) : null,
        total_sales_count: s.totalSalesCount ?? 0,
        total_sales_amount: Number(s.totalSalesAmount ?? 0),
        status: s.status,
        created_at: s.createdAt,
      })),
      sellers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get shift details by ID
   */
  static async getShift(
    shiftId: number,
    currentUserId: number,
    currentUserRole: string
  ): Promise<GetShiftResponse> {
    const where =
      currentUserRole === 'SELLER'
        ? { shiftId, sellerId: currentUserId }
        : { shiftId };

    const shift = await prisma.shift.findFirst({
      where,
      include: {
        seller: { select: { userId: true, fullName: true } },
        orders: {
          select: { orderId: true, receiptNumber: true, orderDate: true, totalAmount: true },
          orderBy: { orderDate: 'asc' },
        },
      },
    });
    if (!shift) throw new ValidationException('Shift not found');

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_SHIFT',
      resource: 'Shift',
      entityId: shiftId,
    });

    return {
      shift_id: shift.shiftId,
      seller_id: shift.sellerId,
      seller_name: shift.seller?.fullName ?? null,
      stock_version: shift.stockVersion ?? null,
      shift_date: shift.shiftDate.toISOString().slice(0, 10),
      start_time: shift.startTime,
      end_time: shift.endTime,
      opening_cash: Number(shift.openingCash),
      expected_cash: shift.expectedCash != null ? Number(shift.expectedCash) : null,
      actual_cash: shift.actualCash != null ? Number(shift.actualCash) : null,
      short_amount: shift.shortAmount != null ? Number(shift.shortAmount) : null,
      over_amount: shift.overAmount != null ? Number(shift.overAmount) : null,
      total_sales_count: shift.totalSalesCount ?? 0,
      total_sales_amount: Number(shift.totalSalesAmount ?? 0),
      status: shift.status,
      report_sent_status: shift.reportSentStatus ?? 'PENDING',
      orders: shift.orders.map((o: any) => ({
        order_id: o.orderId,
        receipt_number: o.receiptNumber,
        order_date: o.orderDate,
        total_amount: Number(o.totalAmount),
      })),
      created_at: shift.createdAt,
      updated_at: shift.updatedAt,
    };
  }
}
