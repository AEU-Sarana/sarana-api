"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateFefoLots = void 0;
const date_fns_1 = require("date-fns");
const normalizeDate = (value) => {
    if (!value)
        return null;
    return value instanceof Date ? value : new Date(value);
};
const allocateFefoLots = (lots, requestedQty, today = new Date(), allowExpired = false) => {
    if (requestedQty <= 0) {
        return { allocations: [], remaining: 0 };
    }
    const todayStart = (0, date_fns_1.startOfDay)(today);
    const eligible = lots.filter((lot) => {
        if (allowExpired)
            return lot.qtyOnHand > 0;
        const expiredAt = normalizeDate(lot.expiredAt);
        return (lot.qtyOnHand > 0 &&
            (!expiredAt || (0, date_fns_1.startOfDay)(expiredAt).getTime() >= todayStart.getTime()));
    });
    const sorted = [...eligible].sort((a, b) => {
        const aExp = normalizeDate(a.expiredAt);
        const bExp = normalizeDate(b.expiredAt);
        if (aExp && bExp) {
            const diff = aExp.getTime() - bExp.getTime();
            if (diff !== 0)
                return diff;
            return a.receivedAt.getTime() - b.receivedAt.getTime();
        }
        if (aExp && !bExp)
            return -1;
        if (!aExp && bExp)
            return 1;
        return a.receivedAt.getTime() - b.receivedAt.getTime();
    });
    let remaining = requestedQty;
    const allocations = [];
    for (const lot of sorted) {
        if (remaining <= 0)
            break;
        const takeQty = Math.min(remaining, lot.qtyOnHand);
        if (takeQty <= 0)
            continue;
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
exports.allocateFefoLots = allocateFefoLots;
//# sourceMappingURL=fefo.js.map