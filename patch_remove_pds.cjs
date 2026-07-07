const fs = require('fs');

const lines = fs.readFileSync('src/components/EditModal.tsx', 'utf8').split('\n');
// Find the line containing `const handlePdsScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {`
const startHandler = lines.findIndex(l => l.includes('const handlePdsScanUpload'));
let endHandler = -1;
if (startHandler !== -1) {
    for (let i = startHandler; i < lines.length; i++) {
        if (lines[i] === '  };' && lines[i+1] === '') {
            endHandler = i;
            break;
        }
    }
}
let newLines = lines;
if (startHandler !== -1 && endHandler !== -1) {
    newLines.splice(startHandler, endHandler - startHandler + 1);
}

// Find `                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">`
const startGrid = newLines.findIndex(l => l.includes('<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">'));
let endGrid = -1;
if (startGrid !== -1) {
    for (let i = startGrid; i < newLines.length; i++) {
        if (newLines[i].includes('{/* Other Scanned Documents Attachment Form */}')) {
            endGrid = i;
            break;
        }
    }
}
if (startGrid !== -1 && endGrid !== -1) {
    // replace everything from startGrid to endGrid with just an open div
    newLines.splice(startGrid, endGrid - startGrid + 1, '                  <div className="flex flex-col gap-6">');
}

// Now replace `<div className="lg:col-span-2 border border-slate-200 rounded-2xl p-6 bg-slate-50/55 text-slate-900">`
const colSpanIndex = newLines.findIndex(l => l.includes('<div className="lg:col-span-2 border border-slate-200'));
if (colSpanIndex !== -1) {
    newLines[colSpanIndex] = '                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/55 text-slate-900">';
}

fs.writeFileSync('src/components/EditModal.tsx', newLines.join('\n'));
