const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// Use regex to match the exact closing sequence
content = content.replace(
  /<\/motion\.div>\s*\)\}\s*<\/AnimatePresence>/,
  '</motion.div>\n                </div>\n              )}\n            </AnimatePresence>'
);

fs.writeFileSync('src/components/ProfileModal.tsx', content);
