const { Pool } = require('pg');

async function run() {
  console.log('Testing direct connection to db.oxtjlhcwibieeuwbhnyj.supabase.co:6543...');
  const pool = new Pool({
    host: 'db.oxtjlhcwibieeuwbhnyj.supabase.co',
    port: 6543,
    user: 'postgres.oxtjlhcwibieeuwbhnyj',
    password: 'Olanoko15152929',
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log('=> SUCCESS!');
    const res = await client.query('SELECT NOW()');
    console.log('=> Time from DB:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('=> FAILED:', err.message);
  } finally {
    await pool.end();
  }
}

run();
