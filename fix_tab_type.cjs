const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  `  const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];`,
  `  const tabs: { id: 'service' | 'attachments', label: string, icon: any }[] = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText }
  ];`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
