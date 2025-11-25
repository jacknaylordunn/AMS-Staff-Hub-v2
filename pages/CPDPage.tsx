
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
  const [newEntry, setNewEntry] = useState<Partial<CPDEntry>>({
      type: 'Self-directed',
      date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, `users/${user.uid}/cpd`), orderBy('date', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as CPDEntry)));
        setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const totalHours = entries.reduce((acc, curr) => acc + curr.hours, 0);
  const targetHours = 30; // e.g., for Paramedic registration
  const progress = Math.min((totalHours / targetHours) * 100, 100);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setNewEntry({ ...newEntry, evidenceUrl: ev.target.result as string });
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newEntry.title || !newEntry.hours || !newEntry.reflection) return;
      
      try {
          await addDoc(collection(db, `users/${user.uid}/cpd`), {
              title: newEntry.title,
              date: newEntry.date || new Date().toISOString().split('T')[0],
              type: newEntry.type,
              hours: Number(newEntry.hours),
              reflection: newEntry.reflection,
              evidenceUrl: newEntry.evidenceUrl || null,
              timestamp: Timestamp.now()
          });
          setShowModal(false);
          setNewEntry({ type: 'Self-directed', date: new Date().toISOString().split('T')[0] });
      } catch (error) {
          console.error("Error saving CPD", error);
          alert("Failed to save CPD entry.");
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Continuing Professional Development</h1>
                <p className="text-slate-500">Log and track your learning activities.</p>
            </div>
            <button 
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-ams-blue text-white rounded-lg font-bold shadow-md hover:bg-blue-900 transition-colors"
            >
                <Plus className="w-4 h-4" /> Log Activity
            </button>
        </div>

        {/* Progress Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-8">
            <div className="relative w-32 h-32 flex-shrink-0">
                <svg className="w-full h-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" fill="transparent" stroke="#f1f5f9" strokeWidth="12" />
                    <circle 
                        cx="64" cy="64" r="56" 
                        fill="transparent" 
                        stroke="#00A8E8" 
                        strokeWidth="12" 
                        strokeDasharray={351.86} 
                        strokeDashoffset={351.86 - (progress / 100) * 351.86}
                        className="transition-all duration-1000 ease-out"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold text-slate-800">{totalHours}</span>
                    <span className="text-xs text-slate-400 font-bold uppercase">Hours</span>
                </div>
            </div>
            <div className="flex-1 space-y-4 w-full">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">Progress to Re-registration</h3>
                    <p className="text-sm text-slate-500">Target: {targetHours} Hours (Formal & Self-directed)</p>
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">Formal</div>
                        <div className="font-bold text-slate-700">{entries.filter(e => e.type === 'Formal').reduce((a,c) => a+c.hours, 0)} hrs</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">Work</div>
                        <div className="font-bold text-slate-700">{entries.filter(e => e.type === 'Work-based').reduce((a,c) => a+c.hours, 0)} hrs</div>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">Self</div>
                        <div className="font-bold text-slate-700">{entries.filter(e => e.type === 'Self-directed').reduce((a,c) => a+c.hours, 0)} hrs</div>
                    </div>
                </div>
            </div>
        </div>

        {/* Entries List */}
        <div className="space-y-4">
            <h3 className="font-bold text-slate-800 text-lg">Activity Log</h3>
            {entries.length === 0 && <p className="text-slate-400 italic">No CPD entries logged yet.</p>}
            {entries.map(entry => (
                <div key={entry.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`p-3 rounded-xl ${
                                entry.type === 'Formal' ? 'bg-purple-100 text-purple-600' :
                                entry.type === 'Work-based' ? 'bg-blue-100 text-blue-600' :
                                'bg-green-100 text-green-600'
                            }`}>
                                {entry.type === 'Formal' ? <Award className="w-5 h-5" /> : 
                                 entry.type === 'Work-based' ? <Clock className="w-5 h-5" /> : 
                                 <BookOpen className="w-5 h-5" />}
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">{entry.title}</h4>
                                <p className="text-xs text-slate-500 font-medium">{entry.date} • {entry.hours} Hours • {entry.type}</p>
                            </div>
                        </div>
                        {entry.evidenceUrl && (
                             <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                 <Paperclip className="w-3 h-3" /> Evidence
                             </div>
                        )}
                    </div>
                    <div className="pl-14">
                        <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                            "{entry.reflection}"
                        </p>
                        {entry.evidenceUrl && (
                            <button 
                                onClick={() => {
                                    const win = window.open();
                                    win?.document.write('<iframe src="' + entry.evidenceUrl  + '" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>');
                                }}
                                className="mt-2 text-xs font-bold text-ams-blue hover:underline flex items-center gap-1"
                            >
                                <FileText className="w-3 h-3" /> View Attached Certificate
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* Modal */}
        {showModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-lg w-full animate-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
                    <h2 className="text-xl font-bold text-slate-800 mb-4">Log New Activity</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Activity Title</label>
                            <input 
                                required
                                className="w-full input-field"
                                value={newEntry.title || ''}
                                onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                                placeholder="e.g. Sepsis eLearning"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                                <input 
                                    type="date"
                                    required
                                    className="w-full input-field"
                                    value={newEntry.date}
                                    onChange={e => setNewEntry({...newEntry, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hours</label>
                                <input 
                                    type="number"
                                    step="0.5"
                                    required
                                    className="w-full input-field"
                                    value={newEntry.hours || ''}
                                    onChange={e => setNewEntry({...newEntry, hours: Number(e.target.value)})}
                                    placeholder="1.0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                            <select 
                                className="w-full input-field"
                                value={newEntry.type}
                                onChange={e => setNewEntry({...newEntry, type: e.target.value as any})}
                            >
                                <option>Self-directed</option>
                                <option>Work-based</option>
                                <option>Formal</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reflection</label>
                            <textarea 
                                required
                                rows={4}
                                className="w-full input-field"
                                value={newEntry.reflection || ''}
                                onChange={e => setNewEntry({...newEntry, reflection: e.target.value})}
                                placeholder="What did you learn? How will this change your practice?"
                            />
                        </div>
                        
                        {/* Evidence Upload */}
                        <div className="p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                             <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*,application/pdf"
                                onChange={handleFileUpload}
                             />
                             <div className="flex flex-col items-center justify-center text-slate-500 gap-2">
                                {newEntry.evidenceUrl ? (
                                    <>
                                        <CheckCircle className="w-8 h-8 text-green-500" />
                                        <span className="text-sm font-bold text-green-600">File Attached</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8" />
                                        <span className="text-sm font-medium">Upload Certificate / Photo</span>
                                        <span className="text-xs opacity-60">Tap to browse</span>
                                    </>
                                )}
                             </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 bg-slate-100 font-bold text-slate-600 rounded-lg">Cancel</button>
                            <button type="submit" className="flex-1 py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-900">Save Entry</button>
                        </div>
                    </form>
                </div>
            </div>
        )}
        
        <style>{`
            .input-field {
                @apply bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue focus:border-transparent outline-none transition-all;
            }
        `}</style>
    </div>
  );
};

export default CPDPage;
