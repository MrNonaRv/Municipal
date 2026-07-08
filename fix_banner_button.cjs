const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');
content = content.replace(
  'onClick={() => setIsCSVModalOpen(true)}',
  'onClick={() => { setCsvModalTab(\'gdrive\'); setIsCSVModalOpen(true); setShowAuthExpiredBanner(false); }}'
);
fs.writeFileSync('src/App.tsx', content);
console.log("Fixed banner button");
