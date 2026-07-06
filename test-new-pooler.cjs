const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres.oxtjlhcwibieeuwbhnyj:Olanoko_1529@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres',
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    await client.connect();
    console.log('SUCCESS: Connected to new pooler URL!');
    await client.end();
  } catch (err) {
    console.error('FAILURE: Could not connect to pooler:', err.message);
  }
}
run();
