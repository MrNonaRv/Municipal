const { Pool } = require('pg');

async function testRegion(region, user, password, port) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Testing region: ${region} (${host})...`);
  const pool = new Pool({
    host: host,
    port: port,
    user: user,
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });
  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS in region ${region}!`);
    const res = await client.query('SELECT NOW()');
    console.log(`  => Time:`, res.rows[0]);
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
  const regions = [
    'ap-southeast-1',
    'us-east-1',
    'us-east-2',
    'eu-central-1',
    'eu-west-1',
    'ap-northeast-1',
    'us-west-2'
  ];
  for (const r of regions) {
    await testRegion(r, 'postgres.oxtjlhcwibieeuwbhnyj', 'Olanoko15152929', 6543);
  }
}

run();
