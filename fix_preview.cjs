const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

const overlay = `
      {/* Document Preview Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col p-2 md:p-6"
          >
            <div className="flex items-center justify-between mb-4 bg-slate-800 p-3 md:p-4 rounded-xl shadow-lg border border-slate-700 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={20} className="text-emerald-400 shrink-0" />
                <h3 className="text-white font-bold text-sm md:text-base truncate">{previewDoc.name}</h3>
                <span className="hidden sm:inline px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md shrink-0">
                  {previewDoc.fileName}
                </span>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 bg-slate-700 hover:bg-red-500 text-white rounded-lg transition-colors shrink-0 flex items-center gap-2 shadow-sm"
              >
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Close</span>
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-black/50 rounded-xl overflow-hidden border border-slate-700 relative flex items-center justify-center">
              {previewDoc.driveFileId ? (
                <iframe src={\`https://drive.google.com/file/d/\${previewDoc.driveFileId}/preview\`} className="w-full h-full border-0" title={previewDoc.name} />
              ) : previewDoc.fileType.startsWith('image/') ? (
                <img src={previewDoc.fileData} alt={previewDoc.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              ) : previewDoc.fileType === 'application/pdf' ? (
                <iframe src={previewDoc.fileData} className="w-full h-full border-0 bg-white" title={previewDoc.name} />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <FileText size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg text-white mb-2">Preview Not Available</p>
                  <p className="text-sm">Please download the file to view it.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}`;

content = content.replace('    </div>\n  );\n}', overlay);
fs.writeFileSync('src/components/ProfileModal.tsx', content);
console.log("Fixed preview");
