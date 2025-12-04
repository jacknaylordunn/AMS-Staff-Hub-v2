
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Stethoscope } from 'lucide-react';

const PrimarySurveyTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    
    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;

    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2"><Stethoscope className="w-5 h-5 text-ams-blue" /> Primary Survey (&lt;C&gt;ABCDE)</h3>
                
                {/* <C> */}
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                    <label className="flex items-center gap-3 font-bold text-red-800 dark:text-red-200 cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 text-red-600 rounded" 
                            checked={assessment.primary.catastrophicHaemorrhage}
                            onChange={e => update(['primary', 'catastrophicHaemorrhage'], e.target.checked)}
                        />
                        Catastrophic Haemorrhage Present (Manage Immediately)
                    </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* A - Airway */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">Airway</h4>
                        <select className="input-field text-sm py-1" value={assessment.primary.airway.patency} onChange={e => update(['primary', 'airway', 'patency'], e.target.value)}>
                            <option value="">Status...</option><option>Patent</option><option>Partial Obstruction</option><option>Complete Obstruction</option><option>Maintained (Adjuncts)</option>
                        </select>
                        <input className="input-field text-sm py-1" placeholder="Notes e.g. Stridor, Snores" value={assessment.primary.airway.notes} onChange={e => update(['primary', 'airway', 'notes'], e.target.value)} />
                    </div>

                    {/* B - Breathing */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">Breathing</h4>
                        <select className="input-field text-sm py-1" value={assessment.primary.breathing.effort} onChange={e => update(['primary', 'breathing', 'effort'], e.target.value)}>
                            <option value="">Effort...</option><option>Normal</option><option>Increased (WOB)</option><option>Shallow</option><option>Agonal</option><option>Apnoeic</option>
                        </select>
                        <select className="input-field text-sm py-1" value={assessment.primary.breathing.chestExpansion} onChange={e => update(['primary', 'breathing', 'chestExpansion'], e.target.value)}>
                            <option value="">Expansion...</option><option>Equal</option><option>Unequal</option><option>Paradoxical</option>
                        </select>
                        <input className="input-field text-sm py-1" placeholder="Sounds e.g. Wheeze" value={assessment.primary.breathing.soundsL} onChange={e => update(['primary', 'breathing', 'soundsL'], e.target.value)} />
                    </div>

                    {/* C - Circulation */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">Circulation</h4>
                        <select className="input-field text-sm py-1" value={assessment.primary.circulation.radialPulse} onChange={e => update(['primary', 'circulation', 'radialPulse'], e.target.value)}>
                            <option value="">Pulse...</option><option>Present (Strong)</option><option>Present (Weak/Thready)</option><option>Absent</option>
                        </select>
                        <div className="flex gap-2">
                            <input className="input-field text-sm py-1" placeholder="CRT" value={assessment.primary.circulation.capRefill} onChange={e => update(['primary', 'circulation', 'capRefill'], e.target.value)} />
                            <input className="input-field text-sm py-1" placeholder="Skin" value={assessment.primary.circulation.skin} onChange={e => update(['primary', 'circulation', 'skin'], e.target.value)} />
                        </div>
                    </div>

                    {/* D - Disability */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">Disability</h4>
                        <div className="flex gap-2">
                            <select className="input-field text-sm py-1" value={assessment.primary.disability.avpu} onChange={e => update(['primary', 'disability', 'avpu'], e.target.value)}>
                                <option value="">AVPU...</option><option>Alert</option><option>Voice</option><option>Pain</option><option>Unresponsive</option>
                            </select>
                            <input className="input-field text-sm py-1" placeholder="GCS" value={assessment.primary.disability.gcs} onChange={e => update(['primary', 'disability', 'gcs'], e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                            <input className="input-field text-sm py-1" placeholder="Pupils" value={assessment.primary.disability.pupils} onChange={e => update(['primary', 'disability', 'pupils'], e.target.value)} />
                            <input className="input-field text-sm py-1" placeholder="BM" value={assessment.primary.disability.bloodGlucose} onChange={e => update(['primary', 'disability', 'bloodGlucose'], e.target.value)} />
                        </div>
                    </div>

                    {/* E - Exposure */}
                    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                        <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm border-b pb-1">Exposure</h4>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer dark:text-white">
                                <input type="checkbox" checked={assessment.primary.exposure.injuriesFound} onChange={e => update(['primary', 'exposure', 'injuriesFound'], e.target.checked)} className="w-4 h-4 rounded text-ams-blue" />
                                Obvious Injuries
                            </label>
                            <label className="flex items-center gap-2 text-xs font-bold cursor-pointer dark:text-white">
                                <input type="checkbox" checked={assessment.primary.exposure.rash} onChange={e => update(['primary', 'exposure', 'rash'], e.target.checked)} className="w-4 h-4 rounded text-ams-blue" />
                                Rash / Skin Changes
                            </label>
                            <input className="input-field text-sm py-1" placeholder="Temperature" value={assessment.primary.exposure.temp} onChange={e => update(['primary', 'exposure', 'temp'], e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrimarySurveyTab;
