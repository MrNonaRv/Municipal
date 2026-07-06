const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const replacement = `
let lastDbSyncTime: string | null = null;

async function syncDrizzleToFirestore() {
  if (!isFallbackActive() || !firestoreDb) return;
  
  try {
    const localDbPath = getLocalDbPath();
    let content = '';
    try {
      content = await fs.readFileSync(localDbPath, 'utf-8');
    } catch (err) {
      console.log('[Firebase] Local Drizzle DB file not found, skipping Firestore sync.');
      return;
    }
    
    console.log(\`[Firebase] Syncing local Drizzle database (\${content.length} bytes) to Firestore...\`);
    const updatedAt = new Date().toISOString();
    lastDbSyncTime = updatedAt;
    
    if (content.length > 900000) {
      const numChunks = Math.ceil(content.length / 800000);
      await setDoc(doc(firestoreDb, 'system_sync', 'drizzle_local_db'), { 
        chunks: numChunks,
        updatedAt
      });
      for (let i = 0; i < numChunks; i++) {
        const chunk = content.slice(i * 800000, (i + 1) * 800000);
        await setDoc(doc(firestoreDb, 'system_sync', \`drizzle_local_db_chunk_\${i}\`), { value: chunk });
      }
    } else {
      await setDoc(doc(firestoreDb, 'system_sync', 'drizzle_local_db'), { 
        value: content,
        updatedAt
      });
    }
    console.log('[Firebase] Drizzle fallback sync complete.');
  } catch (err) {
    console.error('[Firebase] Failed to sync Drizzle fallback to Firestore:', err);
  }
}

async function loadDrizzleFromFirestore() {
  if (!isFallbackActive() || !firestoreDb) return;
  
  try {
    const docRef = doc(firestoreDb, 'system_sync', 'drizzle_local_db');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (lastDbSyncTime && data.updatedAt && lastDbSyncTime === data.updatedAt) {
        return; // Already up to date
      }
      
      console.log('[Firebase] Attempting to restore Drizzle local database from Firestore...');
      let content = '';
      
      if (data.chunks) {
        console.log(\`[Firebase] Restoring chunked database (\${data.chunks} chunks)...\`);
        for (let i = 0; i < data.chunks; i++) {
          const chunkSnap = await getDoc(doc(firestoreDb, 'system_sync', \`drizzle_local_db_chunk_\${i}\`));
          if (chunkSnap.exists()) {
            content += chunkSnap.data().value;
          }
        }
      } else {
        content = data.value;
      }
      
      if (content) {
        const localDbPath = getLocalDbPath();
        await fs.promises.writeFile(localDbPath, content, 'utf-8');
        lastDbSyncTime = data.updatedAt || null;
        console.log(\`[Firebase] Successfully restored Drizzle local database (\${content.length} bytes) from Firestore.\`);
      }
    } else {
      console.log('[Firebase] No Drizzle local database found in Firestore system_sync/drizzle_local_db.');
    }
  } catch (err) {
    console.error('[Firebase] Failed to restore Drizzle fallback from Firestore:', err);
  }
}
`;

content = content.replace(/async function syncDrizzleToFirestore\(\) \{[\s\S]*?async function loadDrizzleFromFirestore\(\) \{[\s\S]*?console\.error\('\[Firebase\] Failed to restore Drizzle fallback from Firestore:', err\);\n  \}\n\}/, replacement.trim());

fs.writeFileSync('server.ts', content, 'utf-8');
