"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodController = void 0;
const payment_method_service_1 = require("../../../../domains/Setting/services/payment-method.service");
const logger_1 = require("../../../../shared/utils/logger");
const paymentMethodService = new payment_method_service_1.PaymentMethodService();
class PaymentMethodController {
    static async listPaymentMethods(req, res) {
        try {
            const includeInactive = req.query.include_inactive === 'true' || req.query.all === 'true';
            const methods = await paymentMethodService.getAllPaymentMethods(includeInactive);
            res.status(200).json({
                success: true,
                data: methods,
                message: 'Payment methods retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('List payment methods error', { error: error.message });
            throw error;
        }
    }
    static async getPaymentMethod(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const method = await paymentMethodService.getPaymentMethodById(id);
            res.status(200).json({
                success: true,
                data: method,
                message: 'Payment method retrieved successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Get payment method error', { error: error.message });
            throw error;
        }
    }
    static async createPaymentMethod(req, res) {
        try {
            const method = await paymentMethodService.createPaymentMethod(req.body);
            res.status(201).json({
                success: true,
                data: method,
                message: 'Payment method created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create payment method error', { error: error.message });
            throw error;
        }
    }
    static async updatePaymentMethod(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const method = await paymentMethodService.updatePaymentMethod(id, req.body);
            res.status(200).json({
                success: true,
                data: method,
                message: 'Payment method updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Update payment method error', { error: error.message });
            throw error;
        }
    }
    static async toggleStatus(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const method = await paymentMethodService.togglePaymentMethodStatus(id);
            res.status(200).json({
                success: true,
                data: method,
                message: `Payment method ${method.isActive ? 'activated' : 'deactivated'} successfully`,
            });
        }
        catch (error) {
            logger_1.logger.error('Toggle payment method status error', { error: error.message });
            throw error;
        }
    }
    static async deletePaymentMethod(req, res) {
        try {
            const id = parseInt(req.params.id, 10);
            const result = await paymentMethodService.deletePaymentMethod(id);
            res.status(200).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            logger_1.logger.error('Delete payment method error', { error: error.message });
            throw error;
        }
    }
}
exports.PaymentMethodController = PaymentMethodController;
//# sourceMappingURL=payment-method.controller.js.map