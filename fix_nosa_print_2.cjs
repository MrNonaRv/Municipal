const fs = require('fs');
let content = fs.readFileSync('src/components/NOSAModal.tsx', 'utf8');

// remove the custom <style> tag since we're using index.css .no-print
content = content.replace(/<style>\{`[\s\S]*?`\}<\/style>/g, '');

fs.writeFileSync('src/components/NOSAModal.tsx', content);
console.log("Updated NOSAModal.tsx css");
