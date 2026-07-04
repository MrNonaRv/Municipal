const { Pool } = require('pg');

async function test(url, label) {
  console.log(`Testing pooler connection: ${label}...`);
  const pool = new Pool({
    connectionString: url,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS: Connected via pooler!`);
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
  // Option A: Username format 'postgres.oxtjlhcwibieeuwbhnyj' and password with literal brackets
  const urlA = "postgresql://postgres.oxtjlhcwibieeuwbhnyj:[Olanoko15152929]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  // Option B: Username format 'postgres.oxtjlhcwibieeuwbhnyj' and password without brackets
  const urlB = "postgresql://postgres.oxtjlhcwibieeuwbhnyj:Olanoko15152929@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  // Option C: Standard username 'postgres' with password without brackets
  const urlC = "postgresql://postgres:Olanoko15152929@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";
  // Option D: Standard username 'postgres' with password with brackets
  const urlD = "postgresql://postgres:[Olanoko15152929]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres";

  await test(urlA, "Option A (postgres.oxtjlhcwibieeuwbhnyj, password with brackets)");
  await test(urlB, "Option B (postgres.oxtjlhcwibieeuwbhnyj, password without brackets)");
  await test(urlC, "Option C (postgres, password without brackets)");
  await test(urlD, "Option D (postgres, password with brackets)");
}

run();
