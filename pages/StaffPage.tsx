
import React, { useState, useEffect } from 'react';
import { Users, Search, Filter, Shield, UserPlus, Phone, MapPin, Mail, AlertCircle, CheckCircle, Loader2, X, GraduationCap, Edit3, Trash2, Download, Database, AlertOctagon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { User, Role, ComplianceDoc } from '../types';
import { useToast } from '../context/ToastContext';
import StaffAnalytics from '../components/StaffAnalytics';
import { exportStaffData, deleteStaffData } from '../utils/compliance';

const StatusBadge = ({ status }: { status: string }) => {
    let color = 'bg-slate-100 text-slate-600';
    if (status === 'Active') color = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (status === 'Pending') color = 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    if (status === 'Suspended') color = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    
    return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${color}`}>{status}</span>;
};

const RoleBadge = ({ role }: { role: string }) => {
    return <span className="px-2 py-1 rounded border bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300 text-xs font-bold">{role}</span>;
};

const StaffPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'Directory' | 'Analytics'>('Directory');
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [editForm, setEditForm] = useState<Partial<User>>({});
  
  // Compliance Action State
  const [complianceLoading, setComplianceLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
        try {
            const q = query(collection(db, 'users'), orderBy('name'));
            const snap = await getDocs(q);
            setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
        } catch (e) {
            console.error("Error fetching staff", e);
        } finally {
            setLoading(false);
        }
    };
    fetchUsers();
  }, []);

  const handleEdit = (u: User) => {
      setEditingUser(u);
      setEditForm(u);
      const parts = u.name.split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
  };

  const handleSaveUser = async () => {
      if (!editingUser) return;
      try {
          const fullName = `${firstName} ${lastName}`.trim();
          await updateDoc(doc(db, 'users', editingUser.uid), {
              ...editForm,
              name: fullName
          });
          
          setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, ...editForm, name: fullName } : u));
          setEditingUser(null);
          toast.success("User updated successfully");
      } catch (e) {
          console.error(e);
          toast.error("Failed to update user");
      }
  };

  const handleApproveDoc = async (docIdx: number, status: 'Valid' | 'Rejected') => {
      if (!editingUser || !editingUser.compliance) return;
      const newCompliance = [...editingUser.compliance];
      newCompliance[docIdx].status = status;
      
      try {
          await updateDoc(doc(db, 'users', editingUser.uid), { compliance: newCompliance });
          // Update local state
          const updatedUser = { ...editingUser, compliance: newCompliance };
          setEditingUser(updatedUser);
          setUsers(users.map(u => u.uid === updatedUser.uid ? updatedUser : u));
          toast.success(`Document ${status}`);
      } catch (e) {
          toast.error("Update failed");
      }
  };

  const handleSAR = async () => {
      if (!editingUser) return;
      setComplianceLoading(true);
      try {
          await exportStaffData(editingUser.uid);
          toast.success("Data Exported (SAR)");
      } catch (e) {
          toast.error("Export Failed");
      } finally {
          setComplianceLoading(false);
      }
  };

  const handleDeleteStaffData = async () => {
      if (!editingUser) return;
      const confirmMsg = `WARNING: This will permanently delete the profile, CPD, and notifications for ${editingUser.name}. This action cannot be undone.\n\nType 'DELETE' to confirm.`;
      const input = prompt(confirmMsg);
      
      if (input === 'DELETE') {
          setComplianceLoading(true);
          try {
              await deleteStaffData(editingUser.uid);
              setUsers(users.filter(u => u.uid !== editingUser.uid));
              setEditingUser(null);
              toast.success("User Data Deleted");
          } catch (e) {
              toast.error("Deletion Failed");
          } finally {
              setComplianceLoading(false);
          }
      }
  };

  const filteredUsers = users.filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Staff Manager</h1>
                <p className="text-slate-500 dark:text-slate-400">Manage personnel, roles, and compliance.</p>
            </div>
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                <button onClick={() => setActiveTab('Directory')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Directory' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Directory</button>
                <button onClick={() => setActiveTab('Analytics')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'Analytics' ? 'bg-white dark:bg-slate-600 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Analytics</button>
            </div>
        </div>

        {activeTab === 'Directory' && (
            <>
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4 mt-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-ams-blue text-slate-900 dark:text-white" />
                    </div>
                </div>

                {loading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div> : (
                    <div className="space-y-4">
                        {filteredUsers.map(u => (
                            <div key={u.uid} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex flex-col md:flex-row items-center gap-4 shadow-sm hover:shadow-md transition-all">
                                <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold overflow-hidden">
                                    {u.photoURL ? <img src={u.photoURL} alt={u.name} className="w-full h-full object-cover" /> : u.name.charAt(0)}
                                </div>
                                <div className="flex-1 text-center md:text-left">
                                    <h3 className="font-bold text-slate-800 dark:text-white">{u.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                                </div>
                                <div className="flex flex-wrap justify-center gap-2">
                                    <RoleBadge role={u.role} />
                                    <StatusBadge status={u.status} />
                                </div>
                                <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-ams-blue hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                    <Edit3 className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}

        {activeTab === 'Analytics' && <StaffAnalytics />}

        {/* Edit User Modal */}
        {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-700">
                  {/* Header */}
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                          <Shield className="w-5 h-5 text-ams-blue" /> Edit Profile
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"><X className="w-5 h-5 text-slate-400" /></button>
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
                                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-900 dark:text-white outline-none"
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
                                className="input-field text-slate-900 dark:text-white" 
                                value={firstName} 
                                onChange={e => setFirstName(e.target.value)}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Last Name</label>
                              <input 
                                className="input-field text-slate-900 dark:text-white" 
                                value={lastName} 
                                onChange={e => setLastName(e.target.value)}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Employee ID</label>
                              <input 
                                className="input-field font-mono text-slate-900 dark:text-white" 
                                value={editForm.employeeId || ''} 
                                onChange={e => setEditForm({...editForm, employeeId: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Professional Reg (HCPC/NMC)</label>
                              <input 
                                className="input-field text-slate-900 dark:text-white" 
                                value={editForm.regNumber || ''} 
                                onChange={e => setEditForm({...editForm, regNumber: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                          <div>
                              <label className="input-label">Phone Number</label>
                              <input 
                                className="input-field text-slate-900 dark:text-white" 
                                value={editForm.phone || ''} 
                                onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                disabled={!isManager}
                              />
                          </div>
                      </div>
                      
                      <div>
                          <label className="input-label">Address</label>
                          <textarea 
                              className="input-field resize-none text-slate-900 dark:text-white" 
                              rows={2}
                              value={editForm.address || ''} 
                              onChange={e => setEditForm({...editForm, address: e.target.value})}
                              disabled={!isManager}
                          />
                      </div>

                      {/* Compliance Section */}
                      <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                          <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                              <GraduationCap className="w-5 h-5 text-ams-blue" /> Compliance Documents
                          </h4>
                          <div className="space-y-3">
                              {editingUser.compliance?.map((doc, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                      <div>
                                          <p className="text-sm font-bold text-slate-800 dark:text-white">{doc.name}</p>
                                          <p className="text-xs text-slate-500">Exp: {new Date(doc.expiryDate).toLocaleDateString()}</p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          {doc.fileUrl && (
                                              <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mr-2">View</a>
                                          )}
                                          
                                          {doc.status === 'Pending' && isManager ? (
                                              <>
                                                  <button onClick={() => handleApproveDoc(idx, 'Valid')} className="p-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200"><CheckCircle className="w-4 h-4" /></button>
                                                  <button onClick={() => handleApproveDoc(idx, 'Rejected')} className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"><X className="w-4 h-4" /></button>
                                              </>
                                          ) : (
                                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${doc.status === 'Valid' ? 'bg-green-100 text-green-700' : (doc.status === 'Expired' || doc.status === 'Rejected') ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{doc.status}</span>
                                          )}
                                      </div>
                                  </div>
                              ))}
                              {(!editingUser.compliance || editingUser.compliance.length === 0) && <p className="text-sm text-slate-400 italic text-center">No documents uploaded.</p>}
                          </div>
                      </div>

                      {/* Data Protection Zone (GDPR) */}
                      {isManager && (
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
                              <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                  <Database className="w-5 h-5 text-ams-blue" /> Data & Privacy (GDPR)
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <button 
                                    onClick={handleSAR}
                                    disabled={complianceLoading}
                                    className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 flex flex-col items-center gap-2 transition-colors group"
                                  >
                                      {complianceLoading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <Download className="w-5 h-5 text-slate-500 group-hover:text-ams-blue" />}
                                      <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Download Data (SAR)</span>
                                  </button>
                                  <button 
                                    onClick={handleDeleteStaffData}
                                    disabled={complianceLoading}
                                    className="p-3 border border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/20 flex flex-col items-center gap-2 transition-colors group"
                                  >
                                      {complianceLoading ? <Loader2 className="w-5 h-5 animate-spin text-red-400" /> : <AlertOctagon className="w-5 h-5 text-red-500" />}
                                      <span className="text-xs font-bold text-red-700 dark:text-red-300">Delete User Data</span>
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                      <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                      <button onClick={handleSaveUser} className="px-8 py-2.5 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg transition-colors">Save Changes</button>
                  </div>
              </div>
            </div>
        )}

        <style>{`
            .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1; }
            .input-field { @apply w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ams-blue focus:border-transparent transition-all font-medium shadow-sm; }
        `}</style>
    </div>
  );
};

export default StaffPage;
