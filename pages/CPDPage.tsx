
import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, Plus, Award, FileText, ChevronRight, Loader2, Upload, Paperclip, CheckCircle } from 'lucide-react';
import { CPDEntry } from '../types';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, onSnapshot, addDoc, query, orderBy, Timestamp } from 'firebase/firestore';

const CPDPage = () => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<CPDEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<CPDEntry>>({ type: 'Self-directed', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/cpd`), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => { setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as CPDEntry))); setLoading(false); }, (error) => { console.error("CPD Fetch Error:", error); setLoading(false); });
    return () => unsub();
  }, [user]);

  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const targetHours = 30; 
  const progress = Math.min((totalHours / targetHours) * 100, 100);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => { if (ev.target?.result) setNewEntry({ ...newEntry, evidenceUrl: ev.target.result as string }); };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newEntry.title || !newEntry.hours || !newEntry.reflection) return;
      try {
          await addDoc(collection(db, `users/${user.uid}/cpd`), { title: newEntry.title, date: newEntry.date || new Date().toISOString().split('T')[0], type: newEntry.type, hours: Number(newEntry.hours), reflection: newEntry.reflection, evidenceUrl: newEntry.evidenceUrl || null, timestamp: Timestamp.now() });
          setShowModal(false); setNewEntry({ type: 'Self-directed', date: new Date().toISOString().split('T')[0] });
      } catch (error) { console.error("Error saving CPD", error); alert("Failed to save CPD entry."); }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Continuing Professional Development</h1>
                <p className="text-slate-500 dark:text-slate-400">Log and track your learning activities.</p>
            </div>
            <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-ams-blue text-white rounded-lg font-bold shadow-md hover:bg-blue-900 transition-colors"><Plus className="w-4 h-4" /> Log Activity</button>
        </div>

        {/* Modal - Updated Z-Index to 60 */}
        {showModal && (
            <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 max-w-lg w-full animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh] border border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Log New Activity</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="input-label">Activity Title</label>
                            <input required className="input-field" value={newEntry.title || ''} onChange={e => setNewEntry({...newEntry, title: e.target.value})} placeholder="e.g. Sepsis eLearning" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="input-label">Date</label><input type="date" required className="input-field" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} /></div>
                            <div><label className="input-label">Hours</label><input type="number" step="0.5" required className="input-field" value={newEntry.hours || ''} onChange={e => setNewEntry({...newEntry, hours: Number(e.target.value)})} placeholder="1.0" /></div>
                        </div>
                        <div>
                            <label className="input-label">Type</label>
                            <select className="input-field" value={newEntry.type} onChange={e => setNewEntry({...newEntry, type: e.target.value as any})}><option>Self-directed</option><option>Work-based</option><option>Formal</option></select>
                        </div>
                        <div>
                            <label className="input-label">Reflection</label>
                            <textarea required rows={4} className="input-field resize-none" value={newEntry.reflection || ''} onChange={e => setNewEntry({...newEntry, reflection: e.target.value})} placeholder="What did you learn?" />
                        </div>
                        
                        <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer relative">
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*,application/pdf" onChange={handleFileUpload} />
                             <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
                                {newEntry.evidenceUrl ? <><CheckCircle className="w-8 h-8 text-green-500" /><span className="text-sm font-bold text-green-600">File Attached</span></> : <><Upload className="w-8 h-8" /><span className="text-sm font-medium">Upload Certificate / Photo</span></>}
                             </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-100 dark:bg-slate-700 font-bold text-slate-600 dark:text-slate-300 rounded-lg">Cancel</button>
                            <button type="submit" className="flex-1 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-900">Save Entry</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        
        <style>{`
            .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5 ml-1; }
            .input-field { @apply w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ams-blue focus:border-transparent outline-none transition-all dark:text-white font-medium shadow-sm; }
        `}</style>
    </div>
  );
};

export default CPDPage;
