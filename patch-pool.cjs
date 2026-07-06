const fs = require('fs');

let content = fs.readFileSync('src/db/index.ts', 'utf8');

content = content.replace(
  /export const createPool = \(\) => \{\n  if \(process\.env\.DATABASE_URL \|\| process\.env\.POSTGRES_URL\) \{\n    return new Pool\(\{\n      connectionString: process\.env\.DATABASE_URL \|\| process\.env\.POSTGRES_URL,\n      max: 10,\n      idleTimeoutMillis: 30000,\n      connectionTimeoutMillis: 5000,\n    \}\);\n  \}/,
  `export const createPool = () => {
  const connStr = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (connStr && (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://'))) {
    return new Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }`
);

fs.writeFileSync('src/db/index.ts', content);
