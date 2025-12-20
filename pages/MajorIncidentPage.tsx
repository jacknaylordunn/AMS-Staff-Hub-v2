
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, Radio, Megaphone, Loader2, Lock, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc, onSnapshot, collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { MajorIncidentReport, Role, Shift } from '../types';
import { notifyAllStaff } from '../services/notificationService';

const MajorIncidentPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [activeIncidentData, setActiveIncidentData] = useState<Partial<MajorIncidentReport>>({});
  
  // Form State
  const [methane, setMethane] = useState({ 
      majorIncidentDeclared: false, 
      exactLocation: '', 
      typeOfIncident: '', 
      hazards: '', 
      access: '', 
      numberOfCasualties: '', 
      emergencyServices: '' 
  });
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [activeShifts, setActiveShifts] = useState<Shift[]>([]);

  // Permissions
  const canDeclare = user?.role === Role.Manager || user?.role === Role.Admin || user?.role === Role.Paramedic; 

  useEffect(() => {
    // 1. Listen for global active major incident
    const unsub = onSnapshot(doc(db, 'system', 'majorIncident'), (doc) => {
        if (doc.exists() && doc.data().active) { 
            setDeclared(true); 
            setActiveIncidentData(doc.data());
            // Pre-fill methane if available
            if (doc.data().methane) setMethane(doc.data().methane);
        } else { 
            setDeclared(false); 
        }
        setLoading(false);
    }, (error) => { 
        console.error("Major Incident Fetch Error:", error); 
        setLoading(false); 
    });

    // 2. Load active shifts for context linking
    const fetchActiveShifts = async () => {
        const now = new Date();
        const start = new Date(now); start.setHours(start.getHours() - 12);
        const end = new Date(now); end.setHours(end.getHours() + 12);
        
        try {
            const q = query(
                collection(db, 'shifts'), 
                where('start', '>=', Timestamp.fromDate(start)),
                where('start', '<=', Timestamp.fromDate(end))
            );
            const snap = await getDocs(q);
            const shifts = snap.docs.map(d => ({id: d.id, ...d.data(), start: d.data().start.toDate()} as Shift));
            setActiveShifts(shifts);
        } catch (e) {
            console.error("Shift fetch error", e);
        }
    };
    fetchActiveShifts();

    return () => unsub();
  }, []);

  const handleDeclare = async () => { 
      if (!canDeclare) {
          alert("Only Managers or Lead Clinicians can declare a Major Incident.\nPlease submit a METHANE report instead.");
          return;
      }
      
      if (confirm("WARNING: You are about to DECLARE A MAJOR INCIDENT.\n\nThis will alert all staff and commanders immediately.\n\nAre you sure?")) { 
          try { 
              setLoading(true); 
              
              const report: MajorIncidentReport = {
                  id: `MI-${Date.now()}`,
                  active: true, 
                  declaredBy: user?.name || 'Unknown',
                  declaredByRole: user?.role,
                  timeDeclared: new Date().toISOString(),
                  type: 'DECLARATION',
                  linkedShiftId: selectedShiftId || undefined,
                  methane: { ...methane, majorIncidentDeclared: true }
              };

              // 1. Set System State
              await setDoc(doc(db, 'system', 'majorIncident'), report); 
              
              // 2. Log to Audit Collection
              await addDoc(collection(db, 'major_incident_logs'), report);

              // 3. Notify Everyone
              await notifyAllStaff(
                  "MAJOR INCIDENT DECLARED",
                  `Action Required: Standby for instructions. Location: ${methane.exactLocation || 'Pending'}`,
                  'alert',
                  '/major-incident'
              );

              setDeclared(true); 
          } catch (error) { 
              console.error("Error declaring:", error); 
              alert("Failed to declare."); 
          } finally { 
              setLoading(false); 
          } 
      } 
  };

  const handleSubmitMethane = async () => { 
      if (!methane.exactLocation || !methane.typeOfIncident) {
          alert("Location and Type are required.");
          return;
      }

      try { 
          const isDeclaration = declared; // If already declared, we are just updating
          
          const report: MajorIncidentReport = {
              id: `REP-${Date.now()}`,
              active: isDeclaration,
              declaredBy: user?.name || 'Unknown',
              declaredByRole: user?.role,
              timeDeclared: new Date().toISOString(),
              type: 'METHANE_REPORT',
              linkedShiftId: selectedShiftId || activeIncidentData.linkedShiftId,
              methane: { ...methane, majorIncidentDeclared: isDeclaration }
          };

          // If active, update the singleton to broadcast latest info
          if (isDeclaration) {
              await setDoc(doc(db, 'system', 'majorIncident'), report, { merge: true });
          }
          
          // Always log report to audit trail
          await addDoc(collection(db, 'major_incident_logs'), report);
          
          alert(isDeclaration ? "METHANE Update Broadcasted." : "METHANE Report Submitted to Control.");
          if (!isDeclaration) {
              // Reset form if just a report
              setMethane({ majorIncidentDeclared: false, exactLocation: '', typeOfIncident: '', hazards: '', access: '', numberOfCasualties: '', emergencyServices: '' });
          }
      } catch (error) { 
          console.error("Error updating:", error); 
      } 
  };

  const handleStandDown = async () => { 
      if (!canDeclare) return;
      if (confirm("Are you sure you want to STAND DOWN?")) { 
          await setDoc(doc(db, 'system', 'majorIncident'), { active: false, standDownTime: new Date().toISOString() }, { merge: true }); 
          
          await notifyAllStaff(
              "Major Incident Stand Down",
              `The incident has been stood down by ${user?.name}. Return to normal duties.`,
              'success',
              '/'
          );

          setDeclared(false); 
          setMethane({ majorIncidentDeclared: false, exactLocation: '', typeOfIncident: '', hazards: '', access: '', numberOfCasualties: '', emergencyServices: '' }); 
      } 
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 animate-spin text-ams-blue" /></div>;

  return (
    <div className="max-w-3xl mx-auto pb-10">
        {!declared ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4"><AlertTriangle className="w-12 h-12 text-slate-400" /></div>
                <h1 className="text-3xl font-bold text-slate-800 dark:text-white">Major Incident Standby</h1>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">The METHANE reporting tool is ready for deployment.</p>
                
                {canDeclare ? (
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-100 dark:border-red-900/30 w-full max-w-md animate-in fade-in">
                        <h3 className="font-bold text-red-800 dark:text-red-400 mb-4 flex items-center gap-2 justify-center"><ShieldCheck className="w-5 h-5" /> Operational Commander Zone</h3>
                        
                        <div className="mb-4 text-left">
                            <label className="block text-xs font-bold text-red-700 dark:text-red-300 uppercase mb-1">Context Link (Optional)</label>
                            <select className="w-full p-2 rounded bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 text-sm" value={selectedShiftId} onChange={e => setSelectedShiftId(e.target.value)}>
                                <option value="">-- General / No Specific Event --</option>
                                {activeShifts.map(s => <option key={s.id} value={s.id}>{s.location} ({s.start.toLocaleTimeString()})</option>)}
                            </select>
                        </div>

                        <button onClick={handleDeclare} className="w-full px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-red-600/30 flex items-center justify-center gap-3 transition-transform hover:scale-105">
                            <Megaphone className="w-6 h-6" /> DECLARE MAJOR INCIDENT
                        </button>
                    </div>
                ) : (
                    <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-md w-full text-left">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2"><Send className="w-4 h-4" /> Submit Field Report</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">If you are first on scene, submit a METHANE report. This will alert control but will NOT declare a system-wide Major Incident automatically.</p>
                        
                        <div className="space-y-3 mb-4">
                            <input className="methane-input py-2 text-sm" placeholder="Exact Location..." value={methane.exactLocation} onChange={e => setMethane({...methane, exactLocation: e.target.value})} />
                            <input className="methane-input py-2 text-sm" placeholder="Type of Incident..." value={methane.typeOfIncident} onChange={e => setMethane({...methane, typeOfIncident: e.target.value})} />
                        </div>
                        <button onClick={handleSubmitMethane} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-900">Submit METHANE Report</button>
                    </div>
                )}
            </div>
        ) : (
            <div className="animate-in fade-in zoom-in duration-300">
                <div className="bg-red-600 text-white p-6 rounded-t-2xl flex flex-col md:flex-row items-center justify-between shadow-lg relative overflow-hidden gap-4">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold flex items-center gap-3"><AlertTriangle className="w-8 h-8 animate-pulse" /> MAJOR INCIDENT DECLARED</h1>
                        <p className="text-red-100 text-sm mt-1">
                            Cmd: {activeIncidentData.declaredBy} • {new Date(activeIncidentData.timeDeclared!).toLocaleTimeString()}
                        </p>
                    </div>
                    {canDeclare && (
                        <button onClick={handleStandDown} className="relative z-10 px-6 py-2 bg-white text-red-600 rounded-lg text-sm font-bold shadow-md hover:bg-red-50 transition-colors">
                            STAND DOWN
                        </button>
                    )}
                </div>
                
                <div className="bg-white dark:bg-slate-800 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-2xl p-8 shadow-sm">
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4">
                            <p className="text-slate-600 dark:text-slate-300 font-bold">METHANE Report</p>
                            <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded font-bold">LIVE UPDATE</span>
                        </div>
                        <div className="space-y-6">
                            <div className="form-group"><label className="methane-label">M - Major Incident</label><div className="flex items-center gap-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg"><Radio className="w-5 h-5 text-red-600" /><span className="font-bold text-red-700 dark:text-red-400">Major Incident Declared</span></div></div>
                            <div className="form-group"><label className="methane-label">E - Exact Location</label><input type="text" className="methane-input" placeholder="Grid ref or precise description..." value={methane.exactLocation} onChange={e => setMethane({...methane, exactLocation: e.target.value})} /></div>
                            <div className="form-group"><label className="methane-label">T - Type of Incident</label><input type="text" className="methane-input" placeholder="e.g. RTC, Chemical, Fire, Collapse..." value={methane.typeOfIncident} onChange={e => setMethane({...methane, typeOfIncident: e.target.value})} /></div>
                            <div className="form-group"><label className="methane-label">H - Hazards</label><textarea className="methane-input" placeholder="Present and potential hazards..." value={methane.hazards} onChange={e => setMethane({...methane, hazards: e.target.value})} /></div>
                            <div className="form-group"><label className="methane-label">A - Access</label><input type="text" className="methane-input" placeholder="Best route for access and egress..." value={methane.access} onChange={e => setMethane({...methane, access: e.target.value})} /></div>
                            <div className="form-group"><label className="methane-label">N - Number of Casualties</label><select className="methane-input" value={methane.numberOfCasualties} onChange={e => setMethane({...methane, numberOfCasualties: e.target.value})}><option value="">Select Estimate...</option><option>1-5</option><option>6-15</option><option>16-50</option><option>50+</option></select></div>
                            <div className="form-group"><label className="methane-label">E - Emergency Services</label><input type="text" className="methane-input" placeholder="Present and required..." value={methane.emergencyServices} onChange={e => setMethane({...methane, emergencyServices: e.target.value})} /></div>
                        </div>
                    </div>
                    <button onClick={handleSubmitMethane} className="w-full py-4 bg-slate-900 dark:bg-black text-white rounded-xl font-bold text-lg hover:bg-slate-800 flex items-center justify-center gap-2 shadow-xl">
                        <Send className="w-5 h-5" /> BROADCAST UPDATE
                    </button>
                </div>
            </div>
        )}
        
        <style>{`
            .methane-label { @apply block text-sm font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 tracking-wider; }
            .methane-input { @apply w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium text-slate-900 dark:text-white shadow-sm; }
        `}</style>
    </div>
  );
};

export default MajorIncidentPage;
