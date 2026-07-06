const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/const \{ isFallbackActive \} = await import\('\.\/src\/db\/index'\);/g, '');
content = content.replace(/const path = await import\('path'\);/g, '');
content = content.replace(/const fs = await import\('fs'\);/g, '');

fs.writeFileSync('server.ts', content);
