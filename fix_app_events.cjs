const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetEvents = `    const handleAuthExpired = () => {
      setShowAuthExpiredBanner(true);
    };
    window.addEventListener('gers_drive_auth_expired', handleAuthExpired);`;

const newEvents = targetEvents + `

    const handleOpenDriveSettings = () => {
      setCsvModalTab('gdrive');
      setIsCSVModalOpen(true);
      setShowAuthExpiredBanner(false);
    };
    window.addEventListener('gers_open_drive_settings', handleOpenDriveSettings);`;

content = content.replace(targetEvents, newEvents);

const targetRemoveEvents = `      window.removeEventListener('gers_drive_auth_expired', handleAuthExpired);`;
const newRemoveEvents = targetRemoveEvents + `\n      window.removeEventListener('gers_open_drive_settings', handleOpenDriveSettings);`;

content = content.replace(targetRemoveEvents, newRemoveEvents);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed App.tsx events");
