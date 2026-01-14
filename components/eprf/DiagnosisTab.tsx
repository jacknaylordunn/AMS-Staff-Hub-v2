
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Brain, Stethoscope, Signpost, MapPin, CheckCircle, XCircle } from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';
import { HOSPITAL_DATA, HospitalTrust, HospitalRegion, Hospital } from '../../data/hospitals';

const COMMON_IMPRESSIONS = [
    'Abdominal Pain', 'Allergic Reaction', 'Anxiety / Panic Attack', 'Asthma', 'Back Pain', 'Behavioural Disturbance', 'Cardiac Arrest', 'Cardiac Dysrhythmia', 'Chest Pain - Cardiac', 'Chest Pain - Non Cardiac', 'COPD Exacerbation', 'Diabetic - Hypoglycaemia', 'Diabetic - Hyperglycaemia', 'Fall < 2m', 'Fall > 2m', 'Head Injury', 'Intoxication - Alcohol', 'Intoxication - Drugs', 'Mental Health Crisis', 'Minor Injury', 'No Abnormality Detected', 'Overdose - Accidental', 'Overdose - Intentional', 'Pregnancy Related', 'Respiratory Infection', 'Seizure / Convulsion', 'Sepsis', 'Social / Welfare Problem', 'Stroke / TIA', 'Syncope / Collapse', 'Trauma - Limb', 'Unwell Adult', 'UTI', 'Wound / Laceration'
];

const DiagnosisTab = () => {
    const { activeDraft, handleNestedUpdate, updateDraft } = useEPRF();
    const [selectedTrust, setSelectedTrust] = useState<HospitalTrust | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<HospitalRegion | null>(null);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [regions, setRegions] = useState<HospitalRegion[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        if (activeDraft?.clinicalDecision?.destinationTrust) {
            const trust = HOSPITAL_DATA.find(t => t.name === activeDraft.clinicalDecision.destinationTrust);
            if (trust) {
                setSelectedTrust(trust);
                setRegions(trust.regions);
                
                if (activeDraft.clinicalDecision.destinationRegion) {
                    const region = trust.regions.find(r => r.name === activeDraft.clinicalDecision.destinationRegion);
                    if (region) {
                        setSelectedRegion(region);
                        setHospitals(region.hospitals);
                        if (activeDraft.clinicalDecision.destinationHospital) {
                            const hospital = region.hospitals.find(h => h.name === activeDraft.clinicalDecision.destinationHospital);
                            if (hospital) {
                                setSelectedHospital(hospital);
                                setDepartments(hospital.departments);
                            }
                        }
                    }
                }
            }
        }
    }, [activeDraft?.clinicalDecision?.destinationTrust, activeDraft?.clinicalDecision?.destinationRegion, activeDraft?.clinicalDecision?.destinationHospital]);

    if (!activeDraft) return null;

    const data = activeDraft.clinicalDecision || {
        workingImpression: '',
        differentialDiagnosis: '',
        managementPlan: '',
        finalDisposition: ''
    };

    const update = (field: string, value: any) => handleNestedUpdate(['clinicalDecision', field], value);

    const handleDispositionSelect = (disposition: string) => {
        const isRefusal = disposition === 'Refusal of Care against Advice';
        updateDraft({
            clinicalDecision: { ...activeDraft.clinicalDecision, finalDisposition: disposition },
            governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, isRefusal: isRefusal } }
        });
    };

    // Atomic Updates to prevent race conditions on reset
    const handleTrustChange = (trustName: string) => {
        const trust = HOSPITAL_DATA.find(t => t.name === trustName);
        setSelectedTrust(trust || null);
        setRegions(trust?.regions || []);
        
        // Reset children in state
        setSelectedRegion(null); setSelectedHospital(null); setHospitals([]); setDepartments([]);

        // Atomic DB Update
        updateDraft({
            clinicalDecision: {
                ...activeDraft.clinicalDecision,
                destinationTrust: trustName,
                destinationRegion: '',
                destinationHospital: '',
                destinationDepartment: ''
            }
        });
    };

    const handleRegionChange = (regionName: string) => {
        const region = regions.find(r => r.name === regionName);
        setSelectedRegion(region || null);
        setHospitals(region?.hospitals || []);
        
        // Reset children in state
        setSelectedHospital(null); setDepartments([]);

        // Atomic DB Update
        updateDraft({
            clinicalDecision: {
                ...activeDraft.clinicalDecision,
                destinationRegion: regionName,
                destinationHospital: '',
                destinationDepartment: ''
            }
        });
    };

    const handleHospitalChange = (hospName: string) => {
        const hospital = hospitals.find(h => h.name === hospName);
        setSelectedHospital(hospital || null);
        setDepartments(hospital?.departments || []);

        // Atomic DB Update
        updateDraft({
            clinicalDecision: {
                ...activeDraft.clinicalDecision,
                destinationHospital: hospName,
                destinationDepartment: ''
            }
        });
    };

    const isConveying = data.finalDisposition?.includes('Conveyed');
    const smallInputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm";

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-ams-blue" /> Diagnosis & Impression
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="input-label">Working Impression</label>
                        <input list="impressions" className="input-field font-bold py-1.5 h-8 text-sm" placeholder="Search..." value={data.workingImpression || ''} onChange={e => update('workingImpression', e.target.value)} />
                        <datalist id="impressions">{COMMON_IMPRESSIONS.map(imp => <option key={imp} value={imp} />)}</datalist>
                    </div>
                    <div>
                        <label className="input-label">Differential Diagnosis</label>
                        <textarea className="input-field py-1.5 px-3 text-sm h-8 resize-none" rows={1} placeholder="Alternatives..." value={data.differentialDiagnosis || ''} onChange={e => update('differentialDiagnosis', e.target.value)} />
                    </div>
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" /> Clinical Management Plan
                </h3>
                <SpeechTextArea label="Plan Narrative" className="input-field w-full h-48 font-mono text-sm leading-relaxed p-4" placeholder="Detail treatment plan..." value={data.managementPlan || ''} onChange={e => update('managementPlan', e.target.value)} />
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl relative z-10">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Signpost className="w-5 h-5 text-ams-blue" /> Final Disposition
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold uppercase text-xs rounded-t-xl border-b border-blue-200 dark:border-blue-800 flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Patient Conveyed</div>
                        <div className="bg-white dark:bg-slate-800 rounded-b-xl border border-t-0 border-blue-200 dark:border-blue-900/50 p-4 space-y-2">
                            {['Conveyed to Emergency Dept', 'Conveyed to Other Department', 'Patient Self-Conveyed to ED'].map(opt => (
                                <button key={opt} onClick={() => handleDispositionSelect(opt)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${data.finalDisposition === opt ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}><span className="font-bold text-sm">{opt}</span>{data.finalDisposition === opt && <CheckCircle className="w-5 h-5" />}</button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <div className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs rounded-t-xl border-b border-slate-300 dark:border-slate-700 flex items-center gap-2"><XCircle className="w-4 h-4" /> Patient Not Conveyed</div>
                        <div className="bg-white dark:bg-slate-800 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-700 p-4 space-y-2">
                            {[
                                'Treated & Discharged on Scene',
                                'Referred to Primary Care (GP)',
                                'Left at Home (Care Plan)',
                                'Patient Left Scene',
                                'No Patient Found',
                                'Refusal of Care against Advice',
                                'Deceased'
                            ].map(opt => (
                                <button key={opt} onClick={() => handleDispositionSelect(opt)} className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${data.finalDisposition === opt ? (opt.includes('Refusal') || opt.includes('Deceased') ? 'bg-red-600 text-white border-red-600' : 'bg-green-600 text-white border-green-600') : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'}`}><span className="font-bold text-sm">{opt}</span>{data.finalDisposition === opt && <CheckCircle className="w-5 h-5" />}</button>
                            ))}
                        </div>
                    </div>
                </div>

                {isConveying && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900 animate-in slide-in-from-top-2">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Destination Selection</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div><label className="input-label">Trust</label><select className={smallInputClass} value={data.destinationTrust || ''} onChange={e => handleTrustChange(e.target.value)}><option value="">-- Select --</option>{HOSPITAL_DATA.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}</select></div>
                            <div><label className="input-label">Region</label><select className={smallInputClass} value={data.destinationRegion || ''} onChange={e => handleRegionChange(e.target.value)} disabled={!selectedTrust}><option value="">-- Select --</option>{regions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}</select></div>
                            <div><label className="input-label">Hospital</label><select className={smallInputClass} value={data.destinationHospital || ''} onChange={e => handleHospitalChange(e.target.value)} disabled={!selectedRegion}><option value="">-- Select --</option>{hospitals.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}</select></div>
                            <div><label className="input-label">Department</label><select className={smallInputClass} value={data.destinationDepartment || ''} onChange={e => update('destinationDepartment', e.target.value)} disabled={!selectedHospital}><option value="">-- Select --</option>{departments.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiagnosisTab;
