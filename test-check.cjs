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
    const res = await client.query("SELECT to_regclass('public.system_configs');");
    console.log('Exists:', res.rows[0].to_regclass);
    await client.end();
  } catch (err) {
    console.error(err);
  }
}
run();
