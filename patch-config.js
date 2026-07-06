import fs from 'fs/promises';

async function run() {
  const data = await fs.readFile('firebase-applet-config.json', 'utf8');
  const config = JSON.parse(data);
  config.POSTGRES_URL = process.env.POSTGRES_URL;
  await fs.writeFile('firebase-applet-config.json', JSON.stringify(config, null, 2));
  console.log("Updated firebase-applet-config.json");
}
run();
