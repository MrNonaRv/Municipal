import React, { useState, useRef, useEffect } from 'react';
import { Employee } from '../types/employee';
import { generateEmptyEmployee } from '../utils/helpers';
import { 
  Download, Upload, FileJson, FileSpreadsheet, CheckSquare, Square, X, Cloud, 
  Key, Shield, HelpCircle, Check, Lock, Clock, Trash2, Plus, Edit, UploadCloud, 
  AlertTriangle, Calendar, Search, Filter, LogOut
} from 'lucide-react';
import { checkSupabaseStatus, saveSupabaseConfig, logout as unlinkSupabase, SupabaseStatus } from '../services/supabaseStorage';
import { initDriveAuth, googleSignIn, driveLogout, getDriveAccessToken } from '../services/driveStorage';
import { getActivityLogs, clearActivityLogs, ActivityLog } from '../services/db';

interface Props {
  onClose: () => void;
  onImport: (data: Employee[]) => Promise<void> | void;
  onClear?: () => Promise<void> | void;
  employees: Employee[];
  initialTab?: 'bulk' | 'single' | 'export' | 'gdrive' | 'supabase' | 'logs';
}

export default function CSVModal({ onClose, onImport, onClear, employees, initialTab }: Props) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'single' | 'export' | 'supabase' | 'logs' | 'gdrive'>(initialTab || 'bulk');
  const [previewData, setPreviewData] = useState<Employee[]>([]);
  const [selectedForExport, setSelectedForExport] = useState<Set<string>>(new Set(employees.map(e => e.id)));
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Supabase Config State
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseKey, setSupabaseKey] = useState('');
  const [supabaseBucket, setSupabaseBucket] = useState('records');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // Google Drive State
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveUser, setDriveUser] = useState<any>(null);
  const [isLoggingInDrive, setIsLoggingInDrive] = useState(false);

  // Activity Log State
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [logFilter, setLogFilter] = useState<'ALL' | 'ADD' | 'MODIFY' | 'DELETE' | 'IMPORT' | 'CLEAR'>('ALL');

  useEffect(() => {
    if (activeTab === 'supabase') {
      checkSupabaseStatus().then(status => {
        setSupabaseStatus(status);
        if (status.connected) {
          if (status.supabaseUrl) setSupabaseUrl(status.supabaseUrl);
          if (status.supabaseBucket) setSupabaseBucket(status.supabaseBucket);
        }
      });
    } else if (activeTab === 'gdrive') {
      initDriveAuth(
        (user) => {
          setDriveUser(user);
          setIsDriveConnected(true);
        },
        () => {
          setDriveUser(null);
          setIsDriveConnected(false);
        }
      );
    } else if (activeTab === 'logs') {
      setLogs(getActivityLogs());
    }
  }, [activeTab]);

  const handleDriveLogin = async () => {
    setIsLoggingInDrive(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setDriveUser(result.user);
        setIsDriveConnected(true);
        window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { 
          detail: { connected: true, provider: 'gdrive', user: result.user } 
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setIsLoggingInDrive(false);
    }
  };

  const handleDriveLogout = async () => {
    try {
      await driveLogout();
      setIsDriveConnected(false);
      setDriveUser(null);
      window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { 
        detail: { connected: false, provider: 'gdrive' } 
      }));
    } catch (err: any) {
      setError(err.message || 'Failed to logout');
    }
  };

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
            id="tab-supabase"
            aria-controls="panel-supabase"
            aria-selected={activeTab === 'supabase'} 
            onClick={() => setActiveTab('supabase')} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'supabase' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <Cloud size={16}/> Supabase
          </button>
          <button 
            role="tab" 
            id="tab-gdrive"
            aria-controls="panel-gdrive"
            aria-selected={activeTab === 'gdrive'} 
            onClick={() => setActiveTab('gdrive')} 
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'gdrive' ? 'border-[var(--gold)] text-[var(--navy)]' : 'border-transparent text-gray-500'}`}
          >
            <UploadCloud size={16}/> Google Drive
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

          {activeTab === 'supabase' && (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="font-bold text-[var(--navy)] flex items-center gap-2 mb-2 text-sm">
                  <Cloud size={18} className="text-indigo-500" />
                  System-Wide Supabase Storage
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Establish a single, hardcoded Supabase connection. Once set up, all scanned employee documents
                  will save directly to your organization's Supabase Storage bucket. All users can instantly upload and access
                  files securely through our server-side proxy.
                </p>
              </div>

              {supabaseStatus?.connected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                    <div className="p-2 bg-emerald-500 text-white rounded-full">
                      <Check size={16} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-emerald-800 text-sm">System Storage Active</div>
                      <div className="text-xs text-emerald-700">
                        <span className="font-medium">Supabase URL:</span>{' '}
                        <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{supabaseStatus.supabaseUrl}</code>
                      </div>
                      <div className="text-xs text-emerald-700">
                        <span className="font-medium">Target Bucket Name:</span>{' '}
                        <code className="bg-emerald-100 px-1 py-0.5 rounded font-mono">{supabaseStatus.supabaseBucket || 'records'}</code>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200/50 text-xs text-blue-800 space-y-1.5 font-sans">
                    <div className="font-bold flex items-center gap-1.5 text-blue-900">
                      <Shield size={14} /> Security and Authorization
                    </div>
                    <p>
                      Files are securely uploaded server-to-server using encrypted credentials in your database.
                      Remember to create the storage bucket inside your Supabase project before uploading any files.
                    </p>
                  </div>

                  <button
                    onClick={async () => {
                      if (confirm('Are you sure you want to unlink the system Supabase storage? Scanned files will no longer back up to Supabase.')) {
                        try {
                          await unlinkSupabase();
                          const status = await checkSupabaseStatus();
                          setSupabaseStatus(status);
                          setError(null);
                        } catch (err: any) {
                          setError(err.message || 'Failed to unlink');
                        }
                      }
                    }}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors text-sm"
                  >
                    Disconnect Supabase Storage
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Configure System Connection</div>
                  
                  <div className="space-y-3">
                    <div className="space-y-1 font-sans">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Supabase Project URL
                      </label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        placeholder="https://your-project-id.supabase.co"
                        className="w-full border p-2.5 rounded text-xs focus:ring-1 focus:ring-[var(--gold)] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1 font-sans">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Supabase API Key / Service Role Key
                      </label>
                      <input
                        type="password"
                        value={supabaseKey}
                        onChange={(e) => setSupabaseKey(e.target.value)}
                        placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                        className="w-full border p-2.5 rounded text-xs focus:ring-1 focus:ring-[var(--gold)] focus:outline-none font-mono"
                      />
                    </div>

                    <div className="space-y-1 font-sans">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                        Supabase Storage Bucket Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={supabaseBucket}
                        onChange={(e) => setSupabaseBucket(e.target.value)}
                        placeholder="records"
                        className="w-full border p-2.5 rounded text-xs focus:ring-1 focus:ring-[var(--gold)] focus:outline-none font-mono"
                      />
                      <p className="text-[10px] text-slate-500 font-sans">
                        Defaults to 'records'. Make sure this bucket is created in your Supabase storage.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!supabaseUrl.trim() || !supabaseKey.trim()) {
                        setError('Please provide both the Supabase Project URL and API key.');
                        return;
                      }
                      setIsSavingConfig(true);
                      setError(null);
                      try {
                        await saveSupabaseConfig(supabaseUrl, supabaseKey, supabaseBucket || 'records');
                        const status = await checkSupabaseStatus();
                        setSupabaseStatus(status);
                        setSupabaseKey('');
                        // Trigger a custom event so other components update immediately
                        window.dispatchEvent(new CustomEvent('gers_drive_status_changed', { detail: status }));
                      } catch (err: any) {
                        setError(err.message || 'Invalid credentials or network error');
                      } finally {
                        setIsSavingConfig(false);
                      }
                    }}
                    disabled={isSavingConfig}
                    className="w-full py-2.5 bg-[var(--navy)] text-white font-bold rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex justify-center items-center gap-2 text-sm"
                  >
                    {isSavingConfig ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Key size={16} />}
                    {isSavingConfig ? 'Saving Configuration...' : 'Save Supabase Credentials'}
                  </button>

                  <div className="bg-slate-100 p-4 rounded-lg border text-xs text-slate-600 space-y-2 font-sans">
                    <div className="font-bold text-slate-700 flex items-center gap-1">
                      <HelpCircle size={14} /> Quick Setup Guide
                    </div>
                    <ol className="list-decimal pl-4 space-y-1 text-slate-500">
                      <li>Go to the <a href="https://supabase.com/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Supabase Dashboard</a>.</li>
                      <li>Create or select your project.</li>
                      <li>Go to <strong className="text-slate-700">Project Settings &gt; API</strong> and copy the <strong className="text-slate-700">Project URL</strong>.</li>
                      <li>Copy the <strong className="text-slate-700">service_role</strong> API Key (or <strong className="text-slate-700">anon</strong> key if your bucket is public and has no restriction policy).</li>
                      <li>Go to <strong className="text-slate-700">Storage</strong>, create a new bucket (e.g. named <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[10px]">records</code>) and ensure it's set up with appropriate access.</li>
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

          {activeTab === 'gdrive' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-bold text-blue-900 flex items-center gap-2 mb-2 text-sm">
                  <UploadCloud size={18} className="text-blue-500" />
                  Google Drive Storage Integration
                </h3>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Connect your Google Drive account to use it as the primary storage for employee photos and scanned documents. 
                  Files will be saved in a dedicated folder and accessible across all your devices.
                </p>
              </div>

              {isDriveConnected ? (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                    {driveUser?.photoURL ? (
                      <img src={driveUser.photoURL} alt="" className="w-10 h-10 rounded-full border border-emerald-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="p-2 bg-emerald-500 text-white rounded-full">
                        <Check size={16} />
                      </div>
                    )}
                    <div className="space-y-1 flex-1">
                      <div className="font-bold text-emerald-800 text-sm">Connected as {driveUser?.displayName || 'Google User'}</div>
                      <div className="text-xs text-emerald-700 font-mono">{driveUser?.email}</div>
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        Drive API Active
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-2">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 uppercase tracking-wider">
                      <Shield size={14} /> Permissions Info
                    </div>
                    <p>
                      The application has permission to see, create, and delete its own files (drive.file scope). 
                      It cannot access other files in your Google Drive unless they were created by this app.
                    </p>
                  </div>

                  <button
                    onClick={handleDriveLogout}
                    className="w-full py-2.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 font-bold rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <LogOut size={16} />
                    Disconnect Google Drive
                  </button>
                </div>
              ) : (
                <div className="space-y-6 flex flex-col items-center py-8">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-2 shadow-inner">
                    <UploadCloud size={32} />
                  </div>
                  <div className="text-center space-y-2 max-w-sm">
                    <h3 className="font-bold text-[var(--navy)]">Not Connected</h3>
                    <p className="text-xs text-slate-500">
                      Sign in with your Google account to enable secure document storage on Google Drive.
                    </p>
                  </div>

                  <button
                    onClick={handleDriveLogin}
                    disabled={isLoggingInDrive}
                    className="gsi-material-button w-full max-w-xs"
                    style={{ width: '100%', maxWidth: '300px' }}
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper">
                      <div className="gsi-material-button-icon">
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">
                        {isLoggingInDrive ? 'Signing in...' : 'Sign in with Google'}
                      </span>
                    </div>
                  </button>

                  <div className="bg-slate-50 p-4 rounded-lg border text-[10px] text-slate-500 space-y-2 max-w-sm text-center">
                    <p>
                      By connecting, you allow this application to read, create, and delete only the files it creates in your Google Drive.
                    </p>
                  </div>
                </div>
              )}
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
