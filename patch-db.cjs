const fs = require('fs');

let dbCode = fs.readFileSync('src/services/db.ts', 'utf-8');

const originalFetch = `
          const response = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.data)
          });
          console.log(\`[syncOfflineData] POST response status: \${response.status} \${response.statusText}\`);
          if (!response.ok) throw new Error(\`Server returned error status: \${response.status}\`);
`;

const chunkedFetch = `
          const payloadStr = JSON.stringify(item.data);
          let response;
          if (payloadStr.length > 500000) { // If larger than 500KB, use chunking
            console.log(\`[syncOfflineData] Payload is \${payloadStr.length} bytes, using chunked upload\`);
            const uploadId = item.id + '-' + Date.now();
            const CHUNK_SIZE = 500000;
            const totalChunks = Math.ceil(payloadStr.length / CHUNK_SIZE);
            
            for (let i = 0; i < totalChunks; i++) {
              const chunkData = payloadStr.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
              response = await fetch('/api/employees/chunk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uploadId,
                  chunkIndex: i,
                  totalChunks,
                  data: chunkData
                })
              });
              if (!response.ok) {
                 throw new Error(\`Server returned error status during chunk \${i}: \${response.status}\`);
              }
            }
          } else {
            response = await fetch('/api/employees', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: payloadStr
            });
            console.log(\`[syncOfflineData] POST response status: \${response.status} \${response.statusText}\`);
            if (!response.ok) throw new Error(\`Server returned error status: \${response.status}\`);
          }
`;

dbCode = dbCode.replace(originalFetch, chunkedFetch);
fs.writeFileSync('src/services/db.ts', dbCode);
