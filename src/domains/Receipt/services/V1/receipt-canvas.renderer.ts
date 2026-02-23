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
    const logoHeight = data.isLogoEnabled ? 300 : 0;
    const headerHeight = 180 + logoHeight;
    const tableHeaderHeight = 50;
    const itemLineHeight = 60;
    const totalsAreaHeight = 150;
    const footerAreaHeight = 200;
    const bottomMargin = 100;

    const itemsSectionHeight = data.orderItems.length * itemLineHeight;
    const baseHeight = headerHeight + tableHeaderHeight + itemsSectionHeight + totalsAreaHeight + footerAreaHeight + bottomMargin;

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

    // 2. LOGO SECTION
    let currentY = 50;
    if (data.isLogoEnabled && data.logoSource) {
        try {
            const logo = await loadImage(data.logoSource);
            const logoW = 260;
            const logoH = (logo.height / logo.width) * logoW;
            ctx.drawImage(logo, (baseWidth - logoW) / 2, currentY, logoW, logoH);
            currentY += logoH + 25;
        } catch (e: any) {
            console.warn('Failed to load receipt logo:', e.message);
            currentY += 10;
        }
    }

    // 3. STORE INFO
    ctx.textAlign = 'center';
    setFont(24, 'bold');
    ctx.fillStyle = '#000000';
    ctx.fillText(data.storeName || 'Name', baseWidth / 2, currentY);
    currentY += 50;

    setFont(17, '400');
    ctx.fillStyle = '#444444';
    if (data.phone) {
        ctx.fillText(`Tel: ${data.phone}`, baseWidth / 2, currentY);
        currentY += 30;
    }
    if (data.address) {
        ctx.fillText(data.address, baseWidth / 2, currentY);
        currentY += 30;
    }

    currentY += 40;

    // 4. META INFO GRID
    ctx.textAlign = 'left';
    setFont(14, 'bold');
    ctx.fillStyle = '#888888';
    ctx.fillText('លេខវិក្កយបត្រ / RECEIPT ID', padding, currentY);

    ctx.textAlign = 'right';
    ctx.fillText('កាលបរិច្ឆេទ / DATE', baseWidth - padding, currentY);
    currentY += 28;

    setFont(16, 'bold');
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'left';
    ctx.fillText(data.receiptNumber, padding, currentY);

    ctx.textAlign = 'right';
    // Use the standard application utility for consistency
    const dateStr = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
        timeZone: 'Asia/Phnom_Penh'
    }).format(new Date(data.orderDate));

    ctx.fillText(dateStr, baseWidth - padding, currentY);
    currentY += 55;

    // 5. MODERN ITEMS TABLE
    const col1X = padding;
    const col2X = baseWidth - padding - 150;
    const col3X = baseWidth - padding;

    // Header Styled
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(padding, currentY, contentWidth, tableHeaderHeight);

    ctx.fillStyle = '#ffffff';
    setFont(13, 'bold');
    ctx.textAlign = 'left';
    ctx.fillText('ឈ្មោះទំនិញ (DESCRIPTION)', col1X + 15, currentY + (tableHeaderHeight / 2));
    ctx.textAlign = 'right';
    ctx.fillText('ចំនួន (QTY)', col2X, currentY + (tableHeaderHeight / 2));
    ctx.fillText('សរុប (TOTAL)', col3X - 15, currentY + (tableHeaderHeight / 2));
    currentY += tableHeaderHeight;

    // Table Body
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;

    data.orderItems.forEach((item, index) => {
        // Soft Stripe
        if (index % 2 === 1) {
            ctx.fillStyle = '#f8f8f8';
            ctx.fillRect(padding, currentY, contentWidth, itemLineHeight);
        }

        // Draw Row Bottom Border
        ctx.beginPath();
        ctx.moveTo(padding, currentY + itemLineHeight);
        ctx.lineTo(baseWidth - padding, currentY + itemLineHeight);
        ctx.stroke();

        // Draw Side Borders
        ctx.beginPath();
        ctx.moveTo(padding, currentY); ctx.lineTo(padding, currentY + itemLineHeight);
        ctx.moveTo(baseWidth - padding, currentY); ctx.lineTo(baseWidth - padding, currentY + itemLineHeight);
        ctx.stroke();

        ctx.fillStyle = '#111111';
        setFont(16, '400');

        ctx.textAlign = 'left';
        let name = item.productName;
        const maxW = col2X - col1X - 40;
        if (ctx.measureText(name).width > maxW) {
            while (ctx.measureText(name + '...').width > maxW) {
                name = name.substring(0, name.length - 1);
            }
            name += '...';
        }
        ctx.fillText(name, col1X + 15, currentY + (itemLineHeight / 2));

        ctx.textAlign = 'right';
        ctx.fillText(`${item.quantity}`, col2X, currentY + (itemLineHeight / 2));
        ctx.fillText(`$${Number(item.subtotal).toFixed(2)}`, col3X - 15, currentY + (itemLineHeight / 2));

        currentY += itemLineHeight;
    });

    // 6. TOTALS (Grand)
    currentY += 30;

    const renderTotalLine = (label: string, amount: number, color: string = '#444444', isBold: boolean = false, isKhr: boolean = false) => {
        if (amount === 0 && label !== 'តម្លៃសរុប (GRAND TOTAL)' && label !== 'សរុបជាប្រាក់រៀល (TOTAL KHR)') return;

        ctx.textAlign = 'left';
        setFont(isBold ? 22 : 16, isBold ? 'bold' : '400');
        ctx.fillStyle = color;
        ctx.fillText(label, padding, currentY);

        ctx.textAlign = 'right';
        if (isKhr) {
            ctx.fillText(`${Math.round(amount).toLocaleString()}៛`, baseWidth - padding, currentY);
        } else {
            ctx.fillText(`$${amount.toFixed(2)}`, baseWidth - padding, currentY);
        }
        currentY += isBold ? 50 : 30;
    };


    if (data.discountAmount && data.discountAmount > 0) {
        renderTotalLine('បញ្ចុះតម្លៃ (DISCOUNT)', -data.discountAmount, '#d32f2f');
    }
    if (data.taxAmount && data.taxAmount > 0) {
        renderTotalLine('ពន្ធ (TAX)', data.taxAmount);
    }
    if (data.serviceFee && data.serviceFee > 0) {
        renderTotalLine('សេវា (SERVICE FEE)', data.serviceFee);
    }

    if (data.exchangeRate) {
        ctx.textAlign = 'left';
        setFont(14, '400');
        ctx.fillStyle = '#666666';
        ctx.fillText('អត្រាប្តូរប្រាក់ (EXC RATE)', padding, currentY);

        ctx.textAlign = 'right';
        ctx.fillText(`$1 = ${Number(data.exchangeRate).toLocaleString()}៛`, baseWidth - padding, currentY);
        currentY += 25;
    }

    currentY += 10;
    renderTotalLine('តម្លៃសរុប (GRAND TOTAL)', data.totalAmount, '#1f8f3a', true);

    if (data.exchangeRate) {
        const rawKhr = data.totalAmount * data.exchangeRate;
        // Round up to the nearest 100 KHR (e.g., 7240 -> 7300)
        const khrAmount = Math.ceil(rawKhr / 100) * 100;
        renderTotalLine('សរុបជាប្រាក់រៀល (TOTAL KHR)', khrAmount, '#1f8f3a', true, true);
    }



    currentY += 40;

    // 7. FOOTER SECTION (Modern Cleanup)
    ctx.textAlign = 'center';
    if (data.footerEnabled && data.footerNote) {
        setFont(17, 'bold');
        ctx.fillStyle = '#222222';
        ctx.fillText(data.footerNote, baseWidth / 2, currentY);
        currentY += 40;
    }

    setFont(15, '400');
    ctx.fillStyle = '#777777';
    ctx.fillText('សូមអរគុណចំពោះការមកកាន់ហាងរបស់យើង!', baseWidth / 2, currentY);
    currentY += 28;
    ctx.fillText('THANK YOU FOR YOUR VISIT!', baseWidth / 2, currentY);

    currentY += bottomMargin;

    return canvas.toBuffer('image/png');
}
