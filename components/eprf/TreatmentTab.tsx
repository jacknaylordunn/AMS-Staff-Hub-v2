
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { DRUG_DATABASE, CONTROLLED_DRUGS } from '../../data/drugDatabase';
import { DrugAdministration, Procedure, InjuryMark, ResusEvent } from '../../types';
import { Pill, Syringe, Plus, Search, HeartPulse, ClipboardList, Trash2, Lock, FileText, HeartHandshake, Coffee, X, User, Timer } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import BodyMap from '../BodyMap';
import WitnessModal from '../WitnessModal';
import ResusManager from '../ResusManager';

const TreatmentTab = () => {
    const { activeDraft, addDrug, addProcedure, handleNestedUpdate } = useEPRF();
    const { user } = useAuth();
    const [subTab, setSubTab] = useState<'Drugs' | 'Access' | 'Procedures' | 'Resus' | 'Welfare'>('Drugs');
    
    // Drug State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDrug, setSelectedDrug] = useState<string>('');
    const [dose, setDose] = useState('');
    const [route, setRoute] = useState('');
    const [batch, setBatch] = useState('');
    const [time, setTime] = useState('');
    const [wastage, setWastage] = useState('');
    
    // Witness State
    const [showWitness, setShowWitness] = useState(false);
    
    // Procedure State
    const [procType, setProcType] = useState('');
    const [procTime, setProcTime] = useState('');
    const [procSuccess, setProcSuccess] = useState(true);
    const [procDetails, setProcDetails] = useState('');

    // Welfare Log State
    const [welfareAction, setWelfareAction] = useState('');
    const [welfareNote, setWelfareNote] = useState('');

    // Access (Vascular) State
    const [showAccessModal, setShowAccessModal] = useState(false);
    const [accessForm, setAccessForm] = useState<{
        id?: string;
        type: 'IV' | 'IO' | 'IM' | 'SC';
        location: string;
        size: string;
        success: boolean;
        attempts: number;
        time: string;
        x: number;
        y: number;
        view: 'Anterior' | 'Posterior';
    }>({
        type: 'IV',
        location: '',
        size: '',
        success: true,
        attempts: 1,
        time: '',
        x: 0, 
        y: 0,
        view: 'Anterior'
    });

    if (!activeDraft) return null;

    // --- Drugs ---
    const handleAddDrug = (witnessName?: string, witnessToken?: string) => {
        if (!selectedDrug || !dose || !route) return;
        
        // Controlled Drug Check
        if (!witnessName && CONTROLLED_DRUGS.includes(selectedDrug)) {
            setShowWitness(true);
            return;
        }

        const newDrug: DrugAdministration = {
            id: Date.now().toString(),
            time: time || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            drugName: selectedDrug,
            dose,
            route,
            batchNumber: batch,
            authorisation: 'JRCALC', // Default
            administeredBy: user?.name || 'Unknown',
            witnessedBy: witnessName,
            witnessToken: witnessToken
        };

        if (wastage) {
            newDrug.dose = `${dose} (Wasted: ${wastage})`;
        }

        addDrug(newDrug);
        
        // Reset
        setSelectedDrug('');
        setDose('');
        setRoute('');
        setBatch('');
        setTime('');
        setWastage('');
        setShowWitness(false);
    };

    const removeDrug = (id: string) => {
        const current = activeDraft.treatments.drugs || [];
        handleNestedUpdate(['treatments', 'drugs'], current.filter(d => d.id !== id));
    };

    // --- Procedures ---
    const handleAddProcedure = () => {
        if (!procType) return;
        
        const newProc: Procedure = {
            id: Date.now().toString(),
            time: procTime || new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
            type: procType,
            success: procSuccess,
            performedBy: user?.name || 'Unknown',
            details: procDetails
        };

        addProcedure(newProc);
        
        setProcType('');
        setProcTime('');
        setProcDetails('');
        setProcSuccess(true);
    };

    const removeProcedure = (id: string) => {
        const current = activeDraft.treatments.procedures || [];
        handleNestedUpdate(['treatments', 'procedures'], current.filter(p => p.id !== id));
    };

    // --- Welfare Logging ---
    const handleAddWelfareLog = (action: string) => {
        const newLog = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            message: `${action}${welfareNote ? ': ' + welfareNote : ''}`,
            category: 'Care',
            author: user?.name || 'Clinician'
        };
        handleNestedUpdate(['logs'], [...(activeDraft.logs || []), newLog]);
        setWelfareNote(''); // Clear note but keep action buttons ready
    };

    const removeLog = (id: string) => {
        handleNestedUpdate(['logs'], (activeDraft.logs || []).filter(l => l.id !== id));
    };

    // --- Access (BodyMap) ---
    const handleAccessMapChange = (vals: InjuryMark[]) => {
        handleNestedUpdate(['injuries'], vals);
    };

    const handleAccessMapImage = (dataUrl: string) => {
        handleNestedUpdate(['accessMapImage'], dataUrl);
    };

    const handleAccessMapClick = (x: number, y: number, view: 'Anterior' | 'Posterior', location: string) => {
        setAccessForm({
            type: 'IV',
            location: location,
            size: '20G (Pink)',
            success: true,
            attempts: 1,
            time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            x, y, view
        });
        setShowAccessModal(true);
    };

    const handleMarkerClick = (mark: InjuryMark) => {
        if (['IV', 'IO', 'IM', 'SC'].includes(mark.type)) {
            setAccessForm({
                id: mark.id,
                type: mark.type as any,
                location: mark.location || '',
                size: mark.gauge || '',
                success: mark.success !== false,
                attempts: mark.attempts || 1,
                time: mark.time || '',
                x: mark.x,
                y: mark.y,
                view: mark.view
            });
            setShowAccessModal(true);
        }
    };

    const saveAccess = () => {
        const newMark: InjuryMark = {
            id: accessForm.id || Date.now().toString(),
            x: accessForm.x,
            y: accessForm.y,
            view: accessForm.view,
            type: accessForm.type,
            location: accessForm.location,
            gauge: accessForm.size,
            success: accessForm.success,
            attempts: accessForm.attempts,
            time: accessForm.time
        };

        const currentInjuries = activeDraft.injuries || [];
        const filtered = currentInjuries.filter(i => i.id !== newMark.id);
        handleNestedUpdate(['injuries'], [...filtered, newMark]);
        setShowAccessModal(false);
    };

    const deleteAccess = () => {
        if (!accessForm.id) return;
        const currentInjuries = activeDraft.injuries || [];
        handleNestedUpdate(['injuries'], currentInjuries.filter(i => i.id !== accessForm.id));
        setShowAccessModal(false);
    };

    // --- Resus ---
    const handleResusEvent = (event: ResusEvent) => {
        const current = activeDraft.treatments.resusLog || [];
        handleNestedUpdate(['treatments', 'resusLog'], [...current, event]);
    };

    const updateResusField = (field: string, value: any) => {
        handleNestedUpdate(['treatments', 'role', field], value);
    };

    const toggleCriteria = (criteria: string) => {
        const current = activeDraft.treatments.role?.criteriaMet || [];
        const updated = current.includes(criteria) 
            ? current.filter(c => c !== criteria) 
            : [...current, criteria];
        updateResusField('criteriaMet', updated);
    };

    const filteredDrugs = DRUG_DATABASE.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const WELFARE_ACTIONS = [
        "Water Given", "Food Given", "Toilet Visit", "Position Changed", 
        "Blanket Given", "Reassurance", "Family Contacted", "Observation Only"
    ];

    return (
        <div className="flex flex-col md:flex-row gap-6 h-full">
            <div className="w-full md:w-48 flex-shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0 scrollbar-hide">
                {[
                    { id: 'Drugs', icon: Pill, label: 'Drugs' },
                    { id: 'Welfare', icon: Coffee, label: 'Welfare / Log' },
                    { id: 'Access', icon: Syringe, label: 'Access (IV/IO)' },
                    { id: 'Procedures', icon: ClipboardList, label: 'Procedures' },
                    { id: 'Resus', icon: HeartPulse, label: 'Resuscitation' }
                ].map(tab => (
                    <button 
                        key={tab.id} 
                        onClick={() => setSubTab(tab.id as any)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${subTab === tab.id ? 'bg-white dark:bg-slate-800 text-ams-blue shadow-md' : 'text-slate-500 hover:bg-white/50 dark:hover:bg-slate-900'}`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 min-w-0 space-y-6 animate-in fade-in">
                
                {subTab === 'Drugs' && (
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Pill className="w-5 h-5 text-ams-blue" /> Administer Medication
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="relative">
                                    <label className="input-label">Search Drug</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                        <input 
                                            className="input-field pl-9 h-9 text-sm" 
                                            placeholder="Start typing..." 
                                            value={searchTerm}
                                            onChange={e => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                    {searchTerm && (
                                        <div className="absolute z-10 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl mt-1 max-h-48 overflow-y-auto shadow-lg">
                                            {filteredDrugs.map(d => (
                                                <button 
                                                    key={d.name}
                                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm dark:text-white flex justify-between items-center"
                                                    onClick={() => { setSelectedDrug(d.name); setSearchTerm(''); }}
                                                >
                                                    {d.name}
                                                    {d.class === 'Controlled' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">CD</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <label className="input-label">Selected Drug</label>
                                    <input className="input-field h-9 text-sm font-bold text-slate-700 dark:text-white bg-slate-100 dark:bg-slate-900" value={selectedDrug} readOnly placeholder="No drug selected" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                <div><label className="input-label">Dose</label><input className="input-field h-9 text-sm" value={dose} onChange={e => setDose(e.target.value)} placeholder="e.g. 1g" /></div>
                                <div>
                                    <label className="input-label">Route</label>
                                    <select className="input-field h-9 text-sm" value={route} onChange={e => setRoute(e.target.value)}>
                                        <option value="">Select</option>
                                        {['PO', 'IV', 'IM', 'SC', 'IO', 'PR', 'Nebulised', 'Inhaled', 'Sublingual', 'Buccal', 'Topical'].map(r => <option key={r}>{r}</option>)}
                                    </select>
                                </div>
                                <div><label className="input-label">Batch (Optional)</label><input className="input-field h-9 text-sm" value={batch} onChange={e => setBatch(e.target.value)} /></div>
                                <div><label className="input-label">Time</label><input type="time" className="input-field h-9 text-sm" value={time} onChange={e => setTime(e.target.value)} /></div>
                            </div>

                            {/* Wastage Section */}
                            <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 mb-4">
                                <label className="input-label text-red-800 dark:text-red-300">Wastage / Discard (Optional)</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        className="input-field h-9 text-sm border-red-200 focus:ring-red-500" 
                                        placeholder="Amount discarded e.g. 5mg" 
                                        value={wastage} 
                                        onChange={e => setWastage(e.target.value)} 
                                    />
                                    <span className="text-xs text-red-600 dark:text-red-400 font-medium whitespace-nowrap">Recorded in notes</span>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button 
                                    onClick={() => handleAddDrug()}
                                    disabled={!selectedDrug || !dose || !route}
                                    className="px-6 py-2 bg-ams-blue text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2 text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Add Record
                                </button>
                            </div>
                        </div>

                        {/* Drug Log */}
                        <div className="glass-panel p-6 rounded-xl">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Administration Log</h4>
                            <div className="space-y-2">
                                {activeDraft.treatments.drugs.length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No drugs administered.</p>
                                ) : (
                                    activeDraft.treatments.drugs.map(item => (
                                        <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-800 dark:text-white text-sm">{item.drugName}</span>
                                                    <span className="text-xs bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">{item.dose} {item.route}</span>
                                                </div>
                                                <div className="text-xs text-slate-500 mt-1 flex gap-3">
                                                    <span>Time: {item.time}</span>
                                                    <span>By: {item.administeredBy}</span>
                                                    {item.witnessedBy && <span className="text-purple-600 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Witnessed by {item.witnessedBy}</span>}
                                                </div>
                                            </div>
                                            <button onClick={() => removeDrug(item.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'Welfare' && (
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Coffee className="w-5 h-5 text-amber-600" /> Welfare & Care Log
                            </h3>
                            
                            <div className="mb-4">
                                <label className="input-label">Additional Note (Optional)</label>
                                <input 
                                    className="input-field mb-3 h-9 text-sm" 
                                    placeholder="e.g. 500ml water given" 
                                    value={welfareNote}
                                    onChange={e => setWelfareNote(e.target.value)}
                                />
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {WELFARE_ACTIONS.map(action => (
                                        <button
                                            key={action}
                                            onClick={() => handleAddWelfareLog(action)}
                                            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-ams-blue hover:text-white dark:hover:bg-slate-700 rounded-lg text-xs font-bold transition-all text-slate-600 dark:text-slate-300 shadow-sm border border-slate-200 dark:border-slate-700"
                                        >
                                            {action}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => handleAddWelfareLog("Custom Entry")}
                                        disabled={!welfareNote}
                                        className="px-3 py-2 bg-ams-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        Add Note
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-xl">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4">Action Timeline</h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {(activeDraft.logs || []).slice().reverse().map(log => (
                                    <div key={log.id} className="flex justify-between items-start p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm">
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-slate-800 dark:text-white">{log.message}</p>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {log.author}</span>
                                                <span className="font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => removeLog(log.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {(!activeDraft.logs || activeDraft.logs.length === 0) && (
                                    <p className="text-center text-slate-400 text-sm py-8 italic">No welfare actions recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {subTab === 'Access' && (
                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 w-full flex items-center gap-2">
                            <Syringe className="w-5 h-5 text-green-600" /> Vascular Access Map
                        </h3>
                        <BodyMap 
                            value={activeDraft.injuries} 
                            onChange={handleAccessMapChange}
                            mode="intervention"
                            onImageChange={handleAccessMapImage}
                            onCanvasClick={handleAccessMapClick}
                            onMarkerClick={handleMarkerClick}
                        />
                        <div className="mt-4 flex gap-4 text-xs">
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green-500"></div> Success</span>
                            <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red-500"></div> Failed</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-2">Click body map to add access points (IV/IO). Click existing point to edit.</p>
                    </div>
                )}

                {subTab === 'Procedures' && (
                    <div className="glass-panel p-6 rounded-xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <ClipboardList className="w-5 h-5 text-purple-600" /> Clinical Procedures
                        </h3>
                        <div className="space-y-4 mb-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Procedure Type</label>
                                    <select className="input-field h-9 text-sm" value={procType} onChange={e => setProcType(e.target.value)}>
                                        <option value="">Select...</option>
                                        <option>Wound Care / Dressing</option>
                                        <option>Splinting</option>
                                        <option>Airway - OPA/NPA</option>
                                        <option>Airway - iGel/LMA</option>
                                        <option>Suction</option>
                                        <option>Manual Handling</option>
                                        <option>ECG 12-Lead</option>
                                        <option>Blood Glucose Check</option>
                                        <option>Spinal Immobilisation</option>
                                    </select>
                                </div>
                                <div><label className="input-label">Time</label><input type="time" className="input-field h-9 text-sm" value={procTime} onChange={e => setProcTime(e.target.value)} /></div>
                            </div>
                            <div>
                                <label className="input-label">Details / Notes</label>
                                <input className="input-field h-9 text-sm" placeholder="e.g. Size 4 iGel, successful first pass" value={procDetails} onChange={e => setProcDetails(e.target.value)} />
                            </div>
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 dark:text-white">
                                    <input type="checkbox" checked={procSuccess} onChange={e => setProcSuccess(e.target.checked)} className="w-4 h-4 rounded text-green-600" />
                                    Successful?
                                </label>
                                <button onClick={handleAddProcedure} disabled={!procType} className="px-6 py-2 bg-ams-blue text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm">
                                    Add Procedure
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {activeDraft.treatments.procedures.map(item => (
                                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-white">{item.type} {item.success ? <span className="text-green-600 ml-2 text-xs">✓ Success</span> : <span className="text-red-500 ml-2 text-xs">✗ Failed</span>}</p>
                                        <p className="text-xs text-slate-500">{item.time} - {item.details || 'No details'}</p>
                                    </div>
                                    <button onClick={() => removeProcedure(item.id)} className="p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {subTab === 'Resus' && (
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <HeartHandshake className="w-5 h-5 text-red-600" /> Resuscitation Management
                            </h3>
                            <ResusManager 
                                onLogEvent={handleResusEvent} 
                                initialLog={activeDraft.treatments.resusLog} 
                            />
                        </div>
                        
                        <div className="glass-panel p-6 rounded-xl">
                            <h4 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-ams-blue" /> Recognition of Life Extinct (ROLE) / VOD
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="input-label">Time Verified</label><input type="time" className="input-field h-9 text-sm" value={activeDraft.treatments.role?.timeVerified || ''} onChange={e => updateResusField('timeVerified', e.target.value)} /></div>
                                <div><label className="input-label">Verified By</label><input className="input-field h-9 text-sm" value={activeDraft.treatments.role?.verifiedBy || ''} onChange={e => updateResusField('verifiedBy', e.target.value)} /></div>
                                
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                    <h5 className="col-span-1 sm:col-span-2 text-xs font-bold text-slate-500 uppercase mb-2">Confirmation Criteria (Min 1 Minute)</h5>
                                    {['No Carotid Pulse', 'No Heart Sounds', 'No Breath Sounds', 'Fixed Dilated Pupils', 'No Pain Response'].map(crit => (
                                        <label key={crit} className="flex items-center gap-2 cursor-pointer text-sm dark:text-slate-300">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded text-red-600"
                                                checked={activeDraft.treatments.role?.criteriaMet?.includes(crit) || false}
                                                onChange={() => toggleCriteria(crit)}
                                            />
                                            {crit}
                                        </label>
                                    ))}
                                </div>

                                <div className="md:col-span-2 space-y-2 mt-2">
                                    <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.dnacprAvailable || false} onChange={e => updateResusField('dnacprAvailable', e.target.checked)} /> Valid DNACPR Available</label>
                                    <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.arrestWitnessed || false} onChange={e => updateResusField('arrestWitnessed', e.target.checked)} /> Arrest Witnessed</label>
                                    <label className="flex items-center gap-2 font-bold text-sm dark:text-white"><input type="checkbox" checked={activeDraft.treatments.role?.bystanderCPR || false} onChange={e => updateResusField('bystanderCPR', e.target.checked)} /> Bystander CPR Performed</label>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="input-label">Resus Summary / Rationale for Ceasing</label>
                                    <textarea 
                                        className="input-field h-24 text-sm" 
                                        placeholder="e.g. Injuries incompatible with life, rigor mortis, 20 mins asystole with no reversible causes..."
                                        value={activeDraft.treatments.role?.resusSummary || ''} 
                                        onChange={e => updateResusField('resusSummary', e.target.value)} 
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Vascular Access Modal */}
            {showAccessModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">{accessForm.id ? 'Edit Access' : 'Add Vascular Access'}</h3>
                            <button onClick={() => setShowAccessModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div>
                                <label className="input-label">Type</label>
                                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                                    {['IV', 'IO', 'IM', 'SC'].map(t => (
                                        <button key={t} onClick={() => setAccessForm({...accessForm, type: t as any})} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${accessForm.type === t ? 'bg-white dark:bg-slate-700 shadow text-ams-blue dark:text-white' : 'text-slate-500'}`}>
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Site / Location</label>
                                <input className="input-field py-2 text-sm h-9" value={accessForm.location} onChange={e => setAccessForm({...accessForm, location: e.target.value})} placeholder="e.g. Left ACF" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="input-label">Cannula Size</label>
                                    <select className="input-field py-2 text-sm h-9" value={accessForm.size} onChange={e => setAccessForm({...accessForm, size: e.target.value})}>
                                        <option value="">Select...</option>
                                        <option value="24G (Yellow)">24G (Yellow)</option>
                                        <option value="22G (Blue)">22G (Blue)</option>
                                        <option value="20G (Pink)">20G (Pink)</option>
                                        <option value="18G (Green)">18G (Green)</option>
                                        <option value="16G (Grey)">16G (Grey)</option>
                                        <option value="14G (Orange)">14G (Orange)</option>
                                        <option value="IO Needle">IO Needle</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label">Time</label>
                                    <input type="time" className="input-field py-2 text-sm h-9" value={accessForm.time} onChange={e => setAccessForm({...accessForm, time: e.target.value})} />
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 dark:text-white">
                                    <input type="checkbox" checked={accessForm.success} onChange={e => setAccessForm({...accessForm, success: e.target.checked})} className="w-4 h-4 rounded text-green-600" />
                                    Successful?
                                </label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-500">Attempts:</span>
                                    <input type="number" className="w-12 text-center border rounded py-1 text-sm bg-white dark:bg-slate-800 dark:text-white h-8" value={accessForm.attempts} onChange={e => setAccessForm({...accessForm, attempts: Number(e.target.value)})} min={1} />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2">
                                {accessForm.id && (
                                    <button onClick={deleteAccess} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button onClick={saveAccess} className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-md text-sm">
                                    {accessForm.id ? 'Update Access' : 'Save Access'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showWitness && (
                <WitnessModal 
                    drugName={selectedDrug} 
                    onWitnessConfirmed={handleAddDrug} 
                    onCancel={() => setShowWitness(false)} 
                />
            )}
        </div>
    );
};

export default TreatmentTab;
