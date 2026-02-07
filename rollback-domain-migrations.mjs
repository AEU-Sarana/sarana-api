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

// pg requires password to be a string (avoids "client password must be a string")
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
    tables: ['telegram_config', 'telegram_admin_links', 'telegram_admin_messages'],
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
   MIGRATION ROLLBACK ORDER (REVERSE)
================================ */
const migrationRollbackOrder = [
  'shared/202601180000014_create_audit_logs_table',
  'setting/202601180000013_create_settings_table',
  'device-binding/202601180000012_create_device_bindings_table',
  'telegram/202601180000011_create_telegram_admin_messages_table',
  'telegram/202601180000010_create_telegram_admin_links_table',
  'telegram/20260118000009_create_telegram_config_table',
  'stock/20260205000009_add_stock_movements_product_created_at_index',
  'stock/20260118000008_create_stock_movements_table',
  'stock/20260118000007_create_stock_lots_table',
  'stock/20260118000006_create_stocks_table',
  'order/20260118000005_create_order_items_table',
  'order/20260118000004_create_orders_table',
  'shift/20260118000003_create_shifts_table',
  'product/20260118000002_create_products_table',
  'auth/20260118000001_create_users_table',
];

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
   EXTRACT TABLE NAME FROM SQL
================================ */
function extractTableName(sql) {
  // Match CREATE TABLE statements
  const createMatch = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
  if (createMatch) return createMatch[1];

  // Match DROP TABLE statements
  const dropMatch = sql.match(/DROP TABLE\s+(?:IF EXISTS\s+)?(\w+)/i);
  if (dropMatch) return dropMatch[1];

  // Match ALTER TABLE RENAME TO
  const renameMatch = sql.match(/ALTER TABLE\s+(\w+)\s+RENAME TO\s+(\w+)/i);
  if (renameMatch) return renameMatch[2]; // Return target table name

  return null;
}

/* ================================
   ROLLBACK MIGRATIONS
================================ */
async function rollbackMigrations(client, count = null) {
  console.log('⏪ Rolling back migrations...\n');

  const migrationsToRollback = count
    ? migrationRollbackOrder.slice(0, count)
    : migrationRollbackOrder;

  for (const migrationPath of migrationsToRollback) {
    const migrationDir = path.join(
      __dirname,
      'src/database/prisma/migrations/domains',
      migrationPath
    );

    // Check for rollback.sql file first
    const rollbackPath = path.join(migrationDir, 'rollback.sql');
    const migrationPath_full = path.join(migrationDir, 'migration.sql');

    const name = migrationPath.split('/').pop();
    let sql = null;
    let isRollbackFile = false;

    if (fs.existsSync(rollbackPath)) {
      sql = fs.readFileSync(rollbackPath, 'utf-8');
      isRollbackFile = true;
      console.log(`📝 ${name} (rollback.sql)`);
    } else if (fs.existsSync(migrationPath_full)) {
      // Auto-generate rollback from migration.sql
      const migrationSql = fs.readFileSync(migrationPath_full, 'utf-8');
      sql = generateRollbackSQL(migrationSql);
      console.log(`📝 ${name} (auto-generated rollback)`);
    } else {
      console.log(`⚠️  Skipped (missing): ${migrationPath}`);
      continue;
    }

    if (!sql || sql.trim().length === 0) {
      console.log(`⚠️  No rollback SQL available – skipped\n`);
      continue;
    }

    try {
      await client.query(sql);
      console.log(`✅ Rolled back\n`);
    } catch (err) {
      const errorMsg = err.message.toLowerCase();
      // Check for "does not exist" errors (table/index already dropped)
      if (
        errorMsg.includes('does not exist') ||
        errorMsg.includes('not found') ||
        (errorMsg.includes('relation') && errorMsg.includes('does not exist'))
      ) {
        console.log(`⚠️  Already rolled back – skipped\n`);
      } else {
        console.error(`❌ Error: ${err.message}`);
        throw err;
      }
    }
  }
}

/* ================================
   GENERATE ROLLBACK SQL FROM MIGRATION
================================ */
function generateRollbackSQL(migrationSql) {
  const sql = migrationSql.trim();
  const lines = sql.split('\n').map(line => line.trim());
  const rollbackStatements = [];

  // Handle CREATE TABLE -> DROP TABLE
  const createTableMatch = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
  if (createTableMatch) {
    const tableName = createTableMatch[1];
    rollbackStatements.push(`DROP TABLE IF EXISTS ${tableName} CASCADE;`);
  }

  // Handle CREATE INDEX -> DROP INDEX
  const indexMatches = sql.matchAll(/CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF NOT EXISTS\s+)?(\w+)\s+ON\s+(\w+)/gi);
  for (const match of indexMatches) {
    rollbackStatements.push(`DROP INDEX IF EXISTS ${match[1]};`);
  }

  // Handle ALTER TABLE ADD COLUMN -> ALTER TABLE DROP COLUMN
  const addColumnMatches = sql.matchAll(/ALTER TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/gi);
  for (const match of addColumnMatches) {
    rollbackStatements.push(`ALTER TABLE ${match[1]} DROP COLUMN IF EXISTS ${match[2]};`);
  }

  // Handle ALTER TABLE RENAME TO -> reverse rename
  const renameMatch = sql.match(/ALTER TABLE\s+(\w+)\s+RENAME TO\s+(\w+)/i);
  if (renameMatch) {
    const sourceTable = renameMatch[1];
    const targetTable = renameMatch[2];
    rollbackStatements.push(`ALTER TABLE ${targetTable} RENAME TO ${sourceTable};`);

    // Also reverse index renames if present
    const indexRenameMatches = sql.matchAll(/ALTER INDEX\s+(\w+)\s+RENAME TO\s+(\w+)/gi);
    for (const match of indexRenameMatches) {
      rollbackStatements.push(`ALTER INDEX ${match[2]} RENAME TO ${match[1]};`);
    }
  }

  return rollbackStatements.join('\n');
}

/* ================================
   ROLLBACK SPECIFIC DOMAIN
================================ */
async function rollbackDomain(client, domain) {
  console.log(`🔁 Rolling back domain: ${domain}\n`);

  if (!domainConfig[domain]) {
    throw new Error(`❌ Unknown domain: ${domain}`);
  }

  // HARD SAFETY GUARD
  if (domain === 'auth' && process.env.ALLOW_AUTH_RESET !== 'true') {
    throw new Error(
      '❌ Rolling back auth domain is BLOCKED. Set ALLOW_AUTH_RESET=true to override.'
    );
  }

  // Find migrations for this domain and rollback in reverse order
  // Handle both "device-binding" and "device-binding" domain names
  const domainPath = domain.replace('-', '/');
  const domainMigrations = migrationRollbackOrder.filter(migrationPath => {
    const migrationDomain = migrationPath.split('/')[0];
    return migrationDomain === domain || migrationDomain === domainPath;
  });

  if (domainMigrations.length === 0) {
    console.log(`⚠️  No migrations found for domain: ${domain}`);
    return;
  }

  for (const migrationPath of domainMigrations) {
    const migrationDir = path.join(
      __dirname,
      'src/database/prisma/migrations/domains',
      migrationPath
    );

    const rollbackPath = path.join(migrationDir, 'rollback.sql');
    const migrationPath_full = path.join(migrationDir, 'migration.sql');

    const name = migrationPath.split('/').pop();
    let sql = null;

    if (fs.existsSync(rollbackPath)) {
      sql = fs.readFileSync(rollbackPath, 'utf-8');
      console.log(`📝 ${name} (rollback.sql)`);
    } else if (fs.existsSync(migrationPath_full)) {
      const migrationSql = fs.readFileSync(migrationPath_full, 'utf-8');
      sql = generateRollbackSQL(migrationSql);
      console.log(`📝 ${name} (auto-generated rollback)`);
    } else {
      continue;
    }

    if (!sql || sql.trim().length === 0) {
      console.log(`⚠️  No rollback SQL available – skipped\n`);
      continue;
    }

    try {
      await client.query(sql);
      console.log(`✅ Rolled back\n`);
    } catch (err) {
      const errorMsg = err.message.toLowerCase();
      if (
        errorMsg.includes('does not exist') ||
        errorMsg.includes('not found') ||
        (errorMsg.includes('relation') && errorMsg.includes('does not exist'))
      ) {
        console.log(`⚠️  Already rolled back – skipped\n`);
      } else {
        console.error(`❌ Error: ${err.message}`);
        throw err;
      }
    }
  }
}

/* ================================
   MAIN
================================ */
async function main() {
  const mode = process.argv[2]; // all | count | domain
  const arg = process.argv[3];

  if (!mode || !['all', 'count', 'domain'].includes(mode)) {
    console.error('❌ Usage: node rollback-domain-migrations.js <all|count|domain> [count|domain_name]');
    console.error('');
    console.error('Examples:');
    console.error('  node rollback-domain-migrations.js all                    # Rollback all migrations');
    console.error('  node rollback-domain-migrations.js count 3                 # Rollback last 3 migrations');
    console.error('  node rollback-domain-migrations.js domain stock            # Rollback stock domain migrations');
    process.exit(1);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    if (mode === 'all') {
      await rollbackMigrations(client);
    } else if (mode === 'count') {
      const count = parseInt(arg, 10);
      if (isNaN(count) || count < 1) {
        throw new Error('❌ Count must be a positive number');
      }
      await rollbackMigrations(client, count);
    } else if (mode === 'domain') {
      if (!arg) {
        throw new Error('❌ Domain name is required');
      }
      await rollbackDomain(client, arg);
    }

    await client.query('COMMIT');
    console.log('\n✨ Rollback completed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Rollback failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
