const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(/<AnimatePresence>/g, '<AnimatePresence>\n        <Suspense fallback={<div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center"><Loader2 className="animate-spin text-white" size={32} /></div>}>');

content = content.replace(/<\/AnimatePresence>/g, '</Suspense>\n      </AnimatePresence>');

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed Suspense");
