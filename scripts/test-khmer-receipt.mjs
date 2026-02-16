import { renderReceiptToPng } from '../src/domains/Receipt/services/V1/receipt-canvas.renderer.ts';
import fs from 'fs';
import path from 'path';

// Mock data with Khmer text
const mockData = {
    storeName: 'ហាងទំនិញអេឡិចត្រូនិច (Electra Store)',
    phone: '012 345 678',
    address: 'ភ្នំពេញ, កម្ពុជា (Phnom Penh, Cambodia)',
    receiptNumber: 'RCP-20240210-001',
    orderDate: new Date(),
    orderItems: [
        { productName: 'កុំព្យូទ័រយួរដៃ Dell', quantity: 1, subtotal: 850.00 },
        { productName: 'កណ្តុរឥតខ្សែ Logitech', quantity: 2, subtotal: 30.00 },
        { productName: 'ក្តារចុចយន្តិក', quantity: 1, subtotal: 45.00 }
    ],
    totalAmount: 935.00,
    taxAmount: 10.00,
    discountAmount: 5.00,
    serviceFee: 5.00,
    footerNote: 'សូមអរគុណ! រីករាយថ្ងៃឈប់សម្រាក!',
    footerEnabled: true,
    isLogoEnabled: true,
    logoPath: 'https://images-platform.99static.com//7nSmR0ty6OpJURaZb9AVBoPzMnk=/360x114:860x614/fit-in/500x500/99designs-contests-attachments/57/57021/attachment_57021024'
};

async function test() {
    console.log('Generating Khmer test receipt...');
    try {
        const pngBuffer = await renderReceiptToPng(mockData);
        const outputPath = path.join(process.cwd(), 'receipt-test.png');
        fs.writeFileSync(outputPath, pngBuffer);
        console.log(`Success! Receipt saved to: ${outputPath}`);
    } catch (error) {
        console.error('Failed to generate test receipt:', error);
        process.exit(1);
    }
}

test();
