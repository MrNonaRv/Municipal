const fs = require('fs');
let content = fs.readFileSync('src/components/EditModal.tsx', 'utf8');

// 1. Remove selectedFile state entirely
content = content.replace(/  const \[selectedFile, setSelectedFile\] = useState<File \| null>\(null\);\n/g, '');
content = content.replace(/  const \[selectedFileData, setSelectedFileData\] = useState<string \| null>\(null\);\n/g, '');
content = content.replace(/  const \[newDocName, setNewDocName\] = useState\(''\);\n/g, '');

// 2. Rewrite handleAttachmentFileChange
const newHandler = `  const handleAttachmentFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploadingToDrive(true);
      setError(null);
      let newAttachments: Attachment[] = [];

      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        if (uploadDestination === 'local' && file.size > 2 * 1024 * 1024 && !file.type.startsWith('image/')) {
          setError(\`\${file.name} must be smaller than 2MB for local storage.\`);
          continue;
        }

        try {
          if (file.type.startsWith('image/')) {
            try {
              file = await convertImageToPDF(file, file.name);
            } catch (pdfErr) {
              console.warn("Failed to convert image to PDF", pdfErr);
            }
          }
          const base64 = await fileToBase64(file);
          const docName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;

          const ext = file.name.split('.').pop() || 'png';
          const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
          const sanitizedDoc = docName.trim().replace(/[^a-zA-Z0-9]/g, '_');
          const autoFileName = \`GERS_\${sanitizedSur}_\${sanitizedFirst}_Doc_\${sanitizedDoc}_\${Date.now()}.\${ext}\`;
          
          if (uploadDestination === 'drive') {
            const folderName = \`\${(formData.surname || 'Employee').trim()}_\${(formData.firstName || 'Record').trim()}_\${formData.id || 'Unknown'}\`;
            let driveResult = await uploadFileToDrive(file, autoFileName, file.type, folderName);
            newAttachments.push({
              id: 'drive-' + driveResult.id,
              name: docName.trim(),
              fileName: driveResult.name,
              fileType: file.type,
              fileData: '',
              uploadedAt: new Date().toISOString(),
              driveFileId: driveResult.id,
              driveWebViewLink: driveResult.webViewLink,
              driveWebContentLink: driveResult.webContentLink,
              storageProvider: 'gdrive'
            });
          } else {
            newAttachments.push({
              id: 'doc-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              name: docName.trim(),
              fileName: autoFileName,
              fileType: file.type,
              fileData: base64,
              uploadedAt: new Date().toISOString()
            });
          }
        } catch (err: any) {
          console.error("Failed to upload " + file.name, err);
          setError(\`Failed to upload \${file.name}: \${err.message || err}\`);
        }
      }

      setFormData(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
      }));

      if (fileInputRef.current) fileInputRef.current.value = '';
      setIsUploadingToDrive(false);
    }
  };`;

content = content.replace(/  const handleAttachmentFileChange = async \([\s\S]*?\n  \};\n/g, newHandler + '\n');

// Remove handleAddAttachment
content = content.replace(/  const handleAddAttachment = async \(\) => \{[\s\S]*?    \}[\s\n]*  \};\n/g, '');

// Simplify the UI
const oldUI = `                      <div className="space-y-4">
                        {/* Unified Row: Name and File Selector */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="data-label text-[10px] uppercase font-bold tracking-wider text-slate-500">Document Name / Label</label>
                            <input
                              type="text"
                              placeholder="e.g. Birth Certificate, Diploma, Contract"
                              value={newDocName}
                              onChange={e => setNewDocName(e.target.value)}
                              className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-[var(--gold)] focus:border-[var(--gold)] bg-white h-10"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="data-label text-[10px] uppercase font-bold tracking-wider text-slate-500">Scanned Document File</label>
                            <div className="flex gap-3">
                              <input
                                type="file"
                                accept="image/*,application/pdf"
                                onChange={handleAttachmentFileChange}
                                ref={fileInputRef}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full px-4 py-2 border-2 border-dashed border-slate-300 rounded-lg hover:border-[var(--gold)] transition-colors text-xs text-slate-500 hover:text-slate-700 flex items-center justify-center gap-2 bg-white h-10 truncate"
                              >
                                <FileText size={16} className="shrink-0" />
                                <span className="truncate">{selectedFile ? selectedFile.name : "Select Image/Scan File"}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Auto-detected Destination Status Indicator */}
                        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400 font-medium">
                          <div className={\`w-1.5 h-1.5 rounded-full \${isDriveConnected && uploadDestination === 'drive' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}\`} />
                          {isDriveConnected && uploadDestination === 'drive' ? (
                            <span className="flex items-center gap-1">
                              <strong>Background Sync Active:</strong> Newly selected files are pushed directly to <strong className="text-indigo-600 font-semibold">Google Drive</strong>.
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              System auto-detected offline/unlinked. Saving to <strong className="text-amber-600 font-semibold">Local Storage</strong> {!isDriveConnected ? "(Storage unlinked)" : "(Offline mode)"}.
                            </span>
                          )}
                        </div>

                        {/* File Naming Preview Box */}
                        {selectedFile && (
                          <div className="bg-slate-100/80 border border-slate-200 rounded-xl p-3 mt-2 text-xs">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block mb-1">✨ Automatic Standardized Filename Preview:</span>
                            <div className="font-mono text-[10px] text-indigo-600 font-bold break-all flex items-center gap-1.5 bg-white p-2 rounded-lg border border-slate-200">
                              <FileText size={12} className="text-indigo-500 shrink-0" />
                              {(() => {
                                const ext = selectedFile.name.split('.').pop() || 'png';
                                const sanitizedSur = (formData.surname || 'Employee').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                const sanitizedFirst = (formData.firstName || 'Record').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                const sanitizedDoc = (newDocName || 'Doc').trim().replace(/[^a-zA-Z0-9]/g, '_');
                                return \`GERS_\${sanitizedSur}_\${sanitizedFirst}_Doc_\${sanitizedDoc}_[timestamp].\${ext}\`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>

                      {!isDriveConnected && (
                        <p className="mt-3 text-[9px] text-amber-500 italic">💡 Connect Cloud Storage in the Data Center to enable automated cloud storage with automatic file naming.</p>
                      )}
                      {isDriveConnected && uploadDestination === 'drive' && (
                        <p className="mt-3 text-[9px] text-indigo-500 italic">✨ <strong>Sync Service:</strong> Files are automatically pushed to your Google Drive upon selection.</p>
                      )}
                      {isDriveConnected && uploadDestination === 'local' && (
                        <p className="mt-3 text-[9px] text-amber-500 italic">⚠️ Offline mode detected. File will be automatically saved locally and synchronized online later.</p>
                      )}
                        
                      <div className="mt-4 flex justify-end">
                        <button
                          type="button"
                          onClick={handleAddAttachment}
                          disabled={isUploadingToDrive || !newDocName.trim() || !selectedFile || (uploadDestination === 'local' && !selectedFileData)}
                          className="px-6 py-2 bg-[var(--gold)] text-[var(--navy)] text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-opacity-95 transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
                        >
                          {isUploadingToDrive ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Uploading to Drive...
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Add Document
                            </>
                          )}
                        </button>
                      </div>`;

const newUI = `                      <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                          <input
                            type="file"
                            accept="image/*,application/pdf"
                            multiple
                            onChange={handleAttachmentFileChange}
                            ref={fileInputRef}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploadingToDrive}
                            className="w-full px-4 py-8 border-2 border-dashed border-[var(--gold)] rounded-lg hover:bg-[var(--gold)]/10 transition-colors text-xs text-[var(--navy)] font-bold flex flex-col items-center justify-center gap-2 bg-white disabled:opacity-50"
                          >
                            {isUploadingToDrive ? (
                                <><Loader2 size={24} className="animate-spin text-[var(--gold-dark)]" /> Uploading...</>
                            ) : (
                                <><Plus size={24} className="text-[var(--gold-dark)]" /> Click to Select Multiple Documents</>
                            )}
                          </button>
                        </div>

                        {/* Auto-detected Destination Status Indicator */}
                        <div className="flex items-center gap-2 px-1 text-[10px] text-slate-400 font-medium">
                          <div className={\`w-1.5 h-1.5 rounded-full \${isDriveConnected && uploadDestination === 'drive' ? 'bg-indigo-500 animate-pulse' : 'bg-amber-500'}\`} />
                          {isDriveConnected && uploadDestination === 'drive' ? (
                            <span className="flex items-center gap-1">
                              <strong>Background Sync Active:</strong> Files are pushed directly to <strong className="text-indigo-600 font-semibold">Google Drive</strong>.
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              System auto-detected offline/unlinked. Saving to <strong className="text-amber-600 font-semibold">Local Storage</strong>.
                            </span>
                          )}
                        </div>
                      </div>`;

content = content.replace(oldUI, newUI);

// 3. Remove "if (selectedFile && newDocName.trim())" block from handleSaveClick
content = content.replace(/    if \(selectedFile && newDocName\.trim\(\)\) \{[\s\S]*?    \}\n\n    setError\(null\);\n    onSave\(finalFormData\);/m, '    setError(null);\n    onSave(finalFormData);');


// 4. For displaying content without clicking eye logo, just inline preview or thumbnail
const oldListDoc = `                            <div className="w-12 h-12 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-500 overflow-hidden shrink-0">
                              {doc.driveFileId ? (
                                <Cloud size={24} className="text-indigo-600 animate-pulse" />
                              ) : doc.fileType.startsWith('image/') ? (
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                              ) : (
                                <FileText size={20} className="text-indigo-500" />
                              )}
                            </div>`;
const newListDoc = `                            <div className="w-32 h-32 rounded-lg bg-slate-50 flex items-center justify-center text-indigo-500 overflow-hidden shrink-0 border border-slate-200">
                              {doc.fileData && doc.fileType.startsWith('image/') ? (
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                              ) : doc.fileData && doc.fileType === 'application/pdf' ? (
                                <iframe src={doc.fileData} className="w-full h-full" />
                              ) : doc.driveFileId ? (
                                <Cloud size={32} className="text-indigo-600" />
                              ) : (
                                <FileText size={32} className="text-indigo-500" />
                              )}
                            </div>`;
content = content.replace(oldListDoc, newListDoc);
fs.writeFileSync('src/components/EditModal.tsx', content);
