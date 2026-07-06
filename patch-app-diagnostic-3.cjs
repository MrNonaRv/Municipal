const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Add states
if (!content.includes('const [syncDiagnostic, setSyncDiagnostic] = useState<any>(null);')) {
  content = content.replace(
    /const \[isOnlineState, setIsOnlineState\] = useState\(navigator.onLine\);/,
    `const [isOnlineState, setIsOnlineState] = useState(navigator.onLine);
  const [syncDiagnostic, setSyncDiagnostic] = useState<any>(null);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);`
  );
}

// Add fetch
if (!content.includes('fetch(\'/api/sync-diagnostic\')')) {
  content = content.replace(
    /useEffect\(\(\) => \{\s*\/\/ Initial data load/,
    `useEffect(() => {
    // Check sync status
    fetch('/api/sync-diagnostic').then(r => r.json()).then(data => setSyncDiagnostic(data)).catch(console.error);
    
    // Initial data load`
  );
}

fs.writeFileSync('src/App.tsx', content);
