import 'dotenv/config';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const force = process.argv.includes('--force') || process.env.ALLOW_FULL_RESET === 'true';

  if (!force) {
    console.error(
      '❌ Full refresh blocked. Re-run with `--force` or set ALLOW_FULL_RESET=true.'
    );
    process.exit(1);
  }

  const client = await pool.connect();
  try {
    console.log('🧨 Dropping schema public (CASCADE)...');
    await client.query('DROP SCHEMA IF EXISTS public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    console.log('✅ Schema recreated');
  } catch (err) {
    console.error('❌ Refresh failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
