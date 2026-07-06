const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

// 1. Remove the manually added validateField and handleChange around line 366.
// They are between useEffect and handleSaveClick.
const searchStr = `  const validateField = (name: string, value: any) => {
    let errorMsg = '';
    const requiredFields = ['surname', 'firstName'];
    
    if (requiredFields.includes(name)) {
      if (!value || !value.trim()) errorMsg = 'This field is required';
    }
    return errorMsg;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    const errorMsg = validateField(name, value);
    setValidationErrors(prev => ({
      ...prev,
      [name]: errorMsg
    }));
  };`;

content = content.replace(searchStr, '');

// 2. Fix tabs
content = content.replace(
  `{ id: 'scanned', label: 'Scanned Documents', icon: FileText }`,
  `{ id: 'attachments', label: 'Scanned Documents', icon: FileText }`
);

fs.writeFileSync('src/components/EditModal.tsx', content);
