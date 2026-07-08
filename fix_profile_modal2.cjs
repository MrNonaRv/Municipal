const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

content = content.replace(
  "onClick={() => window.dispatchEvent(new CustomEvent('gers_drive_auth_expired'))}",
  "onClick={() => window.dispatchEvent(new CustomEvent('gers_open_drive_settings'))}"
);

fs.writeFileSync('src/components/ProfileModal.tsx', content);
console.log("Fixed ProfileModal.tsx again");
