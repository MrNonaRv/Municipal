const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

// 1. Remove PDS related UI
content = content.replace(/\{employee\.pdsScan && \([\s\S]*?\{\/\* END PDS SCAN \*\/\}/g, '');
// And inside the grid
content = content.replace(
  /\{employee\.pdsScan && \([\s\S]*?\)\}\n\n\s*\{\(employee\.attachments/g,
  '{(employee.attachments'
);

content = content.replace(
  /\{\(employee\.attachments \|\| \[\]\)\.length === 0 && !employee\.pdsScan && \(/g,
  '{(employee.attachments || []).length === 0 && ('
);

// 2. Change the attachment rendering to show previews without needing to click
const oldAttachmentLoop = `                    {(employee.attachments || []).map((doc) => (
                      <div key={doc.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                            {doc.driveFileId ? (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow transition-transform hover:scale-110 mb-2"
                                  title="Preview document"
                                >
                                  <Eye size={20} />
                                </button>
                                <Cloud size={48} className="text-indigo-600 mb-2 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Stored on Google Drive</span>
                                {doc.driveWebViewLink && (
                                  <a
                                    href={doc.driveWebViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                                  >
                                    <ExternalLink size={10} /> Open in Drive
                                  </a>
                                )}
                              </div>
                            ) : doc.fileType.startsWith('image/') ? (
                              <>
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => setPreviewDoc(doc)}
                                    className="p-3 bg-white text-slate-800 rounded-full hover:bg-slate-100 shadow-xl transition-transform hover:scale-110"
                                  >
                                    <Eye size={20} />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <FileText size={48} className="text-slate-400 mb-4" />
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-slate-300 transition-colors"
                                >
                                  Open Preview
                                </button>
                              </div>
                            )}
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 mb-1">{doc.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate font-mono">{doc.fileName}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            {doc.driveFileId ? (
                              <button
                                onClick={() => handleRetrieveAttachment(doc)}
                                disabled={downloadingFileId === doc.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                              >
                                {downloadingFileId === doc.id ? (
                                  <><Loader2 size={12} className="animate-spin" /> Syncing...</>
                                ) : (
                                  <><Download size={12} /> Sync Local</>
                                )}
                              </button>
                            ) : (
                              <a
                                href={doc.fileData}
                                download={doc.fileName}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[var(--gold)] hover:text-[var(--navy)] text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors"
                              >
                                <Download size={12} /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}`;

const newAttachmentLoop = `                    {(employee.attachments || []).map((doc) => (
                      <div key={doc.id} className="border border-slate-200 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div>
                          <div className="w-full h-48 bg-slate-100 rounded-xl mb-4 border border-slate-200 flex items-center justify-center overflow-hidden relative group cursor-pointer" onClick={() => setPreviewDoc(doc)}>
                            {doc.fileData && doc.fileType.startsWith('image/') ? (
                                <img src={doc.fileData} alt={doc.name} className="w-full h-full object-cover" />
                            ) : doc.fileData && doc.fileType === 'application/pdf' ? (
                                <iframe src={doc.fileData} className="w-full h-full pointer-events-none" />
                            ) : doc.driveFileId ? (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <Cloud size={48} className="text-indigo-600 mb-2 animate-pulse" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Stored on Google Drive</span>
                                {doc.driveWebViewLink && (
                                  <a
                                    href={doc.driveWebViewLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-2 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-indigo-500 hover:text-indigo-700 transition-colors"
                                  >
                                    <ExternalLink size={10} /> Open in Drive
                                  </a>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center text-center p-4">
                                <FileText size={48} className="text-slate-400 mb-4" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-slate-900/0 hover:bg-slate-900/10 transition-colors" />
                          </div>
                          <h4 className="font-bold text-sm text-slate-800 mb-1 truncate">{doc.name}</h4>
                          <p className="text-[10px] text-slate-400 truncate font-mono">{doc.fileName}</p>
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {new Date(doc.uploadedAt).toLocaleDateString()}
                          </span>
                          <div className="flex gap-2">
                            {doc.driveFileId ? (
                              <button
                                onClick={() => handleRetrieveAttachment(doc)}
                                disabled={downloadingFileId === doc.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
                              >
                                {downloadingFileId === doc.id ? (
                                  <><Loader2 size={12} className="animate-spin" /> Syncing...</>
                                ) : (
                                  <><Download size={12} /> Sync Local</>
                                )}
                              </button>
                            ) : (
                              <a
                                href={doc.fileData}
                                download={doc.fileName}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-[var(--gold)] hover:text-[var(--navy)] text-slate-500 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors"
                              >
                                <Download size={12} /> Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}`;

content = content.replace(oldAttachmentLoop, newAttachmentLoop);
fs.writeFileSync('src/components/ProfileModal.tsx', content);

