const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  `    const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];

  return (() => {`,
  `    return () => {`
);

content = content.replace(
  `  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">`,
  `  const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
