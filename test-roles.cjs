const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: { rejectUnauthorized: false }
  });
  try {
    await client.connect();
    await client.query("CREATE TABLE IF NOT EXISTS test_create (id int);");
    console.log('Table created');
    await client.end();
  } catch (err) {
    console.error(err);
  }
}
run();
