const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetBanner = `      {/* Header */}`;
const newBanner = `      {showAuthExpiredBanner && (
        <div className="bg-red-500 text-white px-4 py-3 flex items-center justify-between shadow-md relative z-50">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-100" />
            <div>
              <p className="font-bold text-sm">Google Drive Session Expired</p>
              <p className="text-xs text-red-100">For security reasons, your Drive session has expired. Please reconnect to resume uploading/downloading files.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => { setCsvModalTab('gdrive'); setIsCSVModalOpen(true); setShowAuthExpiredBanner(false); }}
              className="px-4 py-1.5 bg-white text-red-600 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-red-50 transition-colors shadow-sm"
            >
              Reconnect
            </button>
            <button onClick={() => setShowAuthExpiredBanner(false)} className="text-red-200 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Header */}`;

content = content.replace(targetBanner, newBanner);

fs.writeFileSync('src/App.tsx', content);
console.log("Updated App.tsx with auth expired banner UI");
