import { db } from './src/db/index.ts';
import { employees } from './src/db/schema.ts';

async function run() {
  try {
    const res = await db.select().from(employees).limit(5);
    console.log("Names:", res.map(e => e.surname + " " + e.firstName));
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
