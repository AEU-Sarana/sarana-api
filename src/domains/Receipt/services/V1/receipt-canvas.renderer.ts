import { createCanvas, registerFont, loadImage } from 'canvas';

// Register Khmer font
const FONT_PATHS = [
    '/usr/share/fonts/noto/NotoSansKhmer-Regular.ttf',
    '/usr/share/fonts/truetype/custom/NotoSansKhmer-Regular.ttf',
    '/home/techey/techey/stock-pos/stock-pos-server/fonts/NotoSansKhmer-Regular.ttf',
];

const BOLD_FONT_PATHS = [
    '/usr/share/fonts/noto/NotoSansKhmer-Bold.ttf',
    '/usr/share/fonts/truetype/custom/NotoSansKhmer-Bold.ttf',
    '/home/techey/techey/stock-pos/stock-pos-server/fonts/NotoSansKhmer-Bold.ttf',
];

const LATIN_FONT_PATH = '/usr/share/fonts/dejavu/DejaVuSans.ttf';
const LATIN_FONT_BOLD_PATH = '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf';

try {
    FONT_PATHS.forEach(p => {
        try { registerFont(p, { family: 'NotoSansKhmer' }); } catch (e) { }
    });
    BOLD_FONT_PATHS.forEach(p => {
        try { registerFont(p, { family: 'NotoSansKhmer', weight: 'bold' }); } catch (e) { }
    });
    registerFont(LATIN_FONT_PATH, { family: 'DejaVuSans' });
    registerFont(LATIN_FONT_BOLD_PATH, { family: 'DejaVuSans', weight: 'bold' });
} catch (e) {
    console.warn('Font registration issue:', e);
}

const FONT_STACK = '"NotoSansKhmer", "DejaVuSans", sans-serif';

export interface ReceiptData {
    storeName: string;
    logoSource?: string | Buffer;
    isLogoEnabled?: boolean;
    phone?: string;
    address?: string;
    receiptNumber: string;
    orderDate: Date;
    orderItems: Array<{
        productName: string;
        quantity: number;
        subtotal: number | string;
    }>;
    totalAmount: number;
    taxAmount?: number;
    discountAmount?: number;
    serviceFee?: number;
    footerNote?: string;
    footerEnabled?: boolean;
    exchangeRate?: number;
}

export async function renderReceiptToPng(data: ReceiptData): Promise<Buffer> {
    /**
     * ULTRA-SHARP 4K CONFIGURATION
     */
    const scale = 4;
    const baseWidth = 600;
    const padding = 50;
    const contentWidth = baseWidth - (padding * 2);

    // Segment Heights (Dynamic)
    const logoHeight = data.isLogoEnabled ? 130 : 0;
    const headerHeight = 160 + logoHeight;
    const tableHeaderHeight = 50;
    const itemLineHeight = 35;
    const totalsAreaHeight = 220 + (data.discountAmount && data.discountAmount > 0 ? 25 : 0) + (data.taxAmount && data.taxAmount > 0 ? 25 : 0) + (data.serviceFee && data.serviceFee > 0 ? 25 : 0);
    const signaturesAreaHeight = 130;
    const footerAreaHeight = 100;
    const bottomMargin = 80;

    const itemsSectionHeight = data.orderItems.length * itemLineHeight;
    const baseHeight = headerHeight + tableHeaderHeight + itemsSectionHeight + totalsAreaHeight + signaturesAreaHeight + footerAreaHeight + bottomMargin;

    const width = baseWidth * scale;
    const height = baseHeight * scale;

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    ctx.scale(scale, scale);
    ctx.textDrawingMode = 'path';
    ctx.antialias = 'subpixel';

    // 1. BACKGROUND
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, baseWidth, baseHeight);

    // Helpers
    const setFont = (size: number, weight: string = '400') => {
        ctx.font = `${weight} ${size}px ${FONT_STACK}`;
    };

    ctx.textBaseline = 'middle';

    // 2 & 3. BILINGUAL HEADER
    let headerRightY = 50;
    let headerLeftY = 50;

    // Left side: Logo & Phone
    if (data.isLogoEnabled && data.logoSource) {
        try {
            const logo = await loadImage(data.logoSource);
            const logoW = 120;
            const logoH = (logo.height / logo.width) * logoW;
            ctx.drawImage(logo, padding, headerLeftY, logoW, logoH);
            headerLeftY += logoH + 15;
            
            // Phone number below logo
            setFont(13, 'bold');
            ctx.fillStyle = '#374151'; // gray-700
            ctx.textAlign = 'left';
            ctx.fillText(`ទូរស័ព្ទ: ${data.phone || '017 62 26 26'}`, padding, headerLeftY);
            headerLeftY += 20;
        } catch (e: any) {
            console.warn('Failed to load receipt logo:', e.message);
            headerLeftY += 10;
        }
    } else {
        // If logo disabled, show phone number
        setFont(13, 'bold');
        ctx.fillStyle = '#374151'; // gray-700
        ctx.textAlign = 'left';
        ctx.fillText(`ទូរស័ព្ទ: ${data.phone || '017 62 26 26'}`, padding, headerLeftY);
        headerLeftY += 20;
    }

    // Right side: Pharmacy & Invoice title headings
    ctx.textAlign = 'right';
    ctx.fillStyle = '#000000';
    
    setFont(17, 'bold');
    ctx.fillText('ឱសថស្ថាន', baseWidth - padding, headerRightY);
    headerRightY += 24;

    setFont(13, 'bold');
    ctx.fillStyle = '#4b5563'; // gray-600
    ctx.fillText('PHARMACIE', baseWidth - padding, headerRightY);
    headerRightY += 32;

    setFont(18, 'bold');
    ctx.fillStyle = '#000000';
    ctx.fillText('វិក្កយបត្រ', baseWidth - padding, headerRightY);
    headerRightY += 28;

    setFont(15, 'bold');
    ctx.fillText('INVOICE', baseWidth - padding, headerRightY);
    headerRightY += 25;

    let currentY = Math.max(headerLeftY, headerRightY) + 20;

    // 4. METADATA LIST (Divided by borders)
    ctx.strokeStyle = '#e5e7eb'; // border-gray-200
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(baseWidth - padding, currentY);
    ctx.stroke();
    
    currentY += 20;

    const drawMetaRow = (label: string, val: string, isValBold: boolean = false) => {
        ctx.textAlign = 'left';
        setFont(14, '400');
        ctx.fillStyle = '#4b5563';
        ctx.fillText(label, padding, currentY);

        ctx.textAlign = 'right';
        setFont(14, isValBold ? 'bold' : '400');
        ctx.fillStyle = '#111111';
        ctx.fillText(val, baseWidth - padding, currentY);

        currentY += 25;
    };

    drawMetaRow('Receipt ID:', data.receiptNumber, true);
    
    const formattedDate = new Intl.DateTimeFormat('en-US', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
        timeZone: 'Asia/Phnom_Penh'
    }).format(new Date(data.orderDate));
    
    drawMetaRow('Date/Time:', formattedDate);
    drawMetaRow('Cashier:', 'Cashier One');
    drawMetaRow('Customer:', 'Walk-in Customer');

    currentY += 5;

    // 5. MODERN BILINGUAL ITEMS TABLE
    // Top border for table header
    ctx.strokeStyle = '#d1d5db'; // border-gray-300
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(baseWidth - padding, currentY);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(padding, currentY, contentWidth, tableHeaderHeight);

    ctx.fillStyle = '#6b7280'; // text-gray-500
    
    // Draw columns headings
    ctx.textAlign = 'left';
    setFont(12, 'bold');
    ctx.fillText('ល.រ', padding, currentY + 15);
    setFont(10, 'bold');
    ctx.fillText('N°', padding, currentY + 32);

    setFont(12, 'bold');
    ctx.fillText('រាយនាមទំនិញ', padding + 40, currentY + 15);
    setFont(10, 'bold');
    ctx.fillText('Name of Goods', padding + 40, currentY + 32);

    setFont(12, 'bold');
    ctx.textAlign = 'center';
    ctx.fillText('ចំនួន', padding + 310, currentY + 15);
    setFont(10, 'bold');
    ctx.fillText('Qty', padding + 310, currentY + 32);

    setFont(12, 'bold');
    ctx.textAlign = 'right';
    ctx.fillText('តម្លៃមួយ', padding + 420, currentY + 15);
    setFont(10, 'bold');
    ctx.fillText('U.Price', padding + 420, currentY + 32);

    setFont(12, 'bold');
    ctx.fillText('តម្លៃសរុប', baseWidth - padding, currentY + 15);
    setFont(10, 'bold');
    ctx.fillText('Amount', baseWidth - padding, currentY + 32);

    // Bottom border for table header
    ctx.beginPath();
    ctx.moveTo(padding, currentY + tableHeaderHeight);
    ctx.lineTo(baseWidth - padding, currentY + tableHeaderHeight);
    ctx.stroke();

    currentY += tableHeaderHeight + 10;

    // Table Body
    setFont(14, '400');
    ctx.fillStyle = '#111111';

    data.orderItems.forEach((item, index) => {
        const rowY = currentY;
        const itemQty = item.quantity;
        const itemSubtotal = Number(item.subtotal);
        const itemUPrice = itemQty > 0 ? itemSubtotal / itemQty : itemSubtotal;

        // Index
        ctx.textAlign = 'left';
        setFont(14, '400');
        ctx.fillText(`${index + 1}`, padding, rowY + 12);

        // Product Name
        let name = item.productName;
        const maxW = 250;
        if (ctx.measureText(name).width > maxW) {
            while (ctx.measureText(name + '...').width > maxW) {
                name = name.substring(0, name.length - 1);
            }
            name += '...';
        }
        ctx.fillText(name, padding + 40, rowY + 12);

        // Qty
        ctx.textAlign = 'center';
        ctx.fillText(`${itemQty}`, padding + 310, rowY + 12);

        // Unit Price
        ctx.textAlign = 'right';
        ctx.fillText(`$${itemUPrice.toFixed(2)}`, padding + 420, rowY + 12);

        // Amount
        ctx.fillText(`$${itemSubtotal.toFixed(2)}`, baseWidth - padding, rowY + 12);

        currentY += itemLineHeight;
    });

    // Add border below items table
    ctx.strokeStyle = '#d1d5db'; // border-gray-300
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(baseWidth - padding, currentY);
    ctx.stroke();

    currentY += 20;

    // 6. TOTALS SUMMARY
    const khrRate = data.exchangeRate || 4000;
    const calculatedSubtotal = data.totalAmount + (data.discountAmount || 0) - (data.taxAmount || 0) - (data.serviceFee || 0);

    const drawSummaryRow = (label: string, usdAmount: number, isDiscount: boolean = false) => {
        ctx.textAlign = 'left';
        setFont(14, '400');
        ctx.fillStyle = '#4b5563'; // text-gray-600
        ctx.fillText(label, padding, currentY);

        ctx.textAlign = 'right';
        setFont(14, '400');
        ctx.fillStyle = isDiscount ? '#dc2626' : '#111111'; // red for discount
        ctx.fillText(`${isDiscount ? '-' : ''}$${usdAmount.toFixed(2)}`, baseWidth - padding, currentY);

        currentY += 25;
    };

    drawSummaryRow('Subtotal:', calculatedSubtotal);
    if (data.discountAmount && data.discountAmount > 0) {
        drawSummaryRow('Discount:', data.discountAmount, true);
    }
    if (data.taxAmount && data.taxAmount > 0) {
        drawSummaryRow('Tax:', data.taxAmount);
    }
    if (data.serviceFee && data.serviceFee > 0) {
        drawSummaryRow('Service Fee:', data.serviceFee);
    }

    currentY += 5;

    // Draw Grand Total Box Outline (Double or Thick Box)
    const totalBoxHeight = 60;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding, currentY, contentWidth, totalBoxHeight);

    // Inside Grand Total Box: left side text, right side USD + KHR
    ctx.fillStyle = '#000000';
    setFont(15, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('សរុប TOTAL', padding + 15, currentY + (totalBoxHeight / 2));

    ctx.textAlign = 'right';
    setFont(17, 'bold');
    ctx.fillText(`$${data.totalAmount.toFixed(2)}`, baseWidth - padding - 15, currentY + 20);

    const rawKhr = data.totalAmount * khrRate;
    const khrAmount = Math.round(rawKhr / 100) * 100;
    setFont(12, 'bold');
    ctx.fillStyle = '#374151'; // gray-700
    ctx.fillText(`${khrAmount.toLocaleString()} KHR`, baseWidth - padding - 15, currentY + 42);

    currentY += totalBoxHeight + 25;

    // 7. SIGNATURE SECTION
    ctx.strokeStyle = '#d1d5db'; // border-gray-300
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(baseWidth - padding, currentY);
    ctx.stroke();

    currentY += 20;

    setFont(12, 'bold');
    ctx.fillStyle = '#1f2937'; // gray-800
    ctx.textAlign = 'left';
    ctx.fillText("អ្នកទិញ / L'acheteur", padding + 10, currentY);

    ctx.textAlign = 'right';
    ctx.fillText("អ្នកលក់ / Le vender", baseWidth - padding - 10, currentY);

    // Spacing for signature line
    currentY += 65;

    ctx.beginPath();
    ctx.moveTo(padding, currentY);
    ctx.lineTo(baseWidth - padding, currentY);
    ctx.stroke();

    currentY += 20;

    // 8. FOOTER SECTION
    ctx.textAlign = 'center';
    setFont(13, 'bold');
    ctx.fillStyle = '#111111';
    ctx.fillText('THANK YOU FOR YOUR PURCHASE!', baseWidth / 2, currentY);
    currentY += 20;

    setFont(10, '400');
    ctx.fillStyle = '#9ca3af'; // gray-400
    ctx.fillText('Medicines are non-refundable once opened. Please check expiry dates.', baseWidth / 2, currentY);

    return canvas.toBuffer('image/png');
}
