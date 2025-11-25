
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Ghost, HeartHandshake, ExternalLink, Loader2 } from 'lucide-react';
import { Kudos } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const WellbeingPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'Kudos' | 'Vent' | 'Resources'>('Kudos');
  const [kudosList, setKudosList] = useState<Kudos[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKudos, setNewKudos] = useState({ to: '', message: '' });
  const [ventMessage, setVentMessage] = useState('');
  const [ventSent, setVentSent] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'kudos'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        setKudosList(snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            timestamp: d.data().timestamp?.toDate().toLocaleString() || 'Recently' 
        } as Kudos)));
        setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleSendKudos = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newKudos.to || !newKudos.message) return;
      try {
          await addDoc(collection(db, 'kudos'), {
              fromUser: user.name,
              toUser: newKudos.to,
              message: newKudos.message,
              timestamp: Timestamp.now(),
              tags: ['Peer Support']
          });
          setNewKudos({ to: '', message: '' });
      } catch (e) {
          console.error("Error sending kudos", e);
      }
  };

  const handleSendVent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ventMessage) return;
      try {
          // Send anonymous feedback
          await addDoc(collection(db, 'feedback'), {
              message: ventMessage,
              timestamp: Timestamp.now(),
              type: 'Vent',
              anonymous: true
          });
          
          setVentSent(true);
          setTimeout(() => {
              setVentMessage('');
              setVentSent(false);
          }, 3000);
      } catch (e) {
          console.error("Error venting", e);
      }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="max-w-4xl mx-auto min-h-[80vh]">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800">Staff Wellbeing Hub</h1>
            <p className="text-slate-500 mt-2">Support each other, share feedback, and access resources.</p>
        </div>

        <div className="flex justify-center mb-8">
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-sm inline-flex">
                {[
                    { id: 'Kudos', label: 'Kudos Feed', icon: Heart },
                    { id: 'Vent', label: 'Vent Box', icon: Ghost },
                    { id: 'Resources', label: 'Resources', icon: HeartHandshake }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                            activeTab === tab.id 
                            ? 'bg-ams-blue text-white shadow-md' 
                            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4">
            {activeTab === 'Kudos' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Send Kudos Form */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Send className="w-4 h-4 text-ams-blue" /> Send Appreciation
                        </h3>
                        <form onSubmit={handleSendKudos} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">To (Name/Team)</label>
                                <input 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue outline-none"
                                    value={newKudos.to}
                                    onChange={e => setNewKudos({...newKudos, to: e.target.value})}
                                    placeholder="e.g. Sarah Jenkins"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message</label>
                                <textarea 
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue outline-none"
                                    value={newKudos.message}
                                    onChange={e => setNewKudos({...newKudos, message: e.target.value})}
                                    placeholder="Great job on..."
                                />
                            </div>
                            <button className="w-full py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-lg shadow-blue-500/30">
                                Post Kudos
                            </button>
                        </form>
                    </div>

                    {/* Feed */}
                    <div className="md:col-span-2 space-y-4">
                        {kudosList.length === 0 && <p className="text-center text-slate-400">No kudos posted yet. Be the first!</p>}
                        {kudosList.map(kudos => (
                            <div key={kudos.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Heart className="w-16 h-16 text-red-500 fill-current transform rotate-12" />
                                </div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-red-500 flex items-center justify-center text-white font-bold shadow-md">
                                        {kudos.fromUser.charAt(0)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">
                                                    {kudos.fromUser} <span className="text-slate-400 font-normal">to</span> {kudos.toUser}
                                                </p>
                                                <p className="text-xs text-slate-400">{kudos.timestamp}</p>
                                            </div>
                                            {kudos.tags && (
                                                <div className="flex gap-1">
                                                    {kudos.tags.map(tag => (
                                                        <span key={tag} className="text-[10px] bg-pink-50 text-pink-600 px-2 py-1 rounded-full font-bold uppercase tracking-wide">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <p className="mt-3 text-slate-600 leading-relaxed">
                                            "{kudos.message}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'Vent' && (
                <div className="max-w-xl mx-auto">
                    <div className="bg-slate-900 text-slate-300 p-8 rounded-2xl shadow-xl border border-slate-800 relative overflow-hidden">
                        <div className="absolute -right-10 -bottom-10 opacity-10">
                            <Ghost className="w-64 h-64 text-white" />
                        </div>
                        <div className="relative z-10">
                            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                                <Ghost className="w-6 h-6 text-slate-400" /> The Vent Box
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                Submit anonymous feedback, concerns, or frustrations directly to senior management. 
                                Your identity is cryptographically removed before submission.
                            </p>
                            
                            {ventSent ? (
                                <div className="bg-green-500/20 border border-green-500/30 p-6 rounded-xl text-center animate-in zoom-in">
                                    <p className="text-green-400 font-bold text-lg">Message Sent Anonymously</p>
                                    <p className="text-green-500/70 text-sm mt-1">Thank you for speaking up.</p>
                                </div>
                            ) : (
                                <form onSubmit={handleSendVent} className="space-y-4">
                                    <textarea 
                                        rows={6}
                                        required
                                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-slate-200 focus:ring-2 focus:ring-slate-500 outline-none resize-none placeholder-slate-600"
                                        placeholder="What's on your mind? Be honest..."
                                        value={ventMessage}
                                        onChange={e => setVentMessage(e.target.value)}
                                    />
                                    <button className="w-full py-3 bg-slate-100 text-slate-900 font-bold rounded-xl hover:bg-white transition-colors">
                                        Send Anonymously
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'Resources' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        { title: 'The Ambulance Staff Charity', desc: 'Financial, physical and mental wellbeing support.', url: 'https://theasc.org.uk', color: 'bg-green-50 text-green-700' },
                        { title: 'Mind - Blue Light Support', desc: 'Mental health support for emergency services.', url: 'https://mind.org.uk', color: 'bg-blue-50 text-blue-700' },
                        { title: 'Samaritans', desc: '24/7 confidential listening service. Call 116 123.', url: '#', color: 'bg-green-50 text-green-700' },
                        { title: 'Internal OH Referral', desc: 'Refer yourself to Occupational Health.', url: '#', color: 'bg-purple-50 text-purple-700' },
                    ].map((res, idx) => (
                        <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${res.color}`}>
                                    <HeartHandshake className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 group-hover:text-ams-blue transition-colors">{res.title}</h4>
                                    <p className="text-sm text-slate-500">{res.desc}</p>
                                </div>
                            </div>
                            <ExternalLink className="w-5 h-5 text-slate-300 group-hover:text-ams-blue" />
                        </a>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
};

export default WellbeingPage;
