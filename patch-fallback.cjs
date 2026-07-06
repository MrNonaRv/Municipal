const fs = require('fs');
let content = fs.readFileSync('src/db/index.ts', 'utf8');
content = content.replace(
  /let useFallbackMode = !\(\process\.env\.SQL_HOST \|\| process\.env\.DATABASE_URL \|\| process\.env\.POSTGRES_URL\);/,
  `const connStrForFallback = process.env.POSTGRES_URL || process.env.DATABASE_URL;
let useFallbackMode = !(process.env.SQL_HOST || (connStrForFallback && (connStrForFallback.startsWith('postgres://') || connStrForFallback.startsWith('postgresql://'))));`
);
fs.writeFileSync('src/db/index.ts', content);
