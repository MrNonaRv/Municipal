const fs = require('fs');

const originalContent = fs.readFileSync('src/components/EditModal.tsx.bak', 'utf8').catch ? undefined : null; // oops, I don't have a backup.
