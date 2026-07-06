import fs from 'fs/promises';
async function run() {
  const data = await fs.readFile('database.json', 'utf8');
  const db = JSON.parse(data);
  let count = 0;
  for (const [key, value] of Object.entries(db)) {
    if (value && typeof value === 'object' && 'surname' in value) {
      count++;
    }
  }
  console.log("Employees in database.json:", count);
}
run();
