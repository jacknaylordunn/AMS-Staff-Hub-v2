
import React, { useState, useEffect } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Brain, Stethoscope, Signpost, MapPin, Building, Mail, Send, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';
import { HOSPITAL_DATA, HospitalTrust, HospitalRegion, Hospital } from '../../data/hospitals';

const COMMON_IMPRESSIONS = [
    'Abdominal Pain', 'Allergic Reaction', 'Asthma', 'Back Pain', 'Cardiac Arrest', 'Chest Pain - Cardiac', 'Chest Pain - Non Cardiac', 'COPD Exacerbation', 'Diabetic - Hypoglycaemia', 'Diabetic - Hyperglycaemia', 'Fall < 2m', 'Fall > 2m', 'Head Injury', 'Intoxication', 'Mental Health Crisis', 'Overdose', 'Seizure / Convulsion', 'Sepsis', 'Stroke / TIA', 'Syncope / Collapse', 'Trauma - Limb', 'Unwell Adult', 'UTI'
];

const DiagnosisTab = () => {
    const { activeDraft, handleNestedUpdate, updateDraft } = useEPRF();
    
    // Local state for cascading dropdowns
    const [selectedTrust, setSelectedTrust] = useState<HospitalTrust | null>(null);
    const [selectedRegion, setSelectedRegion] = useState<HospitalRegion | null>(null);
    const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
    const [regions, setRegions] = useState<HospitalRegion[]>([]);
    const [hospitals, setHospitals] = useState<Hospital[]>([]);
    const [departments, setDepartments] = useState<string[]>([]);

    useEffect(() => {
        // Initialize dropdowns based on saved data if available
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
    }, [activeDraft]);

    if (!activeDraft) return null;

    const data = activeDraft.clinicalDecision || {
        workingImpression: '',
        differentialDiagnosis: '',
        managementPlan: '',
        finalDisposition: ''
    };

    const update = (field: string, value: any) => {
        handleNestedUpdate(['clinicalDecision', field], value);
    };

    const handleDispositionSelect = (disposition: string) => {
        // Atomic update to prevent race conditions
        const isRefusal = disposition === 'Refusal of Care against Advice';
        
        updateDraft({
            clinicalDecision: {
                ...activeDraft.clinicalDecision,
                finalDisposition: disposition
            },
            governance: {
                ...activeDraft.governance,
                refusal: {
                    ...activeDraft.governance.refusal,
                    isRefusal: isRefusal
                }
            }
        });
    };

    const handleTrustChange = (trustName: string) => {
        update('destinationTrust', trustName);
        const trust = HOSPITAL_DATA.find(t => t.name === trustName);
        setSelectedTrust(trust || null);
        setRegions(trust?.regions || []);
        
        // Reset children
        update('destinationRegion', '');
        update('destinationHospital', '');
        update('destinationDepartment', '');
        setSelectedRegion(null);
        setSelectedHospital(null);
        setHospitals([]);
        setDepartments([]);
    };

    const handleRegionChange = (regionName: string) => {
        update('destinationRegion', regionName);
        const region = regions.find(r => r.name === regionName);
        setSelectedRegion(region || null);
        setHospitals(region?.hospitals || []);
        
        // Reset children
        update('destinationHospital', '');
        update('destinationDepartment', '');
        setSelectedHospital(null);
        setDepartments([]);
    };

    const handleHospitalChange = (hospName: string) => {
        update('destinationHospital', hospName);
        const hospital = hospitals.find(h => h.name === hospName);
        setSelectedHospital(hospital || null);
        setDepartments(hospital?.departments || []);
        
        // Reset child
        update('destinationDepartment', '');
    };

    const isConveying = data.finalDisposition?.includes('Conveyed');
    const isGP = data.finalDisposition === 'Referred to Primary Care (GP)';

    const emailSubject = `GP Referral - ${activeDraft.incidentNumber} - ${activeDraft.patient.lastName}`;
    const emailBody = `Please find attached the clinical referral for patient: ${activeDraft.patient.firstName} ${activeDraft.patient.lastName} (DOB: ${activeDraft.patient.dob}).%0D%0A%0D%0AReferral Reason: ${activeDraft.clinicalDecision.workingImpression}`;

    // Common input style class for reduced height
    const smallInputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm";

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            {/* Diagnosis Section */}
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-ams-blue" /> Diagnosis & Impression
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="input-label">Working Impression</label>
                        <div className="relative">
                            <input 
                                list="impressions"
                                className="input-field font-bold text-slate-700 dark:text-white py-1.5 h-8 text-sm"
                                placeholder="Search clinical codes..."
                                value={data.workingImpression || ''}
                                onChange={e => update('workingImpression', e.target.value)}
                            />
                            <datalist id="impressions">
                                {COMMON_IMPRESSIONS.map(imp => <option key={imp} value={imp} />)}
                            </datalist>
                        </div>
                    </div>
                    
                    <div>
                        <label className="input-label">Differential Diagnosis</label>
                        <textarea 
                            className="input-field py-1.5 px-3 text-sm h-8 resize-none" 
                            rows={1}
                            placeholder="List other potential causes considered..."
                            value={data.differentialDiagnosis || ''}
                            onChange={e => update('differentialDiagnosis', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Management Plan */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" /> Clinical Management Plan
                </h3>
                <SpeechTextArea 
                    label="Plan Narrative"
                    className="input-field w-full h-48 font-mono text-sm leading-relaxed p-4"
                    placeholder="Detail your treatment plan, referrals made, and rationale for disposition..."
                    value={data.managementPlan || ''}
                    onChange={e => update('managementPlan', e.target.value)}
                />
            </div>

            {/* Final Disposition Selection - Split UI */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl relative z-10">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                    <Signpost className="w-5 h-5 text-ams-blue" /> Final Disposition
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Conveyed Block */}
                    <div className="flex flex-col gap-3">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 font-bold uppercase text-xs rounded-t-xl border-b border-blue-200 dark:border-blue-800 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" /> Patient Conveyed
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-b-xl border border-t-0 border-blue-200 dark:border-blue-900/50 p-4 space-y-2">
                            {[
                                'Conveyed to Emergency Dept',
                                'Conveyed to Other Department'
                            ].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => handleDispositionSelect(opt)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                                        data.finalDisposition === opt 
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]' 
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                                    }`}
                                >
                                    <span className="font-bold text-sm">{opt}</span>
                                    {data.finalDisposition === opt && <CheckCircle className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Non-Conveyed Block */}
                    <div className="flex flex-col gap-3">
                        <div className="p-3 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-xs rounded-t-xl border-b border-slate-300 dark:border-slate-700 flex items-center gap-2">
                            <XCircle className="w-4 h-4" /> Patient Not Conveyed
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-b-xl border border-t-0 border-slate-200 dark:border-slate-700 p-4 space-y-2">
                            {[
                                'Treated & Discharged on Scene',
                                'Referred to Primary Care (GP)',
                                'Left at Home (Care Plan)',
                                'Refusal of Care against Advice',
                                'Deceased'
                            ].map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => handleDispositionSelect(opt)}
                                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between group ${
                                        data.finalDisposition === opt 
                                        ? opt.includes('Refusal') || opt.includes('Deceased') ? 'bg-red-600 text-white border-red-600 shadow-md' : 'bg-green-600 text-white border-green-600 shadow-md'
                                        : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                                    }`}
                                >
                                    <span className="font-bold text-sm">{opt}</span>
                                    {data.finalDisposition === opt && <CheckCircle className="w-5 h-5" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Conveyance - Cascading Dropdowns */}
                {isConveying && (
                    <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-900 animate-in slide-in-from-top-2">
                        <h4 className="text-sm font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Destination Selection
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="input-label">Trust / Service</label>
                                <select className={smallInputClass} value={data.destinationTrust || ''} onChange={e => handleTrustChange(e.target.value)}>
                                    <option value="">-- Select Trust --</option>
                                    {HOSPITAL_DATA.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Region / County</label>
                                <select className={smallInputClass} value={data.destinationRegion || ''} onChange={e => handleRegionChange(e.target.value)} disabled={!selectedTrust}>
                                    <option value="">-- Select Region --</option>
                                    {regions.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Hospital</label>
                                <select className={smallInputClass} value={data.destinationHospital || ''} onChange={e => handleHospitalChange(e.target.value)} disabled={!selectedRegion}>
                                    <option value="">-- Select Hospital --</option>
                                    {hospitals.map(h => <option key={h.name} value={h.name}>{h.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Department</label>
                                <select className={smallInputClass} value={data.destinationDepartment || ''} onChange={e => update('destinationDepartment', e.target.value)} disabled={!selectedHospital}>
                                    <option value="">-- Select Dept --</option>
                                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* GP Referral Specifics */}
                {isGP && (
                    <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 animate-in slide-in-from-top-2">
                        <div className="flex justify-between items-start mb-4">
                            <h4 className="text-sm font-bold text-green-800 dark:text-green-300 uppercase flex items-center gap-2">
                                <Building className="w-4 h-4" /> GP Referral Details
                            </h4>
                            <a 
                                href={`mailto:GP@aegismedicalsolutions.co.uk?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                                className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                            >
                                <Send className="w-3 h-3" /> Email Referral
                            </a>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="input-label text-green-800 dark:text-green-200">Practice Name</label>
                                <input className={smallInputClass} placeholder="e.g. High Street Surgery" value={data.gpPractice || ''} onChange={e => update('gpPractice', e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label text-green-800 dark:text-green-200">GP Name</label>
                                <input className={smallInputClass} placeholder="e.g. Dr Smith" value={data.gpName || ''} onChange={e => update('gpName', e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label text-green-800 dark:text-green-200">Call Time</label>
                                <input type="time" className={smallInputClass} value={data.gpCallTime || ''} onChange={e => update('gpCallTime', e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label text-green-800 dark:text-green-200">Booking Ref (if applicable)</label>
                                <input className={smallInputClass} placeholder="e.g. APPT-123" value={data.gpRefNumber || ''} onChange={e => update('gpRefNumber', e.target.value)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiagnosisTab;
