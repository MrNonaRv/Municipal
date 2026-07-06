import { db } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';
import { createPool } from './src/db/index.ts';

async function run() {
  try {
    const res = await db.select().from(employees);
    console.log("Employees in DB:", res.length);
  } catch(e) {
    console.error(e);
  }
}
run();
