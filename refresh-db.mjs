import 'dotenv/config';
import { Pool } from 'pg';

async function resetDb() {
  console.log('🧹 Dropping all tables from database...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // Get all tables
    const res = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public';
    `);

    const tables = res.rows.map(r => r.tablename);
    
    if (tables.length === 0) {
      console.log('No tables found to drop.');
      return;
    }

    console.log(`Found ${tables.length} tables to drop.`);
    
    // Disable triggers and drop tables cascade
    await client.query('SET session_replication_role = \'replica\';');
    for (const table of tables) {
      await client.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
      console.log(`Dropped table: ${table}`);
    }
    await client.query('SET session_replication_role = \'origin\';');

    console.log('✨ All tables dropped successfully!');
  } catch (error) {
    console.error('Error dropping tables:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb();
