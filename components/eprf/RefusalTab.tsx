
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { ShieldAlert, AlertTriangle, Users, PenTool, Lock } from 'lucide-react';
import SignaturePad from '../SignaturePad';
import SpeechTextArea from '../SpeechTextArea';

const RefusalTab = () => {
    const { activeDraft, handleNestedUpdate } = useEPRF();
    
    if (!activeDraft) return null;
    const refusal = activeDraft.governance.refusal;

    const update = (field: string, value: any) => handleNestedUpdate(['governance', 'refusal', field], value);

    const toggleRefusalType = (type: string) => {
        update('type', type);
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-20">
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 border-y border-r border-red-200 dark:border-red-900 rounded-xl">
                <h3 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                    <ShieldAlert className="w-6 h-6" /> Patient Refusal of Care
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300">
                    This form must be completed when a patient with capacity refuses advised assessment, treatment, or transport.
                </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
                <h4 className="font-bold text-slate-800 dark:text-white mb-4">What is being refused?</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
                    {['Conveyance', 'Treatment', 'Assessment', 'Medication', 'Other'].map(t => (
                        <button
                            key={t}
                            onClick={() => toggleRefusalType(t)}
                            className={`py-3 px-2 rounded-xl text-sm font-bold border transition-all ${
                                refusal.type === t
                                ? 'bg-red-600 text-white border-red-600 shadow-md transform scale-105'
                                : 'bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
                            }`}
                        >
                            {t}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <SpeechTextArea 
                        label="Details of Discussion"
                        placeholder="Document the conversation, advice given, risks explained, and patient's reason for refusal..."
                        className="input-field h-32 font-mono text-sm"
                        value={refusal.details}
                        onChange={e => update('details', e.target.value)}
                    />
                    
                    <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={refusal.risksExplained} onChange={e => update('risksExplained', e.target.checked)} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Risks Fully Explained</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={refusal.capacityConfirmed} onChange={e => update('capacityConfirmed', e.target.checked)} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Capacity Confirmed (MCA)</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={refusal.alternativesOffered} onChange={e => update('alternativesOffered', e.target.checked)} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Alternatives Offered</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={refusal.worseningAdviceGiven} onChange={e => update('worseningAdviceGiven', e.target.checked)} />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Worsening Advice Given</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Signatures (Same as before) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6 rounded-xl border-l-4 border-l-red-500">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-red-700 dark:text-red-300 flex items-center gap-2">
                            <PenTool className="w-5 h-5" /> Patient Declaration
                        </h4>
                        <label className="flex items-center gap-2 text-xs font-bold text-red-600 cursor-pointer bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded border border-red-200 dark:border-red-800">
                            <input type="checkbox" checked={refusal.patientRefusedToSign} onChange={e => update('patientRefusedToSign', e.target.checked)} className="rounded text-red-600 focus:ring-red-500" />
                            Refused to Sign
                        </label>
                    </div>
                    
                    {refusal.patientRefusedToSign ? (
                        <div className="h-40 bg-slate-100 dark:bg-slate-900 rounded-xl flex items-center justify-center border-2 border-dashed border-red-300 dark:border-red-800">
                            <span className="text-red-500 font-bold uppercase tracking-wider">Patient Refused Signature</span>
                        </div>
                    ) : (
                        <SignaturePad 
                            label="Patient Signature"
                            value={refusal.patientSignature}
                            timestamp={refusal.patientSigTime}
                            onSave={val => update('patientSignature', val)}
                            onTimestampChange={time => update('patientSigTime', time)}
                            required
                        />
                    )}
                    <p className="text-[10px] text-slate-400 mt-2 italic">I confirm I have understood the advice given and accept the risks of my decision.</p>
                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-ams-blue" /> Witness / Staff
                    </h4>
                    
                    <div className="mb-6">
                        <input 
                            className="input-field py-1.5 mb-2 text-sm" 
                            placeholder="Witness Name (e.g. Police Officer, Relative)" 
                            value={refusal.witnessName || ''}
                            onChange={e => update('witnessName', e.target.value)}
                        />
                        <SignaturePad 
                            label="Witness Signature"
                            value={refusal.witnessSignature}
                            timestamp={refusal.witnessSigTime}
                            onSave={val => update('witnessSignature', val)}
                            onTimestampChange={time => update('witnessSigTime', time)}
                        />
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                        <SignaturePad 
                            label="Clinician Signature (You)"
                            value={refusal.staffSignature}
                            timestamp={refusal.staffSigTime}
                            onSave={val => update('staffSignature', val)}
                            onTimestampChange={time => update('staffSigTime', time)}
                            required
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RefusalTab;