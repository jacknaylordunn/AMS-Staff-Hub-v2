
import React, { useState, useEffect } from 'react';
import { Clock, CalendarCheck, Truck, AlertTriangle, Play, CheckCircle, Loader2, Plus, Pill, FilePlus, Megaphone, X, ArrowRight, MapPin, ShieldCheck, Activity, Users, Settings, BellRing, Navigation, Sparkles, Bot } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, updateDoc, doc, Timestamp, getDoc, orderBy, limit, onSnapshot, setDoc, runTransaction } from 'firebase/firestore';
import { Shift, TimeRecord, Announcement, Role, ComplianceDoc, User } from '../types';
import { useNavigate } from 'react-router-dom';
import AnnouncementModal from '../components/AnnouncementModal';

const QuickAction = ({ icon: Icon, label, onClick, color, desc }: any) => (
    <button 
        onClick={onClick}
        className="flex flex-col items-start p-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-glass-hover hover:-translate-y-1 transition-all duration-300 group w-full text-left h-full"
    >
        <div className={`p-3 rounded-xl mb-3 ${color} text-white shadow-md group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-6 h-6" />
        </div>
        <span className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-ams-blue dark:group-hover:text-ams-teal transition-colors">{label}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{desc}</span>
    </button>
);

interface ComplianceItemProps {
    name: string;
    date: string;
    status: 'Valid' | 'Expiring' | 'Expired' | 'Pending';
}

const ComplianceItem: React.FC<ComplianceItemProps> = ({ name, date, status }) => (
    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50 group hover:border-slate-200 transition-colors">
        <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${status === 'Valid' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : status === 'Expiring' ? 'bg-amber-500 animate-pulse' : status === 'Pending' ? 'bg-blue-500' : 'bg-red-500'}`} />
            <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-ams-blue transition-colors">{name}</p>
                <p className="text-[10px] text-slate-400 font-mono">EXP: {new Date(date).toLocaleDateString()}</p>
            </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            status === 'Valid' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 
            status === 'Expiring' ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' : 
            status === 'Pending' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800' :
            'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
        }`}>
            {status.toUpperCase()}
        </span>
    </div>
);

const CLINICAL_ROLES = [Role.Paramedic, Role.Nurse, Role.Doctor, Role.Manager, Role.Admin];

const SYSTEM_STATUS_OPTS = [
    { level: 'Operational', color: 'bg-green-500', text: 'Normal Operations' },
    { level: 'Busy', color: 'bg-amber-500', text: 'High Demand' },
    { level: 'Critical', color: 'bg-red-600', text: 'Critical Incident' },
    { level: 'Outage', color: 'bg-slate-800', text: 'System Outage' },
];

// Haversine Distance Helper
const getDistanceFromLatLonInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d;
}

const deg2rad = (deg: number) => {
  return deg * (Math.PI/180)
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isManager = user?.role === Role.Manager || user?.role === Role.Admin;
  
  const [showClockModal, setShowClockModal] = useState(false);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [nextShift, setNextShift] = useState<Shift | null>(null);
  const [shiftDuration, setShiftDuration] = useState<string>('00:00:00');
  const [todayShifts, setTodayShifts] = useState<Shift[]>([]);
  const [clockStep, setClockStep] = useState<'SELECT' | 'GPS' | 'CONFIRMED' | 'ERROR'>('SELECT');
  const [locationStr, setLocationStr] = useState('');
  const [gpsError, setGpsError] = useState('');
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  
  // System Status
  const [systemStatus, setSystemStatus] = useState({ level: 'Operational', message: 'All Systems Nominal' });
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Live Tracking (Managers)
  const [activeStaff, setActiveStaff] = useState<any[]>([]);

  // System Status Listener
  useEffect(() => {
      const unsub = onSnapshot(doc(db, 'system', 'status'), (doc) => {
          if (doc.exists()) {
              setSystemStatus(doc.data() as any);
          } else {
              // Create default if missing
              setDoc(doc.ref, { level: 'Operational', message: 'System Ready' });
          }
      });
      return () => unsub();
  }, []);

  // Load shifts & Cross-Device Active Check
  useEffect(() => {
    if (!user) return;
    
    const now = new Date();
    // Check window: Yesterday to +2 Days (covers active night shifts and next shifts)
    const start = new Date(now); start.setDate(start.getDate() - 1); 
    const end = new Date(now); end.setDate(end.getDate() + 2);

    const q = query(
        collection(db, 'shifts'),
        where('start', '>=', Timestamp.fromDate(start)),
        where('start', '<=', Timestamp.fromDate(end))
    );
    
    const unsub = onSnapshot(q, (snap) => {
        const shifts = snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(), 
            start: d.data().start.toDate(), 
            end: d.data().end.toDate() 
        } as Shift));
        
        // 1. Filter my shifts for display
        const myShifts = shifts
            .filter(s => s.slots && s.slots.some(slot => slot.userId === user.uid))
            .sort((a, b) => a.start.getTime() - b.start.getTime());
        
        setTodayShifts(myShifts);

        // 2. Find Next Shift (First one in future)
        const upcoming = myShifts.find(s => s.start > now);
        setNextShift(upcoming || null);

        // 3. Determine Active Shift based on TimeRecords (Cross-Device Sync)
        // Look for any shift where I have a clockInTime but NO clockOutTime
        const currentActive = shifts.find(s => {
            const record = s.timeRecords?.[user.uid];
            return record && record.clockInTime && !record.clockOutTime;
        });
        
        setActiveShift(currentActive || null);

        // 4. For Managers: Aggregate Active Staff
        if (isManager) {
            const activePeople: any[] = [];
            shifts.forEach(s => {
                if (s.timeRecords) {
                    Object.entries(s.timeRecords).forEach(([uid, rec]) => {
                        const record = rec as TimeRecord;
                        if (record.clockInTime && !record.clockOutTime) {
                            // Find name from slot
                            const slot = s.slots.find(sl => sl.userId === uid);
                            activePeople.push({
                                id: uid,
                                name: slot?.userName || 'Unknown',
                                role: slot?.role,
                                location: s.location,
                                address: s.address,
                                since: record.clockInTime,
                                gps: record.clockInLocation
                            });
                        }
                    });
                }
            });
            setActiveStaff(activePeople);
        }
    });

    return () => unsub();
  }, [user, isManager]);

  useEffect(() => {
      const q = query(collection(db, 'announcements'), orderBy('date', 'desc'), limit(5));
      const unsub = onSnapshot(q, (snap) => {
          setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() } as Announcement)));
      });
      return () => unsub();
  }, []);

  useEffect(() => {
      let interval: any;
      if (activeShift) {
          interval = setInterval(() => {
             const record = activeShift.timeRecords?.[user!.uid];
             if (record?.clockInTime) {
                 const start = new Date(record.clockInTime).getTime();
                 const now = new Date().getTime();
                 const diff = now - start;
                 const hours = Math.floor(diff / (1000 * 60 * 60)).toString().padStart(2, '0');
                 const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)).toString().padStart(2, '0');
                 const seconds = Math.floor((diff % (1000 * 60)) / 1000).toString().padStart(2, '0');
                 setShiftDuration(`${hours}:${minutes}:${seconds}`);
             }
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [activeShift, user]);

  const initiateClockIn = (shift: Shift) => {
      setActiveShift(shift); 
      setClockStep('GPS');
      setGpsError('');
      setDistanceToSite(null);

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLocationStr(`${position.coords.latitude.toFixed(5)}, ${position.coords.longitude.toFixed(5)}`);
                
                // Calculate distance if site address is coordinates
                if (shift.address && /^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(shift.address)) {
                    const [siteLat, siteLon] = shift.address.split(',').map(s => parseFloat(s.trim()));
                    const dist = getDistanceFromLatLonInKm(position.coords.latitude, position.coords.longitude, siteLat, siteLon);
                    setDistanceToSite(dist);
                }

                setClockStep('CONFIRMED');
            },
            () => {
                setGpsError("GPS Signal Failed. Proceeding with manual override (Logged).");
                setLocationStr("GPS_FAILED_MANUAL");
                setClockStep('CONFIRMED');
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
      } else {
          setGpsError("Geo not supported");
          setLocationStr("UNSUPPORTED");
          setClockStep('CONFIRMED');
      }
  };

  const confirmClockIn = async () => {
      if (!activeShift || !user) return;
      try {
          const timeRecord: TimeRecord = {
              userId: user.uid,
              clockInTime: new Date().toISOString(),
              clockInLocation: locationStr,
          };
          
          await updateDoc(doc(db, 'shifts', activeShift.id), {
              [`timeRecords.${user.uid}`]: timeRecord
          });

          setShowClockModal(false);
      } catch (e) {
          console.error("Clock In Failed", e);
          alert("Failed to clock in.");
      }
  };

  const handleClockOut = async () => {
      if (!activeShift || !user) return;
      if (!confirm("Are you sure you want to end your shift?")) return;

      try {
          // Transactional update to ensure stats and shift record are synced
          await runTransaction(db, async (transaction) => {
              const shiftRef = doc(db, 'shifts', activeShift.id);
              const userRef = doc(db, 'users', user.uid);
              
              const shiftDoc = await transaction.get(shiftRef);
              const userDoc = await transaction.get(userRef);

              if (!shiftDoc.exists() || !userDoc.exists()) throw "Document does not exist!";

              const shiftData = shiftDoc.data() as Shift;
              const userData = userDoc.data() as User;
              const timeRecord = shiftData.timeRecords?.[user.uid];

              if (!timeRecord || !timeRecord.clockInTime) throw "No clock in record";

              const outTime = new Date().toISOString();
              const durationMs = new Date(outTime).getTime() - new Date(timeRecord.clockInTime).getTime();
              const durationHours = durationMs / (1000 * 60 * 60);

              // Update Shift Record
              const newTimeRecord = { ...timeRecord, clockOutTime: outTime, durationMinutes: Math.round(durationMs / 60000) };
              transaction.update(shiftRef, {
                  [`timeRecords.${user.uid}`]: newTimeRecord
              });

              // Update User Stats (Aggregation)
              const currentStats = userData.stats || { totalHours: 0, completedShifts: 0 };
              transaction.update(userRef, {
                  stats: {
                      totalHours: (currentStats.totalHours || 0) + durationHours,
                      completedShifts: (currentStats.completedShifts || 0) + 1,
                      lastShiftDate: outTime
                  }
              });
          });
          
          setActiveShift(null);
      } catch (e) {
          console.error("Clock Out Failed", e);
          alert("Failed to clock out cleanly. Please check internet connection.");
      }
  };

  const updateSystemStatus = async (level: string) => {
      await setDoc(doc(db, 'system', 'status'), {
          level,
          message: SYSTEM_STATUS_OPTS.find(s => s.level === level)?.text || 'Updated'
      });
      setShowStatusModal(false);
  };

  // Determine late status
  const isLate = !activeShift && nextShift && new Date() > nextShift.start && new Date() < nextShift.end;

  const isClinical = user ? CLINICAL_ROLES.includes(user.role) : false;

  // Build Action List based on Role
  const quickActions = [
      { icon: FilePlus, label: "New ePRF", desc: "Create clinical record", color: "bg-ams-blue", onClick: () => navigate('/eprf') },
      { icon: Truck, label: "Perform Check", desc: "VDI & Inventory", color: "bg-emerald-500", onClick: () => navigate('/assets') },
      ...(isClinical ? [{ icon: Pill, label: "Drug Audit", desc: "CD Register log", color: "bg-purple-500", onClick: () => navigate('/drugs') }] : []),
      { icon: Clock, label: "Rota / Leave", desc: "View schedule", color: "bg-amber-500", onClick: () => navigate('/rota') }
  ];

  return (
    <div className="space-y-8">
      
      {/* Clock In Modal */}
      {showClockModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-6 max-w-sm w-full text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-ams-blue to-ams-teal"></div>
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="font-bold text-xl text-slate-800 dark:text-white">Clock In</h3>
                      <button onClick={() => setShowClockModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400">
                        <X className="w-5 h-5" />
                      </button>
                  </div>

                  {clockStep === 'SELECT' && (
                      <div className="space-y-4">
                          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Select your assigned shift:</p>
                          {todayShifts.filter(s => s.end > new Date()).length === 0 ? (
                              <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex flex-col items-center gap-3">
                                  <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm"><CalendarCheck className="w-6 h-6 text-slate-400" /></div>
                                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No shifts found.</p>
                                  <p className="text-xs text-slate-400">Check Rota for assignments.</p>
                              </div>
                          ) : (
                              <div className="space-y-3">
                                  {todayShifts.filter(s => s.end > new Date()).map(s => {
                                      const mySlot = s.slots?.find(slot => slot.userId === user?.uid);
                                      return (
                                          <button 
                                            key={s.id}
                                            onClick={() => initiateClockIn(s)}
                                            className="w-full p-4 bg-white dark:bg-slate-700 hover:bg-blue-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-2xl text-left transition-all shadow-sm hover:shadow-md group"
                                          >
                                              <div className="flex justify-between items-center mb-1">
                                                  <div className="font-bold text-slate-800 dark:text-white group-hover:text-ams-blue transition-colors truncate pr-2">{s.location}</div>
                                                  <div className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-full text-[10px] font-bold text-slate-500 uppercase flex-shrink-0">
                                                      {s.start.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                                  </div>
                                              </div>
                                              {s.address && (
                                                  <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1 truncate">
                                                      <MapPin className="w-3 h-3" /> {s.address}
                                                  </div>
                                              )}
                                              <div className="text-xs font-medium text-slate-400 flex items-center gap-1 mb-1">
                                                  Role: <span className="text-slate-600 dark:text-slate-300 font-bold">{mySlot?.role}</span>
                                              </div>
                                          </button>
                                      );
                                  })}
                              </div>
                          )}
                      </div>
                  )}
                  
                  {clockStep === 'GPS' && (
                      <div className="space-y-6 py-8">
                          <div className="relative w-20 h-20 mx-auto">
                              <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-700 rounded-full"></div>
                              <div className="absolute inset-0 border-4 border-ams-blue rounded-full border-t-transparent animate-spin"></div>
                              <MapPin className="absolute inset-0 m-auto w-8 h-8 text-ams-blue animate-bounce" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Acquiring GPS</h3>
                              <p className="text-xs text-slate-400 mt-1">Verifying location...</p>
                          </div>
                      </div>
                  )}

                  {clockStep === 'CONFIRMED' && activeShift && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-4">
                          <div className="w-20 h-20 mx-auto bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center shadow-lg">
                              <CheckCircle className="w-10 h-10" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Ready to Start</h3>
                              <p className="text-xs text-slate-400">Location logged successfully.</p>
                              {distanceToSite !== null && (
                                  <div className="mt-2 bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full text-xs font-bold inline-block">
                                      {distanceToSite < 0.2 ? "✅ On Site" : `📍 ${distanceToSite.toFixed(1)}km from site`}
                                  </div>
                              )}
                          </div>
                          
                          <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl text-left border border-slate-200 dark:border-slate-700">
                              <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Target Site</p>
                              <p className="text-sm font-bold text-slate-800 dark:text-white">{activeShift.location}</p>
                              {activeShift.address && <p className="text-xs text-slate-500 dark:text-slate-400">{activeShift.address}</p>}
                          </div>

                          <button 
                            onClick={confirmClockIn}
                            className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 hover:bg-blue-900 transition-all active:scale-95"
                          >
                              Confirm Clock In
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* System Status Manager Modal */}
      {showStatusModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in duration-200">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm">
                  <h3 className="font-bold text-lg mb-4 dark:text-white">Update System Status</h3>
                  <div className="space-y-2">
                      {SYSTEM_STATUS_OPTS.map(opt => (
                          <button 
                            key={opt.level} 
                            onClick={() => updateSystemStatus(opt.level)}
                            className={`w-full p-3 rounded-xl flex items-center justify-between font-bold text-sm text-white ${opt.color}`}
                          >
                              {opt.text}
                              {systemStatus.level === opt.level && <CheckCircle className="w-5 h-5" />}
                          </button>
                      ))}
                  </div>
                  <button onClick={() => setShowStatusModal(false)} className="mt-4 w-full py-2 text-slate-500 font-bold text-sm">Cancel</button>
              </div>
          </div>
      )}

      {/* Hero / Active Shift Section */}
      <div className="glass-panel rounded-3xl p-8 relative overflow-hidden shadow-glass">
          {/* Decorative BG */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-ams-blue/10 to-transparent rounded-bl-full -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
              <div className="flex-1">
                  <div className="flex items-center gap-4">
                      <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 dark:text-white tracking-tight">
                          Hello, {user?.name.split(' ')[0]}
                      </h1>
                  </div>
                  
                  {/* Dynamic System Status */}
                  <div className="mt-2 flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-white/50 dark:bg-black/30 rounded-full border border-white/20">
                          <span className={`relative flex h-3 w-3`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${SYSTEM_STATUS_OPTS.find(s=>s.level===systemStatus.level)?.color || 'bg-green-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${SYSTEM_STATUS_OPTS.find(s=>s.level===systemStatus.level)?.color || 'bg-green-500'}`}></span>
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {systemStatus.message}
                          </span>
                      </div>
                      {isManager && (
                          <button onClick={() => setShowStatusModal(true)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors">
                              <Settings className="w-4 h-4" />
                          </button>
                      )}
                  </div>
                  
                  {/* Next Shift Indicator & Alerts */}
                  {!activeShift && isLate && (
                      <div className="mt-6 flex items-center gap-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200 p-3 rounded-2xl border border-red-200 dark:border-red-800 animate-pulse">
                          <BellRing className="w-5 h-5" />
                          <div className="text-sm font-bold">Shift Started! Please Clock In.</div>
                      </div>
                  )}

                  {!activeShift && !isLate && nextShift && (
                      <div className="mt-6 flex items-center gap-4 bg-white/60 dark:bg-black/20 p-3 rounded-2xl backdrop-blur-sm border border-white/20 inline-flex">
                          <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                              <CalendarCheck className="w-5 h-5 text-ams-blue" />
                          </div>
                          <div>
                              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Your Next Shift</p>
                              <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold text-slate-800 dark:text-white">{nextShift.start.toLocaleDateString([], {weekday: 'short', day: 'numeric'})} @ {nextShift.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  <ArrowRight className="w-3 h-3 text-slate-400" />
                                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate max-w-[150px]">{nextShift.location}</span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>

              <div>
                  {activeShift ? (
                      <div className="bg-white dark:bg-slate-800/80 backdrop-blur-md p-2 pr-6 rounded-full border border-slate-200 dark:border-slate-700 shadow-lg flex items-center gap-4">
                          <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-md">
                              <Clock className="w-5 h-5 animate-pulse" />
                              <span className="font-mono font-bold text-lg tracking-wider">{shiftDuration}</span>
                          </div>
                          <div className="flex flex-col text-right mr-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active Unit</span>
                              <span className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-none truncate max-w-[120px]">{activeShift.location}</span>
                              {activeShift.address && (
                                  <span className="text-[10px] text-slate-500 flex justify-end items-center gap-1 mt-0.5 max-w-[120px] truncate"><MapPin className="w-2.5 h-2.5" /> {activeShift.address}</span>
                              )}
                          </div>
                          <button 
                              onClick={handleClockOut}
                              className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
                              title="Clock Out"
                          >
                              <div className="w-3 h-3 bg-current rounded-sm" />
                          </button>
                      </div>
                  ) : (
                      <button 
                          onClick={() => { setShowClockModal(true); setClockStep('SELECT'); }}
                          className="flex items-center gap-3 px-8 py-4 bg-ams-blue text-white rounded-2xl text-lg font-bold shadow-glow hover:bg-blue-700 transition-all hover:scale-105 active:scale-95"
                      >
                          <Play className="w-5 h-5 fill-current" /> Clock In
                      </button>
                  )}
              </div>
          </div>
      </div>

      {/* Manager Live Operations View */}
      {isManager && activeStaff.length > 0 && (
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl border border-slate-800 text-white">
              <h3 className="font-bold flex items-center gap-2 mb-4">
                  <Activity className="w-5 h-5 text-green-400" /> Live Personnel ({activeStaff.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeStaff.map(s => (
                      <div key={s.id} className="bg-slate-800 p-3 rounded-xl border border-slate-700 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold">
                                  {s.name.charAt(0)}
                              </div>
                              <div className="overflow-hidden">
                                  <div className="text-sm font-bold truncate">{s.name}</div>
                                  <div className="text-xs text-slate-400 flex items-center gap-1 truncate">
                                      <MapPin className="w-3 h-3" /> {s.location}
                                  </div>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-1 rounded">Active</span>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Quick Actions Grid */}
      <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Quick Actions</h2>
          <div className={`grid grid-cols-2 md:grid-cols-${quickActions.length} gap-4`}>
              {quickActions.map((action, idx) => (
                  <QuickAction 
                    key={idx}
                    icon={action.icon}
                    label={action.label}
                    desc={action.desc}
                    color={action.color}
                    onClick={action.onClick}
                  />
              ))}
          </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Compliance Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col h-full shadow-sm">
             <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                    <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Compliance</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Document Status</p>
                </div>
             </div>
             
             <div className="flex-1 space-y-3">
                {(user?.compliance && user.compliance.length > 0) ? (
                    user.compliance.slice(0, 4).map((doc: ComplianceDoc) => (
                        <ComplianceItem key={doc.id} name={doc.name} date={doc.expiryDate} status={doc.status} />
                    ))
                ) : (
                    <div className="text-center text-slate-400 text-xs py-8">No compliance documents found.</div>
                )}
             </div>
             
             <button onClick={() => navigate('/profile')} className="mt-6 w-full py-3 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-xl text-sm hover:bg-white dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-2">
                 View All Documents <ArrowRight className="w-4 h-4" />
             </button>
        </div>

        {/* Notifications / Feed */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
          <div className="flex justify-between items-center mb-6">
             <h3 className="font-bold text-slate-800 dark:text-white text-lg">Operational Feed</h3>
             <div className="flex gap-2">
                 {isManager && (
                     <button onClick={() => setShowAnnouncementModal(true)} className="flex items-center gap-2 px-3 py-1 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-900 transition-colors">
                         <Plus className="w-3 h-3" /> New
                     </button>
                 )}
                 <span className="text-xs font-bold text-slate-400 uppercase bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">Live</span>
             </div>
          </div>
          
          <div className="space-y-4">
            {announcements.length === 0 && (
                <div className="text-center py-12 text-slate-400 italic bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">No recent announcements.</div>
            )}
            
            {announcements.map(item => (
                <div key={item.id} className={`p-5 rounded-2xl border flex gap-4 transition-colors cursor-pointer group ${
                    item.priority === 'Urgent' 
                    ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30' 
                    : 'bg-white dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 hover:border-slate-200'
                }`}>
                  <div className="flex-shrink-0 mt-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                          item.priority === 'Urgent' 
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-ams-blue dark:text-blue-400'
                      }`}>
                         {item.priority === 'Urgent' ? <AlertTriangle className="w-5 h-5" /> : <Megaphone className="w-5 h-5" />}
                      </div>
                  </div>
                  <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className={`font-bold text-sm ${item.priority === 'Urgent' ? 'text-red-900 dark:text-red-200' : 'text-slate-800 dark:text-slate-200'}`}>
                            {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                            {item.author}
                        </span>
                      </div>
                      <p className={`text-sm mt-1 leading-relaxed ${item.priority === 'Urgent' ? 'text-red-800 dark:text-red-300' : 'text-slate-600 dark:text-slate-400'}`}>
                          {item.message}
                      </p>
                  </div>
                </div>
            ))}
          </div>
        </div>
      </div>
      
      {showAnnouncementModal && <AnnouncementModal onClose={() => setShowAnnouncementModal(false)} />}
    </div>
  );
};

export default Dashboard;
