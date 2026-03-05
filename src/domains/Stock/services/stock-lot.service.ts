import prisma from '@src/database/client';
import { Prisma } from '@src/database/generated';
import { BusinessLogicException, ValidationException } from '@src/shared/exceptions';
import { formatDate } from '@src/shared/utils/date-utils';
import type { PrismaTransaction } from '@src/shared/types/database.types';
import { addDays, endOfDay, startOfDay } from 'date-fns';
import { allocateFefoLots, type FefoLot } from '../utils/fefo';
import type { ExpiredLotsResponse, NearExpiryResponse, StockLotInfo } from '../types/stock-lot.types';

export interface CreateLotStockInParams {
  productId: number;
  quantity: number;
  cost?: number | null;
  supplier?: string | null;
  receivedAt?: Date;
  expiredAt?: Date | null;
  createdBy: number;
}

export interface AllocateStockOutParams {
  productId: number;
  quantity: number;
  price?: number | null;
  orderId?: number | null;
  shiftId?: number | null;
  createdBy: number;
  allowExpired?: boolean;
  allowNegative?: boolean;
  reason?: string | null;
}

type StockLotRow = {
  id: number;
  product_id: number;
  qty_on_hand: number;
  received_at: Date;
  expired_at: Date | null;
  cost: Prisma.Decimal | null;
};

export class StockLotService {
  private static mapLotInfo(row: any): StockLotInfo {
    return {
      lot_id: row.id,
      product_id: row.productId ?? row.product_id,
      product_name: row.product?.productName ?? row.product_name ?? '',
      product_code: row.product?.productCode ?? row.product_code ?? null,
      qty_on_hand: Number(row.qtyOnHand ?? row.qty_on_hand ?? 0),
      received_at: row.receivedAt ?? row.received_at,
      expired_at: row.expiredAt ?? row.expired_at ?? null,
      cost: row.cost != null ? Number(row.cost) : null,
    };
  }

  static async createLotStockIn(
    params: CreateLotStockInParams,
    tx?: PrismaTransaction
  ) {
    const db = tx ?? prisma;
    const receivedAt = params.receivedAt ?? new Date();

    const lot = await db.stockLot.create({
      data: {
        productId: params.productId,
        qtyOnHand: params.quantity,
        receivedAt,
        expiredAt: params.expiredAt ?? null,
        cost: params.cost ?? null,
      },
    });

    const movement = await db.stockMovement.create({
      data: {
        productId: params.productId,
        lotId: lot.id,
        movementType: 'STOCK_IN',
        quantity: params.quantity,
        cost: params.cost ?? null,
        supplier: params.supplier ?? null,
        createdBy: params.createdBy,
        createdAt: receivedAt,
      },
    });

    return { lot, movement };
  }

  static async allocateStockOutFEFO(
    params: AllocateStockOutParams,
    tx?: PrismaTransaction
  ) {
    if (params.quantity <= 0) {
      throw new ValidationException('Quantity must be greater than 0');
    }

    const execute = async (db: PrismaTransaction) => {
      const today = formatDate(new Date());

      const lots = await db.$queryRaw<StockLotRow[]>(Prisma.sql`
        SELECT id, product_id, qty_on_hand, received_at, expired_at, cost
        FROM stock_lots
        WHERE product_id = ${params.productId}
          AND qty_on_hand > 0
          ${params.allowExpired
          ? Prisma.empty
          : Prisma.sql`AND (expired_at IS NULL OR expired_at >= ${today}::date)`}
        ORDER BY (expired_at IS NULL) ASC, expired_at ASC, received_at ASC
        FOR UPDATE
      `);

      const fefoLots: FefoLot[] = lots.map((lot) => ({
        id: lot.id,
        qtyOnHand: Number(lot.qty_on_hand),
        receivedAt: new Date(lot.received_at),
        expiredAt: lot.expired_at ? new Date(lot.expired_at) : null,
      }));

      const { allocations, remaining } = allocateFefoLots(
        fefoLots,
        params.quantity,
        new Date(),
        Boolean(params.allowExpired)
      );

      if (remaining > 0) {
        if (!params.allowNegative) {
          throw new BusinessLogicException(
            'INSUFFICIENT_STOCK',
            'INSUFFICIENT_STOCK',
            409,
            { remaining }
          );
        }

        await db.stockMovement.create({
          data: {
            productId: params.productId,
            lotId: null,
            movementType: 'STOCK_OUT',
            quantity: -remaining,
            cost: null,
            price: params.price ?? null,
            reason: params.reason ?? 'NEGATIVE_STOCK',
            orderId: params.orderId ?? null,
            shiftId: params.shiftId ?? null,
            createdBy: params.createdBy,
            createdAt: new Date(),
          },
        });
      }

      let totalCost = 0;
      const detailedAllocations = [];

      for (const allocation of allocations) {
        const lot = lots.find((l) => l.id === allocation.lotId);
        if (!lot) continue;

        const allocationCost = lot.cost != null ? Number(lot.cost) : 0;
        totalCost += allocationCost * allocation.quantity;

        detailedAllocations.push({
          ...allocation,
          cost: allocationCost
        });

        await db.stockLot.update({
          where: { id: allocation.lotId },
          data: {
            qtyOnHand: { decrement: allocation.quantity },
            updatedAt: new Date(),
          },
        });

        await db.stockMovement.create({
          data: {
            productId: params.productId,
            lotId: allocation.lotId,
            movementType: 'STOCK_OUT',
            quantity: -allocation.quantity,
            cost: lot.cost ?? null,
            price: params.price ?? null,
            reason: params.reason ?? null,
            orderId: params.orderId ?? null,
            shiftId: params.shiftId ?? null,
            createdBy: params.createdBy,
            createdAt: new Date(),
          },
        });
      }

      return {
        allocations: detailedAllocations,
        totalCost,
        remaining
      };
    };

    if (tx) {
      return execute(tx);
    }

    return prisma.$transaction(async (db) => execute(db));
  }

  static async listNearExpiry(
    tenantId: number,
    days = 30
  ): Promise<NearExpiryResponse> {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, days));

    const lots = await prisma.stockLot.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiredAt: {
          gte: start,
          lte: end,
        },
        product: {
          createdByUser: { tenantId }
        }
      },
      include: {
        product: { select: { productName: true, productCode: true } },
      },
      orderBy: [
        { expiredAt: 'asc' },
        { receivedAt: 'asc' },
      ],
    });

    return {
      days,
      lots: lots.map((lot) => this.mapLotInfo(lot)),
    };
  }

  static async listExpired(tenantId: number): Promise<ExpiredLotsResponse> {
    const today = startOfDay(new Date());

    const lots = await prisma.stockLot.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiredAt: { lt: today },
        product: {
          createdByUser: { tenantId }
        }
      },
      include: {
        product: { select: { productName: true, productCode: true } },
      },
      orderBy: [
        { expiredAt: 'asc' },
        { receivedAt: 'asc' },
      ],
    });

    return {
      lots: lots.map((lot) => this.mapLotInfo(lot)),
    };
  }

  static async listLotsExpiringIn(tenantId: number, days: number): Promise<StockLotInfo[]> {
    const targetDate = startOfDay(addDays(new Date(), days));
    const nextDate = addDays(targetDate, 1);

    const lots = await prisma.stockLot.findMany({
      where: {
        qtyOnHand: { gt: 0 },
        expiredAt: {
          gte: targetDate,
          lt: nextDate,
        },
        product: {
          createdByUser: { tenantId }
        }
      },
      include: {
        product: { select: { productName: true, productCode: true } },
      },
      orderBy: [
        { receivedAt: 'asc' },
      ],
    });

    return lots.map((lot) => this.mapLotInfo(lot));
  }
}
