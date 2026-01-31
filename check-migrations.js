import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkMigrations() {
  try {
    // Check Prisma migrations table if it exists
    const migrationsTable = await pool.query(
      `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS exists
      `
    );

    console.log('\n📋 Prisma Migrations Applied:');
    console.log('================================');
    if (!migrationsTable.rows[0].exists) {
      console.log('Prisma migrations table not found (using domain migrations only).');
    } else {
      const migrationsResult = await pool.query(`
        SELECT migration_name, finished_at, applied_steps_count 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC
      `);

      if (migrationsResult.rows.length === 0) {
        console.log('No Prisma migrations found in database.');
      } else {
        migrationsResult.rows.forEach((m) => {
          console.log(`- ${m.migration_name} (${m.finished_at || 'Pending'})`);
        });
      }
    }

    // Check existing tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma%'
      ORDER BY table_name
    `);
    
    console.log('\n📊 Tables in Database:');
    console.log('======================');
    if (tablesResult.rows.length === 0) {
      console.log('No tables found in database.');
    } else {
      tablesResult.rows.forEach((t) => {
        console.log(`✓ ${t.table_name}`);
      });
    }

    // Expected tables from domain migrations
    const expectedTables = [
      'users',
      'products',
      'stocks',
      'stock_movements',
      'orders',
      'order_items',
      'shifts',
      'device_bindings',
      'app_settings',
      'telegram_config',
      'audit_logs',
    ];

    console.log('\n🔍 Migration Status:');
    console.log('===================');
    const existingTableNames = tablesResult.rows.map((t) => t.table_name);
    const missingTables = expectedTables.filter((t) => !existingTableNames.includes(t));
    const extraTables = existingTableNames.filter((t) => !expectedTables.includes(t));

    if (missingTables.length === 0 && extraTables.length === 0) {
      console.log('✅ All expected tables exist!');
    } else {
      if (missingTables.length > 0) {
        console.log('\n❌ Missing tables:');
        missingTables.forEach((t) => console.log(`  - ${t}`));
      }
      if (extraTables.length > 0) {
        console.log('\n⚠️  Extra tables (not in schema):');
        extraTables.forEach((t) => console.log(`  - ${t}`));
      }
    }

    console.log(`\n📈 Summary: ${existingTableNames.length}/${expectedTables.length} expected tables found`);
  } catch (error) {
    console.error('Error checking migrations:', error.message);
  } finally {
    await pool.end();
  }
}

checkMigrations();
