const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// Add deleteFileFromDrive import if not there
if (!content.includes('deleteFileFromDrive')) {
  content = content.replace(/import \{ uploadToGoogleDrive,/g, 'import { uploadToGoogleDrive, deleteFileFromDrive,');
}

const oldHandleDelete = `  const handleDeleteAttachment = (id: string) => {
    if (!onSave) return;
    if (confirm('Are you sure you want to delete this scanned document? This action cannot be undone.')) {
      const updatedEmp = {
        ...employee,
        attachments: (employee.attachments || []).filter(a => a.id !== id)
      };
      onSave(updatedEmp);
    }
  };`;

const newHandleDelete = `  const handleDeleteAttachment = async (id: string) => {
    if (!onSave) return;
    if (confirm('Are you sure you want to delete this scanned document? This action cannot be undone.')) {
      const docToRemove = employee.attachments?.find(a => a.id === id);
      if (docToRemove?.driveFileId) {
        try {
          await deleteFileFromDrive(docToRemove.driveFileId);
        } catch (err) {
          console.error('Failed to delete from GDrive:', err);
        }
      }
      const updatedEmp = {
        ...employee,
        attachments: (employee.attachments || []).filter(a => a.id !== id)
      };
      onSave(updatedEmp);
    }
  };`;

content = content.replace(oldHandleDelete, newHandleDelete);
fs.writeFileSync('src/components/ProfileModal.tsx', content);

