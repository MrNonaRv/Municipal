const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /<span className="px-2 py-0\.5 bg-emerald-500\/10 text-emerald-400 border border-emerald-500\/20 rounded-full text-\[8px\] font-black uppercase tracking-widest flex items-center gap-1 shrink-0" title="Connected to the internet and server">\s*<Wifi size=\{10\} className="text-emerald-400 animate-pulse" \/>\s*System Online\s*<\/span>\s*\{syncDiagnostic && \(/,
  `<div className="flex items-center">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0" title="Connected to the internet and server">
                      <Wifi size={10} className="text-emerald-400 animate-pulse" />
                      System Online
                    </span>
                    {syncDiagnostic && (`
);

content = content.replace(
  /DB Sync Status\s*<\/button>\s*\)\}\s*\) : \(/,
  `DB Sync Status
                      </button>
                    )}
                  </div>
                ) : (`
);

fs.writeFileSync('src/App.tsx', content);
