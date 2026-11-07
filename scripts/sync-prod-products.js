const { Client } = require('pg');

const NEON_URL = process.env.PROD_DATABASE_URL || 'postgresql://neondb_owner:npg_OhqXfG59lLMR@ep-cool-block-b5hbfurd-pooler.c-7.us-east-2.aws.neon.tech/neondb?sslmode=require';
const LOCAL_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5434/stock_pos?schema=public';

async function runSync() {
  console.log('Connecting to Neon Cloud DB (Production) and Local DB...');
  const neon = new Client({ connectionString: NEON_URL, connectionTimeoutMillis: 15000 });
  const local = new Client({ connectionString: LOCAL_URL, connectionTimeoutMillis: 10000 });

  await neon.connect();
  console.log('Connected to Neon Cloud DB.');
  await local.connect();
  console.log('Connected to Local DB.');

  try {
    // 1. Fetch data from Neon
    console.log('Fetching users, categories, suppliers, customers, products, stocks, and stock_lots from Neon...');
    const usersRes = await neon.query('SELECT * FROM users WHERE user_id = 4');
    const categoriesRes = await neon.query('SELECT * FROM categories ORDER BY category_id ASC');
    const suppliersRes = await neon.query('SELECT * FROM suppliers ORDER BY supplier_id ASC');
    const customersRes = await neon.query('SELECT * FROM customers ORDER BY customer_id ASC');
    const productsRes = await neon.query('SELECT * FROM products ORDER BY product_id ASC');
    const stocksRes = await neon.query('SELECT * FROM stocks ORDER BY stock_id ASC');
    const lotsRes = await neon.query('SELECT * FROM stock_lots ORDER BY id ASC');

    console.log(`Fetched from Production:
      - Categories: ${categoriesRes.rows.length}
      - Suppliers: ${suppliersRes.rows.length}
      - Customers: ${customersRes.rows.length}
      - Products: ${productsRes.rows.length}
      - Stocks: ${stocksRes.rows.length}
      - Stock Lots: ${lotsRes.rows.length}
    `);

    // 2. Start local transaction
    await local.query('BEGIN');

    // 3. Upsert user 4
    for (const u of usersRes.rows) {
      await local.query(`
        INSERT INTO users (
          user_id, username, business_name, address, email, password_hash, pin_hash, 
          full_name, role, phone, status, device_id, bio, profile_image, 
          created_by, created_at, end_at, updated_by, updated_at, deactivated_date
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        ) ON CONFLICT (user_id) DO NOTHING
      `, [
        u.user_id, u.username, u.business_name, u.address, u.email, u.password_hash, u.pin_hash,
        u.full_name, u.role, u.phone, u.status, u.device_id, u.bio, u.profile_image,
        u.created_by, u.created_at, u.end_at, u.updated_by, u.updated_at, u.deactivated_date
      ]);
    }

    // 4. Upsert categories & deactivate old dummy ones
    await local.query('UPDATE categories SET is_active = false WHERE category_id <= 8');
    for (const c of categoriesRes.rows) {
      await local.query(`
        INSERT INTO categories (
          category_id, name, description, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (category_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          is_active = EXCLUDED.is_active,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `, [c.category_id, c.name, c.description, c.is_active, c.created_at, c.updated_at]);
    }

    // 5. Upsert suppliers
    for (const s of suppliersRes.rows) {
      await local.query(`
        INSERT INTO suppliers (
          supplier_id, company_name, contact_person, phone, email, address, 
          tax_id, payment_terms, is_active, created_at, updated_at, total_debt
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (supplier_id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          contact_person = EXCLUDED.contact_person,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          address = EXCLUDED.address,
          tax_id = EXCLUDED.tax_id,
          payment_terms = EXCLUDED.payment_terms,
          is_active = EXCLUDED.is_active,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          total_debt = EXCLUDED.total_debt
      `, [
        s.supplier_id, s.company_name, s.contact_person, s.phone, s.email, s.address,
        s.tax_id, s.payment_terms, s.is_active, s.created_at, s.updated_at, s.total_debt || '0.00'
      ]);
    }

    // 6. Upsert customers with offset 1000
    const CUST_OFFSET = 1000;
    for (const c of customersRes.rows) {
      const localCustId = CUST_OFFSET + c.customer_id;
      await local.query(`
        INSERT INTO customers (
          customer_id, device_id, full_name, phone, email, total_debt, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (customer_id) DO UPDATE SET
          device_id = EXCLUDED.device_id,
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          email = EXCLUDED.email,
          total_debt = EXCLUDED.total_debt,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `, [
        localCustId, c.device_id, c.full_name, c.phone, c.email,
        c.total_debt || '0.00', c.created_at, c.updated_at
      ]);
    }

    // 7. Upsert products with ID offset = 1000 to show first
    const ID_OFFSET = 1000;
    for (const p of productsRes.rows) {
      const localProductId = ID_OFFSET + p.product_id;
      const createdBy = (p.created_by === 4) ? 4 : 1;
      const updatedBy = (p.updated_by === 4) ? 4 : 1;

      await local.query(`
        INSERT INTO products (
          product_id, product_code, product_name, barcode, price, avg_cost, 
          last_purchase_cost, has_expiry, description, image_path, 
          low_stock_threshold, reorder_point, status, created_by, created_at, 
          updated_by, updated_at, deactivated_date, category_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
        ON CONFLICT (product_id) DO UPDATE SET
          product_code = EXCLUDED.product_code,
          product_name = EXCLUDED.product_name,
          barcode = EXCLUDED.barcode,
          price = EXCLUDED.price,
          avg_cost = EXCLUDED.avg_cost,
          last_purchase_cost = EXCLUDED.last_purchase_cost,
          has_expiry = EXCLUDED.has_expiry,
          description = EXCLUDED.description,
          image_path = EXCLUDED.image_path,
          low_stock_threshold = EXCLUDED.low_stock_threshold,
          reorder_point = EXCLUDED.reorder_point,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          created_at = EXCLUDED.created_at,
          updated_by = EXCLUDED.updated_by,
          updated_at = EXCLUDED.updated_at,
          deactivated_date = EXCLUDED.deactivated_date,
          category_id = EXCLUDED.category_id
      `, [
        localProductId, p.product_code, p.product_name, p.barcode, p.price, p.avg_cost,
        p.last_purchase_cost, p.has_expiry, p.description, p.image_path,
        p.low_stock_threshold, p.reorder_point, p.status, createdBy, p.created_at,
        updatedBy, p.updated_at, p.deactivated_date, p.category_id
      ]);
    }

    // 8. Upsert stocks
    for (const s of stocksRes.rows) {
      const localStockId = ID_OFFSET + s.stock_id;
      const localProductId = ID_OFFSET + s.product_id;

      await local.query(`
        INSERT INTO stocks (
          stock_id, product_id, quantity, stock_version, last_sync_time, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (product_id) DO UPDATE SET
          quantity = EXCLUDED.quantity,
          stock_version = EXCLUDED.stock_version,
          updated_at = EXCLUDED.updated_at
      `, [localStockId, localProductId, s.quantity, s.stock_version, s.last_sync_time, s.updated_at]);
    }

    // 9. Upsert stock lots
    for (const l of lotsRes.rows) {
      const localLotId = ID_OFFSET + l.id;
      const localProductId = ID_OFFSET + l.product_id;

      await local.query(`
        INSERT INTO stock_lots (
          id, product_id, qty_on_hand, received_at, expired_at, cost, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          qty_on_hand = EXCLUDED.qty_on_hand,
          received_at = EXCLUDED.received_at,
          expired_at = EXCLUDED.expired_at,
          cost = EXCLUDED.cost,
          updated_at = EXCLUDED.updated_at
      `, [localLotId, localProductId, l.qty_on_hand, l.received_at, l.expired_at, l.cost, l.created_at, l.updated_at]);
    }

    // 10. Update PostgreSQL sequence counters
    await local.query("SELECT setval('products_product_id_seq', (SELECT COALESCE(MAX(product_id), 1) FROM products))");
    await local.query("SELECT setval('stocks_stock_id_seq', (SELECT COALESCE(MAX(stock_id), 1) FROM stocks))");
    await local.query("SELECT setval('stock_lots_id_seq', (SELECT COALESCE(MAX(id), 1) FROM stock_lots))");
    await local.query("SELECT setval('categories_category_id_seq', (SELECT COALESCE(MAX(category_id), 1) FROM categories))");
    await local.query("SELECT setval('suppliers_supplier_id_seq', (SELECT COALESCE(MAX(supplier_id), 1) FROM suppliers))");
    await local.query("SELECT setval('customers_customer_id_seq', (SELECT COALESCE(MAX(customer_id), 1) FROM customers))");
    await local.query("SELECT setval('users_user_id_seq', (SELECT COALESCE(MAX(user_id), 1) FROM users))");

    await local.query('COMMIT');
    console.log('✅ Full synchronization completed successfully!');
  } catch (err) {
    await local.query('ROLLBACK');
    console.error('❌ Sync failed, rolled back:', err);
    throw err;
  } finally {
    await neon.end();
    await local.end();
  }
}

runSync().catch(err => {
  console.error('Fatal error during sync:', err);
  process.exit(1);
});
