
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Clock, MapPin, AlertTriangle, Crosshair, Loader2, Users, Plus, Trash2, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const IncidentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const { user } = useAuth();
    const [gettingLoc, setGettingLoc] = useState(false);
    const [newStaffName, setNewStaffName] = useState('');
    const [newStaffRole, setNewStaffRole] = useState('');

    useEffect(() => {
        if (activeDraft && (!activeDraft.assistingClinicians || activeDraft.assistingClinicians.length === 0) && user) {
            const initialCrew = [{
                name: user.name,
                role: user.role,
                badgeNumber: user.employeeId || 'Unknown'
            }];
            handleNestedUpdate(['assistingClinicians'], initialCrew);
        }
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
        if (!newStaffName) return;
        const newMember = {
            name: newStaffName,
            role: newStaffRole || 'Clinician',
            badgeNumber: 'Manual Entry'
        };
        const current = activeDraft.assistingClinicians || [];
        handleNestedUpdate(['assistingClinicians'], [...current, newMember]);
        setNewStaffName('');
        setNewStaffRole('');
    };

    const removeStaff = (index: number) => {
        const current = activeDraft.assistingClinicians || [];
        const updated = current.filter((_, i) => i !== index);
        handleNestedUpdate(['assistingClinicians'], updated);
    };

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
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm" 
                            value={activeDraft.incidentNumber} 
                            readOnly
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
                            <MapPin className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm" 
                                value={activeDraft.location} 
                                onChange={e => handleNestedUpdate(['location'], e.target.value)} 
                                placeholder="Address / Grid Ref"
                            />
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
                                    <p className="text-xs text-slate-500">{member.role}</p>
                                </div>
                            </div>
                            <button onClick={() => removeStaff(idx)} className="p-1 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {(!activeDraft.assistingClinicians || activeDraft.assistingClinicians.length === 0) && (
                        <p className="text-sm text-slate-400 italic">No staff assigned.</p>
                    )}
                </div>

                <div className="flex gap-2 items-end bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Name</label>
                        <input 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none dark:text-white"
                            placeholder="Staff Name"
                            value={newStaffName}
                            onChange={e => setNewStaffName(e.target.value)}
                        />
                    </div>
                    <div className="w-1/3">
                        <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Role</label>
                        <input 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-sm outline-none dark:text-white"
                            placeholder="Role (e.g. Medic)"
                            value={newStaffRole}
                            onChange={e => setNewStaffRole(e.target.value)}
                        />
                    </div>
                    <button 
                        onClick={addStaff}
                        disabled={!newStaffName}
                        className="bg-ams-blue text-white p-1.5 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors h-8 w-8 flex items-center justify-center"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Timings */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-ams-blue" /> Incident Timings
                </h3>
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
