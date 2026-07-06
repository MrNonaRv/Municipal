const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:Olanoko15152929@db.oxtjlhcwibieeuwbhnyj.supabase.co:5432/postgres',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('SUCCESS: Connected to direct!');
    await client.end();
  } catch (err) {
    console.error('FAILURE: Could not connect to direct:', err.message);
  }
}
run();
