const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  /  return \(\n    <div className="fixed inset-0/,
  `  const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];

  return (
    <div className="fixed inset-0`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
