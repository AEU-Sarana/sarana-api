"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerService = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const audit_log_service_1 = require("../../../../shared/services/audit-log.service");
class CustomerService {
    /**
     * List customers with pagination, search, and calculated metrics.
     */
    static async listCustomers(request, currentUserId) {
        const { page = 1, limit = 20, search } = request;
        // Build the query filter
        const where = {};
        if (search && search !== 'undefined' && search.trim()) {
            const searchTerm = search.trim();
            where.OR = [
                { fullName: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
            ];
        }
        // Get total count of matching records
        const total = await client_1.default.customer.count({ where });
        // Fetch paginated customers with order details
        const skip = (page - 1) * limit;
        const dbCustomers = await client_1.default.customer.findMany({
            where,
            skip,
            take: limit,
            include: {
                orders: {
                    where: { orderStatus: 'COMPLETED' },
                    select: {
                        orderId: true,
                        orderDate: true,
                        paidAmount: true,
                        totalAmount: true,
                        order_items: {
                            select: {
                                productId: true,
                                productName: true,
                                quantity: true,
                                subtotal: true,
                            },
                        },
                    },
                    orderBy: { orderDate: 'desc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const customers = dbCustomers.map((customer) => {
            const orders = customer.orders || [];
            const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
            const lastBuyAt = orders.length > 0 ? orders[0].orderDate : null;
            // Consolidate purchases per product
            const productMap = {};
            orders.forEach((o) => {
                (o.order_items || []).forEach((item) => {
                    if (!productMap[item.productId]) {
                        productMap[item.productId] = {
                            productId: item.productId,
                            productName: item.productName,
                            quantity: 0,
                            totalSpent: 0,
                        };
                    }
                    productMap[item.productId].quantity += item.quantity;
                    productMap[item.productId].totalSpent += Number(item.subtotal || 0);
                });
            });
            return {
                customerId: customer.customerId,
                fullName: customer.fullName,
                phone: customer.phone,
                email: customer.email,
                deviceId: customer.deviceId,
                totalDebt: Number(customer.totalDebt || 0),
                createdAt: customer.createdAt,
                lastBuyAt,
                totalPaid,
                ordersCount: orders.length,
                purchases: Object.values(productMap).sort((a, b) => b.totalSpent - a.totalSpent),
            };
        });
        // Audit log this search/view
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'LIST_CUSTOMERS',
            entityType: 'Customer',
            oldValues: { filters: { search, page, limit } },
        });
        return {
            customers,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit) || 1,
            },
        };
    }
    /**
     * Create a new customer
     */
    static async createCustomer(payload, currentUserId) {
        const customer = await client_1.default.customer.create({
            data: {
                fullName: payload.full_name.trim(),
                phone: payload.phone ? payload.phone.trim() : null,
                email: payload.email ? payload.email.trim() : null,
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'CREATE_CUSTOMER',
            entityType: 'Customer',
            entityId: customer.customerId,
            newValues: payload,
        });
        return customer;
    }
    /**
     * Update existing customer
     */
    static async updateCustomer(customerId, payload, currentUserId) {
        const existing = await client_1.default.customer.findUnique({
            where: { customerId },
        });
        if (!existing) {
            const error = new Error('Customer not found');
            error.statusCode = 404;
            throw error;
        }
        const updated = await client_1.default.customer.update({
            where: { customerId },
            data: {
                fullName: payload.full_name !== undefined ? payload.full_name.trim() : existing.fullName,
                phone: payload.phone !== undefined ? (payload.phone ? payload.phone.trim() : null) : existing.phone,
                email: payload.email !== undefined ? (payload.email ? payload.email.trim() : null) : existing.email,
            },
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'UPDATE_CUSTOMER',
            entityType: 'Customer',
            entityId: customerId,
            oldValues: { fullName: existing.fullName, phone: existing.phone, email: existing.email },
            newValues: payload,
        });
        return updated;
    }
    /**
     * Get single customer details with order timeline and payment history
     */
    static async getCustomerDetails(customerId) {
        const customer = await client_1.default.customer.findUnique({
            where: { customerId },
            include: {
                orders: {
                    orderBy: { orderDate: 'desc' },
                    take: 20,
                    include: {
                        order_items: true,
                    },
                },
                customer_payments: {
                    orderBy: { paymentDate: 'desc' },
                    take: 20,
                },
            },
        });
        if (!customer) {
            const error = new Error('Customer not found');
            error.statusCode = 404;
            throw error;
        }
        const completedOrders = (customer.orders || []).filter((o) => o.orderStatus === 'COMPLETED');
        const totalPaid = completedOrders.reduce((sum, o) => sum + Number(o.paidAmount || 0), 0);
        const lastBuyAt = completedOrders.length > 0 ? completedOrders[0].orderDate : null;
        return {
            customerId: customer.customerId,
            fullName: customer.fullName,
            phone: customer.phone,
            email: customer.email,
            deviceId: customer.deviceId,
            totalDebt: Number(customer.totalDebt || 0),
            createdAt: customer.createdAt,
            lastBuyAt,
            totalPaid,
            ordersCount: completedOrders.length,
            orders: customer.orders,
            customerPayments: customer.customer_payments,
        };
    }
}
exports.CustomerService = CustomerService;
//# sourceMappingURL=customer.service.js.map