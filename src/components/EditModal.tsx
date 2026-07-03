import React, { useState, useEffect, useRef } from 'react';
import { Employee, Child, Education, Attachment } from '../types/employee';
import ServiceRecordEditor from './ServiceRecordEditor';
import { fileToBase64 } from '../utils/helpers';
import { convertImageToPDF } from '../utils/pdfHelpers';
import { Camera, Plus, Trash2, X, User, Users, GraduationCap, Briefcase, Save, ArrowLeft, FileText, FileUp, Download, Cloud, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAccessToken, uploadFileToSupabase as uploadFileToDrive, downloadFileFromSupabase as downloadFileFromDrive } from '../services/supabaseStorage';
import { getDriveAccessToken, uploadFileToDrive as uploadFileToGDrive, downloadFileFromDrive as downloadFileFromGDrive } from '../services/driveStorage';
import { isOnline } from '../services/db';

const DOCUMENT_TYPES = [
  { value: 'Birth_Certificate', label: 'Birth Certificate' },
  { value: 'Marriage_Certificate', label: 'Marriage Contract / Certificate' },
  { value: 'Personal_Data_Sheet', label: 'Personal Data Sheet (PDS)' },
  { value: 'Diploma_Transcript', label: 'Diploma & Transcript (TOR)' },
  { value: 'Service_Record', label: 'Service Record' },
  { value: 'Appointment_Paper', label: 'Appointment Paper' },
  { value: 'Oath_of_Office', label: 'Oath of Office' },
  { value: 'Training_Certificate', label: 'Training / Seminar Certificate' },
  { value: 'Clearance', label: 'Clearance (NBI/Police/Medical)' },
  { value: 'Other', label: 'Other / Custom Document' }
];

interface Props {
  employee: Employee;
  onClose: () => void;
  onSave: (emp: Employee, isAutosave?: boolean) => void;
  initialTab?: 'personal' | 'family' | 'education' | 'service' | 'attachments';
  isSaving?: boolean;
}

export default function EditModal({ employee, onClose, onSave, initialTab = 'service', isSaving = false }: Props) {
  const [formData, setFormData] = useState<Employee>({ ...employee });
  const [activeTab, setActiveTab] = useState<'service' | 'attachments'>(
    initialTab === 'attachments' ? 'attachments' : 'service'
  );
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isInitialMount = useRef(true);

  // States for Storage Integration in EditModal
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isUploadingToDrive, setIsUploadingToDrive] = useState(false);
  const [uploadDestination, setUploadDestination] = useState<'local' | 'drive'>('local');
  const [storageProvider, setStorageProvider] = useState<'supabase' | 'gdrive' | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);

  // States for Scanned Documents Attachment
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check Storage connection status and online status to auto-detect destination
  useEffect(() => {
    const updateDest = async () => {
      const supabaseToken = await getAccessToken();
      const driveToken = await getDriveAccessToken();
      
      const isSupabaseConnected = !!supabaseToken;
      const isGDriveConnected = !!driveToken;
      
      setIsDriveConnected(isSupabaseConnected || isGDriveConnected);
      
      const online = isOnline() && navigator.onLine;
      
      if (isGDriveConnected && online) {
        setUploadDestination('drive');
        setStorageProvider('gdrive');
      } else if (isSupabaseConnected && online) {
        setUploadDestination('drive');
        setStorageProvider('supabase');
      } else {
        setUploadDestination('local');
        setStorageProvider(null);
      }
    };
    
    updateDest();
    
    window.addEventListener('online', updateDest);
    window.addEventListener('offline', updateDest);
    
    return () => {
      window.removeEventListener('online', updateDest);
      window.removeEventListener('offline', updateDest);
    };
  }, [activeTab]);

  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (uploadDestination === 'local' && file.size > 2 * 1024 * 1024 && !file.type.startsWith('image/')) {
        setError("File must be smaller than 2MB for local storage. Please connect Supabase Storage for larger files.");
        return;
      }
      try {
        setError(null);
        if (file.type.startsWith('image/')) {
          try {
            file = await convertImageToPDF(file, file.name);
          } catch (pdfErr) {
            console.warn("Failed to convert image to PDF, using original image file directly", pdfErr);
          }
        }
        const base64 = await fileToBase64(file);
        setSelectedFile(file);
        setSelectedFileData(base64);

        // Auto-populate document name if empty
        let docName = newDocName;
        if (!docName.trim()) {
          docName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
          setNewDocName(docName);
        }

        // AUTO-SYNC LOGIC: If drive is connected and online, push immediately
        if (uploadDestination === 'drive') {
          setIsUploadingToDrive(true);
          const ext = file.name.split('.').pop() || 'png';
          const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const sanitizedDoc = docName.trim().replace(/[^a-zA-Z0-9]/g, '_');
          const autoFileName = `GERS_${sanitizedSur}_${sanitizedFirst}_Doc_${sanitizedDoc}_${Date.now()}.${ext}`;

          try {
            let driveResult;
            if (storageProvider === 'gdrive') {
              driveResult = await uploadFileToGDrive(file, autoFileName, file.type);
            } else {
              driveResult = await uploadFileToDrive(file, autoFileName, file.type);
            }

            const newAttachment: Attachment = {
              id: 'drive-' + driveResult.id,
              name: docName.trim(),
              fileName: driveResult.name,
              fileType: file.type,
              fileData: '', 
              uploadedAt: new Date().toISOString(),
              driveFileId: driveResult.id,
              driveWebViewLink: driveResult.webViewLink,
              driveWebContentLink: driveResult.webContentLink,
              storageProvider: storageProvider as 'supabase' | 'gdrive'
            };

            const updatedFormData = {
              ...formData,
              attachments: [...(formData.attachments || []), newAttachment]
            };
            setFormData(updatedFormData);
            
            // Trigger immediate save for background sync to prevent loss on reload
            onSave(updatedFormData, true);

            // Reset inputs
            setNewDocName('');
            setSelectedFile(null);
            setSelectedFileData(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
          } catch (uploadErr: any) {
            console.error("Auto background sync failed", uploadErr);
            setError(`Background sync failed: ${uploadErr.message || uploadErr}. You can try adding manually.`);
          } finally {
            setIsUploadingToDrive(false);
          }
        }
      } catch (err: any) {
        console.error("File loading failed", err);
        setError("File loading failed: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handleAddAttachment = async () => {
    if (!newDocName.trim() || !selectedFile) return;

    // Dynamically detect destination
    const supabaseToken = await getAccessToken();
    const driveToken = await getDriveAccessToken();
    const isSupabaseConnected = !!supabaseToken;
    const isGDriveConnected = !!driveToken;
    const online = isOnline() && navigator.onLine;
    
    let dest: 'local' | 'drive' = 'local';
    let provider: 'supabase' | 'gdrive' | null = null;
    
    if (isGDriveConnected && online) {
      dest = 'drive';
      provider = 'gdrive';
    } else if (isSupabaseConnected && online) {
      dest = 'drive';
      provider = 'supabase';
    }

    const ext = selectedFile.name.split('.').pop() || 'png';
    const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
    const sanitizedDoc = newDocName.trim().replace(/[^a-zA-Z0-9]/g, '_');
    // Standardized Auto-named format
    const autoFileName = `GERS_${sanitizedSur}_${sanitizedFirst}_Doc_${sanitizedDoc}_${Date.now()}.${ext}`;

    if (dest === 'drive') {
      setIsUploadingToDrive(true);
      setError(null);
      try {
        let driveResult;
        if (provider === 'gdrive') {
          driveResult = await uploadFileToGDrive(selectedFile, autoFileName, selectedFile.type);
        } else {
          driveResult = await uploadFileToDrive(selectedFile, autoFileName, selectedFile.type);
        }

        const newAttachment: Attachment = {
          id: 'drive-' + driveResult.id,
          name: newDocName.trim(),
          fileName: driveResult.name,
          fileType: selectedFile.type,
          fileData: '', 
          uploadedAt: new Date().toISOString(),
          driveFileId: driveResult.id,
          driveWebViewLink: driveResult.webViewLink,
          driveWebContentLink: driveResult.webContentLink,
          storageProvider: provider as 'supabase' | 'gdrive'
        };

        setFormData(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), newAttachment]
        }));

        // Reset inputs
        setNewDocName('');
        setSelectedFile(null);
        setSelectedFileData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch (err: any) {
        console.error("Supabase Storage Upload Failed", err);
        setError(`Supabase Storage Upload Failed: ${err.message || err}`);
      } finally {
        setIsUploadingToDrive(false);
      }
    } else {
      if (!selectedFileData) return;
      const newAttachment: Attachment = {
        id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
        name: newDocName.trim(),
        fileName: autoFileName, // Use the same automatic file name for local storage
        fileType: selectedFile.type,
        fileData: selectedFileData,
        uploadedAt: new Date().toISOString()
      };

      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), newAttachment]
      }));

      // Reset inputs
      setNewDocName('');
      setSelectedFile(null);
      setSelectedFileData(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setError(null);
    }
  };

  const handleRetrieveAttachment = async (doc: Attachment) => {
    if (!doc.driveFileId) return;
    setDownloadingFileId(doc.id);
    setError(null);
    try {
      let blob;
      if (doc.storageProvider === 'gdrive') {
        blob = await downloadFileFromGDrive(doc.driveFileId);
      } else {
        blob = await downloadFileFromDrive(doc.driveFileId);
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error("Failed to retrieve file", err);
      setError(`Failed to retrieve file from Supabase Storage: ${err.message || err}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setFormData(prev => ({
      ...prev,
      attachments: (prev.attachments || []).filter(item => item.id !== id)
    }));
  };

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
    const requiredFields = [
      'surname', 'firstName'
    ];
    
    if (requiredFields.includes(name)) {
      if (!value || !value.trim()) errorMsg = 'This field is required';
    }

    switch (name) {
    }
    setValidationErrors(prev => ({ ...prev, [name]: errorMsg }));
    return errorMsg;
  };

  const tabs = [
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText },
  ] as const;

  const handleSaveClick = async () => {
    // Validate all fields before saving
    const fieldsToValidate = [
      'surname', 'firstName'
    ];
    
    const newErrors: Record<string, string> = {};
    let hasErrors = false;
    
    fieldsToValidate.forEach(field => {
      const errorMsg = validateField(field, (formData as any)[field]);
      if (errorMsg) {
        hasErrors = true;
        newErrors[field] = errorMsg;
      }
    });

    setValidationErrors(newErrors);

    if (hasErrors) {
      setError("Please correct the errors before saving.");
      return;
    }

    // Auto-capture selected scanned document if user forgot to click "+ Add Document"
    let finalFormData = { ...formData };
    if (selectedFile && newDocName.trim()) {
      setIsUploadingToDrive(true);
      setError("Uploading selected document attachment...");
      try {
        const supabaseToken = await getAccessToken();
        const driveToken = await getDriveAccessToken();
        const isSupabaseConnected = !!supabaseToken;
        const isGDriveConnected = !!driveToken;
        const online = isOnline() && navigator.onLine;
        
        let dest: 'local' | 'drive' = 'local';
        let provider: 'supabase' | 'gdrive' | null = null;
        
        if (isGDriveConnected && online) {
          dest = 'drive';
          provider = 'gdrive';
        } else if (isSupabaseConnected && online) {
          dest = 'drive';
          provider = 'supabase';
        }

        const ext = selectedFile.name.split('.').pop() || 'png';
        const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
        const sanitizedDoc = newDocName.trim().replace(/[^a-zA-Z0-9]/g, '_');
        const autoFileName = `GERS_${sanitizedSur}_${sanitizedFirst}_Doc_${sanitizedDoc}_${Date.now()}.${ext}`;

        let newAttachment: Attachment;

        if (dest === 'drive') {
          let driveResult;
          if (provider === 'gdrive') {
            driveResult = await uploadFileToGDrive(selectedFile, autoFileName, selectedFile.type);
          } else {
            driveResult = await uploadFileToDrive(selectedFile, autoFileName, selectedFile.type);
          }
          newAttachment = {
            id: 'drive-' + driveResult.id,
            name: newDocName.trim(),
            fileName: driveResult.name,
            fileType: selectedFile.type,
            fileData: '',
            uploadedAt: new Date().toISOString(),
            driveFileId: driveResult.id,
            driveWebViewLink: driveResult.webViewLink,
            driveWebContentLink: driveResult.webContentLink,
            storageProvider: provider as 'supabase' | 'gdrive'
          };
        } else {
          if (!selectedFileData) {
            throw new Error("No selected file data available");
          }
          newAttachment = {
            id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
            name: newDocName.trim(),
            fileName: autoFileName,
            fileType: selectedFile.type,
            fileData: selectedFileData,
            uploadedAt: new Date().toISOString()
          };
        }

        finalFormData = {
          ...formData,
          attachments: [...(formData.attachments || []), newAttachment]
        };

        // Update local state to match
        setFormData(finalFormData);

        // Reset inputs
        setNewDocName('');
        setSelectedFile(null);
        setSelectedFileData(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        setError(null);
      } catch (err: any) {
        console.error("Auto-add of attachment failed during save", err);
        setError(`Failed to save: could not upload pending attachment. ${err.message || err}`);
        setIsUploadingToDrive(false);
        return;
      } finally {
        setIsUploadingToDrive(false);
      }
    }

    setError(null);
    onSave(finalFormData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
    setError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError("Photo must be smaller than 2MB.");
        return;
      }
      try {
        setError(null);
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, photo: base64 });
      } catch (err: any) {
        console.error("Photo upload failed", err);
        setError("Photo upload failed: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };

  const handlePdsScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      let file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024 && !file.type.startsWith('image/')) {
        setError("PDS file must be smaller than 2MB. For larger files, please compress it first.");
        return;
      }
      try {
        setError(null);
        if (file.type.startsWith('image/')) {
          try {
            file = await convertImageToPDF(file, file.name);
          } catch (pdfErr) {
            console.warn("Failed to convert PDS image to PDF, using original image file directly", pdfErr);
          }
        }
        const base64 = await fileToBase64(file);
        setFormData({ ...formData, pdsScan: base64 });
      } catch (err: any) {
        console.error("PDS Scan upload failed", err);
        setError("PDS Scan upload failed: " + (err instanceof Error ? err.message : String(err)));
      }
    }
  };




  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm md:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-none md:rounded-2xl shadow-2xl w-full max-w-5xl h-full md:max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 md:p-5 bg-[var(--navy)] text-white flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-2 md:gap-3">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
              aria-label="Back to employee list"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="w-px h-8 bg-white/10 hidden sm:block mx-1"></div>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[var(--gold)] rounded-lg flex items-center justify-center text-[var(--navy)] shrink-0">
              {activeTab === 'service' ? <Briefcase size={18} /> : <FileText size={18} />}
            </div>
            <div>
              <h2 id="edit-modal-title" className="font-playfair text-base md:text-xl font-bold leading-tight truncate max-w-[140px] xs:max-w-xs sm:max-w-none">
                {employee.id.startsWith('EMP-') && employee.firstName ? 'Modify Employee Record' : 'New Employee Record'}
              </h2>
              <p className="text-[9px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none mt-0.5">
                {employee.id.startsWith('EMP-') ? `Record ID: ${employee.id}` : 'System Initialization'}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close modal" className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-all">
            <X size={20} />
          </button>
        </div>

        {/* Personnel Identification Header (Always Visible) */}
        <div className="mx-4 md:mx-8 mt-5 p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-5 items-center">
          {/* Photo upload */}
          <div className="flex flex-col items-center gap-2 shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-sm">
              {formData.photo ? (
                <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <Camera className="text-slate-300" size={24} />
              )}
              <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1.5px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 select-none">
                <Camera size={14} className="mb-0.5" />
                <span className="text-[8px] font-bold uppercase tracking-wider">Change</span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
            </div>
            {formData.photo && (
              <button 
                type="button"
                onClick={() => setFormData({ ...formData, photo: null })} 
                className="text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full">
            <div className="space-y-1">
              <label htmlFor="surname" className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">Surname</label>
              <input 
                id="surname"
                name="surname" 
                value={formData.surname || ''} 
                onChange={handleChange} 
                aria-invalid={!!validationErrors.surname}
                className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.surname ? 'border-red-500 bg-red-50/10 font-bold' : 'border-slate-200 bg-white'}`} 
              />
              {validationErrors.surname && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.surname}</p>}
            </div>

            <div className="space-y-1">
              <label htmlFor="firstName" className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">First Name</label>
              <input 
                id="firstName"
                name="firstName" 
                value={formData.firstName || ''} 
                onChange={handleChange} 
                aria-invalid={!!validationErrors.firstName}
                className={`w-full border rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.firstName ? 'border-red-500 bg-red-50/10 font-bold' : 'border-slate-200 bg-white'}`} 
              />
              {validationErrors.firstName && <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.firstName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block font-sans">Middle Name</label>
              <input 
                name="middleName" 
                value={formData.middleName || ''} 
                onChange={handleChange} 
                className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-[var(--gold)] focus:border-transparent transition-all bg-white" 
              />
            </div>
          </div>
        </div>
        
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-200 bg-slate-50/50 px-4 mt-4" role="tablist" aria-label="Edit record sections">
          {tabs.map(tab => (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-controls={`panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 md:px-6 py-3 md:py-4 text-[10px] md:text-xs font-bold uppercase tracking-widest border-b-2 transition-all flex-shrink-0 ${
                activeTab === tab.id 
                  ? 'border-[var(--gold)] text-[var(--navy)] bg-white' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >


              {activeTab === 'service' && (
                <ServiceRecordEditor 
                  records={formData.serviceRecords} 
                  onChange={(records) => setFormData({ ...formData, serviceRecords: records })} 
                />
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Official Personal Data Sheet (PDS) Scan Card */}
                    <div className="lg:col-span-1 border border-slate-200 rounded-2xl p-6 bg-slate-50/30 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                          <FileUp size={16} className="text-[var(--gold)]" /> Personal Data Sheet (PDS)
                        </h3>
                        <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group">
                          {formData.pdsScan ? (
                            formData.pdsScan.startsWith('data:image/') ? (
                              <img src={formData.pdsScan} alt="PDS Scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-indigo-500">
                                <FileText size={48} className="text-indigo-400 mb-2" />
                                <span className="text-[10px] font-bold uppercase">PDF Document</span>
                              </div>
                            )
                          ) : (
                            <div className="flex flex-col items-center text-slate-300 text-center p-4">
                              <FileUp className="text-slate-300 mb-2" size={32} />
                              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">No official PDS Scan connected</span>
                            </div>
                          )}
                          <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 select-none">
                            <FileUp size={24} className="mb-1" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-center px-4">Upload Official PDS Scan Image</span>
                            <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handlePdsScanUpload} />
                          </label>
                        </div>
                      </div>

                      {formData.pdsScan ? (
                        <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                          <span className="text-[9px] font-bold uppercase text-emerald-500 tracking-wider flex items-center gap-1 leading-none">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Scan Document Active
                          </span>
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, pdsScan: null })} 
                            className="w-full py-1.5 text-[9px] font-black uppercase tracking-widest text-red-500 hover:text-white bg-white hover:bg-red-500 border border-slate-200 hover:border-red-500 rounded-lg transition-all"
                          >
                            Remove PDS Scan
                          </button>
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic text-center">Required for official dossiers. Select an image scan representing the printout page.</p>
                      )}
                    </div>

                    {/* Other Scanned Documents Attachment Form */}
                    <div className="lg:col-span-2 border border-slate-200 rounded-2xl p-6 bg-slate-50/55 text-slate-900">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                        <Plus size={16} className="text-[var(--gold)]" /> Upload Scanned Document
                      </h3>
                      
                      <div className="space-y-4">
                        {/* Unified Row: Name and File Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="data-label text-[10px] uppercase font-bold tracking-wider text-slate-500">Document Name / Label</label>
                            <input
                              type="text"
                              placeholder="e.g. Birth Certificate, Diploma, Contract"
                              value={newDocName}
                              onChange={e => setNewDocName(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-[var(--gold)] focus:border-[var(--gold)] bg-white h-10"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="data-label text-[10px] uppercase font-bold tracking-wider text-slate-500">Scanned Document File</label>
                            <div className="flex gap-3">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleAttachmentFileChange}
                                ref={fileInputRef}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[var(--gold)] transition-colors text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 bg-white h-10 truncate"
                              >
                                <FileText size={16} className="shrink-0" />
                                <span className="truncate">{selectedFile ? selectedFile.name : "Select Image/Scan File"}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Auto-detected Destination Status Indicator */}
                        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400 font-medium">
                          <div className={`w-1.5 h-1.5 rounded-full ${isDriveConnected && uploadDestination === 'drive' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}`} />
                          {isDriveConnected && uploadDestination === 'drive' ? (
                            <span className="flex items-center gap-1">
                              <strong>Background Sync Active:</strong> Newly selected files are pushed directly to <strong className="text-indigo-600 font-semibold">{storageProvider === 'gdrive' ? 'Google Drive' : 'Supabase Storage'}</strong>.
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              System auto-detected offline/unlinked. Saving to <strong className="text-amber-600 font-semibold">Local Storage</strong> {!isDriveConnected ? "(Storage unlinked)" : "(Offline mode)"}.
                            </span>
                          )}
                        </div>

                        {/* File Naming Preview Box */}
                        {selectedFile && (
                          <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 mt-2 text-xs">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">✨ Automatic Standardized Filename Preview:</span>
                            <div className="font-mono text-[10px] text-indigo-600 font-bold break-all flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                              <FileText size={12} className="text-indigo-500 shrink-0" />
                              {(() => {
                                const ext = selectedFile.name.split('.').pop() || 'png';
                                const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                const sanitizedDoc = (newDocName || 'Doc').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                return `GERS_${sanitizedSur}_${sanitizedFirst}_Doc_${sanitizedDoc}_[timestamp].${ext}`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {!isDriveConnected && (
                        <p className="mt-3 text-[9px] text-amber-500 italic">💡 Connect Cloud Storage in the Data Center to enable automated cloud storage with automatic file naming.</p>
                      )}
                      {isDriveConnected && uploadDestination === 'drive' && (
                        <p className="mt-3 text-[9px] text-indigo-500 italic">✨ <strong>Sync Service:</strong> Files are automatically pushed to your {storageProvider === 'gdrive' ? 'Google Drive' : 'Supabase Storage'} upon selection.</p>
                      )}
                      {isDriveConnected && uploadDestination === 'local' && (
                        <p className="mt-3 text-[9px] text-amber-500 italic">⚠️ Offline mode detected. File will be automatically saved locally and synchronized online later.</p>
                      )}
                      
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          disabled={isUploadingToDrive || !newDocName.trim() || !selectedFile || (uploadDestination === 'local' && !selectedFileData)}
                          className="px-6 py-2 bg-[var(--gold)] text-[var(--navy)] text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-opacity-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                          {isUploadingToDrive ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Uploading to Drive...
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Add Document
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Uploaded Attachments ({(formData.attachments || []).length})
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(formData.attachments || []).map((doc) => (
                        <div key={doc.id} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 overflow-hidden shrink-0">
                              {doc.driveFileId ? (
                                <Cloud size={24} className="text-indigo-600 animate-pulse" />
                              ) : doc.fileType.startsWith('image/') ? (
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                              ) : (
                                <FileText size={20} className="text-indigo-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-sm text-slate-800 truncate">{doc.name}</p>
                                {doc.driveFileId && (
                                  <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shrink-0">
                                    <Cloud size={8} /> {doc.storageProvider === 'gdrive' ? 'Google Drive' : 'Supabase'}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mb-1">{doc.fileName}</p>
                              <p className="text-[9px] text-slate-400 font-mono">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5 shrink-0">
                            {doc.driveFileId ? (
                              <button
                                type="button"
                                onClick={() => handleRetrieveAttachment(doc)}
                                disabled={downloadingFileId === doc.id}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center justify-center"
                                title={`Download / retrieve from ${doc.storageProvider === 'gdrive' ? 'Google Drive' : 'Supabase Storage'}`}
                              >
                                {downloadingFileId === doc.id ? (
                                  <Loader2 size={16} className="animate-spin text-indigo-600" />
                                ) : (
                                  <Download size={16} />
                                )}
                              </button>
                            ) : (
                              <a
                                href={doc.fileData}
                                download={doc.fileName}
                                className="p-2 text-slate-400 hover:text-[var(--navy)] hover:bg-slate-50 rounded-lg transition-colors"
                                title="Download document"
                              >
                                <Download size={16} />
                              </a>
                            )}
                            
                            {doc.driveWebViewLink && (
                              <a
                                href={doc.driveWebViewLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors"
                                title={`View on ${doc.storageProvider === 'gdrive' ? 'Google Drive' : 'Supabase Storage'} in new tab`}
                              >
                                <ExternalLink size={16} />
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => handleRemoveAttachment(doc.id)}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove document"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(formData.attachments || []).length === 0 && (
                        <div className="col-span-2 border-2 border-dashed border-slate-100 rounded-xl p-8 text-center text-slate-400 italic text-xs">
                          No scanned documents uploaded for this employee dossier yet.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-slate-200 bg-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-red-600 text-xs font-bold uppercase tracking-widest">
              {error && <><X size={14} /> {error}</>}
            </div>
            {lastSaved && !error && (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Autosaved at {lastSaved.toLocaleTimeString()}
              </p>
            )}
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button 
              onClick={onClose} 
              disabled={isSaving} 
              aria-label="Cancel editing"
              className="flex-1 md:flex-none px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveClick} 
              disabled={isSaving} 
              aria-label={isSaving ? "Saving changes..." : "Save changes to record"}
              className="flex-1 md:flex-none px-10 py-3 bg-[var(--navy)] text-[var(--gold)] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-navy/20"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save size={14} />
              )}
              {isSaving ? 'Processing...' : 'Commit Changes'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
