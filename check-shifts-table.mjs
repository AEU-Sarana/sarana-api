import 'dotenv/config';
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function checkColumns() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'shifts' AND column_name = 'exchange_rate';
    `);

        if (res.rows.length > 0) {
            console.log('Column "exchange_rate" exists in "shifts" table:');
            console.table(res.rows);
        } else {
            console.log('Column "exchange_rate" DOES NOT exist in "shifts" table.');
            // Also list all columns just in case
            const allRes = await pool.query(`
                SELECT column_name FROM information_schema.columns WHERE table_name = 'shifts';
            `);
            console.log('All columns in "shifts":', allRes.rows.map(r => r.column_name));
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkColumns();
