const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

// Replace React import
content = content.replace("import React, { useEffect, useState, useMemo } from 'react';", "import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';");

// Replace modal imports
const targetImports = `import ProfileModal from './components/ProfileModal';
import EditModal from './components/EditModal';
import CSVModal from './components/CSVModal';
import ToastContainer from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import SyncHistoryModal from './components/SyncHistoryModal';`;

const lazyImports = `const ProfileModal = lazy(() => import('./components/ProfileModal'));
const EditModal = lazy(() => import('./components/EditModal'));
const CSVModal = lazy(() => import('./components/CSVModal'));
import ToastContainer from './components/Toast';
const ConfirmModal = lazy(() => import('./components/ConfirmModal'));
const SyncHistoryModal = lazy(() => import('./components/SyncHistoryModal'));`;

content = content.replace(targetImports, lazyImports);

fs.writeFileSync('src/App.tsx', content);
console.log("Replaced imports");
