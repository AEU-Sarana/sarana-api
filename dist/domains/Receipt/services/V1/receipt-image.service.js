"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptImageService = void 0;
const client_1 = __importDefault(require("../../../../database/client"));
const exceptions_1 = require("../../../../shared/exceptions");
const file_storage_service_1 = require("../../../../shared/services/file-storage.service");
const sharp_1 = __importDefault(require("sharp"));
const logger_1 = require("../../../../shared/utils/logger");
const DEFAULT_LOGO_URL = 'https://www.techey.tech/_next/image?url=%2Fimages%2Ftechey-logo-white.png&w=640&q=75&dpl=dpl_Gt47Qm69npMNskEchtZXKRJgRxkV';
class ReceiptImageService {
    /**
     * Resolves a logo path to either a Buffer (if storage URL) or the string URL itself.
     */
    static async resolveLogoSource(logoPath) {
        if (!logoPath || logoPath.trim() === '')
            return DEFAULT_LOGO_URL;
        try {
            const key = file_storage_service_1.fileStorageService.extractKeyFromUrl(logoPath);
            if (key) {
                logger_1.logger.info('Resolving logo from storage key', { key });
                return await file_storage_service_1.fileStorageService.downloadFileBuffer(key);
            }
        }
        catch (error) {
            logger_1.logger.warn('Failed to resolve logo from storage key, falling back to URL', {
                logoPath,
                error: error.message
            });
        }
        return logoPath;
    }
    static async buildReceiptDataFromPayload(payload, settings) {
        const logoSource = await this.resolveLogoSource(settings.logoPath || null);
        return {
            storeName: payload.store_name || settings.storeName || 'Name',
            logoSource,
            isLogoEnabled: settings.isLogoEnabled ?? true,
            phone: payload.phone || settings.phone || '0978759989',
            address: payload.address || settings.address || 'Address',
            receiptNumber: payload.receipt_number,
            orderDate: new Date(payload.order_date),
            orderItems: payload.items.map(item => ({
                productName: item.product_name,
                quantity: item.qty,
                subtotal: Number(item.subtotal),
            })),
            totalAmount: Number(payload.total_amount),
            taxAmount: payload.tax_amount ? Number(payload.tax_amount) : undefined,
            discountAmount: payload.discount_amount ? Number(payload.discount_amount) : undefined,
            serviceFee: payload.service_fee ? Number(payload.service_fee) : undefined,
            footerNote: payload.footer_note || settings.footerNote || undefined,
            footerEnabled: settings.isFooterEnabled ?? true,
            exchangeRate: payload.exchange_rate ? Number(payload.exchange_rate) : undefined,
        };
    }
    static async buildReceiptJpg(orderId) {
        const order = await client_1.default.order.findUnique({
            where: { orderId },
            include: { order_items: true },
        });
        if (!order) {
            throw new exceptions_1.ValidationException('Order not found');
        }
        const settings = await client_1.default.receiptSetting.findFirst({
            orderBy: { updatedAt: 'desc' },
        });
        const logoSource = await this.resolveLogoSource(settings?.logoPath || null);
        const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
        const receiptData = {
            storeName: settings?.storeName || 'Name',
            logoSource,
            isLogoEnabled: settings?.isLogoEnabled ?? true,
            phone: settings?.phone || '0978759989',
            address: settings?.address || 'Address',
            receiptNumber: order.receiptNumber,
            orderDate: order.orderDate,
            orderItems: order.order_items.map(item => ({
                productName: item.productName || '',
                quantity: item.quantity,
                subtotal: Number(item.subtotal)
            })),
            totalAmount: Number(order.totalAmount),
            taxAmount: Number(order.taxAmount || 0),
            discountAmount: Number(order.discountAmount || 0),
            serviceFee: Number(order.serviceFee || 0),
            footerNote: settings?.footerNote || undefined,
            footerEnabled: settings?.isFooterEnabled ?? true,
            exchangeRate: 4000
        };
        const pngBuffer = await renderReceiptToPng(receiptData);
        const jpgBuffer = await (0, sharp_1.default)(pngBuffer)
            .jpeg({ quality: 95, mozjpeg: true })
            .toBuffer();
        return { buffer: jpgBuffer, receiptNumber: order.receiptNumber };
    }
    /**
     * Generates a receipt image for a given order.
     * Uses canvas renderer for correct Khmer text shaping.
    */
    static async generateReceiptJpg(orderId) {
        const { buffer: jpgBuffer, receiptNumber } = await this.buildReceiptJpg(orderId);
        const filename = `receipt_${receiptNumber}_${Date.now()}.jpg`;
        const result = await file_storage_service_1.fileStorageService.uploadBuffer(jpgBuffer, filename, 'image/jpeg', 'receipts');
        return {
            url: result.url,
            filename: result.filename,
            key: result.key,
            buffer: jpgBuffer,
        };
    }
    /**
     * Generates a receipt image buffer without uploading to storage.
     */
    static async generateReceiptJpgBuffer(orderId) {
        const { buffer: jpgBuffer, receiptNumber } = await this.buildReceiptJpg(orderId);
        const filename = `receipt_${receiptNumber}_${Date.now()}.jpg`;
        return { buffer: jpgBuffer, filename };
    }
    /**
     * Generates a receipt image from offline QR payload and uploads to storage.
     */
    static async generateReceiptJpgFromPayload(payload) {
        const settings = await client_1.default.receiptSetting.findFirst({
            orderBy: { updatedAt: 'desc' }
        });
        const receiptData = await this.buildReceiptDataFromPayload(payload, {
            storeName: settings?.storeName,
            logoPath: settings?.logoPath,
            isLogoEnabled: settings?.isLogoEnabled,
            phone: settings?.phone,
            address: settings?.address,
            footerNote: settings?.footerNote,
            isFooterEnabled: settings?.isFooterEnabled,
        });
        const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
        const pngBuffer = await renderReceiptToPng(receiptData);
        const jpgBuffer = await (0, sharp_1.default)(pngBuffer)
            .jpeg({ quality: 95, mozjpeg: true })
            .toBuffer();
        const filename = `receipt_${payload.receipt_number}_${Date.now()}.jpg`;
        const result = await file_storage_service_1.fileStorageService.uploadBuffer(jpgBuffer, filename, 'image/jpeg', 'receipts');
        return { url: result.url, filename: result.filename, key: result.key, buffer: jpgBuffer };
    }
    /**
     * Helper method for testing font rendering.
     * Directly uses canvas renderer to generate a simple test image.
     */
    static async testGenerateJpg(displayText) {
        // Generate a minimal receipt data for testing
        const testData = {
            storeName: displayText,
            logoSource: DEFAULT_LOGO_URL,
            receiptNumber: 'TEST-001',
            orderDate: new Date(),
            orderItems: [],
            totalAmount: 0,
            footerEnabled: false
        };
        const { renderReceiptToPng } = await import('./receipt-canvas.renderer.js');
        const pngBuffer = await renderReceiptToPng(testData);
        // Convert to JPG for consistency with existing tests
        return (0, sharp_1.default)(pngBuffer).jpeg().toBuffer();
    }
}
exports.ReceiptImageService = ReceiptImageService;
//# sourceMappingURL=receipt-image.service.js.map