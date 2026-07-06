const { Client } = require('pg');

const client = new Client({
  host: 'db.oxtjlhcwibieeuwbhnyj.supabase.co',
  port: 6543,
  user: 'postgres',
  password: 'Olanoko_1529',
  database: 'postgres',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('SUCCESS: Connected to direct!');
    await client.end();
  } catch (err) {
    console.error('FAILURE:', err.message);
  }
}
run();
