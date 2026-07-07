const fs = require('fs');

let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

const injectionPoint = `  const handleRemoveAttachment = async (id: string) => {`;

const newCode = `  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (max 5MB for local to prevent bloat, larger allowed for drive)
    const MAX_LOCAL_SIZE = 5 * 1024 * 1024; 
    if (uploadDestination === 'local' && file.size > MAX_LOCAL_SIZE) {
      alert('File is too large for local storage. Please select Google Drive or a file under 5MB.');
      return;
    }

    setSelectedFile(file);
    
    // If not uploading to Drive immediately, convert to Base64 for local preview/storage
    try {
      if (file.type.startsWith('image/')) {
        const base64 = await fileToBase64(file);
        setSelectedFileData(base64);
      } else if (file.type === 'application/pdf') {
        const base64 = await fileToBase64(file);
        setSelectedFileData(base64);
      } else {
        alert('Only images and PDFs are currently supported for previews.');
      }
    } catch (err) {
      console.error('Error reading file:', err);
      alert('Error reading file.');
    }
  };

  const handleAddAttachment = async () => {
    if (!newDocName.trim() || !selectedFile) return;

    const newDoc: Attachment = {
      id: crypto.randomUUID(),
      name: newDocName.trim(),
      fileName: selectedFile.name,
      fileType: selectedFile.type,
      uploadedAt: new Date(),
    };

    if (uploadDestination === 'drive') {
      setIsUploadingToDrive(true);
      try {
        const result = await uploadFileToDrive(selectedFile);
        if (result) {
          newDoc.driveFileId = result.id;
          newDoc.driveWebViewLink = result.webViewLink;
          console.log('Successfully uploaded to Google Drive', result);
        } else {
          throw new Error('Upload to Drive returned no result');
        }
      } catch (err) {
        console.error('Failed to upload to Drive:', err);
        alert('Failed to upload to Google Drive. Check your connection and try again, or use Local storage.');
        setIsUploadingToDrive(false);
        return; // Stop execution on failure
      }
      setIsUploadingToDrive(false);
    } else {
      // Local storage - save the base64 string
      if (selectedFileData) {
        newDoc.fileData = selectedFileData;
      }
    }

    setFormData(prev => ({
      ...prev,
      attachments: [...(prev.attachments || []), newDoc]
    }));

    // Reset fields
    setNewDocName('');
    setSelectedFile(null);
    setSelectedFileData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveAttachment = async (id: string) => {`;

content = content.replace(injectionPoint, newCode);
fs.writeFileSync('src/components/EditModal.tsx', content);

