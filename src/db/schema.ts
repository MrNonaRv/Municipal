import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import type { Child, Education, ServiceRecord, Attachment } from '../types/employee';

// Define the 'users' table.
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Define the 'employees' table.
export const employees = pgTable('employees', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  originalId: text('original_id').notNull(), // string uuid generated on client
  
  photo: text('photo'), // base64 string
  
  // Personal
  surname: text('surname').notNull().default(''),
  firstName: text('first_name').notNull().default(''),
  middleName: text('middle_name').default(''),
  nameExtension: text('name_extension').default(''),
  sex: text('sex').default(''),
  civilStatus: text('civil_status').default(''),
  citizenship: text('citizenship').default(''),
  height: text('height').default(''),
  weight: text('weight').default(''),
  bloodType: text('blood_type').default(''),
  residentialAddress: text('residential_address').default(''),
  permanentAddress: text('permanent_address').default(''),
  zipCode: text('zip_code').default(''),
  telephone: text('telephone').default(''),
  cellphone: text('cellphone').default(''),
  email: text('email').default(''),
  
  // Gov IDs
  gsisNo: text('gsis_no').default(''),
  pagibigNo: text('pagibig_no').default(''),
  philhealthNo: text('philhealth_no').default(''),
  sssNo: text('sss_no').default(''),
  tin: text('tin').default(''),
  agencyEmployeeNo: text('agency_employee_no').default(''),
  
  // Family
  spouseSurname: text('spouse_surname').default(''),
  spouseFirstName: text('spouse_first_name').default(''),
  spouseMiddleName: text('spouse_middle_name').default(''),
  spouseOccupation: text('spouse_occupation').default(''),
  spouseEmployer: text('spouse_employer').default(''),
  spouseTelephone: text('spouse_telephone').default(''),
  children: jsonb('children').$type<Child[]>().default([]),
  
  fatherSurname: text('father_surname').default(''),
  fatherFirstName: text('father_first_name').default(''),
  fatherMiddleName: text('father_middle_name').default(''),
  motherSurname: text('mother_surname').default(''),
  motherFirstName: text('mother_first_name').default(''),
  motherMiddleName: text('mother_middle_name').default(''),
  
  // Education & Service
  education: jsonb('education').$type<Education[]>().default([]),
  serviceRecords: jsonb('service_records').$type<ServiceRecord[]>().default([]),
  attachments: jsonb('attachments').$type<Attachment[]>().default([]),
  pdsScan: text('pds_scan'),
  
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  employees: many(employees),
}));

export const employeesRelations = relations(employees, ({ one }) => ({
  author: one(users, {
    fields: [employees.userId],
    references: [users.id],
  }),
}));
