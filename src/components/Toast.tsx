import React, { useEffect } from 'react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface Props {
  toasts: ToastMessage[];
  removeToast: (id: string) => void;
}

export default function ToastContainer({ toasts, removeToast }: Props) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <div key={toast.id} className="bg-[var(--navy)] text-white px-4 py-3 rounded shadow-lg border-l-4 border-[var(--gold)] flex items-center justify-between min-w-[250px] animate-in slide-in-from-bottom-5">
          <span>{toast.message}</span>
          <button onClick={() => removeToast(toast.id)} aria-label="Close toast" className="ml-4 text-gray-300 hover:text-white">&times;</button>
        </div>
      ))}
    </div>
  );
}
