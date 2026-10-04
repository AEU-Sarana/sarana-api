"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptLinkService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = __importDefault(require("../../../../database/client"));
const exceptions_1 = require("../../../../shared/exceptions");
const audit_log_service_1 = require("../../../../shared/services/audit-log.service");
const receipt_link_status_enum_1 = require("../../../../domains/Receipt/enums/V1/receipt-link-status.enum");
const DEFAULT_EXPIRE_MINUTES = 20;
class ReceiptLinkService {
    static async createReceiptLink(orderId, currentUserId) {
        const order = await client_1.default.order.findUnique({
            where: { orderId },
            select: {
                orderId: true,
                paymentMethod: true,
                totalAmount: true,
                receiptNumber: true,
            },
        });
        if (!order) {
            throw new exceptions_1.ValidationException('Order not found');
        }
        if (!order.totalAmount || Number(order.totalAmount) <= 0) {
            throw new exceptions_1.BusinessLogicException('Receipt link can only be generated for paid/completed orders');
        }
        const code = this.generateSecureCode();
        const expiresAt = new Date(Date.now() + DEFAULT_EXPIRE_MINUTES * 60 * 1000);
        const result = await client_1.default.$transaction(async (tx) => {
            await tx.receiptLink.updateMany({
                where: {
                    orderId: order.orderId,
                    linkStatus: receipt_link_status_enum_1.ReceiptLinkStatus.PENDING,
                    expiresAt: { gt: new Date() },
                },
                data: {
                    linkStatus: receipt_link_status_enum_1.ReceiptLinkStatus.REVOKED,
                },
            });
            const created = await tx.receiptLink.create({
                data: {
                    orderId: order.orderId,
                    code,
                    linkStatus: receipt_link_status_enum_1.ReceiptLinkStatus.PENDING,
                    expiresAt,
                    createdBy: currentUserId,
                },
            });
            return created;
        });
        await audit_log_service_1.auditLogService.createAuditLog({
            userId: currentUserId,
            action: 'RECEIPT_LINK_CREATED',
            resource: 'ReceiptLink',
            entityId: result.receiptLinkId,
            details: { order_id: order.orderId, expires_at: expiresAt },
        });
        return {
            receipt_link_id: result.receiptLinkId,
            order_id: result.orderId,
            code: result.code,
            link_status: result.linkStatus,
            expires_at: result.expiresAt,
        };
    }
    static async validateReceiptCode(code) {
        const now = new Date();
        const link = await client_1.default.receiptLink.findUnique({
            where: { code },
            include: {
                order: true,
            },
        });
        if (!link) {
            throw new exceptions_1.ValidationException('Invalid receipt code');
        }
        if (link.linkStatus === receipt_link_status_enum_1.ReceiptLinkStatus.USED) {
            throw new exceptions_1.BusinessLogicException('This receipt code was already used');
        }
        if (link.linkStatus === receipt_link_status_enum_1.ReceiptLinkStatus.REVOKED) {
            throw new exceptions_1.BusinessLogicException('This receipt code is no longer active');
        }
        if (link.expiresAt <= now) {
            await client_1.default.receiptLink.update({
                where: { receiptLinkId: link.receiptLinkId },
                data: { linkStatus: receipt_link_status_enum_1.ReceiptLinkStatus.EXPIRED },
            });
            throw new exceptions_1.BusinessLogicException('Receipt code has expired');
        }
        if (!link.order || Number(link.order.totalAmount) <= 0) {
            throw new exceptions_1.BusinessLogicException('Order is not eligible for receipt claim');
        }
        return {
            order_id: link.orderId,
            receipt_number: link.order.receiptNumber,
            link_status: link.linkStatus,
        };
    }
    static generateSecureCode() {
        return crypto_1.default.randomBytes(24).toString('base64url');
    }
}
exports.ReceiptLinkService = ReceiptLinkService;
//# sourceMappingURL=receipt-link.service.js.map