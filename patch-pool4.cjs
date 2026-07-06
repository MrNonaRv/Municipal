const fs = require('fs');

let content = fs.readFileSync('src/db/index.ts', 'utf8');

content = content.replace(
  /const configPath = path\.join\(process\.cwd\(\), 'firebase-applet-config\.json'\);/,
  `let configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (!fs.existsSync(configPath)) {
    configPath = path.join(process.cwd(), '..', 'firebase-applet-config.json');
  }
  if (!fs.existsSync(configPath) && typeof __dirname !== 'undefined') {
    configPath = path.join(__dirname, '..', 'firebase-applet-config.json');
  }`
);

fs.writeFileSync('src/db/index.ts', content);
