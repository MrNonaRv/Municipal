const fs = require('fs');
let content = fs.readFileSync('src/components/NOSAModal.tsx', 'utf8');

content = content.replace(
  '<div className="w-full md:w-2/3 bg-slate-200 p-8 overflow-y-auto flex justify-center print:p-0 print:bg-white print:overflow-visible">',
  '<div className="w-full md:w-2/3 bg-slate-200 p-8 overflow-y-auto flex justify-center print:p-0 print:bg-white print:overflow-visible print:block">'
);

fs.writeFileSync('src/components/NOSAModal.tsx', content);
console.log("Updated NOSAModal.tsx print block");
