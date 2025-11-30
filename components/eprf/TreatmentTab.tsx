
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { DRUG_DATABASE } from '../../data/drugDatabase';
import { DrugAdministration, Procedure, ResusEvent, InjuryMark } from '../../types';
import { Pill, Syringe, Plus, Search, CheckCircle, HeartPulse, Zap, Clock, Activity, Play, Square, MapPin, Trash2, Lock } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import BodyMap from '../BodyMap';
import WitnessModal from '../WitnessModal';

const TreatmentTab = () => {
    const { activeDraft, addDrug, addProcedure, handleNestedUpdate } = useEPRF();
    const { user } = useAuth();
    const [subTab, setSubTab] = useState<'Drugs' | 'Access' | 'Procedures' | 'Resus'>('Drugs');
    
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
    const [procType, setProcType] = useState('Cannulation');
    const [procSite, setProcSite] = useState('');
    const [procSize, setProcSize] = useState('');
    const [procSuccess, setProcSuccess] = useState(true);
    const [procAttempts, setProcAttempts] = useState(1);

    // Access (Vascular) State
    const [accessType, setAccessType] = useState('IV Cannula');
    const [accessSize, setAccessSize] = useState('20G (Pink)');
    const [accessLocation, setAccessLocation] = useState(''); 

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
        addProcedure(procEntry);
        setAccessLocation('');
    };

    const logResusEvent = (action: string, type: ResusEvent['type']) => {
        const now = new Date();
        const event: ResusEvent = {
            id: Date.now().toString(),
            timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            action,
            type,
            user: user?.name || 'Clinician'
        };
        const currentLog = activeDraft?.treatments.resusLog || [];
        handleNestedUpdate(['treatments', 'resusLog'], [...currentLog, event]);
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

    const filteredDrugs = DRUG_DATABASE.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const existingAccess = activeDraft?.treatments.procedures.filter(p => 
        ['Cannulation', 'IV Cannula', 'IO Access', 'Intraosseous'].includes(p.type)
    ) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
                <button onClick={() => setSubTab('Drugs')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Drugs' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Medication</button>
                <button onClick={() => setSubTab('Access')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Access' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Vascular Access</button>
                <button onClick={() => setSubTab('Procedures')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${subTab === 'Procedures' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>Procedures</button>
                <button onClick={() => setSubTab('Resus')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${subTab === 'Resus' ? 'bg-red-600 text-white shadow' : 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'}`}><HeartPulse className="w-4 h-4" /> Cardiac Arrest</button>
            </div>

            {subTab === 'Access' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    <div className="glass-panel p-6 rounded-2xl flex flex-col items-center">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 w-full">Vascular Access Map</h3>
                        <BodyMap 
                            value={activeDraft?.injuries || []} 
                            onChange={vals => handleNestedUpdate(['injuries'], vals)}
                            mode="intervention"
                            onMarkerSelect={handleMapMarkerSelect}
                            onImageChange={(dataUrl) => handleNestedUpdate(['accessMapImage'], dataUrl)}
                        />
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
                                        <div className="p-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                                            <CheckCircle className="w-4 h-4" />
                                        </div>
                                    </div>
                                ))}
                                {existingAccess.length === 0 && <p className="text-sm text-slate-400 italic text-center">No access devices recorded.</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'Resus' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <button onClick={() => logResusEvent('Shock Delivered (200J)', 'Shock')} className="p-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-lg font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><Zap className="w-8 h-8" /> SHOCK</button>
                        <button onClick={() => logResusEvent('Adrenaline 1mg (1:10,000)', 'Drug')} className="p-6 bg-yellow-500 hover:bg-yellow-600 text-white rounded-2xl shadow-lg font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><Syringe className="w-8 h-8" /> ADRENALINE</button>
                        <button onClick={() => logResusEvent('Amiodarone 300mg', 'Drug')} className="p-6 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl shadow-lg font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><Pill className="w-8 h-8" /> AMIODARONE</button>
                        <button onClick={() => logResusEvent('Lucas Applied', 'Mechanical')} className="p-6 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-lg font-bold flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"><Activity className="w-8 h-8" /> LUCAS</button>
                        
                        <button onClick={() => logResusEvent('iGel / Airway Inserted', 'Airway')} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Airway Secured</button>
                        <button onClick={() => logResusEvent('Cannulation / IO', 'Procedure')} className="p-4 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Access Gained</button>
                        <button onClick={() => logResusEvent('ROSC Achieved', 'Status')} className="p-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 shadow-md">ROSC</button>
                        <button onClick={() => logResusEvent('Resus Ceased', 'Status')} className="p-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-black shadow-md">Cease Resus</button>
                    </div>

                    <div className="glass-panel p-6 rounded-2xl">
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-ams-blue" /> Event Log</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activeDraft?.treatments.resusLog?.slice().reverse().map((event, i) => (
                                <div key={i} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-sm font-bold text-slate-500 dark:text-slate-400">{event.timestamp}</span>
                                        <span className="font-bold text-slate-800 dark:text-white">{event.action}</span>
                                    </div>
                                    <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">{event.type}</span>
                                </div>
                            ))}
                            {(!activeDraft?.treatments.resusLog || activeDraft.treatments.resusLog.length === 0) && (
                                <p className="text-center text-slate-400 italic">No events logged.</p>
                            )}
                        </div>
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
