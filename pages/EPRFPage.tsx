import React, { useState, useEffect, useMemo } from 'react';
import { 
  FilePlus, Cloud, ArrowRight, AlertTriangle, User, ClipboardList, 
  Activity, Pill, Lock, FileText, Signpost, Trash2, Home, Stethoscope, Printer, Loader2, ChevronRight, ChevronLeft, Check, Plus, X, ShieldAlert, Filter, Database, Download, AlertOctagon, FileCheck, Eye
} from 'lucide-react';
import { EPRFProvider, useEPRF } from '../context/EPRFContext';
import { generateEPRF_PDF, generateSafeguardingPDF, generateGPReferral } from '../utils/pdfGenerator';
import { useAuth } from '../hooks/useAuth';
import { useDataSync } from '../hooks/useDataSync';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, Timestamp, orderBy, limit, doc } from 'firebase/firestore';
import { EPRF, Shift, PrimarySurvey, NeuroAssessment, TimeRecord, Role } from '../types';
import { useToast } from '../context/ToastContext';
import { searchPatientRecords, exportPatientData, deletePatientData } from '../utils/compliance';

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
import PrimarySurveyTab from '../components/eprf/PrimarySurveyTab';
import RefusalTab from '../components/eprf/RefusalTab';
import DocumentViewerModal from '../components/DocumentViewerModal';

const DEFAULT_NEURO: NeuroAssessment = {
    gcs: { eyes: undefined, verbal: undefined, motor: undefined, total: undefined },
    pupils: { leftSize: undefined, leftReaction: undefined, rightSize: undefined, rightReaction: undefined },
    fast: { face: null, arms: null, speech: null, testPositive: false, time: '' },
    limbs: {
        leftArm: { power: '', sensation: '' },
        rightArm: { power: '', sensation: '' },
        leftLeg: { power: '', sensation: '' },
        rightLeg: { power: '', sensation: '' }
    },
    cranialNerves: []
};

const DEFAULT_PRIMARY: PrimarySurvey = {
    catastrophicHaemorrhage: undefined,
    airway: { status: '', patency: undefined, notes: '', intervention: '' },
    breathing: { 
        rate: '', rhythm: '', depth: '', effort: '', 
        airEntryL: '', airEntryR: '', 
        soundsL: '', soundsR: '',
        oxygenSats: '', chestExpansion: undefined
    },
    circulation: { radialPulse: '', character: '', capRefill: '', skin: '', color: '', systolicBP: '', diastolicBP: '', temp: '' },
    disability: { avpu: '', gcs: '', pupils: '', bloodGlucose: '' },
    exposure: { injuriesFound: false, rash: false, temp: '' }
};

const DEFAULT_EPRF: Omit<EPRF, 'id' | 'incidentNumber' | 'userId'> = {
    status: 'Draft',
    mode: 'Clinical',
    callSign: '',
    location: '',
    lastUpdated: new Date().toISOString(),
    accessUids: [],
    assistingClinicians: [],
    times: { incidentDate: '', callReceived: '', mobile: '', onScene: '', patientContact: '', departScene: '', atHospital: '', clear: '' },
    patient: { firstName: '', lastName: '', dob: '', nhsNumber: '', address: '', postcode: '', gender: '', chronicHypoxia: false, dnacpr: { hasDNACPR: false, verified: false } },
    history: { presentingComplaint: '', historyOfPresentingComplaint: '', pastMedicalHistory: '', allergies: '', medications: '' },
    assessment: { 
        clinicalNarrative: '',
        primary: DEFAULT_PRIMARY, 
        neuro: DEFAULT_NEURO,
        cardiac: { chestPainPresent: false, socrates: { site: '', onset: '', character: '', radiation: '', associations: '', timeCourse: '', exacerbatingRelieving: '', severity: '' }, ecg: { time: '', rhythm: '', rate: '', stChanges: false, twelveLeadNotes: '' } },
        respiratory: { cough: '', sputumColor: '', peakFlowPre: '', peakFlowPost: '', nebulisersGiven: false, history: '', airEntry: '', addedSounds: '', accessoryMuscleUse: false },
        gastrointestinal: { abdominalPain: false, painLocation: '', palpation: '', distension: '', bowelSounds: '', lastMeal: '', lastBowelMovement: '', urineOutput: '', nausea: false, vomiting: false, diarrhoea: false, vomitDescription: '', stoolDescription: '' },
        obsGynae: { pregnant: false },
        mentalHealth: { appearance: '', behaviour: '', speech: '', mood: '', riskToSelf: false, riskToOthers: false, capacityStatus: '' },
        burns: { estimatedPercentage: '', depth: '', site: '' },
        sepsis: { screeningTrigger: false, suspectedSource: [], redFlags: [], riskFactors: [], outcome: 'Clear' },
        falls: { historyOfFalls: false, unsteadyWalk: false, visualImpairment: false, alteredMentalState: false, medications: false },
        mobility: { preMorbidMobility: '', currentMobility: '', transferAbility: '', aidsUsed: '' },
        cfsScore: undefined,
        wounds: []
    },
    clinicalDecision: { workingImpression: '', differentialDiagnosis: '', managementPlan: '', finalDisposition: '' },
    vitals: [],
    injuries: [],
    treatments: { drugs: [], procedures: [], resusLog: [] },
    governance: { 
        safeguarding: { concerns: false, category: '', type: [], details: '', referralMade: false, referralReference: '' }, 
        capacity: { status: 'Not Assessed', stage1: { impairment: undefined, nexus: undefined }, stage2Functional: { understand: true, retain: true, weigh: true, communicate: true }, bestInterestsRationale: '' }, 
        refusal: { isRefusal: false, type: 'Conveyance', details: '', risksExplained: false, alternativesOffered: false, capacityConfirmed: false, worseningAdviceGiven: false, patientRefusedToSign: false }
    },
    handover: { handoverType: '', receivingName: '', receivingPin: '', receivingTime: '', sbar: '', clinicianSignature: '', patientSignature: '', receivingClinicianSignature: '', media: [], digitalToken: '' },
    logs: []
};

const getNavGroups = (mode: 'Clinical' | 'Welfare' | 'Minor') => {
    const base = [
        {
            title: 'Context',
            items: [
                { id: 'incident', label: 'Incident', icon: AlertTriangle },
                { id: 'patient', label: 'Patient', icon: User },
            ]
        }
    ];

    if (mode === 'Clinical') {
        return [
            ...base,
            {
                title: 'Assessment',
                items: [
                    { id: 'primary', label: 'Primary Survey', icon: Stethoscope },
                    { id: 'history', label: 'History', icon: FileText },
                    { id: 'vitals', label: 'Vitals', icon: Activity },
                    { id: 'assessment', label: 'Examination', icon: ClipboardList },
                ]
            },
            {
                title: 'Management',
                items: [
                    { id: 'treatment', label: 'Interventions', icon: Pill },
                    { id: 'diagnosis', label: 'Decision', icon: Signpost },
                    { id: 'refusal', label: 'Refusals', icon: ShieldAlert },
                    { id: 'governance', label: 'Governance', icon: Lock },
                    { id: 'handover', label: 'Handover', icon: FileText }
                ]
            }
        ];
    }

    if (mode === 'Welfare') {
        return [
            ...base,
            {
                title: 'Welfare Check',
                items: [
                    { id: 'history', label: 'Situation', icon: FileText },
                    { id: 'assessment', label: 'Assessment', icon: ClipboardList }, 
                    { id: 'treatment', label: 'Actions / Log', icon: Pill }, 
                ]
            },
            {
                title: 'Outcome',
                items: [
                    { id: 'diagnosis', label: 'Outcome', icon: Signpost },
                    { id: 'refusal', label: 'Refusals', icon: ShieldAlert },
                    { id: 'handover', label: 'Handover', icon: FileText }
                ]
            }
        ];
    }

    return [
        ...base,
        {
            title: 'Minor Injury',
            items: [
                { id: 'history', label: 'History', icon: FileText },
                { id: 'assessment', label: 'Examination', icon: ClipboardList },
                { id: 'vitals', label: 'Vitals', icon: Activity },
                { id: 'treatment', label: 'Treatment', icon: Pill },
            ]
        },
        {
            title: 'Outcome',
            items: [
                { id: 'diagnosis', label: 'Discharge', icon: Signpost },
                { id: 'refusal', label: 'Refusals', icon: ShieldAlert },
                { id: 'governance', label: 'Governance', icon: Lock },
                { id: 'handover', label: 'Handover', icon: FileText }
            ]
        }
    ];
};

const EPRFContent = ({ drafts, createDraft, availableShifts, loading, user, viewAll, setViewAll, setShowComplianceModal }: any) => {
    const { activeDraft, setActiveDraft, deleteCurrentDraft } = useEPRF();
    const { toast } = useToast();
    const [activeTab, setActiveTab] = useState('incident');
    const [showShiftModal, setShowShiftModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    
    // Multi-Tab Management
    const [openDrafts, setOpenDrafts] = useState<EPRF[]>([]);
    
    // PDF Viewer State
    const [viewingPdf, setViewingPdf] = useState<{url: string, title: string} | null>(null);

    useEffect(() => {
        if (activeDraft) {
            setOpenDrafts(prev => {
                if (prev.some(d => d.id === activeDraft.id)) return prev;
                return [...prev, activeDraft];
            });
        }
    }, [activeDraft]);

    const closeDraft = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const newOpen = openDrafts.filter(d => d.id !== id);
        setOpenDrafts(newOpen);
        if (activeDraft?.id === id) {
            setActiveDraft(newOpen.length > 0 ? newOpen[newOpen.length - 1] : null);
        }
    };

    const navGroups = useMemo(() => getNavGroups(activeDraft?.mode || 'Clinical'), [activeDraft?.mode]);

    const handleCreate = async (shiftId: string | null) => {
        const newDraft = await createDraft(shiftId);
        if (newDraft) setActiveDraft(newDraft);
        setShowShiftModal(false);
    };

    const handleStartNew = () => {
        const activeShift = availableShifts.find((s: Shift) => {
            if (!s.timeRecords || !user) return false;
            const record = s.timeRecords[user.uid];
            return record && record.clockInTime && !record.clockOutTime;
        });

        if (activeShift) {
            handleCreate(activeShift.id);
        } else {
            setShowShiftModal(true);
        }
    };

    const handleDelete = async () => {
        if (confirm("Are you sure you want to permanently delete this ePRF draft?")) {
            await deleteCurrentDraft();
            setOpenDrafts(prev => prev.filter(d => d.id !== activeDraft?.id));
        }
    };

    const handleRecordClick = (record: EPRF) => {
        if (record.status === 'Submitted') {
            // STRICT: Submitted records allow PDF View ONLY. No form access.
            if (record.pdfUrl) {
                setViewingPdf({ url: record.pdfUrl, title: `Record ${record.incidentNumber}` });
            } else {
                toast.error("PDF not available for this record.");
            }
        } else {
            // Drafts open in the editor
            setActiveDraft(record);
        }
    };

    // --- DASHBOARD VIEW (NO ACTIVE DRAFT) ---
    if (!activeDraft) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 animate-in fade-in bg-slate-50 dark:bg-black p-4 relative">
                
                {/* Manager Tools - ONLY VISIBLE HERE */}
                {(user?.role === 'Manager' || user?.role === 'Admin') && (
                    <div className="absolute top-4 right-4 flex gap-2">
                        <button 
                            onClick={() => setShowComplianceModal(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl shadow-lg font-bold text-xs hover:bg-slate-700"
                        >
                            <Database className="w-3 h-3" /> Data Compliance
                        </button>
                        <button 
                            onClick={() => setViewAll(!viewAll)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-lg font-bold text-xs transition-colors ${viewAll ? 'bg-ams-blue text-white' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-white'}`}
                        >
                            <Filter className="w-3 h-3" /> {viewAll ? 'Submitted Records' : 'My Records'}
                        </button>
                    </div>
                )}

                <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center shadow-lg">
                    <FilePlus className="w-10 h-10 text-ams-blue" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white">ePRF Workspace</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-4xl">
                    <button onClick={handleStartNew} className="p-6 bg-ams-blue text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-all text-left group">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-lg mb-1 group-hover:translate-x-1 transition-transform">Create New Record</h3>
                                <p className="text-blue-100 text-sm">Start a blank ePRF for a new incident.</p>
                            </div>
                            <Plus className="w-6 h-6 bg-white/20 rounded-full p-1" />
                        </div>
                    </button>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm h-96 flex flex-col">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="text-sm font-bold text-slate-500 uppercase">
                                {viewAll ? 'Submitted Records' : 'Your Open Drafts'}
                            </h3>
                        </div>
                        {loading ? (
                            <div className="flex justify-center p-4 flex-1 items-center"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : drafts.length === 0 ? (
                            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm italic">No records found.</div>
                        ) : (
                            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                                {drafts.map((d: any) => (
                                    <div key={d.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-ams-blue group transition-all">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-slate-800 dark:text-white text-sm">{d.incidentNumber}</span>
                                                <span className={`text-[10px] px-1.5 rounded ${d.status === 'Submitted' ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>{d.status}</span>
                                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 rounded text-slate-600 dark:text-slate-300">{d.mode}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{d.location || 'No Location'} • {new Date(d.lastUpdated).toLocaleDateString()}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleRecordClick(d)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg shadow-sm flex items-center gap-1 transition-colors ${
                                                d.status === 'Submitted' 
                                                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400' 
                                                : 'bg-white dark:bg-slate-700 text-ams-blue dark:text-white hover:bg-blue-50 dark:hover:bg-slate-600'
                                            }`}
                                        >
                                            {d.status === 'Submitted' ? <><Lock className="w-3 h-3" /> View PDF</> : <><FileText className="w-3 h-3" /> Edit</>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {showShiftModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 animate-in zoom-in">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">Select Incident Context</h3>
                            <div className="space-y-3">
                                {availableShifts.map((s: Shift) => (
                                    <button key={s.id} onClick={() => handleCreate(s.id)} className="w-full text-left p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-ams-blue transition-colors">
                                        <div className="font-bold text-slate-800 dark:text-white">{s.location}</div>
                                        <div className="text-xs text-slate-500">{s.start.toLocaleTimeString()} - {s.end.toLocaleTimeString()}</div>
                                    </button>
                                ))}
                                <button onClick={() => handleCreate(null)} className="w-full text-left p-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                    <div className="font-bold text-red-700 dark:text-red-400">Emergency / No Shift</div>
                                    <div className="text-xs text-red-600 dark:text-red-300">Create off-rota record</div>
                                </button>
                            </div>
                            <button onClick={() => setShowShiftModal(false)} className="mt-4 w-full py-2 text-slate-500 font-bold">Cancel</button>
                        </div>
                    </div>
                )}

                {/* PDF Viewer for Submitted Records */}
                {viewingPdf && (
                    <DocumentViewerModal 
                        url={viewingPdf.url} 
                        title={viewingPdf.title} 
                        onClose={() => setViewingPdf(null)} 
                    />
                )}
            </div>
        );
    }

    // --- FORM VIEW (ACTIVE DRAFT) ---
    const renderTabContent = () => {
        switch(activeTab) {
            case 'incident': return <IncidentTab />;
            case 'patient': return <PatientTab />;
            case 'primary': return <PrimarySurveyTab />;
            case 'history': return <HistoryTab />;
            case 'assessment': return <AssessmentTab />;
            case 'vitals': return <VitalsTab />;
            case 'treatment': return <TreatmentTab />;
            case 'diagnosis': return <DiagnosisTab />;
            case 'refusal': return <RefusalTab />;
            case 'governance': return <GovernanceTab />;
            case 'handover': return <HandoverTab />;
            default: return <IncidentTab />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-black">
            <div className="w-56 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col z-50">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                    <h2 className="font-bold text-sm text-slate-800 dark:text-white tracking-tight px-1">Navigation</h2>
                    <button onClick={() => setActiveDraft(null)} className="text-slate-400 hover:text-slate-600"><Home className="w-4 h-4" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                    {navGroups.map((group, idx) => (
                        <div key={idx}>
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 pl-2">{group.title}</h4>
                            <div className="space-y-0.5">
                                {group.items.map(item => (
                                    <button
                                        key={item.id}
                                        onClick={() => setActiveTab(item.id)}
                                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                                            activeTab === item.id 
                                            ? 'bg-ams-blue text-white shadow-sm' 
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <item.icon className={`w-3.5 h-3.5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                    <div className="relative">
                        <button onClick={() => setShowExportMenu(!showExportMenu)} className="w-full py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                            <Printer className="w-3 h-3" /> Export
                        </button>
                        {showExportMenu && (
                            <div className="absolute bottom-full left-0 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 mb-2 overflow-hidden animate-in slide-in-from-bottom-2 z-50">
                                <button onClick={() => { generateEPRF_PDF(activeDraft); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 dark:text-white">Full Clinical Record</button>
                                <button onClick={() => { generateGPReferral(activeDraft); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 border-b dark:border-slate-700 dark:text-white">GP Referral Letter</button>
                                <button onClick={() => { generateSafeguardingPDF(activeDraft); setShowExportMenu(false); }} className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700 text-red-600">Safeguarding Form</button>
                            </div>
                        )}
                    </div>
                    {(activeDraft.status !== 'Submitted' || user?.role === 'Manager' || user?.role === 'Admin') && (
                        <button onClick={handleDelete} className="w-full py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2">
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-black relative overflow-hidden">
                <div className="flex items-center bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2 h-12 flex-shrink-0 overflow-x-auto no-scrollbar">
                    {openDrafts.map(draft => (
                        <div 
                            key={draft.id}
                            onClick={() => setActiveDraft(draft)}
                            className={`flex items-center gap-2 px-3 py-1.5 mr-2 rounded-t-lg border-t border-x cursor-pointer transition-all min-w-[140px] max-w-[200px] ${
                                activeDraft.id === draft.id 
                                ? 'bg-slate-50 dark:bg-black border-slate-200 dark:border-slate-800 border-b-transparent text-ams-blue relative top-[1px]' 
                                : 'bg-slate-100 dark:bg-slate-800 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            <span className="text-xs font-bold truncate flex-1">{draft.incidentNumber}</span>
                            <button onClick={(e) => closeDraft(e, draft.id)} className="hover:bg-slate-300 dark:hover:bg-slate-600 rounded-full p-0.5">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                    <button onClick={() => setActiveDraft(null)} className="p-1.5 ml-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg" title="Back to Workspace">
                        <Plus className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24">
                    <div className="max-w-5xl mx-auto">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DataComplianceModal = ({ onClose }: { onClose: () => void }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<EPRF[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const { toast } = useToast();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchTerm) return;
        setIsSearching(true);
        try {
            const data = await searchPatientRecords(searchTerm);
            setResults(data);
        } catch (e) {
            toast.error("Search failed");
        } finally {
            setIsSearching(false);
        }
    };

    const handleExport = async () => {
        if (results.length === 0) return;
        try {
            await exportPatientData(results);
            toast.success("SAR Exported Successfully");
        } catch (e) {
            toast.error("Export Failed");
        }
    };

    const handleDelete = async () => {
        if (results.length === 0) return;
        const confirmMsg = `WARNING: This will permanently delete ${results.length} record(s). Type 'DELETE' to confirm.`;
        if (prompt(confirmMsg) === 'DELETE') {
            try {
                await deletePatientData(results.map(r => r.id));
                toast.success("Records Deleted");
                setResults([]);
            } catch (e) {
                toast.error("Deletion Failed");
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in zoom-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-ams-blue" /> Data Compliance Tool
                    </h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-6">
                    <p className="text-sm text-slate-500 mb-4">Use this tool to fulfill Subject Access Requests (SAR) or Data Erasure requests.</p>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <input 
                            className="flex-1 p-3 border rounded-xl bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white outline-none"
                            placeholder="Enter NHS Number or Surname..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                        <button type="submit" disabled={isSearching} className="px-6 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-700">
                            {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
                        </button>
                    </form>

                    {results.length > 0 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-900">
                                <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-2">Found {results.length} Records</h4>
                                <ul className="text-xs text-blue-700 dark:text-blue-200 space-y-1 max-h-40 overflow-y-auto">
                                    {results.map(r => <li key={r.id}>{new Date(r.lastUpdated).toLocaleDateString()} - {r.incidentNumber}</li>)}
                                </ul>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={handleExport} className="flex-1 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2">
                                    <Download className="w-4 h-4" /> Export (SAR)
                                </button>
                                <button onClick={handleDelete} className="flex-1 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-xl font-bold text-red-600 dark:text-red-300 flex items-center justify-center gap-2">
                                    <AlertOctagon className="w-4 h-4" /> Erase
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const EPRFPage = () => {
    const { user } = useAuth();
    const { saveEPRF } = useDataSync();
    const [drafts, setDrafts] = useState<EPRF[]>([]);
    const [availableShifts, setAvailableShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewAll, setViewAll] = useState(false);
    const [showComplianceModal, setShowComplianceModal] = useState(false);

    useEffect(() => {
        if (!user) return;

        let qDrafts;
        
        if (viewAll && (user.role === 'Manager' || user.role === 'Admin')) {
            qDrafts = query(
                collection(db, 'eprfs'),
                where('status', '==', 'Submitted'),
                orderBy('lastUpdated', 'desc'),
                limit(50)
            );
        } else {
            // Regular users only see drafts, submitted ones vanish from list (but accessible via patient search)
            qDrafts = query(
                collection(db, 'eprfs'),
                where('userId', '==', user.uid),
                where('status', '!=', 'Submitted'),
                orderBy('status'), // Composite index required: userId + status
                orderBy('lastUpdated', 'desc')
            );
        }

        const unsubDrafts = onSnapshot(qDrafts, (snap) => {
            setDrafts(snap.docs.map(d => ({ id: d.id, ...d.data() } as EPRF)));
            setLoading(false);
        }, (err) => {
            console.error(err);
            setLoading(false);
        });

        const now = new Date();
        const start = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const qShifts = query(collection(db, 'shifts'), where('start', '>=', Timestamp.fromDate(start)));
        
        getDocs(qShifts).then(snap => {
            setAvailableShifts(snap.docs.map(d => ({ id: d.id, ...d.data(), start: d.data().start.toDate(), end: d.data().end.toDate() } as Shift)));
        });

        return () => unsubDrafts();
    }, [user, viewAll]);

    const handleCreateDraft = async (shiftId: string | null) => {
        if (!user) return null;
        const now = new Date();
        const incidentNumber = `AMS-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9999).toString().padStart(4,'0')}`;
        
        const newDraft = {
            ...DEFAULT_EPRF,
            id: Date.now().toString(),
            incidentNumber,
            userId: user.uid,
            accessUids: [user.uid],
            shiftId: shiftId || undefined,
            status: 'Draft',
            lastUpdated: new Date().toISOString(),
            patient: { ...DEFAULT_EPRF.patient },
            history: { ...DEFAULT_EPRF.history },
            assessment: { ...DEFAULT_EPRF.assessment, primary: { ...DEFAULT_PRIMARY }, neuro: { ...DEFAULT_NEURO } },
            clinicalDecision: { ...DEFAULT_EPRF.clinicalDecision },
            governance: { ...DEFAULT_EPRF.governance },
            handover: { ...DEFAULT_EPRF.handover },
            vitals: [],
            injuries: [],
            treatments: { drugs: [], procedures: [] },
            logs: []
        };
        await saveEPRF(newDraft, true);
        return newDraft as EPRF;
    };

    return (
        <EPRFProvider initialDraft={null}>
            <EPRFContent 
                drafts={drafts} 
                createDraft={handleCreateDraft} 
                availableShifts={availableShifts} 
                loading={loading}
                user={user} 
                viewAll={viewAll}
                setViewAll={setViewAll}
                setShowComplianceModal={setShowComplianceModal}
            />
            {showComplianceModal && <DataComplianceModal onClose={() => setShowComplianceModal(false)} />}
        </EPRFProvider>
    );
};

export default EPRFPage;