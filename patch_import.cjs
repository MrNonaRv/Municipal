const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

content = content.replace(
  "import { downloadFileFromDrive as downloadFileFromGDrive } from '../services/driveStorage';",
  "import { downloadFileFromDrive as downloadFileFromGDrive, deleteFileFromDrive } from '../services/driveStorage';"
);

fs.writeFileSync('src/components/ProfileModal.tsx', content);

