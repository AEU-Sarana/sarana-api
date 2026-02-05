import { startOfDay } from 'date-fns';

export interface FefoLot {
  id: number;
  qtyOnHand: number;
  receivedAt: Date;
  expiredAt: Date | null;
}

export interface FefoAllocation {
  lotId: number;
  quantity: number;
  receivedAt: Date;
  expiredAt: Date | null;
}

const normalizeDate = (value?: Date | string | null): Date | null => {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
};

export const allocateFefoLots = (
  lots: FefoLot[],
  requestedQty: number,
  today: Date = new Date(),
  allowExpired = false
): { allocations: FefoAllocation[]; remaining: number } => {
  if (requestedQty <= 0) {
    return { allocations: [], remaining: 0 };
  }

  const todayStart = startOfDay(today);
  const eligible = lots.filter((lot) => {
    if (allowExpired) return lot.qtyOnHand > 0;
    const expiredAt = normalizeDate(lot.expiredAt);
    return (
      lot.qtyOnHand > 0 &&
      (!expiredAt || startOfDay(expiredAt).getTime() >= todayStart.getTime())
    );
  });

  const sorted = [...eligible].sort((a, b) => {
    const aExp = normalizeDate(a.expiredAt);
    const bExp = normalizeDate(b.expiredAt);
    if (aExp && bExp) {
      const diff = aExp.getTime() - bExp.getTime();
      if (diff !== 0) return diff;
      return a.receivedAt.getTime() - b.receivedAt.getTime();
    }
    if (aExp && !bExp) return -1;
    if (!aExp && bExp) return 1;
    return a.receivedAt.getTime() - b.receivedAt.getTime();
  });

  let remaining = requestedQty;
  const allocations: FefoAllocation[] = [];

  for (const lot of sorted) {
    if (remaining <= 0) break;
    const takeQty = Math.min(remaining, lot.qtyOnHand);
    if (takeQty <= 0) continue;
    allocations.push({
      lotId: lot.id,
      quantity: takeQty,
      receivedAt: lot.receivedAt,
      expiredAt: lot.expiredAt,
    });
    remaining -= takeQty;
  }

  return { allocations, remaining };
};
