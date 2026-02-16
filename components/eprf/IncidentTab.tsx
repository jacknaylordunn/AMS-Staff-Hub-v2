
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Clock, MapPin, AlertTriangle, Crosshair, Loader2, Users, Plus, Trash2, Calendar, Timer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { User as UserType } from '../../types';
import AddressAutocomplete from '../AddressAutocomplete';

const IncidentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const { user } = useAuth();
    const [gettingLoc, setGettingLoc] = useState(false);
    const [staffList, setStaffList] = useState<UserType[]>([]);
    const [selectedStaffId, setSelectedStaffId] = useState('');

    useEffect(() => {
        if (!activeDraft) return;

        // Initial Self-Add
        if ((!activeDraft.assistingClinicians || activeDraft.assistingClinicians.length === 0) && user) {
            const initialCrew = [{
                name: user.name,
                role: user.role,
                badgeNumber: user.employeeId || 'Unknown'
            }];
            handleNestedUpdate(['assistingClinicians'], initialCrew);
        }

        // Auto-fill date if missing
        if (!activeDraft.times.incidentDate) {
            const today = new Date().toISOString().split('T')[0];
            handleNestedUpdate(['times', 'incidentDate'], today);
        }

        // Fetch Staff for dropdown
        const fetchStaff = async () => {
            const q = query(collection(db, 'users'), where('status', '==', 'Active'));
            const snap = await getDocs(q);
            setStaffList(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserType)));
        };
        fetchStaff();
    }, [activeDraft?.id, user]);

    if (!activeDraft) return null;

    const setTime = (field: keyof typeof activeDraft.times) => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        handleNestedUpdate(['times', field], now);
    };

    const handleGPS = () => {
        if (!navigator.geolocation) {
            alert("Geolocation not supported");
            return;
        }
        setGettingLoc(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
                handleNestedUpdate(['location'], coords);
                setGettingLoc(false);
            },
            (err) => {
                console.error(err);
                alert("Could not get location.");
                setGettingLoc(false);
            },
            { enableHighAccuracy: true }
        );
    };

    const addStaff = () => {
        if (!selectedStaffId) return;
        const staffMember = staffList.find(s => s.uid === selectedStaffId);
        if (!staffMember) return;

        const newMember = {
            name: staffMember.name,
            role: staffMember.role,
            badgeNumber: staffMember.employeeId || 'Unknown'
        };
        const current = activeDraft.assistingClinicians || [];
        handleNestedUpdate(['assistingClinicians'], [...current, newMember]);
        setSelectedStaffId('');
    };

    const removeStaff = (index: number) => {
        const current = activeDraft.assistingClinicians || [];
        const updated = current.filter((_, i) => i !== index);
        handleNestedUpdate(['assistingClinicians'], updated);
    };

    // Calculate duration on scene
    const getOnSceneDuration = () => {
        if (!activeDraft.times.onScene || !activeDraft.times.departScene) return null;
        const start = new Date(`1970-01-01T${activeDraft.times.onScene}`);
        const end = new Date(`1970-01-01T${activeDraft.times.departScene}`);
        let diff = (end.getTime() - start.getTime()) / 60000;
        if (diff < 0) diff += 1440; // Handle midnight
        return Math.floor(diff);
    };
    const duration = getOnSceneDuration();

    return (
        <div className="space-y-4 animate-in fade-in">
            {/* Incident Details */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-ams-blue" /> Incident Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="input-label">Incident Number</label>
                        <input 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm font-mono" 
                            value={activeDraft.incidentNumber} 
                            readOnly
                        />
                    </div>
                    <div>
                        <label className="input-label flex items-center gap-1"><Calendar className="w-3 h-3" /> Incident Date</label>
                        <input 
                            type="date"
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm" 
                            value={activeDraft.times.incidentDate || ''}
                            onChange={e => handleNestedUpdate(['times', 'incidentDate'], e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="input-label flex justify-between">
                            Location
                            <button onClick={handleGPS} disabled={gettingLoc} className="text-xs text-ams-blue font-bold flex items-center gap-1 hover:underline">
                                {gettingLoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
                                GPS
                            </button>
                        </label>
                        <div className="relative">
                            <AddressAutocomplete
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm" 
                                value={activeDraft.location} 
                                onChange={val => handleNestedUpdate(['location'], val)} 
                                placeholder="Address / Grid Ref"
                            />
                            <MapPin className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="input-label">Case Type</label>
                        <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                            {['Clinical', 'Welfare', 'Minor'].map(m => (
                                <button 
                                    key={m}
                                    onClick={() => handleNestedUpdate(['mode'], m)}
                                    className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all ${activeDraft.mode === m ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Staff / Crew Section */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-ams-blue" /> Crew / Staff
                </h3>
                
                <div className="space-y-2 mb-4">
                    {activeDraft.assistingClinicians?.map((member, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-bold text-xs">
                                    {member.name.charAt(0)}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{member.name}</p>
                                    <p className="text-xs text-slate-500">{member.role} ({member.badgeNumber})</p>
                                </div>
                            </div>
                            <button onClick={() => removeStaff(idx)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-2 items-end bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Search Staff Database</label>
                        <select 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1.5 text-sm outline-none dark:text-white"
                            value={selectedStaffId}
                            onChange={e => setSelectedStaffId(e.target.value)}
                        >
                            <option value="">-- Select Staff Member --</option>
                            {staffList.map(s => <option key={s.uid} value={s.uid}>{s.name} ({s.role})</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={addStaff}
                        disabled={!selectedStaffId}
                        className="bg-ams-blue text-white p-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors h-8 w-8 flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Timings */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-base text-slate-800 dark:text-white flex items-center gap-2">
                        <Clock className="w-4 h-4 text-ams-blue" /> Incident Timings
                    </h3>
                    {duration !== null && (
                        <div className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                            <Timer className="w-3 h-3" /> {duration} min on scene
                        </div>
                    )}
                </div>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { key: 'callReceived', label: 'Call Received' },
                        { key: 'mobile', label: 'Mobile' },
                        { key: 'onScene', label: 'On Scene' },
                        { key: 'patientContact', label: 'Pt Contact' },
                        { key: 'departScene', label: 'Depart Scene' },
                        { key: 'atHospital', label: 'At Hospital' },
                        { key: 'clear', label: 'Clear' },
                    ].map((time) => (
                        <div key={time.key} className="bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                            <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">{time.label}</label>
                            <div className="flex gap-1">
                                <input 
                                    type="time" 
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1 py-1 text-xs font-mono dark:text-white"
                                    value={(activeDraft.times as any)[time.key] || ''}
                                    onChange={e => handleNestedUpdate(['times', time.key], e.target.value)}
                                />
                                <button 
                                    onClick={() => setTime(time.key as any)}
                                    className="px-2 py-1 bg-ams-blue text-white rounded text-[10px] font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default IncidentTab;
