
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import SignaturePad from '../SignaturePad';
import SpeechTextArea from '../SpeechTextArea';
import { useAuth } from '../../hooks/useAuth';
import { Lock, CheckCircle, Send, Loader2, AlertCircle, PenTool, Sparkles } from 'lucide-react';
import { auditEPRF } from '../../services/geminiService';
import AuditSummaryModal from '../AuditSummaryModal';

const HandoverTab = () => {
    const { activeDraft, handleNestedUpdate, updateDraft } = useEPRF();
    const { user, verifyPin } = useAuth();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [isSigning, setIsSigning] = useState(false);
    const [auditing, setAuditing] = useState(false);
    const [auditResult, setAuditResult] = useState<any>(null);

    if (!activeDraft) return null;

    const isSubmitted = activeDraft.status === 'Submitted';

    const handleRunAudit = async () => {
        setAuditing(true);
        const result = await auditEPRF(activeDraft);
        setAuditResult(result);
        setAuditing(false);
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
                
                updateDraft({ 
                    status: 'Submitted',
                });
                
                handleNestedUpdate(['handover', 'digitalToken'], token);
                setPin('');
            } else {
                setError('Invalid PIN');
            }
        } catch (e) {
            setError('Verification failed');
        } finally {
            setIsSigning(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            <div className="glass-panel p-6 rounded-2xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">SBAR Handover</h3>
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
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-3 flex items-center gap-2">
                                <PenTool className="w-4 h-4" /> 1. Physical Signature
                            </h4>
                            {isSubmitted ? (
                                <div className="h-32 flex items-center justify-center bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <img src={activeDraft.handover.clinicianSignature} alt="Sig" className="max-h-full" />
                                </div>
                            ) : (
                                <SignaturePad 
                                    label="Draw Signature"
                                    value={activeDraft.handover.clinicianSignature}
                                    onSave={val => handleNestedUpdate(['handover', 'clinicianSignature'], val)}
                                />
                            )}
                        </div>

                        <div className={`p-6 rounded-xl border-2 transition-all ${isSubmitted ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-900 dark:border-slate-700'}`}>
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

                    {/* Receiving / Patient Section */}
                    <div className="space-y-6">
                        <div>
                            <h4 className="font-bold text-sm text-slate-500 uppercase mb-2">Receiving Clinician / Witness</h4>
                            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                                <input 
                                    className="input-field py-2 text-sm" 
                                    placeholder="Name / PIN of Receiver" 
                                    value={activeDraft.handover.receivingClinicianName}
                                    onChange={e => handleNestedUpdate(['handover', 'receivingClinicianName'], e.target.value)}
                                    disabled={isSubmitted}
                                />
                                {isSubmitted && activeDraft.handover.receivingClinicianSignature ? (
                                    <img src={activeDraft.handover.receivingClinicianSignature} className="h-20 border rounded bg-white" />
                                ) : (
                                    <SignaturePad 
                                        label="Receiver Signature"
                                        value={activeDraft.handover.receivingClinicianSignature}
                                        onSave={val => handleNestedUpdate(['handover', 'receivingClinicianSignature'], val)}
                                    />
                                )}
                            </div>
                        </div>
                        
                        {!activeDraft.governance.refusal.isRefusal && (
                            <div>
                                <h4 className="font-bold text-sm text-slate-500 uppercase mb-2">Patient Signature (Optional)</h4>
                                <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                    {isSubmitted && activeDraft.handover.patientSignature ? (
                                        <img src={activeDraft.handover.patientSignature} className="h-20 border rounded bg-white" />
                                    ) : (
                                        <SignaturePad 
                                            label="Patient Signature"
                                            value={activeDraft.handover.patientSignature}
                                            onSave={val => handleNestedUpdate(['handover', 'patientSignature'], val)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
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
