const { Pool } = require('pg');
const dns = require('dns');

async function testExplicit(host, password, label) {
  console.log(`Testing with password: "${password}" (${label}) on host ${host}...`);
  const pool = new Pool({
    host: host,
    port: 5432,
    user: 'postgres',
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS with ${label}!`);
    const res = await client.query('SELECT NOW()');
    console.log(`  => Time from DB:`, res.rows[0]);
    client.release();
    return true;
  } catch (err) {
    console.log(`  => FAILED: ${err.message}`);
    return false;
  } finally {
    await pool.end();
  }
}

async function run() {
  dns.lookup('db.oxtjlhcwibieeuwbhnyj.supabase.co', { family: 4 }, async (err, address) => {
    if (err) {
      console.error('DNS lookup failed:', err);
      return;
    }
    console.log('Resolved db.oxtjlhcwibieeuwbhnyj.supabase.co to IPv4:', address);
    await testExplicit(address, '[Olanoko15152929]', 'with literal brackets');
    await testExplicit(address, 'Olanoko15152929', 'WITHOUT brackets');
  });
}

run();
