const fs = require('fs');

let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  /records=\{formData\.serviceRecords\}/g,
  "records={formData.serviceRecords || []}"
);
content = content.replace(
  /records=\{formData\.education\}/g,
  "records={formData.education || []}"
);

fs.writeFileSync('src/components/EditModal.tsx', content);
