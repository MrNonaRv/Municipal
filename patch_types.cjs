const fs = require('fs');

let content = fs.readFileSync('src/types/employee.ts', 'utf8');

content = content.replace(
  "fileData: string;",
  "fileData?: string;"
);

fs.writeFileSync('src/types/employee.ts', content);
