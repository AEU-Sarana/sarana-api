import { renderReceiptToPng } from '../src/domains/Receipt/services/V1/receipt-canvas.renderer.ts';
import fs from 'fs';
import path from 'path';

// Mock data with Khmer text and exchange rate
const mockData = {
    storeName: 'ហាងទំនិញអេឡិចត្រូនិច (Electra Store)',
    phone: '012 345 678',
    address: 'ភ្នំពេញ, កម្ពុជា (Phnom Penh, Cambodia)',
    receiptNumber: 'RCP-KHR-TOTAL-001',
    orderDate: new Date(),
    orderItems: [
        { productName: 'កុំព្យូទ័រយួរដៃ Dell', quantity: 1, subtotal: 850.00 },
        { productName: 'កណ្តុរឥតខ្សែ Logitech', quantity: 2, subtotal: 30.00 },
    ],
    totalAmount: 880.00,
    footerNote: 'សូមអរគុណ! រីករាយថ្ងៃឈប់សម្រាក!',
    footerEnabled: true,
    isLogoEnabled: false,
    exchangeRate: 4000
};

async function test() {
    console.log('Generating test receipt with KHR total...');
    try {
        const pngBuffer = await renderReceiptToPng(mockData);
        const outputPath = path.join(process.cwd(), 'receipt-khr-test.png');
        fs.writeFileSync(outputPath, pngBuffer);
        console.log(`Success! KHR total should be: ${mockData.totalAmount * mockData.exchangeRate}`);
        console.log(`Receipt saved to: ${outputPath}`);
    } catch (error) {
        console.error('Failed to generate test receipt:', error);
        process.exit(1);
    }
}

test();
