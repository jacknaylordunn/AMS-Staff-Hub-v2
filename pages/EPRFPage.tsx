
import React, { useState, useEffect } from 'react';
import { 
  FilePlus, Cloud, ArrowRight, AlertTriangle, User, ClipboardList, 
  Activity, Pill, Lock, FileText, Signpost, Trash2, Home
} from 'lucide-react';
import { EPRFProvider, useEPRF } from '../context/EPRFContext';
import { generateEPRF_PDF } from '../utils/pdfGenerator';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { EPRF, Shift, PrimarySurvey, NeuroAssessment } from '../types';

// Import New Sub-Components
import IncidentTab from '../components/eprf/IncidentTab';
import PatientTab from '../components/eprf/PatientTab';
import HistoryTab from '../components/eprf/HistoryTab';
import AssessmentTab from '../components/eprf/AssessmentTab';
import GovernanceTab from '../components/eprf/GovernanceTab';
import VitalsTab from '../components/eprf/VitalsTab';
import TreatmentTab from '../components/eprf/TreatmentTab';
import HandoverTab from '../components/eprf/HandoverTab';
import DiagnosisTab from '../components/eprf/DiagnosisTab';

// --- DEFAULTS ---
const DEFAULT_NEURO: NeuroAssessment = {
    gcs: { eyes: 4, verbal: 5, motor: 6, total: 15 },
    pupils: { leftSize: 4, leftReaction: 'Brisk', rightSize: 4, rightReaction: 'Brisk' },
    fast: { face: 'Normal', arms: 'Normal', speech: 'Normal', testPositive: false, time: '' },
    limbs: {
        leftArm: { power: 'Normal', sensation: 'Normal' },
        rightArm: { power: 'Normal', sensation: 'Normal' },
        leftLeg: { power: 'Normal', sensation: 'Normal' },
        rightLeg: { power: 'Normal', sensation: 'Normal' }
    },
    cranialNerves: []
};

const DEFAULT_PRIMARY: PrimarySurvey = {
    catastrophicHaemorrhage: false,
    airway: { status: 'Patent', patency: 'Patent', notes: '', intervention: '' },
    breathing: { 
        rate: '', rhythm: 'Regular', depth: 'Normal', effort: 'Normal', 
        airEntryL: 'Normal', airEntryR: 'Normal', 
        soundsL: 'Clear', soundsR: 'Clear',
        oxygenSats: '', chestExpansion: 'Equal'
    },
    circulation: { radialPulse: 'Present', character: 'Regular', capRefill: '< 2s', skin: 'Normal', temp: 'Warm' },
    disability: { avpu: 'A', pupils: 'PERRLA', bloodGlucose: '' },
    exposure: { injuriesFound: false, rash: false, temp: '' }
};

const DEFAULT_EPRF: Omit<EPRF, 'id' | 'incidentNumber'> = {
    status: 'Draft',
    mode: 'Clinical',
    callSign: '',
    location: '',
    lastUpdated: new Date().toISOString(),
    accessUids: [],
    assistingClinicians: [],
    times: { callReceived: '', mobile: '', onScene: '', patientContact: '', departScene: '', atHospital: '' },
    patient: { firstName: '', lastName: '', dob: '', nhsNumber: '', address: '', gender: '', chronicHypoxia: false },
    history: { presentingComplaint: '', historyOfPresentingComplaint: '', pastMedicalHistory: '', allergies: 'NKDA', medications: '' },
    assessment: { 
        clinicalNarrative: '',
        primary: DEFAULT_PRIMARY, 
        neuro: DEFAULT_NEURO,
        cardiac: { chestPainPresent: false, socrates: { site: '', onset: '', character: '', radiation: '', associations: '', timeCourse: '', exacerbatingRelieving: '', severity: '' }, ecg: { rhythm: '', rate: '', stElevation: false, twelveLeadNotes: '' } },
        respiratory: { cough: '', sputumColor: '', peakFlowPre: '', peakFlowPost: '', nebulisersGiven: false, history: '' },
        gastrointestinal: { abdominalPain: false, painLocation: '', palpation: '', distension: false, bowelSounds: '', lastMeal: '', lastBowelMovement: '', urineOutput: '', nauseaVomiting: false },
        obsGynae: { pregnant: false },
        mentalHealth: { appearance: '', behaviour: '', speech: '', mood: '', riskToSelf: false, riskToOthers: false, capacityStatus: '' },
        burns: { estimatedPercentage: '', depth: '', site: '' },
        sepsis: { 
            screeningTrigger: false, 
            suspectedSource: [], 
            redFlags: [], 
            riskFactors: [], 
            outcome: 'Clear' 
        },
        falls: { 
            historyOfFalls: false, 
            unsteadyWalk: false, 
            visualImpairment: false, 
            alteredMentalState: false, 
            medications: false 
        },
        mobility: { 
            preMorbidMobility: '', 
            currentMobility: '', 
            transferAbility: '', 
            aidsUsed: '' 
        },
        cfsScore: 0,
        wounds: []
    },
    clinicalDecision: { workingImpression: '', differentialDiagnosis: '', managementPlan: '', finalDisposition: '' },
    vitals: [],
    injuries: [],
    treatments: { 
        drugs: [], 
        procedures: [], 
        resusLog: [] 
    },
    governance: { 
        safeguarding: { concerns: false, type: [], details: '' }, 
        capacity: { status: 'Capacity Present', stage1Impairment: false, stage2Functional: { understand: true, retain: true, weigh: true, communicate: true } }, 
        refusal: { isRefusal: false, risksExplained: false, alternativesOffered: false, capacityConfirmed: false, worseningAdviceGiven: false }
    },
    handover: { sbar: '', clinicianSignature: '', patientSignature: '', receivingClinicianName: '', receivingClinicianPin: '', receivingClinicianSignature: '', media: [] },
    logs: []
};

// Grouped Tabs for Layout
const NAV_GROUPS = [
    {
        title: 'Admin',
        items: [
            { id: 'incident', label: 'Incident', icon: AlertTriangle },
            { id: 'patient', label: 'Patient', icon: User },
        ]
    },
    {
        title: 'Clinical',
        items: [
            { id: 'history', label: 'History', icon: FileText },
            { id: 'assessment', label: 'Assessment', icon: ClipboardList },
            { id: 'vitals', label: 'Vitals', icon: Activity },
            { id: 'treatment', label: 'Interventions', icon: Pill },
        ]
    },
    {
        title: 'Outcome',
        items: [
            { id: 'diagnosis', label: 'Diagnosis & Plan', icon: Signpost },
            { id: 'governance', label: 'Governance', icon: Lock },
            { id: 'handover', label: 'Handover', icon: FileText }
        ]
    }
];

const EPRFContent = ({ drafts, createDraft, availableShifts }: any) => {
    const { activeDraft, setActiveDraft, deleteCurrentDraft } = useEPRF();
    const [activeTab, setActiveTab] = useState('incident');
    const [showShiftModal, setShowShiftModal] = useState(false);

    const handleStartNew = () => {
        if (availableShifts.length > 0) {
            setShowShiftModal(true);
        } else {
            createDraft(null); // Emergency Mode default
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to permanently delete this ePRF draft? This cannot be undone.")) {
            await deleteCurrentDraft();
        }
    };

    if (!activeDraft) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 animate-in fade-in">
                <div className="w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                    <FilePlus className="w-10 h-10 text-ams-blue" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">ePRF Management</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <button onClick={handleStartNew} className="p-6 bg-ams-blue text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-left group">
                        <h3 className="font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">Create New Record</h3>
                        <p className="text-blue-100 text-sm">Start a blank ePRF for a new incident.</p>
                    </button>
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-500 uppercase ml-1">Recent Drafts</h3>
                        {drafts.length === 0 && <p className="text-slate-400 text-sm italic">No open drafts.</p>}
                        {drafts.map((d: any) => (
                            <div key={d.id} onClick={() => setActiveDraft(d)} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-ams-blue cursor-pointer transition-colors shadow-sm">
                                <div className="flex justify-between items-start">
                                    <span className="font-bold text-slate-800 dark:text-white">{d.incidentNumber}</span>
                                    <span className="text-xs text-slate-400">{new Date(d.lastUpdated).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">{d.location || 'No Location Set'} • {d.patient?.lastName || 'Unknown Pt'}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {showShiftModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in zoom-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Select Incident Context</h3>
                            <div className="space-y-3">
                                {availableShifts.map((s: Shift) => (
                                    <button key={s.id} onClick={() => { createDraft(s.id); setShowShiftModal(false); }} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-ams-blue transition-colors">
                                        <div className="font-bold text-slate-800 dark:text-white">{s.location}</div>
                                        <div className="text-xs text-slate-500">{s.start.toLocaleTimeString()} - {s.end.toLocaleTimeString()}</div>
                                    </button>
                                ))}
                                <button onClick={() => { createDraft(null); setShowShiftModal(false); }} className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                    <div className="font-bold text-red-700 dark:text-red-400">Emergency / No Shift</div>
                                    <div className="text-xs text-red-600 dark:text-red-300">Create off-rota record</div>
                                </button>
                            </div>
                            <button onClick={() => setShowShiftModal(false)} className="mt-4 w-full py-2 text-slate-500 font-bold">Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Determine visible content based on mode logic
    const renderTabContent = () => {
        switch(activeTab) {
            case 'incident': return <IncidentTab />;
            case 'patient': return <PatientTab />;
            case 'history': return <HistoryTab />;
            case 'assessment': return <AssessmentTab />;
            case 'vitals': return <VitalsTab />;
            case 'treatment': return <TreatmentTab />;
            case 'diagnosis': return <DiagnosisTab />;
            case 'governance': return <GovernanceTab />;
            case 'handover': return <HandoverTab />;
            default: return <IncidentTab />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-black">
            {/* Sidebar Navigation */}
            <div className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col hidden lg:flex z-50">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <button onClick={() => setActiveDraft(null)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-ams-blue mb-2">
                        <ArrowRight className="w-3 h-3 rotate-180" /> Back to List
                    </button>
                    <h2 className="font-bold text-xl text-slate-800 dark:text-white tracking-tight">{activeDraft.incidentNumber}</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${activeDraft.status === 'Submitted' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        <p className="text-xs text-slate-500 uppercase font-bold">{activeDraft.status}</p>
                    </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {NAV_GROUPS.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 pl-2">{group.title}</h4>
                            <div className="space-y-1">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                            activeTab === item.id 
                                            ? 'bg-ams-blue text-white shadow-md' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <item.icon className={`w-4 h-4 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                    <button onClick={() => generateEPRF_PDF(activeDraft)} className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold mb-2">Export PDF</button>
                    <button onClick={handleDelete} className="w-full py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                        <Trash2 className="w-3 h-3" /> Delete Draft
                    </button>
                </div>
            </div>

            {/* Mobile / Tablet Top Nav (Horizontal Fallback) */}
            <div className="lg:hidden flex flex-col flex-1 h-full">
                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 sticky top-0 z-40">
                    <div className="flex items-center justify-between mb-3">
                        <div onClick={() => setActiveDraft(null)} className="flex items-center gap-2 cursor-pointer">
                            <ArrowRight className="w-5 h-5 rotate-180 text-slate-500" />
                            <div>
                                <h2 className="font-bold text-sm text-slate-800 dark:text-white">{activeDraft.incidentNumber}</h2>
                                <p className="text-[10px] text-slate-500">{activeDraft.status} • {activeDraft.location?.substring(0,20)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => generateEPRF_PDF(activeDraft)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg"><FileText className="w-4 h-4" /></button>
                            <button onClick={handleDelete} className="p-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="overflow-x-auto no-scrollbar pb-1">
                        <div className="flex gap-2 min-w-max">
                            {NAV_GROUPS.flatMap(g => g.items).map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap ${
                                        activeTab === item.id ? 'bg-ams-blue text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                    }`}
                                >
                                    <item.icon className="w-3 h-3" /> {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black p-4">
                    {renderTabContent()}
                </div>
            </div>

            {/* Desktop Content Area */}
            <div className="hidden lg:block flex-1 h-full overflow-y-auto bg-slate-50 dark:bg-black p-8">
                <div className="max-w-5xl mx-auto">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

const EPRFPage = () => {
    const { user } = useAuth();
    const [drafts, setDrafts] = useState<any[]>([]);
    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [initialDraft, setInitialDraft] = useState<EPRF | null>(null);

    // Fetch Drafts
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'eprfs'), where('accessUids', 'array-contains', user.uid));
        const unsub = onSnapshot(q, (snap) => {
            const loaded = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setDrafts(loaded);
        });
        return () => unsub();
    }, [user]);

    // Fetch Active Shifts for Linking
    useEffect(() => {
        if (!user) return;
        const fetchShifts = async () => {
            const now = new Date();
            const start = new Date(now); start.setHours(0,0,0,0);
            const end = new Date(now); end.setHours(23,59,59,999);
            
            const q = query(
                collection(db, 'shifts'), 
                where('start', '>=', Timestamp.fromDate(start)),
                where('start', '<=', Timestamp.fromDate(end))
            );
            const snap = await getDocs(q);
            const shifts = snap.docs.map(d => ({id: d.id, ...d.data(), start: d.data().start.toDate(), end: d.data().end.toDate()} as Shift));
            setAvailableShifts(shifts.filter(s => s.slots.some(slot => slot.userId === user.uid)));
        };
        fetchShifts();
    }, [user]);

    const handleCreateDraft = (shiftId: string | null) => {
        if (!user) return;
        
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const xxxx = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        const incidentNumber = `AMS${yyyy}${mm}${xxxx}`;

        const newDraft: EPRF = {
            id: Date.now().toString(),
            incidentNumber,
            // Ensure null not undefined for Firestore compatibility
            shiftId: shiftId || undefined, 
            ...DEFAULT_EPRF,
            accessUids: [user.uid],
            assistingClinicians: [{ uid: user.uid, name: user.name, role: user.role, badgeNumber: user.employeeId || '' }]
        };
        setInitialDraft(newDraft);
    };

    return (
        <EPRFProvider initialDraft={initialDraft}>
            <EPRFContent drafts={drafts} createDraft={handleCreateDraft} availableShifts={availableShifts} />
        </EPRFProvider>
    );
};

export default EPRFPage;
