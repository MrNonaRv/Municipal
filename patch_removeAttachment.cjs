const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  /const handleRemoveAttachment = \(id: string\) => \{[\s\S]*?\}\);[\s\S]*?\};/,
  `const handleRemoveAttachment = async (id: string) => {
    // Find the attachment first to check if it's on Drive
    const docToRemove = formData.attachments?.find(item => item.id === id);
    if (docToRemove?.driveFileId) {
      try {
        await deleteFileFromDrive(docToRemove.driveFileId);
        console.log('Successfully deleted file from Google Drive:', docToRemove.driveFileId);
      } catch (err) {
        console.error('Failed to delete file from Google Drive:', err);
        // Continue to delete locally even if Drive deletion fails
      }
    }

    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(item => item.id !== id)
    }));
  };`
);
fs.writeFileSync('src/components/EditModal.tsx', content);
