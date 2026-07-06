const fs = require('fs');

let content = fs.readFileSync('src/services/driveStorage.ts', 'utf8');
content = content.replace(
  /export const getDriveAccessToken = async \(\): Promise<string \| null> => \{\n  if \(\!cachedAccessToken\) \{\n    cachedAccessToken = localStorage\.getItem\('google_drive_access_token'\);\n  \}\n  return cachedAccessToken;\n\};/g,
  `export const getDriveAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    cachedAccessToken = localStorage.getItem('google_drive_access_token');
  }
  if (!cachedAccessToken) {
    const shared = await syncDriveConfigFromServer();
    if (shared) {
      cachedAccessToken = shared.accessToken;
    }
  }
  return cachedAccessToken;
};`
);
fs.writeFileSync('src/services/driveStorage.ts', content);
