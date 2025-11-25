
import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, MoreVertical, BadgeCheck, UserCog, BarChart2, Users, Loader2, Key, ArrowUpCircle, AlertTriangle, Copy, Check, X, FileText, Eye, ChevronRight, ShieldCheck } from 'lucide-react';
import { Role, User, ComplianceDoc } from '../types';
import StaffAnalytics from '../components/StaffAnalytics';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, deleteDoc } from 'firebase/firestore';

const StaffPage = () => {
  const [activeTab, setActiveTab] = useState<'Directory' | 'Analytics'>('Directory');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'RoleRequest'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Staff Management Modal State
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  
  // Approval / Role State
  const [roleToAssign, setRoleToAssign] = useState<Role>(Role.FirstAider);

  // Credential Result State
  const [approvedCreds, setApprovedCreds] = useState<{name: string, id: string, pin: string} | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPin, setCopiedPin] = useState(false);

  useEffect(() => {
      fetchStaff();
  }, []);

  const fetchStaff = async () => {
      setIsLoading(true);
      try {
          const q = query(collection(db, 'users'), orderBy('name'));
          const snapshot = await getDocs(q);
          const users = snapshot.docs.map(d => d.data() as User);
          setStaffList(users);
      } catch (e) {
          console.error("Error fetching staff", e);
      } finally {
          setIsLoading(false);
      }
  };

  const generateEmployeeId = () => {
      const date = new Date();
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth() + 1).toString().padStart(2, '0');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      return `AMS${yy}${mm}${randomSuffix}`;
  };

  const generatePin = () => {
      const array = new Uint32Array(1);
      window.crypto.getRandomValues(array);
      return (array[0] % 10000).toString().padStart(4, '0');
  };

  const approveUser = async () => {
      if (!selectedStaff) return;
      if (!confirm(`Approve ${selectedStaff.name} as ${roleToAssign}?`)) return;
      
      try {
          const newId = generateEmployeeId();
          const newPin = generatePin();

          await updateDoc(doc(db, 'users', selectedStaff.uid), {
              status: 'Active',
              role: roleToAssign,
              employeeId: newId,
              pin: newPin
          });

          // Show the credentials modal so Manager can issue them
          setApprovedCreds({ name: selectedStaff.name, id: newId, pin: newPin });
          
          setSelectedStaff(null);
          fetchStaff();
      } catch (e) {
          console.error("Error approving user", e);
          alert("Failed to approve user.");
      }
  };

  const rejectUser = async () => {
      if (!selectedStaff) return;
      if (!confirm(`Reject ${selectedStaff.name}?`)) return;
      try {
          await updateDoc(doc(db, 'users', selectedStaff.uid), { status: 'Rejected' });
          setSelectedStaff(null);
          fetchStaff();
      } catch (e) {
          console.error("Error rejecting", e);
      }
  };

  const handleRoleChangeRequest = async (approve: boolean) => {
      if (!selectedStaff || !selectedStaff.roleChangeRequest) return;
      if (approve) {
          if (!confirm(`Promote to ${selectedStaff.roleChangeRequest.newRole}?`)) return;
          // Optionally regen ID for new role? Keeping same ID is usually better unless role changes department logic
          // For this system, we keep the ID.
          await updateDoc(doc(db, 'users', selectedStaff.uid), {
              role: selectedStaff.roleChangeRequest.newRole,
              roleChangeRequest: null
          });
      } else {
          await updateDoc(doc(db, 'users', selectedStaff.uid), {
              roleChangeRequest: { ...selectedStaff.roleChangeRequest, status: 'Rejected' }
          });
      }
      setSelectedStaff(null);
      fetchStaff();
  };

  const handleDocAction = async (docIndex: number, action: 'Verify' | 'Reject') => {
      if (!selectedStaff || !selectedStaff.compliance) return;
      
      const updatedCompliance = [...selectedStaff.compliance];
      const docItem = updatedCompliance[docIndex];
      
      if (action === 'Verify') {
          docItem.status = 'Valid';
      } else {
          docItem.status = 'Expired'; 
      }
      
      await updateDoc(doc(db, 'users', selectedStaff.uid), { compliance: updatedCompliance });
      
      setSelectedStaff({ ...selectedStaff, compliance: updatedCompliance });
      fetchStaff();
  };

  const handleCopy = (text: string, type: 'id' | 'pin') => {
      navigator.clipboard.writeText(text);
      if (type === 'id') { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
      else { setCopiedPin(true); setTimeout(() => setCopiedPin(false), 2000); }
  };

  const filteredStaff = staffList.filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || staff.email.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesFilter = true;
      if (filter === 'Pending') matchesFilter = staff.status === 'Pending';
      if (filter === 'RoleRequest') matchesFilter = staff.roleChangeRequest?.status === 'Pending';
      return matchesSearch && matchesFilter;
  });

  const StaffManagementModal = () => {
      if (!selectedStaff) return null;
      const hasRoleRequest = selectedStaff.roleChangeRequest?.status === 'Pending';
      
      return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200 dark:border-slate-700">
                  <div className="p-6 bg-slate-900 dark:bg-slate-950 text-white flex justify-between items-start">
                      <div>
                          <h2 className="text-2xl font-bold">{selectedStaff.name}</h2>
                          <p className="text-slate-400 text-sm">{selectedStaff.email}</p>
                          <div className="flex gap-2 mt-2">
                              <span className="px-2 py-0.5 bg-white/10 rounded text-xs font-bold uppercase">{selectedStaff.role}</span>
                              {selectedStaff.status === 'Active' 
                                  ? <span className="px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-xs font-bold">ACTIVE</span>
                                  : <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-bold">PENDING APPROVAL</span>
                              }
                          </div>
                      </div>
                      <button onClick={() => setSelectedStaff(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><X className="w-6 h-6" /></button>
                  </div>

                  <div className="p-6 overflow-y-auto space-y-8 bg-slate-50 dark:bg-slate-900/50">
                      
                      {/* Approval Section */}
                      {selectedStaff.status === 'Pending' && (
                          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-amber-200 dark:border-amber-800 shadow-sm">
                              <h3 className="font-bold text-amber-800 dark:text-amber-400 mb-4 flex items-center gap-2">
                                  <AlertTriangle className="w-5 h-5" /> Account Approval Required
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Select the approved role for this user. This will generate their Employee ID.</p>
                              
                              <div className="mb-4">
                                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assign Role</label>
                                  <select 
                                      className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 dark:text-white"
                                      value={roleToAssign}
                                      onChange={e => setRoleToAssign(e.target.value as Role)}
                                  >
                                      {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                                  </select>
                              </div>

                              <div className="flex gap-3">
                                  <button onClick={approveUser} className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2">
                                      <Check className="w-4 h-4" /> Approve & Generate ID
                                  </button>
                                  <button onClick={rejectUser} className="px-6 py-3 bg-white dark:bg-slate-800 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 font-bold rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                      Reject
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* Role Change Request */}
                      {hasRoleRequest && (
                          <div className="bg-purple-50 dark:bg-purple-900/10 p-6 rounded-xl border border-purple-200 dark:border-purple-800 shadow-sm">
                              <h3 className="font-bold text-purple-800 dark:text-purple-300 mb-2 flex items-center gap-2">
                                  <ArrowUpCircle className="w-5 h-5" /> Role Promotion Request
                              </h3>
                              <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-purple-100 dark:border-slate-700 mb-4">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-xs text-purple-600 dark:text-purple-400 font-bold uppercase">Requested Role</span>
                                      <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedStaff.roleChangeRequest!.newRole}</span>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 italic">"{selectedStaff.roleChangeRequest!.reason}"</p>
                              </div>
                              <div className="flex gap-3">
                                  <button onClick={() => handleRoleChangeRequest(true)} className="flex-1 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700">Approve Promotion</button>
                                  <button onClick={() => handleRoleChangeRequest(false)} className="flex-1 py-2 bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 font-bold rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20">Reject</button>
                              </div>
                          </div>
                      )}

                      {/* Compliance Docs */}
                      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                              <ShieldCheck className="w-5 h-5 text-ams-blue" /> Compliance Documents
                          </h3>
                          
                          {(!selectedStaff.compliance || selectedStaff.compliance.length === 0) ? (
                              <p className="text-slate-400 text-sm italic">No documents uploaded.</p>
                          ) : (
                              <div className="space-y-3">
                                  {selectedStaff.compliance.map((doc, idx) => (
                                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                                          <div>
                                              <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{doc.name}</p>
                                              <p className="text-xs text-slate-500">Exp: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              {doc.status === 'Pending' ? (
                                                  <>
                                                      <button onClick={() => handleDocAction(idx, 'Verify')} className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-lg font-bold hover:bg-green-200">Verify</button>
                                                      <button onClick={() => handleDocAction(idx, 'Reject')} className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-3 py-1.5 rounded-lg font-bold hover:bg-red-200">Reject</button>
                                                  </>
                                              ) : (
                                                  <span className={`text-xs font-bold px-2 py-1 rounded ${doc.status === 'Valid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{doc.status}</span>
                                              )}
                                              {doc.fileUrl && (
                                                  <button onClick={() => window.open(doc.fileUrl)} className="p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded text-slate-500 hover:text-ams-blue">
                                                      <Eye className="w-4 h-4" />
                                                  </button>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Administration</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage workforce, approvals, and view operational metrics.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('Directory')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'Directory' ? 'bg-white dark:bg-slate-800 text-ams-blue dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Users className="w-4 h-4" /> Directory</button>
            <button onClick={() => setActiveTab('Analytics')} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'Analytics' ? 'bg-white dark:bg-slate-800 text-ams-blue dark:text-white shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><BarChart2 className="w-4 h-4" /> Analytics</button>
        </div>
      </div>

      {activeTab === 'Directory' ? (
        <>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-ams-blue outline-none transition-all dark:text-white" />
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                        <button onClick={() => setFilter('All')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === 'All' ? 'bg-slate-800 dark:bg-slate-700 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>All Staff</button>
                        <button onClick={() => setFilter('Pending')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === 'Pending' ? 'bg-amber-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Pending {staffList.filter(s => s.status === 'Pending').length > 0 && <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 text-amber-600 rounded-full text-xs">{staffList.filter(s => s.status === 'Pending').length}</span>}</button>
                        <button onClick={() => setFilter('RoleRequest')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${filter === 'RoleRequest' ? 'bg-purple-500 text-white' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>Requests {staffList.filter(s => s.roleChangeRequest?.status === 'Pending').length > 0 && <span className="px-1.5 py-0.5 bg-white dark:bg-slate-900 text-purple-600 rounded-full text-xs">{staffList.filter(s => s.roleChangeRequest?.status === 'Pending').length}</span>}</button>
                    </div>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                    {filteredStaff.length === 0 && <div className="col-span-full text-center p-8 text-slate-400">No staff found.</div>}
                    {filteredStaff.map(staff => {
                        const pendingDocsCount = staff.compliance?.filter(d => d.status === 'Pending').length || 0;
                        const reviewNeeded = staff.status === 'Pending' || staff.roleChangeRequest?.status === 'Pending' || pendingDocsCount > 0;

                        return (
                            <div 
                                key={staff.uid} 
                                onClick={() => {
                                    setRoleToAssign(Role.FirstAider);
                                    setSelectedStaff(staff);
                                }}
                                className={`bg-white dark:bg-slate-800 rounded-xl border p-6 shadow-sm hover:shadow-md transition-all relative group cursor-pointer ${reviewNeeded ? 'border-amber-200 dark:border-amber-800 ring-1 ring-amber-100 dark:ring-amber-900' : 'border-slate-200 dark:border-slate-700'}`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${staff.status === 'Pending' ? 'bg-amber-400' : staff.status === 'Rejected' ? 'bg-red-400' : 'bg-ams-blue'}`}>{staff.name.charAt(0)}</div>
                                        <div className="overflow-hidden">
                                            <h3 className="font-bold text-slate-800 dark:text-white truncate">{staff.name}</h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{staff.email}</p>
                                        </div>
                                    </div>
                                    {reviewNeeded && (
                                        <div className="flex items-center gap-1 text-[10px] font-bold bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full animate-pulse">
                                            <AlertTriangle className="w-3 h-3" /> Review
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-3 mb-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Role</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">{staff.role}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">ID</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">{staff.employeeId || '-'}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 dark:text-slate-400">Status</span>
                                        {staff.status === 'Active' ? <span className="flex items-center gap-1 text-green-600 dark:text-green-400 font-bold text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full"><BadgeCheck className="w-3 h-3" /> Active</span> : staff.status === 'Rejected' ? <span className="flex items-center gap-1 text-red-600 dark:text-red-400 font-bold text-xs bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-full"><XCircle className="w-3 h-3" /> Rejected</span> : <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full"><AlertTriangle className="w-3 h-3" /> Pending</span>}
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    {staff.roleChangeRequest?.status === 'Pending' && (
                                        <span className="text-[10px] bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-2 py-1 rounded font-bold flex items-center gap-1"><ArrowUpCircle className="w-3 h-3" /> Role Req</span>
                                    )}
                                    {pendingDocsCount > 0 && (
                                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded font-bold flex items-center gap-1"><FileText className="w-3 h-3" /> Docs ({pendingDocsCount})</span>
                                    )}
                                    <button className="ml-auto text-xs font-bold text-ams-blue dark:text-white hover:underline flex items-center gap-1">
                                        Manage <ChevronRight className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
      ) : <StaffAnalytics />}

      <StaffManagementModal />

      {/* Credential Result Modal */}
      {approvedCreds && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-white/20">
                  <div className="p-6 bg-green-600 text-white flex justify-between items-start">
                      <div>
                          <h3 className="text-xl font-bold flex items-center gap-2"><BadgeCheck className="w-6 h-6" /> User Approved</h3>
                          <p className="text-green-100 text-sm mt-1">{approvedCreds.name} is now active.</p>
                      </div>
                      <button onClick={() => setApprovedCreds(null)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-8 space-y-6">
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Employee ID</label>
                          <div className="flex gap-2">
                              <code className="flex-1 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl font-mono font-bold text-lg text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700">{approvedCreds.id}</code>
                              <button onClick={() => handleCopy(approvedCreds.id, 'id')} className={`p-3 rounded-xl border font-bold transition-all ${copiedId ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                  {copiedId ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                              </button>
                          </div>
                      </div>
                      <div className="space-y-2">
                          <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Secure PIN</label>
                          <div className="flex gap-2">
                              <code className="flex-1 bg-slate-100 dark:bg-slate-900 p-3 rounded-xl font-mono font-bold text-lg text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 tracking-widest">{approvedCreds.pin}</code>
                              <button onClick={() => handleCopy(approvedCreds.pin, 'pin')} className={`p-3 rounded-xl border font-bold transition-all ${copiedPin ? 'bg-green-50 text-green-600 border-green-200' : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600'}`}>
                                  {copiedPin ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                              </button>
                          </div>
                          <p className="text-xs text-red-500 font-bold flex items-center gap-1 mt-2"><AlertTriangle className="w-3 h-3" /> Provide this to the staff member immediately.</p>
                      </div>
                      <button onClick={() => setApprovedCreds(null)} className="w-full py-3 bg-slate-900 dark:bg-slate-950 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 dark:hover:bg-black transition-all">Done & Close</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default StaffPage;
