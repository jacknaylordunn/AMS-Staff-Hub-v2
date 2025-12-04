
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Brain, Stethoscope, Signpost, ArrowRight, ShieldAlert, LogOut, X } from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';

const COMMON_IMPRESSIONS = [
    'Abdominal Pain', 'Allergic Reaction', 'Asthma', 'Back Pain', 'Cardiac Arrest', 'Chest Pain - Cardiac', 'Chest Pain - Non Cardiac', 'COPD Exacerbation', 'Diabetic - Hypoglycaemia', 'Diabetic - Hyperglycaemia', 'Fall < 2m', 'Fall > 2m', 'Head Injury', 'Intoxication', 'Mental Health Crisis', 'Overdose', 'Seizure / Convulsion', 'Sepsis', 'Stroke / TIA', 'Syncope / Collapse', 'Trauma - Limb', 'Unwell Adult', 'UTI'
];

const DiagnosisTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    if (!activeDraft) return null;

    // Ensure safe access to clinicalDecision object
    const data = activeDraft.clinicalDecision || {
        workingImpression: '',
        differentialDiagnosis: '',
        managementPlan: '',
        finalDisposition: ''
    };

    const update = (field: string, value: any) => {
        handleNestedUpdate(['clinicalDecision', field], value);
        
        // Sync special dispositions to governance flags
        if (field === 'finalDisposition') {
            const isRefusal = value === 'Refusal of Care against Advice';
            // Explicitly set true OR false to ensure state doesn't get stuck
            handleNestedUpdate(['governance', 'refusal', 'isRefusal'], isRefusal);
        }
    };

    const clearDisposition = () => {
        update('finalDisposition', '');
        handleNestedUpdate(['governance', 'refusal', 'isRefusal'], false);
    };

    const isConveying = data.finalDisposition?.toLowerCase().includes('conveyed') || 
                        data.finalDisposition?.toLowerCase().includes('referred to sdec');
    
    const isRefusal = data.finalDisposition === 'Refusal of Care against Advice';
    
    // Check if outcome implies discharge/non-conveyance
    const isDischarged = data.finalDisposition && !isConveying && !isRefusal && data.finalDisposition !== 'Deceased';

    return (
        <div className="space-y-6 animate-in fade-in">
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
                                className="input-field font-bold text-slate-700 dark:text-white"
                                placeholder="Search clinical codes..."
                                value={data.workingImpression}
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
                            className="input-field" 
                            rows={1}
                            placeholder="List other potential causes considered..."
                            value={data.differentialDiagnosis}
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
                    value={data.managementPlan}
                    onChange={e => update('managementPlan', e.target.value)}
                />
            </div>

            {/* Final Disposition Card */}
            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Signpost className="w-5 h-5 text-ams-blue" /> Final Disposition
                </h3>
                
                <div className="relative">
                    <select 
                        className="input-field text-lg font-bold py-3 pr-10" 
                        value={data.finalDisposition || ''} 
                        onChange={e => update('finalDisposition', e.target.value)}
                    >
                        <option value="">-- Select Outcome --</option>
                        <option value="Conveyed to Emergency Dept">Conveyed to Emergency Dept</option>
                        <option value="Conveyed to Other Department">Conveyed to Other Department</option>
                        <option value="Referred to SDEC / Ambulatory">Referred to SDEC / Ambulatory</option>
                        <option value="Referred to Primary Care (GP)">Referred to Primary Care (GP)</option>
                        <option value="Treated & Discharged on Scene">Treated & Discharged on Scene</option>
                        <option value="Left at Home (Care Plan)">Left at Home (Care Plan)</option>
                        <option value="Refusal of Care against Advice">Refusal of Care against Advice</option>
                        <option value="Deceased">Deceased</option>
                    </select>
                    {data.finalDisposition && (
                        <button 
                            onClick={clearDisposition} 
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
                            title="Clear Selection"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                {/* Dynamic Sections based on Disposition */}
                {isConveying && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="input-label">Receiving Hospital</label>
                            <input 
                                className="input-field"
                                value={data.destinationLocation || ''}
                                onChange={e => update('destinationLocation', e.target.value)}
                                placeholder="e.g. Royal Berkshire Hospital"
                            />
                        </div>
                        <div>
                            <label className="input-label">Department / Ward</label>
                            <input 
                                className="input-field"
                                value={data.receivingUnit || ''}
                                onChange={e => update('receivingUnit', e.target.value)}
                                placeholder="e.g. Resus, Majors, CDU, Paeds"
                            />
                        </div>
                    </div>
                )}

                {isRefusal && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ShieldAlert className="w-8 h-8 text-red-600" />
                            <div>
                                <h4 className="font-bold text-red-800 dark:text-red-200">Refusal of Care</h4>
                                <p className="text-xs text-red-700 dark:text-red-300">You must complete the Capacity Assessment and capture signatures in the Governance tab.</p>
                            </div>
                        </div>
                    </div>
                )}

                {isDischarged && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800 mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LogOut className="w-8 h-8 text-blue-600" />
                            <div>
                                <h4 className="font-bold text-blue-800 dark:text-blue-200">Patient Discharged</h4>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Ensure robust Safety Netting advice is recorded in the Governance tab.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DiagnosisTab;
