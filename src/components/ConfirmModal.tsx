import React from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel, isLoading = false }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 10 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h3 id="confirm-modal-title" className="text-xl font-bold text-[var(--navy)] mb-2">{title}</h3>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">{message}</p>
          
          <div className="flex flex-col gap-2">
            <button 
              onClick={onConfirm} 
              disabled={isLoading} 
              aria-label={isLoading ? "Confirming..." : "Confirm deletion of record"}
              className="w-full py-3 bg-[var(--danger)] hover:bg-red-700 text-white rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-red-500/20"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Confirm Destruction'
              )}
            </button>
            <button 
              onClick={onCancel} 
              disabled={isLoading} 
              aria-label="Cancel and go back"
              className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold uppercase tracking-widest text-[10px] transition-all disabled:opacity-50"
            >
              Abort Action
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
