
import React, { useState } from 'react';
import { useEPRF } from '../../context/EPRFContext';
import { WoundAssessment, InjuryMark } from '../../types';
import { 
    FileText, AlertTriangle, Brain, Heart, Wind, AlertOctagon, Baby, 
    PersonStanding, Coffee, Bone, Smile, ShieldAlert, Plus, Trash2, 
    Flame, Activity, X, Stethoscope, Eye, Thermometer, Mic, ArrowRight 
} from 'lucide-react';
import SpeechTextArea from '../SpeechTextArea';
import TraumaTriage from '../TraumaTriage';
import SepsisTool from '../SepsisTool';
import ClinicalFrailtyScale from '../ClinicalFrailtyScale';
import NeuroAssessment from '../NeuroAssessment';
import CranialNerveAssessment from '../CranialNerveAssessment';
import BodyMap from '../BodyMap';

const AssessmentTab = () => {
    const { activeDraft, handleNestedUpdate, createNeonateDraft } = useEPRF();
    const [activeSection, setActiveSection] = useState('narrative');
    const [parklandWeight, setParklandWeight] = useState('');
    
    // MSK Modal State
    const [showInjuryModal, setShowInjuryModal] = useState(false);
    const [pendingInjury, setPendingInjury] = useState<Partial<InjuryMark> | null>(null);
    const [injuryForm, setInjuryForm] = useState({ type: 'Injury', subtype: 'Pain', location: '', notes: '' });

    if (!activeDraft) return null;
    const assessment = activeDraft.assessment;
    const update = (path: string[], val: any) => handleNestedUpdate(['assessment', ...path], val);

    // --- Side Menu Configuration ---
    const menuItems = [
        { id: 'narrative', label: 'Narrative', icon: FileText, desc: 'Detailed History & Notes' },
        { id: 'respiratory', label: 'Respiratory', icon: Wind, desc: 'Airway & Breathing' },
        { id: 'cardiac', label: 'Cardiac', icon: Heart, desc: 'Circulation & ECG' },
        { id: 'nervous', label: 'Neurological', icon: Brain, desc: 'GCS, FAST, Neuro' },
        { id: 'trauma', label: 'Trauma', icon: AlertTriangle, desc: 'Triage & Mechanism' },
        { id: 'msk', label: 'MSK / Skin', icon: Bone, desc: 'Injuries, Burns, Wounds' },
        { id: 'abdominal', label: 'Abdomen/GI/GU', icon: Coffee, desc: 'GI & Urinary Systems' },
        { id: 'obs', label: 'Obs & Gynae', icon: Baby, desc: 'Pregnancy & Birth' },
        { id: 'sepsis', label: 'Sepsis', icon: AlertOctagon, desc: 'Screening Tool' },
        { id: 'mental', label: 'Mental Health', icon: Smile, desc: 'MSE & Capacity' },
        { id: 'social', label: 'Social/Frailty', icon: PersonStanding, desc: 'CFS & Safeguarding' },
    ];

    // --- Logic & Handlers ---

    const applyTemplate = (type: string) => {
        let tpl = '';
        if (type === 'Medical') tpl = `ON EXAMINATION:\nGeneral:\nRespiratory:\nCVS:\nAbdomen:\nNeuro:\nMSK/Skin:`;
        else if (type === 'Trauma') tpl = `ON EXAMINATION:\nGeneral:\nHead/Neck:\nChest:\nAbdo/Pelvis:\nLimbs:\nNeuro:\nBack/Spine:`;
        else if (type === 'Mental') tpl = `MENTAL STATE EXAM:\nAppearance:\nBehaviour:\nSpeech:\nMood:\nThought Process:\nRisk:`;
        
        const current = assessment.clinicalNarrative || '';
        update(['clinicalNarrative'], current ? current + '\n\n' + tpl : tpl);
    };

    const handleBabyBorn = async () => {
        if (confirm("CONFIRM DELIVERY?\n\nThis will:\n1. Create a NEW ePRF for the baby linked to this record.\n2. Switch your view to the baby's record immediately.\n3. Keep this maternal record open in the background.")) {
            await createNeonateDraft();
        }
    };

    // --- Sub-Renderers ---

    const renderRespiratory = () => (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <Wind className="w-6 h-6 text-blue-500" /> Respiratory System
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="input-label">Airway Status</label><select className="input-field" value={assessment.primary?.airway?.status || ''} onChange={e => handleNestedUpdate(['assessment', 'primary', 'airway', 'status'], e.target.value)}><option>Patent</option><option>Partial Obstruction</option><option>Complete Obstruction</option><option>Maintained (Adjuncts)</option></select></div>
                <div><label className="input-label">Breathing Effort</label><select className="input-field" value={assessment.primary?.breathing?.effort || ''} onChange={e => handleNestedUpdate(['assessment', 'primary', 'breathing', 'effort'], e.target.value)}><option>Normal</option><option>Increased WOB</option><option>Shallow</option><option>Agonal</option></select></div>
                
                <div><label className="input-label">Air Entry (Left)</label><select className="input-field" value={assessment.respiratory?.airEntry || ''} onChange={e => update(['respiratory', 'airEntry'], e.target.value)}><option>Good Air Entry</option><option>Reduced</option><option>Silent</option><option>Wheeze</option><option>Crepitations</option></select></div>
                <div><label className="input-label">Air Entry (Right)</label><select className="input-field" value={assessment.respiratory?.airEntry || ''} onChange={e => update(['respiratory', 'airEntry'], e.target.value)}><option>Good Air Entry</option><option>Reduced</option><option>Silent</option><option>Wheeze</option><option>Crepitations</option></select></div>
                
                <div><label className="input-label">Cough</label><input className="input-field" placeholder="e.g. Dry, Productive" value={assessment.respiratory?.cough || ''} onChange={e => update(['respiratory', 'cough'], e.target.value)} /></div>
                <div><label className="input-label">Sputum</label><input className="input-field" placeholder="e.g. Green, Haemoptysis" value={assessment.respiratory?.sputumColor || ''} onChange={e => update(['respiratory', 'sputumColor'], e.target.value)} /></div>
            </div>
            
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm mb-3">Nebuliser Therapy</h4>
                <div className="flex gap-4">
                    <div><label className="input-label">Peak Flow (Pre)</label><input type="number" className="input-field w-24" value={assessment.respiratory?.peakFlowPre || ''} onChange={e => update(['respiratory', 'peakFlowPre'], e.target.value)} /></div>
                    <div><label className="input-label">Peak Flow (Post)</label><input type="number" className="input-field w-24" value={assessment.respiratory?.peakFlowPost || ''} onChange={e => update(['respiratory', 'peakFlowPost'], e.target.value)} /></div>
                </div>
            </div>
        </div>
    );

    const renderCardiac = () => (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <Heart className="w-6 h-6 text-red-500" /> Cardiovascular System
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div><label className="input-label">Heart Sounds</label><select className="input-field"><option>S1 + S2 Normal</option><option>Murmur</option><option>Muffled</option><option>Added Sounds</option></select></div>
                <div><label className="input-label">JVP</label><select className="input-field"><option>Not Raised</option><option>Raised</option></select></div>
                <div><label className="input-label">Oedema</label><select className="input-field"><option>None</option><option>Pedal (Pitting)</option><option>Sacral</option><option>Pulmonary</option></select></div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                <h4 className="font-bold text-sm mb-3 flex items-center gap-2"><Activity className="w-4 h-4" /> 12-Lead ECG Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="input-label">Rhythm</label><select className="input-field" value={assessment.cardiac?.ecg?.rhythm || ''} onChange={e => update(['cardiac', 'ecg', 'rhythm'], e.target.value)}><option>Sinus Rhythm</option><option>Sinus Tachycardia</option><option>Sinus Bradycardia</option><option>Atrial Fibrillation</option><option>SVT</option><option>VT</option><option>VF</option><option>Heart Block</option><option>Paced</option></select></div>
                    <div><label className="input-label">Rate</label><input type="number" className="input-field" value={assessment.cardiac?.ecg?.rate || ''} onChange={e => update(['cardiac', 'ecg', 'rate'], e.target.value)} /></div>
                    <div className="md:col-span-2">
                        <label className="input-label">Interpretation / ST Changes</label>
                        <textarea className="input-field h-20 resize-none" placeholder="e.g. ST Elevation in II, III, aVF. Reciprocal depression in I, aVL." value={assessment.cardiac?.ecg?.twelveLeadNotes || ''} onChange={e => update(['cardiac', 'ecg', 'twelveLeadNotes'], e.target.value)} />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderAbdominal = () => (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <Coffee className="w-6 h-6 text-amber-600" /> Abdomen / GI / GU
            </h3>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-900/50">
                <label className="flex items-center gap-3 font-bold text-red-800 dark:text-red-200 cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 text-red-600 rounded" checked={assessment.gastrointestinal?.abdominalPain} onChange={e => update(['gastrointestinal', 'abdominalPain'], e.target.checked)} />
                    Acute Abdominal Pain / Surgical Abdomen?
                </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-500 uppercase">Assessment</h4>
                    <div><label className="input-label">Inspection</label><input className="input-field" placeholder="e.g. Distended, Scars, Pulsating mass" value={assessment.gastrointestinal?.distension || ''} onChange={e => update(['gastrointestinal', 'distension'], e.target.value)} /></div>
                    <div><label className="input-label">Palpation</label><input className="input-field" placeholder="e.g. Soft, Guarding, Rigidity, Rebound" value={assessment.gastrointestinal?.palpation || ''} onChange={e => update(['gastrointestinal', 'palpation'], e.target.value)} /></div>
                    <div><label className="input-label">Bowel Sounds</label><select className="input-field" value={assessment.gastrointestinal?.bowelSounds || ''} onChange={e => update(['gastrointestinal', 'bowelSounds'], e.target.value)}><option>Normal</option><option>Hyperactive</option><option>Absent</option><option>Tinkling</option></select></div>
                </div>
                <div className="space-y-3">
                    <h4 className="font-bold text-sm text-slate-500 uppercase">Output / Fluids</h4>
                    <div><label className="input-label">Last Oral Intake</label><input className="input-field" value={activeDraft.history.sample?.lastOralIntake || ''} onChange={e => handleNestedUpdate(['history', 'sample', 'lastOralIntake'], e.target.value)} /></div>
                    <div><label className="input-label">Urine Output</label><input className="input-field" placeholder="e.g. Normal, Nil, Haematuria" value={assessment.gastrointestinal?.urineOutput || ''} onChange={e => update(['gastrointestinal', 'urineOutput'], e.target.value)} /></div>
                    <div><label className="input-label">Bowels</label><input className="input-field" placeholder="e.g. Normal, Melaena, Diarrhoea" value={assessment.gastrointestinal?.lastBowelMovement || ''} onChange={e => update(['gastrointestinal', 'lastBowelMovement'], e.target.value)} /></div>
                </div>
            </div>
        </div>
    );

    const renderObsGynae = () => (
        <div className="space-y-6 animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2 border-b pb-2 dark:border-slate-700">
                <Baby className="w-6 h-6 text-pink-500" /> Obstetrics & Gynaecology
            </h3>

            <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 font-bold text-lg cursor-pointer">
                            <input type="checkbox" className="w-5 h-5 rounded text-ams-blue" checked={assessment.obsGynae?.pregnant} onChange={e => update(['obsGynae', 'pregnant'], e.target.checked)} />
                            Patient is Pregnant
                        </label>
                    </div>
                    {assessment.obsGynae?.pregnant && (
                        <button 
                            onClick={handleBabyBorn}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-900/20 flex items-center gap-2 animate-pulse"
                        >
                            <Baby className="w-5 h-5" /> BABY BORN / DELIVERY
                        </button>
                    )}
                </div>

                {assessment.obsGynae?.pregnant && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div><label className="input-label">Gestation</label><input className="input-field" placeholder="Weeks + Days" value={assessment.obsGynae?.gestationWeeks || ''} onChange={e => update(['obsGynae', 'gestationWeeks'], e.target.value)} /></div>
                        <div><label className="input-label">Gravida / Para</label><div className="flex gap-2"><input className="input-field" placeholder="G" value={assessment.obsGynae?.gravida || ''} onChange={e => update(['obsGynae', 'gravida'], e.target.value)} /><input className="input-field" placeholder="P" value={assessment.obsGynae?.para || ''} onChange={e => update(['obsGynae', 'para'], e.target.value)} /></div></div>
                        <div><label className="input-label">Contractions</label><input className="input-field" placeholder="Frequency / Duration" value={assessment.obsGynae?.contractions || ''} onChange={e => update(['obsGynae', 'contractions'], e.target.value)} /></div>
                        
                        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                            <label className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3 font-bold text-sm cursor-pointer">
                                <input type="checkbox" checked={assessment.obsGynae?.membranesRuptured} onChange={e => update(['obsGynae', 'membranesRuptured'], e.target.checked)} className="w-4 h-4 rounded text-blue-500" />
                                Membranes Ruptured
                            </label>
                            <label className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3 font-bold text-sm cursor-pointer">
                                <input type="checkbox" checked={assessment.obsGynae?.bleeding} onChange={e => update(['obsGynae', 'bleeding'], e.target.checked)} className="w-4 h-4 rounded text-red-500" />
                                PV Bleeding / Show
                            </label>
                            <label className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3 font-bold text-sm cursor-pointer">
                                <input type="checkbox" checked={assessment.obsGynae?.foetalMovements} onChange={e => update(['obsGynae', 'foetalMovements'], e.target.checked)} className="w-4 h-4 rounded text-green-500" />
                                Foetal Movements Felt
                            </label>
                        </div>

                        <div className="lg:col-span-3 mt-2">
                            <label className="input-label">Obstetric Notes</label>
                            <textarea className="input-field h-24 resize-none" placeholder="Presentation, cord status, complications..." value={assessment.obsGynae?.notes || ''} onChange={e => update(['obsGynae', 'notes'], e.target.value)} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // --- Main Render ---
    return (
        <div className="flex flex-col lg:flex-row gap-6 min-h-[600px] animate-in fade-in">
            {/* Sidebar Menu */}
            <div className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden h-fit sticky top-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase tracking-wide">Systems</h3>
                </div>
                <div className="p-2 space-y-1">
                    {menuItems.map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveSection(item.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${
                                activeSection === item.id 
                                ? 'bg-ams-blue text-white shadow-md' 
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                        >
                            <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-white' : 'text-slate-400 group-hover:text-ams-blue'}`} />
                            <div>
                                <div className="font-bold text-sm">{item.label}</div>
                                <div className={`text-[10px] ${activeSection === item.id ? 'text-blue-200' : 'text-slate-400'}`}>{item.desc}</div>
                            </div>
                            {activeSection === item.id && <ArrowRight className="w-4 h-4 ml-auto opacity-50" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 lg:p-8">
                {activeSection === 'narrative' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <FileText className="w-6 h-6 text-ams-blue" /> Clinical Narrative
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => applyTemplate('Medical')} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200">Medical</button>
                                <button onClick={() => applyTemplate('Trauma')} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200">Trauma</button>
                                <button onClick={() => applyTemplate('Mental')} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold hover:bg-slate-200">MH</button>
                            </div>
                        </div>
                        <SpeechTextArea 
                            label="Detailed History & Findings" 
                            className="input-field w-full h-[500px] resize-none font-mono text-sm leading-relaxed p-4" 
                            placeholder="Type detailed physical examination findings here..." 
                            value={assessment.clinicalNarrative || ''} 
                            onChange={e => update(['clinicalNarrative'], e.target.value)} 
                        />
                    </div>
                )}

                {activeSection === 'respiratory' && renderRespiratory()}
                {activeSection === 'cardiac' && renderCardiac()}
                {activeSection === 'abdominal' && renderAbdominal()}
                {activeSection === 'obs' && renderObsGynae()}
                
                {activeSection === 'nervous' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-500" /> Neurological System</h3>
                        <NeuroAssessment data={assessment.neuro} onChange={val => update(['neuro'], val)} />
                        <div className="mt-6 border-t pt-6 dark:border-slate-700">
                            <h4 className="font-bold text-lg mb-4">Cranial Nerves</h4>
                            <CranialNerveAssessment data={assessment.neuro.cranialNerves || []} onChange={val => update(['neuro', 'cranialNerves'], val)} />
                        </div>
                    </div>
                )}

                {activeSection === 'trauma' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><AlertTriangle className="w-6 h-6 text-orange-500" /> Trauma Assessment</h3>
                        <TraumaTriage value={assessment.traumaTriage} onChange={val => update(['traumaTriage'], val)} />
                        {/* ATMIST Prompt */}
                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-sm mb-2">Mechanism Details</h4>
                            <textarea className="input-field h-24 resize-none" placeholder="Speed, height of fall, intrusion, ejection..." value={assessment.traumaTriage?.mechanismDetails || ''} onChange={e => update(['traumaTriage', 'mechanismDetails'], e.target.value)} />
                        </div>
                    </div>
                )}

                {activeSection === 'msk' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><Bone className="w-6 h-6 text-slate-500" /> Musculoskeletal, Skin & Burns</h3>
                        <div className="flex flex-col items-center p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="w-full flex justify-between items-center mb-4">
                                <h4 className="font-bold">Body Map</h4>
                                <button onClick={() => setShowInjuryModal(true)} className="bg-ams-blue text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2"><Plus className="w-4 h-4" /> Add Marker</button>
                            </div>
                            <BodyMap 
                                value={activeDraft.injuries} 
                                onChange={vals => handleNestedUpdate(['injuries'], vals)}
                                mode="injury"
                                onCanvasClick={(x,y,v,l) => { setPendingInjury({x,y,view:v}); setInjuryForm({...injuryForm, location: l}); setShowInjuryModal(true); }}
                                onMarkerClick={(m) => { setPendingInjury(m); setInjuryForm({type: m.type, subtype: m.subtype||'', location: m.location||'', notes: m.notes||''}); setShowInjuryModal(true); }}
                                onImageChange={(url) => handleNestedUpdate(['bodyMapImage'], url)}
                            />
                        </div>
                        
                        <div className="p-6 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-200 dark:border-orange-800">
                            <h4 className="font-bold text-orange-800 dark:text-orange-200 mb-4 flex items-center gap-2"><Flame className="w-5 h-5" /> Burns Assessment</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className="input-label">Est. Weight (kg)</label><input className="input-field" type="number" value={parklandWeight} onChange={e => setParklandWeight(e.target.value)} /></div>
                                <div><label className="input-label">% TBSA</label><input className="input-field" type="number" value={assessment.burns?.estimatedPercentage || ''} onChange={e => update(['burns', 'estimatedPercentage'], e.target.value)} /></div>
                                <div className="col-span-2">
                                    <label className="input-label">Parkland Fluid (24hrs)</label>
                                    <div className="input-field bg-white dark:bg-slate-800 flex items-center font-bold font-mono">
                                        {parklandWeight && assessment.burns?.estimatedPercentage 
                                            ? `${Math.round(4 * Number(parklandWeight) * Number(assessment.burns.estimatedPercentage))} ml` 
                                            : '--'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSection === 'sepsis' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><AlertOctagon className="w-6 h-6 text-red-600" /> Sepsis Screening</h3>
                        <SepsisTool newsScore={activeDraft.vitals.length > 0 ? activeDraft.vitals[activeDraft.vitals.length - 1].news2Score : 0} />
                    </div>
                )}

                {activeSection === 'social' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><PersonStanding className="w-6 h-6 text-green-600" /> Social & Frailty</h3>
                        <ClinicalFrailtyScale value={assessment.cfsScore || 0} onChange={(val) => update(['cfsScore'], val)} />
                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Living Status</label><select className="input-field" value={assessment.social?.livingStatus || ''} onChange={e => update(['social', 'livingStatus'], e.target.value)}><option value="">Select...</option><option>Alone</option><option>Family</option><option>Care Home</option><option>Homeless</option></select></div>
                            <div><label className="input-label">Care Package</label><input className="input-field" placeholder="e.g. QDS Carers" value={assessment.social?.supportDetails || ''} onChange={e => update(['social', 'supportDetails'], e.target.value)} /></div>
                        </div>
                    </div>
                )}

                {activeSection === 'mental' && (
                    <div className="space-y-6 animate-in fade-in">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white border-b pb-2 dark:border-slate-700 flex items-center gap-2"><Smile className="w-6 h-6 text-ams-blue" /> Mental Health</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className="input-label">Appearance</label><textarea className="input-field resize-none" rows={2} value={assessment.mentalHealth?.appearance || ''} onChange={e => update(['mentalHealth', 'appearance'], e.target.value)} /></div>
                            <div><label className="input-label">Behaviour</label><textarea className="input-field resize-none" rows={2} value={assessment.mentalHealth?.behaviour || ''} onChange={e => update(['mentalHealth', 'behaviour'], e.target.value)} /></div>
                            <div><label className="input-label">Speech</label><input className="input-field" value={assessment.mentalHealth?.speech || ''} onChange={e => update(['mentalHealth', 'speech'], e.target.value)} /></div>
                            <div><label className="input-label">Mood</label><input className="input-field" value={assessment.mentalHealth?.mood || ''} onChange={e => update(['mentalHealth', 'mood'], e.target.value)} /></div>
                        </div>
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                            <h4 className="font-bold text-red-800 dark:text-red-200 mb-3 text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Risk Assessment</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <label className="flex items-center gap-2 font-bold cursor-pointer text-sm dark:text-white"><input type="checkbox" className="w-4 h-4 text-red-600 rounded" checked={assessment.mentalHealth?.riskToSelf || false} onChange={e => update(['mentalHealth', 'riskToSelf'], e.target.checked)} /> Risk to Self</label>
                                <label className="flex items-center gap-2 font-bold cursor-pointer text-sm dark:text-white"><input type="checkbox" className="w-4 h-4 text-red-600 rounded" checked={assessment.mentalHealth?.riskToOthers || false} onChange={e => update(['mentalHealth', 'riskToOthers'], e.target.checked)} /> Risk to Others</label>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Injury Modal (Shared across sections) */}
            {showInjuryModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Injury Detail</h3>
                            <button onClick={() => setShowInjuryModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-4 space-y-4">
                            <div><label className="input-label">Type</label><select className="input-field" value={injuryForm.type} onChange={e => setInjuryForm({...injuryForm, type: e.target.value})}><option>Injury</option><option>Pain</option></select></div>
                            <div><label className="input-label">Subtype</label><input className="input-field" value={injuryForm.subtype} onChange={e => setInjuryForm({...injuryForm, subtype: e.target.value})} placeholder="e.g. #, Abrasion, Burn" /></div>
                            <div><label className="input-label">Location</label><input className="input-field" value={injuryForm.location} onChange={e => setInjuryForm({...injuryForm, location: e.target.value})} readOnly /></div>
                            <div><label className="input-label">Notes</label><textarea className="input-field h-20 resize-none" value={injuryForm.notes} onChange={e => setInjuryForm({...injuryForm, notes: e.target.value})} /></div>
                            
                            <div className="flex gap-2 pt-2">
                                {pendingInjury?.id && (
                                    <button 
                                        onClick={() => {
                                            const filtered = (activeDraft.injuries || []).filter(i => i.id !== pendingInjury.id);
                                            handleNestedUpdate(['injuries'], filtered);
                                            setShowInjuryModal(false);
                                        }} 
                                        className="p-3 bg-red-50 text-red-600 rounded-xl"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        const newMark: InjuryMark = {
                                            id: pendingInjury?.id || Date.now().toString(),
                                            x: pendingInjury?.x!,
                                            y: pendingInjury?.y!,
                                            view: pendingInjury?.view!,
                                            type: injuryForm.type as any,
                                            subtype: injuryForm.subtype,
                                            location: injuryForm.location,
                                            notes: injuryForm.notes,
                                            success: true
                                        };
                                        const filtered = (activeDraft.injuries || []).filter(i => i.id !== newMark.id);
                                        handleNestedUpdate(['injuries'], [...filtered, newMark]);
                                        setShowInjuryModal(false);
                                        setPendingInjury(null);
                                    }} 
                                    className="flex-1 py-3 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700 shadow-md"
                                >
                                    Save Marker
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssessmentTab;
