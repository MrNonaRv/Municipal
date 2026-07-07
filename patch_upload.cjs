const fs = require('fs');

let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  "uploadedAt: new Date(),",
  "uploadedAt: new Date().toISOString(),"
);

content = content.replace(
  "const result = await uploadFileToDrive(selectedFile);",
  "const result = await uploadFileToDrive(selectedFile, selectedFile.name, selectedFile.type);"
);

fs.writeFileSync('src/components/EditModal.tsx', content);
