const fs = require('fs');

// Patch App.tsx
let contentApp = fs.readFileSync('src/App.tsx', 'utf8');
contentApp = contentApp.replace(
  /\{emp\.surname\}, \{emp\.firstName\} \{emp\.middleName\}/g,
  '{emp.surname}, {emp.firstName} {emp.middleName ? emp.middleName.charAt(0) + "." : ""} {emp.nameExtension || ""}'
);
contentApp = contentApp.replace(
  /const fullName = \`\$\{emp.firstName\} \$\{emp.surname\}\`.toLowerCase\(\);/g,
  'const fullName = `${emp.firstName} ${emp.surname} ${emp.nameExtension || ""}`.toLowerCase();'
);
fs.writeFileSync('src/App.tsx', contentApp);

// Patch ProfileModal.tsx
let contentProfile = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');
contentProfile = contentProfile.replace(
  /\{employee\.surname\}, \{employee\.firstName\}/g,
  '{employee.surname}, {employee.firstName} {employee.middleName ? employee.middleName.charAt(0) + "." : ""} {employee.nameExtension || ""}'
);
// In ProfileModal, there might be a specific format for the name in the header
contentProfile = contentProfile.replace(
  /\{employee\.firstName\} \{employee\.middleName\?\.charAt\(0\)\}\. \{employee\.surname\}/g,
  '{employee.firstName} {employee.middleName ? employee.middleName.charAt(0) + "." : ""} {employee.surname} {employee.nameExtension || ""}'
);
fs.writeFileSync('src/components/ProfileModal.tsx', contentProfile);
