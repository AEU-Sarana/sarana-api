import 'dotenv/config';
import { Pool } from 'pg';

async function clearSupplierCustomerOrderData() {
  console.log('🧹 Clearing Supplier, Customer, and Order data while keeping products, inventory, users, and settings in production...\n');

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL environment variable is missing.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('SET search_path = public;');

    // 1. Check BEFORE counts
    const getCounts = async () => {
      const q = async (table) => {
        try {
          const res = await client.query(`SELECT count(*)::int AS count FROM "${table}";`);
          return res.rows[0].count;
        } catch {
          return 0;
        }
      };

      return {
        customers: await q('customers'),
        customer_payments: await q('customer_payments'),
        customer_linking_tokens: await q('customer_linking_tokens'),
        orders: await q('orders'),
        order_items: await q('order_items'),
        order_payments: await q('order_payments'),
        receipt_links: await q('receipt_links'),
        receipt_deliveries: await q('receipt_deliveries'),
        suppliers: await q('suppliers'),
        supplier_payments: await q('supplier_payments'),
        purchase_orders: await q('purchase_orders'),
        purchase_order_items: await q('purchase_order_items'),
        goods_received: await q('goods_received'),
        goods_received_items: await q('goods_received_items'),
        // Retained tables
        products: await q('products'),
        categories: await q('categories'),
        stocks: await q('stocks'),
        stock_lots: await q('stock_lots'),
        stock_movements: await q('stock_movements'),
        users: await q('users'),
        roles: await q('roles'),
        app_settings: await q('app_settings'),
        receipt_settings: await q('receipt_settings'),
      };
    };

    const before = await getCounts();
    console.log('📊 Current Database State (Before Clearing):');
    console.log('   --- To Be Cleared ---');
    console.log(`   Customers: ${before.customers} | Customer Payments: ${before.customer_payments}`);
    console.log(`   Orders: ${before.orders} | Order Items: ${before.order_items} | Order Payments: ${before.order_payments}`);
    console.log(`   Suppliers: ${before.suppliers} | Supplier Payments: ${before.supplier_payments} | POs: ${before.purchase_orders}`);
    console.log('   --- Strictly Retained ---');
    console.log(`   Products: ${before.products} | Categories: ${before.categories}`);
    console.log(`   Stocks: ${before.stocks} | Stock Lots: ${before.stock_lots} | Stock Movements: ${before.stock_movements}`);
    console.log(`   Users: ${before.users} | Roles: ${before.roles} | Settings: ${before.app_settings}\n`);

    await client.query('BEGIN');

    // 2. Unlink any stock movements associated with orders so inventory history remains intact
    await client.query(`UPDATE stock_movements SET order_id = NULL WHERE order_id IS NOT NULL;`);
    console.log('🔗 Detached order links from stock movements');

    // 3. Tables to truncate (Customers, Suppliers, Orders and their immediate child tables)
    const tablesToTruncate = [
      'customer_payments',
      'customer_linking_tokens',
      'receipt_deliveries',
      'receipt_links',
      'order_payments',
      'order_items',
      'orders',
      'customers',
      'supplier_payments',
      'goods_received_items',
      'goods_received',
      'purchase_order_items',
      'purchase_orders',
      'suppliers',
    ];

    // Find which exist
    const checkRes = await client.query(
      `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = ANY($1);
    `,
      [tablesToTruncate]
    );

    const existingTables = checkRes.rows.map((row) => row.table_name);
    if (existingTables.length > 0) {
      const quotedTables = existingTables.map((t) => `"public"."${t}"`).join(', ');
      await client.query(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE;`);
      for (const t of existingTables) {
        console.log(`   ✓ Truncated: ${t}`);
      }
    }

    await client.query('COMMIT');

    // 4. Check AFTER counts to verify
    const after = await getCounts();
    console.log('\n📊 Database State (After Clearing):');
    console.log('   --- Cleared Tables ---');
    console.log(`   Customers: ${after.customers} (cleared)`);
    console.log(`   Customer Payments: ${after.customer_payments} (cleared)`);
    console.log(`   Orders: ${after.orders} (cleared)`);
    console.log(`   Order Items: ${after.order_items} (cleared)`);
    console.log(`   Order Payments: ${after.order_payments} (cleared)`);
    console.log(`   Suppliers: ${after.suppliers} (cleared)`);
    console.log(`   Supplier Payments: ${after.supplier_payments} (cleared)`);
    console.log(`   Purchase Orders: ${after.purchase_orders} (cleared)`);
    console.log(`   Goods Received: ${after.goods_received} (cleared)`);
    console.log('   --- Verified Retained Production Data ---');
    console.log(`   Products: ${after.products} (retained)`);
    console.log(`   Categories: ${after.categories} (retained)`);
    console.log(`   Stocks: ${after.stocks} (retained)`);
    console.log(`   Stock Lots: ${after.stock_lots} (retained)`);
    console.log(`   Stock Movements: ${after.stock_movements} (retained)`);
    console.log(`   Users: ${after.users} (retained)`);
    console.log(`   Roles: ${after.roles} (retained)`);
    console.log(`   Settings: ${after.app_settings} (retained)`);

    console.log('\n✅ Successfully cleared Supplier, Customer, and Order data while keeping everything else in production!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Failed to clear data, transaction rolled back:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

clearSupplierCustomerOrderData();
