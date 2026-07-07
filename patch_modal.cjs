const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

content = content.replace(
  /\{employee\.serviceRecords\.map/g,
  "{(employee.serviceRecords || []).map"
);

content = content.replace(
  /\{employee\.serviceRecords\.length/g,
  "{(employee.serviceRecords || []).length"
);

fs.writeFileSync('src/components/ProfileModal.tsx', content);
