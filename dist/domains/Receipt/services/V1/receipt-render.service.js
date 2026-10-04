"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptRenderService = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const exceptions_1 = require("../../../../shared/exceptions");
class ReceiptRenderService {
    static async renderReceiptText(orderId) {
        const order = await client_1.default.order.findUnique({
            where: { orderId },
            include: {
                order_items: true,
            },
        });
        if (!order) {
            throw new exceptions_1.ValidationException('Order not found');
        }
        const settings = await client_1.default.receiptSetting.findFirst({
            orderBy: { updatedAt: 'desc' },
        });
        const storeName = settings?.storeName || 'My Store';
        const footerEnabled = settings?.isFooterEnabled ?? true;
        const footerNote = settings?.footerNote || '';
        const header = [storeName];
        if (settings?.phone)
            header.push(`Phone: ${settings.phone}`);
        if (settings?.address)
            header.push(`Address: ${settings.address}`);
        if (settings?.taxId)
            header.push(`Tax ID: ${settings.taxId}`);
        const itemLines = order.order_items.map((item) => {
            const lineTotal = Number(item.subtotal).toFixed(2);
            return `- ${item.productName} x${item.quantity} = $${lineTotal}`;
        });
        const body = [
            `Receipt No: ${order.receiptNumber}`,
            `Date: ${order.orderDate.toISOString()}`,
            ...itemLines,
            `Total: $${Number(order.totalAmount).toFixed(2)}`,
        ];
        const footer = footerEnabled && footerNote ? [footerNote] : [];
        return [...header, '', ...body, '', ...footer].join('\n');
    }
    // Optional Phase 2 method for PDF/thermal-style rendering
    static async renderReceiptPdf(orderId) {
        throw new Error('PDF rendering not implemented in Phase 1');
    }
}
exports.ReceiptRenderService = ReceiptRenderService;
//# sourceMappingURL=receipt-render.service.js.map