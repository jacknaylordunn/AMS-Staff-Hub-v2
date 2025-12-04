
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { DRUG_DATABASE } from '../../data/drugDatabase';
import { DrugAdministration, Procedure, ResusEvent, InjuryMark } from '../../types';
import { Pill, Syringe, Plus, Search, CheckCircle, HeartPulse, Zap, Clock, Activity, Play, Square, MapPin, Trash2, Lock, FileText, CheckSquare, Save, HeartHandshake, Coffee, Car, Phone, Users } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import BodyMap from '../BodyMap';
import WitnessModal from '../WitnessModal';

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
    const [witnessData, setWitnessData] = useState<{name: string, uid: string} | null>(null);
    const [showWitnessModal, setShowWitnessModal] = useState(false);

    // Procedure State
    const [procType, setProcType] = useState('Splinting');
    const [procSite, setProcSite] = useState('');
    const [procSize, setProcSize] = useState('');
    const [procSuccess, setProcSuccess] = useState(true);
    const [procAttempts, setProcAttempts] = useState(1);

    // Access (Vascular) State
    const [accessType, setAccessType] = useState('IV Cannula');
    const [accessSize, setAccessSize] = useState('20G (Pink)');
    const [accessLocation, setAccessLocation] = useState('');
    const [tempInjuries, setTempInjuries] = useState<InjuryMark[]>([]); // Buffered state

    // Initialize tempInjuries from global state when tab opens
    useEffect(() => {
        if (activeDraft?.injuries) {
            setTempInjuries(activeDraft.injuries);
        }
    }, [activeDraft?.injuries]);

    // Auto-select Welfare tab if mode is Welfare
    useEffect(() => {
        if (activeDraft?.mode === 'Welfare' && subTab !== 'Welfare') {
            setSubTab('Welfare');
        }
    }, [activeDraft?.mode]);

    // ROLE State
    const [roleCriteria, setRoleCriteria] = useState<string[]>([]);
    const [roleNotes, setRoleNotes] = useState('');

    const handleAddDrug = () => {
        if (!selectedDrug || !dose || !route) return;
        const now = new Date();
        const drugEntry: DrugAdministration = {
            id: Date.now().toString(),
            time: time || now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            drugName: selectedDrug,
            dose,
            route,
            batchNumber: batch,
            authorisation: 'JRCALC',
            administeredBy: user?.name || 'Clinician',
            witnessedBy: witnessData?.name,
            witnessUid: witnessData?.uid
        };
        addDrug(drugEntry);
        setDose(''); setBatch(''); setTime(''); setSelectedDrug(''); setWitnessData(null);
    };

    const handleAddProc = () => {
        const now = new Date();
        const procEntry: Procedure = {
            id: Date.now().toString(),
            time: now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            type: procType,
            site: procSite,
            size: procSize,
            success: procSuccess,
            attempts: procAttempts,
            performedBy: user?.name || 'Clinician'
        };
        addProcedure(procEntry);
        setProcSite(''); setProcSize('');
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

    const handleAddAccess = () => {
        const now = new Date();
        const procEntry: Procedure = {
            id: Date.now().toString(),
            time: now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            type: accessType,
            site: accessLocation || 'Unspecified',
            size: accessSize,
            success: true,
            attempts: 1,
            performedBy: user?.name || 'Clinician'
        };
        
        // 1. Add Procedure to Log
        addProcedure(procEntry);
        
        // 2. Commit buffered map markers to global state
        handleNestedUpdate(['injuries'], tempInjuries);
        
        setAccessLocation('');
    };

    const handleMapMarkerSelect = (mark: InjuryMark) => {
        let loc = 'Site';
        if (mark.y < 150) loc = 'Neck / EJ';
        else if (mark.y > 150 && mark.y < 350) loc = mark.x < 150 ? 'Right Arm' : 'Left Arm';
        else if (mark.y > 350) loc = mark.x < 150 ? 'Right Leg' : 'Left Leg';
        
        if (loc.includes('Arm')) {
            if (mark.y > 280) loc += ' (Hand)';
            else if (mark.y > 220) loc += ' (ACF)';
        }

        setAccessLocation(`${loc} [${mark.subtype}]`);
        setAccessType(mark.subtype === 'IO' ? 'IO Access' : 'IV Cannula');
    };

    const toggleRoleCriteria = (criterion: string) => {
        const current = activeDraft?.treatments.role?.criteriaMet || [];
        const updated = current.includes(criterion) ? current.filter(c => c !== criterion) : [...current, criterion];
        
        handleNestedUpdate(['treatments', 'role'], {
            ...activeDraft?.treatments.role,
            criteriaMet: updated,
            verifiedBy: user?.name,
            timeVerified: new Date().toISOString()
        });
    };

    const updateRoleNotes = (notes: string) => {
        handleNestedUpdate(['treatments', 'role'], {
            ...activeDraft?.treatments.role,
            notes,
            verifiedBy: user?.name,
            timeVerified: new Date().toISOString()
        });
    };

    const updateRoleField = (field: string, value: any) => {
        handleNestedUpdate(['treatments', 'role', field], value);
    };

    const filteredDrugs = DRUG_DATABASE.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const existingAccess = activeDraft?.treatments.procedures.filter(p => 
        ['Cannulation', 'IV Cannula', 'IO Access', 'Intraosseous', 'Butterfly'].includes(p.type)
    ) || [];

    const existingProcs = activeDraft?.treatments.procedures.filter(p => 
        !['Cannulation', 'IV Cannula', 'IO Access', 'Intraosseous', 'Butterfly'].includes(p.type)
    ) || [];

    const ROLE_CRITERIA = [
        'Injuries incompatible with life',
        'Rigor Mortis',
        'Hypostasis',
        'Asystole > 20 mins despite ALS',
        'Valid DNACPR Present'
    ];

    const isWelfare = activeDraft?.mode === 'Welfare';

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                {isWelfare ? (
                    <button onClick={() => setSubTab('Welfare')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Welfare' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Welfare Checks</button>
                ) : (
                    <>
                        <button onClick={() => setSubTab('Drugs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Drugs' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Medication</button>
                        <button onClick={() => setSubTab('Access')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Access' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Vascular Access</button>
                        <button onClick={() => setSubTab('Procedures')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Procedures' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Procedures</button>
                        <button onClick={() => setSubTab('Resus')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'Resus' ? 'bg-red-600 text-white shadow' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}><HeartPulse className="w-4 h-4" /> ROLE / Cardiac</button>
                    </>
                )}
            </div>

            {subTab === 'Welfare' && (
                <div className="glass-panel p-6 rounded-2xl animate-in fade-in">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <HeartHandshake className="w-5 h-5 text-ams-blue" /> Welfare Interventions
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                        <button onClick={() => logWelfareAction('Given Water')} className="p-4 bg-blue-50 hover:bg-blue-100 rounded-xl text-blue-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-blue-100">
                            <Coffee className="w-6 h-6" /> Water Given
                        </button>
                        <button onClick={() => logWelfareAction('Given Food')} className="p-4 bg-amber-50 hover:bg-amber-100 rounded-xl text-amber-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-amber-100">
                            <Coffee className="w-6 h-6" /> Food Given
                        </button>
                        <button onClick={() => logWelfareAction('Friends Located')} className="p-4 bg-green-50 hover:bg-green-100 rounded-xl text-green-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-green-100">
                            <Users className="w-6 h-6" /> Friends Found
                        </button>
                        <button onClick={() => logWelfareAction('Taxi Arranged')} className="p-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-slate-200">
                            <Car className="w-6 h-6" /> Taxi Arranged
                        </button>
                        <button onClick={() => logWelfareAction('Phone Charged')} className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-purple-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-purple-100">
                            <Phone className="w-6 h-6" /> Phone Charged
                        </button>
                        <button onClick={() => logWelfareAction('Handed to City Angels')} className="p-4 bg-pink-50 hover:bg-pink-100 rounded-xl text-pink-700 font-bold text-sm flex flex-col items-center gap-2 transition-colors border border-pink-100">
                            <HeartHandshake className="w-6 h-6" /> City Angels
                        </button>
                    </div>

                    <h4 className="font-bold text-sm text-slate-500 mb-3 uppercase">Intervention Log</h4>
                    <div className="space-y-2">
                        {existingProcs.filter(p => p.type === 'Welfare Check').map((proc, i) => (
                            <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">{proc.details}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">{proc.time} • {proc.performedBy}</div>
                                </div>
                                <button onClick={() => handleRemoveProc(proc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {existingProcs.filter(p => p.type === 'Welfare Check').length === 0 && <p className="text-sm text-slate-400 italic text-center">No actions recorded.</p>}
                    </div>
                </div>
            )}

            {subTab === 'Access' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 w-full">Vascular Access Map</h3>
                        <BodyMap 
                            value={tempInjuries} 
                            onChange={setTempInjuries}
                            mode="intervention"
                            onMarkerSelect={handleMapMarkerSelect}
                            onImageChange={(dataUrl) => handleNestedUpdate(['accessMapImage'], dataUrl)}
                        />
                        <p className="text-xs text-slate-400 mt-2 text-center">Markers are confirmed only when you click "Confirm Access"</p>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                <Syringe className="w-5 h-5 text-blue-500" /> Log Access Device
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="input-label">Device Type</label>
                                    <select className="input-field" value={accessType} onChange={e => setAccessType(e.target.value)}>
                                        <option>IV Cannula</option>
                                        <option>IO Access</option>
                                        <option>Butterfly</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label">Size / Gauge</label>
                                    <select className="input-field" value={accessSize} onChange={e => setAccessSize(e.target.value)}>
                                        <option>22G (Blue)</option>
                                        <option>20G (Pink)</option>
                                        <option>18G (Green)</option>
                                        <option>16G (Grey)</option>
                                        <option>14G (Orange)</option>
                                        <option>IO Needle (Adult)</option>
                                        <option>IO Needle (Paed)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="input-label">Location</label>
                                    <div className="flex gap-2">
                                        <input 
                                            className="input-field" 
                                            placeholder="Tap Body Map or type..." 
                                            value={accessLocation} 
                                            onChange={e => setAccessLocation(e.target.value)} 
                                        />
                                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <MapPin className="w-5 h-5 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                                <button onClick={handleAddAccess} disabled={!accessLocation} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                                    Confirm Access
                                </button>
                            </div>
                        </div>

                        <div className="glass-panel p-6 rounded-2xl">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-4">Established Access</h3>
                            <div className="space-y-2">
                                {existingAccess.map((proc, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                                        <div>
                                            <div className="font-bold text-slate-800 dark:text-white text-sm">{proc.type} <span className="text-slate-500 font-normal">({proc.size})</span></div>
                                            <div className="text-xs text-slate-500 mt-0.5">{proc.site} • {proc.time}</div>
                                        </div>
                                        <button onClick={() => handleRemoveProc(proc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {existingAccess.length === 0 && <p className="text-sm text-slate-400 italic text-center">No access devices recorded.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'Procedures' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Add Procedure</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">Type</label>
                                <select className="input-field" value={procType} onChange={e => setProcType(e.target.value)}>
                                    <option>Splinting</option>
                                    <option>Wound Dressing</option>
                                    <option>Suture / Glue</option>
                                    <option>Airway (OPA/NPA/iGel)</option>
                                    <option>Spinal Immobilisation</option>
                                    <option>Pelvic Binder</option>
                                    <option>Nebuliser</option>
                                    <option>Manual Handling</option>
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Site / Details</label>
                                <input className="input-field" placeholder="e.g. Left Leg" value={procSite} onChange={e => setProcSite(e.target.value)} />
                            </div>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-white">
                                    <input type="checkbox" checked={procSuccess} onChange={e => setProcSuccess(e.target.checked)} className="w-4 h-4 rounded text-green-600" />
                                    Successful
                                </label>
                            </div>
                            <button onClick={handleAddProc} disabled={!procSite} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700">Record Procedure</button>
                        </div>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4">Procedure Log</h3>
                        <div className="space-y-2">
                            {existingProcs.filter(p => p.type !== 'Welfare Check').map((proc, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                                    <div>
                                        <div className="font-bold text-slate-800 dark:text-white text-sm">{proc.type}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">{proc.site} {proc.size && `(${proc.size})`} • {proc.time}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {!proc.success && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Failed</span>}
                                        <button onClick={() => handleRemoveProc(proc.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            ))}
                            {existingProcs.filter(p => p.type !== 'Welfare Check').length === 0 && <p className="text-sm text-slate-400 italic text-center">No procedures recorded.</p>}
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'Resus' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in">
                    {/* Cardiac History Column */}
                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <HeartPulse className="w-5 h-5 text-red-500" /> Cardiac Arrest History
                        </h3>
                        <div className="space-y-4">
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-700">
                                    <input type="checkbox" checked={activeDraft?.treatments.role?.arrestWitnessed} onChange={e => updateRoleField('arrestWitnessed', e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                    <span className="text-sm font-bold dark:text-white">Witnessed Arrest?</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 p-2 rounded-lg border dark:border-slate-700">
                                    <input type="checkbox" checked={activeDraft?.treatments.role?.bystanderCPR} onChange={e => updateRoleField('bystanderCPR', e.target.checked)} className="w-4 h-4 text-red-600 rounded" />
                                    <span className="text-sm font-bold dark:text-white">Bystander CPR?</span>
                                </label>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Est. Down Time (mins)</label>
                                    <input type="number" className="input-field" value={activeDraft?.treatments.role?.downTimeMinutes || ''} onChange={e => updateRoleField('downTimeMinutes', e.target.value)} />
                                </div>
                                <div>
                                    <label className="input-label">Initial Rhythm</label>
                                    <select className="input-field" value={activeDraft?.treatments.role?.initialRhythm || ''} onChange={e => updateRoleField('initialRhythm', e.target.value)}>
                                        <option value="">Unknown</option><option>VF</option><option>VT</option><option>PEA</option><option>Asystole</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="input-label">Total Shocks</label><input type="number" className="input-field" value={activeDraft?.treatments.role?.totalShocks || ''} onChange={e => updateRoleField('totalShocks', e.target.value)} /></div>
                                <div><label className="input-label">Total Adrenaline (mg)</label><input type="number" className="input-field" value={activeDraft?.treatments.role?.totalAdrenaline || ''} onChange={e => updateRoleField('totalAdrenaline', e.target.value)} /></div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="input-label">Airway Status</label>
                                    <select className="input-field" value={activeDraft?.treatments.role?.airwaySecured || ''} onChange={e => updateRoleField('airwaySecured', e.target.value)}>
                                        <option value="">None</option><option>OPA/NPA</option><option>iGel/SGA</option><option>ET Tube</option>
                                    </select>
                                </div>
                                <div className="flex items-end">
                                    <label className="flex items-center gap-2 cursor-pointer bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border dark:border-slate-700 w-full h-[46px]">
                                        <input type="checkbox" checked={activeDraft?.treatments.role?.lucasUsed} onChange={e => updateRoleField('lucasUsed', e.target.checked)} className="w-4 h-4 text-purple-600 rounded" />
                                        <span className="text-sm font-bold dark:text-white">Mech. CPR (LUCAS)</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROLE Column */}
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 p-6 rounded-r-xl">
                        <h3 className="text-red-900 dark:text-red-200 font-bold text-lg mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5" /> Recognition of Life Extinct (ROLE)
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">Select all criteria that apply to verify death.</p>
                        
                        <div className="space-y-2 mb-6">
                            {ROLE_CRITERIA.map(criterion => (
                                <label key={criterion} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-lg border border-red-100 dark:border-red-900/50 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-red-600 rounded"
                                        checked={activeDraft?.treatments.role?.criteriaMet.includes(criterion) || false}
                                        onChange={() => toggleRoleCriteria(criterion)}
                                    />
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">{criterion}</span>
                                </label>
                            ))}
                        </div>

                        <label className="input-label">Additional Notes / Circumstances</label>
                        <textarea 
                            className="input-field h-24 mb-4" 
                            placeholder="Describe circumstances of finding, position, rigor, etc."
                            value={activeDraft?.treatments.role?.notes || ''}
                            onChange={e => updateRoleNotes(e.target.value)}
                        />

                        {activeDraft?.treatments.role?.timeVerified && (
                            <div className="text-xs text-red-700 dark:text-red-300 font-bold bg-red-100 dark:bg-red-900/40 p-3 rounded-lg flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                Verified by {activeDraft.treatments.role.verifiedBy} at {new Date(activeDraft.treatments.role.timeVerified).toLocaleTimeString()}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {subTab === 'Drugs' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in">
                    {/* Input Form */}
                    <div className="glass-panel p-6 rounded-2xl lg:col-span-1 h-fit sticky top-4">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Pill className="w-5 h-5 text-purple-500" /> Administer Drug
                        </h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">Search Drug</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                    <input className="input-field pl-10" placeholder="e.g. Paracetamol" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                                {searchTerm && (
                                    <div className="mt-2 max-h-32 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                                        {filteredDrugs.map(d => (
                                            <div key={d.name} onClick={() => { setSelectedDrug(d.name); setSearchTerm(''); }} className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 cursor-pointer text-sm dark:text-white">
                                                {d.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {selectedDrug && (
                                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl border border-purple-100 dark:border-purple-800 text-purple-800 dark:text-purple-200 font-bold text-sm text-center">
                                    Selected: {selectedDrug}
                                </div>
                            )}

                            <div><label className="input-label">Dose</label><input className="input-field" placeholder="e.g. 1g" value={dose} onChange={e => setDose(e.target.value)} /></div>
                            <div><label className="input-label">Route</label><select className="input-field" value={route} onChange={e => setRoute(e.target.value)}><option value="">Select...</option><option>Oral (PO)</option><option>IV</option><option>IM</option><option>IO</option><option>Nebulised</option><option>Rectal (PR)</option><option>Topical</option></select></div>
                            <div><label className="input-label">Batch No.</label><input className="input-field" placeholder="Optional" value={batch} onChange={e => setBatch(e.target.value)} /></div>
                            
                            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="input-label mb-1">Witness (Optional/CDs)</label>
                                {witnessData ? (
                                    <div className="flex items-center justify-between text-xs font-bold text-green-600">
                                        <span>Confirmed: {witnessData.name}</span>
                                        <button onClick={() => setWitnessData(null)} className="text-red-500 hover:underline">Clear</button>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setShowWitnessModal(true)} 
                                        className="w-full py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 flex items-center justify-center gap-1 hover:bg-slate-50"
                                    >
                                        <Lock className="w-3 h-3" /> Verify Witness
                                    </button>
                                )}
                            </div>

                            <button onClick={handleAddDrug} disabled={!selectedDrug || !dose || !route} className="w-full py-3 bg-ams-blue text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50 transition-colors">Record Administration</button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        {activeDraft?.treatments.drugs.length === 0 && <div className="p-12 text-center text-slate-400 italic bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">No drugs administered yet.</div>}
                        {activeDraft?.treatments.drugs.map((drug, i) => (
                            <div key={i} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-lg">{drug.drugName} <span className="text-slate-500 dark:text-slate-400 text-sm font-normal">({drug.dose})</span></div>
                                    <div className="text-xs text-slate-500 flex gap-3 mt-1 flex-wrap">
                                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded font-bold">{drug.route}</span>
                                        <span>Time: {drug.time}</span>
                                        <span>By: {drug.administeredBy}</span>
                                        {drug.witnessedBy && <span className="text-purple-600 font-bold flex items-center gap-1"><Lock className="w-3 h-3" /> Witness: {drug.witnessedBy}</span>}
                                    </div>
                                </div>
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                                    <CheckCircle className="w-5 h-5" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {showWitnessModal && (
                <WitnessModal 
                    drugName={selectedDrug || "Medication"} 
                    onWitnessConfirmed={(name, uid) => { setWitnessData({ name, uid }); setShowWitnessModal(false); }}
                    onCancel={() => setShowWitnessModal(false)}
                />
            )}
        </div>
    );
};

export default TreatmentTab;
