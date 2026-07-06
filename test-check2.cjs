const { checkConnection } = require('./src/db/index.js');
async function run() {
  await checkConnection();
  console.log('done');
  process.exit(0);
}
run();
