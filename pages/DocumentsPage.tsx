
import React, { useState, useEffect } from 'react';
import { FileText, Search, Plus, Download, Tag, Calendar, User, Upload, Loader2, X, Archive, Eye, LayoutGrid, List, ArrowUpDown, Filter } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, Timestamp } from 'firebase/firestore';
import { uploadFile } from '../services/storage';
import { CompanyDocument, Role } from '../types';
import BulkDocUploader from '../components/BulkDocUploader';
import DocumentViewerModal from '../components/DocumentViewerModal';

const DocumentsPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Organization State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Viewer State
  const [viewingDoc, setViewingDoc] = useState<CompanyDocument | null>(null);

  // Upload Modal
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [newDoc, setNewDoc] = useState<Partial<CompanyDocument>>({ category: 'Policy' });
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
          setSelectedFile(e.target.files[0]);
      }
  };

  const handleUpload = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDoc.title || !newDoc.category || !selectedFile) return;
      
      setUploading(true);
      try {
          const downloadUrl = await uploadFile(selectedFile, 'documents');

          await addDoc(collection(db, 'documents'), {
              title: newDoc.title,
              category: newDoc.category,
              description: newDoc.description || '',
              version: newDoc.version || '1.0',
              url: downloadUrl,
              lastUpdated: new Date().toISOString(),
              uploadedBy: user?.name || 'Unknown'
          });
          setShowUploadModal(false);
          setNewDoc({ category: 'Policy' });
          setSelectedFile(null);
          alert("Document published successfully.");
      } catch (e) {
          console.error("Upload error", e);
          alert("Failed to upload document.");
      } finally {
          setUploading(false);
      }
  };

  // Filter & Sort Logic
  const getProcessedDocuments = () => {
      let filtered = documents.filter(doc => 
          (categoryFilter === 'All' || doc.category === categoryFilter) &&
          (doc.title.toLowerCase().includes(searchTerm.toLowerCase()) || doc.description?.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      return filtered.sort((a, b) => {
          switch (sortOrder) {
              case 'newest': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
              case 'oldest': return new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
              case 'az': return a.title.localeCompare(b.title);
              case 'za': return b.title.localeCompare(a.title);
              default: return 0;
          }
      });
  };

  const processedDocs = getProcessedDocuments();

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Documents & Policies</h1>
              <p className="text-slate-500 dark:text-slate-400">Company SOPs, Clinical Guidelines, and Memos.</p>
          </div>
          {isManager && (
              <div className="flex gap-2">
                  <button onClick={() => setShowBulkModal(true)} className="flex items-center gap-2 px-4 py-2 bg-slate-800 dark:bg-slate-700 text-white rounded-xl font-bold shadow-md hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors text-sm">
                      <Archive className="w-4 h-4" /> Bulk Import
                  </button>
                  <button onClick={() => setShowUploadModal(true)} className="flex items-center gap-2 px-4 py-2 bg-ams-blue text-white rounded-xl font-bold shadow-md hover:bg-blue-900 transition-colors text-sm">
                      <Upload className="w-4 h-4" /> Upload
                  </button>
              </div>
          )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col xl:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          {/* Search */}
          <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ams-blue text-slate-900 dark:text-white transition-all"
                  placeholder="Search by title or description..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>

          <div className="flex flex-wrap gap-2 items-center">
              {/* Category Filter */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {['All', 'Clinical', 'Operational', 'HR', 'Policy', 'Memo'].map(cat => (
                      <button 
                          key={cat} 
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${categoryFilter === cat ? 'bg-slate-800 text-white border-slate-800 dark:bg-white dark:text-slate-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                      >
                          {cat}
                      </button>
                  ))}
              </div>

              <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden xl:block"></div>

              {/* Sort Dropdown */}
              <div className="relative">
                  <select 
                      className="appearance-none bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-3 pr-8 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-2 focus:ring-ams-blue cursor-pointer"
                      value={sortOrder}
                      onChange={(e) => setSortOrder(e.target.value as any)}
                  >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="az">A-Z</option>
                      <option value="za">Z-A</option>
                  </select>
                  <ArrowUpDown className="absolute right-2.5 top-2.5 w-3 h-3 text-slate-400 pointer-events-none" />
              </div>

              {/* View Toggle */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      <List className="w-4 h-4" />
                  </button>
              </div>
          </div>
      </div>

      {processedDocs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Filter className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">No documents found matching your filters.</p>
          </div>
      ) : (
          <>
            {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {processedDocs.map(doc => (
                        <div key={doc.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-3 rounded-lg ${doc.category === 'Clinical' ? 'bg-green-100 text-green-700' : doc.category === 'Operational' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>
                                    <FileText className="w-6 h-6" />
                                </div>
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded text-slate-500">{doc.category}</span>
                            </div>
                            
                            <h3 className="font-bold text-slate-800 dark:text-white mb-1 line-clamp-1" title={doc.title}>{doc.title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 h-8">{doc.description}</p>
                            
                            <div className="mt-auto">
                                <div className="flex items-center gap-3 text-xs text-slate-400 mb-4">
                                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> v{doc.version}</span>
                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(doc.lastUpdated).toLocaleDateString()}</span>
                                </div>

                                <button 
                                    onClick={() => setViewingDoc(doc)} 
                                    className="w-full py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-lg text-xs flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                                >
                                    <Eye className="w-3 h-3" /> View Document
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                            <tr>
                                <th className="px-6 py-4">Document Name</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">Version</th>
                                <th className="px-6 py-4">Last Updated</th>
                                <th className="px-6 py-4">Uploaded By</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                            {processedDocs.map(doc => (
                                <tr key={doc.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <div>
                                                <div className="font-bold text-slate-800 dark:text-white">{doc.title}</div>
                                                <div className="text-xs text-slate-500 line-clamp-1">{doc.description}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                                            doc.category === 'Clinical' ? 'bg-green-100 text-green-700' : 
                                            doc.category === 'Operational' ? 'bg-blue-100 text-blue-700' : 
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {doc.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-400 text-xs">v{doc.version}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{new Date(doc.lastUpdated).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 text-xs">{doc.uploadedBy}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setViewingDoc(doc)}
                                            className="text-ams-blue hover:text-blue-700 font-bold text-xs flex items-center justify-end gap-1"
                                        >
                                            <Eye className="w-3 h-3" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </>
      )}

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
                          <p className="text-xs text-slate-500 font-bold">{selectedFile ? selectedFile.name : 'Tap to Select File'}</p>
                      </div>
                      <button disabled={uploading} type="submit" className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Publish Document'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {showBulkModal && <BulkDocUploader onClose={() => setShowBulkModal(false)} />}
      
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

export default DocumentsPage;
