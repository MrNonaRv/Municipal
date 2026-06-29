import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types/employee';
import { generateEmptyEmployee } from '../utils/helpers';
import { 
  Download, Upload, FileJson, FileSpreadsheet, CheckSquare, Square, X, Cloud, 
  Key, Shield, HelpCircle, Check, Lock, Clock, Trash2, Plus, Edit, UploadCloud, 
  AlertTriangle, Calendar, Search, Filter
} from 'lucide-react';
import { checkDriveStatus, saveServiceAccountConfig, logout as unlinkDrive, GoogleDriveStatus } from '../services/googleDrive';
import { getActivityLogs, clearActivityLogs, ActivityLog } from '../services/db';

interface Props {
  onClose: () => void;
  onImport: (data: Employee[]) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  employees: Employee[];
  initialTab?: 'bulk' | 'single' | 'export' | 'gdrive' | 'logs';
}

export default function CSVModal({ onClose, onImport, onClear, employees, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single' | 'export' | 'gdrive' | 'logs'>(initialTab || 'bulk');
  const [previewData, setPreviewData] = useState<Employee[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set(employees.map(e => e.id)));
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Google Drive Config State
  const [driveStatus, setDriveStatus] = useState<GoogleDriveStatus | null>(null);
  const [saKey, setSaKey] = useState('');
  const [driveFolderId, setDriveFolderId] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Activity Log State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ADD' | 'MODIFY' | 'DELETE' | 'IMPORT' | 'CLEAR'>('ALL');

  useEffect(() => {
    if (activeTab === 'gdrive') {
      checkDriveStatus().then(status => {
        setDriveStatus(status);
        if (status.connected && status.folderId) {
          setDriveFolderId(status.folderId);
        }
      });
    } else if (activeTab === 'logs') {
      setLogs(getActivityLogs());
    }
  }, [activeTab]);

  useEffect(() => {
    const handleLogsChange = () => {
      setLogs(getActivityLogs());
    };
    window.addEventListener('gers_activity_logs_change', handleLogsChange);
    return () => {
      window.removeEventListener('gers_activity_logs_change', handleLogsChange);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
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
  };

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
          emp.id = 'EMP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
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
        id: item.id || 'EMP-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
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
    
    const headers = ['id', 'surname', 'firstName', 'middleName', 'sex', 'civilStatus', 'email', 'cellphone'];
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
          <button 
            role="tab" 
            id="tab-gdrive"
            aria-controls="panel-gdrive"
            aria-selected={activeTab === 'gdrive'} 
            onClick={() => setActiveTab('gdrive')} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'gdrive' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <Cloud size={16}/> Settings & Drive
          </button>
          <button 
            role="tab" 
            id="tab-logs"
            aria-controls="panel-logs"
            aria-selected={activeTab === 'logs'} 
            onClick={() => setActiveTab('logs')} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'logs' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <Clock size={16}/> Activity Log
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
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                aria-label={`Upload ${activeTab === 'bulk' ? 'CSV' : 'JSON'} file`}
                className={`w-full border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-[var(--gold)] ${
                  isDragging 
                    ? 'border-[var(--gold)] bg-amber-50/25 scale-[0.99]' 
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Upload className={`mx-auto mb-3 transition-colors ${isDragging ? 'text-[var(--gold)]' : 'text-gray-400'}`} size={32} />
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
                          <th className="px-3 py-2">Email</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.slice(0, 8).map((emp, i) => (
                          <tr key={i} className="border-b last:border-0">
                            <td className="px-3 py-2">{emp.firstName} {emp.surname}</td>
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
                <button onClick={exportCSV} disabled={selectedForExport.size === 0} className="flex-1 py-2 bg-[var(--navy)] hover:bg-[var(--navy-light)] transition-colors text-white rounded font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                  <FileSpreadsheet size={18}/> Export as CSV
                </button>
                <button onClick={exportJSON} disabled={selectedForExport.size === 0} className="flex-1 py-2 bg-[var(--navy-light)] hover:bg-[var(--navy-lighter)] transition-colors text-white rounded font-medium disabled:opacity-50 flex justify-center items-center gap-2">
                  <FileJson size={18}/> Export as JSON
                </button>
              </div>
            </div>
          )}

          {activeTab === 'gdrive' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-[var(--navy)] flex items-center gap-2 mb-2 text-sm">
                  <Cloud size={18} className="text-blue-500" />
                  System-Wide Google Drive Storage
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Establish a single, hardcoded Google Drive connection. Once set up, all scanned employee documents
                  will save directly to your organization's Google Drive. All users can instantly upload and access
                  files without encountering domain authorization issues on Vercel.
                </p>
              </div>

              {driveStatus?.connected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-full">
                      <Check size={16} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-emerald-800 text-sm">System Storage Active</div>
                      <div className="text-xs text-emerald-700">
                        <span className="font-medium">Service Account Email:</span>{' '}
                        <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{driveStatus.email}</code>
                      </div>
                      {driveStatus.folderId && (
                        <div className="text-xs text-emerald-700">
                          <span className="font-medium">Target Folder ID:</span>{' '}
                          <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{driveStatus.folderId}</code>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200/50 text-xs text-blue-800 space-y-1.5 font-sans">
                    <div className="font-bold flex items-center gap-1.5 text-blue-900">
                      <Shield size={14} /> Security and Authorization
                    </div>
                    <p>
                      Files are securely transmitted server-to-server using encrypted credentials in your database.
                      Remember to share your Google Drive Folder with the service account email above so it can read and write files.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to unlink the system Google Drive storage? Scanned files will no longer back up to Drive.')) {
                        try {
                          await unlinkDrive();
                          const status = await checkDriveStatus();
                          setDriveStatus(status);
                          setError(null);
                        } catch (err: any) {
                          setError(err.message || 'Failed to unlink');
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Disconnect GDrive Storage
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure System Connection</div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1 font-sans">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Service Account JSON Key
                      </label>
                      <textarea
                        value={saKey}
                        onChange={(e) => setSaKey(e.target.value)}
                        placeholder='{"type": "service_account", "project_id": "...", ...}'
                        rows={6}
                        className="w-full border p-2.5 rounded font-mono text-xs focus:ring-1 focus:ring-[var(--gold)] focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1 font-sans">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Google Drive Folder ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={driveFolderId}
                        onChange={(e) => setDriveFolderId(e.target.value)}
                        placeholder="e.g. 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                        className="w-full border p-2.5 rounded text-xs focus:ring-1 focus:ring-[var(--gold)] focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500 font-sans">
                        Leave blank to upload to the root of the Service Account's drive.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!saKey.trim()) {
                        setError('Please paste your Google Service Account JSON key.');
                        return;
                      }
                      setIsSavingConfig(true);
                      setError(null);
                      try {
                        await saveServiceAccountConfig(saKey, driveFolderId);
                        const status = await checkDriveStatus();
                        setDriveStatus(status);
                        setSaKey('');
                        // Trigger a custom event so other components update immediately
                        window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { detail: status }));
                      } catch (err: any) {
                        setError(err.message || 'Invalid service account or network error');
                      } finally {
                        setIsSavingConfig(false);
                      }
                    }}
                    disabled={isSavingConfig}
                    className="w-full py-2.5 bg-[var(--navy)] text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-sm"
                  >
                    {isSavingConfig ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Key size={16} />}
                    {isSavingConfig ? 'Saving Configuration...' : 'Save GDrive Credentials'}
                  </button>

                  <div className="bg-slate-100 p-4 rounded-lg border text-xs text-slate-600 space-y-2 font-sans">
                    <div className="font-bold text-slate-700 flex items-center gap-1">
                      <HelpCircle size={14} /> Quick Setup Guide
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                      <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Google Cloud Console</a>.</li>
                      <li>Create a new Project, enable the <strong className="text-slate-700">Google Drive API</strong>.</li>
                      <li>Go to <strong className="text-slate-700">IAM & Admin &gt; Service Accounts</strong>, create a Service Account.</li>
                      <li>Select the account, click <strong className="text-slate-700">Keys &gt; Add Key &gt; Create New Key &gt; JSON</strong> and download it.</li>
                      <li>Paste the entire JSON file contents into the field above.</li>
                      <li><strong>Important:</strong> Create a folder on your personal Google Drive, and share it with the Service Account email (e.g. <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">service-account@...</code>) giving it <strong className="text-slate-700">Editor</strong> access!</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Database Maintenance Section */}
              <div className="pt-6 border-t border-slate-200 mt-6 space-y-4 font-sans">
                <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                  <Shield size={18} className="text-red-500 animate-pulse" />
                  System Database Maintenance
                </div>
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3">
                  <p className="text-xs text-red-800 leading-relaxed font-sans">
                    <strong>Critical Action:</strong> This will permanently delete all employee records, service histories, and scanned documents in the local storage cache and from the cloud database.
                  </p>
                  <p className="text-xs text-red-700">
                    Use this tool only when the database requires an absolute reset/re-import, or when fixing corrupted record formats.
                  </p>
                  <button
                     type="button"
                     onClick={async () => {
                       if (confirm('⚠️ WARNING: Are you sure you want to clear ALL employee and record data from the system?\n\nThis will completely wipe local and cloud records. This action cannot be undone.')) {
                         if (confirm('⚠️ DOUBLE CONFIRMATION REQUIRED:\n\nPlease confirm again to delete all data.')) {
                           try {
                             setError(null);
                             if (onClear) {
                               await onClear();
                             }
                           } catch (err: any) {
                             setError(err instanceof Error ? err.message : 'Failed to clear system data');
                           }
                         }
                       }
                     }}
                     className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
                  >
                    Clear All System Data
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-6 font-sans">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-[var(--navy)] flex items-center gap-2 text-sm">
                      <Clock size={18} className="text-[var(--gold)]" />
                      Dossier Action & Sync Activity Logs
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">
                      Historical log of additions, modifications, and deletions made to personnel records and files.
                    </p>
                  </div>
                  {logs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to clear all activity log history? This will clear the visual log list.')) {
                          clearActivityLogs();
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 hover:text-slate-900 transition-colors rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                    >
                      <Trash2 size={13} />
                      Clear Logs
                    </button>
                  )}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={logSearch}
                    onChange={(e) => setLogSearch(e.target.value)}
                    placeholder="Search by employee name or log entry message..."
                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-[var(--gold)] focus:border-[var(--gold)] outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 min-w-[150px]">
                  <Filter size={14} className="text-slate-400" />
                  <select
                    value={logFilter}
                    onChange={(e) => setLogFilter(e.target.value as any)}
                    className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:ring-1 focus:ring-[var(--gold)]"
                  >
                    <option value="ALL">All Actions</option>
                    <option value="ADD">Additions</option>
                    <option value="MODIFY">Modifications</option>
                    <option value="DELETE">Deletions</option>
                    <option value="IMPORT">Imports</option>
                    <option value="CLEAR">Clears</option>
                  </select>
                </div>
              </div>

              {/* Logs List */}
              {(() => {
                const filteredLogs = logs.filter(log => {
                  const matchesFilter = logFilter === 'ALL' || log.actionType === logFilter;
                  const searchLower = logSearch.toLowerCase();
                  const matchesSearch = 
                    log.message.toLowerCase().includes(searchLower) ||
                    (log.details?.employeeName && log.details.employeeName.toLowerCase().includes(searchLower)) ||
                    (log.details?.changes && log.details.changes.some(c => c.toLowerCase().includes(searchLower)));
                  return matchesFilter && matchesSearch;
                });

                const getIconForAction = (type: string) => {
                  switch (type) {
                    case 'ADD': return <Plus size={14} className="text-emerald-600" />;
                    case 'MODIFY': return <Edit size={14} className="text-blue-600" />;
                    case 'DELETE': return <Trash2 size={14} className="text-rose-600" />;
                    case 'IMPORT': return <UploadCloud size={14} className="text-purple-600" />;
                    case 'CLEAR': return <AlertTriangle size={14} className="text-amber-600" />;
                    default: return <Clock size={14} className="text-slate-600" />;
                  }
                };

                const getColorClasses = (type: string) => {
                  switch (type) {
                    case 'ADD': return 'border-l-emerald-500 bg-emerald-50/20';
                    case 'MODIFY': return 'border-l-blue-500 bg-blue-50/20';
                    case 'DELETE': return 'border-l-rose-500 bg-rose-50/20';
                    case 'IMPORT': return 'border-l-purple-500 bg-purple-50/20';
                    case 'CLEAR': return 'border-l-amber-500 bg-amber-50/20';
                    default: return 'border-l-slate-400 bg-slate-50/30';
                  }
                };

                if (filteredLogs.length === 0) {
                  return (
                    <div className="text-center py-12 bg-white border border-slate-200 rounded-lg shadow-sm">
                      <Clock size={40} className="mx-auto mb-3 text-slate-300 animate-pulse" />
                      <p className="text-sm font-medium text-slate-500">No activity logs found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting your filters or record more data changes first.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                    {filteredLogs.map(log => (
                      <div 
                        key={log.id} 
                        className={`border border-slate-200 border-l-4 rounded-lg p-3.5 shadow-sm transition-all hover:shadow-md ${getColorClasses(log.actionType)}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-white border border-slate-100 rounded-md shadow-sm mt-0.5">
                            {getIconForAction(log.actionType)}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-800 font-sans">
                                {log.message}
                              </h4>
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                <Calendar size={10} />
                                {new Date(log.timestamp).toLocaleString()}
                              </span>
                            </div>

                            {log.details?.changes && log.details.changes.length > 0 && (
                              <div className="mt-2 pl-2 border-l border-slate-200 space-y-1">
                                {log.details.changes.map((change, i) => (
                                  <div key={i} className="text-[11px] text-slate-600 flex items-center gap-1.5 font-sans">
                                    <span className="w-1 h-1 rounded-full bg-slate-400 shrink-0" />
                                    <span>{change}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
