const { Pool } = require('pg');

async function run() {
  console.log('Testing direct IPv6 database connection...');
  const pool = new Pool({
    host: 'db.oxtjlhcwibieeuwbhnyj.supabase.co',
    port: 5432,
    user: 'postgres',
    password: 'Olanoko15152929',
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log('=> SUCCESS: Connected directly!');
    const res = await client.query('SELECT NOW()');
    console.log('=> Time from DB:', res.rows[0]);
    client.release();
  } catch (err) {
    console.error('=> FAILED:', err.message, err.code);
  } finally {
    await pool.end();
  }
}

run();
