const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

const badStart = `                    {/* SELECTOR BAR FOR SCAN VS DIGITAL */}
                    {(employee.attachments || []).map((doc) => (`;

const goodStart = `                    <div className="relative mb-8 pb-4 border-b border-slate-200">
                      <h2 className="font-playfair font-black text-3xl mt-2 mb-2 text-[var(--navy)] tracking-tight">SCANNED DOCUMENTS GALLERY</h2>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Official Personnel Scans & Dossier Attachments</p>
                      <div className="w-24 h-1 bg-[var(--gold)] mx-auto mt-4"></div>
                      <div className="absolute top-0 right-0">
                        <button
                          onClick={() => onEdit(employee, 'attachments')}
                          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                          Edit / Manage
                        </button>
                      </div>
                    </div>
                    {driveError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <X size={16} />
                        {driveError}
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {(employee.attachments || []).map((doc) => (`;

content = content.replace(badStart, goodStart);
fs.writeFileSync('src/components/ProfileModal.tsx', content);
