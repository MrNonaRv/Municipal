const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const replacement = `
app.use(async (req, res, next) => {
  const isApi = req.url.startsWith('/api') || (req.route && req.route.path.startsWith('/api'));
  const isHealth = req.url === '/api/health' || req.url === '/health' || req.url.startsWith('/api/health?');
  
  if (isApi && !isHealth) {
    if (process.env.VERCEL) {
      // In Vercel, serverless functions can have stale memory. Always verify with Firestore before proceeding.
      if (!isInitializing) {
        try {
          if (!dbLoaded) {
            await ensureDbLoaded();
          } else {
            await loadDrizzleFromFirestore(); // Check if there are new updates
          }
        } catch (e) {
          console.error('[Vercel] Error during DB check:', e);
        }
      }
    } else {
      await ensureDbLoaded();
    }
  }
  next();
});
`;

content = content.replace(/app\.use\(async \(req, res, next\) => \{[\s\S]*?next\(\);\n\}\);/, replacement.trim());

fs.writeFileSync('server.ts', content, 'utf-8');
