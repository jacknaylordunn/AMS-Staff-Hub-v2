
import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Ghost, HeartHandshake, ExternalLink, Loader2, Lock, Globe, User, Stethoscope, CheckCircle } from 'lucide-react';
import { Kudos, User as UserType } from '../types';
import { db } from '../services/firebase';
import { collection, addDoc, onSnapshot, query, orderBy, Timestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';

const WellbeingPage = () => {
  const { user } = useAuth();
  const isManager = user?.role === 'Manager' || user?.role === 'Admin';
  
  const [activeTab, setActiveTab] = useState<'Kudos' | 'Vent' | 'Resources' | 'OH'>('Kudos');
  const [kudosList, setKudosList] = useState<Kudos[]>([]);
  const [staffList, setStaffList] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Forms
  const [newKudos, setNewKudos] = useState({ toUid: '', message: '', isPublic: true });
  const [ventMessage, setVentMessage] = useState('');
  const [ventSent, setVentSent] = useState(false);
  const [ohForm, setOhForm] = useState({ reason: '', urgency: 'Routine', contact: 'Email' });
  const [ohSent, setOhSent] = useState(false);

  useEffect(() => {
    // 1. Fetch Kudos
    const q = query(collection(db, 'kudos'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        setKudosList(snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            timestamp: d.data().timestamp?.toDate().toLocaleString() || 'Recently' 
        } as Kudos)));
        setLoading(false);
    });

    // 2. Fetch Staff for Dropdown
    const fetchStaff = async () => {
        const snap = await getDocs(collection(db, 'users'));
        setStaffList(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserType)).filter(u => u.status === 'Active'));
    };
    fetchStaff();

    return () => unsub();
  }, []);

  const handleSendKudos = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user || !newKudos.toUid || !newKudos.message) return;
      
      const recipient = staffList.find(s => s.uid === newKudos.toUid);
      if (!recipient) return;

      try {
          await addDoc(collection(db, 'kudos'), {
              fromUser: user.name,
              fromUid: user.uid,
              toUser: recipient.name,
              toUid: recipient.uid,
              message: newKudos.message,
              isPublic: newKudos.isPublic,
              timestamp: Timestamp.now(),
              tags: ['Peer Support']
          });
          setNewKudos({ toUid: '', message: '', isPublic: true });
          alert("Kudos sent!");
      } catch (e) {
          console.error("Error sending kudos", e);
      }
  };

  const handleSendVent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!ventMessage) return;
      try {
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

  const handleOhReferral = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!user) return;
      try {
          await addDoc(collection(db, 'oh_referrals'), {
              userId: user.uid,
              userName: user.name,
              date: new Date().toISOString(),
              status: 'Submitted',
              ...ohForm
          });
          setOhSent(true);
          setTimeout(() => {
              setOhForm({ reason: '', urgency: 'Routine', contact: 'Email' });
              setOhSent(false);
          }, 3000);
      } catch (e) {
          console.error("OH Error", e);
      }
  };

  // Filter Kudos for display
  const visibleKudos = kudosList.filter(k => 
      k.isPublic || 
      isManager || 
      k.fromUid === user?.uid || 
      k.toUid === user?.uid
  );

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-ams-blue" /></div>;

  return (
    <div className="max-w-5xl mx-auto min-h-[80vh] pb-10">
        <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Staff Wellbeing Hub</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">Support each other, share feedback, and access resources.</p>
        </div>

        <div className="flex justify-center mb-8">
            <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm inline-flex flex-wrap justify-center gap-1">
                {[
                    { id: 'Kudos', label: 'Kudos Feed', icon: Heart },
                    { id: 'Vent', label: 'Vent Box', icon: Ghost },
                    { id: 'OH', label: 'Occupational Health', icon: Stethoscope },
                    { id: 'Resources', label: 'Resources', icon: HeartHandshake }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${
                            activeTab === tab.id 
                            ? 'bg-ams-blue text-white shadow-md' 
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
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
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm h-fit sticky top-24">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Send className="w-4 h-4 text-ams-blue" /> Send Appreciation
                        </h3>
                        <form onSubmit={handleSendKudos} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">To Staff Member</label>
                                <select 
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue outline-none dark:text-white"
                                    value={newKudos.toUid}
                                    onChange={e => setNewKudos({...newKudos, toUid: e.target.value})}
                                    required
                                >
                                    <option value="">Select Colleague...</option>
                                    {staffList.map(s => <option key={s.uid} value={s.uid}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Message</label>
                                <textarea 
                                    rows={3}
                                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-ams-blue outline-none dark:text-white resize-none"
                                    value={newKudos.message}
                                    onChange={e => setNewKudos({...newKudos, message: e.target.value})}
                                    placeholder="Great job on..."
                                    required
                                />
                            </div>
                            
                            {/* Improved Toggle Layout */}
                            <div className="flex flex-wrap items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg justify-between">
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer px-2">
                                    <input 
                                        type="radio" 
                                        checked={newKudos.isPublic} 
                                        onChange={() => setNewKudos({...newKudos, isPublic: true})}
                                        className="text-ams-blue focus:ring-ams-blue"
                                    />
                                    <Globe className="w-3 h-3 text-slate-500" /> Public
                                </label>
                                <label className="flex items-center gap-2 text-xs font-bold cursor-pointer px-2">
                                    <input 
                                        type="radio" 
                                        checked={!newKudos.isPublic} 
                                        onChange={() => setNewKudos({...newKudos, isPublic: false})}
                                        className="text-ams-blue focus:ring-ams-blue"
                                    />
                                    <Lock className="w-3 h-3 text-slate-500" /> Private
                                </label>
                            </div>

                            <button className="w-full py-2 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-lg shadow-blue-500/30">
                                Post Kudos
                            </button>
                        </form>
                    </div>

                    {/* Feed */}
                    <div className="md:col-span-2 space-y-4">
                        {visibleKudos.length === 0 && <p className="text-center text-slate-400 py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No kudos to display.</p>}
                        {visibleKudos.map(kudos => (
                            <div key={kudos.id} className={`p-6 rounded-2xl border shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow ${!kudos.isPublic ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                {!kudos.isPublic && (
                                    <div className="absolute top-2 right-2 text-[10px] uppercase font-bold bg-slate-200 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded flex items-center gap-1">
                                        <Lock className="w-3 h-3" /> Private
                                    </div>
                                )}
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
                                                <p className="text-sm font-bold text-slate-800 dark:text-white">
                                                    {kudos.fromUser} <span className="text-slate-400 font-normal">to</span> {kudos.toUser}
                                                </p>
                                                <p className="text-xs text-slate-400">{kudos.timestamp}</p>
                                            </div>
                                        </div>
                                        <p className="mt-3 text-slate-600 dark:text-slate-300 leading-relaxed">
                                            "{kudos.message}"
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'OH' && (
                <div className="max-w-2xl mx-auto">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-full text-ams-blue">
                                <Stethoscope className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Occupational Health Referral</h2>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Confidential self-referral service.</p>
                            </div>
                        </div>

                        {ohSent ? (
                            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-xl text-center border border-green-200 dark:border-green-800">
                                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                                <h3 className="font-bold text-green-700 dark:text-green-400">Referral Submitted</h3>
                                <p className="text-sm text-green-600 dark:text-green-300">The OH team will contact you shortly via your preferred method.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleOhReferral} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Reason for Referral</label>
                                    <textarea 
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-ams-blue resize-none dark:text-white"
                                        rows={4}
                                        placeholder="Briefly describe the issue (e.g. Back pain, Stress, Exposure)..."
                                        value={ohForm.reason}
                                        onChange={e => setOhForm({...ohForm, reason: e.target.value})}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Urgency</label>
                                        <select 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none dark:text-white"
                                            value={ohForm.urgency}
                                            onChange={e => setOhForm({...ohForm, urgency: e.target.value as any})}
                                        >
                                            <option>Routine</option>
                                            <option>Urgent</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Contact Preference</label>
                                        <select 
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm outline-none dark:text-white"
                                            value={ohForm.contact}
                                            onChange={e => setOhForm({...ohForm, contact: e.target.value as any})}
                                        >
                                            <option>Email</option>
                                            <option>Phone</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-xs text-blue-800 dark:text-blue-300">
                                    <strong>Privacy Notice:</strong> This referral is sent directly to the OH department. Your line manager is <u>not</u> notified of the details unless you choose to inform them.
                                </div>
                                <button className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-md">
                                    Submit Referral
                                </button>
                            </form>
                        )}
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
                        { title: 'The Ambulance Staff Charity', desc: 'Financial, physical and mental wellbeing support.', url: 'https://theasc.org.uk', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                        { title: 'Mind - Blue Light Support', desc: 'Mental health support for emergency services.', url: 'https://mind.org.uk', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
                        { title: 'Samaritans', desc: '24/7 confidential listening service. Call 116 123.', url: '#', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
                    ].map((res, idx) => (
                        <a key={idx} href={res.url} target="_blank" rel="noreferrer" className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl ${res.color}`}>
                                    <HeartHandshake className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-white group-hover:text-ams-blue transition-colors">{res.title}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{res.desc}</p>
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
