const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(/fs\.existsSync\(configPath\)/g, "(await fs.stat(configPath).then(() => true).catch(() => false))");
content = content.replace(/fs\.readFileSync\(configPath, 'utf8'\)/g, "(await fs.readFile(configPath, 'utf8'))");

fs.writeFileSync('server.ts', content);
