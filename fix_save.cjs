const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

content = content.replace(
  /const handleAddAttachment = async \(\) => \{\n    if \(selectedFile && newDocName\.trim\(\)\) \{/g,
  `const handleSaveClick = async () => {
    const hasErrors = Object.values(validationErrors).some(err => err !== '');
    const requiredFields = ['surname', 'firstName'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof Employee]);
    
    if (hasErrors || missingFields.length > 0) {
      setError('Please fix all validation errors before saving.');
      return;
    }

    let finalFormData = formData;

    if (selectedFile && newDocName.trim()) {`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
