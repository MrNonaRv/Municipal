import React, { useState, useRef } from 'react';
import { Employee } from '../types/employee';
import { generateEmptyEmployee } from '../utils/helpers';
import { Download, Upload, FileJson, FileSpreadsheet, CheckSquare, Square, X } from 'lucide-react';

interface Props {
  onClose: () => void;
  onImport: (data: Employee[]) => Promise<void> | void;
  employees: Employee[];
}

export default function CSVModal({ onClose, onImport, employees }: Props) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single' | 'export'>('bulk');
  const [previewData, setPreviewData] = useState<Employee[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set(employees.map(e => e.id)));
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      await onImport(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during import.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (activeTab === 'bulk' && file.name.endsWith('.csv')) {
        parseCSV(content);
      } else if (activeTab === 'single' && file.name.endsWith('.json')) {
        parseJSON(content);
      } else {
        setError(`Invalid file type. Please upload a ${activeTab === 'bulk' ? '.csv' : '.json'} file.`);
      }
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsText(file);
    // Reset input so the same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const parseCSVLine = (text: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (char === '"') {
        if (inQuotes && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result.map(v => v.trim());
  };

  const parseCSV = (csvText: string) => {
    try {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setError("CSV file must contain a header row and at least one data row.");
        return;
      }
      
      const headers = parseCSVLine(lines[0]);
      const parsed: Employee[] = [];
      
      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const emp = generateEmptyEmployee();
        
        // Basic validation: check if row has enough columns
        if (values.length < Math.min(headers.length, 3)) {
           console.warn(`Row ${i + 1} has insufficient data. Skipping.`);
           continue;
        }

        headers.forEach((header, index) => {
          if (header in emp && typeof (emp as any)[header] === 'string') {
            (emp as any)[header] = values[index] || '';
          }
        });
        
        // Ensure ID exists, generate one if not
        if (!emp.id) {
          emp.id = 'EMP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        }
        
        parsed.push(emp);
      }
      
      if (parsed.length === 0) {
        setError("No valid records found in the CSV file.");
      } else {
        setPreviewData(parsed);
      }
    } catch (e) {
      setError("Failed to parse CSV file. Please ensure it is formatted correctly.");
      console.error("CSV Parse Error", e);
    }
  };

  const parseJSON = (jsonText: string) => {
    try {
      const data = JSON.parse(jsonText);
      const arr = Array.isArray(data) ? data : [data];
      
      const valid = arr.filter(item => {
        // More robust validation for JSON import
        return typeof item === 'object' && item !== null && 
               (item.id || item.firstName || item.surname);
      });
      
      if (valid.length === 0) {
        setError("No valid employee records found in the JSON file.");
        return;
      }
      
      // Ensure all valid items have an ID
      const processed = valid.map(item => ({
        ...generateEmptyEmployee(),
        ...item,
        id: item.id || 'EMP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5)
      }));
      
      setPreviewData(processed);
    } catch (e) {
      setError("Invalid JSON format. Please check the file contents.");
      console.error("JSON Parse Error", e);
    }
  };

  const downloadTemplate = () => {
    const emp = generateEmptyEmployee();
    const headers = Object.keys(emp).filter(k => typeof (emp as any)[k] === 'string' && k !== 'photo');
    const csv = headers.join(',') + '\n' + headers.map(() => '').join(',');
    downloadFile(csv, 'employee_template.csv', 'text/csv');
  };

  const exportCSV = () => {
    const toExport = employees.filter(e => selectedForExport.has(e.id));
    if (toExport.length === 0) return;
    
    const headers = ['id', 'surname', 'firstName', 'middleName', 'dateOfBirth', 'sex', 'civilStatus', 'email', 'cellphone'];
    const csv = [
      headers.join(','),
      ...toExport.map(emp => headers.map(h => {
        const val = String((emp as any)[h] || '');
        return `"${val.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');
    
    downloadFile(csv, 'employees_export.csv', 'text/csv');
  };

  const exportJSON = () => {
    const toExport = employees.filter(e => selectedForExport.has(e.id));
    if (toExport.length === 0) return;
    
    const data = toExport.length === 1 ? toExport[0] : toExport;
    downloadFile(JSON.stringify(data, null, 2), 'employees_export.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelectAll = () => {
    if (selectedForExport.size === employees.length) {
      setSelectedForExport(new Set());
    } else {
      setSelectedForExport(new Set(employees.map(e => e.id)));
    }
  };

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedForExport);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedForExport(newSet);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="csv-modal-title">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-4 bg-[var(--navy)] text-white flex justify-between items-center">
          <h2 id="csv-modal-title" className="font-playfair text-xl font-bold">Import / Export Center</h2>
          <button onClick={onClose} aria-label="Close modal" className="text-gray-300 hover:text-white flex items-center gap-1">
            <X size={20} />
            <span className="text-sm font-bold uppercase tracking-widest">Close</span>
          </button>
        </div>
        
        <div className="flex border-b border-gray-200 bg-gray-50 px-4" role="tablist" aria-label="Import and export options">
          <button 
            role="tab" 
            id="tab-bulk"
            aria-controls="panel-bulk"
            aria-selected={activeTab === 'bulk'} 
            onClick={() => { setActiveTab('bulk'); setPreviewData([]); }} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'bulk' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <FileSpreadsheet size={16}/> Bulk CSV
          </button>
          <button 
            role="tab" 
            id="tab-single"
            aria-controls="panel-single"
            aria-selected={activeTab === 'single'} 
            onClick={() => { setActiveTab('single'); setPreviewData([]); }} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'single' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <FileJson size={16}/> Single Record
          </button>
          <button 
            role="tab" 
            id="tab-export"
            aria-controls="panel-export"
            aria-selected={activeTab === 'export'} 
            onClick={() => setActiveTab('export')} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'export' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <Download size={16}/> Export
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm" role="alert">
              {error}
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept={activeTab === 'bulk' ? '.csv' : '.json'} 
            onChange={handleFileUpload} 
            aria-hidden="true"
          />
          
          {(activeTab === 'bulk' || activeTab === 'single') && (
            <div 
              id={`panel-${activeTab}`}
              role="tabpanel"
              aria-labelledby={`tab-${activeTab}`}
              className="space-y-6"
            >
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label={`Upload ${activeTab === 'bulk' ? 'CSV' : 'JSON'} file`}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--gold)]"
              >
                <Upload className="mx-auto text-gray-400 mb-3" size={32} />
                <p className="text-gray-600 font-medium">Click to upload {activeTab === 'bulk' ? 'CSV' : 'JSON'} file</p>
                <p className="text-gray-400 text-sm mt-1">or drag and drop here</p>
              </button>

              {activeTab === 'bulk' && previewData.length === 0 && (
                <div className="text-center">
                  <button onClick={downloadTemplate} className="text-[var(--navy)] hover:underline text-sm font-medium">Download CSV Template</button>
                </div>
              )}

              {previewData.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-bold text-[var(--navy)]">Preview ({previewData.length} records found)</h3>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="px-3 py-2">Name</th>
                          <th className="px-3 py-2">DOB</th>
                          <th className="px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 8).map((emp, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{emp.firstName} {emp.surname}</td>
                            <td className="px-3 py-2">{emp.dateOfBirth}</td>
                            <td className="px-3 py-2">{emp.email}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {previewData.length > 8 && <div className="p-2 text-center text-xs text-gray-500 bg-gray-50">...and {previewData.length - 8} more</div>}
                  </div>
                  <button onClick={handleImport} disabled={isImporting} className="w-full py-2 bg-[var(--green)] text-white rounded font-bold hover:bg-opacity-90 disabled:opacity-50 flex justify-center items-center gap-2">
                    {isImporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : null}
                    {isImporting ? 'Importing...' : `Import ${previewData.length} Records`}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div 
              id="panel-export"
              role="tabpanel"
              aria-labelledby="tab-export"
              className="space-y-6"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[var(--navy)]">Select Records to Export</h3>
                <button 
                  onClick={toggleSelectAll} 
                  aria-label={selectedForExport.size === employees.length ? "Deselect all records" : "Select all records"}
                  className="text-sm text-[var(--navy)] hover:underline flex items-center gap-1"
                >
                  {selectedForExport.size === employees.length ? <CheckSquare size={16}/> : <Square size={16}/>} Select All
                </button>
              </div>
              
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto" role="listbox" aria-label="Employees to export">
                {employees.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-3 border-b last:border-0 hover:bg-gray-50">
                    <button 
                      onClick={() => toggleSelect(emp.id)} 
                      aria-label={`${selectedForExport.has(emp.id) ? 'Deselect' : 'Select'} ${emp.firstName} ${emp.surname}`}
                      aria-pressed={selectedForExport.has(emp.id)}
                      className="text-[var(--navy)]"
                    >
                      {selectedForExport.has(emp.id) ? <CheckSquare size={18}/> : <Square size={18}/>}
                    </button>
                    <div>
                      <div className="font-medium">{emp.firstName} {emp.surname}</div>
                      <div className="text-xs text-gray-500">{emp.id}</div>
                    </div>
                  </div>
                ))}
                {employees.length === 0 && <div className="p-4 text-center text-gray-500" role="status">No records available to export.</div>}
              </div>

              <div className="flex gap-4">
                <button onClick={exportCSV} disabled={selectedForExport.size === 0} className="flex-1 py-2 bg-[var(--navy)] text-white rounded font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                  <FileSpreadsheet size={18}/> Export as CSV
                </button>
                <button onClick={exportJSON} disabled={selectedForExport.size === 0} className="flex-1 py-2 bg-[var(--navy3)] text-white rounded font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                  <FileJson size={18}/> Export as JSON
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
