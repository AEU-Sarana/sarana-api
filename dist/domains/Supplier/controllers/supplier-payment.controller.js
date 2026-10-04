"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierPaymentController = void 0;
const supplier_payment_service_1 = require("../services/supplier-payment.service");
const logger_1 = require("../../../shared/utils/logger");
class SupplierPaymentController {
    /**
     * GET /api/v1/suppliers/debts - Get supplier debt metrics and breakdown
     */
    static async getDebtOverview(req, res) {
        try {
            const overview = await supplier_payment_service_1.SupplierPaymentService.getSupplierDebtOverview();
            return res.json({
                success: true,
                data: overview,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get supplier debt overview', { error: error.message });
            return res.status(500).json({ success: false, message: error.message });
        }
    }
    /**
     * POST /api/v1/suppliers/payments - Record payment to supplier
     */
    static async recordPayment(req, res) {
        try {
            const user = req.user;
            const { supplier_id, po_id, amount, payment_method, reference_number, notes, payment_date } = req.body;
            const payment = await supplier_payment_service_1.SupplierPaymentService.recordPayment({
                supplierId: Number(supplier_id),
                poId: po_id ? Number(po_id) : undefined,
                amount: Number(amount),
                paymentMethod: payment_method,
                referenceNumber: reference_number,
                notes,
                paymentDate: payment_date,
            }, user.userId);
            return res.status(201).json({
                success: true,
                message: 'Supplier payment recorded successfully',
                data: payment,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to record supplier payment', { error: error.message });
            return res.status(400).json({ success: false, message: error.message });
        }
    }
    /**
     * GET /api/v1/suppliers/payments - Get supplier payment history
     */
    static async getPaymentHistory(req, res) {
        try {
            const { supplier_id, po_id, page, limit } = req.query;
            const result = await supplier_payment_service_1.SupplierPaymentService.getPaymentHistory({
                supplierId: supplier_id ? Number(supplier_id) : undefined,
                poId: po_id ? Number(po_id) : undefined,
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 50,
            });
            return res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to get supplier payment history', { error: error.message });
            return res.status(500).json({ success: false, message: error.message });
        }
    }
}
exports.SupplierPaymentController = SupplierPaymentController;
//# sourceMappingURL=supplier-payment.controller.js.map