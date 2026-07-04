const { db, checkConnection, isFallbackActive } = require('./src/db/index.ts');
const schema = require('./src/db/schema.ts');

async function run() {
  console.log('Pre-checking connection...');
  await checkConnection();
  console.log('Is Fallback Active:', isFallbackActive());
  try {
    const existing = await db.select().from(schema.employees).limit(1);
    console.log('Successfully queried mock db! Result:', existing);
  } catch (err) {
    console.error('Failed to query mock db:', err);
  }
}

run();
