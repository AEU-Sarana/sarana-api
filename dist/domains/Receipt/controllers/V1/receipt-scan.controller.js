"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptScanController = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const logger_1 = require("../../../../shared/utils/logger");
const security_utils_1 = require("../../../../shared/utils/security.utils");
class ReceiptScanController {
    /**
     * Handle QR scan from app
     */
    static async scan(req, res) {
        const { receipt_code } = req.body || {};
        try {
            if (!receipt_code || receipt_code.length < 20) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }
            // Find receipt to ensure it exists
            const receipt = await client_1.default.receiptLink.findUnique({
                where: { code: receipt_code }
            });
            if (!receipt) {
                return res.status(404).json({ success: false, message: 'Receipt not found' });
            }
            if (receipt.linkStatus === 'EXPIRED') {
                return res.status(400).json({ success: false, message: 'Receipt has expired' });
            }
            return res.json({
                success: true,
                message: 'Receipt verified successfully',
                receipt
            });
        }
        catch (error) {
            logger_1.logger.error('Receipt scan error', (0, security_utils_1.sanitizeForLog)({
                message: error.message,
                stack: error.stack,
                receipt_code
            }));
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
exports.ReceiptScanController = ReceiptScanController;
//# sourceMappingURL=receipt-scan.controller.js.map