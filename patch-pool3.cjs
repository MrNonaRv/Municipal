const fs = require('fs');

let content = fs.readFileSync('src/db/index.ts', 'utf8');

content = content.replace(
  /export const createPool = \(\) => \{\n  let fallbackPostgresUrl = null;/,
  `let globalFallbackPostgresUrl = null;
try {
  const fs = require('fs');
  const path = require('path');
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    if (config.POSTGRES_URL) {
      globalFallbackPostgresUrl = config.POSTGRES_URL;
    }
  }
} catch (e) {
  console.warn("Could not read postgres url from firebase config", e);
}

export const createPool = () => {
  let fallbackPostgresUrl = globalFallbackPostgresUrl;`
);

content = content.replace(
  /const connStrForFallback = process\.env\.POSTGRES_URL \|\| process\.env\.DATABASE_URL \|\| fallbackPostgresUrl;/,
  `const connStrForFallback = process.env.POSTGRES_URL || process.env.DATABASE_URL || globalFallbackPostgresUrl;`
);

fs.writeFileSync('src/db/index.ts', content);
