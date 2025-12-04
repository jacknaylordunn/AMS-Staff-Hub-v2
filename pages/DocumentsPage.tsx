
import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Download, Tag, Calendar, User, Upload, Loader2, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { CompanyDocument, Role } from '../types';

const DocumentsPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  
  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<CompanyDocument>>({ category: 'Policy' });
  const [uploading, setUploading] = useState(false);
  const [fileData, setFileData] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'documents'), orderBy('lastUpdated', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() } as CompanyDocument)));
        setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setFileData(ev.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDoc.title || !newDoc.category || !fileData) return;
      
      setUploading(true);
      try {
          await addDoc(collection(db, 'documents'), {
              title: newDoc.title,
              category: newDoc.category,
              description: newDoc.description || '',
              version: newDoc.version || '1.0',
              url: fileData,
              lastUpdated: new Date().toISOString(),
              uploadedBy: user?.name
          });
          setShowUploadModal(false);
          setNewDoc({ category: 'Policy' });
          setFileData(null);
          alert("Document published successfully.");
      } catch (e) {
          console.error("Upload error", e);
          alert("Failed to upload document.");
      } finally {
          setUploading(false);
      }
  };

  const filteredDocs = documents.filter(doc => 
      (categoryFilter === 'All' || doc.category === categoryFilter) &&
      (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.description?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Documents & Policies</h1>
              <p className="text-slate-500 dark:text-slate-400">Company SOPs, Clinical Guidelines, and Memos.</p>
          </div>
          {isManager && (
              <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-ams-blue text-white rounded-xl font-bold shadow-md hover:bg-blue-900 transition-colors">
                  <Upload className="w-4 h-4" /> Upload Document
              </button>
          )}
      </div>

      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white"
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
              {['All', 'Clinical', 'Operational', 'HR', 'Policy', 'Memo'].map(cat => (
                  <button 
                      key={cat} 
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${categoryFilter === cat ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                  >
                      {cat}
                  </button>
              ))}
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map(doc => (
              <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="flex justify-between items-start mb-3">
                      <div className={`p-3 rounded-lg ${doc.category === 'Clinical' ? 'bg-green-100 text-green-700' : doc.category === 'Operational' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                          <FileText className="w-6 h-6" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded text-slate-500">{doc.category}</span>
                  </div>
                  
                  <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1">{doc.title}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-8">{doc.description}</p>
                  
                  <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                      <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> v{doc.version}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(doc.lastUpdated).toLocaleDateString()}</span>
                  </div>

                  <button 
                      onClick={() => window.open(doc.url)} 
                      className="w-full py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                  >
                      <Download className="w-3 h-3" /> View Document
                  </button>
              </div>
          ))}
      </div>

      {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700">
                  <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-800 dark:text-white">Upload Document</h3>
                      <button onClick={() => setShowUploadModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <form onSubmit={handleUpload} className="p-6 space-y-4">
                      <div>
                          <label className="input-label">Document Title</label>
                          <input className="input-field" required value={newDoc.title || ''} onChange={e => setNewDoc({...newDoc, title: e.target.value})} placeholder="e.g. Infection Control Policy" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="input-label">Category</label>
                              <select className="input-field" value={newDoc.category} onChange={e => setNewDoc({...newDoc, category: e.target.value as any})}>
                                  <option>Policy</option><option>Clinical</option><option>Operational</option><option>HR</option><option>Memo</option>
                              </select>
                          </div>
                          <div>
                              <label className="input-label">Version</label>
                              <input className="input-field" value={newDoc.version || ''} onChange={e => setNewDoc({...newDoc, version: e.target.value})} placeholder="1.0" />
                          </div>
                      </div>
                      <div>
                          <label className="input-label">Description</label>
                          <textarea className="input-field resize-none" rows={2} value={newDoc.description || ''} onChange={e => setNewDoc({...newDoc, description: e.target.value})} placeholder="Brief summary..." />
                      </div>
                      <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-6 text-center relative hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".pdf,.doc,.docx,.png,.jpg" onChange={handleFileSelect} required />
                          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                          <p className="text-xs text-slate-500 font-bold">{fileData ? 'File Selected' : 'Tap to Select File'}</p>
                      </div>
                      <button disabled={uploading} type="submit" className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-colors disabled:opacity-50 flex justify-center">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Document'}
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};

export default DocumentsPage;
