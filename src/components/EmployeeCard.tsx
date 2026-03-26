import React from 'react';
import { Employee } from '../types/employee';
import { User, Briefcase, MapPin, Phone, Mail, Eye, Edit, Trash2, Calendar, DollarSign } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  employee: Employee;
  viewMode: 'grid' | 'list';
  onView: (emp: Employee) => void;
  onEdit: (emp: Employee) => void;
  onDelete: (emp: Employee) => void;
}

export default function EmployeeCard({ employee, viewMode, onView, onEdit, onDelete }: Props) {
  const latestSR = employee.serviceRecords.length > 0 
    ? employee.serviceRecords[employee.serviceRecords.length - 1] 
    : null;

  if (viewMode === 'list') {
    return (
      <motion.div 
        whileHover={{ x: 4 }}
        className="bg-white rounded-2xl p-4 flex items-center gap-6 shadow-sm border border-slate-200 hover:border-[var(--gold)] transition-all group"
      >
        <div className="w-16 h-16 rounded-xl bg-slate-50 overflow-hidden border border-slate-100 flex-shrink-0">
          {employee.photo ? (
            <img 
              src={employee.photo} 
              alt={`Photo of ${employee.firstName} ${employee.surname}`} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-50">
              <User size={24} />
            </div>
          )}
        </div>
        
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Full Name</span>
            <h3 className="font-bold text-slate-900 truncate">{employee.surname}, {employee.firstName}</h3>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Designation</span>
            <span className="text-sm text-slate-600 truncate font-medium">{latestSR?.designation || 'N/A'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Status</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full w-fit ${
              latestSR?.status.toLowerCase().includes('perm') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
            }`}>
              {latestSR?.status || 'N/A'}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">Salary</span>
            <span className="text-xs text-[var(--green)] font-mono font-bold">{latestSR?.salary || 'N/A'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
          <button 
            onClick={() => onView(employee)} 
            aria-label={`View dossier for ${employee.firstName} ${employee.surname}`}
            className="p-2 text-slate-400 hover:text-[var(--navy)] hover:bg-slate-100 rounded-lg transition-all" 
            title="View Dossier"
          >
            <Eye size={18} />
          </button>
          <button 
            onClick={() => onEdit(employee)} 
            aria-label={`Edit record for ${employee.firstName} ${employee.surname}`}
            className="p-2 text-slate-400 hover:text-[var(--gold-dark)] hover:bg-slate-100 rounded-lg transition-all" 
            title="Edit Record"
          >
            <Edit size={18} />
          </button>
          <button 
            onClick={() => onDelete(employee)} 
            aria-label={`Delete record for ${employee.firstName} ${employee.surname}`}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
            title="Delete Record"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 hover:border-[var(--gold)] transition-all flex flex-col group h-full relative"
    >
      <div className="relative h-48 bg-slate-900 overflow-hidden">
        {employee.photo ? (
          <img 
            src={employee.photo} 
            alt={`Photo of ${employee.firstName} ${employee.surname}`} 
            className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-700" 
            referrerPolicy="no-referrer" 
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950">
            <User size={64} className="text-slate-700" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
        <div className="absolute bottom-4 left-4 right-4">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--gold)] mb-1 block">Official Record</span>
          <h3 className="text-white font-playfair text-xl font-bold leading-tight truncate">
            {employee.surname}, {employee.firstName}
          </h3>
        </div>
        <div className="absolute top-4 right-4">
          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full backdrop-blur-md border ${
            latestSR?.status.toLowerCase().includes('perm') 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          }`}>
            {latestSR?.status || 'N/A'}
          </span>
        </div>
      </div>

      <div className="p-6 flex-1 flex flex-col gap-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <Briefcase size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Designation</span>
              <span className="text-xs font-bold truncate">{latestSR?.designation || 'Unassigned'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <MapPin size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Station</span>
              <span className="text-xs font-bold truncate">{latestSR?.station || 'No Station'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
              <DollarSign size={14} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Monthly Salary</span>
              <span className="text-xs font-bold truncate text-[var(--green)]">{latestSR?.salary || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100 flex items-center justify-between mt-auto">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400" title={employee.email}>
              <Mail size={12} />
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-400" title={employee.cellphone}>
              <Phone size={12} />
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => onView(employee)} 
              aria-label={`View dossier for ${employee.firstName} ${employee.surname}`}
              className="p-2.5 bg-slate-50 hover:bg-[var(--navy)] text-slate-400 hover:text-white rounded-xl transition-all"
              title="View Dossier"
            >
              <Eye size={16} />
            </button>
            <button 
              onClick={() => onEdit(employee)} 
              aria-label={`Edit record for ${employee.firstName} ${employee.surname}`}
              className="p-2.5 bg-slate-50 hover:bg-[var(--gold)] text-slate-400 hover:text-[var(--navy)] rounded-xl transition-all"
              title="Edit Record"
            >
              <Edit size={16} />
            </button>
            <button 
              onClick={() => onDelete(employee)} 
              aria-label={`Delete record for ${employee.firstName} ${employee.surname}`}
              className="p-2.5 bg-slate-50 hover:bg-red-500 text-slate-400 hover:text-white rounded-xl transition-all"
              title="Delete Record"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
