"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const client_1 = __importDefault(require("../../../database/client"));
const exceptions_1 = require("../../../shared/exceptions");
const logger_1 = require("../../../shared/utils/logger");
const audit_log_service_1 = require("../../../shared/services/audit-log.service");
const permissions_1 = require("../../../shared/config/permissions");
const stock_service_1 = require("../../../domains/Stock/services/stock.service");
const receipt_link_service_1 = require("../../../domains/Receipt/services/V1/receipt-link.service");
const receipt_link_status_enum_1 = require("../../../domains/Receipt/enums/V1/receipt-link-status.enum");
const event_bus_1 = require("../../../shared/events/event-bus");
const ADMIN_ROLES = new Set([
    permissions_1.Role.ADMIN,
    'COMPANY_ADMIN',
    'OWNER',
    'MANAGER',
]);
const isAdminRole = (role) => (role ? ADMIN_ROLES.has(role) : false);
class OrderService {
    /**
     * List orders with role-based filtering
     * - Seller: Only own orders
     * - Admin: All orders (global list, as multi-tenancy is removed)
     */
    static async listOrders(request, currentUser) {
        const { page = 1, limit = 50, seller_id, start_date, end_date } = request;
        const { userId: currentUserId, role: currentUserRole } = currentUser;
        const where = {};
        // Role-based filtering
        if (currentUserRole === permissions_1.Role.CASHIER) {
            if (seller_id && seller_id !== currentUserId) {
                logger_1.logger.warn('Order list access denied: seller cannot view other sellers', {
                    userId: currentUserId,
                    role: currentUserRole,
                    orderId: null,
                });
                throw new exceptions_1.ForbiddenException('You do not have permission to access these orders', 'ORDER_ACCESS_DENIED');
            }
            where.sellerId = currentUserId;
        }
        else {
            // Admin and other roles with assigned permission (e.g. RECEIVER)
            if (seller_id) {
                where.sellerId = seller_id;
            }
        }
        if (start_date || end_date) {
            where.orderDate = {};
            if (start_date)
                where.orderDate.gte = new Date(start_date);
            if (end_date)
                where.orderDate.lte = new Date(end_date);
        }
        const total = await client_1.default.order.count({ where });
        const skip = (page - 1) * limit;
        const orders = await client_1.default.order.findMany({
            where,
            skip,
            take: limit,
            orderBy: { orderDate: 'desc' },
            include: {
                user: {
                    select: {
                        userId: true,
                        fullName: true,
                    },
                },
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'LIST_ORDERS',
            resource: 'Order',
            details: { filters: { seller_id, start_date, end_date } },
        });
        return {
            orders: orders.map((o) => {
                return {
                    order_id: o.orderId,
                    receipt_number: o.receiptNumber,
                    shift_id: null,
                    seller_id: o.sellerId,
                    seller_name: o.user?.fullName || null,
                    order_date: o.orderDate,
                    total_amount: Number(o.totalAmount),
                    discount_amount: Number(o.discountAmount),
                    tax_amount: Number(o.taxAmount),
                    service_fee: Number(o.serviceFee),
                    exchange_rate: 4000,
                    payment_method: o.paymentMethod,
                    order_status: o.orderStatus || 'COMPLETED',
                    cancel_reason: o.cancelReason || null,
                    cancel_requested_at: o.cancelRequestedAt || null,
                    cancel_requested_by: o.cancelRequestedBy || null,
                    cancelled_at: o.cancelledAt || null,
                    cancelled_by: o.cancelledBy || null,
                    rejection_reason: o.rejectionReason || null,
                    has_receipt_link: false,
                    receipt_link_status: null,
                    created_at: o.createdAt,
                };
            }),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get order details by ID
     * - Seller: Own orders only
     * - Admin: All orders
     */
    static async getOrder(orderId, currentUser) {
        const { userId: currentUserId, role: currentUserRole } = currentUser;
        const order = await client_1.default.order.findUnique({
            where: { orderId },
            include: {
                user: {
                    select: {
                        userId: true,
                        fullName: true,
                    },
                },
                order_items: {
                    include: {
                        product: {
                            select: {
                                productId: true,
                                productName: true,
                                productCode: true,
                            },
                        },
                    },
                },
                order_payments: {
                    select: {
                        receivedAmount: true,
                        transactionId: true,
                        paymentMethod: true,
                        receivedUsd: true,
                        receivedKhr: true,
                        changeUsd: true,
                        changeKhr: true,
                        slipUrl: true,
                        notes: true,
                    },
                },
            },
        });
        if (!order) {
            throw new exceptions_1.NotFoundException('Order not found', 'ORDER_NOT_FOUND');
        }
        // Role-based access control
        if (currentUserRole === permissions_1.Role.CASHIER) {
            if (order.sellerId !== currentUserId) {
                logger_1.logger.warn('Order access denied: seller cannot view other orders', {
                    userId: currentUserId,
                    role: currentUserRole,
                    orderId,
                });
                throw new exceptions_1.ForbiddenException('You do not have permission to access this order', 'ORDER_ACCESS_DENIED');
            }
        }
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'VIEW_ORDER',
            resource: 'Order',
            entityId: orderId,
        });
        const receivedAmount = order.order_payments.reduce((sum, payment) => sum + Number(payment.receivedAmount), 0);
        const latestPayment = order.order_payments[order.order_payments.length - 1] || null;
        return {
            order_id: order.orderId,
            receipt_number: order.receiptNumber,
            shift_id: null,
            seller_id: order.sellerId,
            seller_name: order.user?.fullName || null,
            order_date: order.orderDate,
            total_amount: Number(order.totalAmount),
            discount_amount: Number(order.discountAmount),
            tax_amount: Number(order.taxAmount),
            service_fee: Number(order.serviceFee),
            exchange_rate: 4000,
            payment_method: order.paymentMethod,
            order_status: order.orderStatus || 'COMPLETED',
            cancel_reason: order.cancelReason || null,
            cancel_requested_at: order.cancelRequestedAt || null,
            cancel_requested_by: order.cancelRequestedBy || null,
            cancelled_at: order.cancelledAt || null,
            cancelled_by: order.cancelledBy || null,
            rejection_reason: order.rejectionReason || null,
            received_amount: receivedAmount,
            reference_number: latestPayment?.transactionId || null,
            transaction_id: latestPayment?.transactionId || null,
            received_usd: latestPayment ? Number(latestPayment.receivedUsd) : null,
            received_khr: latestPayment ? Number(latestPayment.receivedKhr) : null,
            change_usd: latestPayment ? Number(latestPayment.changeUsd) : null,
            change_khr: latestPayment ? Number(latestPayment.changeKhr) : null,
            slip_url: latestPayment?.slipUrl || null,
            notes: latestPayment?.notes || null,
            has_receipt_link: false,
            receipt_link_status: null,
            items: order.order_items.map((item) => ({
                order_item_id: item.orderItemId,
                product_id: item.productId,
                product_name: item.product?.productName || null,
                quantity: item.quantity,
                unit_price: Number(item.unitPrice),
                discount_amount: Number(item.discountAmount),
                subtotal: Number(item.subtotal),
            })),
            created_at: order.createdAt,
        };
    }
    /**
     * Create a simple online order (generates UUID & receipt number automatically)
     */
    static async createOrder(request, currentUser) {
        // Generate receipt number: RCP-YYYYMMDD-HHMMSS-RAND
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
        const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
        const receiptNumber = `RCP-${dateStr}-${timeStr}-${rand}`;
        // Calculate sum of item subtotals
        const itemsSubtotal = request.items.reduce((sum, item) => sum + item.subtotal, 0);
        const totalAmount = Number((itemsSubtotal - (request.discount_amount || 0) + (request.tax_amount || 0) + (request.service_fee || 0)).toFixed(2));
        // Calculate Payment & Customer Debt
        let initialPaidAmount = totalAmount;
        if (request.payment_type === 'DEBT') {
            initialPaidAmount = 0;
        }
        else if (request.payment_type === 'PARTIAL') {
            initialPaidAmount = Math.min(request.initial_paid_amount || 0, totalAmount);
        }
        else if (request.payment_type === 'PAID') {
            initialPaidAmount = totalAmount;
        }
        else {
            initialPaidAmount = Math.min(request.initial_paid_amount ?? request.received_amount ?? totalAmount, totalAmount);
        }
        const balanceDue = Math.max(0, totalAmount - initialPaidAmount);
        const paymentStatus = balanceDue <= 0 ? 'PAID' : initialPaidAmount > 0 ? 'PARTIAL' : 'UNPAID';
        const dueDate = request.payment_due_date ? new Date(request.payment_due_date) : (balanceDue > 0 ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null);
        const orderId = await client_1.default.$transaction(async (tx) => {
            // 1. Create order
            const newOrder = await tx.order.create({
                data: {
                    receiptNumber: receiptNumber,
                    sellerId: currentUser.userId,
                    customerId: request.customer_id || null,
                    orderDate: now,
                    totalAmount: totalAmount,
                    paidAmount: initialPaidAmount,
                    balanceDue: balanceDue,
                    paymentStatus: paymentStatus,
                    paymentDueDate: dueDate,
                    discountAmount: request.discount_amount || 0,
                    taxAmount: request.tax_amount || 0,
                    serviceFee: request.service_fee || 0,
                    paymentMethod: request.payment_method,
                },
            });
            // 2. Update Customer Total Debt if balance due > 0
            if (request.customer_id && balanceDue > 0) {
                await tx.customer.update({
                    where: { customerId: request.customer_id },
                    data: {
                        totalDebt: { increment: balanceDue },
                        updatedAt: now,
                    },
                });
            }
            // 3. Create order payment record
            const receivedAmountVal = request.received_amount ?? initialPaidAmount;
            const refNum = request.reference_number || request.transaction_id || null;
            await tx.orderPayment.create({
                data: {
                    orderId: newOrder.orderId,
                    receivedAmount: receivedAmountVal,
                    transactionId: refNum,
                    paymentMethod: request.payment_method,
                    receivedUsd: request.received_usd || 0,
                    receivedKhr: request.received_khr || 0,
                    changeUsd: request.change_usd || 0,
                    changeKhr: request.change_khr || 0,
                    slipUrl: request.slip_url || null,
                    notes: request.notes || null,
                },
            });
            // 4. Record initial customer debt repayment if deposit paid
            if (request.customer_id && initialPaidAmount > 0 && balanceDue > 0) {
                const cpayRand = Math.random().toString(36).slice(2, 6).toUpperCase();
                await tx.customerPayment.create({
                    data: {
                        paymentNumber: `CPAY-${dateStr}-${cpayRand}`,
                        customerId: request.customer_id,
                        orderId: newOrder.orderId,
                        amount: initialPaidAmount,
                        paymentMethod: request.payment_method,
                        notes: 'Initial deposit paid at POS checkout',
                        createdBy: currentUser.userId,
                    },
                });
            }
            // 3. Process items and decrement stock
            for (const item of request.items) {
                const product = await tx.product.findUnique({
                    where: { productId: item.product_id },
                    select: { productName: true, lastPurchaseCost: true },
                });
                if (!product) {
                    throw new exceptions_1.ValidationException(`Product with ID ${item.product_id} not found`);
                }
                const productName = product.productName;
                const fallbackUnitCost = product.lastPurchaseCost != null ? Number(product.lastPurchaseCost) : 0;
                // FIFO Stock Out deduction
                const { totalCost: fifoCOGS } = await stock_service_1.StockService.stockOut(item.product_id, item.quantity, item.unit_price, newOrder.orderId, currentUser.userId, tx, { allowNegative: true, reason: 'ORDER_CREATE' });
                const finalCOGS = fifoCOGS > 0 ? fifoCOGS : fallbackUnitCost * item.quantity;
                await tx.orderItem.create({
                    data: {
                        orderId: newOrder.orderId,
                        productId: item.product_id,
                        productName,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                        costPerUnitAtSale: finalCOGS / item.quantity,
                        cogsLineTotal: finalCOGS,
                        discountAmount: item.discount_amount || 0,
                        subtotal: item.subtotal,
                    },
                });
            }
            // 4. Generate secure ReceiptLink
            const secureCode = receipt_link_service_1.ReceiptLinkService.generateSecureCode();
            await tx.receiptLink.create({
                data: {
                    orderId: newOrder.orderId,
                    code: secureCode,
                    linkStatus: receipt_link_status_enum_1.ReceiptLinkStatus.PENDING,
                    expiresAt: new Date(Date.now() + 20 * 60 * 1000),
                    createdBy: currentUser.userId,
                },
            });
            return newOrder.orderId;
        });
        // Send notifications/events in background
        setImmediate(() => {
            // Emit event for real-time receipt printer waits
            event_bus_1.eventBus.emit(`order_synced:${orderId}`, { orderId });
        });
        // Create Audit Log
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUser.userId,
            action: 'CREATE_ORDER',
            resource: 'Order',
            entityId: orderId,
            details: { receiptNumber, totalAmount },
        });
        return await this.getOrder(orderId, currentUser);
    }
    /**
     * Cashier requests order cancellation with a mandatory reason
     */
    static async requestOrderCancellation(orderId, reason, currentUser) {
        const order = await client_1.default.order.findUnique({ where: { orderId } });
        if (!order) {
            throw new exceptions_1.NotFoundException('Order not found', 'ORDER_NOT_FOUND');
        }
        if (order.orderStatus === 'CANCEL_REQUESTED') {
            throw new exceptions_1.BusinessLogicException('Cancellation request is already pending for this order');
        }
        if (order.orderStatus === 'CANCELLED') {
            throw new exceptions_1.BusinessLogicException('Order is already cancelled');
        }
        const now = new Date();
        await client_1.default.order.update({
            where: { orderId },
            data: {
                orderStatus: 'CANCEL_REQUESTED',
                cancelReason: reason,
                cancelRequestedAt: now,
                cancelRequestedBy: currentUser.userId,
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUser.userId,
            action: 'REQUEST_ORDER_CANCELLATION',
            resource: 'Order',
            entityId: orderId,
            details: { reason },
        });
        return await this.getOrder(orderId, currentUser);
    }
    /**
     * Admin approves cancellation, restores inventory stock & reverses customer debt
     */
    static async approveOrderCancellation(orderId, currentUser) {
        if (!isAdminRole(currentUser.role)) {
            throw new exceptions_1.ForbiddenException('Only admins can approve order cancellations');
        }
        const order = await client_1.default.order.findUnique({
            where: { orderId },
            include: { order_items: true },
        });
        if (!order) {
            throw new exceptions_1.NotFoundException('Order not found', 'ORDER_NOT_FOUND');
        }
        if (order.orderStatus !== 'CANCEL_REQUESTED') {
            throw new exceptions_1.BusinessLogicException('No pending cancellation request found for this order');
        }
        const now = new Date();
        await client_1.default.$transaction(async (tx) => {
            // 1. Update order status to CANCELLED
            await tx.order.update({
                where: { orderId },
                data: {
                    orderStatus: 'CANCELLED',
                    cancelledAt: now,
                    cancelledBy: currentUser.userId,
                },
            });
            // 2. Restore stock for each item
            for (const item of order.order_items) {
                await tx.stock.upsert({
                    where: { productId: item.productId },
                    update: {
                        quantity: { increment: item.quantity },
                        stockVersion: { increment: 1 },
                        updatedAt: now,
                    },
                    create: {
                        productId: item.productId,
                        quantity: item.quantity,
                        stockVersion: 1,
                        updatedAt: now,
                    },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        movementType: 'RETURN',
                        quantity: item.quantity,
                        price: item.unitPrice,
                        reason: `Restock from cancelled order ${order.receiptNumber}`,
                        orderId: order.orderId,
                        createdBy: currentUser.userId,
                        createdAt: now,
                    },
                });
            }
            // 3. Reversely decrement customer total debt if debt was owed
            if (order.customerId && Number(order.balanceDue) > 0) {
                await tx.customer.update({
                    where: { customerId: order.customerId },
                    data: {
                        totalDebt: { decrement: Number(order.balanceDue) },
                        updatedAt: now,
                    },
                });
            }
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUser.userId,
            action: 'APPROVE_ORDER_CANCELLATION',
            resource: 'Order',
            entityId: orderId,
            details: { receiptNumber: order.receiptNumber },
        });
        return await this.getOrder(orderId, currentUser);
    }
    /**
     * Admin rejects order cancellation
     */
    static async rejectOrderCancellation(orderId, rejectionReason, currentUser) {
        if (!isAdminRole(currentUser.role)) {
            throw new exceptions_1.ForbiddenException('Only admins can reject order cancellations');
        }
        const order = await client_1.default.order.findUnique({ where: { orderId } });
        if (!order) {
            throw new exceptions_1.NotFoundException('Order not found', 'ORDER_NOT_FOUND');
        }
        if (order.orderStatus !== 'CANCEL_REQUESTED') {
            throw new exceptions_1.BusinessLogicException('No pending cancellation request found for this order');
        }
        await client_1.default.order.update({
            where: { orderId },
            data: {
                orderStatus: 'COMPLETED',
                rejectionReason: rejectionReason || 'Rejection by admin',
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUser.userId,
            action: 'REJECT_ORDER_CANCELLATION',
            resource: 'Order',
            entityId: orderId,
            details: { rejectionReason },
        });
        return await this.getOrder(orderId, currentUser);
    }
    /**
     * List pending cancellation requests (Admin only)
     */
    static async listCancellationRequests(currentUser) {
        if (!isAdminRole(currentUser.role)) {
            throw new exceptions_1.ForbiddenException('Only admins can view cancellation requests');
        }
        const pendingOrders = await client_1.default.order.findMany({
            where: { orderStatus: 'CANCEL_REQUESTED' },
            orderBy: { cancelRequestedAt: 'desc' },
            select: { orderId: true },
        });
        const results = await Promise.all(pendingOrders.map((o) => this.getOrder(o.orderId, currentUser)));
        return results;
    }
}
exports.OrderService = OrderService;
//# sourceMappingURL=order.service.js.map