const fs = require('fs');

let content = fs.readFileSync('src/components/ProfileModal.tsx', 'utf8');

const injectionPoint = `{activeTab === 'docs' && (`;

const srTabContent = `              {activeTab === 'sr' && (
                <motion.div 
                  key="sr"
                  id="panel-sr"
                  role="tabpanel"
                  aria-labelledby="tab-sr"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="paper-texture mx-auto shadow-[0_50px_100px_-20px_rgba(0,0,0,0.3)] relative rounded-sm overflow-hidden shrink-0" 
                  style={{ 
                    width: '210mm', 
                    minHeight: '297mm', 
                    padding: '20mm',
                    transform: \`scale(\${scale})\`,
                    transformOrigin: 'top center',
                    marginBottom: scale < 1 ? \`calc((297mm * \${1 - scale}) * -1)\` : undefined,
                  }}
                >
                  {/* Staple Marks */}
                  <div className="absolute top-4 left-4 w-8 h-1 bg-slate-400/30 rounded-full rotate-[-5deg] z-50 no-print"></div>
                  <div className="absolute top-6 left-4 w-8 h-1 bg-slate-400/20 rounded-full rotate-[2deg] z-50 no-print"></div>
                  <div className="absolute top-4 right-4 w-8 h-1 bg-slate-400/30 rounded-full rotate-[15deg] z-50 no-print"></div>

                  {/* Confidential Stamp */}
                  <div className="absolute top-10 right-10 z-50 pointer-events-none select-none">
                    <motion.div 
                      initial={{ scale: 2, opacity: 0, rotate: -30 }}
                      animate={{ scale: 1, opacity: 0.6, rotate: -12 }}
                      transition={{ delay: 0.5, type: 'spring', damping: 12 }}
                      className="stamp stamp-red text-2xl px-6 py-2 border-[6px]"
                    >
                      CONFIDENTIAL
                    </motion.div>
                  </div>

                  {/* Verified Seal */}
                  <div className="absolute bottom-20 left-10 z-50 pointer-events-none select-none opacity-40">
                    <div className="stamp stamp-blue text-xs tracking-tighter">
                      OFFICIALLY VERIFIED<br/>
                      BY HRMO OFFICE<br/>
                      {new Date().toLocaleDateString()}
                    </div>
                  </div>

                  {/* Watermark */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] overflow-hidden">
                    <Users size={800} className="text-[var(--navy)] rotate-12" />
                  </div>
                  
                  <div className="relative z-10 w-full text-black">
                    <div className="text-center mb-6">
                      <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-slate-500 leading-tight">Republic of the Philippines</p>
                      <p className="text-xs uppercase font-extrabold tracking-[0.1em] text-slate-700 leading-normal">MUNICIPALITY OF MAMBUSAO • PROVINCE OF CAPIZ</p>
                      <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase mt-4 mb-1">file record sheet</h2>
                      <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 italic">Official Permanent Service Record</p>
                      <div className="w-16 h-1 bg-slate-900 mx-auto mt-4"></div>
                    </div>
                    
                    {/* Header metadata summary strip */}
                    <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-300 rounded-2xl mb-6 text-left">
                      <div>
                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Employee Surname</span>
                        <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.surname || '—'}</strong>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Given & Middle Name</span>
                        <strong className="text-sm font-extrabold text-slate-900 uppercase block">{employee.firstName} {employee.middleName || ''}</strong>
                      </div>
                      <div>
                        <span className="text-[8px] uppercase font-black text-slate-500 tracking-widest block">Dossier Account ID</span>
                        <strong className="text-sm font-mono text-slate-600 block">EMP-{employee.id.toString().padStart(6, '0')}</strong>
                      </div>
                    </div>

                    <p className="text-[10px] text-justify leading-relaxed mb-4 text-slate-600 italic">
                      This is to certify that the employee named herein has rendered services in this Government Unit as itemized below in chronological sequence, supported by authorized appointments:
                    </p>

                    {/* Records Table */}
                    <div className="border border-slate-300 rounded-xl overflow-hidden">
                      <table className="w-full border-collapse border border-slate-300 text-[10px] leading-normal text-center bg-white">
                        <thead>
                          <tr className="bg-slate-50 text-slate-850 font-extrabold uppercase border-b border-slate-300">
                            <th className="border border-slate-300 px-2 py-2 text-[9px] w-12 text-slate-500 font-bold">S.N.</th>
                            <th className="border border-slate-300 px-2 py-2 w-24">inclusive from</th>
                            <th className="border border-slate-300 px-2 py-2 w-24">inclusive to</th>
                            <th className="border border-slate-300 px-2 py-2 text-left">designation / title</th>
                            <th className="border border-slate-300 px-2 py-2 w-24">appointment status</th>
                            <th className="border border-slate-300 px-2 py-2 text-right">annual salary rate</th>
                            <th className="border border-slate-300 px-2 py-2 text-left">station / place of assignment</th>
                            <th className="border border-slate-300 px-2 py-2 w-20">office branch</th>
                            <th className="border border-slate-300 px-2 py-2 w-16">l/v w/o pay</th>
                            <th className="border border-slate-300 px-2 py-2 w-20">separation date</th>
                            <th className="border border-slate-300 px-2 py-2 text-left">cause of separation</th>
                          </tr>
                        </thead>
                        <tbody>
                          {employee.serviceRecords.map((rec, i) => (
                            <tr key={i} className="border-b border-slate-200">
                              <td className="border border-slate-300 px-2 py-2 font-bold font-mono text-center text-[9px] text-slate-400 bg-slate-50/50">
                                {i + 1}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                                {rec.from}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                                {rec.to}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-left uppercase font-bold text-slate-800 break-words font-sans max-w-[150px]">
                                {rec.designation}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center uppercase font-semibold text-slate-605 text-[8.5px]">
                                {rec.status}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-right font-mono font-bold text-slate-700 whitespace-nowrap">
                                {rec.salary}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-left uppercase font-medium text-slate-600 break-words font-sans max-w-[180px]">
                                {rec.station || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center uppercase font-medium text-slate-600 break-words font-sans max-w-[120px]">
                                {rec.branch || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono font-bold text-slate-500">
                                {rec.lwop || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-center font-mono text-[9px] font-semibold text-slate-600 whitespace-nowrap">
                                {rec.sepDate || '—'}
                              </td>
                              <td className="border border-slate-300 px-2 py-2 text-left uppercase font-medium text-slate-550 break-words font-sans max-w-[130px]">
                                {rec.sepCause || '—'}
                              </td>
                            </tr>
                          ))}
                          {employee.serviceRecords.length === 0 && (
                            <tr>
                              <td colSpan={11} className="border border-slate-300 p-8 text-slate-400 italic text-xs text-center">
                                No service records found in official database.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
              {activeTab === 'docs' && (`;

content = content.replace(injectionPoint, srTabContent);
fs.writeFileSync('src/components/ProfileModal.tsx', content);

