const fs = require('fs');
let content = fs.readFileSync('src/db/index.ts', 'utf8');

content = content.replace(
  /useFallbackMode = true;/g,
  '/* useFallbackMode disabled */'
);

fs.writeFileSync('src/db/index.ts', content);
