const fs = require('fs');
let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// Add Calculator and NOSAModal
content = content.replace(
  "import { Printer, Edit, Trash2, X, FileText, History, Users, ShieldCheck, MapPin, Phone, Mail, Calendar, Download, ArrowLeft, FileUp, Eye, ZoomIn, Cloud, Loader2, ExternalLink } from 'lucide-react';",
  "import { Printer, Edit, Trash2, X, FileText, History, Users, ShieldCheck, MapPin, Phone, Mail, Calendar, Download, ArrowLeft, FileUp, Eye, ZoomIn, Cloud, Loader2, ExternalLink, Calculator } from 'lucide-react';\nimport NOSAModal from './NOSAModal';"
);

// Add NOSA state
content = content.replace(
  "const [showDigitalPds, setShowDigitalPds] = useState<boolean>(!employee.pdsScan);",
  "const [showDigitalPds, setShowDigitalPds] = useState<boolean>(!employee.pdsScan);\n  const [showNosa, setShowNosa] = useState<boolean>(false);"
);

// Add NOSA button
const printBtn = `<button 
              onClick={handlePrint} 
              aria-label="Print record"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
            >
              <Printer size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Print</span>
            </button>`;

const nosaBtn = `<button 
              onClick={() => setShowNosa(true)} 
              aria-label="Generate NOSA"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20 group"
            >
              <Calculator size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">NOSA</span>
            </button>`;

content = content.replace(printBtn, nosaBtn + "\n            " + printBtn);

// Render NOSAModal inside ProfileModal
const renderModal = `{isFullScreenPds && employee.pdsScan && (`;
const addModal = `{showNosa && <NOSAModal employee={employee} onClose={() => setShowNosa(false)} />}\n        ` + renderModal;

content = content.replace(renderModal, addModal);

fs.writeFileSync('src/components/ProfileModal.tsx', content);
console.log("Updated ProfileModal.tsx");
