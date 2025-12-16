
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Stethoscope, Check, AlertTriangle, Wind, Activity, Eye, Thermometer } from 'lucide-react';

const PrimarySurveyTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    
    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;

    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    const setNormal = (section: string) => {
        if (section === 'A') {
            update(['primary', 'airway'], { status: 'Patent', patency: 'Patent', notes: 'Clear, self-maintained', intervention: 'None' });
        }
        if (section === 'B') {
            update(['primary', 'breathing'], { ...assessment.primary.breathing, effort: 'Normal', chestExpansion: 'Equal', soundsL: 'Clear', soundsR: 'Clear', rhythm: 'Regular', depth: 'Normal' });
        }
        if (section === 'C') {
            update(['primary', 'circulation'], { ...assessment.primary.circulation, radialPulse: 'Present (Strong)', skin: 'Normal/Warm/Dry', capRefill: '< 2s', color: 'Pink' });
        }
        if (section === 'D') {
            update(['primary', 'disability'], { ...assessment.primary.disability, avpu: 'Alert', gcs: '15', pupils: 'PEARL 4mm' });
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="glass-panel p-6 rounded-xl relative overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Stethoscope className="w-6 h-6 text-ams-blue" /> Primary Survey (&lt;C&gt;ABCDE)
                    </h3>
                    <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-full border border-blue-100 dark:border-blue-800">
                        Critical Safety Check
                    </div>
                </div>
                
                {/* <C> Catastrophic Haemorrhage */}
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 rounded-r-xl shadow-sm">
                    <div className="flex justify-between items-start">
                        <div>
                            <h4 className="font-bold text-red-900 dark:text-red-200 text-sm mb-1">&lt;C&gt; Catastrophic Haemorrhage</h4>
                            <p className="text-xs text-red-700 dark:text-red-300">Exsanguinating external bleeding?</p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
                            <span className={`text-xs font-bold ${assessment.primary.catastrophicHaemorrhage ? 'text-red-600' : 'text-slate-500'}`}>
                                {assessment.primary.catastrophicHaemorrhage ? 'PRESENT' : 'NONE'}
                            </span>
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${assessment.primary.catastrophicHaemorrhage ? 'bg-red-600' : 'bg-slate-300'}`}>
                                <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${assessment.primary.catastrophicHaemorrhage ? 'translate-x-4' : ''}`} />
                            </div>
                            <input 
                                type="checkbox" 
                                className="hidden"
                                checked={assessment.primary.catastrophicHaemorrhage || false}
                                onChange={e => update(['primary', 'catastrophicHaemorrhage'], e.target.checked)}
                            />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {/* A - Airway */}
                    <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-xl relative group">
                        <button onClick={() => setNormal('A')} className="absolute top-4 right-4 text-[10px] bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800 text-blue-600 px-2 py-1 rounded-md font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-blue-50">
                            Quick Normal
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">A</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Airway</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="input-label">Patency</label>
                                <select className="input-field py-2 text-sm" value={assessment.primary.airway.patency || ''} onChange={e => update(['primary', 'airway', 'patency'], e.target.value)}>
                                    <option value="">Select...</option><option>Patent</option><option>Partial Obstruction</option><option>Complete Obstruction</option><option>Maintained (Adjuncts)</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Notes / Sounds</label>
                                <input className="input-field py-2 text-sm" placeholder="e.g. Clear, Snoring, Gurgling" value={assessment.primary.airway.notes || ''} onChange={e => update(['primary', 'airway', 'notes'], e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* B - Breathing */}
                    <div className="p-4 bg-green-50/50 dark:bg-green-900/10 border border-green-100 dark:border-green-900 rounded-xl relative group">
                        <button onClick={() => setNormal('B')} className="absolute top-4 right-4 text-[10px] bg-white dark:bg-slate-800 border border-green-200 dark:border-green-800 text-green-600 px-2 py-1 rounded-md font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-green-50">
                            Quick Normal
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">B</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Breathing</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="input-label">Effort</label>
                                <select className="input-field py-2 text-sm" value={assessment.primary.breathing.effort || ''} onChange={e => update(['primary', 'breathing', 'effort'], e.target.value)}>
                                    <option value="">Select...</option><option>Normal</option><option>Increased (WOB)</option><option>Shallow</option><option>Agonal</option><option>Apnoeic</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Chest Expansion</label>
                                <select className="input-field py-2 text-sm" value={assessment.primary.breathing.chestExpansion || ''} onChange={e => update(['primary', 'breathing', 'chestExpansion'], e.target.value)}>
                                    <option value="">Select...</option><option>Equal</option><option>Unequal (Left Reduced)</option><option>Unequal (Right Reduced)</option><option>Paradoxical</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Breath Sounds</label>
                                <input className="input-field py-2 text-sm" placeholder="e.g. Clear, Wheeze, Creps" value={assessment.primary.breathing.soundsL || ''} onChange={e => { update(['primary', 'breathing', 'soundsL'], e.target.value); update(['primary', 'breathing', 'soundsR'], e.target.value); }} />
                            </div>
                        </div>
                    </div>

                    {/* C - Circulation */}
                    <div className="p-4 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900 rounded-xl relative group">
                        <button onClick={() => setNormal('C')} className="absolute top-4 right-4 text-[10px] bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800 text-red-600 px-2 py-1 rounded-md font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
                            Quick Normal
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold">C</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Circulation</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                                <label className="input-label">Radial Pulse</label>
                                <select className="input-field py-2 text-sm" value={assessment.primary.circulation.radialPulse || ''} onChange={e => update(['primary', 'circulation', 'radialPulse'], e.target.value)}>
                                    <option value="">Select...</option><option>Present (Strong)</option><option>Present (Weak/Thready)</option><option>Present (Bounding)</option><option>Absent</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Skin / Temp</label>
                                <input className="input-field py-2 text-sm" placeholder="e.g. Warm/Dry, Pale/Clammy" value={assessment.primary.circulation.skin || ''} onChange={e => update(['primary', 'circulation', 'skin'], e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label">Cap Refill</label>
                                <input className="input-field py-2 text-sm" placeholder="e.g. < 2s" value={assessment.primary.circulation.capRefill || ''} onChange={e => update(['primary', 'circulation', 'capRefill'], e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* D - Disability */}
                    <div className="p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900 rounded-xl relative group">
                        <button onClick={() => setNormal('D')} className="absolute top-4 right-4 text-[10px] bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 text-amber-600 px-2 py-1 rounded-md font-bold shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-amber-50">
                            Quick Normal
                        </button>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center font-bold">D</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Disability</h4>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="flex gap-2">
                                <div className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-1">
                                    <label className="input-label">AVPU</label>
                                    <select className="input-field py-2 text-sm" value={assessment.primary.disability.avpu || ''} onChange={e => update(['primary', 'disability', 'avpu'], e.target.value)}>
                                        <option value="">...</option><option>Alert</option><option>Voice</option><option>Pain</option><option>Unresp</option>
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="input-label">GCS</label>
                                    <input className="input-field py-2 text-sm" placeholder="/15" value={assessment.primary.disability.gcs || ''} onChange={e => update(['primary', 'disability', 'gcs'], e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Pupils</label>
                                <input className="input-field py-2 text-sm" placeholder="e.g. PEARL 4mm" value={assessment.primary.disability.pupils || ''} onChange={e => update(['primary', 'disability', 'pupils'], e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label">Blood Glucose</label>
                                <input className="input-field py-2 text-sm" placeholder="mmol/L" value={assessment.primary.disability.bloodGlucose || ''} onChange={e => update(['primary', 'disability', 'bloodGlucose'], e.target.value)} />
                            </div>
                        </div>
                    </div>

                    {/* E - Exposure */}
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold">E</div>
                            <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Exposure</h4>
                        </div>
                        <div className="flex flex-wrap gap-4 items-center">
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm dark:text-white">
                                <input type="checkbox" checked={assessment.primary.exposure.injuriesFound || false} onChange={e => update(['primary', 'exposure', 'injuriesFound'], e.target.checked)} className="w-4 h-4 rounded text-ams-blue" />
                                Major Injuries Found
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm dark:text-white">
                                <input type="checkbox" checked={assessment.primary.exposure.rash || false} onChange={e => update(['primary', 'exposure', 'rash'], e.target.checked)} className="w-4 h-4 rounded text-ams-blue" />
                                Non-Blanching Rash
                            </label>
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                <Thermometer className="w-4 h-4 text-slate-400" />
                                <input className="bg-transparent w-16 text-sm font-bold outline-none dark:text-white" placeholder="Temp °C" value={assessment.primary.exposure.temp || ''} onChange={e => update(['primary', 'exposure', 'temp'], e.target.value)} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrimarySurveyTab;