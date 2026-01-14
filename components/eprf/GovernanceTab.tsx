
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { ShieldCheck, Brain, BookOpen, AlertOctagon, Sparkles, Loader2, AlertCircle, CheckCircle, ShieldAlert } from 'lucide-react';
import { analyzeSafeguarding } from '../../services/geminiService';
import SpeechTextArea from '../SpeechTextArea';

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
    const [scanResult, setScanResult] = useState<{detected: boolean, message: string} | null>(null);
    const [showPrinciples, setShowPrinciples] = useState(false);
    
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
        setScanResult(null);
        
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
            
            setScanResult({
                detected: true,
                message: `Risk Identified: ${result.type}\nReason: ${result.reasoning}\n\nSafeguarding form has been triggered.`
            });
        } else {
            setScanResult({
                detected: false,
                message: "No obvious safeguarding triggers found in the current narrative."
            });
        }
        setAnalyzing(false);
    };

    // MCA Logic
    const mca = activeDraft.governance.capacity;
    
    // Logic: Status is "Not Assessed" until Q1 is answered.
    // If Q1 is No -> Capacity Present (presumed).
    // If Q1 is Yes -> Check Stage 2.
    // If Stage 2 has ANY failures -> Capacity Lacking.
    
    let computedStatus = 'Not Assessed';
    
    if (mca.stage1?.impairment === false) {
        computedStatus = 'Capacity Present';
    } else if (mca.stage1?.impairment === true) {
        // Check Nexus
        if (mca.stage1?.nexus === false) {
             computedStatus = 'Capacity Present'; // Impairment exists but doesn't affect decision
        } else if (mca.stage1?.nexus === true) {
             // Check Functional Test
             const f = mca.stage2Functional;
             // If any functional step is FALSE (failed), then capacity is lacking
             if (f?.understand === false || f?.retain === false || f?.weigh === false || f?.communicate === false) {
                 computedStatus = 'Capacity Lacking';
             } else {
                 computedStatus = 'Capacity Present';
             }
        } else {
            // Nexus undefined
            computedStatus = 'Assessment Incomplete';
        }
    }

    // Auto-update the stored status field if it differs from computation
    if (mca.status !== computedStatus) {
        // Use a timeout to avoid render-cycle loops
        setTimeout(() => handleNestedUpdate(['governance', 'capacity', 'status'], computedStatus), 0);
    }

    return (
        <div className="glass-panel p-4 rounded-xl space-y-6 animate-in fade-in pb-20">
            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Legal & Governance</h3>
            
            {/* Mental Capacity Act Tool */}
            <div className="p-6 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <Brain className="w-6 h-6 text-purple-600" /> Mental Capacity Act Assessment
                        </h4>
                        <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${
                            computedStatus === 'Capacity Lacking' ? 'bg-red-100 text-red-700 border-red-200' : 
                            computedStatus === 'Capacity Present' ? 'bg-green-100 text-green-700 border-green-200' :
                            'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400'
                        }`}>
                            {computedStatus === 'Capacity Lacking' ? <AlertOctagon className="w-3 h-3" /> : computedStatus === 'Capacity Present' ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                            {computedStatus.toUpperCase()}
                        </div>
                    </div>
                    <button onClick={() => setShowPrinciples(!showPrinciples)} className="text-xs font-bold text-slate-500 flex items-center gap-1 hover:text-ams-blue transition-colors">
                        <BookOpen className="w-4 h-4" /> 5 Principles
                    </button>
                </div>

                {showPrinciples && (
                    <div className="mb-6 p-4 bg-white dark:bg-slate-900 rounded-xl text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-top-2">
                        <ol className="list-decimal pl-4 space-y-1">
                            <li><strong>Presumption of Capacity:</strong> Assume capacity unless proven otherwise.</li>
                            <li><strong>Support:</strong> Take all steps to help them decide before concluding they can't.</li>
                            <li><strong>Unwise Decisions:</strong> An unwise decision does not mean lack of capacity.</li>
                            <li><strong>Best Interests:</strong> Acts done for those lacking capacity must be in their best interests.</li>
                            <li><strong>Least Restrictive:</strong> Decisions must be the least restrictive of rights/freedoms.</li>
                        </ol>
                    </div>
                )}

                <div className="space-y-6 relative z-10">
                    {/* Stage 1 */}
                    <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                        <h5 className="font-bold text-sm text-slate-700 dark:text-slate-300 mb-3 uppercase">Stage 1: Diagnostic Test</h5>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[70%]">1. Is there an impairment of, or disturbance in the functioning of, the mind or brain?</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                    <button onClick={() => handleNestedUpdate(['governance', 'capacity', 'stage1', 'impairment'], true)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${mca.stage1?.impairment === true ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Yes</button>
                                    <button onClick={() => handleNestedUpdate(['governance', 'capacity', 'stage1', 'impairment'], false)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${mca.stage1?.impairment === false ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>No</button>
                                </div>
                            </div>
                            {mca.stage1?.impairment && (
                                <div className="flex justify-between items-center animate-in fade-in">
                                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[70%]">2. Is this impairment the specific cause of their inability to make this decision?</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        <button onClick={() => handleNestedUpdate(['governance', 'capacity', 'stage1', 'nexus'], true)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${mca.stage1?.nexus === true ? 'bg-red-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>Yes</button>
                                        <button onClick={() => handleNestedUpdate(['governance', 'capacity', 'stage1', 'nexus'], false)} className={`px-3 py-1 rounded text-xs font-bold transition-all ${mca.stage1?.nexus === false ? 'bg-green-500 text-white' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>No</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stage 2 */}
                    {mca.stage1?.impairment && mca.stage1?.nexus && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 animate-in slide-in-from-top-2">
                            <h5 className="font-bold text-sm text-red-800 dark:text-red-300 mb-3 uppercase">Stage 2: Functional Test</h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">Does the patient FAIL to do any ONE of the following?</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {['understand', 'retain', 'weigh', 'communicate'].map(item => (
                                    <label key={item} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${(mca.stage2Functional as any)?.[item] ? 'bg-green-100 border-green-200' : 'bg-white border-red-200 shadow-sm'}`}>
                                        <span className="text-sm font-bold capitalize text-slate-800">Can {item} info?</span>
                                        <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${(mca.stage2Functional as any)?.[item] ? 'text-green-700' : 'text-red-600'}`}>
                                            {(mca.stage2Functional as any)?.[item] ? 'YES' : 'NO (FAILED)'}
                                        </div>
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={(mca.stage2Functional as any)?.[item]}
                                            onChange={e => handleNestedUpdate(['governance', 'capacity', 'stage2Functional', item], e.target.checked)}
                                        />
                                    </label>
                                ))}
                            </div>
                            
                            {computedStatus === 'Capacity Lacking' && (
                                <div className="mt-4 animate-in slide-in-from-top-2">
                                    <label className="input-label text-red-800">Best Interests Rationale (Mandatory)</label>
                                    <textarea 
                                        className="input-field bg-white" 
                                        placeholder="Justify actions taken in patient's best interests..."
                                        rows={2}
                                        value={activeDraft.governance.capacity.bestInterestsRationale || ''}
                                        onChange={e => handleNestedUpdate(['governance', 'capacity', 'bestInterestsRationale'], e.target.value)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Safeguarding Section */}
            <div className={`p-6 rounded-xl border transition-all ${activeDraft.governance.safeguarding.concerns ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                <div className="flex justify-between items-center mb-4">
                    <h4 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                        <ShieldAlert className={`w-5 h-5 ${activeDraft.governance.safeguarding.concerns ? 'text-red-600' : 'text-slate-400'}`} />
                        Safeguarding
                    </h4>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleAiScan}
                            disabled={analyzing}
                            className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-lg font-bold flex items-center gap-2 hover:bg-purple-200 transition-colors"
                        >
                            {analyzing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                            AI Risk Scan
                        </button>
                        <label className="flex items-center gap-2 cursor-pointer bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                            <input 
                                type="checkbox" 
                                className="w-4 h-4 text-red-600 rounded"
                                checked={activeDraft.governance.safeguarding.concerns} 
                                onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'concerns'], e.target.checked)} 
                            />
                            <span className="text-sm font-bold text-slate-700 dark:text-white">Concerns Raised</span>
                        </label>
                    </div>
                </div>

                {scanResult && (
                    <div className={`mb-4 p-3 rounded-lg text-xs font-medium border ${scanResult.detected ? 'bg-red-100 text-red-800 border-red-200' : 'bg-green-100 text-green-800 border-green-200'} animate-in fade-in`}>
                        {scanResult.message}
                    </div>
                )}

                {activeDraft.governance.safeguarding.concerns && (
                    <div className="space-y-4 animate-in slide-in-from-top-2">
                        <div>
                            <label className="input-label">Type of Abuse / Concern</label>
                            <div className="flex flex-wrap gap-2">
                                {['Physical', 'Emotional', 'Sexual', 'Neglect', 'Financial', 'Modern Slavery', 'Domestic Abuse'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => toggleSafeguardingType(type)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            activeDraft.governance.safeguarding.type?.includes(type)
                                            ? 'bg-red-600 text-white border-red-600'
                                            : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="input-label">Details of Concern</label>
                            <textarea 
                                className="input-field h-32 resize-none" 
                                placeholder="Document specific disclosures, observations, or injuries..."
                                value={activeDraft.governance.safeguarding.details}
                                onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'details'], e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="w-4 h-4 text-ams-blue rounded"
                                    checked={activeDraft.governance.safeguarding.referralMade} 
                                    onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'referralMade'], e.target.checked)} 
                                />
                                <span className="text-sm font-bold text-slate-700 dark:text-white">Referral Made?</span>
                            </label>
                            {activeDraft.governance.safeguarding.referralMade && (
                                <input 
                                    className="input-field py-1.5 px-3 text-sm h-8 w-48" 
                                    placeholder="Reference No."
                                    value={activeDraft.governance.safeguarding.referralReference}
                                    onChange={e => handleNestedUpdate(['governance', 'safeguarding', 'referralReference'], e.target.value)}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Safety Netting */}
            <div className="glass-panel p-6 rounded-xl">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" /> Safety Netting Advice
                </h3>
                <div className="flex flex-wrap gap-2 mb-4">
                    {SAFETY_NETS.map(sn => (
                        <button 
                            key={sn.id}
                            onClick={() => addSafetyNet(sn.text)}
                            className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-800 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                        >
                            + {sn.label}
                        </button>
                    ))}
                </div>
                <div>
                    <label className="input-label">Specific Advice Given</label>
                    <textarea 
                        className="input-field h-32 resize-none" 
                        placeholder="Document worsening advice, specific signs to watch for, and actions to take..."
                        value={activeDraft.governance.worseningAdviceDetails || ''}
                        onChange={e => handleNestedUpdate(['governance', 'worseningAdviceDetails'], e.target.value)}
                    />
                </div>
            </div>
        </div>
    );
};

export default GovernanceTab;
