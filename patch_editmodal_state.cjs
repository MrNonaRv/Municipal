const fs = require('fs');

let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

const injectionPoint = `  // States for Scanned Documents Attachment
  const fileInputRef = useRef<HTMLInputElement>(null);`;

const newStates = `  // States for Scanned Documents Attachment
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null);`;

content = content.replace(injectionPoint, newStates);
fs.writeFileSync('src/components/EditModal.tsx', content);

