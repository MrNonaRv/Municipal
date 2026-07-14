const fs = require('fs');
let content = fs.readFileSync('src/types/employee.ts', 'utf8');

const nosaType = `export interface NOSARecord {
  id: string;
  dateOfNotice: string;
  newSg: string;
  newStep: string;
  newSalary: string;
  newDate: string;
  oldSg: string;
  oldStep: string;
  oldSalary: string;
  oldDate: string;
  designation: string;
  itemNo: string;
  fy: string;
  lbcNo: string;
  lbcDate: string;
  eoNo: string;
  eoDate: string;
  mayorName: string;
  createdAt: string;
}

`;

content = nosaType + content;
content = content.replace("attachments?: Attachment[];", "attachments?: Attachment[];\n  nosaRecords?: NOSARecord[];");

fs.writeFileSync('src/types/employee.ts', content);
console.log("Updated employee.ts types");
