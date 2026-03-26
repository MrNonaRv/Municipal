import React, { useEffect, useState, useMemo } from 'react';
import { Employee } from './types/employee';
import { dbGetAll, dbPut, dbDelete } from './services/db';
import { DEMO_EMPLOYEES } from './services/demoData';
import { generateEmptyEmployee } from './utils/helpers';
import EmployeeCard from './components/EmployeeCard';
import ProfileModal from './components/ProfileModal';
import EditModal from './components/EditModal';
import CSVModal from './components/CSVModal';
import ToastContainer from './components/Toast';
import ConfirmModal from './components/ConfirmModal';
import { useToast } from './hooks/useToast';
import { Users, FileSpreadsheet, Plus, Search, LayoutGrid, List, Printer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Modals state
  const [viewingEmp, setViewingEmp] = useState<Employee | null>(null);
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editTab, setEditTab] = useState<'personal' | 'family' | 'education' | 'service'>('personal');
  const [isCSVModalOpen, setIsCSVModalOpen] = useState(false);
  const [deletingEmp, setDeletingEmp] = useState<Employee | null>(null);

  const { toasts, addToast, removeToast } = useToast();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    setIsLoading(true);
    try {
      let data = await dbGetAll();
      if (data.length === 0) {
        // Seed demo data in parallel
        await Promise.all(DEMO_EMPLOYEES.map(emp => dbPut(emp)));
        data = await dbGetAll();
        addToast('Demo data loaded', 'info');
      }
      setEmployees(data);
    } catch (error) {
      console.error("Failed to load DB", error);
      addToast('Failed to load database', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (emp: Employee, isAutosave = false) => {
    if (!isAutosave) setIsSaving(true);
    try {
      await dbPut(emp);
      setEmployees(prev => {
        const idx = prev.findIndex(e => e.id === emp.id);
        if (idx >= 0) {
          const newArr = [...prev];
          newArr[idx] = emp;
          return newArr;
        }
        return [...prev, emp];
      });
      
      if (!isAutosave) {
        setEditingEmp(null);
        addToast('Record saved successfully', 'success');
      }
    } catch (error) {
      if (!isAutosave) addToast('Failed to save record', 'error');
    } finally {
      if (!isAutosave) setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEmp) return;
    setIsDeleting(true);
    try {
      await dbDelete(deletingEmp.id);
      setEmployees(prev => prev.filter(e => e.id !== deletingEmp.id));
      setDeletingEmp(null);
      if (viewingEmp?.id === deletingEmp.id) setViewingEmp(null);
      addToast('Record deleted', 'success');
    } catch (error) {
      addToast('Failed to delete record', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return employees.filter(emp => {
      const fullName = `${emp.firstName} ${emp.surname}`.toLowerCase();
      const latestDesignation = emp.serviceRecords.length > 0 
        ? emp.serviceRecords[emp.serviceRecords.length - 1].designation.toLowerCase()
        : '';
      return fullName.includes(q) || emp.id.toLowerCase().includes(q) || latestDesignation.includes(q);
    });
  }, [employees, searchQuery]);

  const permanentCount = useMemo(() => employees.filter(e => 
    e.serviceRecords.length > 0 && e.serviceRecords[e.serviceRecords.length - 1].status.toLowerCase().includes('perm')
  ).length, [employees]);

  const handlePrintSummary = () => {
    window.print();
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--navy)] text-white shadow-lg print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div 
              initial={{ rotate: -10, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              className="w-12 h-12 bg-[var(--gold)] rounded-xl flex items-center justify-center text-[var(--navy)] shadow-lg shadow-gold/20"
            >
              <Users size={28} />
            </motion.div>
            <div>
              <h1 className="font-playfair text-2xl font-bold tracking-tight flex items-center gap-3">
                GERS <span className="text-[var(--gold)] font-normal ml-2 hidden sm:inline">| Government Employee Record System</span>
                <span className="px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></span>
                  Local Storage Active
                </span>
              </h1>
              <p className="text-xs text-slate-400 uppercase tracking-widest font-medium hidden sm:block">Administrative Management Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsCSVModalOpen(true)}
              aria-label="Open import and export center"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--navy-light)] hover:bg-[var(--navy-lighter)] rounded-lg border border-white/10 text-sm font-medium transition-all hover:scale-105 active:scale-95"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden md:inline">Data Center</span>
            </button>
            <button 
              onClick={() => { setEditingEmp(generateEmptyEmployee()); setEditTab('personal'); }}
              aria-label="Add new employee"
              className="flex items-center gap-2 px-4 py-2 bg-[var(--gold)] hover:bg-[var(--gold-light)] text-[var(--navy)] rounded-lg text-sm font-bold shadow-lg shadow-gold/20 transition-all hover:scale-105 active:scale-95"
            >
              <Plus size={18} />
              <span className="hidden md:inline">New Record</span>
            </button>
          </div>
        </div>
      </header>

      {/* Stats Strip */}
      <div className="bg-white border-b border-slate-200 print:hidden">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-8 text-sm">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Records</span>
              <span className="font-mono text-lg font-bold text-[var(--navy)]">{employees.length}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Permanent</span>
              <span className="font-mono text-lg font-bold text-[var(--green)]">{permanentCount}</span>
            </div>
            {searchQuery && (
              <div className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Filtered</span>
                <span className="font-mono text-lg font-bold text-[var(--gold-dark)]">{filteredEmployees.length}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={handlePrintSummary}
              aria-label="Print summary of all records"
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-all"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print Summary</span>
            </button>
            <div className="relative w-64 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search records..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                aria-label="Search employees"
                className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100 border-transparent focus:bg-white focus:ring-2 focus:ring-[var(--gold)] focus:border-transparent transition-all text-sm"
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button 
                onClick={() => setViewMode('grid')}
                aria-label="Switch to grid view"
                aria-pressed={viewMode === 'grid'}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-[var(--navy)]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                aria-label="Switch to list view"
                aria-pressed={viewMode === 'list'}
                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-[var(--navy)]' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full print:hidden">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-96 gap-4">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[var(--gold)] rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-sm font-medium text-slate-500 animate-pulse">Accessing Secure Database...</p>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-32 bg-white rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Users className="text-slate-300" size={40} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 font-playfair">No Records Found</h3>
            <p className="text-slate-500 mt-2 max-w-xs mx-auto">We couldn't find any employees matching your current search criteria.</p>
            <button 
              onClick={() => setSearchQuery('')}
              className="mt-6 text-[var(--gold-dark)] font-bold hover:underline"
            >
              Clear all filters
            </button>
          </motion.div>
        ) : (
          <motion.div 
            layout
            className={viewMode === 'grid' 
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
              : "flex flex-col gap-4"
            }
          >
            <AnimatePresence mode="popLayout">
              {filteredEmployees.map(emp => (
                <motion.div
                  key={emp.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <EmployeeCard 
                    employee={emp} 
                    viewMode={viewMode}
                    onView={setViewingEmp}
                    onEdit={(emp) => { setEditingEmp(emp); setEditTab('personal'); }}
                    onDelete={setDeletingEmp}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Modals */}
      <AnimatePresence>
        {viewingEmp && (
          <ProfileModal 
            employee={viewingEmp} 
            onClose={() => setViewingEmp(null)} 
            onEdit={(emp, tab) => { setViewingEmp(null); setEditingEmp(emp); setEditTab(tab || 'personal'); }}
            onDelete={setDeletingEmp}
          />
        )}
        
        {editingEmp && (
          <EditModal 
            employee={editingEmp} 
            onClose={() => setEditingEmp(null)} 
            onSave={handleSave} 
            initialTab={editTab}
            isSaving={isSaving}
          />
        )}

        {isCSVModalOpen && (
          <CSVModal 
            employees={employees}
            onClose={() => setIsCSVModalOpen(false)} 
            onImport={async (imported) => {
              // Optimize: Parallel database writes
              await Promise.all(imported.map(emp => dbPut(emp)));
              await loadEmployees();
              setIsCSVModalOpen(false);
              addToast(`Imported ${imported.length} records`, 'success');
            }}
          />
        )}

        {deletingEmp && (
          <ConfirmModal 
            title="Delete Employee Record"
            message={`Are you sure you want to delete the record for ${deletingEmp.firstName} ${deletingEmp.surname}? This action cannot be undone.`}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeletingEmp(null)}
            isLoading={isDeleting}
          />
        )}
      </AnimatePresence>

      <ToastContainer toasts={toasts} removeToast={removeToast} />

      {/* Print Summary Table (Only visible when printing) */}
      <div className="hidden print:block p-8 bg-white text-black w-full">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-tighter">Government Employee Record System</h1>
          <p className="text-sm font-bold uppercase tracking-widest mt-1">Consolidated Personnel Summary Report</p>
          <p className="text-[10px] mt-2 italic">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        </div>
        
        <table className="w-full text-[10px] border-collapse border border-black">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-black p-2 text-left">Employee ID</th>
              <th className="border border-black p-2 text-left">Full Name</th>
              <th className="border border-black p-2 text-left">Sex</th>
              <th className="border border-black p-2 text-left">Civil Status</th>
              <th className="border border-black p-2 text-left">Latest Designation</th>
              <th className="border border-black p-2 text-left">Status</th>
              <th className="border border-black p-2 text-left">Station</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map(emp => {
              const latest = emp.serviceRecords.length > 0 ? emp.serviceRecords[emp.serviceRecords.length - 1] : null;
              return (
                <tr key={emp.id}>
                  <td className="border border-black p-2 font-mono">{emp.id}</td>
                  <td className="border border-black p-2 font-bold">{emp.surname}, {emp.firstName} {emp.middleName}</td>
                  <td className="border border-black p-2">{emp.sex}</td>
                  <td className="border border-black p-2">{emp.civilStatus}</td>
                  <td className="border border-black p-2">{latest?.designation || 'N/A'}</td>
                  <td className="border border-black p-2">{latest?.status || 'N/A'}</td>
                  <td className="border border-black p-2">{latest?.station || 'N/A'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-12 flex justify-between items-end">
          <div className="text-[8px] italic text-slate-500">
            Total Records: {filteredEmployees.length}<br />
            Permanent: {permanentCount}
          </div>
          <div className="text-center border-t border-black pt-2 px-8">
            <p className="text-[10px] font-bold uppercase">Authorized Personnel Signature</p>
            <p className="text-[8px] mt-1">Administrative Division</p>
          </div>
        </div>
      </div>
    </div>
  );
}
