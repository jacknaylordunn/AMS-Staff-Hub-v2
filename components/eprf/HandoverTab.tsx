
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import SignaturePad from '../SignaturePad';
import SpeechTextArea from '../SpeechTextArea';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { Lock, CheckCircle, Send, Loader2, AlertTriangle, PenTool, Camera, Trash2, Plus, UserCheck, Clock, AlertCircle, FileCheck, Sparkles } from 'lucide-react';
import { generateSBAR } from '../../services/geminiService';
import { validateEPRF } from '../../utils/validation';
import { uploadFile, uploadBlob } from '../../services/storage';
import { MediaAttachment } from '../../types';
import { logAuditAction } from '../../services/auditService';
import { getEPRFBlob } from '../../utils/pdfGenerator';

const HandoverTab = () => {
    const { activeDraft, handleNestedUpdate, submitDraft, setActiveDraft } = useEPRF();
    const { user, verifyPin } = useAuth();
    const { toast } = useToast();
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [isSigning, setIsSigning] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [handoverFormat, setHandoverFormat] = useState<'SBAR' | 'ATMIST'>('SBAR');

    if (!activeDraft) return null;

    const isSubmitted = activeDraft.status === 'Submitted';
    const isConveying = activeDraft.clinicalDecision?.finalDisposition?.includes('Conveyed');
    const isDeceased = activeDraft.clinicalDecision?.finalDisposition === 'Deceased';
    const isRefusal = activeDraft.governance.refusal.isRefusal;
    const isSafeguarding = activeDraft.governance.safeguarding.concerns;
    const isGPreferral = activeDraft.clinicalDecision?.finalDisposition?.includes('Primary Care');
    
    // Default handover type if not set
    const handoverType = activeDraft.handover.handoverType || (isConveying ? 'Hospital Staff' : 'Other');

    const update = (field: string, value: any) => handleNestedUpdate(['handover', field], value);

    const handleAutoSbar = async () => {
        setGenerating(true);
        try {
            const text = await generateSBAR(activeDraft);
            update('sbar', text);
            toast.success("SBAR Generated");
        } catch (e) {
            toast.error("Failed to generate SBAR");
        } finally {
            setGenerating(false);
        }
    };

    const generateATMIST = () => {
        // ... (ATMIST logic same as previous) ...
        const d = activeDraft;
        const dob = d.patient.dob ? new Date(d.patient.dob) : null;
        const age = dob ? new Date().getFullYear() - dob.getFullYear() : 'Unknown';
        const time = d.times.onScene || d.times.callReceived || 'Unknown';
        
        const mechanism = d.assessment.traumaTriage?.mechanism ? 'Significant Mechanism (See Triage)' : d.history.historyOfPresentingComplaint;
        const injuries = d.injuries.map(i => `${i.location} (${i.type})`).join(', ') || 'None visible';
        
        // Last set of vitals
        const v = d.vitals[d.vitals.length - 1];
        const signs = v ? `HR: ${v.hr}, BP: ${v.bpSystolic}, GCS: ${v.gcs}, SpO2: ${v.spo2}%` : 'No Vitals Recorded';
        
        const treatment = [
            ...d.treatments.drugs.map(dr => dr.drugName),
            ...d.treatments.procedures.map(pr => pr.type)
        ].join(', ') || 'Nil';

        const majorTraumaTag = d.assessment.traumaTriage?.isMajorTrauma ? "**MAJOR TRAUMA DECLARED**\n" : "";

        const atmist = `${majorTraumaTag}Age: ${age} (${d.patient.gender?.charAt(0) || '?'})
Time: ${time}
Mechanism: ${mechanism}
Injuries: ${injuries}
Signs: ${signs}
Treatment: ${treatment}`;

        update('atmist', atmist);
    };

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        const file = e.target.files[0];
        setUploadingMedia(true);
        try {
            const url = await uploadFile(file, `evidence/${activeDraft.incidentNumber}`);
            const newMedia: MediaAttachment = {
                id: Date.now().toString(),
                type: 'Photo',
                url: url,
                timestamp: new Date().toISOString(),
                notes: file.name
            };
            const currentMedia = activeDraft.handover.media || [];
            update('media', [...currentMedia, newMedia]);
            toast.success("Photo attached successfully");
        } catch (e) {
            console.error(e);
            toast.error("Failed to upload photo");
        } finally {
            setUploadingMedia(false);
        }
    };

    const removeMedia = (id: string) => {
        const currentMedia = activeDraft.handover.media || [];
        update('media', currentMedia.filter(m => m.id !== id));
    };

    const handlePinSubmit = async () => {
        setError('');
        setValidationErrors([]);
        
        const errors = validateEPRF(activeDraft);
        if (errors.length > 0) {
            setValidationErrors(errors);
            toast.error("Validation Failed: Please complete required fields.");
            return;
        }

        if (pin.length !== 4) {
            setError('Enter 4-digit PIN');
            return;
        }

        // Validate Signatures based on Disposition
        if (isConveying) {
            if (!activeDraft.handover.receivingClinicianSignature) {
                setError('Receiving Clinician Signature required for conveyance.');
                return;
            }
        }
        if (isRefusal) {
            // Check refusal tab signatures via governance object
            const r = activeDraft.governance.refusal;
            if (!r.patientRefusedToSign && !r.patientSignature) {
                setError('Refusal requires Patient Signature or "Refused to Sign" check.');
                return;
            }
            if (!r.staffSignature) {
                setError('Refusal requires your signature in the Refusal tab.');
                return;
            }
        }

        const sig = activeDraft.handover.clinicianSignature;
        if (!sig || sig.length < 100) {
            setError('Please provide your physical signature first.');
            return;
        }

        // Referral Warning Check
        if ((isSafeguarding || isGPreferral) && !confirm("WARNING: Safeguarding or GP Referral indicated.\n\nHave you manually emailed the relevant forms to the appropriate teams?\n\nThis record will be LOCKED upon submission.")) {
            return;
        }

        setIsSigning(true);
        
        try {
            const isValid = await verifyPin(pin);
            if (!isValid) throw new Error("Invalid PIN");

            if (user) {
                const pdfBlob = await getEPRFBlob(activeDraft);
                const pdfPath = `eprfs/${activeDraft.incidentNumber}_final.pdf`;
                const pdfUrl = await uploadBlob(pdfBlob, pdfPath);

                const token = `DIGITAL_TOKEN|${user.name}|${user.role}|${new Date().toISOString()}|${user.employeeId}`;
                const finalLog = {
                    id: Date.now().toString(),
                    timestamp: new Date().toISOString(),
                    category: 'Info' as const,
                    message: `Record cryptographically locked by ${user.name} (${user.role}).`,
                    author: 'SYSTEM'
                };
                handleNestedUpdate(['logs'], [...(activeDraft.logs || []), finalLog]);
                
                await submitDraft(token, pdfUrl);
                await logAuditAction(user.uid, user.name, 'ePRF Submission', `Submitted Incident ${activeDraft.incidentNumber}`, 'Clinical');
                
                toast.success("ePRF Locked & Submitted Successfully");
                setPin('');
                
                // Prompt to close
                if (confirm("Record Submitted Successfully.\n\nClose record and return to dashboard?")) {
                    setActiveDraft(null);
                }
            }
        } catch (e: any) {
            console.error(e);
            setError(e.message || 'Submission failed. Check connection.');
            toast.error("Submission Failed");
        } finally {
            setIsSigning(false);
        }
    };

    const getIdLabel = () => {
        switch(handoverType) {
            case 'Police': return 'Shoulder Number';
            case 'AMS Crew': return 'Badge Number';
            case 'Ambulance Crew': return 'Call Sign';
            case 'Hospital Staff': return 'PIN / Reg No.';
            default: return 'ID / Reference';
        }
    };

    const smallInputClass = "w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm h-8 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm";

    return (
        <div className="space-y-6 animate-in fade-in pb-10">
            {/* Handover Format Selection */}
            <div className="glass-panel p-4 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white">Handover Format</h3>
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                        <button onClick={() => setHandoverFormat('SBAR')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${handoverFormat === 'SBAR' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>SBAR (Medical)</button>
                        <button onClick={() => { setHandoverFormat('ATMIST'); generateATMIST(); }} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${handoverFormat === 'ATMIST' ? 'bg-white dark:bg-slate-700 shadow text-ams-blue' : 'text-slate-500'}`}>ATMIST (Trauma)</button>
                    </div>
                </div>

                {handoverFormat === 'SBAR' ? (
                    <>
                        <div className="flex justify-end mb-2">
                            <button 
                                onClick={handleAutoSbar} 
                                disabled={generating || isSubmitted}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors disabled:opacity-50"
                            >
                                {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                AI Generate
                            </button>
                        </div>
                        <SpeechTextArea 
                            label="Situation / Background / Assessment / Recommendation"
                            value={activeDraft.handover.sbar}
                            onChange={e => update('sbar', e.target.value)}
                            rows={6}
                            placeholder="Dictate or type your handover..."
                            className="font-mono text-sm leading-relaxed"
                            disabled={isSubmitted}
                        />
                    </>
                ) : (
                    <SpeechTextArea 
                        label="Age / Time / Mechanism / Injuries / Signs / Treatment"
                        value={activeDraft.handover.atmist || ''}
                        onChange={e => update('atmist', e.target.value)}
                        rows={8}
                        placeholder="ATMIST details..."
                        className="font-mono text-sm leading-relaxed bg-amber-50 dark:bg-amber-900/10"
                        disabled={isSubmitted}
                    />
                )}
            </div>

            {/* Handover Details */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <UserCheck className="w-5 h-5 text-ams-blue" /> Handover Recipient
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="input-label">Handover To</label>
                        <select 
                            className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm h-10 outline-none focus:ring-2 focus:ring-ams-blue dark:text-white shadow-sm font-bold"
                            value={handoverType}
                            onChange={e => update('handoverType', e.target.value)}
                            disabled={isSubmitted}
                        >
                            <option value="Hospital Staff">Hospital Staff (Nurse/Doctor)</option>
                            <option value="Ambulance Crew">NHS Ambulance Crew</option>
                            <option value="AMS Crew">AMS Crew</option>
                            <option value="Police">Police</option>
                            <option value="Other">Other / Relative</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                        <div><label className="input-label">Name / Rank</label><input className={smallInputClass} placeholder="Recipient Name" value={activeDraft.handover.receivingName || ''} onChange={e => update('receivingName', e.target.value)} /></div>
                        <div><label className="input-label">{getIdLabel()}</label><input className={smallInputClass} placeholder="ID Number" value={activeDraft.handover.receivingPin || ''} onChange={e => update('receivingPin', e.target.value)} /></div>
                        <div>
                            <label className="input-label flex items-center gap-1"><Clock className="w-3 h-3" /> Handover Time</label>
                            <input type="time" className={smallInputClass} value={activeDraft.handover.receivingTime || ''} onChange={e => update('receivingTime', e.target.value)} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Evidence */}
            <div className="glass-panel p-4 rounded-xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <Camera className="w-5 h-5 text-ams-blue" /> Photographic Evidence
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {!isSubmitted && (
                        <label className={`aspect-square rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors ${uploadingMedia ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} disabled={uploadingMedia} />
                            {uploadingMedia ? <Loader2 className="w-8 h-8 text-ams-blue animate-spin" /> : <><Camera className="w-8 h-8 text-slate-400 mb-2" /><span className="text-xs font-bold text-slate-500">Capture Photo</span></>}
                        </label>
                    )}
                    {activeDraft.handover.media?.map((media) => (
                        <div key={media.id} className="relative aspect-square rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-700 bg-black">
                            <img src={media.url} alt="Evidence" className="w-full h-full object-cover" />
                            {!isSubmitted && (
                                <button onClick={() => removeMedia(media.id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"><Trash2 className="w-4 h-4" /></button>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2"><p className="text-[10px] text-white truncate">{new Date(media.timestamp).toLocaleTimeString()}</p></div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-ams-blue">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-slate-800 dark:text-white flex items-center gap-2">
                        <FileCheck className="w-6 h-6 text-ams-blue" /> Sign & Submit
                    </h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* 1. Lead Clinician Sig (Always Required) */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                        <SignaturePad 
                            label="1. Lead Clinician Signature" 
                            value={activeDraft.handover.clinicianSignature} 
                            timestamp={activeDraft.handover.clinicianSigTime}
                            onSave={val => update('clinicianSignature', val)} 
                            onTimestampChange={t => update('clinicianSigTime', t)}
                            required
                        />
                    </div>

                    {/* 2. Adaptive Sig (Receiver or Patient) */}
                    {isConveying && (
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <SignaturePad 
                                label="2. Receiving Person Signature" 
                                value={activeDraft.handover.receivingClinicianSignature} 
                                timestamp={activeDraft.handover.receivingSigTime}
                                onSave={val => update('receivingClinicianSignature', val)} 
                                onTimestampChange={t => update('receivingSigTime', t)}
                                required
                            />
                        </div>
                    )}
                    
                    {!isConveying && !isRefusal && !isDeceased && (
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                            <SignaturePad 
                                label="2. Patient Signature (Discharge)" 
                                value={activeDraft.handover.patientSignature} 
                                timestamp={activeDraft.handover.patientSigTime} 
                                onSave={val => update('patientSignature', val)} 
                            />
                        </div>
                    )}
                </div>

                {/* 3. Final Authorization */}
                <div className={`p-6 rounded-xl border-2 transition-all ${isSubmitted ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-slate-100 border-slate-200 dark:bg-slate-800 dark:border-slate-700'}`}>
                    <h4 className="font-bold text-sm text-slate-500 uppercase mb-4 flex items-center gap-2">
                        <Lock className="w-4 h-4" /> 3. Final Authorization
                    </h4>
                    
                    {isSubmitted ? (
                        <div className="text-center space-y-3 py-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                                <CheckCircle className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="font-bold text-lg text-green-800 dark:text-green-300">Record Locked & Submitted</p>
                                <p className="text-sm text-green-700 dark:text-green-400">Securely verified by {user?.name}</p>
                                <p className="text-xs text-green-600/70 mt-1 font-mono">{new Date(activeDraft.lastUpdated).toLocaleString()}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {validationErrors.length > 0 && (
                                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-bold text-xs mb-2">
                                        <AlertTriangle className="w-4 h-4" /> Submission Blocked
                                    </div>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {validationErrors.map((err, i) => <li key={i} className="text-[10px] text-red-600 dark:text-red-400 font-medium">{err}</li>)}
                                    </ul>
                                </div>
                            )}
                            
                            <div className="text-center">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-3">Enter Secure PIN to Lock</label>
                                <div className="flex justify-center">
                                    <input 
                                        type="password" 
                                        maxLength={4} 
                                        className="w-40 text-center text-3xl font-bold tracking-[0.5em] p-3 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white outline-none focus:ring-4 focus:ring-ams-blue/20 focus:border-ams-blue transition-all" 
                                        value={pin} 
                                        onChange={e => setPin(e.target.value.replace(/\D/g,''))} 
                                        disabled={isSigning} 
                                        placeholder="••••"
                                    />
                                </div>
                            </div>

                            {error && <div className="text-xs text-red-500 font-bold text-center flex justify-center gap-1"><AlertCircle className="w-4 h-4" /> {error}</div>}
                            
                            <button 
                                onClick={handlePinSubmit} 
                                disabled={isSigning || pin.length !== 4} 
                                className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg text-lg"
                            >
                                {isSigning ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-5 h-5" />} 
                                {isSigning ? 'Uploading & Locking...' : 'Verify & Submit Record'}
                            </button>
                            <p className="text-[10px] text-center text-slate-400">
                                This action is final. The record will be converted to PDF and locked permanently.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default HandoverTab;
