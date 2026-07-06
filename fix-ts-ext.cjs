const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');
  const newContent = content.replace(/from '([^']+)\.ts'/g, "from '$1'");
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log('Fixed', file);
  }
}

fixFile('src/middleware/auth.ts');
fixFile('src/db/users.ts');
fixFile('src/db/index.ts');
fixFile('server.ts');
