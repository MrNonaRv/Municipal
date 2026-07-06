import fs from 'fs/promises';
async function run() {
  const data = await fs.readFile('local_db.json', 'utf8');
  const db = JSON.parse(data);
  console.log("Employees in local JSON:", db.employees.length);
}
run();
