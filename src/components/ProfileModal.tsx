import React, { useState } from 'react';
import { Employee } from '../types/employee';
import { Printer, Edit, Trash2, X, FileText, History, Users, ShieldCheck, MapPin, Phone, Mail, Calendar, Download, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  employee: Employee;
  onClose: () => void;
  onEdit: (emp: Employee, tab?: 'personal' | 'service') => void;
  onDelete: (emp: Employee) => void;
}

export default function ProfileModal({ employee, onClose, onEdit, onDelete }: Props) {
  const [activeTab, setActiveTab] = useState<'pds' | 'sr'>('pds');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 print:block print:static print:bg-white print:p-0" role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 40 }}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-[1200px] max-h-[95vh] flex flex-col overflow-hidden print:block print:overflow-visible print:max-w-none print:max-h-none print:shadow-none print:rounded-none border border-white/20"
      >
        
        {/* Header - Hidden on print */}
        <div className="p-6 bg-slate-950 text-white flex flex-wrap gap-6 justify-between items-center no-print border-b border-white/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-10%] w-[40%] h-[200%] bg-gradient-to-r from-transparent via-white to-transparent rotate-45 animate-[shimmer_10s_infinite]"></div>
          </div>

          <div className="flex items-center gap-8 relative z-10">
            <button 
              onClick={onClose} 
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
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
            
            <div className="h-10 w-px bg-white/10 hidden md:block"></div>

            <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5" role="tablist" aria-label="Dossier sections">
              <button 
                role="tab" 
                id="tab-pds"
                aria-controls="panel-pds"
                aria-selected={activeTab === 'pds'} 
                onClick={() => setActiveTab('pds')} 
                className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'pds' ? 'bg-[var(--gold)] text-[var(--navy)] shadow-lg shadow-gold/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <FileText size={14} />
                Dossier (PDS)
              </button>
              <button 
                role="tab" 
                id="tab-sr"
                aria-controls="panel-sr"
                aria-selected={activeTab === 'sr'} 
                onClick={() => setActiveTab('sr')} 
                className={`flex items-center gap-2 px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'sr' ? 'bg-[var(--gold)] text-[var(--navy)] shadow-lg shadow-gold/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <History size={14} />
                Service History
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button 
              onClick={handleExport} 
              aria-label="Export record as JSON"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-emerald-500/20 group"
            >
              <Download size={14} className="group-hover:scale-110 transition-transform" /> Export
            </button>
            <button 
              onClick={handlePrint} 
              aria-label="Print record"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
            >
              <Printer size={14} className="group-hover:scale-110 transition-transform" /> Print
            </button>
            <button 
              onClick={() => onEdit(employee, activeTab === 'sr' ? 'service' : 'personal')} 
              aria-label="Edit record"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10 group"
            >
              <Edit size={14} className="group-hover:scale-110 transition-transform" /> Modify
            </button>
            <button 
              onClick={() => onDelete(employee)} 
              aria-label="Delete record"
              className="flex items-center gap-2 px-5 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-red-500/20 group"
            >
              <Trash2 size={14} className="group-hover:scale-110 transition-transform" /> Purge
            </button>
            <div className="w-px h-8 bg-white/10 mx-2"></div>
            <button onClick={onClose} aria-label="Close dossier" className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-200 p-12 print:block print:p-0 print:bg-white print:overflow-visible custom-scrollbar relative">
          
          {/* Document Container */}
          <div className="paper-texture mx-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] print:shadow-none relative rounded-sm overflow-hidden" style={{ width: '210mm', minHeight: '297mm', padding: '20mm' }}>
            
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

            <AnimatePresence mode="wait">
              {activeTab === 'pds' ? (
                <motion.div 
                  key="pds"
                  id="panel-pds"
                  role="tabpanel"
                  aria-labelledby="tab-pds"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="pds-container text-[11px] leading-tight font-sans text-black relative z-10"
                >
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

                    <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">3. DATE OF BIRTH</div>
                    <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold text-sm bg-white/50">{employee.dateOfBirth}</div>
                    <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">16. CITIZENSHIP</div>
                    <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.citizenship}</div>

                    <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">4. PLACE OF BIRTH</div>
                    <div className="col-span-4 border-r border-b border-black p-2 font-typewriter font-bold uppercase text-sm bg-white/50">{employee.placeOfBirth}</div>
                    <div className="col-span-3 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">17. RESIDENTIAL ADDRESS</div>
                    <div className="col-span-3 border-r border-b border-black p-2 font-typewriter font-bold uppercase leading-tight bg-white/50">{employee.residentialAddress}</div>

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

                    <div className="col-span-2 border-r border-b border-black bg-slate-50 p-2 font-bold text-[9px] uppercase tracking-wider">MIDDLE NAME</div>
                    <div className="col-span-5 border-r border-b border-black p-2 font-black uppercase text-sm bg-white/50">{employee.spouseMiddleName}</div>
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
                      <tr className="bg-slate-50">
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
                </motion.div>
              ) : (
                <motion.div 
                  key="sr"
                  id="panel-sr"
                  role="tabpanel"
                  aria-labelledby="tab-sr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="sr-container font-serif text-black relative z-10"
                >
                  <div className="text-center mb-12">
                    <div className="flex justify-center mb-6">
                      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center border-2 border-slate-200 shadow-inner">
                        <ShieldCheck size={40} className="text-[var(--gold)]" />
                      </div>
                    </div>
                    <h3 className="font-black text-xl leading-tight uppercase tracking-[0.3em] text-slate-800">Republic of the Philippines</h3>
                    <h4 className="text-lg leading-tight text-slate-500 font-medium">Province of Capiz</h4>
                    <h4 className="text-lg leading-tight text-slate-500 font-medium">Municipality of Mambusao</h4>
                    <div className="w-32 h-1 bg-[var(--gold)] mx-auto my-8"></div>
                    <h2 className="font-playfair font-black text-5xl mt-4 mb-3 text-[var(--navy)] tracking-tight">SERVICE RECORD</h2>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">(To be accomplished by Employer)</p>
                  </div>

                  <div className="grid grid-cols-2 gap-12 mb-12 text-base">
                    <div className="border-b-2 border-slate-100 pb-3">
                      <span className="font-black text-slate-300 uppercase text-[10px] tracking-[0.2em] block mb-2">Employee Name</span>
                      <span className="uppercase font-black text-2xl text-slate-900">{employee.surname}, {employee.firstName} {employee.middleName}</span>
                    </div>
                    <div className="border-b-2 border-slate-100 pb-3">
                      <span className="font-black text-slate-300 uppercase text-[10px] tracking-[0.2em] block mb-2">Date of Birth</span>
                      <span className="font-black text-2xl text-slate-900">{employee.dateOfBirth}</span>
                    </div>
                  </div>

                  <div className="mb-12 p-8 bg-slate-50 rounded-[2rem] border-l-[12px] border-[var(--gold)] italic text-lg text-justify text-slate-700 leading-relaxed shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5">
                      <ShieldCheck size={120} />
                    </div>
                    This is to certify that the employee named herein above actually rendered services in this Office as shown by the service record below, each line of which is supported by appointment and other papers actually issued by this Office and approved by the authorities concerned.
                  </div>

                  <table className="w-full border-collapse border border-black text-[10px] text-center mb-16 shadow-sm">
                    <thead>
                      <tr className="bg-slate-900 text-white">
                        <th colSpan={2} className="border border-white/20 p-3 font-black uppercase tracking-widest">SERVICE PERIOD</th>
                        <th colSpan={3} className="border border-white/20 p-3 font-black uppercase tracking-widest">APPOINTMENT DETAILS</th>
                        <th colSpan={2} className="border border-white/20 p-3 font-black uppercase tracking-widest">OFFICE ENTITY</th>
                        <th className="border border-white/20 p-3 w-12 font-black uppercase tracking-widest">LWOP</th>
                        <th colSpan={2} className="border border-white/20 p-3 font-black uppercase tracking-widest">SEPARATION</th>
                      </tr>
                      <tr className="bg-slate-100 text-slate-900">
                        <th className="border border-black p-2 w-24 font-bold uppercase text-[9px]">From</th>
                        <th className="border border-black p-2 w-24 font-bold uppercase text-[9px]">To</th>
                        <th className="border border-black p-2 font-bold uppercase text-[9px]">Designation</th>
                        <th className="border border-black p-2 w-20 font-bold uppercase text-[9px]">Status</th>
                        <th className="border border-black p-2 w-28 font-bold uppercase text-[9px]">Salary</th>
                        <th className="border border-black p-2 font-bold uppercase text-[9px]">Station</th>
                        <th className="border border-black p-2 w-24 font-bold uppercase text-[9px]">Branch</th>
                        <th className="border border-black p-2"></th>
                        <th className="border border-black p-2 w-24 font-bold uppercase text-[9px]">Date</th>
                        <th className="border border-black p-2 w-24 font-bold uppercase text-[9px]">Cause</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employee.serviceRecords.map((rec, i) => (
                        <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                          <td className="border border-black p-2.5 font-mono font-bold">{rec.from}</td>
                          <td className="border border-black p-2.5 font-mono font-bold">{rec.to}</td>
                          <td className="border border-black p-2.5 font-black uppercase text-[11px]">{rec.designation}</td>
                          <td className={`border border-black p-2.5 font-black uppercase text-[9px] ${
                            rec.status.includes('Perm') ? 'text-emerald-600' : 
                            rec.status.includes('Temp') ? 'text-amber-600' : ''
                          }`}>{rec.status}</td>
                          <td className="border border-black p-2.5 font-mono font-black text-[11px] text-[var(--green)]">{rec.salary}</td>
                          <td className="border border-black p-2.5 uppercase font-bold">{rec.station}</td>
                          <td className="border border-black p-2.5 uppercase font-bold">{rec.branch}</td>
                          <td className="border border-black p-2.5">{rec.lwop}</td>
                          <td className="border border-black p-2.5 font-mono">{rec.sepDate}</td>
                          <td className="border border-black p-2.5 uppercase font-bold">{rec.sepCause}</td>
                        </tr>
                      ))}
                      {employee.serviceRecords.length === 0 && (
                        <tr><td colSpan={10} className="border border-black p-12 text-slate-300 italic text-xl">No service records found in official database.</td></tr>
                      )}
                    </tbody>
                  </table>

                  <div className="flex justify-between items-end mt-24">
                    <div className="flex flex-col gap-3">
                      <div className="w-24 h-24 bg-white border border-slate-200 p-2 rounded-xl shadow-sm flex items-center justify-center relative overflow-hidden group">
                        {/* QR Code Placeholder */}
                        <div className="grid grid-cols-4 gap-1 w-full h-full opacity-20">
                          {Array.from({ length: 16 }).map((_, i) => (
                            <div key={i} className={`bg-black ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'}`}></div>
                          ))}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <ShieldCheck className="w-8 h-8 text-emerald-500 opacity-40" />
                        </div>
                      </div>
                      <div className="text-[7px] font-mono text-slate-400 tracking-widest uppercase">Verified Digital Record</div>
                      <div className="text-[6px] font-mono text-slate-300 tracking-tighter">HASH: 0x992B...F12</div>
                    </div>
                    <div className="text-center w-96">
                      <div className="mb-4 italic text-slate-400 text-xs font-medium">Certified Correct & Verified:</div>
                      <div className="relative inline-block">
                        <div className="absolute -top-12 -left-8 w-32 h-16 opacity-10 rotate-[-12deg] pointer-events-none">
                          <svg viewBox="0 0 100 50" className="w-full h-full text-blue-800 fill-current">
                            <path d="M10,40 Q30,10 50,40 T90,40" fill="none" stroke="currentColor" strokeWidth="2" />
                            <path d="M15,35 Q35,5 55,35 T95,35" fill="none" stroke="currentColor" strokeWidth="1" />
                          </svg>
                        </div>
                        <div className="border-b-2 border-black font-playfair font-black uppercase text-2xl pb-2 text-slate-900 tracking-tight px-12">RIO C. GARCIA</div>
                      </div>
                      <div className="text-[10px] font-black text-slate-400 mt-3 tracking-[0.3em] uppercase">HRMO III / Administrative Officer</div>
                      <div className="text-[8px] italic text-slate-500 mt-1">Personnel Records Division</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
