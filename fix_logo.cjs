const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetImport = "import { dataURLtoBlob } from './utils/helpers';";
const newImport = targetImport + "\nimport systemLogo from './assets/Systemlogo.jpg';";
content = content.replace(targetImport, newImport);

const targetImg = `<img src="/Systemlogo.jpg" alt="System Logo" className="w-full h-full object-contain" />`;
const newImg = `<img src={systemLogo} alt="System Logo" className="w-full h-full object-contain" />`;
content = content.replace(targetImg, newImg);

fs.writeFileSync('src/App.tsx', content);
console.log("Fixed logo");
