import React, { useState } from 'react';
import { ServiceRecord } from '../types/employee';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';

interface Props {
  records: ServiceRecord[];
  onChange: (records: ServiceRecord[]) => void;
}

export default function ServiceRecordEditor({ records, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ServiceRecord>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const newId = 'sr-' + Date.now().toString(36);
    const newRecord: ServiceRecord = {
      id: newId, from: '', to: '', designation: '', status: 'Perm.',
      salary: '', station: '', branch: '', lwop: '', sepDate: '', sepCause: ''
    };
    onChange([...records, newRecord]);
    setEditingId(newId);
    setEditForm(newRecord);
    setError(null);
  };

  const handleEdit = (rec: ServiceRecord) => {
    setEditingId(rec.id);
    setEditForm(rec);
    setError(null);
  };

  const handleSave = () => {
    if (!editingId) return;
    if (!editForm.from?.trim() || !editForm.to?.trim() || !editForm.designation?.trim()) {
      setError("From, To, and Designation are required.");
      return;
    }

    // Validate dates if 'to' is not 'Present'
    if (editForm.to.toLowerCase() !== 'present') {
      const fromDate = new Date(editForm.from);
      const toDate = new Date(editForm.to);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && toDate < fromDate) {
        setError("'To' date cannot be before 'From' date.");
        return;
      }
    }

    setError(null);
    onChange(records.map(r => r.id === editingId ? { ...r, ...editForm } as ServiceRecord : r));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    onChange(records.filter(r => r.id !== id));
    setDeletingId(null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[var(--navy)]">Service Records</h3>
        <button 
          type="button" 
          onClick={handleAdd} 
          aria-label="Add new service record entry"
          className="flex items-center gap-1 px-3 py-1.5 bg-[var(--navy)] text-white rounded text-sm hover:bg-opacity-90 transition-colors"
        >
          <Plus size={16} /> Add Entry
        </button>
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-700 uppercase text-xs border-b border-gray-200">
            <tr>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
              <th className="px-3 py-2">Designation</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Salary</th>
              <th className="px-3 py-2">Station</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-gray-500">No service records found.</td>
              </tr>
            )}
            {records.map(rec => (
              <React.Fragment key={rec.id}>
                {editingId === rec.id ? (
                  <tr className="bg-blue-50 border-b border-gray-200">
                    <td colSpan={7} className="p-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 mb-3">
                        <div>
                          <label htmlFor={`from-${rec.id}`} className="block text-xs text-gray-500 mb-1">From</label>
                          <input 
                            id={`from-${rec.id}`}
                            type="date" 
                            value={editForm.from || ''} 
                            onChange={e => setEditForm({...editForm, from: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`to-${rec.id}`} className="block text-xs text-gray-500 mb-1">To</label>
                          <input 
                            id={`to-${rec.id}`}
                            type="text" 
                            placeholder="YYYY-MM-DD or Present" 
                            value={editForm.to || ''} 
                            onChange={e => setEditForm({...editForm, to: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div className="col-span-1 md:col-span-2">
                          <label htmlFor={`designation-${rec.id}`} className="block text-xs text-gray-500 mb-1">Designation</label>
                          <input 
                            id={`designation-${rec.id}`}
                            type="text" 
                            value={editForm.designation || ''} 
                            onChange={e => setEditForm({...editForm, designation: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`status-${rec.id}`} className="block text-xs text-gray-500 mb-1">Status</label>
                          <select 
                            id={`status-${rec.id}`}
                            value={editForm.status || ''} 
                            onChange={e => setEditForm({...editForm, status: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm"
                          >
                            <option value="Perm.">Perm.</option>
                            <option value="Temp.">Temp.</option>
                            <option value="Prob.">Prob.</option>
                            <option value="Cos.">Cos.</option>
                            <option value="-do-">-do-</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor={`salary-${rec.id}`} className="block text-xs text-gray-500 mb-1">Salary</label>
                          <input 
                            id={`salary-${rec.id}`}
                            type="text" 
                            value={editForm.salary || ''} 
                            onChange={e => setEditForm({...editForm, salary: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`station-${rec.id}`} className="block text-xs text-gray-500 mb-1">Station/Place</label>
                          <input 
                            id={`station-${rec.id}`}
                            type="text" 
                            value={editForm.station || ''} 
                            onChange={e => setEditForm({...editForm, station: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`branch-${rec.id}`} className="block text-xs text-gray-500 mb-1">Branch</label>
                          <input 
                            id={`branch-${rec.id}`}
                            type="text" 
                            value={editForm.branch || ''} 
                            onChange={e => setEditForm({...editForm, branch: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`lwop-${rec.id}`} className="block text-xs text-gray-500 mb-1">L/V ABS W/O Pay</label>
                          <input 
                            id={`lwop-${rec.id}`}
                            type="text" 
                            value={editForm.lwop || ''} 
                            onChange={e => setEditForm({...editForm, lwop: e.target.value})} 
                            className="w-full border rounded px-2 py-1 text-sm" 
                          />
                        </div>
                        <div>
                          <label htmlFor={`sepDate-${rec.id}`} className="block text-xs text-gray-500 mb-1">Sep. Date/Cause</label>
                          <div className="flex gap-1">
                            <input 
                              id={`sepDate-${rec.id}`}
                              type="text" 
                              placeholder="Date" 
                              value={editForm.sepDate || ''} 
                              onChange={e => setEditForm({...editForm, sepDate: e.target.value})} 
                              className="w-1/2 border rounded px-2 py-1 text-sm" 
                              aria-label="Separation Date"
                            />
                            <input 
                              type="text" 
                              placeholder="Cause" 
                              value={editForm.sepCause || ''} 
                              onChange={e => setEditForm({...editForm, sepCause: e.target.value})} 
                              className="w-1/2 border rounded px-2 py-1 text-sm" 
                              aria-label="Separation Cause"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="text-red-600 text-xs font-medium" role="alert">{error}</div>
                        <div className="flex justify-end gap-2">
                          <button 
                            type="button" 
                            onClick={() => setEditingId(null)} 
                            aria-label="Cancel editing record"
                            className="flex items-center gap-1 px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                          >
                            <X size={14} /> Cancel
                          </button>
                          <button 
                            type="button" 
                            onClick={handleSave} 
                            aria-label="Save service record changes"
                            className="flex items-center gap-1 px-3 py-1 bg-[var(--green)] text-white rounded hover:bg-opacity-90"
                          >
                            <Check size={14} /> Save
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2">{rec.from}</td>
                    <td className="px-3 py-2">{rec.to}</td>
                    <td className="px-3 py-2 font-medium">{rec.designation}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        rec.status.includes('Perm') ? 'bg-green-100 text-green-800' : 
                        rec.status.includes('Temp') ? 'bg-amber-100 text-amber-800' : 
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {rec.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">{rec.salary}</td>
                    <td className="px-3 py-2">{rec.station}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => handleEdit(rec)} aria-label="Edit service record" className="text-blue-600 hover:text-blue-800" title="Edit">
                          <Edit2 size={16} />
                        </button>
                        <button type="button" onClick={() => setDeletingId(rec.id)} aria-label="Delete service record" className="text-red-600 hover:text-red-800" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
                {deletingId === rec.id && (
                  <tr className="bg-red-50 border-b border-red-100">
                    <td colSpan={7} className="px-3 py-2 text-center">
                      <span className="text-red-800 text-sm mr-4">Are you sure you want to delete this record?</span>
                      <button type="button" onClick={() => handleDelete(rec.id)} className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 mr-2">Yes, Delete</button>
                      <button type="button" onClick={() => setDeletingId(null)} className="px-3 py-1 bg-gray-200 text-gray-800 text-xs rounded hover:bg-gray-300">Cancel</button>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
