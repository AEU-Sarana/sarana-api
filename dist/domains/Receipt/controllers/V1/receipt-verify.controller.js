"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptVerifyController = void 0;
const logger_1 = require("../../../../shared/utils/logger");
const security_utils_1 = require("../../../../shared/utils/security.utils");
const receipt_image_service_1 = require("../../../../domains/Receipt/services/V1/receipt-image.service");
const receipt_qr_service_1 = require("../../../../domains/Receipt/services/V1/receipt-qr.service");
class ReceiptVerifyController {
    static async verify(req, res) {
        try {
            const { qr, payload, signature } = req.body || {};
            let qrPayload;
            let sig;
            if (qr) {
                const decoded = (0, receipt_qr_service_1.decodeQrPayload)(qr);
                qrPayload = decoded.payload;
                sig = decoded.signature;
            }
            else {
                qrPayload = payload;
                sig = signature;
            }
            if (!qrPayload || !sig) {
                return res.status(400).json({ success: false, message: 'Invalid request' });
            }
            if (!(0, receipt_qr_service_1.isHighEntropyCode)(qrPayload.receipt_code)) {
                return res.status(400).json({ success: false, message: 'Invalid receipt_code format' });
            }
            if (!(0, receipt_qr_service_1.verifyReceiptSignature)(qrPayload, sig)) {
                return res.status(401).json({ success: false, message: 'Invalid signature' });
            }
            const receiptImage = await receipt_image_service_1.ReceiptImageService.generateReceiptJpgFromPayload(qrPayload);
            return res.json({
                success: true,
                verified: true,
                receipt_number: qrPayload.receipt_number,
                total_amount: qrPayload.total_amount,
                receipt_image_url: receiptImage.url,
            });
        }
        catch (error) {
            logger_1.logger.error('Receipt verify error', (0, security_utils_1.sanitizeForLog)({
                message: error.message,
                stack: error.stack,
            }));
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }
}
exports.ReceiptVerifyController = ReceiptVerifyController;
//# sourceMappingURL=receipt-verify.controller.js.map