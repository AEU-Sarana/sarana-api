import pg from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import axios from 'axios';

const { Client } = pg;

const DB_CONFIG = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/stock_pos?schema=public',
};

const MINIO_CONFIG = {
  endpoint: 'http://localhost:9000',
  region: 'us-east-1',
  credentials: {
    accessKeyId: 'minioadmin',
    secretAccessKey: 'minioadmin',
  },
  forcePathStyle: true,
};

const BUCKET_NAME = 'stock-pos-storage';

const s3Client = new S3Client(MINIO_CONFIG);

function sanitizeSlug(str) {
  if (!str) return 'item';
  return str
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'item';
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate an elegant SVG medicine card and render to PNG via sharp
async function generateMedicinePlaceholder(product) {
  const code = escapeXml(product.product_code);
  const name = escapeXml(product.product_name.length > 28 ? product.product_name.substring(0, 25) + '...' : product.product_name);
  
  // Pick a subtle theme color based on product_id
  const palettes = [
    { bg: '#f0fdf4', border: '#bbf7d0', accent: '#16a34a', dark: '#14532d' }, // Green / Pharmacy
    { bg: '#f0f9ff', border: '#bae6fd', accent: '#0284c7', dark: '#0c4a6e' }, // Blue / Medical
    { bg: '#faf5ff', border: '#e9d5ff', accent: '#9333ea', dark: '#581c87' }, // Purple / Care
    { bg: '#fff7ed', border: '#fed7aa', accent: '#ea580c', dark: '#7c2d12' }, // Orange / Wellness
    { bg: '#fdf2f8', border: '#fbcfe8', accent: '#db2777', dark: '#831843' }, // Pink / Health
  ];
  const theme = palettes[product.product_id % palettes.length];

  const svg = `
  <svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${theme.bg}" />
        <stop offset="100%" stop-color="#ffffff" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.08" />
      </filter>
    </defs>

    <!-- Background -->
    <rect width="600" height="600" fill="url(#grad)" />
    <rect x="24" y="24" width="552" height="552" rx="36" fill="none" stroke="${theme.border}" stroke-width="4" />

    <!-- Pharmacy Tag -->
    <g transform="translate(48, 60)">
      <rect width="180" height="36" rx="18" fill="${theme.accent}" opacity="0.12" />
      <text x="90" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="${theme.accent}" text-anchor="middle" letter-spacing="1.5">SARANA POS</text>
    </g>

    <!-- Center Medicine Symbol (Capsule & Cross) -->
    <g transform="translate(300, 260)" filter="url(#shadow)">
      <circle cx="0" cy="0" r="100" fill="#ffffff" stroke="${theme.border}" stroke-width="3" />
      
      <!-- Pill Capsule -->
      <g transform="rotate(-35)">
        <!-- Capsule Left Half -->
        <path d="M -45 -18 L -5 -18 A 18 18 0 0 1 -5 18 L -45 18 A 18 18 0 0 1 -45 -18 Z" fill="${theme.accent}" />
        <!-- Capsule Right Half -->
        <path d="M -5 -18 L 35 -18 A 18 18 0 0 1 35 18 L -5 18 A 18 18 0 0 1 -5 -18 Z" fill="#94a3b8" />
        <!-- Capsule shine -->
        <line x1="-35" y1="-8" x2="25" y2="-8" stroke="#ffffff" stroke-width="3" stroke-linecap="round" opacity="0.6" />
      </g>

      <!-- Small Medical Cross Badge -->
      <g transform="translate(60, -60)">
        <circle cx="0" cy="0" r="24" fill="${theme.accent}" />
        <rect x="-3" y="-12" width="6" height="24" rx="2" fill="#ffffff" />
        <rect x="-12" y="-3" width="24" height="6" rx="2" fill="#ffffff" />
      </g>
    </g>

    <!-- Product Details -->
    <g transform="translate(300, 440)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="800" fill="${theme.dark}" text-anchor="middle">${name}</text>
      <text x="0" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#64748b" text-anchor="middle" letter-spacing="1">CODE: ${code}</text>
    </g>

    <!-- Bottom Quality Badge -->
    <g transform="translate(300, 525)">
      <text x="0" y="0" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="13" font-weight="600" fill="#94a3b8" text-anchor="middle" letter-spacing="1">VERIFIED PHARMACEUTICAL PRODUCT</text>
    </g>
  </svg>
  `;

  return await sharp(Buffer.from(svg)).png().toBuffer();
}

async function fetchImageBuffer(url) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';
    else if (contentType.includes('svg')) ext = 'svg';

    return {
      buffer: Buffer.from(response.data),
      contentType: contentType.split(';')[0],
      ext,
    };
  } catch (err) {
    return null;
  }
}

async function main() {
  console.log('🚀 Starting sync of all product images to MinIO...');

  const client = new Client(DB_CONFIG);
  await client.connect();
  console.log('✅ Connected to PostgreSQL');

  const { rows: products } = await client.query(
    'SELECT product_id, product_code, product_name, image_path FROM products ORDER BY product_id ASC;'
  );

  console.log(`📦 Found ${products.length} products to process.`);

  let successCount = 0;
  let downloadedCount = 0;
  let generatedCount = 0;

  // Process in small batches of 5 to be fast and gentle
  const batchSize = 5;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);

    await Promise.all(
      batch.map(async (prod, idx) => {
        const itemNumber = i + idx + 1;
        const safeCode = sanitizeSlug(prod.product_code);
        let buffer = null;
        let mimeType = 'image/jpeg';
        let ext = 'jpg';

        // 1. Try downloading external image if url exists
        if (prod.image_path && (prod.image_path.startsWith('http://') || prod.image_path.startsWith('https://'))) {
          // If it's not already pointing to MinIO
          if (!prod.image_path.includes(':9000') && !prod.image_path.includes('/storage/stock-pos-storage')) {
            const fetched = await fetchImageBuffer(prod.image_path);
            if (fetched && fetched.buffer && fetched.buffer.length > 500) {
              buffer = fetched.buffer;
              mimeType = fetched.contentType;
              ext = fetched.ext;
              downloadedCount++;
            }
          }
        }

        // 2. If no valid image downloaded, generate custom pharmacy placeholder
        if (!buffer) {
          buffer = await generateMedicinePlaceholder(prod);
          mimeType = 'image/png';
          ext = 'png';
          generatedCount++;
        }

        // 3. Upload to MinIO
        const filename = `product-${prod.product_id}-${safeCode}.${ext}`;
        const key = `products/${filename}`;

        const uploadCmd = new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: key,
          Body: buffer,
          ContentType: mimeType,
          ACL: 'public-read',
        });

        await s3Client.send(uploadCmd);

        // 4. Update Database
        const newImagePath = `http://localhost:3001/storage/${BUCKET_NAME}/${key}`;
        await client.query(
          'UPDATE products SET image_path = $1, updated_at = NOW() WHERE product_id = $2;',
          [newImagePath, prod.product_id]
        );

        successCount++;
        console.log(`[${itemNumber}/${products.length}] ✅ #${prod.product_id} (${prod.product_code}): uploaded ${key}`);
      })
    );
  }

  console.log('\n==========================================');
  console.log(`🎉 Sync Completed Successfully!`);
  console.log(`Total Products: ${products.length}`);
  console.log(`Uploaded to MinIO: ${successCount}`);
  console.log(`Downloaded from Web: ${downloadedCount}`);
  console.log(`Custom High-Res Cards Generated: ${generatedCount}`);
  console.log('==========================================\n');

  await client.end();
}

main().catch((err) => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});

