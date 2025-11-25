
import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, Radio, Megaphone, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

const MajorIncidentPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [declared, setDeclared] = useState(false);
  const [methane, setMethane] = useState({
      major: true,
      exactLocation: '',
      type: '',
      hazards: '',
      access: '',
      number: '',
      emergency: ''
  });

  // Listen for real-time updates from Firestore
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'majorIncident'), (doc) => {
        if (doc.exists() && doc.data().active) {
            setDeclared(true);
            setMethane(prev => ({...prev, ...doc.data()}));
        } else {
            setDeclared(false);
        }
        setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleDeclare = async () => {
      if (confirm("Are you sure you want to DECLARE a MAJOR INCIDENT? This will alert all staff.")) {
          try {
              setLoading(true);
              await setDoc(doc(db, 'system', 'majorIncident'), {
                  active: true,
                  declaredBy: user?.name,
                  declaredAt: new Date().toISOString(),
                  type: 'Unspecified',
                  location: 'Pending METHANE',
                  ...methane
              });
              setDeclared(true);
          } catch (error) {
              console.error("Error declaring incident:", error);
              alert("Failed to declare incident. Check connection.");
          } finally {
              setLoading(false);
          }
      }
  };

  const handleUpdate = async () => {
      try {
        await setDoc(doc(db, 'system', 'majorIncident'), {
            active: true,
            lastUpdated: new Date().toISOString(),
            ...methane
        }, { merge: true });
        alert("METHANE Report Broadcasted Successfully");
      } catch (error) {
          console.error("Error updating:", error);
      }
  };

  const handleStandDown = async () => {
      if (confirm("Are you sure you want to STAND DOWN? This will clear all alerts.")) {
        await setDoc(doc(db, 'system', 'majorIncident'), { active: false });
        setDeclared(false);
        setMethane({
            major: true,
            exactLocation: '',
            type: '',
            hazards: '',
            access: '',
            number: '',
            emergency: ''
        });
      }
  };

  if (loading) return (
      <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-ams-blue" />
      </div>
  );

  return (
    <div className="max-w-3xl mx-auto pb-10">
        {!declared ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle className="w-12 h-12 text-slate-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-800">Major Incident Standby</h1>
                <p className="text-slate-500 max-w-md">No active major incident. If you are the first on scene of a major incident, use the button below to initiate the METHANE protocol.</p>
                
                <button 
                    onClick={handleDeclare}
                    className="mt-8 px-8 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xl shadow-xl shadow-red-600/30 flex items-center gap-3 transition-transform hover:scale-105"
                >
                    <Megaphone className="w-6 h-6" />
                    DECLARE MAJOR INCIDENT
                </button>
            </div>
        ) : (
            <div className="animate-in fade-in zoom-in duration-300">
                <div className="bg-red-600 text-white p-6 rounded-t-2xl flex items-center justify-between shadow-lg relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] opacity-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 animate-pulse" />
                            MAJOR INCIDENT DECLARED
                        </h1>
                        <p className="text-red-100 text-sm mt-1">Updates live. Last update: {new Date().toLocaleTimeString()}</p>
                    </div>
                    <button 
                        onClick={handleStandDown}
                        className="relative z-10 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold border border-white/50"
                    >
                        STAND DOWN
                    </button>
                </div>
                
                <div className="bg-white border-x border-b border-slate-200 rounded-b-2xl p-8 shadow-sm">
                    <div className="mb-8">
                        <p className="text-slate-600 mb-4">Complete the METHANE report to update Control and incoming resources.</p>
                        <div className="space-y-6">
                            
                            {/* M - Major Incident */}
                            <div className="form-group">
                                <label className="methane-label">M - Major Incident</label>
                                <div className="flex items-center gap-4 p-3 bg-red-50 border border-red-100 rounded-lg">
                                    <Radio className="w-5 h-5 text-red-600" />
                                    <span className="font-bold text-red-700">Major Incident Declared</span>
                                </div>
                            </div>

                            {/* E - Exact Location */}
                            <div className="form-group">
                                <label className="methane-label">E - Exact Location</label>
                                <input 
                                    type="text" 
                                    className="methane-input"
                                    placeholder="Grid ref or precise description..."
                                    value={methane.exactLocation}
                                    onChange={e => setMethane({...methane, exactLocation: e.target.value})}
                                />
                            </div>

                            {/* T - Type of Incident */}
                            <div className="form-group">
                                <label className="methane-label">T - Type of Incident</label>
                                <input 
                                    type="text" 
                                    className="methane-input"
                                    placeholder="e.g. RTC, Chemical, Fire, Collapse..."
                                    value={methane.type}
                                    onChange={e => setMethane({...methane, type: e.target.value})}
                                />
                            </div>

                            {/* H - Hazards */}
                            <div className="form-group">
                                <label className="methane-label">H - Hazards</label>
                                <textarea 
                                    className="methane-input"
                                    placeholder="Present and potential hazards..."
                                    value={methane.hazards}
                                    onChange={e => setMethane({...methane, hazards: e.target.value})}
                                />
                            </div>

                            {/* A - Access */}
                            <div className="form-group">
                                <label className="methane-label">A - Access</label>
                                <input 
                                    type="text" 
                                    className="methane-input"
                                    placeholder="Best route for access and egress..."
                                    value={methane.access}
                                    onChange={e => setMethane({...methane, access: e.target.value})}
                                />
                            </div>

                            {/* N - Number of Casualties */}
                            <div className="form-group">
                                <label className="methane-label">N - Number of Casualties</label>
                                <select 
                                    className="methane-input"
                                    value={methane.number}
                                    onChange={e => setMethane({...methane, number: e.target.value})}
                                >
                                    <option value="">Select Estimate...</option>
                                    <option>1-5</option>
                                    <option>6-15</option>
                                    <option>16-50</option>
                                    <option>50+</option>
                                </select>
                            </div>

                            {/* E - Emergency Services */}
                            <div className="form-group">
                                <label className="methane-label">E - Emergency Services</label>
                                <input 
                                    type="text" 
                                    className="methane-input"
                                    placeholder="Present and required..."
                                    value={methane.emergency}
                                    onChange={e => setMethane({...methane, emergency: e.target.value})}
                                />
                            </div>

                        </div>
                    </div>

                    <button 
                        onClick={handleUpdate}
                        className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold text-lg hover:bg-slate-800 flex items-center justify-center gap-2 shadow-xl"
                    >
                        <Send className="w-5 h-5" /> BROADCAST UPDATE
                    </button>
                </div>
            </div>
        )}
        
        <style>{`
            .methane-label {
                @apply block text-sm font-bold text-slate-500 uppercase mb-2 tracking-wider;
            }
            .methane-input {
                @apply w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition-all font-medium text-slate-800;
            }
        `}</style>
    </div>
  );
};

export default MajorIncidentPage;
