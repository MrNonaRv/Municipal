const { Pool } = require('pg');

async function testExplicitPooler(user, password, label) {
  console.log(`Testing explicit pooler: ${label}...`);
  const pool = new Pool({
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    user: user,
    password: password,
    database: 'postgres',
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
      servername: 'aws-0-ap-southeast-1.pooler.supabase.com'
    }
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
  await testExplicitPooler('postgres.oxtjlhcwibieeuwbhnyj', '[Olanoko15152929]', 'User postgres.oxtjlhcwibieeuwbhnyj, password with brackets');
  await testExplicitPooler('postgres.oxtjlhcwibieeuwbhnyj', 'Olanoko15152929', 'User postgres.oxtjlhcwibieeuwbhnyj, password without brackets');
  await testExplicitPooler('postgres', '[Olanoko15152929]', 'User postgres, password with brackets');
  await testExplicitPooler('postgres', 'Olanoko15152929', 'User postgres, password without brackets');
}

run();
