"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.POPDFService = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
class POPDFService {
    static generatePOPDF(poData) {
        return new Promise((resolve, reject) => {
            try {
                const doc = new pdfkit_1.default({ margin: 40, size: 'A4' });
                const buffers = [];
                doc.on('data', (chunk) => buffers.push(chunk));
                doc.on('end', () => resolve(Buffer.concat(buffers)));
                // Header / Company Title
                doc.fontSize(20).text('PURCHASE ORDER', { align: 'right' });
                doc.fontSize(10).text(`PO #: ${poData.poNumber}`, { align: 'right' });
                doc.text(`Date: ${new Date(poData.orderDate).toLocaleDateString()}`, { align: 'right' });
                if (poData.expectedDeliveryDate) {
                    doc.text(`Expected Delivery: ${new Date(poData.expectedDeliveryDate).toLocaleDateString()}`, { align: 'right' });
                }
                doc.text(`Status: ${poData.status}`, { align: 'right' });
                doc.moveDown();
                doc.fontSize(14).text('MICROSTORE POS', 40, 40);
                doc.fontSize(9).text('Phnom Penh, Cambodia');
                doc.text('Tel: +855 12 345 678');
                doc.moveDown(2);
                doc.lineWidth(1).moveTo(40, 130).lineTo(550, 130).stroke();
                // Supplier Info Box
                doc.moveDown();
                doc.fontSize(12).text('SUPPLIER / VENDOR:', 40, 145);
                doc.fontSize(11).text(poData.supplier.companyName, 40, 162);
                if (poData.supplier.contactPerson)
                    doc.fontSize(9).text(`Attn: ${poData.supplier.contactPerson}`);
                if (poData.supplier.phone)
                    doc.fontSize(9).text(`Phone: ${poData.supplier.phone}`);
                if (poData.supplier.email)
                    doc.fontSize(9).text(`Email: ${poData.supplier.email}`);
                if (poData.supplier.address)
                    doc.fontSize(9).text(`Address: ${poData.supplier.address}`);
                // Items Table Header
                const tableTop = 240;
                doc.fontSize(10).text('Item Description', 40, tableTop, { width: 230 });
                doc.text('Qty', 280, tableTop, { width: 50, align: 'center' });
                doc.text('Unit Cost ($)', 340, tableTop, { width: 90, align: 'right' });
                doc.text('Subtotal ($)', 450, tableTop, { width: 100, align: 'right' });
                doc.moveTo(40, tableTop + 15).lineTo(550, tableTop + 15).stroke();
                let y = tableTop + 25;
                poData.items.forEach((item) => {
                    doc.fontSize(9).text(item.productName, 40, y, { width: 230 });
                    doc.text(String(item.orderedQuantity), 280, y, { width: 50, align: 'center' });
                    doc.text(Number(item.unitCost).toFixed(2), 340, y, { width: 90, align: 'right' });
                    doc.text(Number(item.subtotal).toFixed(2), 450, y, { width: 100, align: 'right' });
                    y += 20;
                });
                doc.moveTo(40, y).lineTo(550, y).stroke();
                y += 10;
                // Totals
                doc.fontSize(9).text('Subtotal:', 340, y, { width: 90, align: 'right' });
                doc.text(`$${Number(poData.subtotal).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
                y += 15;
                if (Number(poData.discountAmount) > 0) {
                    doc.text('Discount:', 340, y, { width: 90, align: 'right' });
                    doc.text(`-$${Number(poData.discountAmount).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
                    y += 15;
                }
                if (Number(poData.taxAmount) > 0) {
                    doc.text('Tax:', 340, y, { width: 90, align: 'right' });
                    doc.text(`+$${Number(poData.taxAmount).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
                    y += 15;
                }
                doc.fontSize(11).text('Total Amount:', 340, y, { width: 90, align: 'right' });
                doc.text(`$${Number(poData.totalAmount).toFixed(2)}`, 450, y, { width: 100, align: 'right' });
                if (poData.notes) {
                    y += 30;
                    doc.fontSize(10).text('Notes / Instructions:', 40, y);
                    doc.fontSize(9).text(poData.notes, 40, y + 15);
                }
                // Signatures
                doc.fontSize(9).text('Authorized Signature: __________________________', 40, 720);
                doc.text('Supplier Signature: __________________________', 330, 720);
                doc.end();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.POPDFService = POPDFService;
//# sourceMappingURL=po-pdf.service.js.map