
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { DRUG_DATABASE, CONTROLLED_DRUGS } from '../../data/drugDatabase';
import { DrugAdministration, Procedure, InjuryMark, Role } from '../../types';
import { Pill, Syringe, Plus, Search, CheckCircle, HeartPulse, Zap, Clock, Activity, MapPin, Trash2, Lock, FileText, HeartHandshake, Coffee, Car, Phone, Users, Wind, AlertOctagon, ClipboardList, Skull, Flame, Smile, X } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import BodyMap from '../BodyMap';
import WitnessModal from '../WitnessModal';
import { ROLE_HIERARCHY } from '../../utils/roleHelper';

const TreatmentTab = () => {
    const { activeDraft, addDrug, addProcedure, handleNestedUpdate, updateDraft } = useEPRF();
    const { user } = useAuth();
    const [subTab, setSubTab] = useState<'Drugs' | 'Access' | 'Procedures' | 'Resus' | 'Welfare'>('Drugs');
    
    // Drug State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDrug, setSelectedDrug] = useState<string>('');
    const [dose, setDose] = useState('');
    const [route, setRoute] = useState('');
    const [batch, setBatch] = useState('');
    const [time, setTime] = useState('');
    const [isWastage, setIsWastage] = useState(false);
    const [witnessData, setWitnessData] = useState<{name: string, uid: string} | null>(null);
    const [showWitnessModal, setShowWitnessModal] = useState(false);

    // Procedure State
    const [procType, setProcType] = useState('Splinting');
    const [procSite, setProcSite] = useState('');
    const [procSize, setProcSize] = useState('');
    const [procSuccess, setProcSuccess] = useState(true);
    const [procAttempts, setProcAttempts] = useState(1);
    const [procTime, setProcTime] = useState('');
    const [airwayDetails, setAirwayDetails] = useState({ etco2: '', depth: '', secureMethod: 'Thomas Holder' });

    // Access Modal State
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [pendingAccessMark, setPendingAccessMark] = useState<Partial<InjuryMark> | null>(null);
    const [accessForm, setAccessForm] = useState({
        device: 'IV Cannula',
        gauge: '20G (Pink)',
        time: '',
        success: true,
        attempts: 1,
        locationName: ''
    });

    // VOD / Resus State
    const [vodCriteria, setVodCriteria] = useState({
        conditionsUnequivocal: false,
        asystole20: false,
        noResp2: false,
        noPulse2: false,
        noHeartSounds2: false,
        pupilsFixed: false,
        pacemakerDisabled: false
    });
    const [resusNotes, setResusNotes] = useState('');

    useEffect(() => {
        if (activeDraft?.mode === 'Welfare' && subTab !== 'Welfare') {
            setSubTab('Welfare');
        }
    }, [activeDraft?.mode]);

    const handleAddDrug = () => {
        if (!selectedDrug || !dose || !route) return;
        const isCD = CONTROLLED_DRUGS.includes(selectedDrug);
        const userLevel = ROLE_HIERARCHY[user?.role || Role.Pending];
        const paraLevel = ROLE_HIERARCHY[Role.Paramedic];
        const requiresWitness = isCD || userLevel < paraLevel;

        if (requiresWitness && !witnessData) {
            alert(`Witness required for ${selectedDrug} (Grade/CD Policy). Please verify witness.`);
            return;
        }

        const now = new Date();
        const drugTime = time || now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        
        const drugEntry: DrugAdministration = {
            id: Date.now().toString(),
            time: drugTime,
            drugName: selectedDrug + (isWastage ? ' (WASTAGE)' : ''),
            dose,
            route,
            batchNumber: batch,
            authorisation: 'JRCALC',
            administeredBy: user?.name || 'Clinician',
            witnessedBy: witnessData?.name,
            witnessUid: witnessData?.uid
        };
        addDrug(drugEntry);
        setDose(''); setBatch(''); setTime(''); setSelectedDrug(''); setWitnessData(null); setIsWastage(false);
    };

    const handleDeleteDrug = (id: string) => {
        if(!confirm("Delete this drug administration entry?")) return;
        const current = activeDraft?.treatments.drugs || [];
        handleNestedUpdate(['treatments', 'drugs'], current.filter(d => d.id !== id));
    };

    const handleAddProc = () => {
        const now = new Date();
        const finalTime = procTime || now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const isAirway = procType.includes('Airway') || procType.includes('iGel') || procType.includes('Tube');
        
        const procEntry: Procedure = {
            id: Date.now().toString(),
            time: finalTime,
            type: procType,
            site: procSite,
            size: procSize,
            success: procSuccess,
            attempts: procAttempts,
            performedBy: user?.name || 'Clinician',
            ...(isAirway ? airwayDetails : {})
        };
        addProcedure(procEntry);
        setProcSite(''); setProcSize(''); setProcTime('');
        setAirwayDetails({ etco2: '', depth: '', secureMethod: 'Thomas Holder' });
    };

    const logWelfareAction = (action: string) => {
        const now = new Date();
        const procEntry: Procedure = {
            id: Date.now().toString(),
            time: now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            type: 'Welfare Check',
            site: 'N/A',
            details: action,
            success: true,
            performedBy: user?.name || 'Clinician'
        };
        addProcedure(procEntry);
    };

    const handleRemoveProc = (id: string) => {
        const current = activeDraft?.treatments.procedures || [];
        handleNestedUpdate(['treatments', 'procedures'], current.filter(p => p.id !== id));
    };

    // --- Access (Body Map) Logic ---
    const handleAccessMapClick = (x: number, y: number, view: 'Anterior' | 'Posterior', location: string) => {
        setPendingAccessMark({ x, y, view });
        setAccessForm({ ...accessForm, locationName: location, time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) });
        setShowAccessModal(true);
    };

    const handleAccessMarkerClick = (mark: InjuryMark) => {
        // Load for edit/delete
        setPendingAccessMark(mark);
        setAccessForm({
            device: mark.device || 'IV Cannula',
            gauge: mark.gauge || '',
            time: mark.time || '',
            success: mark.success ?? true,
            attempts: mark.attempts || 1,
            locationName: mark.location || ''
        });
        setShowAccessModal(true);
    };

    const saveAccess = () => {
        if (!pendingAccessMark) return;
        
        // 1. Create/Update Marker
        const newMark: InjuryMark = {
            id: pendingAccessMark.id || Date.now().toString(),
            x: pendingAccessMark.x!,
            y: pendingAccessMark.y!,
            view: pendingAccessMark.view!,
            type: accessForm.device === 'IO' ? 'IO' : 'IV',
            subtype: accessForm.gauge,
            location: accessForm.locationName,
            success: accessForm.success,
            device: accessForm.device,
            gauge: accessForm.gauge,
            time: accessForm.time,
            attempts: accessForm.attempts
        };

        const currentInjuries = activeDraft?.injuries || [];
        const filteredInjuries = currentInjuries.filter(i => i.id !== newMark.id); // Remove if existing to replace
        handleNestedUpdate(['injuries'], [...filteredInjuries, newMark]);

        // 2. Add to Procedures List automatically
        const procEntry: Procedure = {
            id: newMark.id, // Link ID
            time: accessForm.time,
            type: accessForm.device,
            site: accessForm.locationName,
            size: accessForm.gauge,
            success: accessForm.success,
            attempts: accessForm.attempts,
            performedBy: user?.name || 'Clinician'
        };
        const currentProcs = activeDraft?.treatments.procedures || [];
        const filteredProcs = currentProcs.filter(p => p.id !== newMark.id);
        handleNestedUpdate(['treatments', 'procedures'], [...filteredProcs, procEntry]);

        setShowAccessModal(false);
        setPendingAccessMark(null);
    };

    const deleteAccess = () => {
        if (!pendingAccessMark?.id) return;
        if (!confirm("Remove this access intervention?")) return;
        
        const currentInjuries = activeDraft?.injuries || [];
        handleNestedUpdate(['injuries'], currentInjuries.filter(i => i.id !== pendingAccessMark.id));
        
        const currentProcs = activeDraft?.treatments.procedures || [];
        handleNestedUpdate(['treatments', 'procedures'], currentProcs.filter(p => p.id !== pendingAccessMark.id));
        
        setShowAccessModal(false);
        setPendingAccessMark(null);
    };

    const updateVOD = (key: keyof typeof vodCriteria, val: boolean) => {
        const newData = { ...vodCriteria, [key]: val };
        setVodCriteria(newData);
        handleNestedUpdate(['assessment', 'role', 'criteriaMet'], Object.keys(newData).filter(k => (newData as any)[k]));
    };

    const filteredDrugs = DRUG_DATABASE.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const existingProcs = activeDraft?.treatments.procedures.filter(p => !['IV Cannula', 'IO', 'Butterfly', 'Sub-Cut'].includes(p.type) && p.type !== 'Resus Event') || [];
    const isWelfare = activeDraft?.mode === 'Welfare';
    const isAirwaySelected = procType.includes('Airway') || procType.includes('iGel') || procType.includes('Tube');

    // Time Editing for Welfare Log
    const updateLogTime = (id: string, newTime: string) => {
        const current = activeDraft?.treatments.procedures || [];
        const updated = current.map(p => p.id === id ? { ...p, time: newTime } : p);
        handleNestedUpdate(['treatments', 'procedures'], updated);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {isWelfare ? (
                    <button onClick={() => setSubTab('Welfare')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${subTab === 'Welfare' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Welfare Checks</button>
                ) : (
                    <>
                        <button onClick={() => setSubTab('Drugs')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${subTab === 'Drugs' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Medication</button>
                        <button onClick={() => setSubTab('Access')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${subTab === 'Access' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Vascular Access</button>
                        <button onClick={() => setSubTab('Procedures')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all ${subTab === 'Procedures' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>Procedures</button>
                        <button onClick={() => setSubTab('Resus')} className={`px-6 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'Resus' ? 'bg-red-600 text-white shadow' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}><Activity className="w-4 h-4" /> Arrest / VOD</button>
                    </>
                )}
            </div>

            {subTab === 'Welfare' && (
                <div className="glass-panel p-6 rounded-2xl animate-in fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <button onClick={() => logWelfareAction('Friends Found')} className="p-4 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold text-sm flex flex-col items-center gap-2 border border-emerald-100 dark:border-emerald-800"><Smile className="w-6 h-6" /> Friends Found</button>
                        <button onClick={() => logWelfareAction('Given Water')} className="p-4 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl text-blue-700 dark:text-blue-300 font-bold text-sm flex flex-col items-center gap-2 border border-blue-100 dark:border-blue-800"><Coffee className="w-6 h-6" /> Water Given</button>
                        <button onClick={() => logWelfareAction('Given Food')} className="p-4 bg-orange-50 dark:bg-orange-900/30 hover:bg-orange-100 rounded-xl text-orange-700 dark:text-orange-300 font-bold text-sm flex flex-col items-center gap-2 border border-orange-100"><ClipboardList className="w-6 h-6" /> Food Given</button>
                        <button onClick={() => logWelfareAction('Provided Warmth/Blanket')} className="p-4 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 rounded-xl text-red-700 dark:text-red-300 font-bold text-sm flex flex-col items-center gap-2 border border-red-100"><Flame className="w-6 h-6" /> Warmth / Blanket</button>
                        <button onClick={() => logWelfareAction('Reassurance Given')} className="p-4 bg-purple-50 dark:bg-purple-900/30 hover:bg-purple-100 rounded-xl text-purple-700 dark:text-purple-300 font-bold text-sm flex flex-col items-center gap-2 border border-purple-100"><HeartHandshake className="w-6 h-6" /> Reassurance</button>
                        <button onClick={() => logWelfareAction('Transport Arranged')} className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm flex flex-col items-center gap-2 border border-slate-200"><Car className="w-6 h-6" /> Transport</button>
                        <button onClick={() => logWelfareAction('Contacted Relative')} className="p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl text-slate-700 dark:text-slate-300 font-bold text-sm flex flex-col items-center gap-2 border border-slate-200"><Phone className="w-6 h-6" /> Call Relative</button>
                        <button onClick={() => logWelfareAction('Safeguarding Referral')} className="p-4 bg-red-100 dark:bg-red-900/50 hover:bg-red-200 rounded-xl text-red-800 dark:text-red-200 font-bold text-sm flex flex-col items-center gap-2 border border-red-200"><AlertOctagon className="w-6 h-6" /> Safeguarding</button>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
                        <h4 className="font-bold text-sm text-slate-500 uppercase mb-3">Welfare Log</h4>
                        <div className="space-y-2">
                            {activeDraft.treatments.procedures.filter(p => p.type === 'Welfare Check').map((log, i) => (
                                <div key={log.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white">{log.details}</div>
                                        <div className="text-xs text-slate-500">By {log.performedBy}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="time" 
                                            className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 text-xs font-mono dark:text-white"
                                            value={log.time}
                                            onChange={(e) => updateLogTime(log.id, e.target.value)}
                                        />
                                        <button onClick={() => handleRemoveProc(log.id)} className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {activeDraft.treatments.procedures.filter(p => p.type === 'Welfare Check').length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No actions recorded yet.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Drugs Tab */}
            {subTab === 'Drugs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit lg:sticky lg:top-4 z-10">
                        {/* Drug form... (omitted for brevity, same as previous) */}
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Pill className="w-5 h-5 text-purple-500" /> Administer Drug
                        </h3>
                        <div className="space-y-4">
                            <div><label className="input-label">Search Drug</label><div className="relative"><Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><input className="input-field py-1.5 px-3 text-sm h-8 pl-10" placeholder="e.g. Paracetamol" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>{searchTerm && (<div className="mt-2 max-h-32 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">{filteredDrugs.map(d => (<div key={d.name} onClick={() => { setSelectedDrug(d.name); setSearchTerm(''); }} className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-sm dark:text-white border-b border-slate-100 dark:border-slate-800 last:border-0">{d.name}</div>))}</div>)}</div>
                            {selectedDrug && (<div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-bold text-sm text-center">Selected: {selectedDrug}</div>)}
                            <div><label className="input-label">Dose</label><input className="input-field py-1.5 px-3 text-sm h-8" placeholder="e.g. 1g" value={dose} onChange={e => setDose(e.target.value)} /></div>
                            <div><label className="input-label">Route</label><select className="input-field py-1.5 px-3 text-sm h-8" value={route} onChange={e => setRoute(e.target.value)}><option value="">Select...</option><option>Oral (PO)</option><option>IV</option><option>IM</option><option>IO</option><option>Nebulised</option><option>Rectal (PR)</option><option>Topical</option></select></div>
                            <div><label className="input-label">Time</label><input type="time" className="input-field py-1.5 px-3 text-sm h-8" value={time} onChange={e => setTime(e.target.value)} /></div>
                            <div><label className="input-label">Batch No.</label><input className="input-field py-1.5 px-3 text-sm h-8" placeholder="Optional" value={batch} onChange={e => setBatch(e.target.value)} /></div>
                            <label className="flex items-center gap-2 p-2 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/20 cursor-pointer"><input type="checkbox" className="w-4 h-4 text-red-600 rounded" checked={isWastage} onChange={e => setIsWastage(e.target.checked)} /><span className="text-sm font-bold text-red-700 dark:text-red-300">Record as Wastage?</span></label>
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700"><label className="input-label mb-1">Witness Check</label>{witnessData ? (<div className="flex items-center justify-between text-xs font-bold text-green-600 dark:text-green-400"><span>Confirmed: {witnessData.name}</span><button onClick={() => setWitnessData(null)} className="text-red-500 hover:underline">Clear</button></div>) : (<button onClick={() => setShowWitnessModal(true)} className="w-full py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"><Lock className="w-3 h-3" /> Verify Witness</button>)}</div>
                            <button onClick={handleAddDrug} disabled={!selectedDrug || !dose || !route} className="w-full py-3 bg-ams-blue text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors shadow-md">Record Administration</button>
                        </div>
                    </div>
                    {/* List... */}
                    <div className="lg:col-span-2 space-y-4">
                        {activeDraft?.treatments.drugs.length === 0 && <div className="p-12 text-center text-slate-400 italic bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">No drugs administered yet.</div>}
                        {activeDraft?.treatments.drugs.map((drug, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group relative">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-lg">{drug.drugName} <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">({drug.dose})</span></div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 flex gap-3 mt-1 flex-wrap">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">{drug.route}</span>
                                        <span>Time: {drug.time}</span>
                                        <span>By: {drug.administeredBy}</span>
                                        {drug.witnessedBy && <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Witness: {drug.witnessedBy}</span>}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full"><CheckCircle className="w-5 h-5" /></div>
                                    <button onClick={() => handleDeleteDrug(drug.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100" title="Delete Entry"><Trash2 className="w-5 h-5" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Access Tab Redesign */}
            {subTab === 'Access' && (
                <div className="grid grid-cols-1 gap-8 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center relative">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 w-full">Access Location</h3>
                        <BodyMap 
                            value={activeDraft.injuries || []} 
                            onChange={(inj) => handleNestedUpdate(['injuries'], inj)} 
                            mode="intervention" 
                            onCanvasClick={handleAccessMapClick}
                            onMarkerClick={handleAccessMarkerClick}
                            onImageChange={(dataUrl) => handleNestedUpdate(['accessMapImage'], dataUrl)} 
                        />
                        <p className="text-xs text-slate-400 mt-2 text-center">Click body map to add intervention. Click markers to edit.</p>
                    </div>
                </div>
            )}

            {/* Resus Tab (VOD/ROLE) */}
            {subTab === 'Resus' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                    {/* ROLE Checklist */}
                    <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-slate-800">
                        <div className="flex items-center gap-3 mb-4">
                            <Activity className="w-6 h-6 text-slate-800 dark:text-slate-200" />
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Recognition of Life Extinct (ROLE)</h3>
                        </div>
                        <p className="text-xs text-slate-500 mb-4">Verify death in accordance with JRCALC / Resus Council guidelines.</p>
                        
                        <div className="space-y-3">
                            {/* ROLE Fields same as before */}
                            <label className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900 rounded-lg cursor-pointer">
                                <input type="checkbox" className="mt-1 w-5 h-5 text-red-600 rounded" checked={vodCriteria.conditionsUnequivocal} onChange={e => updateVOD('conditionsUnequivocal', e.target.checked)} />
                                <div><span className="block font-bold text-sm text-red-900 dark:text-red-200">Conditions Unequivocal with Life</span><span className="text-xs text-red-700 dark:text-red-300">Decapitation, massive cranial destruction, hemicorporectomy, decomposition, incineration, rigor mortis, hypostasis.</span></div>
                            </label>
                            <div className="border-t border-slate-200 dark:border-slate-700 my-4 pt-2">
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Or Confirm Cessation of Circulation (All Required)</p>
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"><input type="checkbox" checked={vodCriteria.noPulse2} onChange={e => updateVOD('noPulse2', e.target.checked)} className="rounded" /><span className="text-sm dark:text-slate-300">No palpable central pulse (1 min)</span></label>
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"><input type="checkbox" checked={vodCriteria.noHeartSounds2} onChange={e => updateVOD('noHeartSounds2', e.target.checked)} className="rounded" /><span className="text-sm dark:text-slate-300">No heart sounds on auscultation (1 min)</span></label>
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"><input type="checkbox" checked={vodCriteria.noResp2} onChange={e => updateVOD('noResp2', e.target.checked)} className="rounded" /><span className="text-sm dark:text-slate-300">No respiratory effort (1 min)</span></label>
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"><input type="checkbox" checked={vodCriteria.pupilsFixed} onChange={e => updateVOD('pupilsFixed', e.target.checked)} className="rounded" /><span className="text-sm dark:text-slate-300">Pupils fixed and dilated</span></label>
                                <label className="flex items-center gap-3 p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded cursor-pointer"><input type="checkbox" checked={vodCriteria.asystole20} onChange={e => updateVOD('asystole20', e.target.checked)} className="rounded" /><span className="text-sm dark:text-slate-300">Asystole on ECG Monitor (&gt;30s)</span></label>
                            </div>
                        </div>
                    </div>

                    {/* Resus Summary */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-red-600" /> Resuscitation Summary
                        </h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.arrestWitnessed} onChange={e => handleNestedUpdate(['assessment', 'role', 'arrestWitnessed'], e.target.checked)} /> Witnessed Arrest?</label>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.bystanderCPR} onChange={e => handleNestedUpdate(['assessment', 'role', 'bystanderCPR'], e.target.checked)} /> Bystander CPR?</label>
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.dnacprAvailable} onChange={e => handleNestedUpdate(['assessment', 'role', 'dnacprAvailable'], e.target.checked)} /> DNACPR in Place?</label>
                            </div>
                            <textarea className="input-field h-40 resize-none font-mono text-sm" placeholder="Summary of resuscitation attempt..." value={resusNotes} onChange={e => setResusNotes(e.target.value)} onBlur={() => handleNestedUpdate(['assessment', 'role', 'resusSummary'], resusNotes)} />
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="input-label">Total Shocks</label><input type="number" className="input-field" placeholder="0" onChange={e => handleNestedUpdate(['assessment', 'role', 'totalShocks'], Number(e.target.value))} /></div>
                                <div><label className="input-label">Downtime (Mins)</label><input type="number" className="input-field" placeholder="mins" onChange={e => handleNestedUpdate(['assessment', 'role', 'downTimeMinutes'], Number(e.target.value))} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* General Procedure Panel */}
            {subTab === 'Procedures' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Add Procedure</h3>
                        <div className="space-y-4">
                            <div><label className="input-label">Type</label><select className="input-field py-1.5 px-3 text-sm h-8" value={procType} onChange={e => setProcType(e.target.value)}><option>Splinting</option><option>Wound Dressing</option><option>Suture / Glue</option><option>Airway (OPA/NPA/iGel)</option><option>ET Intubation</option><option>Spinal Immobilisation</option><option>Pelvic Binder</option><option>Nebuliser</option><option>Manual Handling</option></select></div>
                            {isAirwaySelected && (<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800 space-y-3 animate-in fade-in"><h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase">Airway Governance</h4><div className="grid grid-cols-2 gap-3"><div><label className="input-label">Size</label><input className="input-field py-1.5 px-3 text-sm h-8" placeholder="e.g. Size 4" value={procSize} onChange={e => setProcSize(e.target.value)} /></div><div><label className="input-label">Depth (cm)</label><input className="input-field py-1.5 px-3 text-sm h-8" placeholder="e.g. 22cm at teeth" value={airwayDetails.depth} onChange={e => setAirwayDetails({...airwayDetails, depth: e.target.value})} /></div></div><div className="grid grid-cols-2 gap-3"><div><label className="input-label">EtCO2 (kPa)</label><input className="input-field font-mono py-1.5 px-3 text-sm h-8" placeholder="4.5-5.5" value={airwayDetails.etco2} onChange={e => setAirwayDetails({...airwayDetails, etco2: e.target.value})} /></div><div><label className="input-label">Secured By</label><select className="input-field py-1.5 px-3 text-sm h-8" value={airwayDetails.secureMethod} onChange={e => setAirwayDetails({...airwayDetails, secureMethod: e.target.value})}><option>Thomas Holder</option><option>Tape</option><option>Hand Held</option></select></div></div></div>)}
                            <div><label className="input-label">Site / Details</label><input className="input-field py-1.5 px-3 text-sm h-8" placeholder="e.g. Left Leg" value={procSite} onChange={e => setProcSite(e.target.value)} /></div>
                            <div><label className="input-label">Time Performed</label><input type="time" className="input-field py-1.5 px-3 text-sm h-8" value={procTime} onChange={e => setProcTime(e.target.value)} /></div>
                            <div className="flex gap-4"><label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white cursor-pointer"><input type="checkbox" checked={procSuccess} onChange={e => setProcSuccess(e.target.checked)} className="w-4 h-4 rounded text-green-600" />Successful</label></div>
                            <button onClick={handleAddProc} disabled={!procSite} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md">Record Procedure</button>
                        </div>
                    </div>
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Procedure Log</h3>
                        <div className="space-y-2">{existingProcs.filter(p => p.type !== 'Welfare Check').map((proc, i) => (<div key={i} className="flex flex-col p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"><div className="flex justify-between items-center mb-1"><div className="font-bold text-slate-800 dark:text-white text-sm">{proc.type}</div><div className="flex items-center gap-2">{!proc.success && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Failed</span>}<button onClick={() => handleRemoveProc(proc.id)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"><Trash2 className="w-4 h-4" /></button></div></div><div className="text-xs text-slate-500">{proc.site} {proc.size && `(${proc.size})`} • {proc.time}</div>{proc.etco2 && (<div className="mt-2 text-xs bg-blue-50 dark:bg-blue-900/20 p-2 rounded text-blue-700 dark:text-blue-300 font-mono">EtCO2: {proc.etco2} | Depth: {proc.depth || '-'} | {proc.secureMethod}</div>)}</div>))}{existingProcs.filter(p => p.type !== 'Welfare Check').length === 0 && <p className="text-sm text-slate-400 italic text-center">No procedures recorded.</p>}</div>
                    </div>
                </div>
            )}

            {/* Access Modal */}
            {showAccessModal && pendingAccessMark && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-800">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{pendingAccessMark.id ? 'Edit Access' : 'Add Access'}</h3>
                            <button onClick={() => setShowAccessModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="space-y-4">
                            <div><label className="input-label">Device</label><select className="input-field py-2" value={accessForm.device} onChange={e => setAccessForm({...accessForm, device: e.target.value})}><option>IV Cannula</option><option>IO</option><option>Butterfly</option><option>Sub-Cut</option></select></div>
                            <div><label className="input-label">Gauge / Size</label><select className="input-field py-2" value={accessForm.gauge} onChange={e => setAccessForm({...accessForm, gauge: e.target.value})}><option>22G (Blue)</option><option>20G (Pink)</option><option>18G (Green)</option><option>16G (Grey)</option><option>14G (Orange)</option><option>IO Needle</option></select></div>
                            <div><label className="input-label">Location</label><input className="input-field py-2" value={accessForm.locationName} onChange={e => setAccessForm({...accessForm, locationName: e.target.value})} /></div>
                            <div><label className="input-label">Time</label><input type="time" className="input-field py-2" value={accessForm.time} onChange={e => setAccessForm({...accessForm, time: e.target.value})} /></div>
                            <div className="flex gap-4 items-center pt-2">
                                <label className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-white cursor-pointer"><input type="checkbox" checked={accessForm.success} onChange={e => setAccessForm({...accessForm, success: e.target.checked})} className="w-4 h-4 text-green-600 rounded" /> Successful</label>
                                <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-500">Attempts:</span><input type="number" className="w-12 text-center border rounded p-1 text-xs" value={accessForm.attempts} onChange={e => setAccessForm({...accessForm, attempts: Number(e.target.value)})} /></div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                {pendingAccessMark.id && (<button onClick={deleteAccess} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Trash2 className="w-5 h-5" /></button>)}
                                <button onClick={saveAccess} className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Witness Modal */}
            {showWitnessModal && (
                <WitnessModal 
                    drugName={selectedDrug} 
                    onWitnessConfirmed={(name, uid) => { setWitnessData({name, uid}); setShowWitnessModal(false); }} 
                    onCancel={() => setShowWitnessModal(false)} 
                />
            )}
        </div>
    );
};

export default TreatmentTab;
