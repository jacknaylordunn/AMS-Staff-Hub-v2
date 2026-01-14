
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { WoundAssessment, InjuryMark } from '../../types';
import { FileText, AlertTriangle, Brain, Heart, Wind, AlertOctagon, Baby, PersonStanding, Coffee, Bone, Smile, ShieldAlert, Plus, Trash2, Flame, Activity, X } from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';
import TraumaTriage from '../TraumaTriage';
import SepsisTool from '../SepsisTool';
import WetflagTool from '../WetflagTool';
import ClinicalFrailtyScale from '../ClinicalFrailtyScale';
import NeuroAssessment from '../NeuroAssessment';
import CranialNerveAssessment from '../CranialNerveAssessment';
import BodyMap from '../BodyMap';

const AssessmentTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const [activeSubTab, setActiveSubTab] = useState('narrative');
    const [newWound, setNewWound] = useState<Partial<WoundAssessment>>({ classification: 'Laceration', contamination: 'Clean', tetanusStatus: 'Up to date' });
    const [parklandWeight, setParklandWeight] = useState('');
    
    // MSK Modal State
    const [showInjuryModal, setShowInjuryModal] = useState(false);
    const [pendingInjury, setPendingInjury] = useState<Partial<InjuryMark> | null>(null);
    const [injuryForm, setInjuryForm] = useState({ type: 'Injury', subtype: 'Pain', location: '', notes: '' });

    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;
    const mode = activeDraft.mode || 'Clinical';

    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    const tabs = [
        { id: 'narrative', label: 'Narrative', icon: FileText },
    ];
    if (mode === 'Clinical') {
        tabs.push(
            { id: 'trauma', label: 'Trauma Triage', icon: AlertTriangle },
            { id: 'nervous', label: 'Neuro', icon: Brain },
            { id: 'cardiac', label: 'Cardiac', icon: Heart },
            { id: 'resp', label: 'Respiratory', icon: Wind },
            { id: 'sepsis', label: 'Sepsis', icon: AlertOctagon },
            { id: 'paeds', label: 'Paediatrics', icon: Baby },
            { id: 'frailty', label: 'Frailty/Social', icon: PersonStanding },
            { id: 'gi_gu', label: 'GI / GU', icon: Coffee },
            { id: 'obs', label: 'Obs/Gynae', icon: Baby },
            { id: 'msk', label: 'MSK / Burns', icon: Bone },
            { id: 'mental', label: 'Mental', icon: Smile }
        );
    } else if (mode === 'Minor') {
        tabs.push(
            { id: 'msk', label: 'MSK / Wounds', icon: Bone },
            { id: 'nervous', label: 'Neuro (Basic)', icon: Brain },
        );
    } else if (mode === 'Welfare') {
        tabs.push(
            { id: 'mental', label: 'Mental / Intox', icon: Smile },
            { id: 'frailty', label: 'Vulnerability', icon: PersonStanding },
            { id: 'msk', label: 'Injuries', icon: Bone },
        );
    }

    const applyTemplate = (type: string) => {
        let tpl = '';
        if (type === 'Medical') tpl = `ON EXAMINATION:\nGeneral:\nRespiratory:\nCVS:\nAbdomen:\nNeuro:\nMSK/Skin:`;
        else if (type === 'Trauma') tpl = `ON EXAMINATION:\nGeneral:\nHead/Neck:\nChest:\nAbdo/Pelvis:\nLimbs:\nNeuro:\nBack/Spine:`;
        else if (type === 'Mental') tpl = `MENTAL STATE EXAM:\nAppearance:\nBehaviour:\nSpeech:\nMood:\nThought Process:\nRisk:`;
        else if (type === 'Paeds') tpl = `PAEDIATRIC ASSESS:\nAppearance/Tone:\nBreathing/WOB:\nCirculation/Hydration:\nInteraction:`;
        
        const current = assessment.clinicalNarrative || '';
        update(['clinicalNarrative'], current ? current + '\n\n' + tpl : tpl);
    };

    // --- Injury Map Handlers ---
    const handleMapClick = (x: number, y: number, view: 'Anterior' | 'Posterior', location: string) => {
        setPendingInjury({ x, y, view });
        setInjuryForm({ type: 'Injury', subtype: 'Pain', location, notes: '' });
        setShowInjuryModal(true);
    };

    const handleMarkerClick = (mark: InjuryMark) => {
        setPendingInjury(mark);
        setInjuryForm({ type: mark.type, subtype: mark.subtype || '', location: mark.location || '', notes: mark.notes || '' });
        setShowInjuryModal(true);
    };

    const saveInjury = () => {
        if (!pendingInjury) return;
        const newMark: InjuryMark = {
            id: pendingInjury.id || Date.now().toString(),
            x: pendingInjury.x!,
            y: pendingInjury.y!,
            view: pendingInjury.view!,
            type: injuryForm.type as any,
            subtype: injuryForm.subtype,
            location: injuryForm.location,
            notes: injuryForm.notes,
            success: true
        };
        const currentInjuries = activeDraft.injuries || [];
        const filtered = currentInjuries.filter(i => i.id !== newMark.id);
        handleNestedUpdate(['injuries'], [...filtered, newMark]);
        setShowInjuryModal(false);
        setPendingInjury(null);
    };

    const deleteInjury = () => {
        if (!pendingInjury?.id) return;
        if (!confirm("Delete this injury marker?")) return;
        const currentInjuries = activeDraft.injuries || [];
        handleNestedUpdate(['injuries'], currentInjuries.filter(i => i.id !== pendingInjury.id));
        setShowInjuryModal(false);
        setPendingInjury(null);
    };

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

    const calculateParkland = () => {
        const weight = parseFloat(parklandWeight);
        const tbsa = parseFloat(assessment.burns?.estimatedPercentage || '0');
        if (!weight || !tbsa) return null;
        const total = 4 * weight * tbsa;
        return { total: Math.round(total), first8: Math.round(total / 2) };
    };
    const parklandResult = calculateParkland();

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

    const toggleWells = (criteria: string, points: number) => {
        let newCriteria = [...(assessment.cardiac?.wellsCriteria || [])];
        let currentScore = assessment.cardiac?.wellsScore || 0;
        if (newCriteria.includes(criteria)) {
            newCriteria = newCriteria.filter(c => c !== criteria);
            currentScore -= points;
        } else {
            newCriteria.push(criteria);
            currentScore += points;
        }
        update(['cardiac', 'wellsCriteria'], newCriteria);
        update(['cardiac', 'wellsScore'], currentScore);
    };

    const renderContent = () => {
        switch(activeSubTab) {
            case 'narrative': return (
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
                        <SpeechTextArea label="Detailed Findings" className="input-field w-full h-96 resize-none font-mono text-sm leading-relaxed" placeholder="Type detailed physical examination findings here..." value={assessment.clinicalNarrative || ''} onChange={e => update(['clinicalNarrative'], e.target.value)} />
                    </div>
                </div>
            );
            case 'trauma': return (
                <div className="space-y-6 animate-in fade-in">
                    <TraumaTriage value={assessment.traumaTriage} onChange={(val) => update(['traumaTriage'], val)} />
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">RTC Specifics</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Vehicle Position</label><select className="input-field h-9 text-sm" value={assessment.traumaTriage?.vehiclePosition || ''} onChange={e => update(['traumaTriage', 'vehiclePosition'], e.target.value)}><option value="">Select...</option><option>Driver</option><option>Passenger (Front)</option><option>Passenger (Rear)</option><option>Pedestrian</option><option>Cyclist</option><option>Motorcyclist</option></select></div>
                            <div><label className="input-label">Est Speed</label><input className="input-field h-9 text-sm" placeholder="mph" value={assessment.traumaTriage?.estSpeed || ''} onChange={e => update(['traumaTriage', 'estSpeed'], e.target.value)} /></div>
                            <div><label className="input-label">Seatbelt Worn?</label><select className="input-field h-9 text-sm" value={assessment.traumaTriage?.seatbeltWorn || ''} onChange={e => update(['traumaTriage', 'seatbeltWorn'], e.target.value)}><option value="">Select...</option><option>Yes</option><option>No</option><option>Unknown</option><option>N/A</option></select></div>
                            <div><label className="input-label">Airbags Deployed?</label><select className="input-field h-9 text-sm" value={assessment.traumaTriage?.airbagsDeployed || ''} onChange={e => update(['traumaTriage', 'airbagsDeployed'], e.target.value)}><option value="">Select...</option><option>Yes</option><option>No</option><option>N/A</option></select></div>
                            <div><label className="input-label">Extrication</label><select className="input-field h-9 text-sm" value={assessment.traumaTriage?.extrication || ''} onChange={e => update(['traumaTriage', 'extrication'], e.target.value)}><option value="">Select...</option><option>Self</option><option>Assisted</option><option>Full Immobilisation</option><option>Cut Out</option></select></div>
                        </div>
                    </div>
                </div>
            );
            case 'sepsis': return (<div className="space-y-6 animate-in fade-in"><SepsisTool newsScore={activeDraft.vitals.length > 0 ? activeDraft.vitals[activeDraft.vitals.length - 1].news2Score : 0} /></div>);
            case 'paeds': return (<div className="space-y-6 animate-in fade-in"><WetflagTool /></div>);
            case 'frailty': return (
                <div className="space-y-6 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-xl"><h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2"><PersonStanding className="w-5 h-5 text-ams-blue" /> Clinical Frailty Scale</h3><p className="text-xs text-slate-500 mb-4">Assess for patients &gt; 65. Used to determine reserve and outcomes.</p><ClinicalFrailtyScale value={assessment.cfsScore || 0} onChange={(val) => update(['cfsScore'], val)} /></div>
                    <div className="glass-panel p-6 rounded-xl"><h3 className="font-bold mb-4 text-slate-800 dark:text-white">Mobility & Social</h3><div className="grid grid-cols-2 gap-4"><div><label className="input-label">Pre-Morbid (Baseline)</label><select className="input-field py-1.5 px-3 text-sm h-9" value={assessment.mobility?.preMorbidMobility} onChange={e => update(['mobility', 'preMorbidMobility'], e.target.value)}><option value="">-- Select --</option><option>Independent</option><option>Stick</option><option>Frame</option><option>Wheelchair</option><option>Bedbound</option></select></div><div><label className="input-label">Current Presentation</label><select className="input-field py-1.5 px-3 text-sm h-9" value={assessment.mobility?.currentMobility} onChange={e => update(['mobility', 'currentMobility'], e.target.value)}><option value="">-- Select --</option><option>Independent</option><option>Limited by Pain</option><option>Immobile</option><option>Unsafe</option></select></div></div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="input-label">Living Status</label><select className="input-field py-1.5 px-3 text-sm h-9" value={assessment.social?.livingStatus || ''} onChange={e => update(['social', 'livingStatus'], e.target.value)}><option value="">-- Select --</option><option>Alone</option><option>With Family/Partner</option><option>Care Home</option><option>Sheltered Housing</option><option>Homeless</option></select></div><div className="flex items-center gap-4 mt-6"><label className="flex items-center gap-2 font-bold cursor-pointer text-sm dark:text-white"><input type="checkbox" checked={assessment.social?.carers || false} onChange={e => update(['social', 'carers'], e.target.checked)} /> Carers Involved?</label><label className="flex items-center gap-2 font-bold cursor-pointer text-sm dark:text-white"><input type="checkbox" checked={assessment.social?.accessKeys || false} onChange={e => update(['social', 'accessKeys'], e.target.checked)} /> Access Keys / Key Safe?</label></div><div className="col-span-1 md:col-span-2"><label className="input-label">Support Details / Package</label><input className="input-field py-1.5 px-3 text-sm h-9" placeholder="e.g. 4x Daily, Family support" value={assessment.social?.supportDetails || ''} onChange={e => update(['social', 'supportDetails'], e.target.value)} /></div></div></div>
                </div>
            );
            case 'nervous': return (<div className="space-y-6"><NeuroAssessment data={assessment.neuro} onChange={val => update(['neuro'], val)} />{mode === 'Clinical' && (<div className="glass-panel p-6 rounded-xl"><CranialNerveAssessment data={assessment.neuro.cranialNerves || []} onChange={val => update(['neuro', 'cranialNerves'], val)} /></div>)}</div>);
            case 'cardiac': return (
                <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                    <h3 className="font-bold text-slate-800 dark:text-white">Cardiac Assessment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="input-label">ECG Rhythm</label><select className="input-field py-1.5 px-3 text-sm h-9" value={assessment.cardiac?.ecg?.rhythm || ''} onChange={e => update(['cardiac', 'ecg', 'rhythm'], e.target.value)}><option value="">-- Select --</option><option>Sinus Rhythm</option><option>Sinus Tachycardia</option><option>Sinus Bradycardia</option><option>Atrial Fibrillation</option><option>SV-Tachycardia</option><option>Ventricular Tachycardia</option><option>Ventricular Fibrillation</option><option>Asystole</option><option>Heart Block (Type 1)</option><option>Heart Block (Type 2)</option><option>Complete Heart Block</option><option>Paced</option><option>RBBB</option><option>LBBB</option><option>Abnormal / Other</option></select></div>
                        <div className="grid grid-cols-2 gap-2"><div><label className="input-label">Rate (bpm)</label><input className="input-field py-1.5 px-3 text-sm h-9" type="number" value={assessment.cardiac?.ecg?.rate || ''} onChange={e => update(['cardiac', 'ecg', 'rate'], e.target.value)} /></div><div><label className="input-label">Time</label><input className="input-field py-1.5 px-3 text-sm h-9" type="time" value={assessment.cardiac?.ecg?.time || ''} onChange={e => update(['cardiac', 'ecg', 'time'], e.target.value)} /></div></div>
                        <div className="col-span-1 md:col-span-2 bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                            <label className="flex items-center gap-2 font-bold cursor-pointer text-red-600 mb-2"><input type="checkbox" checked={assessment.cardiac?.ecg?.stChanges || false} onChange={e => update(['cardiac', 'ecg', 'stChanges'], e.target.checked)} className="w-5 h-5 text-red-600 rounded" />ST Changes Present</label>
                            {assessment.cardiac?.ecg?.stChanges && (
                                <div className="grid grid-cols-2 gap-3 pl-6">
                                    <div><label className="input-label">Type</label><select className="input-field py-1 text-sm h-9" value={assessment.cardiac?.ecg?.stDetails?.type || ''} onChange={e => handleNestedUpdate(['assessment', 'cardiac', 'ecg', 'stDetails', 'type'], e.target.value)}><option>Elevation (STEMI)</option><option>Depression</option></select></div>
                                    <div><label className="input-label">Leads</label><input className="input-field py-1 text-sm h-9" placeholder="e.g. II, III, aVF" value={assessment.cardiac?.ecg?.stDetails?.leads || ''} onChange={e => handleNestedUpdate(['assessment', 'cardiac', 'ecg', 'stDetails', 'leads'], e.target.value)} /></div>
                                </div>
                            )}
                        </div>
                        <div className="col-span-1 md:col-span-2"><label className="flex items-center gap-2 font-bold cursor-pointer dark:text-white"><input type="checkbox" checked={assessment.cardiac?.chestPainPresent} onChange={e => update(['cardiac', 'chestPainPresent'], e.target.checked)} className="w-5 h-5 text-ams-blue rounded" />Chest Pain Present</label></div>
                    </div>
                    {assessment.cardiac?.chestPainPresent && (<div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><h4 className="font-bold text-sm mb-3 text-slate-500">SOCRATES Pain Assessment</h4><div className="grid grid-cols-2 md:grid-cols-4 gap-3">{['Site', 'Onset', 'Character', 'Radiation', 'Associations', 'TimeCourse', 'ExacerbatingRelieving', 'Severity'].map(field => (<div key={field}><label className="text-[10px] uppercase font-bold text-slate-400">{field}</label><input className="input-field py-1 text-sm h-9" value={(assessment.cardiac?.socrates as any)?.[field.toLowerCase()] || ''} onChange={e => handleNestedUpdate(['assessment', 'cardiac', 'socrates', field.toLowerCase()], e.target.value)} /></div>))}</div></div>)}
                    <div className="mt-4 p-4 border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 rounded-xl"><h3 className="font-bold mb-4 text-slate-800 dark:text-white flex items-center gap-2"><Activity className="w-5 h-5 text-ams-blue" /> Wells Score (DVT)</h3><div className="space-y-2">{WELLS_CRITERIA.map((criterion, idx) => (<button key={idx} onClick={() => toggleWells(criterion.label, criterion.points)} className={`w-full text-left p-3 rounded-lg border text-sm flex justify-between items-center transition-all ${(assessment.cardiac?.wellsCriteria || []).includes(criterion.label) ? 'bg-ams-blue text-white border-ams-blue shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50'}`}><span>{criterion.label}</span><span className={`font-bold ml-2 ${(assessment.cardiac?.wellsCriteria || []).includes(criterion.label) ? 'text-white' : 'text-slate-400'}`}>{criterion.points > 0 ? `+${criterion.points}` : criterion.points}</span></button>))}<div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex justify-between items-center"><div className="text-center"><span className="block text-xs font-bold text-slate-500 uppercase">Score</span><span className="text-3xl font-bold text-slate-800 dark:text-white">{assessment.cardiac?.wellsScore || 0}</span></div><div className="text-right"><span className="block text-xs font-bold text-slate-500 uppercase mb-1">Risk Probability</span><span className={`px-3 py-1 rounded-full text-xs font-bold ${(assessment.cardiac?.wellsScore || 0) >= 2 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'}`}>{(assessment.cardiac?.wellsScore || 0) >= 2 ? 'DVT LIKELY (≥2)' : 'DVT UNLIKELY (<2)'}</span></div></div></div></div>
                </div>
            );
            case 'resp':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Respiratory</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Cough Type</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.respiratory?.cough} onChange={e => update(['respiratory', 'cough'], e.target.value)} placeholder="e.g. Productive, Dry" /></div>
                            <div><label className="input-label">Sputum Colour</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.respiratory?.sputumColor} onChange={e => update(['respiratory', 'sputumColor'], e.target.value)} placeholder="e.g. Green, Clear, Haemoptysis" /></div>
                            <div><label className="input-label">Peak Flow (Pre-Neb)</label><input className="input-field py-1.5 px-3 text-sm h-9" type="number" value={assessment.respiratory?.peakFlowPre} onChange={e => update(['respiratory', 'peakFlowPre'], e.target.value)} /></div>
                            <div><label className="input-label">Peak Flow (Post-Neb)</label><input className="input-field py-1.5 px-3 text-sm h-9" type="number" value={assessment.respiratory?.peakFlowPost} onChange={e => update(['respiratory', 'peakFlowPost'], e.target.value)} /></div>
                            <div><label className="input-label">Air Entry</label><select className="input-field py-1.5 px-3 text-sm h-9" value={assessment.respiratory?.airEntry || ''} onChange={e => update(['respiratory', 'airEntry'], e.target.value)}><option value="">Select...</option><option>Equal</option><option>Reduced Left</option><option>Reduced Right</option><option>Silent Chest</option></select></div>
                            <div><label className="input-label">Added Sounds</label><input className="input-field py-1.5 px-3 text-sm h-9" placeholder="Wheeze, Creps, Stridor" value={assessment.respiratory?.addedSounds || ''} onChange={e => update(['respiratory', 'addedSounds'], e.target.value)} /></div>
                            <div className="col-span-1 md:col-span-2 border-t border-slate-200 dark:border-slate-700 pt-4">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-white mb-2"><input type="checkbox" checked={assessment.respiratory?.accessoryMuscleUse || false} onChange={e => update(['respiratory', 'accessoryMuscleUse'], e.target.checked)} className="w-4 h-4" />Accessory Muscle Use / Recession</label>
                                {assessment.respiratory?.accessoryMuscleUse && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="input-label">Details</label><input className="input-field py-1.5 text-sm h-9" placeholder="e.g. Intercostal, Sub-costal" value={assessment.respiratory?.accessoryMuscleDetails || ''} onChange={e => update(['respiratory', 'accessoryMuscleDetails'], e.target.value)} /></div>
                                        <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700 dark:text-white mt-4"><input type="checkbox" checked={assessment.respiratory?.trachealTug || false} onChange={e => update(['respiratory', 'trachealTug'], e.target.checked)} className="w-4 h-4" /> Tracheal Tug</label>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            case 'gi_gu':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Abdominal & GU Assessment</h3>
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/50"><label className="flex items-center gap-3 font-bold text-red-800 dark:text-red-200 cursor-pointer text-lg"><input type="checkbox" className="w-6 h-6 text-red-600 rounded" checked={assessment.gastrointestinal?.abdominalPain} onChange={e => update(['gastrointestinal', 'abdominalPain'], e.target.checked)} />Acute Abdominal Pain Present</label></div>
                        <div className="grid grid-cols-3 gap-4">
                            <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={assessment.gastrointestinal?.nausea || false} onChange={e => update(['gastrointestinal', 'nausea'], e.target.checked)} /> Nausea</label>
                            <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={assessment.gastrointestinal?.vomiting || false} onChange={e => update(['gastrointestinal', 'vomiting'], e.target.checked)} /> Vomiting</label>
                            <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={assessment.gastrointestinal?.diarrhoea || false} onChange={e => update(['gastrointestinal', 'diarrhoea'], e.target.checked)} /> Diarrhoea</label>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><label className="input-label">Pain Location</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.gastrointestinal?.painLocation || ''} onChange={e => update(['gastrointestinal', 'painLocation'], e.target.value)} /></div>
                             <div><label className="input-label">Palpation</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.gastrointestinal?.palpation || ''} onChange={e => update(['gastrointestinal', 'palpation'], e.target.value)} /></div>
                             <div><label className="input-label">Bowel Sounds</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.gastrointestinal?.bowelSounds || ''} onChange={e => update(['gastrointestinal', 'bowelSounds'], e.target.value)} /></div>
                             <div><label className="input-label">Urine Output</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.gastrointestinal?.urineOutput || ''} onChange={e => update(['gastrointestinal', 'urineOutput'], e.target.value)} /></div>
                        </div>
                    </div>
                );
            case 'obs':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white">Obstetrics & Gynaecology</h3>
                        <label className="flex items-center gap-2 font-bold text-lg dark:text-white"><input type="checkbox" className="w-5 h-5 rounded text-ams-blue" checked={assessment.obsGynae?.pregnant || false} onChange={e => update(['obsGynae', 'pregnant'], e.target.checked)} /> Patient is Pregnant</label>
                        {assessment.obsGynae?.pregnant && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-slate-200 dark:border-slate-700">
                                <div><label className="input-label">Gestation (Weeks)</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.obsGynae?.gestationWeeks || ''} onChange={e => update(['obsGynae', 'gestationWeeks'], e.target.value)} /></div>
                                <div><label className="input-label">Gravida / Para</label><div className="flex gap-2"><input className="input-field py-1.5 px-3 text-sm h-9" placeholder="G" value={assessment.obsGynae?.gravida || ''} onChange={e => update(['obsGynae', 'gravida'], e.target.value)} /><input className="input-field py-1.5 px-3 text-sm h-9" placeholder="P" value={assessment.obsGynae?.para || ''} onChange={e => update(['obsGynae', 'para'], e.target.value)} /></div></div>
                                <div><label className="input-label">Contractions</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.obsGynae?.contractions || ''} onChange={e => update(['obsGynae', 'contractions'], e.target.value)} /></div>
                                <div className="flex flex-col gap-2 mt-2">
                                    <label className="flex items-center gap-2 text-sm font-bold dark:text-white"><input type="checkbox" checked={assessment.obsGynae?.membranesRuptured || false} onChange={e => update(['obsGynae', 'membranesRuptured'], e.target.checked)} /> Membranes Ruptured</label>
                                    <label className="flex items-center gap-2 text-sm font-bold dark:text-white"><input type="checkbox" checked={assessment.obsGynae?.bleeding || false} onChange={e => update(['obsGynae', 'bleeding'], e.target.checked)} /> Bleeding / Show</label>
                                    <label className="flex items-center gap-2 text-sm font-bold dark:text-white"><input type="checkbox" checked={assessment.obsGynae?.foetalMovements || false} onChange={e => update(['obsGynae', 'foetalMovements'], e.target.checked)} /> Foetal Movements Felt</label>
                                </div>
                            </div>
                        )}
                    </div>
                );
            case 'msk':
                return (
                    <div className="space-y-6 animate-in fade-in">
                        <div className="glass-panel p-6 rounded-xl flex flex-col items-center">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 w-full flex items-center justify-between">
                                <span className="flex items-center gap-2"><Bone className="w-5 h-5 text-ams-blue" /> Injury Body Map</span>
                                <button onClick={() => setShowInjuryModal(true)} className="text-xs bg-ams-blue text-white px-3 py-1.5 rounded-lg flex items-center gap-1"><Plus className="w-3 h-3" /> Add Injury</button>
                            </h3>
                            <BodyMap 
                                value={activeDraft.injuries} 
                                onChange={vals => handleNestedUpdate(['injuries'], vals)}
                                mode="injury"
                                onCanvasClick={handleMapClick}
                                onMarkerClick={handleMarkerClick}
                                onImageChange={(url) => handleNestedUpdate(['bodyMapImage'], url)}
                            />
                        </div>
                        
                        {/* Wounds Section */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Wounds</h3>
                            <div className="space-y-2 mb-4">
                                {assessment.wounds?.map((w, i) => (
                                    <div key={w.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                        <div><p className="font-bold text-sm text-slate-800 dark:text-white">{w.site} ({w.classification})</p><p className="text-xs text-slate-500">{w.dimensions} • {w.contamination}</p></div>
                                        <button onClick={() => removeWound(w.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                <div><label className="input-label">Site</label><input className="input-field py-1 text-sm h-8" value={newWound.site || ''} onChange={e => setNewWound({...newWound, site: e.target.value})} placeholder="Location" /></div>
                                <div><label className="input-label">Type</label><select className="input-field py-1 text-sm h-8" value={newWound.classification} onChange={e => setNewWound({...newWound, classification: e.target.value})}><option>Laceration</option><option>Abrasion</option><option>Puncture</option><option>Burn</option><option>Bruise</option></select></div>
                                <div><label className="input-label">Size</label><input className="input-field py-1 text-sm h-8" value={newWound.dimensions || ''} onChange={e => setNewWound({...newWound, dimensions: e.target.value})} placeholder="cm x cm" /></div>
                                <div className="flex items-end"><button onClick={addWound} disabled={!newWound.site} className="w-full h-8 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50">Add Wound</button></div>
                            </div>
                        </div>

                        {/* Burns Section */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Flame className="w-5 h-5 text-orange-500" /> Burns Assessment</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className="input-label">% TBSA</label><input className="input-field py-1.5 text-sm h-9" type="number" value={assessment.burns?.estimatedPercentage || ''} onChange={e => update(['burns', 'estimatedPercentage'], e.target.value)} /></div>
                                <div><label className="input-label">Depth</label><select className="input-field py-1.5 text-sm h-9" value={assessment.burns?.depth || ''} onChange={e => update(['burns', 'depth'], e.target.value)}><option value="">Select...</option><option>Superficial</option><option>Partial Thickness</option><option>Full Thickness</option><option>Mixed</option></select></div>
                                <div><label className="input-label">Patient Weight (kg)</label><input className="input-field py-1.5 text-sm h-9" type="number" value={parklandWeight} onChange={e => setParklandWeight(e.target.value)} /></div>
                                <div>
                                    <label className="input-label">Parkland Formula</label>
                                    <div className="input-field py-1.5 px-3 text-sm h-9 bg-slate-100 dark:bg-slate-900 text-slate-500 flex items-center">
                                        {parklandResult ? `${parklandResult.total}ml (1st 8hrs: ${parklandResult.first8}ml)` : 'Enter TBSA & Wt'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'mental':
                return (
                    <div className="glass-panel p-6 rounded-xl space-y-6 animate-in fade-in">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2"><Smile className="w-5 h-5 text-ams-blue" /> Mental Health</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Appearance</label><textarea className="input-field resize-none text-sm" rows={2} value={assessment.mentalHealth?.appearance || ''} onChange={e => update(['mentalHealth', 'appearance'], e.target.value)} /></div>
                            <div><label className="input-label">Behaviour</label><textarea className="input-field resize-none text-sm" rows={2} value={assessment.mentalHealth?.behaviour || ''} onChange={e => update(['mentalHealth', 'behaviour'], e.target.value)} /></div>
                            <div><label className="input-label">Speech</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.mentalHealth?.speech || ''} onChange={e => update(['mentalHealth', 'speech'], e.target.value)} /></div>
                            <div><label className="input-label">Mood</label><input className="input-field py-1.5 px-3 text-sm h-9" value={assessment.mentalHealth?.mood || ''} onChange={e => update(['mentalHealth', 'mood'], e.target.value)} /></div>
                        </div>
                        <div className="flex gap-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <label className="flex items-center gap-2 font-bold text-red-600 cursor-pointer"><input type="checkbox" checked={assessment.mentalHealth?.riskToSelf || false} onChange={e => update(['mentalHealth', 'riskToSelf'], e.target.checked)} className="w-5 h-5 rounded" /> Risk to Self</label>
                            <label className="flex items-center gap-2 font-bold text-red-600 cursor-pointer"><input type="checkbox" checked={assessment.mentalHealth?.riskToOthers || false} onChange={e => update(['mentalHealth', 'riskToOthers'], e.target.checked)} className="w-5 h-5 rounded" /> Risk to Others</label>
                        </div>
                        {assessment.mentalHealth?.riskToSelf && (
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-900">
                                <h4 className="font-bold text-red-800 dark:text-red-200 mb-2 text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Risk Assessment</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="input-label text-red-800">Suicide Risk</label><select className="input-field" value={assessment.mentalHealth?.suicideRisk || ''} onChange={e => update(['mentalHealth', 'suicideRisk'], e.target.value)}><option value="">Select...</option><option>Ideation Only</option><option>Plan Formulated</option><option>Intent to Act</option><option>Previous Attempts</option></select></div>
                                    <div><label className="input-label text-red-800">Self Harm History</label><select className="input-field" value={assessment.mentalHealth?.selfHarmHistory || ''} onChange={e => update(['mentalHealth', 'selfHarmHistory'], e.target.value)}><option value="">Select...</option><option>None</option><option>Historic</option><option>Recent</option><option>Current Injury</option></select></div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex overflow-x-auto no-scrollbar gap-2 pb-2">
                {tabs.map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setActiveSubTab(tab.id)} 
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeSubTab === tab.id ? 'bg-ams-blue text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>
            
            {renderContent()}

            {/* Injury Modal */}
            {showInjuryModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Injury Detail</h3>
                            <button onClick={() => setShowInjuryModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div><label className="input-label">Type</label><select className="input-field" value={injuryForm.type} onChange={e => setInjuryForm({...injuryForm, type: e.target.value})}><option>Injury</option><option>Pain</option></select></div>
                            <div><label className="input-label">Subtype</label><input className="input-field" value={injuryForm.subtype} onChange={e => setInjuryForm({...injuryForm, subtype: e.target.value})} placeholder="e.g. #, Abrasion, Burn" /></div>
                            <div><label className="input-label">Location</label><input className="input-field" value={injuryForm.location} onChange={e => setInjuryForm({...injuryForm, location: e.target.value})} readOnly /></div>
                            <div><label className="input-label">Notes</label><textarea className="input-field h-20 resize-none" value={injuryForm.notes} onChange={e => setInjuryForm({...injuryForm, notes: e.target.value})} /></div>
                            <div className="flex gap-2 pt-2">
                                {pendingInjury?.id && <button onClick={deleteInjury} className="p-3 bg-red-50 text-red-600 rounded-xl"><Trash2 className="w-5 h-5" /></button>}
                                <button onClick={saveInjury} className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 shadow-md">Save Marker</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentTab;
