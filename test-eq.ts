import { pgTable, serial, integer } from 'drizzle-orm/pg-core';
import { eq } from 'drizzle-orm';
const employees = pgTable('employees', { id: serial('id').primaryKey(), userId: integer('user_id') });
const condition = eq(employees.userId, 1);
console.log(Object.keys(condition));
console.log(condition.queryChunks);
