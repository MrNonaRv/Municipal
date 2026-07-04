const dns = require('dns');

// Globally override dns.lookup cleanly
const originalLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  let cb = callback;
  let opts = options;
  if (typeof options === 'function') {
    cb = options;
    opts = {};
  }
  
  if (hostname === 'db.oxtjlhcwibieeuwbhnyj.supabase.co') {
    console.log(`[DNS Bypass] Intercepted lookup for ${hostname} with opts:`, JSON.stringify(opts));
    const ip = '54.255.219.82';
    if (opts && opts.all) {
      return cb(null, [{ address: ip, family: 4 }]);
    }
    return cb(null, ip, 4);
  }
  return originalLookup.call(dns, hostname, options, callback);
};

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
  await test('postgres', 'Olanoko15152929', 6543, "Port 6543, simple password");
  await test('postgres', '[Olanoko15152929]', 6543, "Port 6543, brackets password");
  await test('postgres', 'Olanoko15152929', 5432, "Port 5432, simple password");
  await test('postgres', '[Olanoko15152929]', 5432, "Port 5432, brackets password");
}

run();
