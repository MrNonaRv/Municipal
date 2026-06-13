import React, { useState, useEffect, useRef } from 'react';
import { Employee, Child, Education, Attachment } from '../types/employee';
import ServiceRecordEditor from './ServiceRecordEditor';
import { fileToBase64 } from '../utils/helpers';
import { Camera, Plus, Trash2, X, User, Users, GraduationCap, Briefcase, Save, ArrowLeft, FileText, FileUp, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  employee: Employee;
  onClose: () => void;
  onSave: (emp: Employee, isAutosave?: boolean) => void;
  initialTab?: 'personal' | 'family' | 'education' | 'service' | 'attachments';
  isSaving?: boolean;
}

export default function EditModal({ employee, onClose, onSave, initialTab = 'personal', isSaving = false }: Props) {
  const [formData, setFormData] = useState<Employee>({ ...employee });
  const [activeTab, setActiveTab] = useState<'personal' | 'family' | 'education' | 'service' | 'attachments'>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const isInitialMount = useRef(true);

  // States for Scanned Documents Attachment
  const [newDocName, setNewDocName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileData, setSelectedFileData] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        setSelectedFile(file);
        setSelectedFileData(base64);
      } catch (err) {
        console.error("File loading failed", err);
      }
    }
  };

  const handleAddAttachment = () => {
    if (!newDocName.trim() || !selectedFile || !selectedFileData) return;

    const newAttachment: Attachment = {
      id: 'doc-' + Date.now(),
      name: newDocName.trim(),
      fileName: selectedFile.name,
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
      'surname', 'firstName', 
      'spouseSurname', 'spouseFirstName', 
      'fatherSurname', 'fatherFirstName', 
      'motherSurname', 'motherFirstName'
    ];
    
    if (requiredFields.includes(name)) {
      if (!value || !value.trim()) errorMsg = 'This field is required';
    }

    switch (name) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errorMsg = 'Invalid email format';
        }
        break;
      case 'cellphone':
        if (value && !/^[0-9+\-\s()]{10,15}$/.test(value)) {
          errorMsg = 'Invalid format (10-15 digits)';
        }
        break;
      case 'dateOfBirth':
        if (value) {
          const dob = new Date(value);
          if (dob > new Date()) {
            errorMsg = 'Cannot be in the future';
          }
        }
        break;
      case 'zipCode':
        if (value && !/^\d{4,6}$/.test(value)) {
          errorMsg = 'Invalid ZIP (4-6 digits)';
        }
        break;
      case 'gsisNo':
      case 'pagibigNo':
      case 'philhealthNo':
      case 'sssNo':
      case 'tin':
        if (value && !/^[0-9-]{9,15}$/.test(value)) {
          errorMsg = 'Invalid format';
        }
        break;
      case 'height':
      case 'weight':
        if (value && isNaN(Number(value))) {
          errorMsg = 'Must be a number';
        }
        break;
    }
    setValidationErrors(prev => ({ ...prev, [name]: errorMsg }));
    return errorMsg;
  };

  const tabs = [
    { id: 'personal', label: 'Personal Data', icon: User },
    { id: 'family', label: 'Family Background', icon: Users },
    { id: 'education', label: 'Education', icon: GraduationCap },
    { id: 'service', label: 'Service Record', icon: Briefcase },
    { id: 'attachments', label: 'Scanned Documents', icon: FileText },
  ] as const;

  const handleSaveClick = () => {
    // Validate all fields before saving
    const fieldsToValidate = [
      'surname', 'firstName', 'email', 'cellphone', 'dateOfBirth', 'zipCode',
      'height', 'weight', 'gsisNo', 'pagibigNo', 'philhealthNo', 'sssNo', 'tin',
      'spouseSurname', 'spouseFirstName', 'fatherSurname', 'fatherFirstName', 'motherSurname', 'motherFirstName'
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

    // Validate education records
    formData.education.forEach((edu, idx) => {
      if (!edu.school || !edu.school.trim()) {
        hasErrors = true;
        newErrors[`edu-${idx}-school`] = 'This field is required';
      }
      if (!edu.course || !edu.course.trim()) {
        hasErrors = true;
        newErrors[`edu-${idx}-course`] = 'This field is required';
      }
    });

    // Validate children records
    formData.children.forEach((child, idx) => {
      if (!child.name || !child.name.trim()) {
        hasErrors = true;
        newErrors[`child-${idx}-name`] = 'Required';
      }
      if (child.dob && new Date(child.dob) > new Date()) {
        hasErrors = true;
        newErrors[`child-${idx}-dob`] = 'Invalid date';
      }
    });

    setValidationErrors(newErrors);

    if (hasErrors) {
      setError("Please correct the errors before saving.");
      
      // Determine which tab has the first error and switch to it
      const firstErrorKey = Object.keys(newErrors)[0];
      if (firstErrorKey.startsWith('edu-')) {
        setActiveTab('education');
      } else if (
        firstErrorKey.startsWith('child-') || 
        ['spouseSurname', 'spouseFirstName', 'fatherSurname', 'fatherFirstName', 'motherSurname', 'motherFirstName'].includes(firstErrorKey)
      ) {
        setActiveTab('family');
      } else {
        setActiveTab('personal');
      }
      return;
    }

    setError(null);
    onSave(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    validateField(name, value);
    setError(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormData({ ...formData, photo: base64 });
      } catch (err) {
        console.error("Photo upload failed", err);
      }
    }
  };

  const handlePdsScanUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await fileToBase64(e.target.files[0]);
        setFormData({ ...formData, pdsScan: base64 });
      } catch (err) {
        console.error("PDS Scan upload failed", err);
      }
    }
  };


  const handleAddChild = () => {
    setFormData({ ...formData, children: [...formData.children, { name: '', dob: '' }] });
  };

  const handleChildChange = (index: number, field: keyof Child, value: string) => {
    const newChildren = [...formData.children];
    newChildren[index] = { ...newChildren[index], [field]: value };
    setFormData({ ...formData, children: newChildren });
    setError(null);
    
    // Real-time validation for children fields
    const errorKey = `child-${index}-${field}`;
    let errorMsg = '';
    if (field === 'name') {
      if (!value || !value.trim()) errorMsg = 'Required';
    } else if (field === 'dob') {
      if (value && new Date(value) > new Date()) errorMsg = 'Invalid date';
    }
    setValidationErrors(prev => ({ ...prev, [errorKey]: errorMsg }));
  };

  const handleRemoveChild = (index: number) => {
    setFormData({ ...formData, children: formData.children.filter((_, i) => i !== index) });
  };

  const handleAddEducation = () => {
    const newEdu: Education = { id: 'edu-' + Date.now(), level: 'College', school: '', course: '', yearGraduated: '', from: '', to: '', honors: '' };
    setFormData({ ...formData, education: [...formData.education, newEdu] });
  };

  const handleEducationChange = (index: number, field: keyof Education, value: string) => {
    const newEdu = [...formData.education];
    newEdu[index] = { ...newEdu[index], [field]: value };
    setFormData({ ...formData, education: newEdu });
    setError(null);
    
    // Real-time validation for education fields
    const errorKey = `edu-${index}-${field}`;
    let errorMsg = '';
    if (field === 'school' || field === 'course') {
      if (!value || !value.trim()) errorMsg = 'This field is required';
    }
    setValidationErrors(prev => ({ ...prev, [errorKey]: errorMsg }));
  };

  const handleRemoveEducation = (index: number) => {
    setFormData({ ...formData, education: formData.education.filter((_, i) => i !== index) });
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
              {activeTab === 'personal' && <User size={18} />}
              {activeTab === 'family' && <Users size={18} />}
              {activeTab === 'education' && <GraduationCap size={18} />}
              {activeTab === 'service' && <Briefcase size={18} />}
              {activeTab === 'attachments' && <FileText size={18} />}
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
        
        <div className="flex overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-200 bg-slate-50/50 px-4" role="tablist" aria-label="Edit record sections">
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
              {activeTab === 'personal' && (
                <div className="space-y-8">
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* PHOTO UPLOAD */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-40 h-40 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-inner">
                        {formData.photo ? (
                          <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="text-slate-300" size={40} />
                        )}
                        <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300">
                          <Camera size={24} className="mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Change Photo</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                        </label>
                      </div>
                      {formData.photo ? (
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, photo: null })} 
                          className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                        >
                          Remove Image
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                          ID Photo
                        </span>
                      )}
                    </div>

                    {/* SCANNED PDS WORKSHEET */}
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-40 h-40 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden relative group shadow-inner">
                        {formData.pdsScan ? (
                          <img src={formData.pdsScan} alt="PDS Scan" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center text-slate-300 text-center p-2">
                            <FileUp className="text-slate-300 mb-1" size={32} />
                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">No PDS Scan</span>
                          </div>
                        )}
                        <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 cursor-pointer transition-all duration-300 select-none">
                          <FileUp size={24} className="mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-center px-2">Upload PDS Scan</span>
                          <input type="file" accept="image/*" className="hidden" onChange={handlePdsScanUpload} />
                        </label>
                      </div>
                      {formData.pdsScan ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[9px] font-bold uppercase text-emerald-500 tracking-wider flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                            Scan Connected
                          </span>
                          <button 
                            type="button"
                            onClick={() => setFormData({ ...formData, pdsScan: null })} 
                            className="text-[10px] font-bold uppercase tracking-widest text-red-500 hover:text-red-700 transition-colors"
                          >
                            Remove Scan
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">
                          PDS Scan Image
                        </span>
                      )}
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">

                      <div className="space-y-1">
                        <label htmlFor="surname" className="data-label">Surname</label>
                        <input 
                          id="surname"
                          name="surname" 
                          value={formData.surname} 
                          onChange={handleChange} 
                          aria-invalid={!!validationErrors.surname}
                          aria-describedby={validationErrors.surname ? "surname-error" : undefined}
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.surname ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.surname && <p id="surname-error" className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.surname}</p>}
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="firstName" className="data-label">First Name</label>
                        <input 
                          id="firstName"
                          name="firstName" 
                          value={formData.firstName} 
                          onChange={handleChange} 
                          aria-invalid={!!validationErrors.firstName}
                          aria-describedby={validationErrors.firstName ? "firstName-error" : undefined}
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.firstName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.firstName && <p id="firstName-error" className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.firstName}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Middle Name</label>
                        <input name="middleName" value={formData.middleName} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Name Extension</label>
                        <input name="nameExtension" value={formData.nameExtension} onChange={handleChange} placeholder="e.g. Jr., Sr." className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Date of Birth</label>
                        <input 
                          type="date" 
                          name="dateOfBirth" 
                          value={formData.dateOfBirth} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.dateOfBirth ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.dateOfBirth && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.dateOfBirth}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Place of Birth</label>
                        <input name="placeOfBirth" value={formData.placeOfBirth} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all" />
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Sex</label>
                        <select name="sex" value={formData.sex} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all">
                          <option value="">Select...</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Civil Status</label>
                        <select name="civilStatus" value={formData.civilStatus} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all">
                          <option value="">Select...</option>
                          <option value="Single">Single</option>
                          <option value="Married">Married</option>
                          <option value="Widowed">Widowed</option>
                          <option value="Separated">Separated</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Citizenship</label>
                        <input name="citizenship" value={formData.citizenship} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-8 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="data-label">Height (m)</label>
                      <input 
                        name="height" 
                        value={formData.height} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.height ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.height && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.height}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="data-label">Weight (kg)</label>
                      <input 
                        name="weight" 
                        value={formData.weight} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.weight ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.weight && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.weight}</p>}
                    </div>
                    <div className="space-y-1"><label className="data-label">Blood Type</label><input name="bloodType" value={formData.bloodType} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                    <div className="space-y-1"><label className="data-label">Agency Emp No.</label><input name="agencyEmployeeNo" value={formData.agencyEmployeeNo} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-8 border-t border-slate-100">
                    <div className="space-y-1"><label className="data-label">Residential Address</label><input name="residentialAddress" value={formData.residentialAddress} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                    <div className="space-y-1"><label className="data-label">Permanent Address</label><input name="permanentAddress" value={formData.permanentAddress} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="data-label">ZIP Code</label>
                        <input 
                          name="zipCode" 
                          value={formData.zipCode} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.zipCode ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.zipCode && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.zipCode}</p>}
                      </div>
                      <div className="space-y-1"><label className="data-label">Telephone</label><input name="telephone" value={formData.telephone} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="data-label">Email Address</label>
                        <input 
                          type="email" 
                          name="email" 
                          value={formData.email} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.email && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.email}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">Cellphone</label>
                        <input 
                          name="cellphone" 
                          value={formData.cellphone} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all ${validationErrors.cellphone ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.cellphone && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.cellphone}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 pt-8 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="data-label">GSIS No.</label>
                      <input 
                        name="gsisNo" 
                        value={formData.gsisNo} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-xs ${validationErrors.gsisNo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.gsisNo && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.gsisNo}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="data-label">PAG-IBIG No.</label>
                      <input 
                        name="pagibigNo" 
                        value={formData.pagibigNo} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-xs ${validationErrors.pagibigNo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.pagibigNo && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.pagibigNo}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="data-label">PhilHealth No.</label>
                      <input 
                        name="philhealthNo" 
                        value={formData.philhealthNo} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-xs ${validationErrors.philhealthNo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.philhealthNo && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.philhealthNo}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="data-label">SSS No.</label>
                      <input 
                        name="sssNo" 
                        value={formData.sssNo} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-xs ${validationErrors.sssNo ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.sssNo && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.sssNo}</p>}
                    </div>
                    <div className="space-y-1">
                      <label className="data-label">TIN</label>
                      <input 
                        name="tin" 
                        value={formData.tin} 
                        onChange={handleChange} 
                        className={`w-full rounded-lg px-4 py-2.5 text-xs ${validationErrors.tin ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                      />
                      {validationErrors.tin && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.tin}</p>}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'family' && (
                <div className="space-y-10">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-6 bg-[var(--gold)] rounded-full"></div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--navy)]">Spouse's Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-1">
                        <label className="data-label">Surname</label>
                        <input 
                          name="spouseSurname" 
                          value={formData.spouseSurname} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.spouseSurname ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.spouseSurname && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.spouseSurname}</p>}
                      </div>
                      <div className="space-y-1">
                        <label className="data-label">First Name</label>
                        <input 
                          name="spouseFirstName" 
                          value={formData.spouseFirstName} 
                          onChange={handleChange} 
                          className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.spouseFirstName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                        />
                        {validationErrors.spouseFirstName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.spouseFirstName}</p>}
                      </div>
                      <div className="space-y-1"><label className="data-label">Middle Name</label><input name="spouseMiddleName" value={formData.spouseMiddleName} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                      <div className="space-y-1"><label className="data-label">Occupation</label><input name="spouseOccupation" value={formData.spouseOccupation} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                      <div className="space-y-1"><label className="data-label">Employer/Business</label><input name="spouseEmployer" value={formData.spouseEmployer} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                      <div className="space-y-1"><label className="data-label">Telephone</label><input name="spouseTelephone" value={formData.spouseTelephone} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-1 h-6 bg-[var(--gold)] rounded-full"></div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--navy)]">Parents' Information</h3>
                    </div>
                    <div className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-full text-[10px] font-black uppercase tracking-widest text-slate-400">Father</div>
                        <div className="space-y-1">
                          <label className="data-label">Surname</label>
                          <input 
                            name="fatherSurname" 
                            value={formData.fatherSurname} 
                            onChange={handleChange} 
                            className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.fatherSurname ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                          />
                          {validationErrors.fatherSurname && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.fatherSurname}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="data-label">First Name</label>
                          <input 
                            name="fatherFirstName" 
                            value={formData.fatherFirstName} 
                            onChange={handleChange} 
                            className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.fatherFirstName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                          />
                          {validationErrors.fatherFirstName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.fatherFirstName}</p>}
                        </div>
                        <div className="space-y-1"><label className="data-label">Middle Name</label><input name="fatherMiddleName" value={formData.fatherMiddleName} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-full text-[10px] font-black uppercase tracking-widest text-slate-400">Mother (Maiden Name)</div>
                        <div className="space-y-1">
                          <label className="data-label">Surname</label>
                          <input 
                            name="motherSurname" 
                            value={formData.motherSurname} 
                            onChange={handleChange} 
                            className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.motherSurname ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                          />
                          {validationErrors.motherSurname && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.motherSurname}</p>}
                        </div>
                        <div className="space-y-1">
                          <label className="data-label">First Name</label>
                          <input 
                            name="motherFirstName" 
                            value={formData.motherFirstName} 
                            onChange={handleChange} 
                            className={`w-full rounded-lg px-4 py-2.5 text-sm ${validationErrors.motherFirstName ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                          />
                          {validationErrors.motherFirstName && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors.motherFirstName}</p>}
                        </div>
                        <div className="space-y-1"><label className="data-label">Middle Name</label><input name="motherMiddleName" value={formData.motherMiddleName} onChange={handleChange} className="w-full border-slate-200 rounded-lg px-4 py-2.5 text-sm" /></div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-[var(--gold)] rounded-full"></div>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--navy)]">Children</h3>
                      </div>
                      <button 
                        onClick={handleAddChild} 
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-[var(--navy)] rounded-lg text-xs font-bold uppercase tracking-widest transition-all"
                      >
                        <Plus size={14}/> Add Entry
                      </button>
                    </div>
                    
                    {formData.children.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No children records found</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {formData.children.map((child, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex gap-4 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100"
                          >
                            <div className="flex-1 space-y-1">
                              <label className="data-label">Full Name</label>
                              <input 
                                value={child.name} 
                                onChange={e => handleChildChange(idx, 'name', e.target.value)} 
                                className={`w-full rounded-lg px-4 py-2 text-sm ${validationErrors[`child-${idx}-name`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                              />
                              {validationErrors[`child-${idx}-name`] && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors[`child-${idx}-name`]}</p>}
                            </div>
                            <div className="w-48 space-y-1">
                              <label className="data-label">Date of Birth</label>
                              <input 
                                type="date" 
                                value={child.dob} 
                                onChange={e => handleChildChange(idx, 'dob', e.target.value)} 
                                className={`w-full rounded-lg px-4 py-2 text-sm ${validationErrors[`child-${idx}-dob`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                              />
                              {validationErrors[`child-${idx}-dob`] && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors[`child-${idx}-dob`]}</p>}
                            </div>
                            <button 
                              onClick={() => handleRemoveChild(idx)} 
                              className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={18}/>
                            </button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
              )}

              {activeTab === 'education' && (
                <div className="space-y-8">
                  <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-6 bg-[var(--gold)] rounded-full"></div>
                      <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--navy)]">Educational Background</h3>
                    </div>
                    <button 
                      onClick={handleAddEducation} 
                      className="flex items-center gap-2 px-4 py-2 bg-[var(--navy)] text-[var(--gold)] rounded-lg text-xs font-bold uppercase tracking-widest transition-all shadow-lg shadow-navy/20"
                    >
                      <Plus size={14}/> Add Education
                    </button>
                  </div>

                  {formData.education.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <GraduationCap size={40} className="mx-auto text-slate-200 mb-4" />
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-400">No educational history recorded</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {formData.education.map((edu, idx) => (
                        <motion.div 
                          key={edu.id}
                          layout
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="p-6 border border-slate-200 rounded-2xl bg-white shadow-sm relative group"
                        >
                          <button 
                            onClick={() => handleRemoveEducation(idx)} 
                            className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 size={18}/>
                          </button>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-8">
                            <div className="space-y-1">
                              <label className="data-label">Level</label>
                              <select value={edu.level} onChange={e => handleEducationChange(idx, 'level', e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm">
                                <option value="Elementary">Elementary</option>
                                <option value="Secondary">Secondary</option>
                                <option value="Vocational/Trade">Vocational/Trade</option>
                                <option value="College">College</option>
                                <option value="Graduate Studies">Graduate Studies</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="data-label">Name of School</label>
                              <input 
                                value={edu.school} 
                                onChange={e => handleEducationChange(idx, 'school', e.target.value)} 
                                className={`w-full rounded-lg px-4 py-2 text-sm ${validationErrors[`edu-${idx}-school`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                              />
                              {validationErrors[`edu-${idx}-school`] && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors[`edu-${idx}-school`]}</p>}
                            </div>
                            <div className="space-y-1">
                              <label className="data-label">Degree / Course</label>
                              <input 
                                value={edu.course} 
                                onChange={e => handleEducationChange(idx, 'course', e.target.value)} 
                                className={`w-full rounded-lg px-4 py-2 text-sm ${validationErrors[`edu-${idx}-course`] ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-200'}`} 
                              />
                              {validationErrors[`edu-${idx}-course`] && <p className="text-[10px] text-red-500 font-bold uppercase tracking-tight">{validationErrors[`edu-${idx}-course`]}</p>}
                            </div>
                            <div className="space-y-1">
                              <label className="data-label">Highest Level / Units Earned</label>
                              <input value={edu.yearGraduated} onChange={e => handleEducationChange(idx, 'yearGraduated', e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1"><label className="data-label">From (Year)</label><input value={edu.from} onChange={e => handleEducationChange(idx, 'from', e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm" /></div>
                              <div className="space-y-1"><label className="data-label">To (Year)</label><input value={edu.to} onChange={e => handleEducationChange(idx, 'to', e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm" /></div>
                            </div>
                            <div className="space-y-1">
                              <label className="data-label">Scholarship / Honors</label>
                              <input value={edu.honors} onChange={e => handleEducationChange(idx, 'honors', e.target.value)} className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm" />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'service' && (
                <ServiceRecordEditor 
                  records={formData.serviceRecords} 
                  onChange={(records) => setFormData({ ...formData, serviceRecords: records })} 
                />
              )}

              {activeTab === 'attachments' && (
                <div className="space-y-6">
                  <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 text-slate-900">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4 flex items-center gap-2">
                      <FileUp size={16} className="text-[var(--gold)]" /> Upload Scanned Document
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                        <label className="data-label text-xs">Document Name / Label</label>
                        <input
                          type="text"
                          placeholder="e.g. Birth Certificate, Diploma, Oath of Office"
                          value={newDocName}
                          onChange={e => setNewDocName(e.target.value)}
                          className="w-full border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-[var(--gold)] focus:border-[var(--gold)]"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="data-label text-xs">Scanned Document or Image File</label>
                        <div className="flex gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAttachmentFileChange}
                            ref={fileInputRef}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[var(--gold)] transition-colors text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 bg-white"
                          >
                            <FileText size={16} />
                            {selectedFile ? selectedFile.name : "Select Image File (Scanned)"}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddAttachment}
                        disabled={!newDocName.trim() || !selectedFileData}
                        className="px-6 py-2 bg-[var(--gold)] text-[var(--navy)] text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-opacity-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                      >
                        <Plus size={14} /> Add Document
                      </button>
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
                              {doc.fileType.startsWith('image/') ? (
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                              ) : (
                                <FileText size={20} className="text-indigo-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-800 truncate">{doc.name}</p>
                              <p className="text-[10px] text-slate-400 truncate mb-1">{doc.fileName}</p>
                              <p className="text-[9px] text-slate-400 font-mono">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={doc.fileData}
                              download={doc.fileName}
                              className="p-2 text-slate-400 hover:text-[var(--navy)] hover:bg-slate-50 rounded-lg transition-colors"
                              title="Download document"
                            >
                              <Download size={16} />
                            </a>
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
