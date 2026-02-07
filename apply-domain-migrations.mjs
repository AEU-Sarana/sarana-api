import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/* ================================
   BOOTSTRAP
================================ */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/* ================================
   DOMAIN CONFIG
================================ */
const domainConfig = {
  auth: {
    tables: ['users'],
  },
  product: {
    tables: ['products'],
  },
  shift: {
    tables: ['shifts'],
  },
  order: {
    // child tables FIRST
    tables: ['order_items', 'orders'],
  },
  stock: {
    tables: ['stock_movements', 'stock_lots', 'stocks'],
  },
  telegram: {
    tables: ['telegram_config','telegram_admin_links','telegram_admin_messages'],
  },
  'device-binding': {
    tables: ['device_bindings'],
  },
  setting: {
    tables: ['settings'],
  },
  shared: {
    tables: ['audit_logs'],
  },
};

/* ================================
   MIGRATION APPLY ORDER
================================ */
const migrationOrder = [
  'auth/20260118000001_create_users_table',
  'product/20260118000002_create_products_table',
  'product/20260206000015_add_products_has_expiry_column',
  'shift/20260118000003_create_shifts_table',
  'order/20260118000004_create_orders_table',
  'order/20260118000005_create_order_items_table',
  'stock/20260118000006_create_stocks_table',
  'stock/20260118000007_create_stock_lots_table',
  'stock/20260118000008_create_stock_movements_table',
  'stock/20260205000009_add_stock_movements_product_created_at_index',
  'telegram/20260118000009_create_telegram_config_table',
  'telegram/202601180000010_create_telegram_admin_links_table',
  'telegram/202601180000011_create_telegram_admin_messages_table',
  'device-binding/202601180000012_create_device_bindings_table',
  'setting/202601180000013_create_settings_table',
  'shared/202601180000014_create_audit_logs_table',
];

/* ================================
   EXTRACT TABLE NAME FROM SQL
================================ */
function extractTableName(sql) {
  const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
  return match ? match[1] : null;
}

/* ================================
   CHECK IF TABLE EXISTS
================================ */
async function tableExists(client, tableName) {
  const result = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    )`,
    [tableName]
  );
  return result.rows[0].exists;
}

/* ================================
   APPLY MIGRATIONS
================================ */
async function applyMigrations(client) {
  console.log('🚀 Applying migrations...\n');
  
  for (const migrationPath of migrationOrder) {
    const fullPath = path.join(
      __dirname,
      'src/database/prisma/migrations/domains',
      migrationPath,
      'migration.sql'
    );
    
    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Skipped (missing): ${migrationPath}`);
      continue;
    }
    
    const sql = fs.readFileSync(fullPath, 'utf-8');
    const name = migrationPath.split('/').pop();
    const tableName = extractTableName(sql);
    const isRenameMigration = sql.toLowerCase().includes('rename to');
    const isAlterMigration = sql.toLowerCase().includes('alter table');
    
    // For rename/alter migrations, always try to execute (they handle their own logic)
    if (isRenameMigration || isAlterMigration) {
      // Don't skip - let the SQL handle the logic
    } else {
      // Check if table already exists (for CREATE TABLE migrations)
      if (tableName && await tableExists(client, tableName)) {
        console.log(`📝 ${name}`);
        console.log(`⚠️  Table '${tableName}' already exists – skipped\n`);
        continue;
      }
    }
    
    console.log(`📝 ${name}`);
    try {
      await client.query(sql);
      console.log(`✅ Applied\n`);
    } catch (err) {
      console.error(`❌ Error: ${err.message}`);
      throw err;
    }
  }
}

/* ================================
   RESET DOMAINS (SAFE)
================================ */
async function resetDomains(client, domains) {
  console.log('🔁 Resetting domains...\n');
  
  // HARD SAFETY GUARD
  if (domains.includes('auth') && process.env.ALLOW_AUTH_RESET !== 'true') {
    throw new Error(
      '❌ Resetting auth domain is BLOCKED. Set ALLOW_AUTH_RESET=true to override.'
    );
  }
  
  for (const domain of domains) {
    if (!domainConfig[domain]) {
      throw new Error(`❌ Unknown domain: ${domain}`);
    }
    
    console.log(`🧨 Domain: ${domain}`);
    for (const table of domainConfig[domain].tables) {
      console.log(`   DROP TABLE ${table}`);
      await client.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
    console.log('');
  }
}

/* ================================
   MAIN
================================ */
async function main() {
  const mode = process.argv[2]; // apply | reset
  const domains = process.argv.slice(3);
  
  if (!mode || !['apply', 'reset'].includes(mode)) {
    console.error('❌ Usage: node apply-domain-migrations.js <apply|reset> [domains...]');
    process.exit(1);
  }
  
  if (mode === 'reset' && domains.length === 0) {
    console.error('❌ Reset requires at least one domain');
    process.exit(1);
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    if (mode === 'reset') {
      await resetDomains(client, domains);
    }
    
    if (mode === 'apply') {
      await applyMigrations(client);
    }
    
    await client.query('COMMIT');
    console.log('✨ Done');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
