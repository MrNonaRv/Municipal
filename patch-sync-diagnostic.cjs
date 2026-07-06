const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

const newEndpoint = `
app.get('/api/sync-diagnostic', async (req, res) => {
  let dbHost = 'unknown';
  let dbSource = 'none';
  const { isFallbackActive } = require('./src/db/index.ts');
  
  const pgUrl = process.env.POSTGRES_URL;
  const dbUrl = process.env.DATABASE_URL;
  
  let fallbackUrl = null;
  try {
    const configPath = require('path').join(process.cwd(), 'firebase-applet-config.json');
    if (require('fs').existsSync(configPath)) {
      const config = JSON.parse(require('fs').readFileSync(configPath, 'utf8'));
      fallbackUrl = config.POSTGRES_URL;
    }
  } catch(e) {}
  
  if (pgUrl) {
    dbSource = 'POSTGRES_URL (Environment)';
    try { dbHost = new URL(pgUrl).hostname; } catch(e) { dbHost = pgUrl; }
  } else if (dbUrl) {
    dbSource = 'DATABASE_URL (Environment)';
    try { dbHost = new URL(dbUrl).hostname; } catch(e) { dbHost = dbUrl; }
  } else if (fallbackUrl) {
    dbSource = 'firebase-applet-config.json (Fallback)';
    try { dbHost = new URL(fallbackUrl).hostname; } catch(e) { dbHost = fallbackUrl; }
  } else if (process.env.SQL_HOST) {
    dbSource = 'SQL_HOST (Cloud SQL)';
    dbHost = process.env.SQL_HOST;
  }
  
  const isFallback = typeof isFallbackActive === 'function' ? isFallbackActive() : false;
  
  res.json({
    status: 'ok',
    environment: process.env.VERCEL ? 'Vercel' : 'AI Studio',
    database: {
      host: dbHost,
      source: dbSource,
      isFallbackActive: isFallback
    },
    syncStatus: isFallback 
      ? 'Firestore Sync Active (using local SQLite fallback)' 
      : 'Direct Postgres Connection (Firestore sync bypassed)',
    message: isFallback 
      ? 'Data is syncing via Firestore.' 
      : (dbHost.includes('supabase') ? 'Connected to Supabase Postgres.' : 'Connected to a different Postgres instance. If AI Studio and Vercel show different data, they are connected to different databases.')
  });
});
`;

content = content.replace(/app\.get\('\/api\/health',/, newEndpoint + "\napp.get('/api/health',");
fs.writeFileSync('server.ts', content);
