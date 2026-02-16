
import React from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { FileText, ClipboardList, Plus, Home, Users } from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';

const COMMON_ALLERGIES = ['NKDA', 'Penicillin', 'Latex', 'Nuts', 'Codeine', 'Morphine'];
const COMMON_PMH = ['Hypertension', 'T2 Diabetes', 'Asthma', 'COPD', 'IHD', 'Stroke', 'Anxiety', 'Depression', 'Nil Significant'];

const HistoryTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    if (!activeDraft) return null;

    const update = (field: string, value: any) => handleNestedUpdate(['history', field], value);
    const updateSample = (field: string, value: any) => handleNestedUpdate(['history', 'sample', field], value);

    const appendText = (field: string, text: string) => {
        const current = (activeDraft.history as any)[field] || '';
        const newValue = current ? `${current}, ${text}` : text;
        update(field, newValue);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            {/* Presenting Complaint */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-ams-blue" /> Presenting Complaint
                </h3>
                <div className="space-y-4">
                    <div>
                        <label className="input-label">Primary Complaint (PC)</label>
                        <input 
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            placeholder="e.g. Chest Pain, Fall, Shortness of Breath"
                            value={activeDraft.history.presentingComplaint}
                            onChange={e => update('presentingComplaint', e.target.value)}
                        />
                    </div>
                    <div>
                        <SpeechTextArea 
                            label="History of Presenting Complaint (HPC)"
                            rows={6}
                            className="text-sm py-2 px-3"
                            placeholder="Detailed narrative of the event..."
                            value={activeDraft.history.historyOfPresentingComplaint}
                            onChange={e => update('historyOfPresentingComplaint', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* SAMPLE History */}
            <div className="glass-panel p-4 rounded-xl border-l-4 border-l-purple-500">
                <h3 className="font-bold text-base text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-purple-600" /> SAMPLE History
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="input-label">S - Signs & Symptoms</label>
                        <textarea 
                            className="input-field py-1.5 px-3 text-sm" rows={2} 
                            placeholder="What happened? Pain? Nausea? Dizziness?"
                            value={activeDraft.history.sample?.symptoms || ''}
                            onChange={e => updateSample('symptoms', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="input-label">A - Allergies</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {COMMON_ALLERGIES.map(a => (
                                <button key={a} onClick={() => appendText('allergies', a)} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                                    + {a}
                                </button>
                            ))}
                        </div>
                        <input 
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            placeholder="Allergies (leave blank if none known)"
                            value={activeDraft.history.allergies}
                            onChange={e => update('allergies', e.target.value)}
                        />
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="input-label mb-0">M - Medications</label>
                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                <input 
                                    type="checkbox" 
                                    className="w-3 h-3 rounded"
                                    checked={activeDraft.history.sample?.medsTakenToHospital || false}
                                    onChange={e => updateSample('medsTakenToHospital', e.target.checked)}
                                />
                                Taken to Hospital?
                            </label>
                        </div>
                        <textarea 
                            className="input-field py-1.5 px-3 text-sm" rows={2}
                            placeholder="Current meds / Dosette box"
                            value={activeDraft.history.medications}
                            onChange={e => update('medications', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="input-label">P - Past Medical History</label>
                        <div className="flex flex-wrap gap-1 mb-2">
                            {COMMON_PMH.map(p => (
                                <button key={p} onClick={() => appendText('pastMedicalHistory', p)} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600">
                                    + {p}
                                </button>
                            ))}
                        </div>
                        <textarea 
                            className="input-field py-1.5 px-3 text-sm" rows={2}
                            placeholder="Relevant conditions, surgeries"
                            value={activeDraft.history.pastMedicalHistory}
                            onChange={e => update('pastMedicalHistory', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="input-label">L - Last Oral Intake</label>
                        <input 
                            className="input-field py-1.5 px-3 text-sm h-8" 
                            placeholder="Time / Content of last meal/drink"
                            value={activeDraft.history.sample?.lastOralIntake || ''}
                            onChange={e => updateSample('lastOralIntake', e.target.value)}
                        />
                    </div>
                    <div className="md:col-span-2">
                        <label className="input-label">E - Events Leading Up</label>
                        <textarea 
                            className="input-field py-1.5 px-3 text-sm" rows={2}
                            placeholder="What were they doing prior to onset?"
                            value={activeDraft.history.sample?.eventsPrior || ''}
                            onChange={e => updateSample('eventsPrior', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Social & Family History */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-4 rounded-xl">
                    <h3 className="font-bold text-base text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Home className="w-4 h-4 text-green-600" /> Social History
                    </h3>
                    <SpeechTextArea 
                        label="Lifestyle & Context"
                        rows={3}
                        className="text-sm"
                        placeholder="e.g. Lives alone, Warden assisted, Smoker (20/day), ETOH intake..."
                        value={activeDraft.history.socialHistory || ''}
                        onChange={e => update('socialHistory', e.target.value)}
                    />
                </div>
                <div className="glass-panel p-4 rounded-xl">
                    <h3 className="font-bold text-base text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-orange-600" /> Family History
                    </h3>
                    <SpeechTextArea 
                        label="Relevant FHx"
                        rows={3}
                        className="text-sm"
                        placeholder="e.g. Father MI < 50, Mother Stroke..."
                        value={activeDraft.history.familyHistory || ''}
                        onChange={e => update('familyHistory', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default HistoryTab;
