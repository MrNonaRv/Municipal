const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/require\('\.\/src\/db\/index\.ts'\)/g, "await import('./src/db/index.ts')");
content = content.replace(/require\('path'\)/g, "await import('path')");
content = content.replace(/require\('fs'\)/g, "await import('fs')");

fs.writeFileSync('server.ts', content);
