const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

content = content.replace(
  /import \{ Users, FileSpreadsheet, Plus, Search, LayoutGrid, List, Printer, Cloud, CloudOff, Loader2, Wifi, WifiOff, RefreshCw, Activity \} from 'lucide-react';/,
  `import { Users, FileSpreadsheet, Plus, Search, LayoutGrid, List, Printer, Cloud, CloudOff, Loader2, Wifi, WifiOff, RefreshCw, Activity, Database, X, Server, AlertTriangle } from 'lucide-react';`
);

fs.writeFileSync('src/App.tsx', content);
