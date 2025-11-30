
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Clock, MapPin, AlertTriangle } from 'lucide-react';

const IncidentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    if (!activeDraft) return null;

    const setTime = (field: keyof typeof activeDraft.times) => {
        const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        handleNestedUpdate(['times', field], now);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Incident Details */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-ams-blue" /> Incident Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="input-label">Call Sign</label>
                        <input 
                            className="input-field" 
                            value={activeDraft.callSign} 
                            onChange={e => handleNestedUpdate(['callSign'], e.target.value)} 
                            placeholder="e.g. RRV-01"
                        />
                    </div>
                    <div>
                        <label className="input-label">Incident Number</label>
                        <input 
                            className="input-field" 
                            value={activeDraft.incidentNumber} 
                            readOnly
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="input-label">Incident Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                            <input 
                                className="input-field pl-10" 
                                value={activeDraft.location} 
                                onChange={e => handleNestedUpdate(['location'], e.target.value)} 
                                placeholder="Full address / Grid ref"
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
                                    className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${activeDraft.mode === m ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500'}`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Timings */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-ams-blue" /> Incident Timings
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { key: 'callReceived', label: 'Call Received' },
                        { key: 'mobile', label: 'Mobile' },
                        { key: 'onScene', label: 'On Scene' },
                        { key: 'patientContact', label: 'Patient Contact' },
                        { key: 'departScene', label: 'Depart Scene' },
                        { key: 'atHospital', label: 'At Hospital / Base' },
                        { key: 'clear', label: 'Clear / Available' },
                    ].map((time) => (
                        <div key={time.key} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{time.label}</label>
                            <div className="flex gap-2">
                                <input 
                                    type="time" 
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-sm font-mono dark:text-white"
                                    value={(activeDraft.times as any)[time.key] || ''}
                                    onChange={e => handleNestedUpdate(['times', time.key], e.target.value)}
                                />
                                <button 
                                    onClick={() => setTime(time.key as any)}
                                    className="px-3 py-1 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
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
