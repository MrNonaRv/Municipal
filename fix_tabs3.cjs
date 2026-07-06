const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  `    const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];

  return () => {`,
  `    return () => {`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
