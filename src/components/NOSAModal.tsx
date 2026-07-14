import React, { useState, useEffect } from 'react';
import { Employee } from '../types/employee';
import { X, Printer, Calculator } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  employee: Employee;
  onClose: () => void;
  onSave?: (emp: Employee) => void;
}

export default function NOSAModal({ employee, onClose, onSave }: Props) {
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');
  const latestService = employee.serviceRecords.length > 0 
    ? employee.serviceRecords[employee.serviceRecords.length - 1] 
    : null;

  const [dateOfNotice, setDateOfNotice] = useState(new Date().toISOString().split('T')[0]);
  const [mayorName, setMayorName] = useState('RICOMATA LARGO, JR.');
  
  const [oldSg, setOldSg] = useState('24');
  const [oldStep, setOldStep] = useState('2');
  const [oldSalary, setOldSalary] = useState('85384.00');
  const [oldDate, setOldDate] = useState('December 31, 2018');

  const [newSg, setNewSg] = useState('24');
  const [newStep, setNewStep] = useState('1');
  const [newSalary, setNewSalary] = useState('88074.00');
  const [newDate, setNewDate] = useState('July 1, 2019');

  const [lbcNo, setLbcNo] = useState('115');
  const [lbcDate, setLbcDate] = useState('January 3, 2018');
  const [eoNo, setEoNo] = useState('201');
  const [eoDate, setEoDate] = useState('February 19, 2016');

  const [designation, setDesignation] = useState(latestService?.designation || 'Municipal Civil Registrar');
  const [itemNo, setItemNo] = useState('11');
  const [fy, setFy] = useState('2019');

  useEffect(() => {
    if (selectedHistoryId && employee.nosaRecords) {
      const record = employee.nosaRecords.find(r => r.id === selectedHistoryId);
      if (record) {
        setDateOfNotice(record.dateOfNotice);
        setNewSg(record.newSg);
        setNewStep(record.newStep);
        setNewSalary(record.newSalary);
        setNewDate(record.newDate);
        setOldSg(record.oldSg);
        setOldStep(record.oldStep);
        setOldSalary(record.oldSalary);
        setOldDate(record.oldDate);
        setDesignation(record.designation);
        setItemNo(record.itemNo);
        setFy(record.fy);
        setLbcNo(record.lbcNo);
        setLbcDate(record.lbcDate);
        setEoNo(record.eoNo);
        setEoDate(record.eoDate);
        setMayorName(record.mayorName);
      }
    }
  }, [selectedHistoryId, employee.nosaRecords]);

  const handleSaveAndPrint = () => {
    if (onSave) {
      const newRecord = {
        id: selectedHistoryId || crypto.randomUUID(),
        dateOfNotice,
        newSg,
        newStep,
        newSalary,
        newDate,
        oldSg,
        oldStep,
        oldSalary,
        oldDate,
        designation,
        itemNo,
        fy,
        lbcNo,
        lbcDate,
        eoNo,
        eoDate,
        mayorName,
        createdAt: new Date().toISOString()
      };
      
      const existingRecords = employee.nosaRecords || [];
      const isExisting = existingRecords.some(r => r.id === newRecord.id);
      
      const updatedRecords = isExisting 
        ? existingRecords.map(r => r.id === newRecord.id ? newRecord : r)
        : [...existingRecords, newRecord];
        
      onSave({
        ...employee,
        nosaRecords: updatedRecords
      });
      setSelectedHistoryId(newRecord.id);
    }
    
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Calculate Difference
  const diff = parseFloat(newSalary.replace(/,/g,'')) - parseFloat(oldSalary.replace(/,/g,''));
  const monthlyAdjustment = isNaN(diff) ? '0.00' : diff.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const formattedNewSalary = isNaN(parseFloat(newSalary)) ? '0.00' : parseFloat(newSalary).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  const formattedOldSalary = isNaN(parseFloat(oldSalary)) ? '0.00' : parseFloat(oldSalary).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col md:flex-row overflow-hidden max-h-[95vh]"
      >
        {/* FORM SIDE (NO PRINT) */}
        <div className="w-full md:w-1/3 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto no-print flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-[var(--navy)]">Generate NOSA</h2>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
              <X size={20} />
            </button>
          </div>

          
          <div className="space-y-4 flex-1">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3 mb-4">
              <h3 className="text-xs font-bold uppercase text-blue-800 tracking-wider">NOSA Records</h3>
              <select 
                value={selectedHistoryId} 
                onChange={e => {
                  if (e.target.value === '') {
                    setSelectedHistoryId('');
                  } else {
                    setSelectedHistoryId(e.target.value);
                  }
                }}
                className="w-full border border-blue-200 rounded px-2 py-2 text-sm text-blue-900 bg-white"
              >
                <option value="">-- Create New NOSA --</option>
                {employee.nosaRecords?.map(record => (
                  <option key={record.id} value={record.id}>
                    {new Date(record.createdAt).toLocaleDateString()} - SG {record.newSg}/{record.newStep} ({record.newDate})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-slate-500">Date of Notice</label>
              <input type="date" value={dateOfNotice} onChange={e => setDateOfNotice(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" />
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">New Salary Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">New SG</label>
                  <input type="text" value={newSg} onChange={e => setNewSg(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">New Step</label>
                  <input type="text" value={newStep} onChange={e => setNewStep(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">New Basic Salary</label>
                <input type="number" value={newSalary} onChange={e => setNewSalary(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Effective Date</label>
                <input type="text" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" placeholder="e.g. July 1, 2019" />
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Old Salary Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Old SG</label>
                  <input type="text" value={oldSg} onChange={e => setOldSg(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Old Step</label>
                  <input type="text" value={oldStep} onChange={e => setOldStep(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Old Basic Salary</label>
                <input type="number" value={oldSalary} onChange={e => setOldSalary(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-mono" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">As of Date</label>
                <input type="text" value={oldDate} onChange={e => setOldDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" placeholder="e.g. December 31, 2018" />
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Circulars & Rules</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">LBC No.</label>
                  <input type="text" value={lbcNo} onChange={e => setLbcNo(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">LBC Date</label>
                  <input type="text" value={lbcDate} onChange={e => setLbcDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">EO No.</label>
                  <input type="text" value={eoNo} onChange={e => setEoNo(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">EO Date</label>
                  <input type="text" value={eoDate} onChange={e => setEoDate(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Position Details</h3>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Designation / Title</label>
                <input type="text" value={designation} onChange={e => setDesignation(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Item No.</label>
                  <input type="text" value={itemNo} onChange={e => setItemNo(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-500">Plantilla Year</label>
                  <input type="text" value={fy} onChange={e => setFy(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold uppercase text-[var(--navy)] tracking-wider">Signatory</h3>
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-slate-500">Mayor's Name</label>
                <input type="text" value={mayorName} onChange={e => setMayorName(e.target.value)} className="w-full border border-slate-200 rounded px-2 py-1 text-sm" />
              </div>
            </div>
            
          </div>

          <div className="mt-6 pt-4 border-t border-slate-200">
            <button 
              onClick={handleSaveAndPrint} 
              className="w-full py-3 bg-[var(--gold)] text-[var(--navy)] font-bold uppercase tracking-widest rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Save & Print
            </button>
            <button 
              onClick={() => window.print()} 
              className="w-full mt-2 py-2 bg-slate-100 text-slate-600 font-bold uppercase text-xs tracking-widest rounded-xl hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Print without Saving
            </button>
          </div>
        </div>

        {/* PREVIEW/PRINT SIDE */}
        <div className="w-full md:w-2/3 bg-slate-200 p-8 overflow-y-auto flex justify-center print:p-0 print:bg-white print:overflow-visible print:block">
          <div className="bg-white p-12 shadow-sm w-full max-w-[8.5in] min-h-[11in] text-black font-sans relative print:shadow-none print:w-full">
            {/* Header */}
            <div className="flex justify-center items-center mb-8 relative">
              <div className="absolute left-8 top-2">
                <img src="/Systemlogo.jpg" alt="Municipality Logo" className="w-24 h-24 object-contain mix-blend-multiply" />
              </div>
              <div className="text-center space-y-0.5">
                <p className="text-xs">Republic of the Philippines</p>
                <p className="text-xs">Province of Capiz</p>
                <p className="text-xs font-bold">Municipality of Mambusao</p>
                <p className="text-sm font-bold uppercase mt-2">OFFICE OF THE MAYOR</p>
                <p className="text-[10px] italic mt-1">Telephone (036) 6470-049</p>
                <p className="text-[10px] italic">Email Address: mambusao_lgu@yahoo.com</p>
              </div>
              <div className="absolute right-8 top-6">
                <img src="https://upload.wikimedia.org/wikipedia/commons/9/99/Flag_of_the_Philippines.svg" alt="Philippine Flag" className="w-24 h-12 object-cover border border-slate-300" />
              </div>
            </div>

            <div className="text-center mb-10">
              <h1 className="text-xl font-bold uppercase underline">NOTICE OF SALARY ADJUSTMENT</h1>
            </div>

            <div className="flex justify-end mb-8">
              <p className="text-sm">{new Date(dateOfNotice).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div className="mb-8 text-sm space-y-1">
              <p className="font-bold uppercase">{(employee.sex === 'Female' ? (employee.civilStatus === 'Married' ? 'MRS. ' : 'MS. ') : 'MR. ')} {employee.firstName} {employee.middleName ? employee.middleName.charAt(0) + '.' : ''} {employee.surname}</p>
              <p>{designation}</p>
              <p>Office of the {designation}</p>
              <p>Mambusao, Capiz</p>
            </div>

            <div className="mb-6 text-sm">
              <p>Dear {(employee.sex === 'Female' ? (employee.civilStatus === 'Married' ? 'Mrs. ' : 'Ms. ') : 'Mr. ')} {employee.surname}:</p>
            </div>

            <div className="mb-6 text-sm text-justify indent-8 leading-relaxed">
              <p>
                Pursuant to Local Budget Circular No. {lbcNo}, dated {lbcDate} implementing Executive Order No. {eoNo} dated {eoDate}, your salary is hereby adjusted effective {newDate}, as follows:
              </p>
            </div>

            <div className="px-8 space-y-6 text-sm mb-10">
              <div className="flex justify-between items-start">
                <div className="w-3/4">
                  <p>1. Adjusted monthly basic salary effective {newDate}, under the new Salary Schedule: SG- {newSg}, Step {newStep}</p>
                </div>
                <div className="w-1/4 text-right">
                  <p>P {formattedNewSalary}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-start">
                <div className="w-3/4">
                  <p>2. Actual monthly basic salary as of {oldDate}: SG- {oldSg}, Step {oldStep}</p>
                </div>
                <div className="w-1/4 text-right">
                  <p>P {formattedOldSalary}</p>
                </div>
              </div>
              
              <div className="flex justify-between items-start font-bold">
                <div className="w-3/4">
                  <p>3. Monthly Salary Adjusted effective {newDate}</p>
                </div>
                <div className="w-1/4 text-right">
                  <p>P {monthlyAdjustment}</p>
                </div>
              </div>
            </div>

            <div className="mb-16 text-sm text-justify indent-8 leading-relaxed">
              <p>
                It is understood that this fourth tranche is subject to usual accounting and auditing rules and regulations, and to appropriate re-adjustment and refund if found not in order.
              </p>
            </div>

            <div className="flex justify-end mb-16 pr-12 text-sm">
              <div className="text-center">
                <p className="text-left mb-8">Very truly yours,</p>
                <p className="font-bold uppercase">{mayorName}</p>
                <p>Municipal Mayor</p>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p>Position Title: {designation}</p>
              <p>Salary Grade: {newSg}/{newStep}</p>
              <p>Item No. {itemNo}, FY {fy}, Plantilla of Personnel {fy}</p>
            </div>

            <div className="mt-8 text-xs space-y-1">
              <p>Copy furnished:</p>
              <div className="pl-8">
                <p>1. HRM Section</p>
                <p className="pl-4">LGU- Mambusao, Capiz</p>
                <p>2. GSIS- Roxas City</p>
              </div>
            </div>

          </div>
        </div>
      </motion.div>
      
    </motion.div>
  );
}
