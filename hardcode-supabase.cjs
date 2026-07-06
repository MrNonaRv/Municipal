const fs = require('fs');
let content = fs.readFileSync('src/db/index.ts', 'utf8');

// Replace everything up to `export const createPool = () => {`
const createPoolIndex = content.indexOf('export const createPool = () => {');
if (createPoolIndex !== -1) {
  const firstPart = content.substring(0, createPoolIndex);
  // Keep imports
  const imports = firstPart.match(/import .*?;/g).join('\n');
  
  const hardcoded = `
// Hardcoded Supabase connection string as requested
const SUPABASE_URL = "postgresql://postgres.oxtjlhcwibieeuwbhnyj:Olanoko_1529@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";

export const createPool = () => {
  const connStr = SUPABASE_URL;
  if (connStr && (connStr.startsWith('postgres://') || connStr.startsWith('postgresql://'))) {
    return new Pool({
      connectionString: connStr,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return new Pool({
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    keepAlive: true,
  });
};
`;

  // Find where `const pool = createPool();` starts
  const poolIndex = content.indexOf('const pool = createPool();');
  if (poolIndex !== -1) {
    const finalContent = imports + '\n' + hardcoded + '\n' + content.substring(poolIndex);
    
    // Also we need to replace `useFallbackMode` and `connStrForFallback` logic
    let replacedContent = finalContent;
    
    // Replace resilient fallback state logic
    replacedContent = replacedContent.replace(/const connStrForFallback = [^;]+;/g, 'const connStrForFallback = SUPABASE_URL;');
    replacedContent = replacedContent.replace(/let useFallbackMode = [^;]+;/g, 'let useFallbackMode = false;');
    
    fs.writeFileSync('src/db/index.ts', replacedContent);
    console.log("Successfully hardcoded Supabase URL in src/db/index.ts");
  } else {
    console.log("Could not find pool creation");
  }
} else {
  console.log("Could not find createPool");
}
