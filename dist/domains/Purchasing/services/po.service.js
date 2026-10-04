"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const exceptions_1 = require("../../../shared/exceptions");
const stock_service_1 = require("../../../domains/Stock/services/stock.service");
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
class POService {
    static generatePONumber() {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `PO-${dateStr}-${rand}`;
    }
    static generateGRNumber() {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        return `GR-${dateStr}-${rand}`;
    }
    static async listPOs(params) {
        const page = params.page && params.page > 0 ? params.page : 1;
        const limit = params.limit && params.limit > 0 ? params.limit : 50;
        const skip = (page - 1) * limit;
        const where = {};
        if (params.supplierId)
            where.supplierId = params.supplierId;
        if (params.status)
            where.status = params.status;
        if (params.search) {
            where.OR = [
                { poNumber: { contains: params.search, mode: 'insensitive' } },
                { supplier: { companyName: { contains: params.search, mode: 'insensitive' } } },
            ];
        }
        const [pos, total] = await Promise.all([
            client_1.default.purchaseOrder.findMany({
                where,
                skip,
                take: limit,
                orderBy: { orderDate: 'desc' },
                include: {
                    supplier: {
                        select: { supplierId: true, companyName: true, phone: true, email: true },
                    },
                    createdByUser: {
                        select: { userId: true, fullName: true },
                    },
                    purchase_order_items: {
                        include: {
                            product: { select: { productId: true, productName: true, productCode: true } },
                        },
                    },
                },
            }),
            client_1.default.purchaseOrder.count({ where }),
        ]);
        const formattedPOs = pos.map((po) => ({
            ...po,
            totalAmount: Number(po.totalAmount ?? po.total_amount ?? 0),
            paidAmount: Number(po.paidAmount ?? po.paid_amount ?? 0),
            balanceDue: Number(po.balanceDue ?? po.balance_due ?? 0),
            taxAmount: Number(po.taxAmount ?? po.tax_amount ?? 0),
            discountAmount: Number(po.discountAmount ?? po.discount_amount ?? 0),
            purchase_order_items: (po.purchase_order_items || []).map((item) => ({
                ...item,
                unitCost: Number(item.unitCost ?? item.unit_cost ?? 0),
                subtotal: Number(item.subtotal ?? 0),
            })),
        }));
        return {
            pos: formattedPOs,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    static async getPOById(poId) {
        const po = await client_1.default.purchaseOrder.findUnique({
            where: { poId: poId },
            include: {
                supplier: true,
                createdByUser: {
                    select: { userId: true, fullName: true },
                },
                approvedByUser: {
                    select: { userId: true, fullName: true },
                },
                purchase_order_items: {
                    include: {
                        product: {
                            select: { productId: true, productName: true, productCode: true, barcode: true },
                        },
                    },
                },
                goods_received: {
                    orderBy: { receivedDate: 'desc' },
                    include: {
                        goods_received_items: true,
                        user: { select: { userId: true, fullName: true } },
                    },
                },
            },
        });
        if (!po) {
            throw new exceptions_1.NotFoundException('Purchase order not found');
        }
        const rawPO = po;
        return {
            ...po,
            totalAmount: Number(rawPO.totalAmount ?? rawPO.total_amount ?? 0),
            paidAmount: Number(rawPO.paidAmount ?? rawPO.paid_amount ?? 0),
            balanceDue: Number(rawPO.balanceDue ?? rawPO.balance_due ?? 0),
            taxAmount: Number(rawPO.taxAmount ?? rawPO.tax_amount ?? 0),
            discountAmount: Number(rawPO.discountAmount ?? rawPO.discount_amount ?? 0),
            purchase_order_items: (po.purchase_order_items || []).map((item) => ({
                ...item,
                unitCost: Number(item.unitCost ?? item.unit_cost ?? 0),
                subtotal: Number(item.subtotal ?? 0),
            })),
            goods_received: (po.goods_received || []).map((gr) => ({
                ...gr,
                totalReceivedAmount: Number(gr.totalReceivedAmount ?? gr.total_received_amount ?? 0),
                goods_received_items: (gr.goods_received_items || []).map((gri) => ({
                    ...gri,
                    unitCost: Number(gri.unitCost ?? gri.unit_cost ?? 0),
                    subtotal: Number(gri.subtotal ?? 0),
                })),
            })),
        };
    }
    static async createPO(input, userId) {
        if (!input.supplierId) {
            throw new exceptions_1.ValidationException('Supplier is required');
        }
        if (!input.items || input.items.length === 0) {
            throw new exceptions_1.ValidationException('Purchase order must have at least one item');
        }
        // Verify supplier
        const supplier = await client_1.default.supplier.findUnique({ where: { supplierId: input.supplierId } });
        if (!supplier || !supplier.isActive) {
            throw new exceptions_1.ValidationException('Selected supplier is inactive or invalid');
        }
        let subtotal = 0;
        const validatedItems = [];
        for (const item of input.items) {
            if (!item.productId || item.orderedQuantity <= 0 || item.unitCost < 0) {
                throw new exceptions_1.ValidationException('Invalid item details in purchase order');
            }
            const product = await client_1.default.product.findUnique({ where: { productId: item.productId } });
            if (!product) {
                throw new exceptions_1.ValidationException(`Product ID ${item.productId} not found`);
            }
            const itemSubtotal = item.orderedQuantity * item.unitCost;
            subtotal += itemSubtotal;
            validatedItems.push({
                productId: item.productId,
                orderedQuantity: item.orderedQuantity,
                receivedQuantity: 0,
                unitCost: item.unitCost,
                subtotal: itemSubtotal,
                notes: item.notes || null,
            });
        }
        const taxAmount = input.taxAmount || 0;
        const discountAmount = input.discountAmount || 0;
        const totalAmount = subtotal + taxAmount - discountAmount;
        const poNumber = this.generatePONumber();
        const poStatus = input.status || 'DRAFT';
        // Calculate Payment & Debt fields
        let initialPaidAmount = 0;
        if (input.paymentType === 'PAID') {
            initialPaidAmount = totalAmount;
        }
        else if (input.paymentType === 'DEBT') {
            initialPaidAmount = 0;
        }
        else if (input.paymentType === 'PARTIAL') {
            initialPaidAmount = Math.min(input.initialPaidAmount || 0, totalAmount);
        }
        else {
            initialPaidAmount = Math.min(input.initialPaidAmount || 0, totalAmount);
        }
        const balanceDue = Math.max(0, totalAmount - initialPaidAmount);
        const paymentStatus = balanceDue <= 0 ? 'PAID' : initialPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
        const paymentMethod = input.paymentMethod || (input.paymentType === 'DEBT' ? 'ON_CREDIT' : 'CASH');
        // Determine Due Date
        let dueDate = null;
        if (input.paymentDueDate) {
            dueDate = new Date(input.paymentDueDate);
        }
        else if (balanceDue > 0) {
            const terms = supplier.paymentTerms || 'NET_30';
            const days = terms === 'NET_7' ? 7 : terms === 'NET_15' ? 15 : terms === 'COD' ? 0 : 30;
            dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        }
        const po = await client_1.default.$transaction(async (tx) => {
            const createdPO = await tx.purchaseOrder.create({
                data: {
                    poNumber,
                    supplierId: input.supplierId,
                    status: poStatus,
                    orderDate: new Date(),
                    expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
                    subtotal,
                    taxAmount,
                    discountAmount,
                    totalAmount,
                    paidAmount: initialPaidAmount,
                    balanceDue: balanceDue,
                    paymentStatus: paymentStatus,
                    paymentMethod: paymentMethod,
                    paymentDueDate: dueDate,
                    notes: input.notes || null,
                    createdBy: userId,
                    approvedBy: poStatus === 'APPROVED' ? userId : null,
                    purchase_order_items: {
                        create: validatedItems,
                    },
                },
                include: {
                    purchase_order_items: true,
                },
            });
            // Update Supplier total debt balance if there is a balance due
            if (balanceDue > 0) {
                await tx.supplier.update({
                    where: { supplierId: input.supplierId },
                    data: {
                        totalDebt: { increment: balanceDue },
                        updatedAt: new Date(),
                    },
                });
            }
            // Record initial payment entry if deposit/paid amount > 0
            if (initialPaidAmount > 0) {
                const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
                const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
                await tx.supplierPayment.create({
                    data: {
                        paymentNumber: `PAY-${dateStr}-${rand}`,
                        supplierId: input.supplierId,
                        poId: createdPO.poId,
                        amount: initialPaidAmount,
                        paymentMethod: paymentMethod,
                        notes: 'Initial payment upon PO creation',
                        createdBy: userId,
                    },
                });
            }
            return createdPO;
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId,
            action: 'CREATE_PURCHASE_ORDER',
            resource: 'PurchaseOrder',
            entityId: po.poId,
            details: { poNumber, totalAmount, initialPaidAmount, balanceDue, supplierId: input.supplierId },
        });
        return po;
    }
    static async updatePOStatus(poId, status, userId) {
        const po = await this.getPOById(poId);
        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            throw new exceptions_1.ValidationException(`Cannot change status of a ${po.status} purchase order`);
        }
        const updated = await client_1.default.purchaseOrder.update({
            where: { poId },
            data: {
                status,
                ...(status === 'APPROVED' && { approvedBy: userId }),
                updatedAt: new Date(),
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId,
            action: 'UPDATE_PO_STATUS',
            resource: 'PurchaseOrder',
            entityId: poId,
            details: { fromStatus: po.status, toStatus: status },
        });
        return updated;
    }
    static async recordGoodsReceived(input, userId) {
        if (!input.supplierId) {
            throw new exceptions_1.ValidationException('Supplier is required for stock receiving');
        }
        if (!input.items || input.items.length === 0) {
            throw new exceptions_1.ValidationException('Goods received must contain at least one item');
        }
        let po = null;
        if (input.poId) {
            po = await this.getPOById(input.poId);
            if (po.status === 'CANCELLED') {
                throw new exceptions_1.ValidationException('Cannot receive goods against a cancelled purchase order');
            }
        }
        const grNumber = this.generateGRNumber();
        let totalReceivedAmount = 0;
        const grResult = await client_1.default.$transaction(async (tx) => {
            // Create goods_received record
            const newGR = await tx.goodsReceived.create({
                data: {
                    grNumber,
                    poId: input.poId || null,
                    supplierId: input.supplierId,
                    receivedDate: input.receivedDate ? new Date(input.receivedDate) : new Date(),
                    invoiceNumber: input.invoiceNumber?.trim() || null,
                    totalReceivedAmount: 0,
                    notes: input.notes || null,
                    receivedBy: userId,
                },
            });
            for (const item of input.items) {
                const qtyRec = Math.max(0, Number(item.quantityReceived || 0));
                if (qtyRec <= 0)
                    continue;
                const rawCost = Number(item.unitCost);
                const unitCostNum = Math.max(0, isNaN(rawCost) ? 0 : rawCost);
                const lineSubtotal = Number((qtyRec * unitCostNum).toFixed(2));
                totalReceivedAmount += lineSubtotal;
                // Create goods_received_items record
                await tx.goodsReceivedItem.create({
                    data: {
                        grId: newGR.grId,
                        poItemId: item.poItemId || null,
                        productId: Number(item.productId),
                        quantityReceived: qtyRec,
                        unitCost: unitCostNum,
                        batchNumber: item.batchNumber?.trim() || null,
                        expiryDate: item.expiryDate ? new Date(item.expiryDate) : null,
                        subtotal: lineSubtotal,
                    },
                });
                // If linked to PO item, update po_item received_quantity
                if (item.poItemId) {
                    await tx.purchaseOrderItem.update({
                        where: { poItemId: item.poItemId },
                        data: {
                            receivedQuantity: { increment: qtyRec },
                        },
                    });
                }
                // Perform Stock In using StockService to create stock_lots & stock_movements
                await stock_service_1.StockService.stockIn({
                    product_id: Number(item.productId),
                    quantity: qtyRec,
                    cost: unitCostNum,
                    expired_at: item.expiryDate ? new Date(item.expiryDate) : undefined,
                    note: input.notes || `Stock In via GR #${grNumber}`,
                }, userId);
                // Update product's last purchase cost
                await tx.product.update({
                    where: { productId: Number(item.productId) },
                    data: { lastPurchaseCost: unitCostNum },
                });
            }
            // Update total received amount on GR
            await tx.goodsReceived.update({
                where: { grId: newGR.grId },
                data: { totalReceivedAmount },
            });
            // Update PO Status if linked to PO
            if (input.poId) {
                const poItems = await tx.purchaseOrderItem.findMany({
                    where: { poId: input.poId },
                });
                let totalOrdered = 0;
                let totalReceived = 0;
                poItems.forEach((pi) => {
                    totalOrdered += pi.orderedQuantity;
                    totalReceived += pi.receivedQuantity;
                });
                let newPoStatus = po.status;
                if (totalReceived >= totalOrdered) {
                    newPoStatus = 'RECEIVED';
                }
                else if (totalReceived > 0) {
                    newPoStatus = 'PARTIAL_RECEIVED';
                }
                await tx.purchaseOrder.update({
                    where: { poId: input.poId },
                    data: { status: newPoStatus, updatedAt: new Date() },
                });
            }
            return newGR.grId;
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId,
            action: 'RECORD_GOODS_RECEIVED',
            resource: 'GoodsReceived',
            entityId: grResult,
            details: { grNumber, totalReceivedAmount, poId: input.poId },
        });
        return await client_1.default.goodsReceived.findUnique({
            where: { grId: grResult },
            include: {
                goods_received_items: {
                    include: { product: { select: { productId: true, productName: true } } },
                },
                supplier: true,
            },
        });
    }
}
exports.POService = POService;
//# sourceMappingURL=po.service.js.map