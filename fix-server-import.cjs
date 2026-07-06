const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const oldContent = `  try {
    const configPath = await import('path').join(process.cwd(), 'firebase-applet-config.json');
    if (await import('fs').existsSync(configPath)) {
      const config = JSON.parse(await import('fs').readFileSync(configPath, 'utf8'));
      fallbackUrl = config.POSTGRES_URL;
    }
  } catch(e) {}`;

const newContent = `  try {
    const path = await import('path');
    const fs = await import('fs');
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      fallbackUrl = config.POSTGRES_URL;
    }
  } catch(e) {}`;

content = content.replace(oldContent, newContent);
fs.writeFileSync('server.ts', content);
