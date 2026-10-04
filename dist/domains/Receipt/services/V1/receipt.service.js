"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptLinkController = void 0;
const receipt_link_service_1 = require("../../../../domains/Receipt/services/V1/receipt-link.service");
const logger_1 = require("../../../../shared/utils/logger");
class ReceiptLinkController {
    static async createReceiptLink(req, res) {
        try {
            const orderIdParam = Array.isArray(req.params.order_id)
                ? req.params.order_id[0]
                : req.params.order_id;
            const orderId = parseInt(orderIdParam, 10);
            const user = req.user;
            const data = await receipt_link_service_1.ReceiptLinkService.createReceiptLink(orderId, user.userId);
            res.status(200).json({
                success: true,
                data,
                message: 'Receipt link generated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error('Create receipt link error', { error: error.message });
            throw error;
        }
    }
}
exports.ReceiptLinkController = ReceiptLinkController;
//# sourceMappingURL=receipt.service.js.map