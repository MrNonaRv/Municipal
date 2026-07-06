const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add state for diagnostic
if (!content.includes('const [syncDiagnostic, setSyncDiagnostic] = useState<any>(null);')) {
  content = content.replace(
    /const \[isOnlineState, setIsOnlineState\] = useState\(true\);/,
    `const [isOnlineState, setIsOnlineState] = useState(true);\n  const [syncDiagnostic, setSyncDiagnostic] = useState<any>(null);\n  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);`
  );
}

// Add fetch for diagnostic
if (!content.includes('/api/sync-diagnostic')) {
  content = content.replace(
    /const checkHealth = async \(\) => \{[\s\S]*?try \{/,
    `const checkHealth = async () => {\n    try {\n      fetch('/api/sync-diagnostic').then(r => r.json()).then(data => setSyncDiagnostic(data)).catch(console.error);`
  );
}

// Add button next to System Online
if (!content.includes('onClick={() => setShowDiagnosticModal(true)}')) {
  content = content.replace(
    /System Online\s*<\/span>/,
    `System Online\n                  </span>\n                  {syncDiagnostic && (\n                    <button onClick={() => setShowDiagnosticModal(true)} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1 shrink-0 ml-2 hover:bg-blue-500/20 transition-colors">\n                      <Database size={10} />\n                      DB Sync Status\n                    </button>\n                  )}`
  );
}

// Ensure Database icon is imported
if (!content.includes('Database')) {
  content = content.replace(/import \{([^}]+)\} from 'lucide-react';/, "import {$1, Database} from 'lucide-react';");
}

// Add diagnostic modal
if (!content.includes('Diagnostic Modal')) {
  content = content.replace(
    /\{isDriveModalOpen && \(/,
    `{/* Diagnostic Modal */}
      {showDiagnosticModal && syncDiagnostic && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Database className="text-blue-400" size={24} />
                Database & Sync Diagnostic
              </h2>
              <button onClick={() => setShowDiagnosticModal(false)} className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-800">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="space-y-4">
                
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Server size={16} className="text-indigo-500" /> Environment Details
                  </h3>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-slate-500 font-medium">Platform:</div>
                    <div className="col-span-2 font-semibold text-slate-800">{syncDiagnostic.environment}</div>
                    
                    <div className="text-slate-500 font-medium">Database Host:</div>
                    <div className="col-span-2 font-mono text-xs text-slate-700 bg-slate-100 p-1 rounded break-all">{syncDiagnostic.database?.host}</div>
                    
                    <div className="text-slate-500 font-medium">DB Source:</div>
                    <div className="col-span-2 font-mono text-xs text-slate-700">{syncDiagnostic.database?.source}</div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <RefreshCw size={16} className="text-emerald-500" /> Sync Status
                  </h3>
                  <p className="text-sm font-medium text-slate-800 mb-2">{syncDiagnostic.syncStatus}</p>
                  
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-md">
                    <p className="text-sm text-blue-800">{syncDiagnostic.message}</p>
                  </div>
                  
                  {syncDiagnostic.database?.source === 'POSTGRES_URL (Environment)' && syncDiagnostic.environment === 'Vercel' && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start gap-3">
                      <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
                      <div className="text-sm text-amber-800">
                        <strong className="block mb-1">Different Database Detected</strong>
                        Vercel is using its own Postgres database (likely Vercel Postgres) instead of Supabase. This means records created in AI Studio won't show up here, and vice versa. 
                        <br/><br/>
                        <strong>How to fix:</strong> In your Vercel Project Settings &rarr; Environment Variables, update <code className="bg-amber-100 px-1 py-0.5 rounded">POSTGRES_URL</code> to match the Supabase URL from AI Studio, then redeploy.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white flex justify-end shrink-0">
              <button 
                onClick={() => setShowDiagnosticModal(false)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {isDriveModalOpen && (`
  );
}

fs.writeFileSync('src/App.tsx', content);
