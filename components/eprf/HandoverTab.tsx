
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import SignaturePad from '../SignaturePad';
import SpeechTextArea from '../SpeechTextArea';
import { useAuth } from '../../hooks/useAuth';
import { Lock, CheckCircle, Send, Loader2, AlertCircle, PenTool, Sparkles } from 'lucide-react';
import { auditEPRF, generateSBAR } from '../../services/geminiService';
import AuditSummaryModal from '../AuditSummaryModal';

const HandoverTab = () => {
    const { activeDraft, handleNestedUpdate, submitDraft } = useEPRF();
    const { user, verifyPin } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [auditing, setAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<any>(null);
    const [generating, setGenerating] = useState(false);

    if (!activeDraft) return null;

    const isSubmitted = activeDraft.status === 'Submitted';

    const handleRunAudit = async () => {
        setAuditing(true);
        const result = await auditEPRF(activeDraft);
        setAuditResult(result);
        setAuditing(false);
    };

    const handleAutoSbar = async () => {
        setGenerating(true);
        const text = await generateSBAR(activeDraft);
        handleNestedUpdate(['handover', 'sbar'], text);
        setGenerating(false);
    };

    const handlePinSubmit = async () => {
        if (pin.length !== 4) {
            setError('Enter 4-digit PIN');
            return;
        }
        if (!activeDraft.handover.clinicianSignature) {
            setError('Please provide a physical signature first.');
            return;
        }

        setIsSigning(true);
        setError('');
        
        try {
            const isValid = await verifyPin(pin);
            if (isValid && user) {
                // Digital Token Format: DIGITAL_TOKEN|Name|Role|ISO_Date|EmployeeID
                const token = `DIGITAL_TOKEN|${user.name}|${user.role}|${new Date().toISOString()}|${user.employeeId}`;
                
                // Use the explicit submit function which forces an immediate save
                await submitDraft(token);
                
                setPin('');
            } else {
                setError('Invalid PIN');
            }
        } catch (e) {
            console.error(e);
            setError('Verification or Save failed. Check connection.');
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">SBAR Handover</h3>
                    <button 
                        onClick={handleAutoSbar} 
                        disabled={generating || isSubmitted}
                        className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                    >
                        {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                        Auto-Generate
                    </button>
                </div>
                <SpeechTextArea 
                    label="Situation / Background / Assessment / Recommendation"
                    value={activeDraft.handover.sbar}
                    onChange={e => handleNestedUpdate(['handover', 'sbar'], e.target.value)}
                    rows={6}
                    placeholder="Dictate or type your handover..."
                    className="font-mono text-sm leading-relaxed"
                    disabled={isSubmitted}
                />
            </div>

            <div className="glass-panel p-6 rounded-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Declaration & Signatures</h3>
                    {!isSubmitted && (
                        <button 
                            onClick={handleRunAudit}
                            disabled={auditing}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-ams-blue to-purple-600 text-white font-bold rounded-xl shadow-md hover:scale-105 transition-transform"
                        >
                            {auditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            Run Clinical Audit
                        </button>
                    )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Clinician Signing Section */}
                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-64 flex flex-col">
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <PenTool className="w-4 h-4" /> 1. Physical Signature
                            </h4>
                            <div className="flex-1">
                                {isSubmitted ? (
                                    <div className="h-full flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <img src={activeDraft.handover.clinicianSignature} alt="Sig" className="max-h-full" />
                                    </div>
                                ) : (
                                    <SignaturePad 
                                        label=""
                                        value={activeDraft.handover.clinicianSignature}
                                        onSave={val => handleNestedUpdate(['handover', 'clinicianSignature'], val)}
                                    />
                                )}
                            </div>
                        </div>

                        <div className={`p-6 rounded-xl border-2 transition-all h-64 flex flex-col justify-center ${isSubmitted ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <Lock className="w-4 h-4" /> 2. Digital Submission
                            </h4>
                            
                            {isSubmitted ? (
                                <div className="text-center space-y-2">
                                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <CheckCircle className="w-6 h-6" />
                                    </div>
                                    <p className="font-bold text-green-800 dark:text-green-300">Record Locked & Submitted</p>
                                    <p className="text-xs text-green-700 dark:text-green-400">
                                        Securely verified by {user?.name}
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-xs text-slate-500 leading-relaxed">
                                        I confirm that the information recorded is accurate and complete to the best of my knowledge.
                                        Entering your PIN acts as a legal digital signature.
                                    </p>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-2 text-center">Enter PIN to Verify</label>
                                        <div className="flex justify-center gap-2">
                                            <input 
                                                type="password" 
                                                maxLength={4}
                                                className="w-32 text-center text-xl font-bold tracking-widest p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-ams-blue"
                                                value={pin}
                                                onChange={e => setPin(e.target.value.replace(/\D/g,''))}
                                                disabled={isSigning}
                                            />
                                        </div>
                                    </div>
                                    {error && (
                                        <div className="text-xs text-red-500 font-bold text-center flex justify-center gap-1">
                                            <AlertCircle className="w-4 h-4" /> {error}
                                        </div>
                                    )}
                                    <button 
                                        onClick={handlePinSubmit}
                                        disabled={isSigning || pin.length !== 4 || !activeDraft.handover.clinicianSignature}
                                        className="w-full py-3 bg-ams-blue text-white font-bold rounded-lg hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        {isSigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Verify & Submit Record
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Receiving Clinician */}
                    <div className="space-y-6">
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-64 flex flex-col">
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-3">Receiving Clinician / Witness</h4>
                            <div className="flex-1">
                                {isSubmitted && activeDraft.handover.receivingClinicianSignature ? (
                                    <div className="h-full flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <img src={activeDraft.handover.receivingClinicianSignature} className="max-h-full" />
                                    </div>
                                ) : (
                                    <SignaturePad 
                                        label=""
                                        value={activeDraft.handover.receivingClinicianSignature}
                                        onSave={val => handleNestedUpdate(['handover', 'receivingClinicianSignature'], val)}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {auditResult && (
                <AuditSummaryModal 
                    score={auditResult.score} 
                    feedback={auditResult.feedback} 
                    criticalIssues={auditResult.critical_issues} 
                    onClose={() => setAuditResult(null)} 
                />
            )}
        </div>
    );
};

export default HandoverTab;
