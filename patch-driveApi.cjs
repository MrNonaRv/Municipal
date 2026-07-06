const fs = require('fs');

let content = fs.readFileSync('src/api/drive.ts', 'utf8');

// Replace upload
content = content.replace(
  /const authHeader = req\.headers\.authorization;\n\s+const accessToken = authHeader\?\.split\(' '\)\[1\];\n\n\s+if \(!accessToken\) \{\n\s+return res\.status\(401\)\.json\(\{ error: 'Missing access token' \}\);\n\s+\}/,
  `const authHeader = req.headers.authorization;
      let accessToken = authHeader?.split(' ')[1];
      if (!accessToken || accessToken === 'null') {
        accessToken = sharedDriveConfig?.accessToken;
      }
      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }`
);

// Replace download
content = content.replace(
  /const authHeader = req\.headers\.authorization;\n\s+const accessToken = authHeader\?\.split\(' '\)\[1\];\n\n\s+if \(!accessToken\) \{\n\s+return res\.status\(401\)\.json\(\{ error: 'Missing access token' \}\);\n\s+\}/,
  `const authHeader = req.headers.authorization;
      let accessToken = authHeader?.split(' ')[1];
      if (!accessToken || accessToken === 'null') {
        accessToken = sharedDriveConfig?.accessToken;
      }
      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }`
);

// Replace delete
content = content.replace(
  /const authHeader = req\.headers\.authorization;\n\s+const accessToken = authHeader\?\.split\(' '\)\[1\];\n\n\s+if \(!accessToken\) \{\n\s+return res\.status\(401\)\.json\(\{ error: 'Missing access token' \}\);\n\s+\}/,
  `const authHeader = req.headers.authorization;
      let accessToken = authHeader?.split(' ')[1];
      if (!accessToken || accessToken === 'null') {
        accessToken = sharedDriveConfig?.accessToken;
      }
      if (!accessToken) {
        return res.status(401).json({ error: 'Missing access token' });
      }`
);

fs.writeFileSync('src/api/drive.ts', content);
