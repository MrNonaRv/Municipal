const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

content = content.replace(
  '<div className="hidden print:block w-full bg-white text-black p-8">',
  '<div className={`hidden ${!showNosa ? \'print:block\' : \'\'} w-full bg-white text-black p-8`}>'
);

fs.writeFileSync('src/components/ProfileModal.tsx', content);
console.log("Updated ProfileModal.tsx print block");
