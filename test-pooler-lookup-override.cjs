const { Pool } = require('pg');

async function test(user, password, port, label) {
  console.log(`Testing: ${label}...`);
  const pool = new Pool({
    host: 'db.oxtjlhcwibieeuwbhnyj.supabase.co',
    port: port,
    user: user,
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false
    },
    // Override DNS lookup so db.oxtjlhcwibieeuwbhnyj.supabase.co maps to the pooler's IPv4 IP address!
    // Pooler IPs: 54.255.219.82, 52.74.252.201, 52.77.146.31
    lookup: (hostname, options, callback) => {
      console.log(`  [DNS] Intercepted lookup for: ${hostname}. Resolving to 54.255.219.82`);
      callback(null, '54.255.219.82', 4);
    }
  });

  try {
    const client = await pool.connect();
    console.log(`  => SUCCESS! Connected to ${label}`);
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
  // Let's test both simple and bracketed passwords, on ports 6543 (transaction pooling) and 5432 (session/direct)
  await test('postgres', 'Olanoko15152929', 6543, "Port 6543, simple password");
  await test('postgres', '[Olanoko15152929]', 6543, "Port 6543, brackets password");
  await test('postgres', 'Olanoko15152929', 5432, "Port 5432, simple password");
  await test('postgres', '[Olanoko15152929]', 5432, "Port 5432, brackets password");
}

run();
