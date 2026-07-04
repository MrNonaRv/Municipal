const { Pool } = require('pg');

async function test(user, password, label) {
  console.log(`Testing: ${label}...`);
  const pool = new Pool({
    host: 'db.oxtjlhcwibieeuwbhnyj.supabase.co',
    port: 6543,
    user: user,
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log(`=> SUCCESS! ${label}`);
    const res = await client.query('SELECT NOW()');
    console.log('=> Time:', res.rows[0]);
    client.release();
    return true;
  } catch (err) {
    console.error(`=> FAILED: ${label} -`, err.message);
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  await test('postgres', 'Olanoko15152929', 'Simple password');
  await test('postgres', '[Olanoko15152929]', 'Brackets password');
}

run();
