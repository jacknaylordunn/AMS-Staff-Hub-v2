
import React, { useState, useEffect } from 'react';
import { Search, Filter, Users, Loader2, Edit3, AlertTriangle, ArrowRight, CheckCircle, XCircle, Shield, X, Save, FileText, Lock, Calendar, Trash2, Clock } from 'lucide-react';
import { Role, User, ComplianceDoc } from '../types';
import StaffAnalytics from '../components/StaffAnalytics';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, limit, startAfter, where, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const StaffPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [activeTab, setActiveTab] = useState<'Directory' | 'Analytics'>('Directory');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [pendingDocs, setPendingDocs] = useState<{user: User, doc: ComplianceDoc}[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showApproveModal, setShowApproveModal] = useState<User | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<User | null>(null);
  const [assignRole, setAssignRole] = useState<Role>(Role.Paramedic);
  const [isProcessing, setIsProcessing] = useState(false);

  // Edit Form State - Split Name for UI
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
      fetchStaff(true);
      fetchPending();
  }, []);

  useEffect(() => {
      if (selectedStaff) {
          setEditForm(selectedStaff);
          // Split existing name for the edit fields
          const nameParts = selectedStaff.name.split(' ');
          setFirstName(nameParts[0] || '');
          setLastName(nameParts.slice(1).join(' ') || '');
      }
  }, [selectedStaff]);

  const fetchPending = async () => {
      try {
          // Pending Users
          const qUsers = query(collection(db, 'users'), where('status', '==', 'Pending'));
          const snapUsers = await getDocs(qUsers);
          setPendingUsers(snapUsers.docs.map(d => d.data() as User));

          // Pending Docs (Scan all active users - requires optimized query or backend function in production)
          // For this app scale, client-side scan of fetched users is acceptable
          const qDocs = query(collection(db, 'users'), where('status', '==', 'Active'));
          const snapDocs = await getDocs(qDocs);
          const docsQueue: {user: User, doc: ComplianceDoc}[] = [];
          
          snapDocs.docs.forEach(d => {
              const u = d.data() as User;
              u.compliance?.forEach(c => {
                  if (c.status === 'Pending') docsQueue.push({ user: u, doc: c });
              });
          });
          setPendingDocs(docsQueue);

      } catch (e) {
          console.error("Error fetching pending", e);
      }
  };

  const fetchStaff = async (isInitial = false) => {
      if (isInitial) setIsLoading(true);
      else setLoadingMore(true);

      try {
          let q = query(collection(db, 'users'), where('status', 'in', ['Active', 'Suspended']), orderBy('name'), limit(20));
          
          if (!isInitial && lastDoc) {
              q = query(collection(db, 'users'), where('status', 'in', ['Active', 'Suspended']), orderBy('name'), startAfter(lastDoc), limit(20));
          }

          const snapshot = await getDocs(q);
          const users = snapshot.docs.map(d => d.data() as User);
          
          if (snapshot.docs.length < 20) setHasMore(false);
          setLastDoc(snapshot.docs[snapshot.docs.length - 1]);

          setStaffList(prev => isInitial ? users : [...prev, ...users]);
      } catch (e) {
          console.error("Error fetching staff", e);
      } finally {
          setIsLoading(false);
          setLoadingMore(false);
      }
  };

  const handleApproveUser = async () => {
      if (!showApproveModal) return;
      setIsProcessing(true);
      try {
          const now = new Date();
          const yy = now.getFullYear().toString().slice(-2);
          const mm = (now.getMonth() + 1).toString().padStart(2, '0');
          const rand = Math.floor(1000 + Math.random() * 9000);
          const badgeId = `AMS${yy}${mm}${rand}`;

          await updateDoc(doc(db, 'users', showApproveModal.uid), {
              role: assignRole,
              status: 'Active',
              employeeId: badgeId,
              approvedAt: new Date().toISOString(),
              approvedBy: user?.uid
          });

          setPendingUsers(prev => prev.filter(u => u.uid !== showApproveModal.uid));
          const newUser = { ...showApproveModal, role: assignRole, status: 'Active', employeeId: badgeId } as User;
          setStaffList(prev => [newUser, ...prev]);

          setShowApproveModal(null);
      } catch (e) {
          console.error("Approval failed", e);
          alert("Failed to approve user.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDocAction = async (targetUser: User, targetDoc: ComplianceDoc, action: 'Valid' | 'Rejected') => {
      try {
          const updatedDocs = targetUser.compliance.map(d => 
              d.id === targetDoc.id ? { ...d, status: action === 'Valid' ? 'Valid' : 'Expired' } : d
          );
          
          // If rejected, maybe remove? For now set to expired/invalid
          if (action === 'Rejected') {
             // Optional: remove completely
          }

          await updateDoc(doc(db, 'users', targetUser.uid), {
              compliance: updatedDocs
          });

          setPendingDocs(prev => prev.filter(p => p.doc.id !== targetDoc.id));
          alert(`Document ${action}`);
      } catch (e) {
          console.error("Doc update failed", e);
      }
  };

  const handleSaveEdit = async () => {
      if (!selectedStaff || !editForm) return;
      setIsProcessing(true);
      try {
          const fullName = `${firstName.trim()} ${lastName.trim()}`;
          
          const payload: Partial<User> = {
              name: fullName,
              role: editForm.role,
              status: editForm.status,
              employeeId: editForm.employeeId,
              regNumber: editForm.regNumber,
              phone: editForm.phone,
              address: editForm.address
          };
          
          await updateDoc(doc(db, 'users', selectedStaff.uid), payload);
          setStaffList(prev => prev.map(s => s.uid === selectedStaff.uid ? { ...s, ...payload } : s));
          setSelectedStaff(null);
          alert("Staff details updated.");
      } catch (e) {
          console.error("Edit failed", e);
          alert("Failed to save changes.");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleDeleteDoc = async (docToDelete: ComplianceDoc) => {
      if (!selectedStaff || !confirm("Delete this document?")) return;
      try {
          await updateDoc(doc(db, 'users', selectedStaff.uid), {
              compliance: arrayRemove(docToDelete)
          });
          // Update local state
          const updatedDocs = selectedStaff.compliance.filter(d => d.id !== docToDelete.id);
          setSelectedStaff({ ...selectedStaff, compliance: updatedDocs });
          // Also update the main list
          setStaffList(prev => prev.map(s => s.uid === selectedStaff.uid ? { ...s, compliance: updatedDocs } : s));
      } catch (e) {
          console.error("Delete failed", e);
      }
  };

  const filteredStaff = staffList.filter(staff => 
      staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      staff.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 relative pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Administration</h1>
            <p className="text-slate-500 dark:text-slate-400">Manage workforce and view operational metrics.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setActiveTab('Directory')} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'Directory' ? 'bg-ams-blue text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Directory</button>
            <button onClick={() => setActiveTab('Analytics')} className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'Analytics' ? 'bg-ams-blue text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>Analytics</button>
        </div>
      </div>

      {activeTab === 'Directory' ? (
        <>
            {/* Action Queues */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pending Users */}
                {pendingUsers.length > 0 && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 p-6">
                        <h3 className="font-bold text-amber-800 dark:text-amber-200 mb-4 flex items-center gap-2">
                            <Users className="w-5 h-5" /> New Staff Requests ({pendingUsers.length})
                        </h3>
                        <div className="space-y-3">
                            {pendingUsers.map(u => (
                                <div key={u.uid} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-amber-100 dark:border-amber-900/50 shadow-sm flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{u.name}</p>
                                        <p className="text-xs text-slate-500">{u.email}</p>
                                    </div>
                                    <button onClick={() => setShowApproveModal(u)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors">Review</button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Document Approvals */}
                {pendingDocs.length > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 p-6">
                        <h3 className="font-bold text-blue-800 dark:text-blue-200 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Document Review ({pendingDocs.length})
                        </h3>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {pendingDocs.map(({user, doc}, idx) => (
                                <div key={idx} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-bold text-sm text-slate-800 dark:text-white">{doc.name}</p>
                                            <p className="text-xs text-slate-500">For: {user.name}</p>
                                        </div>
                                        {doc.fileUrl && <a href={doc.fileUrl} target="_blank" className="text-xs text-blue-600 underline font-bold">View</a>}
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDocAction(user, doc, 'Valid')} className="flex-1 py-1 bg-green-100 text-green-700 rounded text-xs font-bold hover:bg-green-200">Approve</button>
                                        <button onClick={() => handleDocAction(user, doc, 'Rejected')} className="flex-1 py-1 bg-red-100 text-red-700 rounded text-xs font-bold hover:bg-red-200">Reject</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mt-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-ams-blue dark:text-white" />
                </div>
            </div>

            {isLoading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div> : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredStaff.map(staff => (
                            <div 
                                key={staff.uid} 
                                onClick={() => setSelectedStaff(staff)}
                                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm group hover:border-ams-blue transition-colors cursor-pointer"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${staff.status === 'Active' ? 'bg-ams-blue' : 'bg-slate-400'}`}>{staff.name.charAt(0)}</div>
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white group-hover:text-ams-blue transition-colors">{staff.name}</h3>
                                        <p className="text-xs text-slate-500">{staff.role}</p>
                                    </div>
                                    <Edit3 className="w-4 h-4 ml-auto text-slate-300 group-hover:text-ams-blue" />
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-700 pt-3">
                                    <span className="font-mono bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded border border-slate-200 dark:border-slate-600">{staff.employeeId || 'NO ID'}</span>
                                    <span className={staff.status === 'Active' ? 'text-green-600 font-bold' : 'text-slate-400'}>{staff.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {hasMore && !searchTerm && (
                        <div className="text-center pt-4">
                            <button onClick={() => fetchStaff()} disabled={loadingMore} className="px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-full font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50">
                                {loadingMore ? 'Loading...' : 'Load More'}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </>
      ) : <StaffAnalytics />}

      {/* Approval Modal */}
      {showApproveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Approve Access</h3>
                  <div className="mb-4 text-sm text-slate-600 dark:text-slate-400">
                      Authorizing: <strong className="text-slate-800 dark:text-white">{showApproveModal.name}</strong>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assign Role</label>
                          <select 
                              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none dark:text-white"
                              value={assignRole}
                              onChange={e => setAssignRole(e.target.value as Role)}
                          >
                              {Object.values(Role).filter(r => r !== Role.Pending).map(r => (
                                  <option key={r} value={r}>{r}</option>
                              ))}
                          </select>
                      </div>
                      
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
                          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span>
                              A unique <strong>Employee ID</strong> will be generated automatically.
                          </span>
                      </div>

                      <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowApproveModal(null)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 rounded-lg text-sm">Cancel</button>
                          <button 
                              onClick={handleApproveUser}
                              disabled={isProcessing}
                              className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                          >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Approval'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Detail / Edit Modal */}
      {selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-700 overflow-hidden">
                  
                  {/* Header */}
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-ams-blue flex items-center justify-center text-white font-bold text-xl">
                              {selectedStaff.name.charAt(0)}
                          </div>
                          <div>
                              <h3 className="font-bold text-xl text-slate-800 dark:text-white">{selectedStaff.name}</h3>
                              <p className="text-sm text-slate-500 dark:text-slate-400">{selectedStaff.email}</p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedStaff(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors">
                          <X className="w-5 h-5 text-slate-400" />
                      </button>
                  </div>

                  {/* Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      
                      {/* Status Banner */}
                      <div className="flex gap-4">
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Account Status</label>
                              <select 
                                  className={`w-full p-2.5 rounded-lg border font-bold text-sm ${editForm.status === 'Active' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}
                                  value={editForm.status}
                                  onChange={e => setEditForm({...editForm, status: e.target.value as any})}
                                  disabled={!isManager}
                              >
                                  <option value="Active">Active</option>
                                  <option value="Suspended">Suspended</option>
                                  <option value="Pending">Pending</option>
                              </select>
                          </div>
                          <div className="flex-1">
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">System Role</label>
                              <select 
                                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium dark:text-white outline-none"
                                  value={editForm.role}
                                  onChange={e => setEditForm({...editForm, role: e.target.value as any})}
                                  disabled={!isManager}
                              >
                                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* Main Details */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                              <label className="input-label">First Name</label>
                              <input 
                                className="input-field" 
                                value={firstName} 
                                onChange={e => setFirstName(e.target.value)}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Last Name</label>
                              <input 
                                className="input-field" 
                                value={lastName} 
                                onChange={e => setLastName(e.target.value)}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Employee ID</label>
                              <input 
                                className="input-field font-mono" 
                                value={editForm.employeeId || ''} 
                                onChange={e => setEditForm({...editForm, employeeId: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Professional Reg (HCPC/NMC)</label>
                              <input 
                                className="input-field" 
                                value={editForm.regNumber || ''} 
                                onChange={e => setEditForm({...editForm, regNumber: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Phone Number</label>
                              <input 
                                className="input-field" 
                                value={editForm.phone || ''} 
                                onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="input-label">Address</label>
                          <textarea 
                              className="input-field resize-none" 
                              rows={2}
                              value={editForm.address || ''} 
                              onChange={e => setEditForm({...editForm, address: e.target.value})}
                              disabled={!isManager}
                          />
                      </div>

                      {/* Compliance Section */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                          <h4 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                              <Shield className="w-4 h-4 text-ams-blue" /> Compliance Documents
                          </h4>
                          <div className="space-y-2">
                              {selectedStaff.compliance && selectedStaff.compliance.length > 0 ? (
                                  selectedStaff.compliance.map((doc, idx) => (
                                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                                          <div className="flex items-center gap-3">
                                              <FileText className="w-4 h-4 text-slate-400" />
                                              <div>
                                                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{doc.name}</p>
                                                  <p className="text-xs text-slate-500">Expires: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-2">
                                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                                  doc.status === 'Valid' ? 'bg-green-100 text-green-700' : 
                                                  doc.status === 'Expiring' ? 'bg-amber-100 text-amber-700' : 
                                                  doc.status === 'Pending' ? 'bg-blue-100 text-blue-700' :
                                                  'bg-red-100 text-red-700'
                                              }`}>{doc.status}</span>
                                              {doc.fileUrl && (
                                                  <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-bold">View</a>
                                              )}
                                              {isManager && (
                                                  <button onClick={() => handleDeleteDoc(doc)} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                              )}
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <p className="text-slate-400 italic text-sm">No documents uploaded.</p>
                              )}
                          </div>
                      </div>
                  </div>

                  {/* Footer */}
                  {isManager && (
                      <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3">
                          <button onClick={() => setSelectedStaff(null)} className="px-6 py-2.5 font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                          <button 
                              onClick={handleSaveEdit} 
                              disabled={isProcessing}
                              className="px-8 py-2.5 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-all flex items-center gap-2 disabled:opacity-50"
                          >
                              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save Changes
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default StaffPage;
