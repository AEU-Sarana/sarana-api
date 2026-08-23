import prisma from '@src/database/client';
import { auditLogService } from '@src/shared/services/audit-log.service';
import { Role } from '@src/shared/config/permissions';
import { ProductService } from '@src/domains/Product/services/product.service';
import {
  SellerDashboardOverview,
  AdminDashboardOverview,
  DashboardRecentOrderActivity,
  DashboardRecentStockMovementActivity,
  TopSellingProduct,
} from '@src/domains/Dashbord/types';

const ACTIVITY_LIMIT = 5;
const LOW_STOCK_LIMIT = 10;

function getTodayRange(): { start: Date; end: Date } {
  const timezone = 'Asia/Phnom_Penh';
  const now = new Date();

  // Use Intl.DateTimeFormat to get the current date string in Phnom Penh
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const dateStr = formatter.format(now); // "YYYY-MM-DD"

  // Create range from midnight to midnight in PP time (+07:00)
  const start = new Date(`${dateStr}T00:00:00+07:00`);
  const end = new Date(`${dateStr}T23:59:59.999+07:00`);

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
    // Query today's orders directly since shifts are removed
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
    const openingCash = 0;

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

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_DASHBOARD_OVERVIEW',
      resource: 'Dashboard',
    });

    return {
      shift: null,
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
        pending_orders: 0,
        last_sync_time: null,
      },
    };
  }

  private static async getAdminOverview(
    currentUserId: number,
    start: Date,
    end: Date
  ): Promise<AdminDashboardOverview> {
    const ordersAgg = await prisma.order.aggregate({
      where: {
        createdAt: { gte: start, lte: end },
      },
      _count: { orderId: true },
      _sum: { totalAmount: true },
    });

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
        product: { select: { productId: true, productName: true, imagePath: true } },
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
        product: {
          product_id: movement.product.productId,
          product_name: movement.product.productName,
          image_path: movement.product.imagePath,
        },
        movement_type: movement.movementType,
        quantity: movement.quantity,
        created_at: movement.createdAt,
      })
    );

    const recentActivity = [...orderActivities, ...movementActivities]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
      .slice(0, ACTIVITY_LIMIT * 2);

    const stocks = await prisma.stock.findMany({
      include: {
        product: {
          select: {
            productId: true,
            productName: true,
            lowStockThreshold: true,
          },
        },
      },
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

    const topProducts = await this.getTopProducts(5, 'quantity');

    await auditLogService.createAuditLog({
      userId: currentUserId,
      action: 'VIEW_DASHBOARD_OVERVIEW',
      resource: 'Dashboard',
    });

    return {
      today_summary: {
        total_sales_count: totalSalesCount,
        total_sales_amount: totalSalesAmount,
        total_shifts: 0,
        active_shifts: 0,
      },
      low_stock_warnings: lowStockWarnings,
      recent_activity: recentActivity,
      sync_status: {
        pending_orders: 0,
        last_sync_time: null,
      },
      top_products: topProducts,
    };
  }

  static async getTopProducts(
    limit: number = 5,
    sortBy: 'quantity' | 'revenue' = 'quantity'
  ): Promise<TopSellingProduct[]> {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Phnom_Penh',
      year: 'numeric',
      month: '2-digit',
    });
    const yearMonthStr = formatter.format(now); // "YYYY-MM"
    const startOfMonth = new Date(`${yearMonthStr}-01T00:00:00+07:00`);

    const orderItemsGrouped = await prisma.orderItem.groupBy({
      by: ['productId', 'productName'],
      where: {
        order: {
          orderDate: { gte: startOfMonth },
        },
      },
      _sum: {
        quantity: true,
        subtotal: true,
      },
      orderBy: sortBy === 'revenue'
        ? { _sum: { subtotal: 'desc' } }
        : { _sum: { quantity: 'desc' } },
      take: limit,
    });

    const productIds = orderItemsGrouped.map((item) => item.productId);
    const productsInfo = await prisma.product.findMany({
      where: { productId: { in: productIds } },
      include: { category: true },
    });

    const productMap = new Map(productsInfo.map((p) => [p.productId, p]));

    return orderItemsGrouped.map((item, index) => {
      const product = productMap.get(item.productId);
      return {
        rank: index + 1,
        product_id: item.productId,
        product_name: item.productName || product?.productName || 'Unknown Product',
        category_name: product?.category?.name || null,
        units_sold: item._sum.quantity || 0,
        total_revenue: Number(item._sum.subtotal || 0),
        image_path: ProductService.normalizeImageUrl(product?.imagePath || null),
      };
    });
  }
}
