import prisma from '@src/database/client';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { Role } from '@src/shared/config/permissions';
import {
  SellerDashboardOverview,
  AdminDashboardOverview,
  DashboardRecentOrderActivity,
  DashboardRecentStockMovementActivity,
} from '@src/domains/Dashbord/types';

const ACTIVITY_LIMIT = 5;
const LOW_STOCK_LIMIT = 10;

function getTodayRange(): { start: Date; end: Date } {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export class DashboardService {
  static async getOverview(
    currentUserId: number,
    currentUserRole: Role
  ): Promise<SellerDashboardOverview | AdminDashboardOverview> {
    const { start, end } = getTodayRange();

    if (currentUserRole === Role.ADMIN) {
      return this.getAdminOverview(currentUserId, start, end);
    }

    return this.getSellerOverview(currentUserId, start, end);
  }

  private static async getSellerOverview(
    currentUserId: number,
    start: Date,
    end: Date
  ): Promise<SellerDashboardOverview> {
    const activeShift = await prisma.shift.findFirst({
      where: { sellerId: currentUserId, status: 'ACTIVE' },
      orderBy: { startTime: 'desc' },
    });

    const ordersAgg = await prisma.order.aggregate({
      where: {
        sellerId: currentUserId,
        createdAt: { gte: start, lte: end },
      },
      _count: { orderId: true },
      _sum: { totalAmount: true },
    });

    const totalSalesCount = ordersAgg._count.orderId ?? 0;
    const totalSalesAmount = Number(ordersAgg._sum.totalAmount ?? 0);
    const openingCash = activeShift ? Number(activeShift.openingCash) : 0;

    const recentOrders = await prisma.order.findMany({
      where: { sellerId: currentUserId },
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
      select: {
        orderId: true,
        receiptNumber: true,
        totalAmount: true,
        createdAt: true,
      },
    });

    const pendingOrders =
      activeShift && activeShift.lastSyncTime
        ? await prisma.order.count({
            where: {
              shiftId: activeShift.shiftId,
              createdAt: { gt: activeShift.lastSyncTime },
            },
          })
        : 0;

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_DASHBOARD_OVERVIEW',
      resource: 'Dashboard',
    });

    return {
      shift: activeShift
        ? {
            shift_id: activeShift.shiftId,
            status: activeShift.status,
            start_time: activeShift.startTime,
            opening_cash: Number(activeShift.openingCash),
          }
        : null,
      today_summary: {
        total_sales_count: totalSalesCount,
        total_sales_amount: totalSalesAmount,
        expected_cash: openingCash + totalSalesAmount,
      },
      recent_activity: recentOrders.map(
        (order): DashboardRecentOrderActivity => ({
          type: 'order',
          order_id: order.orderId,
          receipt_number: order.receiptNumber,
          total_amount: Number(order.totalAmount),
          created_at: order.createdAt,
        })
      ),
      sync_status: {
        pending_orders: pendingOrders,
        last_sync_time: activeShift?.lastSyncTime ?? null,
      },
    };
  }

  private static async getAdminOverview(
    currentUserId: number,
    start: Date,
    end: Date
  ): Promise<AdminDashboardOverview> {
    const [ordersAgg, totalShifts, activeShifts] = await Promise.all([
      prisma.order.aggregate({
        where: { createdAt: { gte: start, lte: end } },
        _count: { orderId: true },
        _sum: { totalAmount: true },
      }),
      prisma.shift.count({ where: { shiftDate: { gte: start, lte: end } } }),
      prisma.shift.count({ where: { status: 'ACTIVE' } }),
    ]);

    const totalSalesCount = ordersAgg._count.orderId ?? 0;
    const totalSalesAmount = Number(ordersAgg._sum.totalAmount ?? 0);

    const recentOrders = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
      select: {
        orderId: true,
        receiptNumber: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { fullName: true } },
      },
    });

    const recentMovements = await prisma.stockMovement.findMany({
      orderBy: { createdAt: 'desc' },
      take: ACTIVITY_LIMIT,
      select: {
        movementId: true,
        movementType: true,
        quantity: true,
        createdAt: true,
        product: { select: { productName: true } },
      },
    });

    const orderActivities: DashboardRecentOrderActivity[] = recentOrders.map((order) => ({
      type: 'order',
      order_id: order.orderId,
      receipt_number: order.receiptNumber,
      seller_name: order.user.fullName,
      total_amount: Number(order.totalAmount),
      created_at: order.createdAt,
    }));

    const movementActivities: DashboardRecentStockMovementActivity[] = recentMovements.map(
      (movement) => ({
        type: 'stock_movement',
        movement_id: movement.movementId,
        product_name: movement.product.productName,
        movement_type: movement.movementType,
        quantity: movement.quantity,
        created_at: movement.createdAt,
      })
    );

    const recentActivity = [...orderActivities, ...movementActivities]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, ACTIVITY_LIMIT * 2);

    const stocks = await prisma.stock.findMany({
      include: { product: { select: { productId: true, productName: true, lowStockThreshold: true } } },
    });

    const lowStockWarnings = stocks
      .filter(
        (stock) =>
          stock.product.lowStockThreshold != null &&
          stock.quantity <= (stock.product.lowStockThreshold ?? 0)
      )
      .sort((a, b) => a.quantity - b.quantity)
      .slice(0, LOW_STOCK_LIMIT)
      .map((stock) => ({
        product_id: stock.product.productId,
        product_name: stock.product.productName,
        current_stock: stock.quantity,
        low_stock_threshold: stock.product.lowStockThreshold ?? 0,
      }));

    const activeShiftList = await prisma.shift.findMany({
      where: { status: 'ACTIVE' },
      select: { shiftId: true, lastSyncTime: true },
    });

    const pendingCounts = await Promise.all(
      activeShiftList.map((shift) =>
        shift.lastSyncTime
          ? prisma.order.count({
              where: {
                shiftId: shift.shiftId,
                createdAt: { gt: shift.lastSyncTime },
              },
            })
          : Promise.resolve(0)
      )
    );

    const pendingOrders = pendingCounts.reduce((sum, value) => sum + value, 0);
    const lastSyncTime = activeShiftList
      .map((shift) => shift.lastSyncTime)
      .filter((value): value is Date => value != null)
      .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_DASHBOARD_OVERVIEW',
      resource: 'Dashboard',
    });

    return {
      today_summary: {
        total_sales_count: totalSalesCount,
        total_sales_amount: totalSalesAmount,
        total_shifts: totalShifts,
        active_shifts: activeShifts,
      },
      low_stock_warnings: lowStockWarnings,
      recent_activity: recentActivity,
      sync_status: {
        pending_orders: pendingOrders,
        last_sync_time: lastSyncTime,
      },
    };
  }
}
