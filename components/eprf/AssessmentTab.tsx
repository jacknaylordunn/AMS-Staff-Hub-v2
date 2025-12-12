
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import NeuroAssessment from '../NeuroAssessment';
import CranialNerveAssessment from '../CranialNerveAssessment';
import ClinicalFrailtyScale from '../ClinicalFrailtyScale';
import { Brain, Heart, Wind, Coffee, Baby, Bone, Smile, Activity, AlertTriangle, ShieldAlert, FileText, PersonStanding, Plus, Trash2, Calculator, Flame } from 'lucide-react';
import BodyMap from '../BodyMap';
import { WoundAssessment } from '../../types';
import SpeechTextArea from '../SpeechTextArea';

const AssessmentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const [activeSubTab, setActiveSubTab] = useState('narrative');
    
    // Local state for Wound Form
    const [newWound, setNewWound] = useState<Partial<WoundAssessment>>({ classification: 'Laceration', contamination: 'Clean', tetanusStatus: 'Up to date' });

    // Local State for Calculators (Parkland)
    const [parklandWeight, setParklandWeight] = useState('');

    // Local State for Wells Score
    const [wellsScore, setWellsScore] = useState(0);
    const [wellsCriteria, setWellsCriteria] = useState<string[]>([]);

    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;
    const mode = activeDraft.mode || 'Clinical';

    // Helper for updating assessment
    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    // Dynamic Tab Logic
    const getTabs = () => {
        const base = [
            { id: 'narrative', label: 'Examination Narrative', icon: FileText },
        ];
        
        if (mode === 'Clinical') {
            return [
                ...base,
                { id: 'nervous', label: 'Nervous', icon: Brain },
                { id: 'cardiac', label: 'Cardiac', icon: Heart },
                { id: 'resp', label: 'Respiratory', icon: Wind },
                { id: 'frailty', label: 'Frailty/Social', icon: PersonStanding },
                { id: 'gi_gu', label: 'GI / GU', icon: Coffee },
                { id: 'obs', label: 'Obs/Gynae', icon: Baby },
                { id: 'msk', label: 'MSK / Burns', icon: Bone },
                { id: 'scores', label: 'Clinical Scores', icon: Calculator },
                { id: 'mental', label: 'Mental', icon: Smile }
            ];
        } else if (mode === 'Minor') {
            return [
                ...base,
                { id: 'msk', label: 'MSK / Wounds', icon: Bone },
                { id: 'nervous', label: 'Neuro (Basic)', icon: Brain },
            ];
        } else if (mode === 'Welfare') {
            return [
                ...base,
                { id: 'mental', label: 'Mental / Intox', icon: Smile },
                { id: 'frailty', label: 'Vulnerability', icon: PersonStanding },
                { id: 'msk', label: 'Injuries', icon: Bone },
            ];
        }
        return base;
    };

    const tabs = getTabs();

    const applyTemplate = (type: string) => {
        let tpl = '';
        if (type === 'Medical') {
            tpl = `ON EXAMINATION:\nGen: Alert, comfortable at rest. No obvious distress.\nResp: AE equal & good bilaterally. No added sounds.\nCVS: HS I+II. No oedema.\nAbdo: Soft, non-tender. No masses.\nNeuro: GCS 15. FAST neg. PEARL. Moving all 4 limbs.`;
        } else if (type === 'Trauma') {
            tpl = `ON EXAMINATION:\nGen: Pain management required. \nHead/Neck: No bruising/deformity. C-Spine cleared clinically.\nChest: No bruising/deformity. AE equal.\nAbdo/Pelvis: Soft. Pelvis stable.\nLimbs: \nNeuro: GCS 15. Motor/Sensory intact distally.`;
        } else if (type === 'Mental') {
            tpl = `MENTAL STATE EXAM:\nAppearance: Well kempt.\nBehaviour: Calm and cooperative.\nSpeech: Normal rate/tone.\nMood: Euthymic.\nRisk: Denies SI/HI.`;
        } else if (type === 'Paeds') {
            tpl = `PAEDIATRIC ASSESS:\nAppearance: Alert, playing/interacting. Normal tone.\nBreathing: Normal WOB. No recession.\nCirculation: Warm/Pink. CRT < 2s.\nHydration: Moist mucous membranes.`;
        }
        
        const current = assessment.clinicalNarrative || '';
        update(['clinicalNarrative'], current ? current + '\n\n' + tpl : tpl);
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

    // Parkland Calc Logic
    const calculateParkland = () => {
        const weight = parseFloat(parklandWeight);
        const tbsa = parseFloat(assessment.burns?.estimatedPercentage || '0');
        if (!weight || !tbsa) return null;
        const total = 4 * weight * tbsa;
        return {
            total: Math.round(total),
            first8: Math.round(total / 2)
        };
    };
    const parklandResult = calculateParkland();

    // Wells Logic
    const toggleWells = (criteria: string, points: number) => {
        if (wellsCriteria.includes(criteria)) {
            setWellsCriteria(prev => prev.filter(c => c !== criteria));
            setWellsScore(prev => prev - points);
        } else {
            setWellsCriteria(prev => [...prev, criteria]);
            setWellsScore(prev => prev + points);
        }
    };

    const WELLS_CRITERIA = [
        { label: 'Active Cancer', points: 1 },
        { label: 'Paralysis, paresis, or immobilization of lower extremities', points: 1 },
        { label: 'Bedridden >3 days or major surgery <12 weeks', points: 1 },
        { label: 'Localized tenderness along deep venous system', points: 1 },
        { label: 'Entire leg swollen', points: 1 },
        { label: 'Calf swelling >3cm larger than asymptomatic side', points: 1 },
        { label: 'Pitting edema confined to symptomatic leg', points: 1 },
        { label: 'Collateral superficial veins (non-varicose)', points: 1 },
        { label: 'Previous DVT documented', points: 1 },
        { label: 'Alternative diagnosis at least as likely as DVT', points: -2 },
    ];

    const renderContent = () => {
        switch(activeSubTab) {
            case 'narrative':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="glass-panel p-6 rounded-xl relative">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 dark:text-white">Examination Narrative</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => applyTemplate('Medical')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded hover:bg-slate-200">Medical</button>
                                    <button onClick={() => applyTemplate('Trauma')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded hover:bg-slate-200">Trauma</button>
                                    <button onClick={() => applyTemplate('Mental')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded hover:bg-slate-200">MH</button>
                                    <button onClick={() => applyTemplate('Paeds')} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 text-xs font-bold rounded hover:bg-slate-200">Paeds</button>
                                </div>
                            </div>
                            <SpeechTextArea 
                                label="Detailed Findings"
                                className="input-field w-full h-96 resize-none font-mono text-sm leading-relaxed" 
                                placeholder="Type detailed physical examination findings here..." 
                                value={assessment.clinicalNarrative || ''}
                                onChange={e => update(['clinicalNarrative'], e.target.value)}
                            />
                        </div>
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
                            <p className="text-xs text-slate-500 mb-4">Assess for patients &gt; 65. Used to determine reserve and outcomes.</p>
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
            case 'scores':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                <Activity className="w-5 h-5 text-ams-blue" /> Wells Score (DVT)
                            </h3>
                            <div className="space-y-2">
                                {WELLS_CRITERIA.map((criterion, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleWells(criterion.label, criterion.points)}
                                        className={`w-full text-left p-3 rounded-lg border text-sm flex justify-between items-center transition-all ${
                                            wellsCriteria.includes(criterion.label)
                                            ? 'bg-ams-blue text-white border-ams-blue shadow-md'
                                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'
                                        }`}
                                    >
                                        <span>{criterion.label}</span>
                                        <span className={`font-bold ml-2 ${wellsCriteria.includes(criterion.label) ? 'text-white' : 'text-slate-400'}`}>
                                            {criterion.points > 0 ? `+${criterion.points}` : criterion.points}
                                        </span>
                                    </button>
                                ))}
                                <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <div className="text-center">
                                        <span className="block text-xs font-bold text-slate-500 uppercase">Score</span>
                                        <span className="text-3xl font-bold text-slate-800 dark:text-white">{wellsScore}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Probability</span>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            wellsScore >= 2 
                                            ? 'bg-red-100 text-red-700 border border-red-200' 
                                            : 'bg-green-100 text-green-700 border border-green-200'
                                        }`}>
                                            {wellsScore >= 2 ? 'DVT LIKELY (≥2)' : 'DVT UNLIKELY (<2)'}
                                        </span>
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
                        {mode === 'Clinical' && (
                            <div className="glass-panel p-6 rounded-xl">
                                <CranialNerveAssessment data={assessment.neuro.cranialNerves || []} onChange={val => update(['neuro', 'cranialNerves'], val)} />
                            </div>
                        )}
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
                                Patient is Pregnant (Confirm &gt; 20 weeks)
                            </label>
                        </div>

                        {assessment.obsGynae?.pregnant && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                <div><label className="input-label">Gestation (Weeks)</label><input type="number" className="input-field" value={assessment.obsGynae?.gestationWeeks} onChange={e => update(['obsGynae', 'gestationWeeks'], e.target.value)} /></div>
                                <div><label className="input-label">Gravida / Para</label><div className="flex gap-2"><input placeholder="G" className="input-field" value={assessment.obsGynae?.gravida} onChange={e => update(['obsGynae', 'gravida'], e.target.value)} /><input placeholder="P" className="input-field" value={assessment.obsGynae?.para} onChange={e => update(['obsGynae', 'para'], e.target.value)} /></div></div>
                            </div>
                        )}
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

                        {/* Burns & Parkland */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                                <Flame className="w-5 h-5 text-orange-500" /> Burns Assessment & Parkland
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">% TBSA (Rule of 9s)</label>
                                    <input className="input-field" type="number" placeholder="Total Burn Surface Area" value={assessment.burns?.estimatedPercentage} onChange={e => update(['burns', 'estimatedPercentage'], e.target.value)} />
                                </div>
                                <div>
                                    <label className="input-label">Patient Weight (kg) for Calc</label>
                                    <input className="input-field" type="number" placeholder="Weight" value={parklandWeight} onChange={e => setParklandWeight(e.target.value)} />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    {parklandResult ? (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                                            <h4 className="text-sm font-bold text-blue-800 dark:text-blue-300 mb-2">Fluid Resuscitation (Hartmann's)</h4>
                                            <div className="flex justify-between items-center text-sm dark:text-white">
                                                <span>Total 24hrs: <strong>{parklandResult.total} ml</strong></span>
                                                <span>First 8 Hours: <strong>{parklandResult.first8} ml</strong></span>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">Enter TBSA and Weight to calculate fluids.</p>
                                    )}
                                </div>
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
