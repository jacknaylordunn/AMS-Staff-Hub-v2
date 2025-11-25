
import React, { useState } from 'react';
import { User, Shield, Phone, MapPin, Upload, AlertCircle, CheckCircle, Clock, Briefcase, ArrowUpCircle, X, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ComplianceDoc, Role } from '../types';
import { doc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

const StatusBadge = ({ status }: { status: ComplianceDoc['status'] }) => {
    const styles = {
        Valid: 'bg-green-100 text-green-700 border-green-200',
        Expiring: 'bg-amber-100 text-amber-700 border-amber-200',
        Expired: 'bg-red-100 text-red-700 border-red-200',
        Pending: 'bg-blue-100 text-blue-700 border-blue-200'
    };
    const icons = {
        Valid: CheckCircle,
        Expiring: Clock,
        Expired: AlertCircle,
        Pending: Clock
    };
    const Icon = icons[status];
    return (
        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles[status]}`}>
            <Icon className="w-3.5 h-3.5" />
            {status}
        </span>
    );
};

const ProfilePage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
      phone: user?.phone || '',
      address: user?.address || ''
  });
  
  // Role Request State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [requestedRole, setRequestedRole] = useState<Role | ''>('');
  const [requestReason, setRequestReason] = useState('');
  
  // Document Upload State
  const [showDocModal, setShowDocModal] = useState(false);
  const [docName, setDocName] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docFile, setDocFile] = useState<string | null>(null); // storing base64 for demo
  const [uploading, setUploading] = useState(false);

  const handleProfileUpdate = async () => {
      if (!user) return;
      try {
          await updateDoc(doc(db, 'users', user.uid), {
              phone: formData.phone,
              address: formData.address
          });
          setIsEditing(false);
      } catch (e) {
          console.error("Update failed", e);
          alert("Failed to update profile.");
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
          setShowRoleModal(false);
          alert("Role change request submitted to management.");
      } catch (e) {
          console.error("Role request failed", e);
          alert("Failed to submit request.");
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setDocFile(ev.target.result as string);
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleDocUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !docName || !docExpiry) return;
      setUploading(true);
      try {
          const newDoc: ComplianceDoc = {
              id: Date.now().toString(),
              name: docName,
              expiryDate: docExpiry,
              status: 'Pending', // Always pending verification initially
              uploadedAt: new Date().toISOString(),
              fileUrl: docFile || undefined
          };

          await updateDoc(doc(db, 'users', user.uid), {
              compliance: arrayUnion(newDoc)
          });
          
          setShowDocModal(false);
          setDocName('');
          setDocExpiry('');
          setDocFile(null);
      } catch (e) {
          console.error("Upload failed", e);
          alert("Failed to upload document.");
      } finally {
          setUploading(false);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-ams-blue to-blue-900 rounded-2xl overflow-hidden shadow-lg">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-full p-1 shadow-xl">
                  <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User className="w-12 h-12" />
                  </div>
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
              
              {/* Role Change Button */}
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
                          <ArrowUpCircle className="w-4 h-4" /> Request Upgrade
                      </button>
                  )}
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Personal Information */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-fit">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="font-bold text-slate-800">Personal Details</h3>
                  <button 
                    onClick={isEditing ? handleProfileUpdate : () => setIsEditing(true)}
                    className="text-sm text-ams-blue font-bold hover:underline"
                  >
                      {isEditing ? 'Save Changes' : 'Edit Details'}
                  </button>
              </div>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone Number</label>
                      <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-slate-400" />
                          {isEditing ? (
                              <input 
                                type="tel" 
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                                className="w-full text-sm border-b border-ams-blue focus:outline-none py-1 bg-transparent"
                              />
                          ) : (
                              <span className="text-slate-700">{user?.phone || 'Not set'}</span>
                          )}
                      </div>
                  </div>
                  <div className="pt-2">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Home Address</label>
                      <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                          {isEditing ? (
                              <textarea 
                                value={formData.address}
                                onChange={e => setFormData({...formData, address: e.target.value})}
                                className="w-full text-sm border border-slate-200 rounded p-2 focus:ring-1 focus:ring-ams-blue outline-none bg-transparent"
                                rows={2}
                              />
                          ) : (
                              <span className="text-slate-700">{user?.address || 'Not set'}</span>
                          )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Compliance & Documents */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-ams-blue" />
                      <h3 className="font-bold text-slate-800">Compliance Documents</h3>
                  </div>
                  <button 
                    onClick={() => setShowDocModal(true)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-bold transition-colors border border-slate-200"
                  >
                      <Upload className="w-4 h-4" /> Upload New
                  </button>
              </div>

              <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                          <tr>
                              <th className="px-4 py-3">Document Name</th>
                              <th className="px-4 py-3">Expiry Date</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {user?.compliance?.map((doc, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-3 font-medium text-slate-700">{doc.name}</td>
                                  <td className="px-4 py-3 text-slate-500">{new Date(doc.expiryDate).toLocaleDateString()}</td>
                                  <td className="px-4 py-3">
                                      <StatusBadge status={doc.status} />
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                      {doc.fileUrl && (
                                          <button onClick={() => window.open(doc.fileUrl)} className="text-ams-blue hover:text-blue-700 text-xs font-bold">View</button>
                                      )}
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

      {/* Role Request Modal */}
      {showRoleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800">Request Role Change</h3>
                      <button onClick={() => setShowRoleModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleRoleRequest} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">New Role</label>
                          <select 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                            value={requestedRole}
                            onChange={e => setRequestedRole(e.target.value as Role)}
                            required
                          >
                              <option value="">Select Role...</option>
                              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason / Justification</label>
                          <textarea 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
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

      {/* Doc Upload Modal */}
      {showDocModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-lg text-slate-800">Upload Document</h3>
                      <button onClick={() => setShowDocModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleDocUpload} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Document Name</label>
                          <input 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                            placeholder="e.g. DBS Certificate"
                            value={docName}
                            onChange={e => setDocName(e.target.value)}
                            required
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expiry Date</label>
                          <input 
                            type="date"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none"
                            value={docExpiry}
                            onChange={e => setDocExpiry(e.target.value)}
                            required
                          />
                      </div>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 relative">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileUpload} accept="image/*,application/pdf" required />
                          {docFile ? (
                              <span className="text-green-600 font-bold text-sm flex items-center justify-center gap-2"><CheckCircle className="w-4 h-4" /> File Selected</span>
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
    </div>
  );
};

export default ProfilePage;
