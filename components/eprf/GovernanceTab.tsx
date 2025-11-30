
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import SignaturePad from '../SignaturePad';
import { ShieldCheck, Info, Users, ShieldAlert, FileText, Sparkles, Loader2 } from 'lucide-react';
import { generateSafeguardingPDF } from '../../utils/pdfGenerator';
import { analyzeSafeguarding } from '../../services/geminiService';

const SAFETY_NETS = [
    { id: 'head', label: 'Head Injury', text: "Patient/Carer advised to seek immediate medical attention if: Persistent/worsening headache, vomiting (>2 episodes), confusion/drowsiness, visual disturbance, fluid from ears/nose, or seizure activity. Written advice leaflet provided." },
    { id: 'chest', label: 'Chest Pain', text: "Patient advised to call 999 immediately if chest pain returns, worsens, or radiates to jaw/arm, or if associated with breathlessness/sweating." },
    { id: 'wound', label: 'Wounds/Suture', text: "Keep wound dry and clean for 48hrs. Seek medical attention if signs of infection develop (increasing redness, heat, swelling, pus, offensive odour) or if sutures/glue fail." },
    { id: 'sepsis', label: 'Infection/Sepsis', text: "Monitor for signs of Sepsis: Slurred speech, Extreme shivering/muscle pain, Passing no urine (in a day), Severe breathlessness, 'I feel like I might die', Skin mottled or discoloured. Call 999 if these occur." },
    { id: 'abdo', label: 'Abdominal Pain', text: "Advised to re-contact 111/999 if pain becomes severe/unmanageable, blood in vomit/stool, or unable to pass urine." }
];

const GovernanceTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    const [analyzing, setAnalyzing] = useState(false);
    
    if (!activeDraft) return null;

    const addSafetyNet = (text: string) => {
        const current = activeDraft.governance.worseningAdviceDetails || '';
        const newText = current ? current + '\n\n' + text : text;
        handleNestedUpdate(['governance', 'worseningAdviceDetails'], newText);
    };

    const toggleSafeguardingType = (type: string) => {
        const currentTypes = activeDraft.governance.safeguarding.type || [];
        const newTypes = currentTypes.includes(type) 
            ? currentTypes.filter(t => t !== type)
            : [...currentTypes, type];
        handleNestedUpdate(['governance', 'safeguarding', 'type'], newTypes);
    };

    const handleAiScan = async () => {
        setAnalyzing(true);
        const narrative = `
            Complaint: ${activeDraft.history.presentingComplaint}
            History: ${activeDraft.history.historyOfPresentingComplaint}
            Exam: ${activeDraft.assessment.clinicalNarrative}
        `;
        const result = await analyzeSafeguarding(narrative);
        if (result.detected) {
            handleNestedUpdate(['governance', 'safeguarding', 'concerns'], true);
            if (result.type) toggleSafeguardingType(result.type);
            handleNestedUpdate(['governance', 'safeguarding', 'details'], (activeDraft.governance.safeguarding.details || '') + `\n[AI FLAG]: ${result.reasoning}`);
            alert(`Potential Safeguarding Risk Detected:\n${result.reasoning}`);
        } else {
            alert("No obvious safeguarding triggers found in narrative. Clinical judgement remains paramount.");
        }
        setAnalyzing(false);
    };

    return (
        <div className="glass-panel p-6 rounded-2xl space-y-6 animate-in fade-in">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Legal & Governance</h3>
            
            {/* Safeguarding Section */}
            <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-xl border-l-4 border-l-red-600 border-y border-r border-red-200 dark:border-red-800/50">
                <div className="flex justify-between items-start mb-4">
                    <h4 className="font-bold text-lg text-red-900 dark:text-red-200 flex items-center gap-2">
                        <ShieldAlert className="w-6 h-6" /> Safeguarding
                    </h4>
                    <div className="flex gap-3 items-center">
                        <button 
                            onClick={handleAiScan}
                            disabled={analyzing}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 rounded-lg text-xs font-bold hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                        >
                            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI Risk Scan
                        </button>
                        <label className="flex items-center gap-3 font-bold text-red-800 dark:text-red-300 cursor-pointer text-lg bg-white dark:bg-slate-900 px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 shadow-sm">
                            <input 
                                type="checkbox" 
                                className="w-5 h-5 text-red-600 rounded"
                                checked={activeDraft.governance.safeguarding.concerns}
                                onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'concerns'], e.target.checked)}
                            />
                            Concerns Raised
                        </label>
                    </div>
                </div>

                {activeDraft.governance.safeguarding.concerns && (
                    <div className="space-y-4 animate-in fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="input-label mb-2">Subject Category</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                        <input type="radio" name="sg_cat" className="text-red-600" checked={activeDraft.governance.safeguarding.category === 'Child'} onChange={() => handleNestedUpdate(['governance', 'safeguarding', 'category'], 'Child')} />
                                        <span className="font-bold text-sm dark:text-white">Child</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-red-100 dark:border-red-900">
                                        <input type="radio" name="sg_cat" className="text-red-600" checked={activeDraft.governance.safeguarding.category === 'Adult at Risk'} onChange={() => handleNestedUpdate(['governance', 'safeguarding', 'category'], 'Adult at Risk')} />
                                        <span className="font-bold text-sm dark:text-white">Adult at Risk</span>
                                    </label>
                                </div>
                            </div>
                            
                            <div>
                                <label className="input-label mb-2">Nature of Concern</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Physical', 'Sexual', 'Emotional', 'Neglect', 'Financial', 'Domestic Abuse', 'Modern Slavery', 'Radicalisation'].map(t => (
                                        <button 
                                            key={t}
                                            onClick={() => toggleSafeguardingType(t)}
                                            className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${activeDraft.governance.safeguarding.type?.includes(t) ? 'bg-red-600 text-white border-red-600' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-red-200 dark:border-red-800'}`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="input-label">Details / Cause for Concern</label>
                            <textarea 
                                className="input-field h-32"
                                placeholder="Describe observations, disclosures, and specific reasons for concern..."
                                value={activeDraft.governance.safeguarding.details}
                                onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'details'], e.target.value)}
                            />
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={() => generateSafeguardingPDF(activeDraft)}
                                className="flex items-center gap-2 px-6 py-3 bg-red-700 hover:bg-red-800 text-white font-bold rounded-xl shadow-lg transition-colors"
                            >
                                <FileText className="w-5 h-5" /> Generate Referral PDF
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Capacity */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm text-slate-700 dark:text-slate-200 mb-3">Mental Capacity Act</h4>
                <div className="flex gap-4 mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="capacity"
                            checked={activeDraft.governance.capacity.status === 'Capacity Present'}
                            onChange={() => handleNestedUpdate(['governance', 'capacity', 'status'], 'Capacity Present')}
                            className="text-ams-blue"
                        />
                        <span className="text-sm font-medium dark:text-white">Capacity Present</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                            type="radio" 
                            name="capacity"
                            checked={activeDraft.governance.capacity.status === 'Capacity Lacking'}
                            onChange={() => handleNestedUpdate(['governance', 'capacity', 'status'], 'Capacity Lacking')}
                            className="text-ams-blue"
                        />
                        <span className="text-sm font-medium dark:text-white">Capacity Lacking</span>
                    </label>
                </div>
                
                {activeDraft.governance.capacity.status === 'Capacity Lacking' && (
                    <div className="space-y-2 pl-4 border-l-2 border-red-200 animate-in slide-in-from-top-2">
                        <p className="text-xs font-bold text-slate-500 uppercase">Functional Test (Stage 2)</p>
                        {['understand', 'retain', 'weigh', 'communicate'].map(item => (
                            <label key={item} className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={(activeDraft.governance.capacity.stage2Functional as any)[item]}
                                    onChange={e => handleNestedUpdate(['governance', 'capacity', 'stage2Functional', item], e.target.checked)}
                                    className="text-red-500 rounded"
                                />
                                <span className="text-sm capitalize dark:text-slate-300">Can {item} information?</span>
                            </label>
                        ))}
                        <textarea 
                            className="input-field mt-2" 
                            placeholder="Rationale for Best Interests decision..."
                            rows={2}
                            value={activeDraft.governance.capacity.bestInterestsRationale || ''}
                            onChange={e => handleNestedUpdate(['governance', 'capacity', 'bestInterestsRationale'], e.target.value)}
                        />
                    </div>
                )}
            </div>

            {/* Discharge & Safety Netting */}
            <div className="space-y-4">
                <label className="input-label">Final Disposition</label>
                <select 
                    className="input-field" 
                    value={activeDraft.governance.discharge || ''} 
                    onChange={e => {
                        handleNestedUpdate(['governance', 'discharge'], e.target.value);
                        if (e.target.value === 'Refusal of Care') {
                            handleNestedUpdate(['governance', 'refusal', 'isRefusal'], true);
                        } else {
                            handleNestedUpdate(['governance', 'refusal', 'isRefusal'], false);
                        }
                    }}
                >
                    <option value="">-- Select Outcome --</option>
                    <option>Conveyed to ED</option>
                    <option>Referred to GP/OOH</option>
                    <option>Discharged on Scene</option>
                    <option>Refusal of Care</option>
                </select>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h4 className="font-bold text-sm text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Safety Netting Library</h4>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {SAFETY_NETS.map(sn => (
                            <button 
                                key={sn.id}
                                onClick={() => addSafetyNet(sn.text)}
                                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors"
                            >
                                + {sn.label}
                            </button>
                        ))}
                    </div>
                    <label className="input-label">Specific Advice Given</label>
                    <textarea 
                        className="input-field"
                        rows={4}
                        placeholder="Worsening advice and safety netting details..."
                        value={activeDraft.governance.worseningAdviceDetails || ''}
                        onChange={e => handleNestedUpdate(['governance', 'worseningAdviceDetails'], e.target.value)}
                    />
                </div>
                
                {activeDraft.governance.refusal.isRefusal && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl space-y-6 animate-in fade-in">
                        <div>
                            <h4 className="font-bold text-red-800 dark:text-red-300 flex items-center gap-2 mb-3">Refusal Checklist</h4>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-100 font-medium cursor-pointer">
                                    <input type="checkbox" className="text-red-600 rounded w-5 h-5" checked={activeDraft.governance.refusal.risksExplained} onChange={e => handleNestedUpdate(['governance', 'refusal', 'risksExplained'], e.target.checked)} />
                                    Risks of refusal explained fully
                                </label>
                                <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-100 font-medium cursor-pointer">
                                    <input type="checkbox" className="text-red-600 rounded w-5 h-5" checked={activeDraft.governance.refusal.capacityConfirmed} onChange={e => handleNestedUpdate(['governance', 'refusal', 'capacityConfirmed'], e.target.checked)} />
                                    Capacity to refuse confirmed
                                </label>
                                <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-100 font-medium cursor-pointer">
                                    <input type="checkbox" className="text-red-600 rounded w-5 h-5" checked={activeDraft.governance.refusal.alternativesOffered} onChange={e => handleNestedUpdate(['governance', 'refusal', 'alternativesOffered'], e.target.checked)} />
                                    Alternative care options offered
                                </label>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h5 className="text-xs font-bold uppercase text-red-700 dark:text-red-400 mb-2">Patient</h5>
                                <SignaturePad 
                                    label="Patient Signature" 
                                    value={activeDraft.governance.refusal.patientSignature} 
                                    onSave={val => handleNestedUpdate(['governance', 'refusal', 'patientSignature'], val)} 
                                />
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-red-100 dark:border-red-900/30">
                                <h5 className="text-xs font-bold uppercase text-red-700 dark:text-red-400 mb-2 flex items-center gap-2"><Users className="w-3 h-3" /> Witness</h5>
                                <input 
                                    className="input-field mb-3 text-sm"
                                    placeholder="Witness Name (e.g. Police/Relative)"
                                    value={activeDraft.governance.refusal.witnessName || ''}
                                    onChange={e => handleNestedUpdate(['governance', 'refusal', 'witnessName'], e.target.value)}
                                />
                                <SignaturePad 
                                    label="Witness Signature" 
                                    value={activeDraft.governance.refusal.witnessSignature} 
                                    onSave={val => handleNestedUpdate(['governance', 'refusal', 'witnessSignature'], val)} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GovernanceTab;
