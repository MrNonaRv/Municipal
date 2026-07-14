const fs = require('fs');
let content = fs.readFileSync('src/components/NOSAModal.tsx', 'utf8');

const hookReplacement = `  useEffect(() => {
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
`;

content = content.replace("  // Calculate Difference", hookReplacement + "\n  // Calculate Difference");

const historySelector = `
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
`;

content = content.replace('<div className="space-y-4 flex-1">', historySelector);

content = content.replace(
`<button 
              onClick={() => window.print()} 
              className="w-full py-3 bg-[var(--gold)] text-[var(--navy)] font-bold uppercase tracking-widest rounded-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2"
            >
              <Printer size={18} /> Print NOSA
            </button>`,
`<button 
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
            </button>`
);

fs.writeFileSync('src/components/NOSAModal.tsx', content);
console.log("Updated NOSAModal.tsx history");
