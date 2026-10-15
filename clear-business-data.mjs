import 'dotenv/config';
import { Pool } from 'pg';

async function clearBusinessData() {
  console.log('🧹 Clearing business data while keeping user authentication credentials...');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  // Tables to clear (leaving users, roles, permissions, settings intact)
  const tablesToClear = [
    // Order & Sales Transactions
    'order_payments',
    'order_items',
    'receipt_links',
    'receipt_deliveries',
    'orders',

    // Stock & Inventory
    'stock_movements',
    'stock_lots',
    'stocks',

    // Purchasing & Suppliers
    'supplier_payments',
    'goods_received_items',
    'goods_received',
    'purchase_order_items',
    'purchase_orders',
    'suppliers',

    // Customers & Linking
    'customer_payments',
    'customer_linking_tokens',
    'customers',

    // Products & Categories
    'products',
    'categories',

    // Logs, Backups & Transient Auth Tokens
    'audit_logs',
    'backup_runs',
    'backups',
    'report_exports',
    'password_reset_otps',
    'refresh_tokens',
  ];

  try {
    await client.query('SET search_path = public;');
    await client.query('BEGIN');

    // Find all matching tables that actually exist in the database
    const checkRes = await client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1);
    `,
      [tablesToClear]
    );

    const existingTables = checkRes.rows.map((row) => row.table_name);

    if (existingTables.length > 0) {
      // Truncate all identified business tables in a single statement with CASCADE and RESTART IDENTITY
      const quotedTables = existingTables.map((t) => `"public"."${t}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);

      for (const table of existingTables) {
        console.log(`✅ Truncated table: ${table}`);
      }
    } else {
      console.log('ℹ️ No matching business tables found to truncate.');
    }

    await client.query('COMMIT');

    console.log('\n✨ Business data cleared successfully!');
    console.log('🔐 Preserved Authentication & Configuration:');
    console.log('   - users (Accounts, Passwords, PINs)');
    console.log('   - roles & role_permissions');
    console.log('   - user_permissions');
    console.log('   - app_settings & receipt_settings');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error clearing business data:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearBusinessData();
