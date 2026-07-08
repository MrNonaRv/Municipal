const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

const targetError = `{driveError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <X size={16} />
                        {driveError}
                      </div>
                    )}`;

const newError = `{driveError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} />
                          <span>{driveError}</span>
                        </div>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('gers_drive_auth_expired'))}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          Reconnect Drive
                        </button>
                      </div>
                    )}`;

content = content.replace(targetError, newError);

// Add AlertTriangle import if not present
if (!content.includes('AlertTriangle')) {
  content = content.replace('X,', 'X, AlertTriangle,');
}

fs.writeFileSync('src/components/ProfileModal.tsx', content);
console.log("Fixed ProfileModal.tsx");
