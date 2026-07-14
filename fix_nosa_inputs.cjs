const fs = require('fs');
let content = fs.readFileSync('src/components/NOSAModal.tsx', 'utf8');

const positionRules = `<div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Position & Rules</h3>`;

const newRules = `<div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Circulars & Rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">LBC No.</label>
                  <input type="text" value={lbcNo} onChange={e => setLbcNo(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">LBC Date</label>
                  <input type="text" value={lbcDate} onChange={e => setLbcDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">EO No.</label>
                  <input type="text" value={eoNo} onChange={e => setEoNo(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">EO Date</label>
                  <input type="text" value={eoDate} onChange={e => setEoDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Position Details</h3>`;

content = content.replace(positionRules, newRules);

fs.writeFileSync('src/components/NOSAModal.tsx', content);
console.log("Updated NOSAModal.tsx inputs");
