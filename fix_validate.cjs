const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

const validateFieldFunction = `  const validateField = (name: string, value: any) => {
    let errorMsg = '';
    const requiredFields = ['surname', 'firstName'];
    
    if (requiredFields.includes(name)) {
      if (!value || !value.trim()) errorMsg = 'This field is required';
    }
    return errorMsg;
  };

  const handleChange =`;

content = content.replace(/  const handleChange =/, validateFieldFunction);
fs.writeFileSync('src/components/EditModal.tsx', content);
