import React, { useState, useEffect } from 'react';
import { Attachment } from '../types/employee';
import { X } from 'lucide-react';

interface PreviewModalProps {
  doc: Attachment;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({ doc, onClose }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (doc.driveFileId) return;
    if (!doc.fileData || doc.fileType !== 'application/pdf') return;
    
    let active = true;
    fetch(doc.fileData)
      .then(res => res.blob())
      .then(blob => {
        if (active) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(e => console.error(e));

    return () => {
      active = false;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [doc]);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 flex items-center justify-between border-b">
          <h3 className="font-bold text-lg">{doc.name}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-4 flex justify-center bg-slate-50">
          {doc.fileType.startsWith('image/') ? (
            <img 
              src={doc.fileData || doc.driveWebContentLink || doc.driveWebViewLink} 
              alt={doc.name} 
              className="max-w-full h-auto object-contain" 
            />
          ) : doc.fileType === 'application/pdf' ? (
             <iframe 
               src={doc.driveFileId ? `https://drive.google.com/file/d/${doc.driveFileId}/preview` : (blobUrl ? `${blobUrl}#view=FitH` : '')} 
               className="w-full h-[60vh]" 
               title={doc.name}
             />
          ) : doc.driveFileId ? (
             <iframe 
               src={`https://drive.google.com/file/d/${doc.driveFileId}/preview`} 
               className="w-full h-[60vh]" 
               title={doc.name}
             />
          ) : (
            <div className="p-8 text-center text-slate-500">
              <p>Preview not supported for file type: {doc.fileType}</p>
              <p className="text-xs mt-2">Please download to view this file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
