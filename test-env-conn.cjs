const { Client } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: '/.env' });

async function run() {
  console.log('Connecting with DATABASE_URL:', process.env.DATABASE_URL);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('SUCCESS: Connected!');
    await client.end();
  } catch (err) {
    console.error('FAILURE:', err.message);
  }
}
run();
