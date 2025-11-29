
// ... Imports ...
import React, { useState, useEffect } from 'react';
import { Search, Filter, CheckCircle, XCircle, MoreVertical, BadgeCheck, UserCog, BarChart2, Users, Loader2, Key, ArrowUpCircle, AlertTriangle, Copy, Check, X, FileText, Eye, ChevronRight, ShieldCheck, Edit3 } from 'lucide-react';
import { Role, User, ComplianceDoc } from '../types';
import StaffAnalytics from '../components/StaffAnalytics';
import { db } from '../services/firebase';
import { collection, query, getDocs, doc, updateDoc, orderBy, where, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const StaffPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Directory' | 'Analytics'>('Directory');
  const [filter, setFilter] = useState<'All' | 'Pending' | 'RoleRequest'>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [staffList, setStaffList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showEditModal, setShowEditModal] = useState(false);

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

  const filteredStaff = staffList.filter(staff => {
      const matchesSearch = staff.name.toLowerCase().includes(searchTerm.toLowerCase()) || staff.email.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesFilter = true;
      if (filter === 'Pending') matchesFilter = staff.status === 'Pending';
      if (filter === 'RoleRequest') matchesFilter = staff.roleChangeRequest?.status === 'Pending';
      return matchesSearch && matchesFilter;
  });

  const handleEditClick = (staff: User) => {
      setEditingUser(staff);
      setEditForm({
          name: staff.name,
          role: staff.role,
          employeeId: staff.employeeId || '',
          phone: staff.phone || '',
          address: staff.address || '',
          status: staff.status
      });
      setShowEditModal(true);
  };

  const handleUpdateStaff = async () => {
      if (!editingUser || !editForm.name) return;
      
      try {
          await updateDoc(doc(db, 'users', editingUser.uid), editForm);
          setShowEditModal(false);
          setEditingUser(null);
          fetchStaff(); // Refresh list
          alert("User updated successfully.");
      } catch (e) {
          console.error("Update failed", e);
          alert("Failed to update user.");
      }
  };

  const handleResetPin = async () => {
      if (!editingUser || !confirm("Reset PIN to 0000?")) return;
      try {
          await updateDoc(doc(db, 'users', editingUser.uid), { pin: '0000' });
          alert("PIN reset to 0000.");
      } catch (e) {
          alert("Failed to reset PIN");
      }
  };

  const handleDeleteUser = async () => {
      if (!editingUser || !confirm("Are you sure? This will remove access immediately.")) return;
      try {
          // Soft delete or status change usually safer, but prompt implies full control
          await updateDoc(doc(db, 'users', editingUser.uid), { status: 'Suspended' });
          setShowEditModal(false);
          fetchStaff();
          alert("User suspended.");
      } catch (e) {
          alert("Failed to suspend user.");
      }
  };

  return (
    <div className="space-y-6 relative">
      {/* Header */}
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
                    {/* Filters */}
                    <div className="flex gap-2">
                        <button onClick={() => setFilter('All')} className={`px-3 py-2 rounded-lg text-xs font-bold ${filter === 'All' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500'}`}>All</button>
                        <button onClick={() => setFilter('Pending')} className={`px-3 py-2 rounded-lg text-xs font-bold ${filter === 'Pending' ? 'bg-amber-100 text-amber-800' : 'text-slate-500'}`}>Pending Approval</button>
                        <button onClick={() => setFilter('RoleRequest')} className={`px-3 py-2 rounded-lg text-xs font-bold ${filter === 'RoleRequest' ? 'bg-purple-100 text-purple-800' : 'text-slate-500'}`}>Role Requests</button>
                    </div>
                </div>
            </div>

            {isLoading ? <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in">
                    {filteredStaff.map(staff => (
                        <div 
                            key={staff.uid} 
                            onClick={() => handleEditClick(staff)}
                            className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm hover:shadow-md transition-all relative group cursor-pointer"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg text-white ${staff.status === 'Pending' ? 'bg-amber-400' : 'bg-ams-blue'}`}>{staff.name.charAt(0)}</div>
                                    <div className="overflow-hidden">
                                        <h3 className="font-bold text-slate-800 dark:text-white truncate">{staff.name}</h3>
                                        <a href={`mailto:${staff.email}`} onClick={e => e.stopPropagation()} className="text-xs text-slate-500 dark:text-slate-400 truncate hover:text-ams-blue hover:underline block">{staff.email}</a>
                                        {staff.phone && <a href={`tel:${staff.phone}`} onClick={e => e.stopPropagation()} className="text-xs text-slate-500 dark:text-slate-400 truncate hover:text-ams-blue hover:underline block">{staff.phone}</a>}
                                    </div>
                                </div>
                                <Edit3 className="w-4 h-4 text-slate-300 hover:text-ams-blue" />
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
                            </div>
                            
                            {staff.status !== 'Active' && (
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 text-center">
                                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${staff.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                        <AlertTriangle className="w-3 h-3" /> {staff.status}
                                    </span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
      ) : <StaffAnalytics />}
      
      {/* Edit Staff Modal */}
      {showEditModal && editingUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                          <UserCog className="w-6 h-6 text-ams-blue" /> Edit Staff Member
                      </h3>
                      <button onClick={() => setShowEditModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="input-label">Full Name</label>
                              <input className="input-field" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} />
                          </div>
                          <div>
                              <label className="input-label">Role</label>
                              <select className="input-field" value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value as Role})}>
                                  {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                              </select>
                          </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="input-label">Employee ID</label>
                              <input className="input-field" value={editForm.employeeId} onChange={e => setEditForm({...editForm, employeeId: e.target.value})} />
                          </div>
                          <div>
                              <label className="input-label">Account Status</label>
                              <select className="input-field" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value as any})}>
                                  <option value="Active">Active</option>
                                  <option value="Pending">Pending</option>
                                  <option value="Suspended">Suspended</option>
                              </select>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="input-label">Phone</label>
                              <input className="input-field" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                          </div>
                          <div>
                              <label className="input-label">Address</label>
                              <input className="input-field" value={editForm.address} onChange={e => setEditForm({...editForm, address: e.target.value})} />
                          </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="border-t border-slate-100 dark:border-slate-700 pt-4 mt-4 grid grid-cols-2 gap-4">
                          <button onClick={handleResetPin} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-lg hover:bg-slate-200">
                              Reset PIN to 0000
                          </button>
                          <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg hover:bg-red-100">
                              Suspend / Delete User
                          </button>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setShowEditModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Cancel</button>
                          <button onClick={handleUpdateStaff} className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 shadow-lg">Save Changes</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1; }
        .input-field { @apply w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white transition-all; }
      `}</style>
    </div>
  );
};

export default StaffPage;
