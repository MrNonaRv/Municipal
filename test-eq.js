import { pgTable, serial, text, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';

const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  userId: integer('user_id'),
});

console.log(JSON.stringify(eq(employees.userId, 1), null, 2));
