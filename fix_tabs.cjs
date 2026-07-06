const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

const tabsDefinition = `  const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'scanned', label: 'Scanned Documents', icon: FileText }
  ];

  return (`;

content = content.replace(/  return \(/, tabsDefinition);

fs.writeFileSync('src/components/EditModal.tsx', content);
