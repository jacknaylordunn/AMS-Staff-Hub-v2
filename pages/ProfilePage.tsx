
import React, { useState, useEffect } from 'react';
import { User, Shield, Phone, MapPin, Upload, AlertCircle, CheckCircle, Clock, Briefcase, ArrowUpCircle, X, Loader2, Eye, EyeOff, Lock, Crown, Key, Camera, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { ComplianceDoc, Role } from '../types';
import { doc, updateDoc, arrayUnion, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadFile } from '../services/storage';
import DocumentViewerModal from '../components/DocumentViewerModal';
import { notifyManagers } from '../services/notificationService';

const logo = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

const StatusBadge = ({ doc }: { doc: ComplianceDoc }) => {
    // Replicate dashboard logic for real-time status
    const expiryDate = new Date(doc.expiryDate);
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let displayStatus = doc.status;
    if (doc.status !== 'Pending' && doc.status !== 'Rejected') {
        if (diffDays < 0) displayStatus = 'Expired';
        else if (diffDays < 30) displayStatus = 'Expiring';
    }

    const styles: any = {
        Valid: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
        Expiring: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 animate-pulse',
        Expired: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
        Pending: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
        Rejected: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
    };
    const icons: any = {
        Valid: CheckCircle,
        Expiring: Clock,
        Expired: AlertCircle,
        Pending: Clock,
        Rejected: X
    };
    
    const Icon = icons[displayStatus] || CheckCircle;
    
    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[displayStatus]}`}>
            <Icon className="w-3.5 h-3.5" />
            {displayStatus.toUpperCase()}
        </span>
    );
};

const DOC_TYPES = [
    'DBS Certificate',
    'Driving License',
    'HCPC / NMC Registration',
    'Clinical Qualification (FREC/Para/Nurse)',
    'Blue Light Driving',
    'Manual Handling',
    'Safeguarding L2/L3',
    'Immunisation Record',
    'Other'
];

const ProfilePage = () => {
  const { user, refreshUser, updatePin } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
      phone: user?.phone || '',
      address: user?.address || ''
  });
  
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [requestedRole, setRequestedRole] = useState<Role | ''>('');
  const [requestReason, setRequestReason] = useState('');
  
  const [showDocModal, setShowDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [viewingDoc, setViewingDoc] = useState<{url: string, title: string} | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [canBootstrap, setCanBootstrap] = useState(false);

  // Derived state for permissions
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;

  useEffect(() => {
      const checkSystemStatus = async () => {
          try {
              const q = query(collection(db, 'users'), where('role', 'in', [Role.Admin, Role.Manager]));
              const snap = await getDocs(q);
              if (snap.empty) {
                  setCanBootstrap(true);
              }
          } catch (e) {
              console.error("Error checking system status", e);
          }
      };
      checkSystemStatus();
  }, []);

  const handleBootstrap = async () => {
      if (!user || !confirm("Initialize system and claim Admin access?")) return;
      try {
          await updateDoc(doc(db, 'users', user.uid), {
              role: Role.Admin,
              status: 'Active',
              employeeId: 'AMS-ADMIN-001',
          });
          toast.success("System Initialized. You are now Admin.");
          await refreshUser();
          window.location.reload();
      } catch (e) {
          console.error("Bootstrap failed", e);
      }
  };

  const handleProfileUpdate = async () => {
      if (!user) return;
      try {
          await updateDoc(doc(db, 'users', user.uid), {
              phone: formData.phone,
              address: formData.address
          });
          setIsEditing(false);
          toast.success("Profile updated");
      } catch (e) {
          console.error("Update failed", e);
          toast.error("Failed to update profile.");
      }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!user || !e.target.files || !e.target.files[0]) return;
      const file = e.target.files[0];
      setUploading(true);
      try {
          const url = await uploadFile(file, 'avatars');
          await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
          await refreshUser();
          toast.success("Profile picture updated");
      } catch (err) {
          toast.error("Failed to upload photo");
          console.error(err);
      } finally {
          setUploading(false);
      }
  };

  const handleChangePin = async (e: React.FormEvent) => {
      e.preventDefault();
      setPinError('');
      if (newPin !== confirmPin) {
          setPinError("PINs do not match.");
          return;
      }
      if (!/^\d{4}$/.test(newPin)) {
          setPinError("PIN must be exactly 4 digits.");
          return;
      }
      try {
          await updatePin(newPin);
          setShowPinModal(false);
          setNewPin('');
          setConfirmPin('');
          toast.success("PIN updated securely.");
      } catch (e) {
          setPinError("Failed to update PIN. Check connection.");
      }
  };

  const handleRoleRequest = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !requestedRole) return;
      try {
          await updateDoc(doc(db, 'users', user.uid), {
              roleChangeRequest: {
                  newRole: requestedRole,
                  reason: requestReason,
                  status: 'Pending',
                  requestDate: new Date().toISOString()
              }
          });
          
          await notifyManagers(
              "Role Change Request",
              `${user.name} has requested a role change to ${requestedRole}.`,
              'info',
              '/staff'
          );

          setShowRoleModal(false);
          toast.success("Role change request submitted to management.");
      } catch (e) {
          console.error("Role request failed", e);
          toast.error("Failed to submit request.");
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleUpdateDoc = (doc: ComplianceDoc) => {
      // Attempt to match known types
      if (DOC_TYPES.includes(doc.name)) {
          setDocType(doc.name);
          setDocName('');
      } else {
          setDocType('Other');
          setDocName(doc.name);
      }
      setDocExpiry(''); // Reset expiry for new upload
      setShowDocModal(true);
  };

  const handleDeleteDoc = async (documentToDelete: ComplianceDoc) => {
      if (!user || !user.compliance) return;
      if (!confirm(`Are you sure you want to delete ${documentToDelete.name}? This cannot be undone.`)) return;

      try {
          // Filter out the document to delete
          const newCompliance = user.compliance.filter(d => d.id !== documentToDelete.id);
          
          await updateDoc(doc(db, 'users', user.uid), {
              compliance: newCompliance
          });
          
          await refreshUser();
          toast.success("Document deleted");
      } catch (e) {
          console.error("Delete failed", e);
          toast.error("Failed to delete document.");
      }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || (!docName && !docType) || !docExpiry) return;
      
      const finalName = docType === 'Other' ? docName : docType;
      
      setUploading(true);
      try {
          let downloadUrl = null;
          if (selectedFile) {
              downloadUrl = await uploadFile(selectedFile, `compliance/${user.uid}`);
          }

          const newDoc: any = {
              id: Date.now().toString(),
              name: finalName || 'Document', 
              expiryDate: docExpiry,
              status: 'Pending', 
              uploadedAt: new Date().toISOString(),
              fileUrl: downloadUrl || null 
          };

          await updateDoc(doc(db, 'users', user.uid), {
              compliance: arrayUnion(newDoc)
          });
          
          await refreshUser();

          setShowDocModal(false);
          setDocName('');
          setDocType('');
          setDocExpiry('');
          setSelectedFile(null);
          toast.success("Document uploaded successfully");
      } catch (e) {
          console.error("Upload failed", e);
          toast.error("Failed to upload document.");
      } finally {
          setUploading(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      
      {canBootstrap && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 animate-pulse">
              <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/20 rounded-full">
                      <Crown className="w-8 h-8" />
                  </div>
                  <div>
                      <h2 className="text-xl font-bold">System Initialization Required</h2>
                      <p className="text-white/90 text-sm">No Managers found. Claim ownership to bootstrap the system.</p>
                  </div>
              </div>
              <button 
                onClick={handleBootstrap}
                className="px-6 py-3 bg-white text-orange-600 font-bold rounded-xl shadow-lg hover:bg-orange-50 transition-all whitespace-nowrap"
              >
                  Claim Admin Access
              </button>
          </div>
      )}

      <div className="relative bg-gradient-to-r from-ams-blue to-blue-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="relative group">
                  <div className="w-24 h-24 bg-white rounded-full p-1 shadow-xl overflow-hidden relative">
                      {user?.photoURL ? (
                          <img src={user.photoURL} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                      ) : (
                          <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                              <User className="w-12 h-12" />
                          </div>
                      )}
                      {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 bg-ams-blue text-white rounded-full cursor-pointer hover:bg-blue-700 transition-colors shadow-md">
                      <Camera className="w-4 h-4" />
                      <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
              </div>
              
              <div className="text-center md:text-left text-white flex-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h1 className="text-3xl font-bold">{user?.name}</h1>
                    <span className="px-2 py-0.5 bg-ams-gold/20 text-ams-gold border border-ams-gold/30 rounded text-xs font-bold uppercase tracking-wide">
                        {user?.role}
                    </span>
                  </div>
                  <p className="text-blue-200 mt-1 flex items-center justify-center md:justify-start gap-2">
                    <span className="opacity-75">{user?.email}</span>
                    {user?.regNumber && (
                        <>• <span className="font-mono bg-black/20 px-1.5 rounded text-sm">{user.regNumber}</span></>
                    )}
                  </p>
                  <p className="text-xs text-blue-300 mt-3 font-medium flex items-center justify-center md:justify-start gap-2">
                     STATUS: 
                     <span className={`px-2 py-0.5 rounded-full ${user?.status === 'Active' ? 'bg-green-500' : 'bg-amber-500'} text-white`}>
                        {user?.status.toUpperCase()}
                     </span>
                  </p>
              </div>
              
              <div>
                  {user?.roleChangeRequest?.status === 'Pending' ? (
                      <div className="bg-amber-500/20 border border-amber-500/50 text-amber-200 px-4 py-2 rounded-lg text-xs font-bold text-center">
                          Role Change Pending: <br/>{user.roleChangeRequest.newRole}
                      </div>
                  ) : (
                      <button 
                        onClick={() => setShowRoleModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/30 rounded-xl text-white text-sm font-bold transition-all"
                      >
                          <ArrowUpCircle className="w-4 h-4" /> Request Role Change
                      </button>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                  <div className="bg-slate-900 dark:bg-slate-950 p-4 text-white flex justify-between items-center">
                      <h3 className="font-bold flex items-center gap-2"><Shield className="w-4 h-4 text-ams-blue" /> Digital ID</h3>
                      <img src={logo} className="h-6 w-auto opacity-80" alt="Logo" onError={(e) => e.currentTarget.style.display = 'none'} />
                  </div>
                  <div className="p-6 space-y-4">
                      {user?.employeeId ? (
                          <>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Employee ID</label>
                                <p className="font-mono font-bold text-slate-800 dark:text-white text-lg bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 text-center">{user.employeeId}</p>
                            </div>
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Signing PIN</label>
                                    <button onClick={() => setShowPinModal(true)} className="text-[10px] font-bold text-ams-blue hover:underline flex items-center gap-1">
                                        <Key className="w-3 h-3" /> {user.pin ? 'Reset PIN' : 'Set PIN'}
                                    </button>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-700 flex justify-between items-center h-10 px-3">
                                    {user.pin ? (
                                        <div className="flex gap-2 items-center text-slate-500 font-medium">
                                            <Lock className="w-3 h-3" />
                                            <span>•••• (PIN Set)</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-red-500 font-bold flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" /> Not Set
                                        </div>
                                    )}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Use your PIN to sign ePRFs. 
                                    <br/><strong>Note:</strong> PINs are stored as secure hashes and cannot be viewed. If forgotten, please reset.
                                </p>
                            </div>
                          </>
                      ) : (
                          <div className="text-center py-4">
                              <Lock className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                              <p className="text-xs text-slate-500 dark:text-slate-400">ID and PIN pending approval.</p>
                          </div>
                      )}
                  </div>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-slate-800 dark:text-white">Contact Info</h3>
                      <button 
                        onClick={isEditing ? handleProfileUpdate : () => setIsEditing(true)}
                        className="text-sm text-ams-blue font-bold hover:underline"
                      >
                          {isEditing ? 'Save' : 'Edit'}
                      </button>
                  </div>
                  
                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Phone Number</label>
                          <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-slate-400" />
                              {isEditing ? (
                                  <input 
                                    type="tel" 
                                    value={formData.phone}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full text-sm border-b border-ams-blue focus:outline-none py-1 bg-transparent dark:text-white text-slate-900"
                                  />
                              ) : (
                                  <span className="text-slate-700 dark:text-slate-200">{user?.phone || 'Not set'}</span>
                              )}
                          </div>
                      </div>
                      <div className="pt-2">
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Home Address</label>
                          <div className="flex items-start gap-2">
                              <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                              {isEditing ? (
                                  <textarea 
                                    value={formData.address}
                                    onChange={e => setFormData({...formData, address: e.target.value})}
                                    className="w-full text-sm border border-slate-200 dark:border-slate-600 rounded p-2 focus:ring-1 focus:ring-ams-blue outline-none bg-transparent dark:text-white text-slate-900"
                                    rows={2}
                                  />
                              ) : (
                                  <span className="text-slate-700 dark:text-slate-200">{user?.address || 'Not set'}</span>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 transition-colors">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-ams-blue" />
                      <h3 className="font-bold text-slate-800 dark:text-white">Compliance Documents</h3>
                  </div>
                  <button 
                    onClick={() => setShowDocModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-bold transition-colors border border-slate-200 dark:border-slate-600"
                  >
                      <Upload className="w-4 h-4" /> Upload New
                  </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-4 py-3">Document Name</th>
                              <th className="px-4 py-3">Expiry Date</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-slate-700 dark:text-slate-200">
                          {user?.compliance?.map((doc, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                                  <td className="px-4 py-3 font-medium">{doc.name}</td>
                                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(doc.expiryDate).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">
                                      <StatusBadge doc={doc} />
                                  </td>
                                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                                      {doc.fileUrl && (
                                          <button 
                                            onClick={() => setViewingDoc({ url: doc.fileUrl!, title: doc.name })} 
                                            className="text-ams-blue hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-bold"
                                          >
                                            View
                                          </button>
                                      )}
                                      <button 
                                        onClick={() => handleUpdateDoc(doc)}
                                        className="text-slate-500 hover:text-ams-blue dark:text-slate-400 dark:hover:text-white text-xs font-bold flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded"
                                      >
                                          <RefreshCw className="w-3 h-3" /> Update
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteDoc(doc)}
                                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                                        title="Delete Document"
                                      >
                                          <Trash2 className="w-4 h-4" />
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {(!user?.compliance || user.compliance.length === 0) && (
                              <tr>
                                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">
                                      No compliance documents found. Please upload certificates.
                                  </td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {showPinModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Key className="w-5 h-5" /> Update Secure PIN</h3>
                      <button onClick={() => setShowPinModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleChangePin} className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                          <strong className="block mb-1">Security Notice</strong>
                          This PIN will be securely hashed before storage. It cannot be viewed by anyone, including administrators.
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">New 4-Digit PIN</label>
                          <input 
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-center font-mono text-lg tracking-widest outline-none dark:text-white text-slate-900 focus:ring-2 focus:ring-ams-blue"
                            value={newPin}
                            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Confirm New PIN</label>
                          <input 
                            type="password"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-3 text-center font-mono text-lg tracking-widest outline-none dark:text-white text-slate-900 focus:ring-2 focus:ring-ams-blue"
                            value={confirmPin}
                            onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                            required
                          />
                      </div>
                      {pinError && <p className="text-xs text-red-500 font-bold text-center">{pinError}</p>}
                      <button type="submit" className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900">Set New PIN</button>
                  </form>
              </div>
          </div>
      )}

      {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Request Role Change</h3>
                      <button onClick={() => setShowRoleModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleRoleRequest} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">New Role</label>
                          <select 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-slate-900"
                            value={requestedRole}
                            onChange={e => setRequestedRole(e.target.value as Role)}
                            required
                          >
                              <option value="">Select Role...</option>
                              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Reason / Justification</label>
                          <textarea 
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none resize-none dark:text-white text-slate-900"
                            rows={3}
                            placeholder="E.g. Completed FREC4 course."
                            value={requestReason}
                            onChange={e => setRequestReason(e.target.value)}
                            required
                          />
                      </div>
                      <button type="submit" className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900">Submit Request</button>
                  </form>
              </div>
          </div>
      )}

      {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in border border-slate-200 dark:border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Upload Document</h3>
                      <button onClick={() => setShowDocModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleDocUpload} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Document Type</label>
                          <select
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-slate-900"
                            value={docType}
                            onChange={e => setDocType(e.target.value)}
                            required
                          >
                              <option value="">Select Document Type...</option>
                              {DOC_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                      </div>
                      
                      {docType === 'Other' && (
                          <div>
                              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Document Name</label>
                              <input 
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-slate-900"
                                placeholder="e.g. Specific Course Cert"
                                value={docName}
                                onChange={e => setDocName(e.target.value)}
                                required
                              />
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Expiry Date</label>
                          <input 
                            type="date"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none dark:text-white text-slate-900"
                            value={docExpiry}
                            onChange={e => setDocExpiry(e.target.value)}
                            required
                          />
                      </div>
                      <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" required />
                          {selectedFile ? (
                              <span className="text-green-600 font-bold text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> {selectedFile.name}</span>
                          ) : (
                              <span className="text-slate-400 text-sm flex items-center justify-center gap-2"><Upload className="w-4 h-4" /> Tap to Upload</span>
                          )}
                      </div>
                      <button 
                        type="submit" 
                        disabled={uploading}
                        className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Verification'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {viewingDoc && (
          <DocumentViewerModal 
              url={viewingDoc.url} 
              title={viewingDoc.title} 
              onClose={() => setViewingDoc(null)} 
          />
      )}
    </div>
  );
};

export default ProfilePage;
