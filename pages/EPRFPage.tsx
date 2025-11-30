
import React, { useState, useEffect, useRef } from 'react';
import { Save, Activity, User, AlertTriangle, Bot, Pill, FileText, ClipboardList, Plus, Lock, Search, Cloud, ShieldCheck, Sparkles, Loader2, Camera, Trash2, X, Eye, Gauge, Brain, Stethoscope, Syringe, Briefcase, FilePlus, Zap, Clock, MessageSquare, Menu, CheckCircle, AlertOctagon, UserPlus, Coffee, Moon, ThumbsUp, ThumbsDown, Droplets, ChevronRight, ShieldAlert, MoreVertical, Key, Users, WifiOff, Wifi, PenTool, ClipboardCheck, ArrowRight, UserCheck, Calculator, Thermometer, Wind, Baby, Heart, Bone, Smile } from 'lucide-react';
import BodyMap from '../components/BodyMap';
import SignaturePad from '../components/SignaturePad';
import VitalsChart from '../components/VitalsChart';
import AuditSummaryModal from '../components/AuditSummaryModal';
import SpeechTextArea from '../components/SpeechTextArea';
import Timeline from '../components/Timeline';
import WitnessModal from '../components/WitnessModal';
import NeuroAssessment from '../components/NeuroAssessment';
import TraumaTriage from '../components/TraumaTriage';
import { generateSBAR, auditEPRF, analyzeSafeguarding } from '../services/geminiService';
import { VitalsEntry, EPRF, Role, NeuroAssessment as NeuroType, DrugAdministration, Procedure, PrimarySurvey, Patient, AssistingClinician, User as UserType } from '../types';
import { DRUG_DATABASE, CONTROLLED_DRUGS } from '../data/drugDatabase';
import { generateEPRF_PDF } from '../utils/pdfGenerator';
import { useAuth } from '../hooks/useAuth';
import { useDataSync } from '../hooks/useDataSync';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DEFAULT_NEURO: NeuroType = {
    gcs: { eyes: 4, verbal: 5, motor: 6, total: 15 },
    pupils: { leftSize: 4, leftReaction: 'Brisk', rightSize: 4, rightReaction: 'Brisk' },
    fast: { face: 'Normal', arms: 'Normal', speech: 'Normal', testPositive: false, time: '' },
    limbs: {
        leftArm: { power: 'Normal', sensation: 'Normal' },
        rightArm: { power: 'Normal', sensation: 'Normal' },
        leftLeg: { power: 'Normal', sensation: 'Normal' },
        rightLeg: { power: 'Normal', sensation: 'Normal' }
    }
};

const DEFAULT_PRIMARY: PrimarySurvey = {
    airway: { status: 'Patent', notes: '', intervention: '' },
    breathing: { 
        rate: '', rhythm: 'Regular', depth: 'Normal', effort: 'Normal', 
        airEntryL: 'Normal', airEntryR: 'Normal', 
        soundsL: 'Clear', soundsR: 'Clear',
        oxygenSats: '' 
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
        primary: DEFAULT_PRIMARY, 
        neuro: DEFAULT_NEURO,
        cardiac: { chestPainPresent: false, socrates: { site: '', onset: '', character: '', radiation: '', associations: '', timeCourse: '', exacerbatingRelieving: '', severity: '' }, ecg: { rhythm: '', rate: '', stElevation: false, twelveLeadNotes: '' } },
        respiratory: { cough: '', sputumColor: '', peakFlowPre: '', peakFlowPost: '', nebulisersGiven: false, history: '' },
        gastrointestinal: { abdominalPain: false, painLocation: '', palpation: '', distension: false, bowelSounds: '', lastMeal: '', lastBowelMovement: '', urineOutput: '', nauseaVomiting: false },
        obsGynae: { pregnant: false },
        mentalHealth: { appearance: '', behaviour: '', speech: '', mood: '', riskToSelf: false, riskToOthers: false, capacityStatus: '' },
        burns: { estimatedPercentage: '', depth: '', site: '' }
    },
    vitals: [],
    injuries: [],
    treatments: { drugs: [], procedures: [] },
    governance: { 
        safeguarding: { concerns: false, type: '', details: '' }, 
        capacity: { status: 'Capacity Present', stage1Impairment: false, stage2Functional: { understand: true, retain: true, weigh: true, communicate: true } }, 
        discharge: '',
        refusal: { isRefusal: false, risksExplained: false, alternativesOffered: false, capacityConfirmed: false, worseningAdviceGiven: false }
    },
    handover: { sbar: '', clinicianSignature: '', patientSignature: '', receivingClinicianName: '', receivingClinicianPin: '', receivingClinicianSignature: '', media: [] },
    logs: []
};

const TABS = [
    { id: 'incident', label: 'Incident', icon: AlertTriangle },
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'assessment', label: 'Assessment', icon: ClipboardList },
    { id: 'vitals', label: 'Vitals', icon: Activity },
    { id: 'treatment', label: 'Treatment', icon: Pill },
    { id: 'governance', label: 'Governance', icon: Lock },
    { id: 'handover', label: 'Handover', icon: FileText }
];

const ASSESSMENT_SUBTABS = [
    { id: 'general', label: 'General', icon: Stethoscope },
    { id: 'nervous', label: 'Nervous System', icon: Brain },
    { id: 'cardiac', label: 'Cardiac', icon: Heart },
    { id: 'resp', label: 'Respiratory', icon: Wind },
    { id: 'gi_gu', label: 'GI / GU', icon: Coffee },
    { id: 'obs', label: 'Obs/Gynae', icon: Baby },
    { id: 'msk', label: 'MSK / Wounds', icon: Bone },
    { id: 'mental', label: 'Mental Health', icon: Smile }
];

const calculateNEWS2 = (v: Partial<VitalsEntry>, isCOPD: boolean): number => {
    let score = 0;
    if (v.rr) { 
        if (v.rr <= 8) score += 3; else if (v.rr >= 25) score += 3; else if (v.rr >= 21) score += 2; else if (v.rr <= 11) score += 1; 
    }
    if (v.spo2) {
        if (isCOPD) {
            if (v.spo2 <= 83) score += 3;
            else if (v.spo2 <= 85) score += 2;
            else if (v.spo2 <= 87) score += 1;
            else if (v.spo2 >= 93 && v.spo2 <= 94) score += 1;
            else if (v.spo2 >= 95 && v.spo2 <= 96) score += 2;
            else if (v.spo2 >= 97) score += 3;
        } else {
            if (v.spo2 <= 91) score += 3; 
            else if (v.spo2 <= 93) score += 2; 
            else if (v.spo2 <= 95) score += 1; 
        }
    }
    if (v.oxygen) score += 2;
    if (v.bpSystolic) { 
        if (v.bpSystolic <= 90) score += 3; else if (v.bpSystolic >= 220) score += 3; else if (v.bpSystolic <= 100) score += 2; else if (v.bpSystolic <= 110) score += 1; 
    }
    if (v.hr) { 
        if (v.hr <= 40) score += 3; else if (v.hr >= 131) score += 3; else if (v.hr >= 111) score += 2; else if (v.hr <= 50 || v.hr >= 91) score += 1; 
    }
    if (v.avpu && v.avpu !== 'A') score += 3;
    if (v.temp) { 
        if (v.temp <= 35.0) score += 3; else if (v.temp >= 39.1) score += 2; else if (v.temp <= 36.0 || v.temp >= 38.1) score += 1; 
    }
    return score;
};

const calculatePOPS = (v: Partial<VitalsEntry>, age: number): number => {
    let score = 0;
    if (v.spo2 && v.spo2 < 90) score += 2; else if (v.spo2 && v.spo2 < 95) score += 1;
    if (v.avpu && v.avpu !== 'A') score += 2;
    if (v.rr) {
        if (age < 1 && (v.rr > 60 || v.rr < 20)) score += 2;
        else if (age >= 1 && age < 5 && (v.rr > 40 || v.rr < 15)) score += 2;
        else if (age >= 5 && (v.rr > 30 || v.rr < 10)) score += 2;
    }
    if (v.hr) {
        if (age < 1 && (v.hr > 170 || v.hr < 90)) score += 2;
        else if (age >= 5 && (v.hr > 130 || v.hr < 60)) score += 2;
    }
    if (v.temp && (v.temp > 38.5 || v.temp < 35.5)) score += 1;
    return score;
}

const calculateAge = (dob: string) => {
    if (!dob) return 0;
    const birthDate = new Date(dob);
    const difference = Date.now() - birthDate.getTime();
    return Math.abs(new Date(difference).getUTCFullYear() - 1970);
};

const EPRFPage = () => {
  const { user, verifyPin } = useAuth();
  const { saveEPRF, syncStatus, pendingChanges, isOnline } = useDataSync();
  const navigate = useNavigate();
  
  const [drafts, setDrafts] = useState<EPRF[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeTab, setActiveTab] = useState('incident');
  const [activeSubTab, setActiveSubTab] = useState('general');

  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [showProcModal, setShowProcModal] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  
  const [newDrug, setNewDrug] = useState({ name: '', dose: '', route: '', batch: '', expiry: '', authorisation: 'JRCALC', authName: '', authPin: '' });
  const [newProc, setNewProc] = useState<Partial<Procedure>>({ type: 'IV Cannulation', details: '', site: '', success: true, attempts: 1 });
  const [newVital, setNewVital] = useState<Partial<VitalsEntry>>({
      time: '', hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined, 
      spo2: undefined, oxygen: false, oxygenFlow: '', oxygenDevice: '', temp: undefined, gcs: 15, news2Score: 0, popsScore: 0, avpu: 'A', bloodGlucose: undefined, painScore: 0
  });
  
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitPin, setSubmitPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    const localSaved = localStorage.getItem('aegis_eprfs');
    let localDrafts: EPRF[] = [];
    if (localSaved) {
        try { localDrafts = JSON.parse(localSaved); } catch(e) {}
    }
    if (localDrafts.length > 0) {
        setDrafts(localDrafts);
        if (!activeDraftId) setActiveDraftId(localDrafts[0].id);
    }
    const q = query(collection(db, 'eprfs'), where('accessUids', 'array-contains', user.uid));
    const unsub = onSnapshot(q, (snapshot) => {
        const serverDrafts = snapshot.docs.map(doc => doc.data() as EPRF);
        const mergedMap = new Map<string, EPRF>();
        localDrafts.forEach(d => mergedMap.set(d.id, d));
        serverDrafts.forEach(d => mergedMap.set(d.id, d));
        const finalDrafts = Array.from(mergedMap.values());
        finalDrafts.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        if (finalDrafts.length > 0) {
            setDrafts(finalDrafts);
            localStorage.setItem('aegis_eprfs', JSON.stringify(finalDrafts));
            if (!activeDraftId) setActiveDraftId(finalDrafts[0].id);
        }
    });
    return () => unsub();
  }, [user]);

  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];
  const isReadOnly = activeDraft?.status === 'Submitted' && user?.role !== Role.Manager;
  const isProvisional = activeDraft?.incidentNumber?.startsWith('PROVISIONAL');
  
  const age = calculateAge(activeDraft?.patient.dob);
  const isPaed = age < 16;
  const isCOPD = activeDraft?.patient.chronicHypoxia || false;

  useEffect(() => {
      const news = calculateNEWS2(newVital, isCOPD);
      const pops = calculatePOPS(newVital, age);
      setNewVital(prev => ({ ...prev, news2Score: news, popsScore: pops }));
  }, [newVital.hr, newVital.rr, newVital.bpSystolic, newVital.spo2, newVital.oxygen, newVital.temp, newVital.avpu, isCOPD, age]);

  const updateDraft = (updates: Partial<EPRF>) => {
      if (!activeDraftId || isReadOnly) return;
      const updatedDraft = { ...activeDraft, ...updates, lastUpdated: new Date().toISOString() };
      setDrafts(prev => {
          const newDrafts = prev.map(d => d.id === activeDraftId ? updatedDraft : d);
          localStorage.setItem('aegis_eprfs', JSON.stringify(newDrafts));
          return newDrafts;
      });
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => saveEPRF(updatedDraft), 1000); 
  };

  const updatePrimary = (cat: keyof PrimarySurvey, field: string, val: any) => {
      const current = activeDraft.assessment.primary || DEFAULT_PRIMARY;
      const updatedCategory = { ...current[cat], [field]: val };
      updateDraft({ assessment: { ...activeDraft.assessment, primary: { ...current, [cat]: updatedCategory } } });
  };

  const updateBurns = (field: string, value: any) => {
      const current = activeDraft.assessment.burns || { estimatedPercentage: '', depth: '', site: '' };
      updateDraft({ assessment: { ...activeDraft.assessment, burns: { ...current, [field]: value } } });
  };

  const updateMentalHealth = (field: string, value: any) => {
      const current = activeDraft.assessment.mentalHealth || { appearance: '', behaviour: '', speech: '', mood: '', riskToSelf: false, riskToOthers: false, capacityStatus: '' };
      updateDraft({ assessment: { ...activeDraft.assessment, mentalHealth: { ...current, [field]: value } } });
  };

  const createNewDraft = async (shiftId?: string | null) => {
      if (!user) return;
      let uniqueId = crypto.randomUUID ? crypto.randomUUID() : `draft_${Date.now()}`;
      let newIncidentNumber = `PROVISIONAL-${Date.now().toString().slice(-6)}`;
      const newDraft: EPRF = {
          id: uniqueId,
          incidentNumber: newIncidentNumber,
          shiftId: shiftId || undefined,
          ...DEFAULT_EPRF,
          callSign: user?.role === Role.Paramedic ? 'RRV-01' : 'MEDIC-01',
          accessUids: [user.uid], 
      };
      setDrafts(prev => {
          const updated = [newDraft, ...prev];
          localStorage.setItem('aegis_eprfs', JSON.stringify(updated));
          return updated;
      });
      setActiveDraftId(newDraft.id);
      setActiveTab('incident');
      saveEPRF(newDraft);
  };

  const addVitalEntry = () => {
      const entry: VitalsEntry = {
          time: newVital.time || new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          hr: newVital.hr || 0,
          rr: newVital.rr || 0,
          bpSystolic: newVital.bpSystolic || 0,
          bpDiastolic: newVital.bpDiastolic || 0,
          spo2: newVital.spo2 || 0,
          oxygen: newVital.oxygen || false,
          oxygenFlow: newVital.oxygenFlow,
          oxygenDevice: newVital.oxygenDevice,
          temp: newVital.temp || 36.5,
          gcs: newVital.gcs || 15,
          news2Score: calculateNEWS2(newVital, isCOPD),
          popsScore: calculatePOPS(newVital, age),
          avpu: newVital.avpu || 'A',
          bloodGlucose: newVital.bloodGlucose,
          painScore: newVital.painScore
      };
      updateDraft({ vitals: [...activeDraft.vitals, entry] });
      setNewVital({ time: '', hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined, spo2: undefined, oxygen: false, oxygenFlow: '', oxygenDevice: '', temp: undefined, gcs: 15, news2Score: 0, popsScore: 0, avpu: 'A', bloodGlucose: undefined, painScore: 0 });
  };

  const deleteVitalEntry = (index: number) => {
      if(confirm("Delete this entry?")) {
          const updated = activeDraft.vitals.filter((_, i) => i !== index);
          updateDraft({ vitals: updated });
      }
  };

  const completeDrugAdd = (witnessName?: string, witnessUid?: string) => {
      const drug: DrugAdministration = { id: Date.now().toString(), time: new Date().toLocaleTimeString(), drugName: newDrug.name, dose: newDrug.dose, route: newDrug.route, batchNumber: newDrug.batch, expiryDate: newDrug.expiry, authorisation: newDrug.authorisation, authClinician: newDrug.authorisation === 'Out of Scope' ? newDrug.authName : undefined, administeredBy: user?.name || 'Unknown', witnessedBy: witnessName, witnessUid: witnessUid };
      updateDraft({ treatments: { ...activeDraft.treatments, drugs: [...activeDraft.treatments.drugs, drug] } });
      setShowDrugModal(false); setShowWitnessModal(false); setNewDrug({ name: '', dose: '', route: '', batch: '', expiry: '', authorisation: 'JRCALC', authName: '', authPin: '' });
  };

  const completeProcedureAdd = () => {
      const proc: Procedure = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString(),
          type: newProc.type || 'Other',
          details: newProc.details || '',
          site: newProc.site || '',
          attempts: newProc.attempts || 1,
          success: newProc.success || false,
          performedBy: user?.name || 'Unknown'
      };
      updateDraft({ treatments: { ...activeDraft.treatments, procedures: [...activeDraft.treatments.procedures, proc] } });
      setShowProcModal(false); setNewProc({ type: 'IV Cannulation', details: '', site: '', success: true, attempts: 1 });
  };

  const generatePDF = () => generateEPRF_PDF(activeDraft);
  const finalizeSubmit = async () => { setIsSubmitting(true); const verified = await verifyPin(submitPin); if (!verified) { alert("Incorrect PIN."); setIsSubmitting(false); return; } updateDraft({ status: 'Submitted' }); setShowSubmitModal(false); setIsSubmitting(false); };

  if (drafts.length === 0) return <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700"><div className="w-20 h-20 bg-ams-blue/10 rounded-full flex items-center justify-center mx-auto mb-4"><FilePlus className="w-10 h-10 text-ams-blue" /></div><h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No Active ePRF</h2><button onClick={() => createNewDraft(null)} className="w-full py-4 bg-ams-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-900 transition-transform active:scale-95 flex items-center justify-center gap-2"><Plus className="w-6 h-6" /> Create New ePRF</button></div></div>;
  if (!activeDraft) return <div className="p-8 text-center flex flex-col items-center justify-center h-full"><Loader2 className="animate-spin mb-2 text-ams-blue" /> Loading...</div>;

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0F1115] overflow-hidden relative font-sans">
      
      {/* Header Toolbar */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center bg-white dark:bg-[#172030] shadow-sm z-10 gap-4">
          <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3 flex-wrap tracking-tight">
                  {activeDraft.incidentNumber}
                  {isProvisional && <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 flex items-center gap-1"><WifiOff className="w-3 h-3" /> Provisional ID</span>}
                  <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border bg-blue-50 border-blue-200 text-blue-700">{activeDraft.mode} Mode</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">{activeDraft.callSign}</span> 
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="max-w-[150px] truncate">{activeDraft.location || 'No location set'}</span>
                  <div className={`ml-2 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-bold transition-all ${syncStatus === 'Synced' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>{syncStatus === 'Synced' ? <CheckCircle className="w-3 h-3" /> : <Cloud className="w-3 h-3" />} {syncStatus}</div>
              </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto justify-start md:justify-end items-center">
              <button onClick={generatePDF} className="btn-secondary hidden md:flex"><FileText className="w-4 h-4" /> PDF Preview</button>
              {!isReadOnly && <button onClick={() => setShowSubmitModal(true)} className="btn-primary flex items-center gap-2 px-6 py-3 shadow-md hover:shadow-lg transform active:scale-95 transition-all bg-ams-blue text-white rounded-lg font-bold text-md"><Lock className="w-4 h-4" /> Sign & Submit</button>}
          </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-[#172030] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 w-full">
          <div className="flex overflow-x-auto no-scrollbar px-2 w-full">
            {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`relative flex-shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap outline-none hover:bg-slate-50 dark:hover:bg-slate-800 ${activeTab === tab.id ? 'border-ams-blue text-ams-blue bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}>
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-ams-blue' : 'text-slate-400'}`} />
                    {tab.label}
                </button>
            ))}
          </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#0F1115] scroll-smooth">
        <div className="max-w-full mx-auto space-y-8 pb-32">
            
            {activeTab === 'incident' && (
                <div className="card">
                    <h3 className="card-title">Incident Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div><label className="input-label">Location</label><input className="input-field" value={activeDraft.location} onChange={e => updateDraft({ location: e.target.value })} /></div>
                        <div><label className="input-label">Call Sign</label><input className="input-field" value={activeDraft.callSign} onChange={e => updateDraft({ callSign: e.target.value })} /></div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {Object.entries(activeDraft.times).map(([key, val]) => (
                            <div key={key}><label className="input-label">{key.replace(/([A-Z])/g, ' $1').trim()}</label><input type="time" className="input-field font-mono" value={val} onChange={e => updateDraft({ times: { ...activeDraft.times, [key]: e.target.value } })} /></div>
                        ))}
                    </div>
                </div>
            )}

            {activeTab === 'patient' && (
                <div className="card space-y-6">
                    <h3 className="card-title">Demographics</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="input-label">First Name</label><input className="input-field" value={activeDraft.patient.firstName} onChange={e => updateDraft({ patient: { ...activeDraft.patient, firstName: e.target.value } })} /></div>
                                <div><label className="input-label">Last Name</label><input className="input-field" value={activeDraft.patient.lastName} onChange={e => updateDraft({ patient: { ...activeDraft.patient, lastName: e.target.value } })} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="input-label">DOB (Calc Age: {age})</label><input type="date" className="input-field" value={activeDraft.patient.dob} onChange={e => updateDraft({ patient: { ...activeDraft.patient, dob: e.target.value } })} /></div>
                                <div><label className="input-label">NHS Number</label><input className="input-field font-mono" value={activeDraft.patient.nhsNumber} onChange={e => updateDraft({ patient: { ...activeDraft.patient, nhsNumber: e.target.value } })} /></div>
                            </div>
                            {/* COPD Toggle */}
                            <div className="flex items-center gap-3 p-4 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-2 font-bold text-sm text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                                    <input type="checkbox" className="w-5 h-5 text-ams-blue rounded" checked={activeDraft.patient.chronicHypoxia || false} onChange={e => updateDraft({ patient: { ...activeDraft.patient, chronicHypoxia: e.target.checked } })} />
                                    Chronic Hypoxia (COPD) Target 88-92%
                                </label>
                                <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-500 dark:text-slate-400">Modifies NEWS2 Scoring</span>
                            </div>
                        </div>
                        <div><label className="input-label">Address</label><textarea className="input-field h-32" value={activeDraft.patient.address} onChange={e => updateDraft({ patient: { ...activeDraft.patient, address: e.target.value } })} /></div>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h3 className="card-title">History</h3>
                        <SpeechTextArea label="Presenting Complaint" value={activeDraft.history.presentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, presentingComplaint: e.target.value } })} rows={3} className="mb-4" />
                        <SpeechTextArea label="History of PC" value={activeDraft.history.historyOfPresentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, historyOfPresentingComplaint: e.target.value } })} rows={4} className="mb-4" />
                        <SpeechTextArea label="Past Medical History" value={activeDraft.history.pastMedicalHistory} onChange={e => updateDraft({ history: { ...activeDraft.history, pastMedicalHistory: e.target.value } })} rows={3} />
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div><label className="input-label text-red-600 dark:text-red-400">Allergies</label><input className="input-field border-red-300 dark:border-red-900 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 font-bold" value={activeDraft.history.allergies} onChange={e => updateDraft({ history: { ...activeDraft.history, allergies: e.target.value } })} /></div>
                            <div><label className="input-label">Medications</label><input className="input-field" value={activeDraft.history.medications} onChange={e => updateDraft({ history: { ...activeDraft.history, medications: e.target.value } })} /></div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'assessment' && (
                <div className="space-y-6">
                    {/* Assessment Sub-Navigation */}
                    <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
                        {ASSESSMENT_SUBTABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveSubTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeSubTab === tab.id ? 'bg-ams-blue text-white shadow-md' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'}`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {activeSubTab === 'general' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Primary Survey (ABCDE)</h3>
                                <div className="grid gap-6">
                                    <div className="grid md:grid-cols-4 gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                                        <label className="text-sm font-bold text-slate-500 pt-3">Airway</label>
                                        <div className="md:col-span-3 grid md:grid-cols-2 gap-4">
                                            <select className="input-field" value={activeDraft.assessment.primary.airway.status} onChange={e => updatePrimary('airway', 'status', e.target.value)}><option>Patent</option><option>Obstructed</option><option>Risk</option></select>
                                            <input className="input-field" placeholder="Intervention (e.g. OPA, Suction)" value={activeDraft.assessment.primary.airway.intervention || ''} onChange={e => updatePrimary('airway', 'intervention', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                                        <label className="text-sm font-bold text-slate-500 pt-3">Breathing</label>
                                        <div className="md:col-span-3 space-y-3">
                                            <div className="grid md:grid-cols-3 gap-4">
                                                <div><label className="input-label">Effort</label><select className="input-field" value={activeDraft.assessment.primary.breathing.effort} onChange={e => updatePrimary('breathing', 'effort', e.target.value)}><option>Normal</option><option>Increased</option><option>Accessory</option></select></div>
                                                <div><label className="input-label">Rate</label><input type="text" className="input-field" value={activeDraft.assessment.primary.breathing.rate} onChange={e => updatePrimary('breathing', 'rate', e.target.value)} placeholder="/min" /></div>
                                                <div><label className="input-label">Sats</label><input type="text" className="input-field" value={activeDraft.assessment.primary.breathing.oxygenSats} onChange={e => updatePrimary('breathing', 'oxygenSats', e.target.value)} placeholder="%" /></div>
                                            </div>
                                            <div className="grid md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Left Lung</span>
                                                    <div className="space-y-2">
                                                        <select className="input-field text-xs" value={activeDraft.assessment.primary.breathing.airEntryL} onChange={e => updatePrimary('breathing', 'airEntryL', e.target.value)}><option>Normal Entry</option><option>Reduced</option><option>Nil Entry</option></select>
                                                        <select className="input-field text-xs" value={activeDraft.assessment.primary.breathing.soundsL} onChange={e => updatePrimary('breathing', 'soundsL', e.target.value)}><option>Clear Sounds</option><option>Wheeze</option><option>Creps</option><option>Stridor</option><option>Silent</option></select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Right Lung</span>
                                                    <div className="space-y-2">
                                                        <select className="input-field text-xs" value={activeDraft.assessment.primary.breathing.airEntryR} onChange={e => updatePrimary('breathing', 'airEntryR', e.target.value)}><option>Normal Entry</option><option>Reduced</option><option>Nil Entry</option></select>
                                                        <select className="input-field text-xs" value={activeDraft.assessment.primary.breathing.soundsR} onChange={e => updatePrimary('breathing', 'soundsR', e.target.value)}><option>Clear Sounds</option><option>Wheeze</option><option>Creps</option><option>Stridor</option><option>Silent</option></select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-4 items-start">
                                        <label className="text-sm font-bold text-slate-500 pt-3">Circulation</label>
                                        <div className="md:col-span-3 grid md:grid-cols-3 gap-4">
                                            <div><label className="input-label">Radial</label><select className="input-field" value={activeDraft.assessment.primary.circulation.radialPulse} onChange={e => updatePrimary('circulation', 'radialPulse', e.target.value)}><option>Strong</option><option>Weak</option><option>Absent</option></select></div>
                                            <div><label className="input-label">Cap Refill</label><select className="input-field" value={activeDraft.assessment.primary.circulation.capRefill} onChange={e => updatePrimary('circulation', 'capRefill', e.target.value)}><option>&lt; 2s</option><option>&gt; 2s</option></select></div>
                                            <div><label className="input-label">Skin</label><select className="input-field" value={activeDraft.assessment.primary.circulation.skin} onChange={e => updatePrimary('circulation', 'skin', e.target.value)}><option>Normal</option><option>Pale</option><option>Clammy</option><option>Cyanosed</option></select></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="card"><h3 className="card-title">Trauma Triage</h3><TraumaTriage value={activeDraft.assessment.traumaTriage} onChange={v => updateDraft({ assessment: { ...activeDraft.assessment, traumaTriage: v } })} /></div>
                        </div>
                    )}

                    {activeSubTab === 'nervous' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card"><h3 className="card-title">Neuro Assessment</h3><NeuroAssessment data={activeDraft.assessment.neuro} onChange={v => updateDraft({ assessment: { ...activeDraft.assessment, neuro: v } })} /></div>
                        </div>
                    )}

                    {activeSubTab === 'cardiac' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="card-title mb-0">Chest Pain Assessment</h3>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.cardiac?.chestPainPresent} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, chestPainPresent: e.target.checked } } })} /> Patient reports chest pain?</label>
                                </div>
                                {activeDraft.assessment.cardiac?.chestPainPresent && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="input-label">Onset</label><input className="input-field" placeholder="When did it start?" value={activeDraft.assessment.cardiac?.socrates?.onset || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, socrates: { ...activeDraft.assessment.cardiac?.socrates, onset: e.target.value } } } })} /></div>
                                        <div><label className="input-label">Severity (0-10)</label><input type="number" className="input-field" value={activeDraft.assessment.cardiac?.socrates?.severity || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, socrates: { ...activeDraft.assessment.cardiac?.socrates, severity: e.target.value } } } })} /></div>
                                        <div><label className="input-label">Characteristics</label><input className="input-field" placeholder="e.g. Heavy, Sharp, Tearing" value={activeDraft.assessment.cardiac?.socrates?.character || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, socrates: { ...activeDraft.assessment.cardiac?.socrates, character: e.target.value } } } })} /></div>
                                        <div><label className="input-label">Radiation</label><input className="input-field" placeholder="e.g. Left Arm, Jaw" value={activeDraft.assessment.cardiac?.socrates?.radiation || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, socrates: { ...activeDraft.assessment.cardiac?.socrates, radiation: e.target.value } } } })} /></div>
                                        <div className="md:col-span-2"><label className="input-label">Associated Symptoms</label><input className="input-field" placeholder="Nausea, Sweating, SOB" value={activeDraft.assessment.cardiac?.socrates?.associations || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, socrates: { ...activeDraft.assessment.cardiac?.socrates, associations: e.target.value } } } })} /></div>
                                    </div>
                                )}
                            </div>
                            <div className="card">
                                <h3 className="card-title">Electrocardiogram (ECG)</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Rhythm</label><select className="input-field" value={activeDraft.assessment.cardiac?.ecg?.rhythm || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, ecg: { ...activeDraft.assessment.cardiac?.ecg, rhythm: e.target.value } } } })}><option value="">Select Rhythm...</option><option>Sinus Rhythm</option><option>Sinus Tachycardia</option><option>Atrial Fibrillation</option><option>Supraventricular Tachycardia</option><option>Ventricular Tachycardia</option><option>Ventricular Fibrillation</option><option>Asystole</option><option>PEA</option><option>Heart Block</option></select></div>
                                    <div><label className="input-label">Rate</label><input className="input-field" placeholder="BPM" value={activeDraft.assessment.cardiac?.ecg?.rate || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, ecg: { ...activeDraft.assessment.cardiac?.ecg, rate: e.target.value } } } })} /></div>
                                    <div className="md:col-span-2">
                                        <label className="input-label">12-Lead Interpretation</label>
                                        <textarea className="input-field" rows={3} placeholder="Describe ST changes, bundle branch blocks, ectopics..." value={activeDraft.assessment.cardiac?.ecg?.twelveLeadNotes || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, ecg: { ...activeDraft.assessment.cardiac?.ecg, twelveLeadNotes: e.target.value } } } })} />
                                    </div>
                                    <div className="md:col-span-2 flex items-center gap-2">
                                        <label className="flex items-center gap-2 font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg border border-red-200 dark:border-red-900/50 w-full"><input type="checkbox" checked={activeDraft.assessment.cardiac?.ecg?.stElevation || false} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, cardiac: { ...activeDraft.assessment.cardiac, ecg: { ...activeDraft.assessment.cardiac?.ecg, stElevation: e.target.checked } } } })} className="w-5 h-5 text-red-600 rounded" /> Significant ST Elevation Detected (STEMI Criteria)</label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'resp' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Respiratory Assessment</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Cough Type</label><select className="input-field" value={activeDraft.assessment.respiratory?.cough || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, respiratory: { ...activeDraft.assessment.respiratory, cough: e.target.value } } } })}><option value="">None</option><option>Dry / Non-productive</option><option>Productive</option></select></div>
                                    <div><label className="input-label">Sputum Colour</label><input className="input-field" placeholder="e.g. Green, Clear, Haemoptysis" value={activeDraft.assessment.respiratory?.sputumColor || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, respiratory: { ...activeDraft.assessment.respiratory, sputumColor: e.target.value } } } })} /></div>
                                    <div className="md:col-span-2"><label className="input-label">Specific History (Asthma/COPD)</label><textarea className="input-field" rows={2} placeholder="Previous admissions, ICU, normal function..." value={activeDraft.assessment.respiratory?.history || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, respiratory: { ...activeDraft.assessment.respiratory, history: e.target.value } } } })} /></div>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="card-title">Intervention Effectiveness</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Peak Flow (Pre-Neb)</label><input type="number" className="input-field" placeholder="L/min" value={activeDraft.assessment.respiratory?.peakFlowPre || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, respiratory: { ...activeDraft.assessment.respiratory, peakFlowPre: e.target.value } } } })} /></div>
                                    <div><label className="input-label">Peak Flow (Post-Neb)</label><input type="number" className="input-field" placeholder="L/min" value={activeDraft.assessment.respiratory?.peakFlowPost || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, respiratory: { ...activeDraft.assessment.respiratory, peakFlowPost: e.target.value } } } })} /></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'gi_gu' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Abdominal Assessment</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Pain Location</label><select className="input-field" value={activeDraft.assessment.gastrointestinal?.painLocation || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, painLocation: e.target.value } } } })}><option value="">None</option><option>Generalized</option><option>RUQ</option><option>LUQ</option><option>RLQ</option><option>LLQ</option><option>Epigastric</option><option>Suprapubic</option></select></div>
                                    <div><label className="input-label">Palpation Feel</label><select className="input-field" value={activeDraft.assessment.gastrointestinal?.palpation || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, palpation: e.target.value } } } })}><option>Soft & Non-tender</option><option>Soft & Tender</option><option>Guarding</option><option>Rigid / Board-like</option></select></div>
                                    <div><label className="input-label">Distension</label><select className="input-field" value={activeDraft.assessment.gastrointestinal?.distension ? 'Yes' : 'No'} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, distension: e.target.value === 'Yes' } } } })}><option>No</option><option>Yes</option></select></div>
                                    <div><label className="input-label">Bowel Sounds</label><select className="input-field" value={activeDraft.assessment.gastrointestinal?.bowelSounds || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, bowelSounds: e.target.value } } } })}><option>Present / Normal</option><option>Absent</option><option>Hyperactive</option><option>Tinkling</option></select></div>
                                </div>
                            </div>
                            <div className="card">
                                <h3 className="card-title">Hydration & Output</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Last Oral Intake</label><input className="input-field" placeholder="Time / Detail" value={activeDraft.assessment.gastrointestinal?.lastMeal || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, lastMeal: e.target.value } } } })} /></div>
                                    <div><label className="input-label">Last Bowel Movement</label><input className="input-field" placeholder="Time / Type" value={activeDraft.assessment.gastrointestinal?.lastBowelMovement || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, lastBowelMovement: e.target.value } } } })} /></div>
                                    <div><label className="input-label">Urine Output</label><input className="input-field" placeholder="Normal / Reduced / Nil" value={activeDraft.assessment.gastrointestinal?.urineOutput || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, urineOutput: e.target.value } } } })} /></div>
                                    <div className="flex items-center"><label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.gastrointestinal?.nauseaVomiting || false} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, gastrointestinal: { ...activeDraft.assessment.gastrointestinal, nauseaVomiting: e.target.checked } } } })} /> Nausea / Vomiting Present</label></div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'obs' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Maternity Assessment</h3>
                                <label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300 mb-4 bg-slate-100 dark:bg-slate-900 p-3 rounded-lg"><input type="checkbox" className="w-5 h-5 text-ams-blue" checked={activeDraft.assessment.obsGynae?.pregnant || false} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, pregnant: e.target.checked } } })} /> Patient is Pregnant / Possibly Pregnant</label>
                                {activeDraft.assessment.obsGynae?.pregnant && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div><label className="input-label">Gestation (Weeks)</label><input type="number" className="input-field" value={activeDraft.assessment.obsGynae?.gestationWeeks || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, gestationWeeks: e.target.value } } })} /></div>
                                        <div><label className="input-label">Gravida / Para</label><div className="flex gap-2"><input placeholder="G" className="input-field" value={activeDraft.assessment.obsGynae?.gravida || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, gravida: e.target.value } } })} /><input placeholder="P" className="input-field" value={activeDraft.assessment.obsGynae?.para || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, para: e.target.value } } })} /></div></div>
                                        <div className="md:col-span-2"><label className="input-label">Contractions</label><input className="input-field" placeholder="Frequency and Duration" value={activeDraft.assessment.obsGynae?.contractions || ''} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, contractions: e.target.value } } })} /></div>
                                        <div className="flex items-center"><label className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-300"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.obsGynae?.membranesRuptured || false} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, membranesRuptured: e.target.checked } } })} /> Membranes Ruptured</label></div>
                                        <div className="flex items-center"><label className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.obsGynae?.bleeding || false} onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, obsGynae: { ...activeDraft.assessment.obsGynae, bleeding: e.target.checked } } })} /> PV Bleeding</label></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'msk' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Body Map (Injuries & Marks)</h3>
                                <BodyMap value={activeDraft.injuries} onChange={v => updateDraft({ injuries: v })} />
                            </div>
                            <div className="card">
                                <h3 className="card-title">Burns Assessment</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="input-label">Est. Percentage (Rule of 9s)</label>
                                        <input className="input-field" placeholder="%" value={activeDraft.assessment.burns?.estimatedPercentage || ''} onChange={e => updateBurns('estimatedPercentage', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="input-label">Max Depth</label>
                                        <select className="input-field" value={activeDraft.assessment.burns?.depth || ''} onChange={e => updateBurns('depth', e.target.value)}>
                                            <option value="">None</option>
                                            <option>Superficial (Erythema)</option>
                                            <option>Partial Thickness</option>
                                            <option>Full Thickness</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="input-label">Site / Description</label>
                                        <input className="input-field" value={activeDraft.assessment.burns?.site || ''} onChange={e => updateBurns('site', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSubTab === 'mental' && (
                        <div className="space-y-6 animate-in fade-in">
                            <div className="card">
                                <h3 className="card-title">Mental State Exam (MSE)</h3>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div><label className="input-label">Appearance</label><input className="input-field" placeholder="Dress, hygiene, eye contact..." value={activeDraft.assessment.mentalHealth?.appearance || ''} onChange={e => updateMentalHealth('appearance', e.target.value)} /></div>
                                    <div><label className="input-label">Behaviour</label><input className="input-field" placeholder="Agitated, withdrawn, cooperative..." value={activeDraft.assessment.mentalHealth?.behaviour || ''} onChange={e => updateMentalHealth('behaviour', e.target.value)} /></div>
                                    <div><label className="input-label">Speech</label><input className="input-field" placeholder="Rate, volume, tone..." value={activeDraft.assessment.mentalHealth?.speech || ''} onChange={e => updateMentalHealth('speech', e.target.value)} /></div>
                                    <div><label className="input-label">Mood</label><input className="input-field" placeholder="Subjective & Objective..." value={activeDraft.assessment.mentalHealth?.mood || ''} onChange={e => updateMentalHealth('mood', e.target.value)} /></div>
                                    <div className="flex items-center"><label className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.mentalHealth?.riskToSelf || false} onChange={e => updateMentalHealth('riskToSelf', e.target.checked)} /> Risk to Self</label></div>
                                    <div className="flex items-center"><label className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400"><input type="checkbox" className="w-5 h-5" checked={activeDraft.assessment.mentalHealth?.riskToOthers || false} onChange={e => updateMentalHealth('riskToOthers', e.target.checked)} /> Risk to Others</label></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'vitals' && (
                <div className="space-y-6">
                    <div className="card">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="card-title mb-0">Add Vital Signs</h3>
                            <div className={`flex flex-col items-end`}>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{isPaed ? `POPS Score (Age ${age})` : `NEWS2 Score ${isCOPD ? '(Scale 2)' : ''}`}</span>
                                <span className={`text-2xl font-bold ${isPaed ? (newVital.popsScore! >= 5 ? 'text-red-600' : 'text-green-600') : (newVital.news2Score >= 5 ? 'text-red-600' : 'text-green-600')}`}>
                                    {isPaed ? newVital.popsScore : newVital.news2Score}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div><label className="input-label">Time</label><input type="time" className="input-field" value={newVital.time} onChange={e => setNewVital({...newVital, time: e.target.value})} /></div>
                            <div><label className="input-label">HR</label><input type="number" className="input-field" value={newVital.hr || ''} onChange={e => setNewVital({...newVital, hr: Number(e.target.value)})} placeholder="BPM" /></div>
                            <div><label className="input-label">RR</label><input type="number" className="input-field" value={newVital.rr || ''} onChange={e => setNewVital({...newVital, rr: Number(e.target.value)})} placeholder="/min" /></div>
                            <div><label className="input-label">SpO2</label><div className="flex gap-2"><input type="number" className="input-field" value={newVital.spo2 || ''} onChange={e => setNewVital({...newVital, spo2: Number(e.target.value)})} placeholder="%" /></div></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div><label className="input-label">O2 Flow (L/m)</label><input type="text" className="input-field" value={newVital.oxygenFlow || ''} onChange={e => setNewVital({...newVital, oxygenFlow: e.target.value, oxygen: !!e.target.value})} placeholder="Air / 2L" /></div>
                            <div><label className="input-label">O2 Device</label><select className="input-field" value={newVital.oxygenDevice || ''} onChange={e => setNewVital({...newVital, oxygenDevice: e.target.value})}><option value="">None</option><option>Nasal</option><option>Mask</option><option>NRB</option><option>BVM</option></select></div>
                            <div><label className="input-label">BP Sys</label><input type="number" className="input-field" value={newVital.bpSystolic || ''} onChange={e => setNewVital({...newVital, bpSystolic: Number(e.target.value)})} /></div>
                            <div><label className="input-label">BP Dia</label><input type="number" className="input-field" value={newVital.bpDiastolic || ''} onChange={e => setNewVital({...newVital, bpDiastolic: Number(e.target.value)})} /></div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><label className="input-label">Temp</label><input type="number" step="0.1" className="input-field" value={newVital.temp || ''} onChange={e => setNewVital({...newVital, temp: Number(e.target.value)})} /></div>
                            <div><label className="input-label">AVPU</label><select className="input-field" value={newVital.avpu} onChange={e => setNewVital({...newVital, avpu: e.target.value as any})}><option>A</option><option>V</option><option>P</option><option>U</option></select></div>
                            <div><label className="input-label">BM</label><input type="number" step="0.1" className="input-field" value={newVital.bloodGlucose || ''} onChange={e => setNewVital({...newVital, bloodGlucose: Number(e.target.value)})} /></div>
                            <div><label className="input-label">Pain (0-10)</label><input type="number" max={10} className="input-field" value={newVital.painScore || ''} onChange={e => setNewVital({...newVital, painScore: Number(e.target.value)})} /></div>
                            <div className="col-span-2 md:col-span-4 flex items-end mt-2"><button onClick={addVitalEntry} className="btn-primary w-full py-3">Record Vitals Set</button></div>
                        </div>
                    </div>

                    {/* Vitals Grid History */}
                    {activeDraft.vitals.length > 0 && (
                        <div className="card overflow-hidden !p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left dark:text-slate-300">
                                    <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase font-bold text-slate-50 dark:text-slate-400">
                                        <tr>
                                            <th className="px-4 py-3">Time</th>
                                            <th className="px-4 py-3">HR</th>
                                            <th className="px-4 py-3">RR</th>
                                            <th className="px-4 py-3">BP</th>
                                            <th className="px-4 py-3">SpO2</th>
                                            <th className="px-4 py-3">O2</th>
                                            <th className="px-4 py-3">Temp</th>
                                            <th className="px-4 py-3">GCS</th>
                                            <th className="px-4 py-3">BM</th>
                                            <th className="px-4 py-3">Score</th>
                                            <th className="px-4 py-3 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {activeDraft.vitals.map((v, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <td className="px-4 py-3 font-bold">{v.time}</td>
                                                <td className={`px-4 py-3 font-mono ${(v.hr > 130 || v.hr < 40) ? 'text-red-600 font-bold' : ''}`}>{v.hr}</td>
                                                <td className={`px-4 py-3 font-mono ${(v.rr > 29 || v.rr < 8) ? 'text-red-600 font-bold' : ''}`}>{v.rr}</td>
                                                <td className="px-4 py-3 font-mono">{v.bpSystolic}/{v.bpDiastolic}</td>
                                                <td className={`px-4 py-3 font-mono ${v.spo2 < 92 ? 'text-red-600 font-bold' : ''}`}>{v.spo2}%</td>
                                                <td className="px-4 py-3">{v.oxygen ? `${v.oxygenFlow || 'O2'} ${v.oxygenDevice ? `(${v.oxygenDevice})` : ''}` : 'Air'}</td>
                                                <td className="px-4 py-3 font-mono">{v.temp}°</td>
                                                <td className="px-4 py-3">{v.avpu === 'A' ? `GCS ${v.gcs}` : v.avpu}</td>
                                                <td className="px-4 py-3 font-mono">{v.bloodGlucose || '-'}</td>
                                                <td className="px-4 py-3 font-bold">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${isPaed ? (v.popsScore! >= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700') : (v.news2Score >= 5 ? 'bg-red-100 text-red-700' : v.news2Score >= 1 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700')}`}>
                                                        {isPaed ? `POPS ${v.popsScore}` : `NEWS ${v.news2Score}`}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button onClick={() => deleteVitalEntry(idx)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <h3 className="card-title">Observations Trend</h3>
                        <VitalsChart data={activeDraft.vitals} />
                    </div>
                </div>
            )}

            {activeTab === 'treatment' && (
                <div className="space-y-6">
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="card-title flex items-center gap-2 mb-0"><Stethoscope className="w-5 h-5 text-ams-blue" /> Procedures & Interventions</h3>
                            <button onClick={() => setShowProcModal(true)} className="btn-secondary text-xs"><Plus className="w-3 h-3" /> Add Procedure</button>
                        </div>
                        {activeDraft.treatments.procedures.map((p, i) => (
                            <div key={i} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex flex-col md:flex-row justify-between md:items-center gap-2 mb-2 shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold dark:text-white text-lg">{p.type}</span> 
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide ${p.success ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>{p.success ? 'Successful' : 'Failed'}</span>
                                    </div>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 block">
                                        {p.details} • {p.site} • Attempts: {p.attempts || 1}
                                    </span>
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold mb-1">{p.time}</span>
                                    <span className="text-xs text-slate-400">{p.performedBy}</span>
                                </div>
                            </div>
                        ))}
                        {activeDraft.treatments.procedures.length === 0 && <p className="text-slate-400 text-sm italic text-center py-4">No procedures recorded.</p>}
                    </div>
                    
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="card-title flex items-center gap-2 mb-0"><Syringe className="w-5 h-5 text-ams-blue" /> Drugs Administered</h3>
                            <button onClick={() => setShowDrugModal(true)} className="btn-secondary text-xs"><Plus className="w-3 h-3" /> Add Drug</button>
                        </div>
                        {activeDraft.treatments.drugs.map((d, i) => (
                            <div key={i} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg flex justify-between items-center mb-2 shadow-sm">
                                <div>
                                    <span className="font-bold dark:text-white text-lg block">{d.drugName}</span> 
                                    <span className="text-sm text-slate-500">{d.dose} via {d.route}</span>
                                    {d.witnessedBy && <span className="block text-xs text-purple-600 dark:text-purple-400 font-bold mt-1">Witnessed by: {d.witnessedBy}</span>}
                                </div>
                                <div className="text-right flex flex-col items-end">
                                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300 font-bold mb-1">{d.time}</span>
                                    <span className="text-xs text-slate-400">{d.administeredBy}</span>
                                </div>
                            </div>
                        ))}
                        {activeDraft.treatments.drugs.length === 0 && <p className="text-slate-400 text-sm italic text-center py-4">No drugs administered.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'governance' && (
                <div className="card">
                    <h3 className="card-title">Governance</h3>
                    <div className="space-y-4">
                        <label className="flex items-center gap-2 text-sm dark:text-white p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                            <input type="checkbox" checked={activeDraft.governance.safeguarding.concerns} onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, concerns: e.target.checked } } })} className="w-5 h-5 text-ams-blue rounded" /> 
                            <ShieldAlert className="w-5 h-5 text-red-500" />
                            <span className="font-bold text-red-700 dark:text-red-400">Safeguarding Concerns?</span>
                        </label>
                        
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-sm mb-2 dark:text-white">Mental Capacity Act Assessment</h4>
                            <select className="input-field mb-4" value={activeDraft.governance.capacity.status} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, status: e.target.value as any } } })}><option>Capacity Present</option><option>Capacity Lacking</option></select>
                            
                            <div className="space-y-2 pl-2 border-l-2 border-slate-200 dark:border-slate-700">
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={activeDraft.governance.capacity.stage1Impairment} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage1Impairment: e.target.checked } } })} /> Stage 1: Is there an impairment of mind/brain?</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={activeDraft.governance.capacity.stage2Functional.understand} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, understand: e.target.checked } } } })} /> Can Understand?</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={activeDraft.governance.capacity.stage2Functional.retain} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, retain: e.target.checked } } } })} /> Can Retain?</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={activeDraft.governance.capacity.stage2Functional.weigh} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, weigh: e.target.checked } } } })} /> Can Weigh Up?</label>
                                <label className="flex items-center gap-2 text-sm dark:text-gray-300"><input type="checkbox" checked={activeDraft.governance.capacity.stage2Functional.communicate} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, communicate: e.target.checked } } } })} /> Can Communicate?</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'handover' && (
                <div className="space-y-6">
                    <div className="card">
                        <h3 className="card-title">Handover & Disposition</h3>
                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div><label className="input-label">Outcome</label><select className="input-field" value={activeDraft.governance.discharge} onChange={e => updateDraft({ governance: { ...activeDraft.governance, discharge: e.target.value } })}><option value="">Select Outcome...</option><option>Conveyed to ED</option><option>See & Treat</option><option>Referral to GP/OOH</option><option>Patient Refusal</option><option>Left on Scene</option></select></div>
                            <div><label className="input-label">Destination / Location</label><input className="input-field" value={activeDraft.governance.destinationLocation || ''} onChange={e => updateDraft({ governance: { ...activeDraft.governance, destinationLocation: e.target.value } })} placeholder="e.g. Royal London Hospital" /></div>
                        </div>
                        <SpeechTextArea label="SBAR Handover / Clinical Narrative" rows={8} value={activeDraft.handover.sbar} onChange={e => updateDraft({ handover: { ...activeDraft.handover, sbar: e.target.value } })} />
                    </div>
                    <div className="card">
                        <h3 className="card-title">Signatures & Receiving</h3>
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-slate-500 uppercase">Receiving Clinician</h4>
                                <div>
                                    <label className="input-label">Name</label>
                                    <input className="input-field" placeholder="e.g. Staff Nurse Jones" value={activeDraft.handover.receivingClinicianName} onChange={e => updateDraft({ handover: { ...activeDraft.handover, receivingClinicianName: e.target.value } })} />
                                </div>
                                <div>
                                    <label className="input-label">PIN / Reg Number</label>
                                    <input className="input-field" placeholder="NMC/GMC Number" value={activeDraft.handover.receivingClinicianPin} onChange={e => updateDraft({ handover: { ...activeDraft.handover, receivingClinicianPin: e.target.value } })} />
                                </div>
                                <SignaturePad label="Receiving Clinician Signature" value={activeDraft.handover.receivingClinicianSignature} onSave={val => updateDraft({ handover: { ...activeDraft.handover, receivingClinicianSignature: val } })} />
                            </div>
                            <div className="space-y-4">
                                <h4 className="font-bold text-sm text-slate-500 uppercase">Crew Signature</h4>
                                <div className="mb-4 text-xs text-slate-500 italic p-2 bg-slate-100 dark:bg-slate-900 rounded">I confirm that the clinical assessment and treatment recorded is accurate to the best of my knowledge.</div>
                                <SignaturePad label="Lead Clinician Signature" value={activeDraft.handover.clinicianSignature} onSave={val => updateDraft({ handover: { ...activeDraft.handover, clinicianSignature: val } })} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>

      {showDrugModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg dark:text-white">Add Medication</h3>
                  <select className="input-field h-12" value={newDrug.name} onChange={e => setNewDrug({...newDrug, name: e.target.value})}><option value="">Select Drug...</option>{DRUG_DATABASE.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}</select>
                  <div className="grid grid-cols-2 gap-4">
                     <input className="input-field" placeholder="Dose" value={newDrug.dose} onChange={e => setNewDrug({...newDrug, dose: e.target.value})} />
                     <input className="input-field" placeholder="Route" value={newDrug.route} onChange={e => setNewDrug({...newDrug, route: e.target.value})} />
                  </div>
                  <button onClick={() => { if(CONTROLLED_DRUGS.includes(newDrug.name)) setShowWitnessModal(true); else completeDrugAdd(); }} className="btn-primary w-full py-3">Add Drug</button>
                  <button onClick={() => setShowDrugModal(false)} className="w-full py-2 text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {showProcModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg dark:text-white">Record Procedure</h3>
                  <select className="input-field" value={newProc.type} onChange={e => setNewProc({...newProc, type: e.target.value})}><option>IV Cannulation</option><option>I-Gel Airway</option><option>Wound Care / Dressing</option><option>Splinting</option><option>Spinal Immobilisation</option><option>ECG (12 Lead)</option><option>Intubation (ETT)</option><option>Needle Thoracentesis</option></select>
                  <div className="grid grid-cols-2 gap-4">
                      <input className="input-field" placeholder="Size/Details (e.g. 18G Green)" value={newProc.details} onChange={e => setNewProc({...newProc, details: e.target.value})} />
                      <input className="input-field" placeholder="Site (e.g. Left ACF)" value={newProc.site} onChange={e => setNewProc({...newProc, site: e.target.value})} />
                  </div>
                  <div>
                      <label className="input-label">Attempts</label>
                      <input type="number" className="input-field" value={newProc.attempts} onChange={e => setNewProc({...newProc, attempts: Number(e.target.value)})} />
                  </div>
                  <div className="flex gap-2"><button onClick={() => setNewProc({...newProc, success: true})} className={`flex-1 py-2 rounded font-bold ${newProc.success ? 'bg-green-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>Success</button><button onClick={() => setNewProc({...newProc, success: false})} className={`flex-1 py-2 rounded font-bold ${!newProc.success ? 'bg-red-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>Failed</button></div>
                  <button onClick={completeProcedureAdd} className="btn-primary w-full py-3">Save Procedure</button>
                  <button onClick={() => setShowProcModal(false)} className="w-full py-2 text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      {showWitnessModal && <WitnessModal drugName={newDrug.name} onWitnessConfirmed={completeDrugAdd} onCancel={() => setShowWitnessModal(false)} />}
      
      {showSubmitModal && (
          <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full border border-white/10">
                  <h3 className="text-2xl font-bold text-center mb-6 dark:text-white">Sign & Submit</h3>
                  <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl py-4 text-center text-lg mb-6 tracking-[0.5em] font-bold dark:text-white" placeholder="••••" value={submitPin} onChange={e => setSubmitPin(e.target.value)} />
                  <button onClick={finalizeSubmit} disabled={isSubmitting} className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 disabled:opacity-50">{isSubmitting ? 'Submitting...' : 'Confirm Signature'}</button>
                  <button onClick={() => setShowSubmitModal(false)} className="w-full py-3 mt-2 text-slate-500">Cancel</button>
              </div>
          </div>
      )}

      <style>{`
        .card { @apply bg-white dark:bg-[#172030] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6; }
        .card-title { @apply font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2 block; }
        .btn-primary { @apply px-5 py-2.5 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-sm text-sm active:scale-95; }
        .btn-secondary { @apply px-5 py-2.5 bg-white dark:bg-[#172030] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm flex items-center gap-2 active:scale-95 shadow-sm; }
        .input-label { @apply block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 ml-1; }
        .input-field { @apply w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ams-blue dark:text-white transition-all resize-none; }
      `}</style>
    </div>
  );
};

export default EPRFPage;
