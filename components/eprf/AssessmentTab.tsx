
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import NeuroAssessment from '../NeuroAssessment';
import CranialNerveAssessment from '../CranialNerveAssessment';
import TraumaTriage from '../TraumaTriage';
import ClinicalFrailtyScale from '../ClinicalFrailtyScale';
import { Stethoscope, Brain, Heart, Wind, Coffee, Baby, Bone, Smile, Activity, AlertTriangle, UserCheck, Biohazard, Plus, Trash2, ShieldAlert, FileText, PersonStanding } from 'lucide-react';
import BodyMap from '../BodyMap';
import { WoundAssessment } from '../../types';

const AssessmentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const [activeSubTab, setActiveSubTab] = useState('general');
    
    // Local state for Wound Form
    const [newWound, setNewWound] = useState<Partial<WoundAssessment>>({ classification: 'Laceration', contamination: 'Clean', tetanusStatus: 'Up to date' });

    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;
    const mode = activeDraft.mode || 'Clinical';

    // Helper for updating assessment
    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    // Dynamic Tab Logic
    const getTabs = () => {
        const base = [
            { id: 'general', label: 'Primary Survey', icon: Stethoscope },
        ];
        
        if (mode === 'Clinical') {
            return [
                ...base,
                { id: 'sepsis', label: 'Sepsis', icon: Biohazard },
                { id: 'nervous', label: 'Nervous', icon: Brain },
                { id: 'cardiac', label: 'Cardiac', icon: Heart },
                { id: 'resp', label: 'Respiratory', icon: Wind },
                { id: 'frailty', label: 'Frailty/Social', icon: PersonStanding },
                { id: 'gi_gu', label: 'GI / GU', icon: Coffee },
                { id: 'obs', label: 'Obs/Gynae', icon: Baby },
                { id: 'msk', label: 'MSK / Wounds', icon: Bone },
                { id: 'mental', label: 'Mental', icon: Smile }
            ];
        } else if (mode === 'Minor') {
            return [
                ...base,
                { id: 'msk', label: 'MSK / Wounds', icon: Bone },
                { id: 'sepsis', label: 'Sepsis', icon: Biohazard }, // Sepsis always relevant
            ];
        } else if (mode === 'Welfare') {
            return [
                ...base,
                { id: 'mental', label: 'Mental', icon: Smile },
                { id: 'frailty', label: 'Frailty/Social', icon: PersonStanding },
                { id: 'msk', label: 'Injuries', icon: Bone },
            ];
        }
        return base;
    };

    const tabs = getTabs();

    const applyTemplate = () => {
        const tpl = `ON EXAMINATION:\nGeneral appearance: \nHead/Neck: \nChest: \nAbdomen: \nPelvis/Limbs: \nNeuro: `;
        update(['clinicalNarrative'], tpl);
    };

    // Sepsis Helpers
    const latestNews2 = activeDraft.vitals.length > 0 ? activeDraft.vitals[activeDraft.vitals.length - 1].news2Score : 0;
    
    const updateSepsis = (field: 'suspectedSource' | 'redFlags' | 'riskFactors', value: string) => {
        const currentList = assessment.sepsis?.[field] || [];
        const newList = currentList.includes(value) ? currentList.filter(i => i !== value) : [...currentList, value];
        
        // Auto Outcome Logic
        const hasSource = field === 'suspectedSource' ? newList.length > 0 : (assessment.sepsis?.suspectedSource?.length || 0) > 0;
        const hasRed = field === 'redFlags' ? newList.length > 0 : (assessment.sepsis?.redFlags?.length || 0) > 0;
        
        let outcome = 'Clear';
        if (hasSource) {
            if (hasRed) outcome = 'Red Flag Sepsis';
            else outcome = 'Likely Sepsis'; 
        }

        handleNestedUpdate(['assessment', 'sepsis'], {
            ...assessment.sepsis,
            [field]: newList,
            outcome,
            screeningTrigger: latestNews2 >= 3
        });
    };

    // Wound Helpers
    const addWound = () => {
        if (!newWound.site) return;
        const wound: WoundAssessment = {
            id: Date.now().toString(),
            site: newWound.site,
            classification: newWound.classification || 'Laceration',
            dimensions: newWound.dimensions || '',
            contamination: newWound.contamination || 'Clean',
            tetanusStatus: newWound.tetanusStatus || 'Unknown',
            closure: newWound.closure
        };
        const currentWounds = assessment.wounds || [];
        update(['wounds'], [...currentWounds, wound]);
        setNewWound({ classification: 'Laceration', contamination: 'Clean', tetanusStatus: 'Up to date', site: '', dimensions: '' });
    };

    const removeWound = (id: string) => {
        const currentWounds = assessment.wounds || [];
        update(['wounds'], currentWounds.filter(w => w.id !== id));
    };

    const renderContent = () => {
        switch(activeSubTab) {
            case 'general':
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

                        <div className="glass-panel p-6 rounded-xl relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white">Examination Narrative</h3>
                                <button 
                                    onClick={applyTemplate}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all border border-slate-200 dark:border-slate-600"
                                >
                                    <FileText className="w-3 h-3" /> Standard Entry
                                </button>
                            </div>
                            <textarea 
                                className="input-field w-full h-64 resize-none font-mono text-sm leading-relaxed" 
                                placeholder="Type detailed physical examination findings here..." 
                                value={assessment.clinicalNarrative || ''}
                                onChange={e => update(['clinicalNarrative'], e.target.value)}
                            />
                        </div>
                        
                        {/* Falls Risk */}
                        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-amber-400">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-500" /> Falls Risk Assessment</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {['historyOfFalls', 'unsteadyWalk', 'visualImpairment', 'alteredMentalState', 'medications', 'anticoagulants'].map(field => (
                                    <label key={field} className="flex items-center gap-2 cursor-pointer p-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-amber-500 rounded" 
                                            checked={(assessment.falls as any)?.[field] || false}
                                            onChange={e => update(['falls', field], e.target.checked)}
                                        />
                                        <span className="text-sm font-medium dark:text-white capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {mode === 'Clinical' && <TraumaTriage value={assessment.traumaTriage} onChange={val => update(['traumaTriage'], val)} />}
                    </div>
                );
            case 'frailty':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Clinical Frailty Scale */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                <PersonStanding className="w-5 h-5 text-ams-blue" /> Clinical Frailty Scale
                            </h3>
                            <p className="text-xs text-slate-500 mb-4">Assess for patients > 65. Used to determine reserve and outcomes.</p>
                            <ClinicalFrailtyScale 
                                value={assessment.cfsScore || 0}
                                onChange={(val) => update(['cfsScore'], val)}
                            />
                        </div>

                        {/* Mobility */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Mobility Status</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Pre-Morbid (Baseline)</label>
                                    <select className="input-field" value={assessment.mobility?.preMorbidMobility} onChange={e => update(['mobility', 'preMorbidMobility'], e.target.value)}>
                                        <option value="">-- Select --</option><option>Independent</option><option>Stick</option><option>Frame</option><option>Wheelchair</option><option>Bedbound</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label">Current Presentation</label>
                                    <select className="input-field" value={assessment.mobility?.currentMobility} onChange={e => update(['mobility', 'currentMobility'], e.target.value)}>
                                        <option value="">-- Select --</option><option>Independent</option><option>Limited by Pain</option><option>Immobile</option><option>Unsafe</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'sepsis':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="glass-panel p-6 rounded-xl border-l-4 border-l-red-500">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2"><Biohazard className="w-6 h-6 text-red-600" /> Sepsis Screening Tool</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">UK Ambulance Services Protocol (JRCALC)</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${assessment.sepsis?.outcome === 'Red Flag Sepsis' ? 'bg-red-600 text-white animate-pulse' : assessment.sepsis?.outcome === 'Likely Sepsis' ? 'bg-amber-500 text-white' : 'bg-green-100 text-green-700'}`}>
                                    {assessment.sepsis?.outcome || 'Monitor'}
                                </div>
                            </div>

                            {latestNews2 >= 3 && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" /> Triggered: NEWS2 Score {latestNews2}
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Sources */}
                                <div>
                                    <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase mb-3">1. Suspected Source</h4>
                                    <div className="space-y-2">
                                        {['Respiratory', 'Urine (UTI)', 'Skin / Soft Tissue', 'Neurological', 'Abdominal', 'Indwelling Device', 'Surgical Wound', 'Other'].map(src => (
                                            <label key={src} className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg cursor-pointer">
                                                <input type="checkbox" className="w-5 h-5 rounded text-blue-600" checked={assessment.sepsis?.suspectedSource?.includes(src)} onChange={() => updateSepsis('suspectedSource', src)} />
                                                <span className="text-sm dark:text-white">{src}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Red Flags */}
                                <div>
                                    <h4 className="font-bold text-red-700 dark:text-red-400 text-sm uppercase mb-3">2. Red Flags</h4>
                                    <div className="space-y-2">
                                        {[
                                            'Systolic BP < 90 mmHg', 
                                            'Lactate > 2 mmol/L', 
                                            'Heart Rate > 130', 
                                            'Resp Rate > 25', 
                                            'O2 Sats < 91% (Air)', 
                                            'GCS < 15 / New Confusion', 
                                            'Non-blanching Rash', 
                                            'Not passed urine > 18h'
                                        ].map(flag => (
                                            <label key={flag} className="flex items-center gap-2 p-2 bg-red-50/50 dark:bg-red-900/10 rounded-lg cursor-pointer border border-transparent hover:border-red-200">
                                                <input type="checkbox" className="w-5 h-5 rounded text-red-600" checked={assessment.sepsis?.redFlags?.includes(flag)} onChange={() => updateSepsis('redFlags', flag)} />
                                                <span className="text-sm dark:text-white font-medium">{flag}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'nervous':
                return (
                    <div className="space-y-6">
                        <NeuroAssessment data={assessment.neuro} onChange={val => update(['neuro'], val)} />
                        <div className="glass-panel p-6 rounded-xl">
                            <CranialNerveAssessment data={assessment.neuro.cranialNerves || []} onChange={val => update(['neuro', 'cranialNerves'], val)} />
                        </div>
                    </div>
                );
            case 'cardiac':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Cardiac Assessment</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="input-label">ECG Rhythm</label>
                                <select className="input-field" value={assessment.cardiac?.ecg?.rhythm} onChange={e => update(['cardiac', 'ecg', 'rhythm'], e.target.value)}>
                                    <option value="">-- Select --</option><option>Sinus Rhythm</option><option>Sinus Tachycardia</option><option>Sinus Bradycardia</option><option>Atrial Fibrillation</option><option>SV-Tachycardia</option><option>Ventricular Tachycardia</option><option>Ventricular Fibrillation</option><option>Asystole</option><option>Heart Block (Type 1)</option><option>Heart Block (Type 2)</option><option>Complete Heart Block</option><option>Paced</option>
                                </select>
                            </div>
                            <div className="flex flex-col gap-2 mt-4">
                                <label className="flex items-center gap-2 font-bold cursor-pointer dark:text-white">
                                    <input type="checkbox" checked={assessment.cardiac?.chestPainPresent} onChange={e => update(['cardiac', 'chestPainPresent'], e.target.checked)} className="w-5 h-5 text-ams-blue rounded" />
                                    Chest Pain Present
                                </label>
                                <label className="flex items-center gap-2 font-bold cursor-pointer text-red-600">
                                    <input type="checkbox" checked={assessment.cardiac?.ecg?.stElevation} onChange={e => update(['cardiac', 'ecg', 'stElevation'], e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
                                    STEMI Criteria Met
                                </label>
                            </div>
                        </div>
                        {assessment.cardiac?.chestPainPresent && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <h4 className="font-bold text-sm mb-3 text-slate-500">SOCRATES Pain Assessment</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {['Site', 'Onset', 'Character', 'Radiation', 'Associations', 'TimeCourse', 'ExacerbatingRelieving', 'Severity'].map(field => (
                                        <div key={field}>
                                            <label className="text-[10px] uppercase font-bold text-slate-400">{field}</label>
                                            <input 
                                              className="input-field py-1 text-sm" 
                                              value={(assessment.cardiac?.socrates as any)?.[field.toLowerCase()] || ''}
                                              onChange={e => handleNestedUpdate(['assessment', 'cardiac', 'socrates', field.toLowerCase()], e.target.value)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="grid grid-cols-1">
                            <label className="input-label">12-Lead Interpretation</label>
                            <textarea 
                                className="input-field" 
                                rows={2} 
                                placeholder="e.g. ST Elevation II, III, aVF (Inferior). Reciprocal changes I, aVL."
                                value={assessment.cardiac?.ecg?.twelveLeadNotes || ''}
                                onChange={e => update(['cardiac', 'ecg', 'twelveLeadNotes'], e.target.value)}
                            />
                        </div>
                    </div>
                );
            case 'resp':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Respiratory</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Cough Type</label><input className="input-field" value={assessment.respiratory?.cough} onChange={e => update(['respiratory', 'cough'], e.target.value)} placeholder="e.g. Productive, Dry" /></div>
                            <div><label className="input-label">Sputum Colour</label><input className="input-field" value={assessment.respiratory?.sputumColor} onChange={e => update(['respiratory', 'sputumColor'], e.target.value)} placeholder="e.g. Green, Clear, Haemoptysis" /></div>
                            <div><label className="input-label">Peak Flow (Pre-Neb)</label><input className="input-field" type="number" value={assessment.respiratory?.peakFlowPre} onChange={e => update(['respiratory', 'peakFlowPre'], e.target.value)} /></div>
                            <div><label className="input-label">Peak Flow (Post-Neb)</label><input className="input-field" type="number" value={assessment.respiratory?.peakFlowPost} onChange={e => update(['respiratory', 'peakFlowPost'], e.target.value)} /></div>
                        </div>
                        <div className="p-4 border rounded-xl dark:border-slate-700">
                            <h4 className="font-bold text-sm mb-3 dark:text-white">Breath Sounds & Air Entry</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Left Lung</label>
                                    <select className="input-field mb-2" value={assessment.primary.breathing.airEntryL} onChange={e => update(['primary', 'breathing', 'airEntryL'], e.target.value)}><option>Normal</option><option>Reduced</option><option>Silent</option></select>
                                    <select className="input-field" value={assessment.primary.breathing.soundsL} onChange={e => update(['primary', 'breathing', 'soundsL'], e.target.value)}><option>Clear</option><option>Wheeze</option><option>Creps</option><option>Coarse</option></select>
                                </div>
                                <div>
                                    <label className="input-label">Right Lung</label>
                                    <select className="input-field mb-2" value={assessment.primary.breathing.airEntryR} onChange={e => update(['primary', 'breathing', 'airEntryR'], e.target.value)}><option>Normal</option><option>Reduced</option><option>Silent</option></select>
                                    <select className="input-field" value={assessment.primary.breathing.soundsR} onChange={e => update(['primary', 'breathing', 'soundsR'], e.target.value)}><option>Clear</option><option>Wheeze</option><option>Creps</option><option>Coarse</option></select>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'gi_gu':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Abdominal & GU Assessment</h3>
                        
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50">
                            <label className="flex items-center gap-3 font-bold text-red-800 dark:text-red-200 cursor-pointer text-lg">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 text-red-600 rounded"
                                    checked={assessment.gastrointestinal?.abdominalPain}
                                    onChange={e => update(['gastrointestinal', 'abdominalPain'], e.target.checked)}
                                />
                                Acute Abdominal Pain Present
                            </label>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="input-label">Inspection</label>
                                <select className="input-field" value={assessment.gastrointestinal?.distension ? 'Distended' : 'Normal'} onChange={e => update(['gastrointestinal', 'distension'], e.target.value === 'Distended')}>
                                    <option value="Normal">Normal / Flat</option>
                                    <option value="Distended">Distended / Bloated</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Palpation</label>
                                <select className="input-field" value={assessment.gastrointestinal?.palpation} onChange={e => update(['gastrointestinal', 'palpation'], e.target.value)}>
                                    <option value="">-- Select --</option>
                                    <option>Soft / Non-tender</option>
                                    <option>Guarding</option>
                                    <option>Rigid / Board-like</option>
                                    <option>Mass Felt</option>
                                    <option>Rebound Tenderness</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Bowel Sounds</label>
                                <select className="input-field" value={assessment.gastrointestinal?.bowelSounds} onChange={e => update(['gastrointestinal', 'bowelSounds'], e.target.value)}>
                                    <option value="">-- Select --</option>
                                    <option>Normal</option>
                                    <option>Hyperactive</option>
                                    <option>Sluggish</option>
                                    <option>Absent</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Pain Location</label>
                            <input className="input-field" placeholder="e.g. RLQ, Epigastric, Generalised" value={assessment.gastrointestinal?.painLocation} onChange={e => update(['gastrointestinal', 'painLocation'], e.target.value)} />
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700">
                            <div><label className="input-label">Last Oral Intake</label><input className="input-field" value={assessment.gastrointestinal?.lastMeal} onChange={e => update(['gastrointestinal', 'lastMeal'], e.target.value)} /></div>
                            <div><label className="input-label">Last Bowel Movement</label><input className="input-field" value={assessment.gastrointestinal?.lastBowelMovement} onChange={e => update(['gastrointestinal', 'lastBowelMovement'], e.target.value)} /></div>
                            <div><label className="input-label">Urine Output</label><input className="input-field" value={assessment.gastrointestinal?.urineOutput} onChange={e => update(['gastrointestinal', 'urineOutput'], e.target.value)} placeholder="e.g. Normal, Dark, Haematuria" /></div>
                            <div>
                                <label className="input-label">FAST Scan (Trauma)</label>
                                <select className="input-field font-bold text-slate-600" value={assessment.gastrointestinal?.fastScan || 'Not Performed'} onChange={e => update(['gastrointestinal', 'fastScan'], e.target.value)}>
                                    <option>Not Performed</option>
                                    <option>Negative (Clear)</option>
                                    <option className="text-red-600">Positive (Fluid)</option>
                                    <option>Indeterminate</option>
                                </select>
                            </div>
                        </div>
                    </div>
                );
            case 'obs':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Obstetric & Gynaecology</h3>
                        
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-900/50">
                            <label className="flex items-center gap-3 font-bold text-purple-800 dark:text-purple-200 cursor-pointer text-lg">
                                <input 
                                    type="checkbox" 
                                    className="w-6 h-6 text-purple-600 rounded"
                                    checked={assessment.obsGynae?.pregnant}
                                    onChange={e => update(['obsGynae', 'pregnant'], e.target.checked)}
                                />
                                Patient is Pregnant (Confirm > 20 weeks)
                            </label>
                        </div>

                        {assessment.obsGynae?.pregnant && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                <div><label className="input-label">Gestation (Weeks)</label><input type="number" className="input-field" value={assessment.obsGynae?.gestationWeeks} onChange={e => update(['obsGynae', 'gestationWeeks'], e.target.value)} /></div>
                                <div><label className="input-label">Gravida / Para</label><div className="flex gap-2"><input placeholder="G" className="input-field" value={assessment.obsGynae?.gravida} onChange={e => update(['obsGynae', 'gravida'], e.target.value)} /><input placeholder="P" className="input-field" value={assessment.obsGynae?.para} onChange={e => update(['obsGynae', 'para'], e.target.value)} /></div></div>
                                <div><label className="input-label">Contractions</label><input className="input-field" placeholder="Freq/Duration e.g. 3 in 10" value={assessment.obsGynae?.contractions} onChange={e => update(['obsGynae', 'contractions'], e.target.value)} /></div>
                                <div>
                                    <label className="input-label">Membranes</label>
                                    <select className="input-field" value={assessment.obsGynae?.membranesRuptured ? 'Ruptured' : 'Intact'} onChange={e => update(['obsGynae', 'membranesRuptured'], e.target.value === 'Ruptured')}>
                                        <option value="Intact">Intact</option>
                                        <option value="Ruptured">Ruptured (SROM)</option>
                                    </select>
                                </div>
                                <div className="col-span-2 flex gap-4 pt-2">
                                    <label className="flex items-center gap-2 font-bold text-red-600 cursor-pointer"><input type="checkbox" checked={assessment.obsGynae?.bleeding} onChange={e => update(['obsGynae', 'bleeding'], e.target.checked)} className="w-5 h-5 rounded" /> PV Bleeding</label>
                                    <label className="flex items-center gap-2 font-bold text-green-600 cursor-pointer"><input type="checkbox" checked={assessment.obsGynae?.foetalMovements} onChange={e => update(['obsGynae', 'foetalMovements'], e.target.checked)} className="w-5 h-5 rounded" /> Foetal Movements Felt</label>
                                </div>
                            </div>
                        )}
                        
                        <div>
                            <label className="input-label">Notes / Gynae History</label>
                            <textarea className="input-field" rows={3} value={assessment.obsGynae?.notes} onChange={e => update(['obsGynae', 'notes'], e.target.value)} placeholder="LMP, Complications, Previous Section..." />
                        </div>
                    </div>
                );
            case 'mental':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Mental State Exam (MSE)</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="input-label">Appearance</label>
                                <select className="input-field" value={assessment.mentalHealth?.appearance} onChange={e => update(['mentalHealth', 'appearance'], e.target.value)}>
                                    <option value="">-- Select --</option><option>Well Kempt</option><option>Dishevelled</option><option>Inappropriate Dress</option><option>Neglected</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Behaviour</label>
                                <select className="input-field" value={assessment.mentalHealth?.behaviour} onChange={e => update(['mentalHealth', 'behaviour'], e.target.value)}>
                                    <option value="">-- Select --</option><option>Calm / Cooperative</option><option>Agitated</option><option>Aggressive</option><option>Withdrawn</option><option>Hyperactive</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Speech</label>
                                <select className="input-field" value={assessment.mentalHealth?.speech} onChange={e => update(['mentalHealth', 'speech'], e.target.value)}>
                                    <option value="">-- Select --</option><option>Normal Rate/Tone</option><option>Pressured</option><option>Slow / Monosyllabic</option><option>Mute</option><option>Incoherent</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Mood / Affect</label>
                                <select className="input-field" value={assessment.mentalHealth?.mood} onChange={e => update(['mentalHealth', 'mood'], e.target.value)}>
                                    <option value="">-- Select --</option><option>Euthymic (Normal)</option><option>Low / Depressed</option><option>Anxious</option><option>Labile</option><option>Manic</option><option>Flat</option>
                                </select>
                            </div>
                            <div className="col-span-1 md:col-span-2">
                                <label className="input-label">Perception / Thought Content</label>
                                <textarea className="input-field" rows={2} placeholder="e.g. Hallucinations, Delusions, Paranoia" value={assessment.mentalHealth?.perception || ''} onChange={e => update(['mentalHealth', 'perception'], e.target.value)} />
                            </div>
                        </div>

                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                            <h4 className="font-bold text-red-800 dark:text-red-300 mb-3 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Risk Assessment</h4>
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                                    <input type="checkbox" checked={assessment.mentalHealth?.riskToSelf} onChange={e => update(['mentalHealth', 'riskToSelf'], e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
                                    Risk to Self (Suicide/Self Harm)
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-slate-200">
                                    <input type="checkbox" checked={assessment.mentalHealth?.riskToOthers} onChange={e => update(['mentalHealth', 'riskToOthers'], e.target.checked)} className="w-5 h-5 text-red-600 rounded" />
                                    Risk to Others
                                </label>
                            </div>
                        </div>
                    </div>
                );
            case 'msk':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        {/* Body Map */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Body Map & Injuries</h3>
                            <BodyMap 
                                value={activeDraft.injuries} 
                                onChange={vals => handleNestedUpdate(['injuries'], vals)} 
                                mode="injury"
                                onImageChange={(dataUrl) => handleNestedUpdate(['bodyMapImage'], dataUrl)}
                            />
                        </div>

                        {/* Wound Care Form */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-blue-600" /> Wound Care</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                                <input className="input-field" placeholder="Location e.g. L Shin" value={newWound.site} onChange={e => setNewWound({...newWound, site: e.target.value})} />
                                <select className="input-field" value={newWound.classification} onChange={e => setNewWound({...newWound, classification: e.target.value})}>
                                    <option>Laceration</option><option>Abrasion</option><option>Puncture</option><option>Avulsion</option><option>Burn</option>
                                </select>
                                <input className="input-field" placeholder="Size e.g. 5x2cm" value={newWound.dimensions} onChange={e => setNewWound({...newWound, dimensions: e.target.value})} />
                                <select className="input-field" value={newWound.contamination} onChange={e => setNewWound({...newWound, contamination: e.target.value})}>
                                    <option>Clean</option><option>Dirty / Grit</option><option>Foreign Body</option>
                                </select>
                                <select className="input-field" value={newWound.tetanusStatus} onChange={e => setNewWound({...newWound, tetanusStatus: e.target.value})}>
                                    <option>Up to date</option><option>Unknown</option><option>Not up to date</option>
                                </select>
                                <button onClick={addWound} className="bg-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 text-sm hover:bg-blue-700">
                                    <Plus className="w-4 h-4" /> Add Wound
                                </button>
                            </div>
                            
                            {/* Wound List */}
                            <div className="space-y-2 mt-4">
                                {assessment.wounds?.map(w => (
                                    <div key={w.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <div className="text-sm dark:text-white">
                                            <span className="font-bold">{w.site}</span>: {w.classification}, {w.dimensions} ({w.contamination}) - Tetanus: {w.tetanusStatus}
                                        </div>
                                        <button onClick={() => removeWound(w.id)} className="text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Burns */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white">Burns Assessment</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="input-label">% TBSA (Rule of 9s)</label><input className="input-field" type="number" value={assessment.burns?.estimatedPercentage} onChange={e => update(['burns', 'estimatedPercentage'], e.target.value)} /></div>
                                <div><label className="input-label">Depth</label><select className="input-field" value={assessment.burns?.depth} onChange={e => update(['burns', 'depth'], e.target.value)}><option>Superficial</option><option>Partial Thickness</option><option>Full Thickness</option></select></div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <Activity className="w-12 h-12 mb-2 opacity-20" />
                        <p>Select a clinical module from the menu.</p>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            <div className="md:w-64 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
                {tabs.map(sub => (
                    <button
                        key={sub.id}
                        onClick={() => setActiveSubTab(sub.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap md:whitespace-normal ${activeSubTab === sub.id ? 'bg-white dark:bg-slate-800 text-ams-blue shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-900'}`}
                    >
                        <sub.icon className="w-4 h-4" /> {sub.label}
                    </button>
                ))}
            </div>
            <div className="flex-1 min-w-0">
                {renderContent()}
            </div>
        </div>
    );
};

export default AssessmentTab;
