import React, { useState, useEffect } from 'react';
import { Employee, Attachment } from '../types/employee';
import { Printer, Edit, Trash2, X, FileText, History, Users, ShieldCheck, MapPin, Phone, Mail, Calendar, Download, ArrowLeft, FileUp, Eye, ZoomIn, Cloud, Loader2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { downloadFileFromDrive as downloadFileFromGDrive } from '../services/driveStorage';
import { PreviewModal } from './PreviewModal';

interface Props {
  employee: Employee;
  onClose: () => void;
  onEdit: (emp: Employee, tab?: 'service' | 'attachments') => void;
  onDelete: (emp: Employee) => void;
  onSave?: (emp: Employee) => void;
}

export default function ProfileModal({ employee, onClose, onEdit, onDelete, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'sr' | 'docs'>('sr');
  const [showDigitalPds, setShowDigitalPds] = useState<boolean>(!employee.pdsScan);
  const [isFullScreenPds, setIsFullScreenPds] = useState<boolean>(false);
  const [scale, setScale] = useState<number>(1);
  const [fitToWidth, setFitToWidth] = useState<boolean>(true);
  const [isModalFullScreen, setIsModalFullScreen] = useState<boolean>(true);

  // Preview state
  const [previewDoc, setPreviewDoc] = useState<Attachment | null>(null);

  // Google Drive download state in ProfileModal
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);

  const handleDownloadDriveFile = async (doc: Attachment) => {
    if (!doc.driveFileId) return;
    setDownloadingFileId(doc.id);
    setDriveError(null);
    try {
      let blob;
      if (doc.storageProvider === 'gdrive') {
        blob = await downloadFileFromGDrive(doc.driveFileId);
      } else {
        blob = await downloadFileFromGDrive(doc.driveFileId);
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
      setDriveError(`Failed to download from Google Drive: ${err.message || err}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  const handleDeleteAttachment = (id: string) => {
    if (!onSave) return;
    if (confirm('Are you sure you want to delete this scanned document? This action cannot be undone.')) {
      const updatedEmp = {
        ...employee,
        attachments: (employee.attachments || []).filter(a => a.id !== id)
      };
      onSave(updatedEmp);
    }
  };

  const handleRemovePdsScan = () => {
    if (!onSave) return;
    if (confirm('Are you sure you want to delete the PDS scan? This action cannot be undone.')) {
      const updatedEmp = {
        ...employee,
        pdsScan: null
      };
      onSave(updatedEmp);
    }
  };

  useEffect(() => {
    if (!fitToWidth) {
      setScale(1);
      return;
    }
    const handleResize = () => {
      const paddingX = isModalFullScreen ? 32 : 128;
      const availableWidth = window.innerWidth - paddingX;
      const documentWidth = 840; // ~794px document + safety margin
      
      if (availableWidth < documentWidth) {
        setScale(Math.min(1, availableWidth / documentWidth));
      } else {
        setScale(1);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [fitToWidth, isModalFullScreen]);

  const formatBirthDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      }
    } catch (e) {}
    return dateStr;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(employee, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${employee.surname}_${employee.firstName}_Dossier.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md ${isModalFullScreen ? 'p-0' : 'md:p-4'} print:block print:static print:bg-white print:p-0`} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 border border-white/20 print:hidden ${
          isModalFullScreen 
            ? 'w-full h-full rounded-none max-w-none' 
            : 'rounded-none md:rounded-[2.5rem] w-full max-w-[1200px] h-full md:max-h-[95vh]'
        }`}
      >
        
        {/* Header - Hidden on print */}
        <div className="p-4 md:p-6 bg-slate-950 text-white flex flex-col lg:flex-row gap-4 lg:gap-6 justify-between items-stretch lg:items-center no-print border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-gradient-to-r from-transparent via-white to-transparent rotate-45 animate-[shimmer_10s_infinite]"></div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-8 relative z-10 flex-grow">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group self-start sm:self-auto"
              aria-label="Back to employee list"
            >
              <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
              Back
            </button>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck size={16} className="text-[var(--gold)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Classified Personnel File</span>
              </div>
              <h2 id="profile-modal-title" className="font-playfair text-2xl font-bold tracking-tight">
                {employee.surname}, {employee.firstName}
              </h2>
            </div>
            
            <div className="h-10 w-px bg-white/10 hidden lg:block"></div>

            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5 overflow-x-auto whitespace-nowrap scrollbar-none max-w-full" role="tablist" aria-label="Dossier sections">
              <button 
                role="tab" 
                id="tab-sr"
                aria-controls="panel-sr"
                aria-selected={activeTab === 'sr'} 
                onClick={() => setActiveTab('sr')} 
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex-shrink-0 ${activeTab === 'sr' ? 'bg-[var(--gold)] text-[var(--navy)] shadow-lg shadow-gold/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <History size={14} />
                Service History
              </button>
              <button 
                role="tab" 
                id="tab-docs"
                aria-controls="panel-docs"
                aria-selected={activeTab === 'docs'} 
                onClick={() => setActiveTab('docs')} 
                className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex-shrink-0 ${activeTab === 'docs' ? 'bg-[var(--gold)] text-[var(--navy)] shadow-lg shadow-gold/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={14} />
                Scanned Docs
              </button>
            </div>
          </div>

          <div className="flex items-center lg:justify-end gap-2 md:gap-3 relative z-10 flex-wrap">
            <button 
              onClick={handleExport} 
              aria-label="Export record as JSON"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 group"
            >
              <Download size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={handlePrint} 
              aria-label="Print record"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
            >
              <Printer size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Print</span>
            </button>
            <button 
              onClick={() => onEdit(employee, activeTab === 'sr' ? 'service' : 'attachments')} 
              aria-label="Edit record"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
            >
              <Edit size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Modify</span>
            </button>
            <button 
              onClick={() => onDelete(employee)} 
              aria-label="Delete record"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 group"
            >
              <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Purge</span>
            </button>

            <div className="w-px h-8 bg-white/10 hidden sm:block mx-1"></div>
            <button onClick={onClose} aria-label="Close dossier" className="p-2.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className={`flex-1 overflow-auto bg-slate-200 p-4 transition-all ${isModalFullScreen ? 'md:p-6' : 'md:p-12'} print:block print:p-0 print:bg-white print:overflow-visible custom-scrollbar relative`}>
          


          <div className="w-full flex flex-col items-center pb-12">
            <AnimatePresence mode="wait">
              {false && (
                <div 
                  className="paper-texture mx-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] print:shadow-none relative rounded-sm overflow-hidden shrink-0" 
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '20mm',
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    marginBottom: scale < 1 ? `calc((297mm * ${1 - scale}) * -1)` : undefined,
                  }}
                >
                  {/* Staple Marks */}
                  <div className="absolute top-4 left-4 w-8 h-1 bg-slate-400/30 rounded-full rotate-[-5deg] z-50 no-print"></div>
                  <div className="absolute top-6 left-4 w-8 h-1 bg-slate-400/20 rounded-full rotate-[2deg] z-50 no-print"></div>
                  <div className="absolute top-4 right-4 w-8 h-1 bg-slate-400/30 rounded-full rotate-[15deg] z-50 no-print"></div>

                  {/* Confidential Stamp */}
                  <div className="absolute top-10 right-10 z-50 pointer-events-none select-none">
                    <motion.div 
                      initial={{ scale: 2, opacity: 0, rotate: -30 }}
                      animate={{ scale: 1, opacity: 0.6, rotate: -12 }}
                      transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                      className="stamp stamp-red text-2xl px-6 py-2 border-[6px]"
                    >
                      CONFIDENTIAL
                    </motion.div>
                  </div>

                  {/* Verified Seal */}
                  <div className="absolute bottom-20 left-10 z-50 pointer-events-none select-none opacity-40">
                    <div className="stamp stamp-blue text-xs tracking-tighter">
                      OFFICIALLY VERIFIED<br/>
                      BY HRMO OFFICE<br/>
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
                    <Users size={800} className="text-[var(--navy)] rotate-12" />
                  </div>

                  <motion.div 
                    key="pds"
                    id="panel-pds"
                    role="tabpanel"
                    aria-labelledby="tab-pds"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="pds-container text-[11px] leading-tight font-sans text-black relative z-10 w-full"
                  >
                    {/* SELECTOR BAR FOR SCAN VS DIGITAL */}
                    {employee.pdsScan && (
                      <div className="no-print flex justify-center mb-8">
                        <div className="bg-slate-100 p-1.5 rounded-2xl flex border border-slate-200/50">
                          <button
                            type="button"
                            onClick={() => setShowDigitalPds(false)}
                            className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              !showDigitalPds 
                                ? 'bg-white text-[var(--navy)] shadow-md' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <FileText size={14} className={!showDigitalPds ? 'text-[var(--gold)]' : ''} />
                            📄 PDS Scan Image
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowDigitalPds(true)}
                            className={`flex items-center gap-2 px-5 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${
                              showDigitalPds 
                                ? 'bg-white text-[var(--navy)] shadow-md' 
                                : 'text-slate-500 hover:text-slate-800'
                            }`}
                          >
                            <Users size={14} className={showDigitalPds ? 'text-[var(--gold)]' : ''} />
                            🖥️ Digital Data PDS
                          </button>
                        </div>
                      </div>
                    )}

                    {employee.pdsScan && !showDigitalPds ? (
                      /* SHOW SCAN IMAGE VIEW */
                      <div className="flex flex-col items-center py-8 px-4 bg-slate-50/50 rounded-[2rem] border border-slate-200 shadow-inner">
                        <div className="flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl mb-6 gap-4">
                          <div className="flex flex-col gap-1 items-center sm:items-start text-center sm:text-left">
                            <h3 className="font-playfair font-black text-2xl text-[var(--navy)] leading-none uppercase">Scanned Personal Data Sheet</h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1 mt-1">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                              ACTIVE DOSSIER FILING
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setIsFullScreenPds(true)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 border border-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-700 transition-all bg-white"
                            >
                              <ZoomIn size={14} /> Zoom / View Full
                            </button>
                            <a
                              href={employee.pdsScan}
                              download={`${employee.surname}_PDS_Scan.png`}
                              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-opacity-95 text-[var(--navy)] rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                            >
                              <Download size={14} /> Download Scan
                            </a>
                          </div>
                        </div>

                        <div 
                          onClick={() => setIsFullScreenPds(true)}
                          className="w-full max-w-4xl border border-slate-200 rounded-2xl bg-white shadow-xl overflow-hidden relative group p-2 cursor-zoom-in"
                        >
                          <img 
                            src={employee.pdsScan} 
                            alt="Scanned Personal Data Sheet" 
                            className="w-full h-auto max-h-[75vh] object-contain rounded-xl mx-auto hover:brightness-95 transition-all" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="bg-slate-950/80 backdrop-blur-md text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg scale-90 group-hover:scale-100 transition-all">
                              <ZoomIn size={14} className="text-[var(--gold)]" /> Click to View Full Screen
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-8">

                      <div className="flex gap-6">
                        <div className="w-32 h-32 border-4 border-slate-100 p-1 rounded-2xl shadow-inner bg-slate-50 relative group">
                          {employee.photo ? (
                            <img src={employee.photo} alt="ID" className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-300 font-bold text-4xl">
                              {employee.firstName[0]}{employee.surname[0]}
                            </div>
                          )}
                          <div className="absolute -bottom-2 -right-2 bg-[var(--gold)] text-[var(--navy)] p-1.5 rounded-lg shadow-lg border border-white/20">
                            <ShieldCheck size={14} />
                          </div>
                        </div>
                        <div className="flex flex-col justify-center">
                          <div className="bg-slate-100 p-2 rounded-lg mb-2 border border-slate-200">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">System ID</div>
                            <div className="font-mono font-bold text-slate-600">EMP-{employee.id.toString().padStart(6, '0')}</div>
                          </div>
                          <div className="bg-slate-100 p-2 rounded-lg border border-slate-200">
                            <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                              <span className="font-black text-[10px] text-emerald-600 uppercase tracking-wider">Active Service</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="italic font-black text-[10px] text-slate-300 tracking-widest mb-2">CS FORM 212 (REVISED 2017)</div>
                        <h1 className="font-playfair font-black text-4xl text-[var(--navy)] mb-2">PERSONAL DATA SHEET</h1>
                        <div className="w-24 h-1 bg-[var(--gold)] ml-auto mb-4"></div>
                        <p className="italic text-[9px] text-slate-400 max-w-[320px] ml-auto leading-relaxed">WARNING: Any misrepresentation made in the Personal Data Sheet and the Work Experience Sheet shall cause the filing of administrative/criminal case/s against the person concerned.</p>
                      </div>
                    </div>
                    
                    {/* I. Personal Information */}
                    <div className="bg-slate-900 text-white font-black italic p-2 border border-black mb-[-1px] text-[10px] tracking-[0.2em] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></div>
                        I. PERSONAL INFORMATION
                      </div>
                      <div className="text-[8px] font-normal opacity-50 tracking-normal">SECURED RECORD #772-B</div>
                    </div>
                    <div className="grid grid-cols-12 border-t border-l border-black">
                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">2. SURNAME</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm tracking-tight bg-white/50">{employee.surname}</div>
                      
                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">FIRST NAME</div>
                      <div className="col-span-7 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm tracking-tight bg-white/50">{employee.firstName}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 flex items-center font-bold text-[9px] uppercase tracking-wider">NAME EXTENSION: <span className="ml-2 font-typewriter font-bold uppercase bg-white border border-black px-2 py-0.5 text-xs">{employee.nameExtension || 'N/A'}</span></div>
                      
                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">MIDDLE NAME</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm tracking-tight bg-white/50">{employee.middleName}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">16. CITIZENSHIP</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.citizenship}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">17. RESIDENTIAL ADDRESS</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase leading-tight bg-white/50">{employee.residentialAddress}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">5. SEX</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.sex}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">ZIP CODE</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.zipCode}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">6. CIVIL STATUS</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.civilStatus}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">18. PERMANENT ADDRESS</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase leading-tight bg-white/50">{employee.permanentAddress}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">7. HEIGHT (m)</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.height}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">ZIP CODE</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.zipCode}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">8. WEIGHT (kg)</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.weight}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">19. TELEPHONE NO.</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.telephone}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">9. BLOOD TYPE</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.bloodType}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">20. MOBILE NO.</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.cellphone}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">10. GSIS ID NO.</div>
                      <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.gsisNo}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">21. E-MAIL ADDRESS</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold text-sm text-blue-600 underline bg-white/50 break-all">{employee.email}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">11. PAG-IBIG ID NO.</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.pagibigNo}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">12. PHILHEALTH NO.</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.philhealthNo}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">13. SSS NO.</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.sssNo}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">14. TIN NO.</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.tin}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">15. AGENCY EMP NO.</div>
                      <div className="col-span-10 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.agencyEmployeeNo}</div>
                    </div>

                    {/* II. Family Background */}
                    <div className="bg-slate-900 text-white font-black italic p-2 border border-black mt-10 mb-[-1px] text-[10px] tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></div>
                      II. FAMILY BACKGROUND
                    </div>
                    <div className="grid grid-cols-12 border-t border-l border-black">
                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">22. SPOUSE'S SURNAME</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-black uppercase text-sm bg-white/50">{employee.spouseSurname}</div>
                      <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 text-center font-bold text-[9px] uppercase tracking-wider">23. NAME of CHILDREN</div>
                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 text-center font-bold text-[9px] uppercase tracking-wider">DATE OF BIRTH</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">FIRST NAME</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-black uppercase text-sm bg-white/50">{employee.spouseFirstName}</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-bold uppercase pl-4 bg-white/50">{employee.children[0]?.name || ''}</div>
                      <div className="col-span-2 border-r border-b border-black p-2 font-bold text-center bg-white/50">{employee.children[0]?.dob || ''}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-55 p-2 font-bold text-[9px] uppercase tracking-wider">MIDDLE NAME</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-black uppercase text-sm bg-white/50">{employee.middleName}</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-bold uppercase pl-4 bg-white/50">{employee.children[1]?.name || ''}</div>
                      <div className="col-span-2 border-r border-b border-black p-2 font-bold text-center bg-white/50">{employee.children[1]?.dob || ''}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">OCCUPATION</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-bold uppercase text-sm bg-white/50">{employee.spouseOccupation}</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-bold uppercase pl-4 bg-white/50">{employee.children[2]?.name || ''}</div>
                      <div className="col-span-2 border-r border-b border-black p-2 font-bold text-center bg-white/50">{employee.children[2]?.dob || ''}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">EMPLOYER/BUSINESS</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-bold uppercase text-sm bg-white/50">{employee.spouseEmployer}</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-bold uppercase pl-4 bg-white/50">{employee.children[3]?.name || ''}</div>
                      <div className="col-span-2 border-r border-b border-black p-2 font-bold text-center bg-white/50">{employee.children[3]?.dob || ''}</div>

                      <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">TELEPHONE NO.</div>
                      <div className="col-span-5 border-r border-b border-black p-2 font-bold uppercase text-sm bg-white/50">{employee.spouseTelephone}</div>
                      <div className="col-span-3 border-r border-b border-black p-2 font-bold uppercase pl-4 bg-white/50">{employee.children[4]?.name || ''}</div>
                      <div className="col-span-2 border-r border-b border-black p-2 font-bold text-center bg-white/50">{employee.children[4]?.dob || ''}</div>
                    </div>

                    {/* III. Educational Background */}
                    <div className="bg-slate-900 text-white font-black italic p-2 border border-black mt-10 mb-[-1px] text-[10px] tracking-[0.2em] flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-[var(--gold)] rounded-full"></div>
                      III. EDUCATIONAL BACKGROUND
                    </div>
                    <table className="w-full border-collapse border border-black text-center">
                      <thead>
                        <tr className="bg-slate-55">
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider w-24">26. LEVEL</th>
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider">NAME OF SCHOOL<br/>(Write in full)</th>
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider">BASIC EDUCATION/DEGREE/COURSE<br/>(Write in full)</th>
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider w-24">PERIOD OF ATTENDANCE<br/><span className="flex justify-between border-t border-black mt-1"><span className="w-1/2 border-r border-black">From</span><span className="w-1/2">To</span></span></th>
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider w-16">YEAR GRADUATED</th>
                          <th className="border border-black p-2 font-bold text-[9px] uppercase tracking-wider w-24">SCHOLARSHIP/ACADEMIC HONORS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Elementary', 'Secondary', 'Vocational/Trade', 'College', 'Graduate Studies'].map(level => {
                          const edu = employee.education.find(e => e.level === level) || { school: '', course: '', from: '', to: '', yearGraduated: '', honors: '' };
                          return (
                            <tr key={level}>
                              <td className="border border-black p-2 bg-slate-50 text-left pl-3 font-bold text-[9px] uppercase tracking-wider">{level}</td>
                              <td className="border border-black p-2 font-black uppercase text-[10px] bg-white/50">{edu.school}</td>
                              <td className="border border-black p-2 font-black uppercase text-[10px] bg-white/50">{edu.course}</td>
                              <td className="border border-black p-0 bg-white/50">
                                <div className="flex h-full">
                                  <div className="w-1/2 border-r border-black p-2 font-bold">{edu.from}</div>
                                  <div className="w-1/2 p-2 font-bold">{edu.to}</div>
                                </div>
                              </td>
                              <td className="border border-black p-2 font-bold bg-white/50">{edu.yearGraduated}</td>
                              <td className="border border-black p-2 font-black uppercase text-[10px] bg-white/50">{edu.honors}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Footer Page Info */}
                    <div className="mt-12 flex justify-between items-end border-t border-slate-100 pt-8">
                      <div className="flex items-center gap-8">
                        {/* Fingerprint Placeholder */}
                        <div className="w-16 h-20 border border-slate-200 rounded-lg flex flex-col items-center justify-center p-1 bg-slate-50/50">
                          <div className="flex-1 w-full opacity-10 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-full h-full fill-current">
                              <path d="M17.81 4.47c-.08 0-.16-.02-.23-.06C15.66 3.42 14 3 12.01 3c-1.98 0-3.86.47-5.57 1.41-.24.13-.54.04-.67-.2-.13-.24-.04-.55.2-.68C7.82 2.52 9.86 2 12.01 2c2.13 0 3.96.46 5.57 1.31.24.13.33.44.2.68-.07.14-.21.22-.36.22zM13 21.66c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28-.22.5-.5.5zM10.5 21.66c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28-.22.5-.5.5zM15.5 21.66c-.28 0-.5-.22-.5-.5v-1c0-.28.22-.5.5-.5s.5.22.5.5v1c0 .28-.22.5-.5.5zM12 18.66c-3.03 0-5.5-2.47-5.5-5.5v-1.5c0-.28.22-.5.5-.5s.5.22.5.5v1.5c0 2.48 2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5v-1.5c0-.28.22-.5.5-.5s.5.22.5.5v1.5c0 3.03-2.47 5.5-5.5 5.5zM12 15.66c-1.38 0-2.5-1.12-2.5-2.5v-1.5c0-.28.22-.5.5-.5s.5.22.5.5v1.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-1.5c0-.28.22-.5.5-.5s.5.22.5.5v1.5c0 1.38-1.12 2.5-2.5 2.5zM12 12.66c-.28 0-.5-.22-.5-.5v-1.5c0-.28.22-.5.5-.5s.5.22.5.5v1.5c0 .28-.22.5-.5.5z"/>
                            </svg>
                          </div>
                          <div className="text-[5px] font-black text-slate-400 uppercase text-center leading-none">Right Thumb Mark</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Page 1 of 1</div>
                        <div className="text-[7px] text-slate-400 italic">Generated by HRIS Command Center v4.0</div>
                      </div>
                    </div>
                      </>
                    )}
                  </motion.div>
                </div>
              )}

              {activeTab === 'sr' && (
                <motion.div 
                  key="sr"
                  id="panel-sr"
                  role="tabpanel"
                  aria-labelledby="tab-sr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="sr-container font-sans text-slate-900 relative z-10 w-full max-w-7xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-10 print:shadow-none print:border-none print:p-0 print:m-0"
                >
                  {/* Title of the sheet like the image */}
                  <div className="text-center mb-6">
                    <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-400 leading-tight">Republic of the Philippines</p>
                    <p className="text-xs uppercase font-extrabold tracking-[0.1em] text-slate-700 leading-normal">MUNICIPALITY OF MAMBUSAO • PROVINCE OF CAPIZ</p>
                    <h2 className="text-2xl font-black text-[var(--navy)] tracking-wide uppercase mt-4 mb-1">file record sheet</h2>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 italic">Official Permanent Service Record</p>
                    <div className="w-16 h-1 bg-[var(--gold)] mx-auto mt-4"></div>
                  </div>

                  {/* Header metadata summary strip */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl mb-6">
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-450 tracking-widest block">Employee Surname</span>
                      <strong className="text-sm font-extrabold text-[var(--navy)] uppercase block">{employee.surname || '—'}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-450 tracking-widest block">Given & Middle Name</span>
                      <strong className="text-sm font-extrabold text-[var(--navy)] uppercase block">{employee.firstName} {employee.middleName || ''}</strong>
                    </div>
                    <div>
                      <span className="text-[8px] uppercase font-black text-slate-450 tracking-widest block">Dossier Account ID</span>
                      <strong className="text-sm font-mono text-slate-650 block">EMP-{employee.id.toString().padStart(6, '0')}</strong>
                    </div>
                  </div>

                  {/* Extra informational stats block for widescreen overview details */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 no-print">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total S.N. Records</div>
                      <div className="text-xl font-black text-slate-800 mt-1">{employee.serviceRecords.length}</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Current Position</div>
                      <div className="text-xs font-bold text-[var(--navy)] leading-tight truncate mt-1.5 uppercase">
                        {employee.serviceRecords[0]?.designation || 'N/A'}
                      </div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-center">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Branch</div>
                      <div className="text-xs font-bold text-slate-600 leading-tight truncate mt-1.5 uppercase">
                        {employee.serviceRecords[0]?.branch || 'LGU'}
                      </div>
                    </div>
                    <div className="p-3 bg-emerald-55/10 rounded-xl border border-emerald-500/20 text-center">
                      <div className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Filing Verified</div>
                      <div className="text-xs font-black text-emerald-650 leading-tight mt-1.5 uppercase tracking-wider">
                        SECURE LOG
                      </div>
                    </div>
                  </div>

                  {/* Certified block */}
                  <p className="text-[10px] text-justify leading-relaxed mb-4 text-slate-650 italic leading-relaxed">
                    This is to certify that the employee named herein has rendered services in this Government Unit as itemized below in chronological sequence, supported by authorized appointments:
                  </p>

                  {/* HIGH RESOLUTION GRID TABLE STYLE IN INSPIRED FROM ATTACHED IMAGE (Visible on LG screens and print) */}
                  <div className="hidden lg:block overflow-x-auto border border-slate-350 rounded-xl shadow-inner bg-slate-50 p-1 print:block">
                    <table className="w-full border-collapse border border-slate-300 text-[10px] leading-relaxed text-center min-w-[950px] bg-white">
                      <thead>
                        <tr className="bg-slate-100 text-slate-800 font-extrabold uppercase border-b border-slate-300">
                          {/* Serial Number columns like in the image */}
                          <th className="border border-slate-300 px-2 py-3 text-[9px] w-12 text-slate-500 font-bold">S.N.</th>
                          <th className="border border-slate-300 px-3 py-3 w-28">inclusive from</th>
                          <th className="border border-slate-300 px-3 py-3 w-28">inclusive to</th>
                          <th className="border border-slate-300 px-3 py-3 text-left">designation / title</th>
                          <th className="border border-slate-300 px-2 py-3 w-24">appointment status</th>
                          <th className="border border-slate-300 px-3 py-3 w-28 text-right">annual salary rate</th>
                          <th className="border border-slate-300 px-3 py-3 text-left">station / place of assignment</th>
                          <th className="border border-slate-300 px-2 py-3 w-24">office branch</th>
                          <th className="border border-slate-300 px-2 py-3 w-20">l/v w/o pay</th>
                          <th className="border border-slate-300 px-2 py-3 w-24">separation date</th>
                          <th className="border border-slate-300 px-3 py-3 text-left">cause of separation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employee.serviceRecords.map((rec, i) => (
                          <tr key={i} className="hover:bg-slate-50/70 border-b border-slate-200 transition-colors">
                            {/* Serial Number Counter */}
                            <td className="border border-slate-300 px-2 py-2.5 font-bold font-mono text-center text-[9px] text-slate-400 bg-slate-50/50">
                              {i + 1}
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                              {rec.from}
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                              {rec.to}
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-left uppercase font-bold text-slate-800 break-words font-sans max-w-[150px]">
                              {rec.designation}
                            </td>
                            <td className="border border-slate-300 px-2 py-2.5 text-center uppercase font-semibold text-slate-600">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                                (rec.status || '').toLowerCase().includes('perm') 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {rec.status || '—'}
                              </span>
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                              {rec.salary}
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-left uppercase font-medium text-slate-650 break-words font-sans max-w-[180px]">
                              {rec.station}
                            </td>
                            <td className="border border-slate-300 px-2 py-2.5 text-center uppercase font-bold text-slate-500 font-sans text-[8.5px]">
                              {rec.branch}
                            </td>
                            <td className="border border-slate-300 px-2 py-2.5 text-center uppercase font-medium text-slate-550 whitespace-nowrap">
                              {rec.lwop || 'None'}
                            </td>
                            <td className="border border-slate-300 px-2 py-2.5 text-center font-mono text-[9px] text-slate-500 whitespace-nowrap">
                              {rec.sepDate || '—'}
                            </td>
                            <td className="border border-slate-300 px-3 py-2.5 text-left uppercase font-medium text-slate-500 break-words font-sans max-w-[130px]">
                              {rec.sepCause || '—'}
                            </td>
                          </tr>
                        ))}
                        {employee.serviceRecords.length === 0 && (
                          <tr>
                            <td colSpan={11} className="border border-slate-300 p-16 text-slate-400 italic text-sm text-center">
                              No service records found in official database.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* MOBILE-OPTIMIZED CARD VIEW (Visible on mobile/tablet, hidden on LG/print) */}
                  <div className="lg:hidden space-y-4 print:hidden">
                    {employee.serviceRecords.map((rec, i) => (
                      <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-200 shadow-sm relative">
                        <div className="absolute top-4 right-4 bg-[var(--gold)] text-[var(--navy)] text-[10px] font-black uppercase px-2 py-1 rounded-lg">
                          S.N. {i + 1}
                        </div>
                        <h4 className="font-sans font-bold text-slate-800 text-sm uppercase mb-2 pr-12">{rec.designation || 'Untitled Position'}</h4>
                        
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">From</span>
                            <span className="font-semibold text-slate-700">{rec.from || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">To</span>
                            <span className="font-semibold text-slate-700">{rec.to || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Status</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                              (rec.status || '').toLowerCase().includes('perm') 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>{rec.status || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Salary</span>
                            <span className="font-bold text-[var(--green)] font-mono">{rec.salary || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Station</span>
                            <span className="font-medium text-slate-600">{rec.station || '—'}</span>
                          </div>
                          <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Branch</span>
                            <span className="font-bold text-slate-500">{rec.branch || '—'}</span>
                          </div>
                          {rec.lwop && (
                            <div>
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">L/V W/O Pay</span>
                              <span className="text-slate-600">{rec.lwop}</span>
                            </div>
                          )}
                          {(rec.sepDate || rec.sepCause) && (
                            <div className="col-span-2 border-t border-slate-200/50 pt-2 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Separation Detail</span>
                              <span className="text-slate-600 font-medium">{rec.sepDate ? `${rec.sepDate} (${rec.sepCause || 'No cause'})` : rec.sepCause}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {employee.serviceRecords.length === 0 && (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-400 italic text-sm">
                        No service records found in official database.
                      </div>
                    )}
                  </div>


                </motion.div>
              )}

              {activeTab === 'docs' && (
                <motion.div 
                  key="docs"
                  id="panel-docs"
                  role="tabpanel"
                  aria-labelledby="tab-docs"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="docs-container font-sans text-slate-900 relative z-10 w-full max-w-7xl mx-auto bg-white border border-slate-200 shadow-2xl rounded-3xl p-6 md:p-10 print:shadow-none print:border-none"
                >
                  {previewDoc && <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
                  <div className="text-center mb-8 relative">
                    <h2 className="font-playfair font-black text-3xl mt-2 mb-2 text-[var(--navy)] tracking-tight">SCANNED DOCUMENTS GALLERY</h2>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Official Personnel Scans & Dossier Attachments</p>
                    <div className="w-24 h-1 bg-[var(--gold)] mx-auto mt-4"></div>
                    <div className="absolute top-0 right-0">
                      <button
                        onClick={() => onEdit(employee, 'attachments')}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-edit-2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                        Edit / Manage
                      </button>
                    </div>
                  </div>

                  {driveError && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                      <X size={16} />
                      {driveError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {employee.pdsScan && (
                      <div className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                            {employee.pdsScan.startsWith('data:image/') ? (
                              <>
                                <img src={employee.pdsScan} alt="Personal Data Sheet Scan" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button
                                    onClick={() => setIsFullScreenPds(true)}
                                    type="button"
                                    className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
                                    title="View full PDS scan"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-indigo-500 relative group">
                                <FileText size={48} className="text-indigo-400 mb-2" />
                                <span className="text-[10px] font-bold uppercase">PDF Document</span>
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <a
                                    href={employee.pdsScan}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
                                    title="View PDF"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
                                  </a>
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <h3 className="font-sans font-black text-slate-800 text-base uppercase tracking-tight truncate mb-1">Personal Data Sheet (PDS)</h3>
                          <p className="text-xs text-slate-400 truncate mb-2">pds_scan_file.png</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[10px] text-slate-400 font-mono text-[9px]">Official Upload</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleRemovePdsScan}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete PDS Scan"
                            >
                              <Trash2 size={16} />
                            </button>
                            <a
                              href={employee.pdsScan}
                              download={`${employee.surname}_PDS_Scan.png`}
                              className="flex items-center gap-2 px-3 py-1.5 bg-[var(--gold)] text-[var(--navy)] hover:bg-opacity-90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                              <Download size={12} /> Download
                            </a>
                          </div>
                        </div>
                      </div>
                    )}

                    {(employee.attachments || []).map((doc) => (
                      <div key={doc.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                            {doc.driveFileId ? (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110 mb-2"
                                  title="Preview document"
                                >
                                  <Eye size={20} />
                                </button>
                                <Cloud size={48} className="text-indigo-600 mb-2 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Stored on Google Drive</span>
                                {doc.driveWebViewLink && (
                                  <a
                                    href={doc.driveWebViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                                  >
                                    <ExternalLink size={10} /> View in Drive
                                  </a>
                                )}
                              </div>
                            ) : doc.fileType.startsWith('image/') ? (
                              <>
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
                                  title="Preview document"
                                >
                                  <Eye size={20} />
                                </button>
                                {!doc.driveFileId && (
                                  <a
                                    href={doc.fileData}
                                    download={doc.fileName}
                                    className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
                                    title="Download file"
                                  >
                                    <Download size={20} />
                                  </a>
                                )}
                              </div>
                              </>
                            ) : (
                              <FileText size={48} className="text-indigo-400" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="font-sans font-black text-slate-800 text-base uppercase tracking-tight truncate">{doc.name}</h3>
                            {doc.driveFileId && (
                              <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black uppercase tracking-widest rounded-full flex items-center gap-1 shrink-0">
                                <Cloud size={8} /> Google Drive
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 truncate mb-2">{doc.fileName}</p>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-mono text-[9px]">Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                            {doc.driveFileId && (
                              <span className="text-[9px] text-indigo-500 font-bold flex items-center gap-1 mt-0.5">
                                <Cloud size={10} /> Cloud Secure
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteAttachment(doc.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete document"
                            >
                              <Trash2 size={16} />
                            </button>
                            {doc.driveFileId ? (
                              <button
                                type="button"
                                onClick={() => handleDownloadDriveFile(doc)}
                                disabled={downloadingFileId === doc.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                              >
                                {downloadingFileId === doc.id ? (
                                  <>
                                    <Loader2 size={12} className="animate-spin" /> Retrieving...
                                  </>
                                ) : (
                                  <>
                                    <Download size={12} /> Retrieve
                                  </>
                                )}
                              </button>
                            ) : (
                              <a
                                href={doc.fileData}
                                download={doc.fileName}
                                className="flex items-center gap-2 px-3 py-1.5 bg-[var(--gold)] text-[var(--navy)] hover:bg-opacity-90 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                              >
                                <Download size={12} /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {(employee.attachments || []).length === 0 && !employee.pdsScan && (
                      <div className="col-span-full border-2 border-dashed border-slate-300 rounded-2xl p-16 text-center text-slate-400 w-full bg-slate-50">
                        <FileText size={48} className="mx-auto mb-4 opacity-30 text-slate-500" />
                        <h4 className="font-sans font-bold text-lg mb-1">No scanned files attached</h4>
                        <p className="font-sans text-xs max-w-sm mx-auto text-slate-500">This dossier currently does not contain any scanned certificates, credentials, or administrative document attachments.</p>
                        <button
                          type="button"
                          onClick={() => onEdit(employee, 'attachments')}
                          className="mt-6 px-6 py-2.5 bg-[var(--navy)] text-[var(--gold)] text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-opacity-95 transition-all border border-white/10 shadow-md"
                        >
                          Modify & Upload Now
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>

      {/* PRINT-ONLY DOSSIER VIEW */}
      <div className="hidden print:block w-full bg-white text-black p-8">
        <div className="w-full">
          {/* Title block */}
          <div className="text-center mb-6">
            <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-500 leading-tight">Republic of the Philippines</p>
            <p className="text-xs uppercase font-extrabold tracking-[0.1em] text-slate-700 leading-normal">MUNICIPALITY OF MAMBUSAO • PROVINCE OF CAPIZ</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase mt-4 mb-1">file record sheet</h2>
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 italic">Official Permanent Service Record</p>
            <div className="w-16 h-1 bg-slate-900 mx-auto mt-4"></div>
          </div>

          {/* Header metadata summary strip */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-300 rounded-2xl mb-6 text-left">
            <div>
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Employee Surname</span>
              <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.surname || '—'}</strong>
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Given & Middle Name</span>
              <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.firstName} {employee.middleName || ''}</strong>
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Dossier Account ID</span>
              <strong className="text-sm font-mono text-slate-600 block">EMP-{employee.id.toString().padStart(6, '0')}</strong>
            </div>
          </div>

          <p className="text-[10px] text-justify leading-relaxed mb-4 text-slate-600 italic">
            This is to certify that the employee named herein has rendered services in this Government Unit as itemized below in chronological sequence, supported by authorized appointments:
          </p>

          {/* Records Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden">
            <table className="w-full border-collapse border border-slate-300 text-[10px] leading-normal text-center bg-white">
              <thead>
                <tr className="bg-slate-50 text-slate-850 font-extrabold uppercase border-b border-slate-300">
                  <th className="border border-slate-300 px-2 py-2 text-[9px] w-12 text-slate-500 font-bold">S.N.</th>
                  <th className="border border-slate-300 px-2 py-2 w-24">inclusive from</th>
                  <th className="border border-slate-300 px-2 py-2 w-24">inclusive to</th>
                  <th className="border border-slate-300 px-2 py-2 text-left">designation / title</th>
                  <th className="border border-slate-300 px-2 py-2 w-24">appointment status</th>
                  <th className="border border-slate-300 px-2 py-2 text-right">annual salary rate</th>
                  <th className="border border-slate-300 px-2 py-2 text-left">station / place of assignment</th>
                  <th className="border border-slate-300 px-2 py-2 w-20">office branch</th>
                  <th className="border border-slate-300 px-2 py-2 w-16">l/v w/o pay</th>
                  <th className="border border-slate-300 px-2 py-2 w-20">separation date</th>
                  <th className="border border-slate-300 px-2 py-2 text-left">cause of separation</th>
                </tr>
              </thead>
              <tbody>
                {employee.serviceRecords.map((rec, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="border border-slate-300 px-2 py-2 font-bold font-mono text-center text-[9px] text-slate-400 bg-slate-50/50">
                      {i + 1}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                      {rec.from}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                      {rec.to}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-left uppercase font-bold text-slate-800 break-words font-sans max-w-[150px]">
                      {rec.designation}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center uppercase font-semibold text-slate-605 text-[8.5px]">
                      {rec.status}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                      {rec.salary}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-left uppercase font-medium text-slate-600 break-words font-sans max-w-[180px]">
                      {rec.station}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center uppercase font-bold text-slate-500 font-sans text-[8.5px]">
                      {rec.branch}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center uppercase font-medium text-slate-550 whitespace-nowrap">
                      {rec.lwop || 'None'}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] text-slate-500 whitespace-nowrap">
                      {rec.sepDate || '—'}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 text-left uppercase font-medium text-slate-550 break-words font-sans max-w-[130px]">
                      {rec.sepCause || '—'}
                    </td>
                  </tr>
                ))}
                {employee.serviceRecords.length === 0 && (
                  <tr>
                    <td colSpan={11} className="border border-slate-300 p-8 text-slate-400 italic text-xs text-center">
                      No service records found in official database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Scanned PDS image if exists */}
        {employee.pdsScan && (
          <div className="p-4 flex flex-col items-center justify-center min-h-screen text-center" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">Scanned Personal Data Sheet (PDS)</h3>
            <p className="text-[9px] text-slate-400 mb-4">Official Document Scan of {employee.firstName} {employee.surname}</p>
            {employee.pdsScan.startsWith('data:image/') ? (
              <img src={employee.pdsScan} alt="PDS Scan Image" className="max-w-full max-h-[85vh] object-contain border border-slate-300 shadow-sm" />
            ) : (
              <div className="p-12 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center text-slate-400 bg-slate-50">
                <FileText size={48} className="mb-4 text-slate-300" />
                <span className="font-bold uppercase tracking-wider text-sm">PDF Document Attached</span>
                <span className="text-[10px] mt-2">Open the application to view the full PDF.</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Scanned Docs Scans (Attachments) if exist */}
        {(employee.attachments || []).map((doc) => {
          if (doc.fileData && doc.fileData.startsWith('data:image/')) {
            return (
              <div key={doc.id} className="p-4 flex flex-col items-center justify-center min-h-screen text-center" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">{doc.name}</h3>
                <p className="text-[9px] text-slate-400 mb-4">Scanned Attachment: {doc.fileName}</p>
                <img src={doc.fileData} alt={doc.name} className="max-w-full max-h-[85vh] object-contain border border-slate-300 shadow-sm" />
              </div>
            );
          }
          return null;
        })}
      </div>

      {/* FULLSCREEN LIGHTBOX PORTAL */}
      <AnimatePresence>
        {isFullScreenPds && employee.pdsScan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-lg p-6 flex flex-col justify-between items-center"
          >
            <div className="w-full flex justify-between items-center text-white select-none">
              <div className="flex flex-col">
                <h2 className="font-playfair text-xl font-bold">{employee.surname}, {employee.firstName}</h2>
                <p className="text-[9px] font-bold tracking-widest uppercase text-slate-400">Personal Data Sheet Worksheet Scan</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={employee.pdsScan}
                  download={employee.pdsScan.startsWith('data:image/') ? `${employee.surname}_PDS_Scan.png` : `${employee.surname}_PDS_Scan.pdf`}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[var(--gold)] text-[var(--navy)] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-opacity-95 transition-all shadow-md shadow-gold/10"
                >
                  <Download size={14} /> Download
                </a>
                <button
                  onClick={() => setIsFullScreenPds(false)}
                  className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors border border-white/10"
                  aria-label="Close full screen"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="flex-1 w-full flex items-center justify-center p-4 min-h-0 overflow-auto">
              {employee.pdsScan.startsWith('data:image/') ? (
                <img 
                  src={employee.pdsScan} 
                  alt="Full size Personal Data Sheet scan" 
                  className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/10"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <iframe 
                  src={employee.pdsScan} 
                  title="Full size Personal Data Sheet scan" 
                  className="w-full h-[85vh] rounded-xl shadow-2xl border border-white/10"
                />
              )}
            </div>
            
            <div className="text-center text-[10px] font-mono text-slate-500 uppercase tracking-wider select-none">
              Personnel Records Vault • Secure PDS Dossier
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

