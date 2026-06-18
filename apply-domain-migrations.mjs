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
    tables: ['users', 'refresh_tokens', 'password_reset_otps'],
  },
  product: {
    tables: ['products'],
  },
  category: {
    tables: ['categories'],
  },
  order: {
    tables: ['order_items', 'order_payments', 'orders', 'receipt_links'],
  },
  stock: {
    tables: ['stock_movements', 'stock_lots', 'stocks'],
  },
  telegram: {
    tables: ['telegram_config', 'telegram_admin_links', 'telegram_admin_messages'],
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
  'super-admin': {
    tables: ['packages', 'plans', 'subscriptions', 'package_features', 'subscription_payments'],
  },
};

/* ================================
   MIGRATION APPLY ORDER
================================ */
const migrationOrder = [
  'auth/20260118000001_create_users_table',
  'auth/20260118000002_create_refresh_tokens_table',
  'auth/20260217000001_create_password_reset_otps_table',
  'product/20260118000003_create_products_table',
  'category/20260524000001_create_categories_table',
  'order/20260118000005_create_orders_table',
  'order/20260118000006_create_order_items_table',
  'order/20260316000001_create_order_payments_table',
  'order/20260316000002_update_orders_payment_method_check',
  'setting/20260118000007_create_receipt_settings_table',
  'order/20260118000008_create_receipt_links_table',
  'stock/20260118000009_create_stocks_table',
  'stock/202601180000010_create_stock_lots_table',
  'stock/202601180000011_create_stock_movements_table',
  'telegram/202601180000012_create_telegram_config_table',
  'telegram/202601180000013_create_telegram_admin_links_table',
  'telegram/202601180000014_create_telegram_admin_messages_table',
  'setting/202601180000016_create_settings_table',
  'setting/20260213000001_add_backup_schedule_time_to_settings_table',
  'shared/202601180000017_create_audit_logs_table',
  'customer/20260210000001_create_customers_table',
  'customer/20260210000002_create_customer_telegram_links_table',
  'customer/20260210000003_create_receipt_deliveries_table',
  'customer/20260210000004_create_customer_linking_tokens_table',
  'customer/20260210000005_add_phone_email_to_customers',
  'backup/20260211000005_create_backups_table',
  'backup/20260211000006_create_backup_runs_table',
  'super-admin/20260224000001_create_packages_table',
  'super-admin/20260224000002_create_plans_table',
  'super-admin/20260224000003_create_subscriptions_table',
  'super-admin/20260224000004_create_package_features_table',
  'super-admin/20260224000005_create_subscription_payments_table',
  'order/20260525000001_remove_order_uuid',
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

async function columnExists(client, tableName, columnName) {
  const res = await client.query(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=$1 AND column_name=$2
     ) AS ok`,
    [tableName, columnName]
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

    // Custom check for customer phone/email migration
    if (name === '20260210000005_add_phone_email_to_customers') {
      const hasPhone = await columnExists(client, 'customers', 'phone');
      if (hasPhone) {
        console.log(`📝 ${name}`);
        console.log(`⚠️  Columns for 'customers' already exist – skipped\n`);
        continue;
      }
    }

    const tableName = extractTableName(sql);
    if (tableName) {
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
