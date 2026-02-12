import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'node:fs';
import path from 'node:path';

/* ================================
   BOOTSTRAP
================================ */
const rootDir = process.cwd();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/* ================================
   DOMAIN CONFIG
================================ */
const domainConfig = {
  auth: {
    tables: ['users', 'refresh_tokens'],
  },
  product: {
    tables: ['products'],
  },
  shift: {
    tables: ['shifts'],
  },
  order: {
    tables: ['order_items', 'orders', 'receipt_links'],
  },
  stock: {
    tables: ['stock_movements', 'stock_lots', 'stocks'],
  },
  telegram: {
    tables: ['telegram_config', 'telegram_admin_links', 'telegram_admin_messages'],
  },
  'device-binding': {
    tables: ['device_bindings'],
  },
  setting: {
    tables: ['app_settings', 'receipt_settings'],
  },
  shared: {
    tables: ['audit_logs'],
  },
  customer: {
    tables: ['customers', 'customer_telegram_links', 'receipt_deliveries'],
  },
  backup: {
    tables: ['backups', 'backup_runs'],
  },
};

/* ================================
   MIGRATION APPLY ORDER
================================ */
const migrationOrder = [
  'auth/20260118000001_create_users_table',
  'device-binding/202601180000015_create_device_bindings_table',
  'auth/20260118000002_create_refresh_tokens_table',
  'product/20260118000003_create_products_table',
  'shift/20260118000004_create_shifts_table',
  'order/20260118000005_create_orders_table',
  'order/20260118000006_create_order_items_table',
  'setting/20260118000007_create_receipt_settings_table',
  'order/20260118000008_create_receipt_links_table',
  'stock/20260118000009_create_stocks_table',
  'stock/202601180000010_create_stock_lots_table',
  'stock/202601180000011_create_stock_movements_table',
  'telegram/202601180000012_create_telegram_config_table',
  'telegram/202601180000013_create_telegram_admin_links_table',
  'telegram/202601180000014_create_telegram_admin_messages_table',
  'setting/202601180000016_create_settings_table',
  'shared/202601180000017_create_audit_logs_table',
  'customer/20260210000001_create_customers_table',
  'customer/20260210000002_create_customer_telegram_links_table',
  'customer/20260210000003_create_receipt_deliveries_table',
  'customer/20260210000004_create_customer_linking_tokens_table',
  'backup/20260211000005_create_backups_table',
  'backup/20260211000006_create_backup_runs_table',
];

/* ================================
   HELPERS
================================ */
function extractTableName(sql) {
  const m = sql.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?("?[\w-]+"?)/i);
  if (!m) return null;
  return m[1].replaceAll('"', '');
}

async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema='public' AND table_name=$1
     ) AS ok`,
    [tableName]
  );
  return Boolean(res.rows?.[0]?.ok);
}

function migrationSqlPath(migrationPath) {
  // ✅ Rooted from project root
  return path.join(
    rootDir,
    'src',
    'database',
    'prisma',
    'migrations',
    'domains',
    migrationPath,
    'migration.sql'
  );
}

/* ================================
   APPLY MIGRATIONS
================================ */
async function applyMigrations(client) {
  console.log('🚀 Applying migrations...\n');

  for (const migrationPath of migrationOrder) {
    const sqlPath = migrationSqlPath(migrationPath);
    const name = migrationPath.split('/').pop();

    if (!fs.existsSync(sqlPath)) {
      console.log(`📝 ${name}`);
      console.log(`⚠️  Skipped (missing): ${migrationPath}\n`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, 'utf8');

    // If SQL contains ALTER/RENAME we don't skip
    const lower = sql.toLowerCase();
    const isRenameOrAlter = lower.includes('rename to') || lower.includes('alter table');

    const tableName = extractTableName(sql);
    if (!isRenameOrAlter && tableName) {
      const exists = await tableExists(client, tableName);
      if (exists) {
        console.log(`📝 ${name}`);
        console.log(`⚠️  Table '${tableName}' already exists – skipped\n`);
        continue;
      }
    }

    console.log(`📝 ${name}`);
    try {
      await client.query(sql);
      console.log('✅ Applied\n');
    } catch (err) {
      console.error(`❌ Error in ${name}: ${err.message}`);
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
    throw new Error('❌ Resetting auth domain is BLOCKED. Set ALLOW_AUTH_RESET=true to override.');
  }

  for (const domain of domains) {
    const cfg = domainConfig[domain];
    if (!cfg) throw new Error(`❌ Unknown domain: ${domain}`);

    console.log(`🧨 Domain: ${domain}`);
    for (const table of cfg.tables) {
      console.log(`   DROP TABLE IF EXISTS ${table} CASCADE`);
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
    console.error('❌ Usage: node apply-domain-migrations.mjs <apply|reset> [domains...]');
    process.exit(1);
  }

  if (mode === 'reset' && domains.length === 0) {
    console.error('❌ Reset requires at least one domain');
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (mode === 'reset') await resetDomains(client, domains);
    if (mode === 'apply') await applyMigrations(client);

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
