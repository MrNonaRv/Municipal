const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 resolution first! This avoids ECONNREFUSED or connection timeouts due to IPv6.
dns.setDefaultResultOrder('ipv4first');

async function test(url, label) {
  console.log(`Testing ${label}...`);
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS: Connected with ${label}!`);
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
  const url1 = "postgresql://postgres:[Olanoko15152929]@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";
  const url2 = "postgresql://postgres:%5BOlanoko15152929%5D@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";
  const url3 = "postgresql://postgres:Olanoko15152929@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres";

  await test(url1, "with literal brackets");
  await test(url2, "with url-encoded brackets");
  await test(url3, "WITHOUT brackets (removed)");
}

run();
