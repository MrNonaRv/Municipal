const fs = require('fs');

let content = fs.readFileSync('src/components/EmployeeCard.tsx', 'utf8');

content = content.replace(
  /employee\.serviceRecords\.length/g,
  "(employee.serviceRecords || []).length"
);
content = content.replace(
  /employee\.serviceRecords\[/g,
  "(employee.serviceRecords || [])["
);

fs.writeFileSync('src/components/EmployeeCard.tsx', content);
