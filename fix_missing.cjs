const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

const replacement = `  };

  // Autosave effect
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      onSave(formData, true);
      setLastSaved(new Date());
    }, 1500); // 1.5 second debounce for autosave

    return () => clearTimeout(timer);
  }, [formData]);

  const validateField = (name: string, value: any) => {
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
  };

  const handleAddAttachment = async () => {
    if (selectedFile && newDocName.trim()) {`;

content = content.replace(/  \};\n    if \(selectedFile && newDocName\.trim\(\)\) \{/, replacement);

fs.writeFileSync('src/components/EditModal.tsx', content);
