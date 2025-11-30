
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { Brain, Stethoscope, Signpost, FileText } from 'lucide-react';

const COMMON_IMPRESSIONS = [
    'Abdominal Pain', 'Allergic Reaction', 'Asthma', 'Back Pain', 'Cardiac Arrest', 'Chest Pain - Cardiac', 'Chest Pain - Non Cardiac', 'COPD Exacerbation', 'Diabetic - Hypoglycaemia', 'Diabetic - Hyperglycaemia', 'Fall < 2m', 'Fall > 2m', 'Head Injury', 'Intoxication', 'Mental Health Crisis', 'Overdose', 'Seizure / Convulsion', 'Sepsis', 'Stroke / TIA', 'Syncope / Collapse', 'Trauma - Limb', 'Unwell Adult', 'UTI'
];

const DiagnosisTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
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

    const isConveying = data.finalDisposition?.toLowerCase().includes('conveyed') || 
                        data.finalDisposition?.toLowerCase().includes('referred to sdec');

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
                        <label className="input-label">Final Disposition</label>
                        <select 
                            className="input-field" 
                            value={data.finalDisposition} 
                            onChange={e => update('finalDisposition', e.target.value)}
                        >
                            <option value="">-- Select --</option>
                            <option>Treated & Discharged on Scene</option>
                            <option>Conveyed to Emergency Dept</option>
                            <option>Conveyed to Other Department</option>
                            <option>Referred to Primary Care (GP)</option>
                            <option>Referred to SDEC / Ambulatory</option>
                            <option>Left at Home (Care Plan)</option>
                            <option>Refusal of Care against Advice</option>
                            <option>Deceased</option>
                        </select>
                    </div>
                </div>

                <div className="mt-4">
                    <label className="input-label">Differential Diagnosis</label>
                    <textarea 
                        className="input-field" 
                        rows={2}
                        placeholder="List other potential causes considered..."
                        value={data.differentialDiagnosis}
                        onChange={e => update('differentialDiagnosis', e.target.value)}
                    />
                </div>
            </div>

            {/* Conveyance Details - Always show if disposition implies transport */}
            {isConveying && (
                <div className="glass-panel p-6 rounded-2xl animate-in slide-in-from-bottom-2 border-l-4 border-l-green-500">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Signpost className="w-5 h-5 text-green-600" /> Handoff Destination
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>
            )}

            {/* Management Plan */}
            <div className="glass-panel p-6 rounded-2xl border-l-4 border-l-purple-500">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" /> Clinical Management Plan
                </h3>
                <textarea 
                    className="input-field w-full h-64 font-mono text-sm leading-relaxed p-4"
                    placeholder="Detail your treatment plan, referrals made, and rationale for disposition..."
                    value={data.managementPlan}
                    onChange={e => update('managementPlan', e.target.value)}
                />
            </div>
        </div>
    );
};

export default DiagnosisTab;
