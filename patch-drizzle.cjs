const fs = require('fs');

let content = fs.readFileSync('src/db/drizzle.config.ts', 'utf8');
content = content.replace(
  /const connectionString = process\.env\.DATABASE_URL \|\| process\.env\.POSTGRES_URL;/,
  `let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (connectionString && !connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  connectionString = null;
}`
);
fs.writeFileSync('src/db/drizzle.config.ts', content);
