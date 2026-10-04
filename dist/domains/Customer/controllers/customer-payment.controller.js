"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerPaymentController = void 0;
const customer_payment_service_1 = require("../services/customer-payment.service");
const logger_1 = require("../../../shared/utils/logger");
class CustomerPaymentController {
    /**
     * GET /api/v1/customers/debts - Get customer debt overview & metrics
     */
    static async getDebtOverview(req, res) {
        try {
            const overview = await customer_payment_service_1.CustomerPaymentService.getCustomerDebtOverview();
            return res.json({
                success: true,
                data: overview,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get customer debt overview', { error: error.message });
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * POST /api/v1/customers/payments - Record customer debt repayment
     */
    static async recordPayment(req, res) {
        try {
            const user = req.user;
            const { customer_id, order_id, amount, payment_method, reference_number, notes, payment_date } = req.body;
            const payment = await customer_payment_service_1.CustomerPaymentService.recordPayment({
                customerId: Number(customer_id),
                orderId: order_id ? Number(order_id) : undefined,
                amount: Number(amount),
                paymentMethod: payment_method,
                referenceNumber: reference_number,
                notes,
                paymentDate: payment_date,
            }, user.userId);
            return res.status(201).json({
                success: true,
                message: 'Customer payment recorded successfully',
                data: payment,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to record customer payment', { error: error.message });
            return res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/v1/customers/payments - Get customer payment history
     */
    static async getPaymentHistory(req, res) {
        try {
            const { customer_id, order_id, page, limit } = req.query;
            const result = await customer_payment_service_1.CustomerPaymentService.getPaymentHistory({
                customerId: customer_id ? Number(customer_id) : undefined,
                orderId: order_id ? Number(order_id) : undefined,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 50,
            });
            return res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get customer payment history', { error: error.message });
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.CustomerPaymentController = CustomerPaymentController;
//# sourceMappingURL=customer-payment.controller.js.map