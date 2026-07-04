import React, { useEffect, useState } from 'react';
import { X, RefreshCw, Wifi, WifiOff, AlertTriangle, CheckCircle, Info, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { getSyncHistory, SyncHistoryEvent } from '../services/db';

interface Props {
  onClose: () => void;
}

export default function SyncHistoryModal({ onClose }: Props) {
  const [history, setHistory] = useState<SyncHistoryEvent[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setHistory(getSyncHistory());

    const handleHistoryChange = () => {
      setHistory(getSyncHistory());
    };

    window.addEventListener('gers_sync_history_change', handleHistoryChange);
    return () => {
      window.removeEventListener('gers_sync_history_change', handleHistoryChange);
    };
  }, []);

  const toggleEventStack = (eventId: string) => {
    setExpandedEvents(prev => ({
      ...prev,
      [eventId]: !prev[eventId]
    }));
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'SYNC_START': return <RefreshCw size={14} className="text-blue-500" />;
      case 'SYNC_SUCCESS': return <CheckCircle size={14} className="text-emerald-500" />;
      case 'SYNC_ERROR': return <AlertTriangle size={14} className="text-rose-500" />;
      case 'SYNC_ITEM_SUCCESS': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'SYNC_ITEM_ERROR': return <AlertTriangle size={14} className="text-amber-500" />;
      case 'ONLINE_STATUS_CHANGE': return <Wifi size={14} className="text-indigo-500" />;
      default: return <Info size={14} className="text-slate-400" />;
    }
  };

  const renderDetails = (event: SyncHistoryEvent) => {
    if (!event.details) return null;

    // Check if details is a structured error object
    const isObject = typeof event.details === 'object' && event.details !== null;
    if (isObject) {
      const { errorCode, message, stack, url, method } = event.details;
      const isExpanded = !!expandedEvents[event.id];

      return (
        <div className="mt-2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-3">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {method && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono uppercase">
                {method}
              </span>
            )}
            {url && (
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded break-all select-all">
                {url}
              </span>
            )}
            {errorCode && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                errorCode === 'NETWORK_ERROR' 
                  ? 'bg-amber-100 text-amber-700' 
                  : 'bg-rose-100 text-rose-700'
              }`}>
                CODE: {errorCode}
              </span>
            )}
          </div>
          
          <p className="text-slate-700 font-medium mb-1">{message || 'An error occurred during synchronization.'}</p>
          
          {stack && (
            <div className="mt-2">
              <button
                onClick={() => toggleEventStack(event.id)}
                className="flex items-center gap-1 text-[10px] font-bold text-[var(--navy)] hover:text-blue-700 transition-colors uppercase tracking-wider focus:outline-none"
              >
                <Terminal size={12} />
                {isExpanded ? 'Hide Stack Trace' : 'View Stack Trace'}
                {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              
              {isExpanded && (
                <pre className="mt-2 font-mono text-[10px] leading-relaxed overflow-x-auto whitespace-pre p-3 bg-slate-900 text-slate-300 rounded-lg max-h-48 border border-slate-800 shadow-inner scrollbar-thin select-all break-all">
                  {stack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    // Fallback for flat strings
    return (
      <p className="text-xs text-rose-600 mt-1 font-mono bg-rose-50 p-2 rounded border border-rose-100 break-all">
        {event.details}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 bg-[var(--navy)]/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="bg-[var(--navy)] text-white px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-[var(--gold)]">
              <RefreshCw size={20} />
            </div>
            <div>
              <h2 className="font-playfair text-xl font-bold tracking-wide">Sync History</h2>
              <p className="text-xs text-slate-300 uppercase tracking-widest mt-0.5">Last 20 synchronization events</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <RefreshCw size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">No sync history available yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((event) => (
                <div key={event.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1">
                        {getIconForType(event.type)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{event.message}</p>
                        {renderDetails(event)}
                        <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-2 font-medium">
                          {new Date(event.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-bold px-2 py-1 bg-slate-100 text-slate-500 rounded">
                      {event.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-white border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-[var(--navy)] text-white text-sm font-bold rounded-lg hover:bg-[var(--navy-light)] transition-colors uppercase tracking-wider"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
