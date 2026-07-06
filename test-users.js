import { db } from './src/db/index.ts';
import { users, employees } from './src/db/schema.ts';
import { eq } from 'drizzle-orm';

async function run() {
  try {
    const allUsers = await db.select().from(users);
    console.log("Users:", allUsers);
    
    for (const u of allUsers) {
      const emps = await db.select().from(employees).where(eq(employees.userId, u.id));
      console.log(`User ${u.uid} (${u.id}) has ${emps.length} employees`);
    }
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}
run();
