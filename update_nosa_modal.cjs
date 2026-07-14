const fs = require('fs');
let content = fs.readFileSync('src/components/NOSAModal.tsx', 'utf8');

// Update Props
content = content.replace("  onClose: () => void;\n}", "  onClose: () => void;\n  onSave?: (emp: Employee) => void;\n}");

content = content.replace("export default function NOSAModal({ employee, onClose }: Props) {", "export default function NOSAModal({ employee, onClose, onSave }: Props) {\n  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');");

// Replace the initial state for the form with values from selected history, or defaults
const stateDecl = `  const latestService = employee.serviceRecords.length > 0 
    ? employee.serviceRecords[employee.serviceRecords.length - 1] 
    : null;

  const [dateOfNotice, setDateOfNotice] = useState(new Date().toISOString().split('T')[0]);`;

const newStateDecl = `  const latestService = employee.serviceRecords.length > 0 
    ? employee.serviceRecords[employee.serviceRecords.length - 1] 
    : null;

  const [dateOfNotice, setDateOfNotice] = useState(new Date().toISOString().split('T')[0]);`;

content = content.replace(stateDecl, newStateDecl);

fs.writeFileSync('src/components/NOSAModal.tsx', content);
