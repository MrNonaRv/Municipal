const { Pool } = require('pg');

async function test(servername, user, password, port, label) {
  console.log(`Testing: ${label}...`);
  const pool = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: port,
    user: user,
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
      servername: servername
    }
  });
  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS: Connected to ${label}!`);
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
  // Let's test different servername and port combinations:
  // Port 6543 (transaction pooling) and 5432 (session pooling/direct mapping)
  const tenantHost = 'db.oxtjlhcwibieeuwbhnyj.supabase.co';
  
  await test(tenantHost, 'postgres', 'Olanoko15152929', 6543, "User 'postgres', Port 6543, SNI: " + tenantHost);
  await test(tenantHost, 'postgres', '[Olanoko15152929]', 6543, "User 'postgres', Password with brackets, Port 6543, SNI: " + tenantHost);
  await test(tenantHost, 'postgres', 'Olanoko15152929', 5432, "User 'postgres', Port 5432, SNI: " + tenantHost);
  await test(tenantHost, 'postgres', '[Olanoko15152929]', 5432, "User 'postgres', Password with brackets, Port 5432, SNI: " + tenantHost);
}

run();
