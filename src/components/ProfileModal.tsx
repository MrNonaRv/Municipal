import React, { useState, useEffect } from 'react';
import { Employee, Attachment } from '../types/employee';
import { Printer, Edit, Trash2, X, FileText, History, Users, ShieldCheck, MapPin, Phone, Mail, Calendar, Download, ArrowLeft, FileUp, Eye, ZoomIn, Cloud, Loader2, ExternalLink, Calculator, AlertTriangle } from 'lucide-react';
import NOSAModal from './NOSAModal';
import { motion, AnimatePresence } from 'motion/react';
import { downloadFileFromDrive as downloadFileFromGDrive, deleteFileFromDrive } from '../services/driveStorage';
import { PreviewModal } from './PreviewModal';

interface Props {
  employee: Employee;
  onClose: () => void;
  onEdit: (emp: Employee, tab?: 'service' | 'attachments') => void;
  onDelete: (emp: Employee) => void;
  onSave?: (emp: Employee) => void;
}


const DocumentThumbnail = ({ doc, onPreview }: { doc: Attachment; onPreview: (doc: Attachment) => void }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doc.driveFileId) return;
    if (!doc.fileData || doc.fileType !== 'application/pdf') return;
    
    let active = true;
    fetch(doc.fileData)
      .then(res => res.blob())
      .then(blob => {
        if (active) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(e => console.error(e));

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [doc]);

  return (
    <>
      {doc.driveFileId ? (
        <iframe src={`https://drive.google.com/file/d/${doc.driveFileId}/preview`} className="w-full h-full object-cover pointer-events-none" title={doc.name} />
      ) : doc.fileType.startsWith('image/') && doc.fileData ? (
        <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" referrerPolicy="no-referrer" />
      ) : doc.fileType === 'application/pdf' && blobUrl ? (
        <iframe src={`${blobUrl}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full object-cover pointer-events-none border-0" title={doc.name} />
      ) : (
        <FileText size={48} className="text-slate-300" />
      )}
      
      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        <button
          onClick={(e) => { e.stopPropagation(); onPreview(doc); }}
          className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
          title="Preview document"
        >
          <Eye size={20} />
        </button>
        {!doc.driveFileId && (
          <a
            href={doc.fileData}
            download={doc.fileName}
            onClick={(e) => e.stopPropagation()}
            className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110"
            title="Download file"
          >
            <Download size={20} />
          </a>
        )}
      </div>
    </>
  );
};

export default function ProfileModal({ employee, onClose, onEdit, onDelete, onSave }: Props) {
  const [activeTab, setActiveTab] = useState<'sr' | 'docs'>('sr');
  const [showDigitalPds, setShowDigitalPds] = useState<boolean>(!employee.pdsScan);
  const [showNosa, setShowNosa] = useState<boolean>(false);
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

  const handleDeleteAttachment = async (id: string) => {
    if (!onSave) return;
    if (confirm('Are you sure you want to delete this scanned document? This action cannot be undone.')) {
      const docToRemove = employee.attachments?.find(a => a.id === id);
      if (docToRemove?.driveFileId) {
        try {
          await deleteFileFromDrive(docToRemove.driveFileId);
        } catch (err) {
          console.error('Failed to delete from GDrive:', err);
        }
      }
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
                {employee.surname}, {employee.firstName} {employee.middleName ? employee.middleName.charAt(0) + "." : ""} {employee.nameExtension || ""}
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
              onClick={() => setShowNosa(true)} 
              aria-label="Generate NOSA"
              className="flex items-center gap-2 p-2.5 md:px-5 md:py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-blue-500/20 group"
            >
              <Calculator size={14} className="group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">NOSA</span>
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
                            {activeTab === 'sr' && (
                <motion.div 
                  key="sr"
                  id="panel-sr"
                  role="tabpanel"
                  aria-labelledby="tab-sr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-12 relative z-10"
                >
                  <div className="w-full text-black">
                    <div className="flex justify-between items-start mb-8">
                      <div className="w-20 h-20 md:w-24 md:h-24 hidden sm:block invisible"></div> {/* Spacer */}
                      <div className="text-center flex-1">
                        <p className="text-[10px] md:text-xs uppercase font-bold tracking-[0.25em] text-slate-400 leading-tight">Republic of the Philippines</p>
                        <p className="text-xs md:text-sm uppercase font-extrabold tracking-[0.1em] text-slate-600 leading-normal">MUNICIPALITY OF MAMBUSAO • PROVINCE OF CAPIZ</p>
                        <h2 className="text-3xl md:text-4xl font-playfair font-black text-slate-900 tracking-wide mt-4 mb-2">FILE RECORD SHEET</h2>
                        <p className="text-[10px] md:text-xs uppercase tracking-wider font-bold text-slate-400 italic">Official Permanent Service Record</p>
                        <div className="w-24 h-1 bg-[var(--gold)] mx-auto mt-4"></div>
                      </div>
                      <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-slate-900 shrink-0 bg-white p-0.5 shadow-sm hidden sm:block rounded-md overflow-hidden">
                        {employee.photo ? (
                          <img src={employee.photo} alt="Employee Photo" className="w-full h-full object-cover rounded-sm" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex items-center justify-center text-center rounded-sm">
                            <span className="text-[6px] md:text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Attach<br/>Photo</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Header metadata summary strip */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white border border-slate-200 rounded-2xl mb-4 text-left shadow-sm">
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest block mb-1">Employee Surname</span>
                        <strong className="text-base font-extrabold text-slate-900 uppercase block">{employee.surname || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest block mb-1">Given & Middle Name</span>
                        <strong className="text-base font-extrabold text-slate-900 uppercase block">{employee.firstName} {employee.middleName || ''} {employee.nameExtension || ''}</strong>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-black text-slate-500 tracking-widest block mb-1">Dossier Account ID</span>
                        <strong className="text-base font-mono text-slate-900 font-bold block">EMP-{employee.id.toString().padStart(3, '0')}</strong>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                        <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-2">Total S.N. Records</span>
                        <strong className="text-xl font-black text-slate-900 block">{(employee.serviceRecords || []).length}</strong>
                      </div>
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                        <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-2">Current Position</span>
                        <strong className="text-sm font-black text-slate-900 block truncate">{(employee.serviceRecords || []).length > 0 ? employee.serviceRecords[0].designation : '—'}</strong>
                      </div>
                      <div className="p-4 bg-white border border-slate-200 rounded-2xl text-center shadow-sm">
                        <span className="text-[8px] uppercase font-black text-slate-400 tracking-widest block mb-2">Active Branch</span>
                        <strong className="text-sm font-black text-slate-900 block truncate">{(employee.serviceRecords || []).length > 0 ? employee.serviceRecords[0].branch : '—'}</strong>
                      </div>
                      <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl text-center shadow-sm">
                        <span className="text-[8px] uppercase font-black text-emerald-600 tracking-widest block mb-2">Filing Verified</span>
                        <strong className="text-sm font-black text-emerald-700 block">SECURE LOG</strong>
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
                          {(employee.serviceRecords || []).map((rec, i) => (
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
                                {rec.station || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center uppercase font-medium text-slate-600 break-words font-sans max-w-[120px]">
                                {rec.branch || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-500">
                                {rec.lwop || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                                {rec.sepDate || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-left uppercase font-medium text-slate-550 break-words font-sans max-w-[130px]">
                                {rec.sepCause || '—'}
                              </td>
                            </tr>
                          ))}
                          {(employee.serviceRecords || []).length === 0 && (
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
                </motion.div>
              )}
              {activeTab === 'docs' && (
                <div className="w-full max-w-6xl mx-auto bg-white rounded-3xl shadow-xl p-6 md:p-12 relative z-10">
                  <motion.div 
                    key="pds"
                    id="panel-pds"
                    role="tabpanel"
                    aria-labelledby="tab-pds"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="w-full"
                  >
                    <div className="relative mb-8 pb-4 border-b border-slate-200">
                      <div className="flex justify-between items-start">
                        <div className="w-16 h-16 md:w-20 md:h-20 hidden sm:block invisible"></div> {/* Spacer */}
                        <div className="text-center flex-1">
                          <h2 className="font-playfair font-black text-2xl md:text-3xl mt-2 mb-2 text-[var(--navy)] tracking-tight">SCANNED DOCUMENTS GALLERY</h2>
                          <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-slate-400">Official Personnel Scans & Dossier Attachments</p>
                          <div className="w-16 h-1 bg-[var(--gold)] mx-auto mt-4"></div>
                        </div>
                        <div className="w-16 h-16 md:w-20 md:h-20 border-2 border-slate-900 shrink-0 bg-white p-0.5 shadow-sm hidden sm:block rounded-md overflow-hidden">
                          {employee.photo ? (
                            <img src={employee.photo} alt="Employee Photo" className="w-full h-full object-cover rounded-sm" />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex items-center justify-center text-center rounded-sm">
                              <span className="text-[6px] md:text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-tight">Attach<br/>Photo</span>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>
                    {driveError && (
                      <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs font-bold uppercase tracking-wider flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} />
                          <span>{driveError}</span>
                        </div>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('gers_open_drive_settings'))}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-sm whitespace-nowrap"
                        >
                          Reconnect Drive
                        </button>
                      </div>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                    {(employee.attachments || []).map((doc) => (
                      <div key={doc.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                            <DocumentThumbnail doc={doc} onPreview={setPreviewDoc} />
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
                    {(employee.attachments || []).length === 0 && (
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
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </motion.div>

      {/* PRINT-ONLY DOSSIER VIEW */}
      <div className={`hidden ${!showNosa ? 'print:block' : ''} w-full bg-white text-black p-8`}>
        <div className="w-full">
          {/* Title block */}
          <div className="flex justify-between items-start mb-6">
            <div className="w-[1.5in] h-[1.5in] invisible"></div> {/* Spacer for centering */}
            <div className="text-center flex-1">
              <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-500 leading-tight">Republic of the Philippines</p>
              <p className="text-xs uppercase font-extrabold tracking-[0.1em] text-slate-700 leading-normal">MUNICIPALITY OF MAMBUSAO • PROVINCE OF CAPIZ</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase mt-4 mb-1">file record sheet</h2>
              <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 italic">Official Permanent Service Record</p>
              <div className="w-16 h-1 bg-slate-900 mx-auto mt-4"></div>
            </div>
            <div className="w-[1.5in] h-[1.5in] border-2 border-slate-900 shrink-0 bg-white p-1">
              {employee.photo ? (
                <img src={employee.photo} alt="Employee Photo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-center">
                  <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Attach<br/>2x2<br/>Photo</span>
                </div>
              )}
            </div>
          </div>

          {/* Header metadata summary strip */}
          <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-300 rounded-2xl mb-6 text-left">
            <div>
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Employee Surname</span>
              <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.surname || '—'}</strong>
            </div>
            <div>
              <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Given & Middle Name</span>
              <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.firstName} {employee.middleName || ''} {employee.nameExtension || ''}</strong>
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
                {(employee.serviceRecords || []).map((rec, i) => (
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
                {(employee.serviceRecords || []).length === 0 && (
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
          <div className="p-4 flex flex-col items-center justify-center min-h-[90vh] text-center no-print-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">Scanned Personal Data Sheet (PDS)</h3>
            <p className="text-[9px] text-slate-400 mb-4">Official Document Scan of {employee.firstName} {employee.surname}</p>
            {employee.pdsScan.startsWith('data:image/') ? (
              <img src={employee.pdsScan} alt="PDS Scan Image" className="max-w-full h-auto max-h-[85vh] object-contain border border-slate-300 shadow-sm" />
            ) : employee.pdsScan.startsWith('data:application/pdf') ? (
              <iframe src={employee.pdsScan} className="w-full h-[85vh] border border-slate-300 shadow-sm" title="PDS Scan" />
            ) : (
              <div className="p-12 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center text-slate-400 bg-slate-50">
                <FileText size={48} className="mb-4 text-slate-300" />
                <span className="font-bold uppercase tracking-wider text-sm">Unsupported Document Format</span>
                <span className="text-[10px] mt-2">Download the file to view.</span>
              </div>
            )}
          </div>
        )}

        {/* Additional Scanned Docs Scans (Attachments) if exist */}
        {(employee.attachments || []).map((doc) => {
          return (
            <div key={doc.id} className="p-4 flex flex-col items-center justify-center min-h-[90vh] text-center no-print-break" style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-1 text-slate-700">{doc.name}</h3>
              <p className="text-[9px] text-slate-400 mb-4">Scanned Attachment: {doc.fileName}</p>
              
              {doc.fileType.startsWith('image/') ? (
                <img src={doc.fileData || doc.driveWebContentLink || doc.driveWebViewLink} alt={doc.name} className="w-full h-auto max-h-[85vh] object-contain border border-slate-300 shadow-sm" referrerPolicy="no-referrer" />
              ) : doc.fileType === 'application/pdf' || doc.driveWebViewLink ? (
                <iframe 
                  src={doc.driveWebViewLink ? doc.driveWebViewLink.replace('/view', '/preview') : doc.fileData} 
                  className="w-full h-[85vh] border border-slate-300 shadow-sm" 
                  title={doc.name} 
                />
              ) : (
                <div className="p-12 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center text-slate-400 bg-slate-50">
                  <FileText size={48} className="mb-4 text-slate-300" />
                  <span className="font-bold uppercase tracking-wider text-sm">Preview Not Supported</span>
                  <span className="text-[10px] mt-2">Download the file to view.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FULLSCREEN LIGHTBOX PORTAL */}
      <AnimatePresence>
        {showNosa && <NOSAModal employee={employee} onClose={() => setShowNosa(false)} onSave={onSave} />}
        {isFullScreenPds && employee.pdsScan && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-lg p-6 flex flex-col justify-between items-center"
          >
            <div className="w-full flex justify-between items-center text-white select-none">
              <div className="flex flex-col">
                <h2 className="font-playfair text-xl font-bold">{employee.surname}, {employee.firstName} {employee.middleName ? employee.middleName.charAt(0) + "." : ""} {employee.nameExtension || ""}</h2>
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

      {/* Document Preview Overlay */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex flex-col p-2 md:p-6"
          >
            <div className="flex items-center justify-between mb-4 bg-slate-800 p-3 md:p-4 rounded-xl shadow-lg border border-slate-700 shrink-0">
              <div className="flex items-center gap-3 overflow-hidden">
                <FileText size={20} className="text-emerald-400 shrink-0" />
                <h3 className="text-white font-bold text-sm md:text-base truncate">{previewDoc.name}</h3>
                <span className="hidden sm:inline px-2 py-0.5 bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest rounded-md shrink-0">
                  {previewDoc.fileName}
                </span>
              </div>
              <button 
                onClick={() => setPreviewDoc(null)}
                className="p-2 bg-slate-700 hover:bg-red-500 text-white rounded-lg transition-colors shrink-0 flex items-center gap-2 shadow-sm"
              >
                <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Close</span>
                <X size={16} />
              </button>
            </div>
            
            <div className="flex-1 w-full bg-black/50 rounded-xl overflow-hidden border border-slate-700 relative flex items-center justify-center">
              {previewDoc.driveFileId ? (
                <iframe src={`https://drive.google.com/file/d/${previewDoc.driveFileId}/preview`} className="w-full h-full border-0" title={previewDoc.name} />
              ) : previewDoc.fileType.startsWith('image/') ? (
                <img src={previewDoc.fileData} alt={previewDoc.name} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              ) : previewDoc.fileType === 'application/pdf' ? (
                <iframe src={previewDoc.fileData} className="w-full h-full border-0 bg-white" title={previewDoc.name} />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                  <FileText size={64} className="mb-4 opacity-50" />
                  <p className="font-bold text-lg text-white mb-2">Preview Not Available</p>
                  <p className="text-sm">Please download the file to view it.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

