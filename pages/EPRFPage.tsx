
import React, { useState, useEffect, useRef } from 'react';
import { Save, Activity, User, AlertTriangle, Bot, Pill, FileText, ClipboardList, Plus, Lock, Search, Cloud, ShieldCheck, Sparkles, Loader2, Camera, Trash2, X, Eye, Gauge, Brain, Stethoscope, Syringe, Briefcase, FilePlus, Zap, Clock, MessageSquare, Menu, CheckCircle, AlertOctagon, UserPlus, Coffee, Moon, ThumbsUp, ThumbsDown, Droplets, ChevronRight, ShieldAlert, MoreVertical, Key, Users, WifiOff, Wifi, PenTool, ClipboardCheck, ArrowRight, UserCheck, Calculator } from 'lucide-react';
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
import { VitalsEntry, EPRF, Role, NeuroAssessment as NeuroType, DrugAdministration, Consumable, MediaAttachment, LogEntry, Patient, AssistingClinician, User as UserType, PrimarySurvey } from '../types';
import { DRUG_DATABASE, CONTROLLED_DRUGS } from '../data/drugDatabase';
import { generateEPRF_PDF } from '../utils/pdfGenerator';
import { useAuth } from '../hooks/useAuth';
import { useDataSync } from '../hooks/useDataSync';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot, updateDoc, doc, orderBy, limit } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const DEFAULT_NEURO: NeuroType = {
    gcs: { eyes: 4, verbal: 5, motor: 6, total: 15 },
    pupils: { leftSize: 4, leftReaction: 'Brisk', rightSize: 4, rightReaction: 'Brisk' },
    fast: { face: 'Normal', arms: 'Normal', speech: 'Normal', testPositive: false, time: '' },
    limbs: {
        leftArm: { power: 'Normal', sensation: 'Normal' },
        rightArm: { power: 'Normal', sensation: 'Normal' },
        leftLeg: { power: 'Normal', sensation: 'Normal' },
        rightLeg: { power: 'Normal', sensation: 'Normal' },
    }
};

const DEFAULT_PRIMARY: PrimarySurvey = {
    airway: { status: 'Patent', notes: '' },
    breathing: { rate: '', rhythm: 'Regular', depth: 'Normal', effort: 'Normal', airEntry: 'Equal', addedSounds: 'Nil' },
    circulation: { radialPulse: 'Present', character: 'Regular', capRefill: '< 2s', skin: 'Normal', temp: 'Warm' },
    disability: { avpu: 'A', pupils: 'PERRLA', bloodGlucose: '' },
    exposure: { injuriesFound: false, rash: false }
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
    patient: { firstName: '', lastName: '', dob: '', nhsNumber: '', address: '', gender: '' },
    history: { presentingComplaint: '', historyOfPresentingComplaint: '', pastMedicalHistory: '', allergies: 'NKDA', medications: '' },
    assessment: { primary: DEFAULT_PRIMARY, neuro: DEFAULT_NEURO },
    vitals: [],
    injuries: [],
    treatments: { drugs: [] },
    governance: { 
        safeguarding: { concerns: false, type: '', details: '' }, 
        capacity: { status: 'Capacity Present', stage1Impairment: false, stage2Functional: { understand: true, retain: true, weigh: true, communicate: true } }, 
        discharge: '',
        refusal: { isRefusal: false, risksExplained: false, alternativesOffered: false, capacityConfirmed: false, worseningAdviceGiven: false }
    },
    handover: { sbar: '', clinicianSignature: '', patientSignature: '', media: [] },
    logs: []
};

const TABS = [
    { id: 'incident', label: 'Incident', icon: AlertTriangle },
    { id: 'patient', label: 'Patient', icon: User },
    { id: 'assessment', label: 'Assessment', icon: ClipboardList },
    { id: 'vitals', label: 'Vitals', icon: Activity },
    { id: 'treatment', label: 'Treatment', icon: Pill },
    { id: 'governance', label: 'Governance', icon: Lock },
    { id: 'handover', label: 'Handover', icon: FileText },
];

const calculateNEWS2 = (v: Partial<VitalsEntry>): number => {
    let score = 0;
    // RR
    if (v.rr) { 
        if (v.rr <= 8) score += 3;
        else if (v.rr >= 25) score += 3; 
        else if (v.rr >= 21) score += 2; 
        else if (v.rr <= 11) score += 1; 
    }
    // SpO2 (Scale 1 Standard)
    if (v.spo2) { 
        if (v.spo2 <= 91) score += 3; 
        else if (v.spo2 <= 93) score += 2; 
        else if (v.spo2 <= 95) score += 1; 
    }
    // Air or Oxygen
    if (v.oxygen) score += 2;
    // Systolic BP
    if (v.bpSystolic) { 
        if (v.bpSystolic <= 90) score += 3;
        else if (v.bpSystolic >= 220) score += 3; 
        else if (v.bpSystolic <= 100) score += 2; 
        else if (v.bpSystolic <= 110) score += 1; 
    }
    // Pulse
    if (v.hr) { 
        if (v.hr <= 40) score += 3;
        else if (v.hr >= 131) score += 3; 
        else if (v.hr >= 111) score += 2; 
        else if (v.hr <= 50 || v.hr >= 91) score += 1; 
    }
    // Consciousness
    if (v.avpu && v.avpu !== 'A') score += 3;
    // Temp
    if (v.temp) { 
        if (v.temp <= 35.0) score += 3; 
        else if (v.temp >= 39.1) score += 2; 
        else if (v.temp <= 36.0 || v.temp >= 38.1) score += 1; 
    }
    return score;
};

const EPRFPage = () => {
  const { user, verifyPin } = useAuth();
  const { saveEPRF, syncStatus, pendingChanges, isOnline } = useDataSync();
  const navigate = useNavigate();
  
  // -- State: Draft Management --
  const [drafts, setDrafts] = useState<EPRF[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);
  
  // -- Refs for Optimization --
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // -- State: UI Control --
  const [activeTab, setActiveTab] = useState('incident');
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [newLogMsg, setNewLogMsg] = useState('');
  const [managerNote, setManagerNote] = useState('');
  
  // -- State: Safeguarding AI --
  const [isScanningSafety, setIsScanningSafety] = useState(false);
  const [safetyAlert, setSafetyAlert] = useState<{type: string, reason: string} | null>(null);

  // -- State: Modals & Inputs --
  const [showLookup, setShowLookup] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [foundPatients, setFoundPatients] = useState<Patient[]>([]);
  
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [newDrug, setNewDrug] = useState({ 
      name: '', dose: '', route: '', batch: '', expiry: '', authorisation: 'JRCALC', authName: '', authPin: ''
  });
  
  // New Vital State
  const [newVital, setNewVital] = useState<Partial<VitalsEntry>>({
      time: '', hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined, 
      spo2: undefined, oxygen: false, temp: undefined, gcs: 15, news2Score: 0, avpu: 'A', bloodGlucose: undefined
  });
  
  const [badgeInput, setBadgeInput] = useState('');
  const [crewLookupLoading, setCrewLookupLoading] = useState(false);

  // -- State: Submission --
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitPin, setSubmitPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // -- State: Clock In Guard --
  const [showClockInGuard, setShowClockInGuard] = useState(false);

  // -- Load Drafts (Sync with Firestore for Shared Drafts) --
  useEffect(() => {
    if (!user) return;

    // Load local first for immediate render
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
        
        // Sort by timestamp desc to show newest first
        finalDrafts.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
        
        if (finalDrafts.length > 0) {
            setDrafts(finalDrafts);
            localStorage.setItem('aegis_eprfs', JSON.stringify(finalDrafts));
            if (!activeDraftId) {
                setActiveDraftId(finalDrafts[0].id);
            }
        }
    }, (err) => {
        console.error("ePRF sync error", err);
        // Do not clear drafts on permission error (offline fallback)
    });

    return () => unsub();
  }, [user]);

  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];
  const isReadOnly = activeDraft?.status === 'Submitted' && user?.role !== Role.Manager;
  const isManagerReview = activeDraft?.status === 'Submitted' && user?.role === Role.Manager;
  const isProvisional = activeDraft?.incidentNumber?.startsWith('PROVISIONAL');

  // Auto-redirect if mode changes and hides current tab
  useEffect(() => {
      if (!activeDraft) return;
      if (activeDraft.mode === 'Welfare' && activeTab === 'treatment') {
          setActiveTab('incident');
      }
  }, [activeDraft?.mode, activeTab]);

  // Auto-calc NEWS2 when newVital changes
  useEffect(() => {
      const score = calculateNEWS2(newVital);
      if (score !== newVital.news2Score) {
          setNewVital(prev => ({ ...prev, news2Score: score }));
      }
  }, [newVital.hr, newVital.rr, newVital.bpSystolic, newVital.spo2, newVital.oxygen, newVital.temp, newVital.avpu]);

  const updateDraft = (updates: Partial<EPRF>) => {
      if (!activeDraftId || isReadOnly) return;

      const updatedDraft = { ...activeDraft, ...updates, lastUpdated: new Date().toISOString() };

      setDrafts(prev => {
          const newDrafts = prev.map(d => d.id === activeDraftId ? updatedDraft : d);
          localStorage.setItem('aegis_eprfs', JSON.stringify(newDrafts));
          return newDrafts;
      });

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
          saveEPRF(updatedDraft);
      }, 1000); 
  };

  const updatePrimary = (cat: keyof PrimarySurvey, field: string, val: any) => {
      const current = activeDraft.assessment.primary || DEFAULT_PRIMARY;
      const updatedCategory = { ...current[cat], [field]: val };
      updateDraft({ 
          assessment: { 
              ...activeDraft.assessment, 
              primary: { ...current, [cat]: updatedCategory } 
          } 
      });
  };

  const generateNextIncidentNumber = async () => {
      const date = new Date();
      const yy = date.getFullYear().toString().slice(-2);
      const mm = (date.getMonth()+1).toString().padStart(2,'0');
      const prefix = `AMS${yy}${mm}`;
      
      try {
          const q = query(
              collection(db, 'eprfs'),
              where('incidentNumber', '>=', prefix),
              where('incidentNumber', '<=', prefix + '\uf8ff'),
              orderBy('incidentNumber', 'desc'),
              limit(1)
          );
          const snap = await getDocs(q);
          let nextSeq = 1;
          if (!snap.empty) {
              const lastId = snap.docs[0].data().incidentNumber;
              if (lastId.length >= 10) {
                  const sequencePart = lastId.slice(-3);
                  if (/^\d+$/.test(sequencePart)) {
                      nextSeq = parseInt(sequencePart) + 1;
                  }
              }
          }
          return `${prefix}${nextSeq.toString().padStart(3, '0')}`;
      } catch (e) {
          console.error("Error generating ID", e);
          // Fallback random if query fails (e.g. index missing)
          return `${prefix}${Math.floor(Math.random() * 900) + 100}`;
      }
  };

  const initiateCreateDraft = () => {
      const shiftId = localStorage.getItem('active_shift_id');
      if (!shiftId) {
          setShowClockInGuard(true);
      } else {
          createNewDraft(shiftId);
      }
  };

  const createNewDraft = async (shiftId?: string | null) => {
      if (!user) return;
      
      // Use crypto.randomUUID for stronger uniqueness
      let uniqueId = crypto.randomUUID ? crypto.randomUUID() : `draft_${Date.now()}`;
      let newIncidentNumber = `PROVISIONAL-${Date.now().toString().slice(-6)}`;
      
      const newDraft: EPRF = {
          id: uniqueId,
          incidentNumber: newIncidentNumber,
          shiftId: shiftId || undefined,
          ...DEFAULT_EPRF,
          location: '',
          callSign: user?.role === Role.Paramedic ? 'RRV-01' : 'MEDIC-01', // Should fetch from Shift resource
          accessUids: [user.uid], 
      };
      
      setDrafts(prev => {
          const updated = [newDraft, ...prev];
          localStorage.setItem('aegis_eprfs', JSON.stringify(updated));
          return updated;
      });
      setActiveDraftId(newDraft.id);
      setActiveTab('incident');
      setShowClockInGuard(false);
      saveEPRF(newDraft); // Initial save
  };

  const closeDraft = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (confirm('Are you sure you want to close this draft tab? Unsaved data might be lost if offline.')) {
          const newDrafts = drafts.filter(d => d.id !== id);
          setDrafts(newDrafts);
          localStorage.setItem('aegis_eprfs', JSON.stringify(newDrafts));
          if (activeDraftId === id && newDrafts.length > 0) setActiveDraftId(newDrafts[0].id);
          else if (newDrafts.length === 0) setActiveDraftId(null);
      }
  };

  const handleCrewLookup = async () => { if (!isOnline) { alert("Crew lookup requires an internet connection."); return; } if (!badgeInput) return; const fullId = badgeInput.toUpperCase().startsWith('AMS') ? badgeInput.toUpperCase() : `AMS${badgeInput}`; setCrewLookupLoading(true); try { const q = query(collection(db, 'users'), where('employeeId', '==', fullId)); const snap = await getDocs(q); if (snap.empty) { alert("Clinician not found. Please check Badge ID."); } else { const crewUser = snap.docs[0].data() as UserType; if (activeDraft.assistingClinicians.some(c => c.uid === crewUser.uid) || crewUser.uid === user?.uid) { alert("Clinician already assigned to this incident."); setCrewLookupLoading(false); return; } const newClinician: AssistingClinician = { uid: crewUser.uid, name: crewUser.name, role: crewUser.role, badgeNumber: crewUser.employeeId || fullId }; updateDraft({ assistingClinicians: [...activeDraft.assistingClinicians, newClinician], accessUids: [...activeDraft.accessUids, crewUser.uid] }); setBadgeInput(''); } } catch (e) { console.error("Lookup failed", e); alert("Error verifying badge ID."); } finally { setCrewLookupLoading(false); } };
  const removeCrewMember = (uid: string) => { updateDraft({ assistingClinicians: activeDraft.assistingClinicians.filter(c => c.uid !== uid), accessUids: activeDraft.accessUids.filter(id => id !== uid) }); };
  const handleValidation = () => { const missing = []; if (!activeDraft.patient.lastName) missing.push("Patient Name"); if (activeDraft.vitals.length === 0 && activeDraft.mode === 'Clinical') missing.push("Vitals"); if (!activeDraft.history.presentingComplaint && activeDraft.mode !== 'Minor') missing.push("Presenting Complaint"); if (activeDraft.governance.discharge.includes('Conveyed') && !activeDraft.governance.destinationLocation) missing.push("Destination Hospital"); if (activeDraft.governance.discharge.includes('Handover') && !activeDraft.governance.handoverClinician) missing.push("Handover Crew Details"); if ((activeDraft.governance.discharge.includes('Discharged') || activeDraft.governance.discharge.includes('Refusal')) && !activeDraft.governance.worseningAdviceDetails) { missing.push("Worsening Advice Details"); } if (missing.length > 0) { alert(`Cannot submit. Missing: ${missing.join(', ')}`); return false; } return true; };
  const initiateSubmit = () => { if (!handleValidation()) return; if (!isOnline && activeDraft.incidentNumber.startsWith('PROVISIONAL')) { alert("You are currently OFFLINE. \n\nYou can sign this form now, but it will be queued. A final Incident Number will be generated when you reconnect."); } setShowSubmitModal(true); };
  const finalizeSubmit = async () => { setIsSubmitting(true); const verified = await verifyPin(submitPin); if (!verified) { alert("Incorrect PIN. Signature Failed."); setIsSubmitting(false); return; } let finalId = activeDraft.incidentNumber; if (isOnline && activeDraft.incidentNumber.startsWith('PROVISIONAL')) { try { finalId = await generateNextIncidentNumber(); } catch (e) { alert("Error generating official Incident Number. Please try again."); setIsSubmitting(false); return; } } updateDraft({ status: 'Submitted', incidentNumber: finalId }); setShowSubmitModal(false); setSubmitPin(''); if (isOnline) alert(`ePRF ${finalId} Submitted Successfully.`); setIsSubmitting(false); };
  const handleManagerAction = async (action: 'Approved' | 'Returned') => { if (!managerNote) { alert("Please enter a review note."); return; } const newStatus = action === 'Approved' ? 'Approved' : 'Draft'; const newNote = { id: Date.now().toString(), timestamp: new Date().toISOString(), managerName: user?.name || 'Manager', note: managerNote, action }; const updatedDraft = { ...activeDraft, status: newStatus as any, reviewNotes: [...(activeDraft.reviewNotes || []), newNote] }; setDrafts(prev => prev.map(d => d.id === activeDraftId ? updatedDraft : d)); saveEPRF(updatedDraft); setManagerNote(''); if (action === 'Approved') { await generateEPRF_PDF(updatedDraft); } };
  const handleTimeNow = (field: keyof EPRF['times']) => { const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); updateDraft({ times: { ...activeDraft.times, [field]: time } }); };
  const handlePatientLookup = async () => { if (!isOnline) { alert("Spine lookup requires an internet connection."); return; } if (!lookupQuery) return; try { const q = query(collection(db, 'patients'), where('nhsNumber', '==', lookupQuery)); const snap = await getDocs(q); const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient)); setFoundPatients(results); } catch (error) { console.error("Lookup failed", error); } };
  const selectPatient = (p: Patient) => { updateDraft({ patient: { ...activeDraft.patient, firstName: p.firstName, lastName: p.lastName, dob: p.dob, nhsNumber: p.nhsNumber || '', address: p.address || '' } }); setShowLookup(false); setFoundPatients([]); setLookupQuery(''); };
  const initiateDrugAdd = () => { if (!newDrug.name) return; if (newDrug.authorisation === 'Out of Scope') { if (!newDrug.authName || !newDrug.authPin) { alert("Authorising Clinician Name and PIN are required."); return; } } if (CONTROLLED_DRUGS.includes(newDrug.name)) { setShowWitnessModal(true); } else { completeDrugAdd(undefined, undefined); } };
  const completeDrugAdd = (witnessName?: string, witnessUid?: string) => { const drug: DrugAdministration = { id: Date.now().toString(), time: new Date().toLocaleTimeString(), drugName: newDrug.name, dose: newDrug.dose, route: newDrug.route, batchNumber: newDrug.batch, expiryDate: newDrug.expiry, authorisation: newDrug.authorisation, authClinician: newDrug.authorisation === 'Out of Scope' ? newDrug.authName : undefined, administeredBy: user?.name || 'Unknown', witnessedBy: witnessName, witnessUid: witnessUid }; const drugs = [...activeDraft.treatments.drugs, drug]; updateDraft({ treatments: { ...activeDraft.treatments, drugs } }); setShowDrugModal(false); setShowWitnessModal(false); setNewDrug({ name: '', dose: '', route: '', batch: '', expiry: '', authorisation: 'JRCALC', authName: '', authPin: '' }); };
  const handleGenerateSBAR = async () => { if (!isOnline) { alert("AI features require an internet connection."); return; } const sbar = await generateSBAR(activeDraft); updateDraft({ handover: { ...activeDraft.handover, sbar } }); };
  const runAudit = async () => { if (!isOnline) { alert("Clinical Audit requires internet access to process."); return; } setIsAuditing(true); const res = await auditEPRF(activeDraft); setAuditResult(res); setIsAuditing(false); setShowAuditModal(true); };
  const handleSafeguardingScan = async () => { if (!isOnline) { alert("AI Scanning is unavailable offline."); return; } setIsScanningSafety(true); setSafetyAlert(null); const narrative = `PC: ${activeDraft.history.presentingComplaint} HPC: ${activeDraft.history.historyOfPresentingComplaint} PMH: ${activeDraft.history.pastMedicalHistory} Logs: ${activeDraft.logs.map(l => l.message).join('. ')}`; const result = await analyzeSafeguarding(narrative); if (result.detected) { setSafetyAlert({ type: result.type || 'General Concern', reason: result.reasoning || 'AI detected risk factors in narrative.' }); updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, concerns: true } } }); } else { alert("No obvious safeguarding keywords detected in narrative."); } setIsScanningSafety(false); };
  
  const addVitalEntry = () => {
      const entry: VitalsEntry = {
          time: newVital.time || new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          hr: newVital.hr || 0,
          rr: newVital.rr || 0,
          bpSystolic: newVital.bpSystolic || 0,
          bpDiastolic: newVital.bpDiastolic || 0,
          spo2: newVital.spo2 || 0,
          oxygen: newVital.oxygen || false,
          temp: newVital.temp || 36.5,
          gcs: newVital.gcs || 15,
          news2Score: calculateNEWS2(newVital),
          avpu: newVital.avpu || 'A',
          bloodGlucose: newVital.bloodGlucose,
          painScore: newVital.painScore
      };
      updateDraft({ vitals: [...activeDraft.vitals, entry] });
      setNewVital({ time: '', hr: undefined, rr: undefined, bpSystolic: undefined, bpDiastolic: undefined, spo2: undefined, oxygen: false, temp: undefined, gcs: 15, news2Score: 0, avpu: 'A', bloodGlucose: undefined });
  };

  const getTabStatus = (tabId: string) => {
      if (!activeDraft) return 'neutral';
      switch(tabId) {
          case 'incident': return activeDraft.times.callReceived ? 'complete' : 'incomplete';
          case 'patient': return activeDraft.patient.lastName ? 'complete' : 'incomplete';
          case 'assessment': return activeDraft.assessment.primary?.airway.status ? 'complete' : 'incomplete';
          case 'vitals': return activeDraft.vitals.length > 0 ? 'complete' : 'incomplete';
          case 'governance': return activeDraft.governance.discharge ? 'complete' : 'incomplete';
          case 'handover': return activeDraft.handover.clinicianSignature ? 'complete' : 'incomplete';
          default: return 'neutral';
      }
  };

  if (drafts.length === 0) {
      return (
          <>
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-xl max-w-md w-full border border-slate-200 dark:border-slate-700">
                    <div className="w-20 h-20 bg-ams-blue/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FilePlus className="w-10 h-10 text-ams-blue" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">No Active ePRF</h2>
                    <p className="text-slate-500 mb-8">Start a new clinical record to begin.</p>
                    <button onClick={initiateCreateDraft} className="w-full py-4 bg-ams-blue text-white rounded-xl font-bold text-lg shadow-lg hover:bg-blue-900 transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <Plus className="w-6 h-6" /> Create New ePRF
                    </button>
                </div>
            </div>

            {/* Clock In Guard Modal */}
            {showClockInGuard && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in zoom-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 border-l-8 border-amber-500">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                            <Clock className="w-6 h-6 text-amber-500" /> Not Clocked In
                        </h3>
                        <p className="text-slate-600 dark:text-slate-300 mb-6 text-sm">
                            You are not currently clocked into a shift. To ensure accurate audit trails and resource tracking, please clock in first.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => navigate('/')} className="w-full py-3 bg-ams-blue text-white font-bold rounded-xl shadow-md hover:bg-blue-900">
                                Go to Dashboard & Clock In
                            </button>
                            <button onClick={() => createNewDraft(null)} className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600">
                                Continue as Emergency / Ad-Hoc
                            </button>
                            <button onClick={() => setShowClockInGuard(false)} className="text-slate-400 text-sm font-bold hover:underline">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
          </>
      );
  }

  if (!activeDraft) return <div className="p-8 text-center flex flex-col items-center justify-center h-full"><Loader2 className="animate-spin mb-2 text-ams-blue" /> <span className="text-slate-500">Retrieving ePRF Data...</span></div>;

  const visibleTabs = TABS.filter(tab => {
      if (activeDraft.mode === 'Welfare' && tab.id === 'treatment') return false;
      return true;
  });

  return (
    <div className="h-full flex flex-col bg-slate-50 dark:bg-[#0F1115] overflow-hidden relative font-sans">
      
      {/* --- Manager Review Bar --- */}
      {isManagerReview && (
          <div className="bg-purple-600 text-white p-3 flex flex-col md:flex-row items-center justify-between shadow-md z-20 gap-3">
              <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-200" />
                  <div>
                      <h3 className="font-bold text-sm">Manager Review Mode</h3>
                      <p className="text-purple-200 text-xs">Reviewing submission from {activeDraft.logs[0]?.author || 'Clinician'}</p>
                  </div>
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                  <input 
                    className="bg-white/10 border border-white/30 rounded-lg px-3 py-2 text-sm w-full md:w-64 text-white placeholder-white/60 outline-none focus:bg-white/20 transition-all"
                    placeholder="Review notes..."
                    value={managerNote}
                    onChange={e => setManagerNote(e.target.value)}
                  />
                  <button onClick={() => handleManagerAction('Returned')} className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg text-xs transition-colors">Return</button>
                  <button onClick={() => handleManagerAction('Approved')} className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-lg text-xs transition-colors">Approve</button>
              </div>
          </div>
      )}

      {/* --- Tab Bar (Drafts) --- */}
      <div className="flex items-center bg-white dark:bg-[#172030] border-b border-slate-200 dark:border-slate-800 px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
          {drafts.map(draft => (
              <div 
                key={draft.id}
                onClick={() => setActiveDraftId(draft.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-bold cursor-pointer transition-all border-t border-x min-w-[140px] max-w-[200px] ${
                    activeDraftId === draft.id 
                    ? 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-ams-blue dark:text-white relative z-10' 
                    : 'bg-slate-100 dark:bg-[#0F1115] border-transparent text-slate-500 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                  <span className="truncate flex-1 font-mono tracking-tight flex items-center gap-1">
                      {draft.incidentNumber}
                      {draft.incidentNumber.startsWith('PROVISIONAL') && <span className="w-2 h-2 rounded-full bg-amber-500"></span>}
                  </span>
                  {draft.status === 'Submitted' && <Lock className="w-3 h-3 text-slate-400" />}
                  {pendingChanges > 0 && activeDraftId === draft.id && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Changes pending sync" />}
                  <button onClick={(e) => closeDraft(draft.id, e)} className="hover:text-red-500 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800"><X className="w-3 h-3" /></button>
              </div>
          ))}
          <button onClick={initiateCreateDraft} className="px-3 py-2 text-slate-400 hover:text-ams-blue hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
              <Plus className="w-5 h-5" />
          </button>
      </div>

      {/* --- Header Toolbar --- */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center bg-white dark:bg-[#172030] shadow-sm z-10 gap-4">
          <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3 flex-wrap tracking-tight">
                  {activeDraft.incidentNumber}
                  {isProvisional && (
                      <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded border border-amber-200 uppercase tracking-wider flex items-center gap-1">
                          <WifiOff className="w-3 h-3" /> Provisional ID
                      </span>
                  )}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide border ${
                      activeDraft.mode === 'Welfare' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                      activeDraft.mode === 'Minor' ? 'bg-green-50 border-green-200 text-green-700' :
                      'bg-blue-50 border-blue-200 text-blue-700'
                  }`}>
                      {activeDraft.mode} Mode
                  </span>
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">{activeDraft.callSign}</span> 
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span className="max-w-[150px] truncate">{activeDraft.location || 'No location set'}</span>
                  
                  {/* Sync Status Badge */}
                  <div className={`ml-2 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-bold transition-all ${
                      syncStatus === 'Syncing' ? 'bg-blue-100 text-blue-600' :
                      syncStatus === 'Offline' ? 'bg-amber-100 text-amber-600' :
                      'bg-green-100 text-green-600'
                  }`}>
                      {syncStatus === 'Syncing' && <><Cloud className="w-3 h-3 animate-pulse" /> Saving...</>}
                      {syncStatus === 'Offline' && <><Cloud className="w-3 h-3" /> Offline ({pendingChanges})</>}
                      {syncStatus === 'Synced' && <><CheckCircle className="w-3 h-3" /> All Saved</>}
                  </div>
              </div>
          </div>
          <div className="flex flex-wrap gap-4 w-full md:w-auto justify-start md:justify-end items-center">
              <button onClick={() => setShowLogModal(true)} className="btn-secondary flex items-center gap-2 px-4 py-2"><MessageSquare className="w-4 h-4" /> Log</button>
              <button onClick={runAudit} disabled={isAuditing || !isOnline} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Audit
              </button>
              {!isReadOnly && !isManagerReview && (
                  <button onClick={initiateSubmit} className="btn-primary flex items-center gap-2 px-6 py-3 shadow-md hover:shadow-lg transform active:scale-95 transition-all bg-ams-blue text-white rounded-lg font-bold text-md">
                      {isOnline ? <Lock className="w-4 h-4" /> : <Save className="w-4 h-4" />} 
                      {isOnline ? 'Sign & Submit' : 'Save Draft (Offline)'}
                  </button>
              )}
          </div>
      </div>

      {/* ... (rest of the file content matches previous version, Tabs and Main Content) ... */}
      
      {/* Navigation Tabs */}
      <div className="bg-white dark:bg-[#172030] border-b border-slate-200 dark:border-slate-800 shadow-sm z-10 w-full">
          <div className="flex overflow-x-auto no-scrollbar px-2 w-full">
            {visibleTabs.map(tab => {
                const status = getTabStatus(tab.id);
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap outline-none hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            activeTab === tab.id 
                            ? 'border-ams-blue text-ams-blue bg-blue-50/50 dark:bg-blue-900/10' 
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-ams-blue' : 'text-slate-400'}`} />
                        {tab.label}
                        {status === 'incomplete' && <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-3 right-3" />}
                        {status === 'complete' && <span className="w-1.5 h-1.5 rounded-full bg-green-500 absolute top-3 right-3" />}
                    </button>
                );
            })}
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-[#0F1115] scroll-smooth">
        <div className="max-w-full mx-auto space-y-8 pb-32">
            {/* The rest of the content (Incidents, Patients, Vitals, etc.) is implicitly included here from the previous full implementation.
                I am ensuring the wrapping div structure is correct. */}
            
            {/* Incident */}
            {activeTab === 'incident' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title">Event Configuration</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="input-label">Operational Mode</label>
                                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl">
                                        <button onClick={() => updateDraft({ mode: 'Clinical' })} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${activeDraft.mode === 'Clinical' ? 'bg-white dark:bg-slate-700 text-ams-blue dark:text-white ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Clinical</button>
                                        <button onClick={() => updateDraft({ mode: 'Minor' })} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${activeDraft.mode === 'Minor' ? 'bg-white dark:bg-slate-700 text-green-600 dark:text-green-400 ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Minor</button>
                                        <button onClick={() => updateDraft({ mode: 'Welfare' })} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${activeDraft.mode === 'Welfare' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Welfare</button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">
                                        {activeDraft.mode === 'Clinical' && "Standard full assessment protocol."}
                                        {activeDraft.mode === 'Minor' && "Simplified flow for minor injuries/OTC meds."}
                                        {activeDraft.mode === 'Welfare' && "Safety & welfare checks only."}
                                    </p>
                                </div>
                                <div>
                                    <label className="input-label">Location / Scene</label>
                                    <input className="input-field" value={activeDraft.location} onChange={e => updateDraft({ location: e.target.value })} placeholder="e.g. 123 High Street" />
                                </div>
                            </div>
                        </div>
                        <div className="card">
                            <h3 className="card-title">Timeline</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.entries(activeDraft.times).map(([key, val]) => (
                                    <div key={key} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-ams-blue/50 dark:hover:border-ams-blue/50 transition-colors">
                                        <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1.5 tracking-wide">{key.replace(/([A-Z])/g, ' $1').trim()}</label>
                                        <div className="flex gap-2">
                                            <input type="time" className="bg-transparent font-mono font-bold text-slate-900 dark:text-white w-full outline-none text-sm" value={val} onChange={(e) => updateDraft({ times: { ...activeDraft.times, [key]: e.target.value } })} />
                                            <button onClick={() => handleTimeNow(key as any)} className="text-ams-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded p-1"><Clock className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* ... Crew, Timeline ... */}
                    <div className="card">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="card-title flex items-center gap-2 mb-1"><Users className="w-5 h-5 text-ams-blue" /> Clinical Crew & Access</h3>
                                <p className="text-xs text-slate-500">Add other treating staff to this incident.</p>
                            </div>
                            {!isOnline && (
                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold border border-amber-200 flex items-center gap-1">
                                    <WifiOff className="w-3 h-3" /> Offline - Lookup Disabled
                                </span>
                            )}
                        </div>
                        
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <div className="absolute left-0 top-0 bottom-0 w-16 bg-slate-100 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 rounded-l-xl flex items-center justify-center text-slate-500 font-bold text-xs">
                                    AMS
                                </div>
                                <input 
                                    className="input-field pl-20" 
                                    placeholder="Badge ID (e.g. 25031234)" 
                                    value={badgeInput}
                                    onChange={e => setBadgeInput(e.target.value.replace(/\D/g, ''))}
                                    disabled={!isOnline}
                                />
                            </div>
                            <button 
                                onClick={handleCrewLookup}
                                disabled={crewLookupLoading || !badgeInput || !isOnline}
                                className="btn-primary w-32 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {crewLookupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-ams-blue rounded-full flex items-center justify-center text-white font-bold text-xs">
                                        {user?.name.charAt(0)}
                                    </div>
                                    <div>
                                        <span className="block text-sm font-bold text-slate-800 dark:text-white">{user?.name} (You)</span>
                                        <span className="text-xs text-slate-500">{user?.role} • {user?.employeeId}</span>
                                    </div>
                                </div>
                                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-300">Lead</span>
                            </div>
                            
                            {activeDraft.assistingClinicians?.map(crew => (
                                <div key={crew.uid} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 font-bold text-xs">
                                            {crew.name.charAt(0)}
                                        </div>
                                        <div>
                                            <span className="block text-sm font-bold text-slate-800 dark:text-white">{crew.name}</span>
                                            <span className="text-xs text-slate-500">{crew.role} • {crew.badgeNumber}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => removeCrewMember(crew.uid)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="card-title mb-0">Event Log</h3>
                            <button onClick={() => setShowLogModal(true)} className="btn-secondary text-xs"><Plus className="w-3 h-3" /> Add Log Entry</button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-4 max-h-[400px] overflow-y-auto">
                            <Timeline data={activeDraft} />
                        </div>
                    </div>
                </div>
            )}
            
            {/* The other tabs logic remains identical to previous, just ensuring they render */}
            {activeTab === 'patient' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                            <h3 className="card-title mb-0">Demographics</h3>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button 
                                    onClick={() => setShowLookup(true)} 
                                    disabled={!isOnline}
                                    className="btn-secondary text-xs flex-1 md:flex-none justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {!isOnline ? <WifiOff className="w-3 h-3" /> : <Search className="w-3 h-3" />} 
                                    {isOnline ? 'Spine Lookup' : 'Lookup Offline'}
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="input-label">First Name</label><input placeholder="John" className="input-field" value={activeDraft.patient.firstName} onChange={e => updateDraft({ patient: { ...activeDraft.patient, firstName: e.target.value } })} /></div>
                                    <div><label className="input-label">Last Name</label><input placeholder="Doe" className="input-field" value={activeDraft.patient.lastName} onChange={e => updateDraft({ patient: { ...activeDraft.patient, lastName: e.target.value } })} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="input-label">Date of Birth</label><input type="date" className="input-field text-slate-800 dark:text-white" value={activeDraft.patient.dob} onChange={e => updateDraft({ patient: { ...activeDraft.patient, dob: e.target.value } })} /></div>
                                    <div><label className="input-label">NHS Number</label><input placeholder="123 456 7890" className="input-field font-mono text-slate-800 dark:text-white" value={activeDraft.patient.nhsNumber} onChange={e => updateDraft({ patient: { ...activeDraft.patient, nhsNumber: e.target.value } })} /></div>
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Address</label>
                                <textarea rows={5} placeholder="Full postal address..." className="input-field resize-none leading-relaxed" value={activeDraft.patient.address} onChange={e => updateDraft({ patient: { ...activeDraft.patient, address: e.target.value } })} />
                            </div>
                        </div>
                    </div>
                    
                    <div className="card space-y-6">
                        <h3 className="card-title">Clinical History</h3>
                        {activeDraft.mode === 'Minor' ? (
                            <div>
                                <label className="input-label">Minor Injury / Illness Narrative</label>
                                <textarea 
                                    className="input-field" 
                                    rows={6} 
                                    placeholder="Describe nature of minor injury or reason for OTC request..."
                                    value={activeDraft.history.presentingComplaint}
                                    onChange={e => updateDraft({ history: { ...activeDraft.history, presentingComplaint: e.target.value } })}
                                />
                            </div>
                        ) : (
                            <>
                                <SpeechTextArea label="Presenting Complaint (PC)" value={activeDraft.history.presentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, presentingComplaint: e.target.value } })} rows={2} />
                                <SpeechTextArea label="History of PC (HPC)" value={activeDraft.history.historyOfPresentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, historyOfPresentingComplaint: e.target.value } })} rows={4} />
                                <SpeechTextArea label="Past Medical History (PMH)" value={activeDraft.history.pastMedicalHistory} onChange={e => updateDraft({ history: { ...activeDraft.history, pastMedicalHistory: e.target.value } })} rows={2} />
                            </>
                        )}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                             <div>
                                 <label className="input-label text-red-600 dark:text-red-400">Allergies</label>
                                 <input placeholder="NKDA" className="input-field border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 font-bold bg-red-50 dark:bg-red-900/10 focus:ring-red-500 placeholder-red-300" value={activeDraft.history.allergies} onChange={e => updateDraft({ history: { ...activeDraft.history, allergies: e.target.value } })} />
                             </div>
                             <div>
                                 <label className="input-label">Current Medications</label>
                                 <input placeholder="List medications..." className="input-field" value={activeDraft.history.medications} onChange={e => updateDraft({ history: { ...activeDraft.history, medications: e.target.value } })} />
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Vitals */}
            {activeTab === 'vitals' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <h3 className="card-title">Observations Trend</h3>
                        <VitalsChart data={activeDraft.vitals} />
                    </div>

                    <div className="card">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-4">
                            <h3 className="card-title mb-0 border-0 pb-0">Add Vital Signs</h3>
                            {newVital.news2Score !== undefined && (
                                <div className={`flex flex-col items-end`}>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">NEWS2 Score</span>
                                    <span className={`text-2xl font-bold ${newVital.news2Score >= 7 ? 'text-red-600' : newVital.news2Score >= 5 ? 'text-amber-600' : 'text-green-600'}`}>
                                        {newVital.news2Score}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div><label className="input-label">Time</label><input type="time" className="input-field" value={newVital.time} onChange={e => setNewVital({...newVital, time: e.target.value})} /></div>
                            <div><label className="input-label">HR</label><input type="number" className="input-field" value={newVital.hr || ''} onChange={e => setNewVital({...newVital, hr: Number(e.target.value)})} placeholder="BPM" /></div>
                            <div><label className="input-label">RR</label><input type="number" className="input-field" value={newVital.rr || ''} onChange={e => setNewVital({...newVital, rr: Number(e.target.value)})} placeholder="/min" /></div>
                            <div>
                                <label className="input-label">SpO2</label>
                                <div className="flex gap-2">
                                    <input type="number" className="input-field" value={newVital.spo2 || ''} onChange={e => setNewVital({...newVital, spo2: Number(e.target.value)})} placeholder="%" />
                                    <button onClick={() => setNewVital({...newVital, oxygen: !newVital.oxygen})} className={`px-2 rounded-lg font-bold text-xs ${newVital.oxygen ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 text-slate-400'}`}>O2</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div><label className="input-label">BP Systolic</label><input type="number" className="input-field" value={newVital.bpSystolic || ''} onChange={e => setNewVital({...newVital, bpSystolic: Number(e.target.value)})} /></div>
                            <div><label className="input-label">BP Diastolic</label><input type="number" className="input-field" value={newVital.bpDiastolic || ''} onChange={e => setNewVital({...newVital, bpDiastolic: Number(e.target.value)})} /></div>
                            <div><label className="input-label">Temp</label><input type="number" step="0.1" className="input-field" value={newVital.temp || ''} onChange={e => setNewVital({...newVital, temp: Number(e.target.value)})} placeholder="°C" /></div>
                            <div>
                                <label className="input-label">AVPU</label>
                                <select className="input-field" value={newVital.avpu} onChange={e => setNewVital({...newVital, avpu: e.target.value as any})}>
                                    <option>A</option><option>V</option><option>P</option><option>U</option>
                                </select>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div><label className="input-label">Blood Glucose</label><input type="number" step="0.1" className="input-field" value={newVital.bloodGlucose || ''} onChange={e => setNewVital({...newVital, bloodGlucose: Number(e.target.value)})} placeholder="mmol/L" /></div>
                            <div><label className="input-label">GCS Total</label><input type="number" max={15} className="input-field" value={newVital.gcs || ''} onChange={e => setNewVital({...newVital, gcs: Number(e.target.value)})} /></div>
                            <div className="col-span-2 flex items-end">
                                <button onClick={addVitalEntry} className="btn-primary w-full py-3">Record Vitals</button>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                            <h4 className="text-xs font-bold uppercase text-slate-500 mb-3">History</h4>
                            <div className="space-y-2">
                                {activeDraft.vitals.slice().reverse().map((v, i) => (
                                    <div key={i} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm border border-slate-100 dark:border-slate-800">
                                        <span className="font-mono font-bold text-slate-600 dark:text-slate-400">{v.time}</span>
                                        <div className="flex gap-4 text-slate-800 dark:text-white font-medium">
                                            <span>HR: {v.hr}</span>
                                            <span>BP: {v.bpSystolic}/{v.bpDiastolic}</span>
                                            <span>SpO2: {v.spo2}%</span>
                                            <span>GCS: {v.gcs}</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${v.news2Score >= 7 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>NEWS: {v.news2Score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Treatment, Assessment, Governance, Handover - similar structure ensuring robust rendering of sub-components */}
            {activeTab === 'treatment' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {activeDraft.mode === 'Minor' ? (
                        <div className="card">
                            <h3 className="card-title">Treatment & Advice</h3>
                            <div>
                                <label className="input-label">Action Taken</label>
                                <textarea 
                                    className="input-field" 
                                    rows={4}
                                    placeholder="e.g. Wound cleaned with saline, plaster applied. Worsening advice given."
                                    value={activeDraft.treatments.minorTreatment || ''}
                                    onChange={e => updateDraft({ treatments: { ...activeDraft.treatments, minorTreatment: e.target.value } })}
                                />
                            </div>
                            {/* ... Buttons ... */}
                        </div>
                    ) : (
                        <div className="card">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="card-title flex items-center gap-2 mb-0"><Syringe className="w-5 h-5 text-ams-blue" /> Medications</h3>
                                <button onClick={() => setShowDrugModal(true)} className="btn-secondary text-xs"><Plus className="w-3 h-3" /> Add Drug</button>
                            </div>
                            {/* ... Drug List ... */}
                            {activeDraft.treatments.drugs.length === 0 ? (
                                <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <p className="text-slate-400 font-medium">No medication administered.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {activeDraft.treatments.drugs.map((d, i) => (
                                        <div key={i} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm flex justify-between items-center group hover:border-ams-blue dark:hover:border-ams-blue transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-ams-blue rounded-lg font-bold text-lg">
                                                    {d.time.substring(0, 5)}
                                                </div>
                                                <div>
                                                    <span className="font-bold text-slate-800 dark:text-white text-lg block">{d.drugName}</span>
                                                    <span className="text-slate-600 dark:text-slate-400 text-sm font-medium block">{d.dose} • {d.route}</span>
                                                    <span className="text-[10px] text-slate-400 block mt-1">
                                                        Auth: {d.authorisation} {d.authClinician ? `(${d.authClinician})` : ''}
                                                    </span>
                                                </div>
                                            </div>
                                            {d.witnessedBy && (
                                                <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full border border-purple-200 dark:border-purple-800 flex items-center gap-1 font-bold">
                                                    <Eye className="w-3 h-3" /> {d.witnessedBy}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Assessment */}
            {activeTab === 'assessment' && activeDraft.mode === 'Clinical' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <h3 className="card-title">Primary Survey (ABCDE)</h3>
                        {/* ... ABCDE Inputs ... */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                            <label className="text-sm font-bold uppercase text-slate-500 pt-3">Airway</label>
                            <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <select className="input-field" value={activeDraft.assessment.primary?.airway.status} onChange={e => updatePrimary('airway', 'status', e.target.value)}>
                                    <option>Patent</option><option>Obstructed (Partial)</option><option>Obstructed (Complete)</option>
                                    <option>Swollen / Oedema</option><option>Vomit / Blood</option><option>Risk of Aspiration</option>
                                </select>
                                <input className="input-field" placeholder="Notes (e.g. OPA inserted)" value={activeDraft.assessment.primary?.airway.notes} onChange={e => updatePrimary('airway', 'notes', e.target.value)} />
                            </div>
                        </div>
                        {/* ... Breathing ... */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                            <label className="text-sm font-bold uppercase text-slate-500 pt-3">Breathing</label>
                            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div><label className="input-label">Rate</label><input type="number" className="input-field" value={activeDraft.assessment.primary?.breathing.rate} onChange={e => updatePrimary('breathing', 'rate', e.target.value)} /></div>
                                <div><label className="input-label">Rhythm</label><select className="input-field" value={activeDraft.assessment.primary?.breathing.rhythm} onChange={e => updatePrimary('breathing', 'rhythm', e.target.value)}><option>Regular</option><option>Irregular</option></select></div>
                                <div><label className="input-label">Depth</label><select className="input-field" value={activeDraft.assessment.primary?.breathing.depth} onChange={e => updatePrimary('breathing', 'depth', e.target.value)}><option>Normal</option><option>Shallow</option><option>Deep</option></select></div>
                                <div><label className="input-label">Effort</label><select className="input-field" value={activeDraft.assessment.primary?.breathing.effort} onChange={e => updatePrimary('breathing', 'effort', e.target.value)}><option>Normal</option><option>Laboured</option><option>Accessory Muscle</option></select></div>
                                <div><label className="input-label">Air Entry</label><select className="input-field" value={activeDraft.assessment.primary?.breathing.airEntry} onChange={e => updatePrimary('breathing', 'airEntry', e.target.value)}><option>Equal</option><option>Reduced L</option><option>Reduced R</option><option>Silent</option></select></div>
                            </div>
                        </div>
                        {/* ... Circulation ... */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start border-b border-slate-100 dark:border-slate-700 pb-4">
                            <label className="text-sm font-bold uppercase text-slate-500 pt-3">Circulation</label>
                            <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div><label className="input-label">Radial</label><select className="input-field" value={activeDraft.assessment.primary?.circulation.radialPulse} onChange={e => updatePrimary('circulation', 'radialPulse', e.target.value)}><option>Present</option><option>Absent</option></select></div>
                                <div><label className="input-label">Skin</label><select className="input-field" value={activeDraft.assessment.primary?.circulation.skin} onChange={e => updatePrimary('circulation', 'skin', e.target.value)}><option>Normal</option><option>Pale</option><option>Flushed</option><option>Cyanosed</option><option>Mottled</option></select></div>
                                <div><label className="input-label">Cap Refill</label><select className="input-field" value={activeDraft.assessment.primary?.circulation.capRefill} onChange={e => updatePrimary('circulation', 'capRefill', e.target.value)}><option>&lt; 2s</option><option>&gt; 2s</option></select></div>
                            </div>
                        </div>
                        {/* ... Disability/Exposure ... */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                            <label className="text-sm font-bold uppercase text-slate-500 pt-3">D & E</label>
                            <div className="md:col-span-3 grid grid-cols-3 gap-4">
                                <div><label className="input-label">AVPU</label><select className="input-field" value={activeDraft.assessment.primary?.disability.avpu} onChange={e => updatePrimary('disability', 'avpu', e.target.value)}><option>Alert</option><option>Voice</option><option>Pain</option><option>Unresponsive</option></select></div>
                                <div><label className="input-label">Pupils</label><select className="input-field" value={activeDraft.assessment.primary?.disability.pupils} onChange={e => updatePrimary('disability', 'pupils', e.target.value)}><option>PERRLA</option><option>Unequal</option><option>Pinpoint</option><option>Fixed</option></select></div>
                                <div><label className="input-label">BM</label><input className="input-field" value={activeDraft.assessment.primary?.disability.bloodGlucose} onChange={e => updatePrimary('disability', 'bloodGlucose', e.target.value)} /></div>
                            </div>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="card-title">Trauma Triage</h3>
                        <TraumaTriage value={activeDraft.assessment.traumaTriage} onChange={v => updateDraft({ assessment: { ...activeDraft.assessment, traumaTriage: v } })} />
                    </div>

                    <div className="card">
                        <h3 className="card-title">Neuro Assessment</h3>
                        <NeuroAssessment data={activeDraft.assessment.neuro} onChange={v => updateDraft({ assessment: { ...activeDraft.assessment, neuro: v } })} />
                    </div>

                    <div className="card">
                        <h3 className="card-title">Body Map & Injuries</h3>
                        <BodyMap value={activeDraft.injuries} onChange={v => updateDraft({ injuries: v })} />
                    </div>
                </div>
            )}

            {/* Governance */}
            {activeTab === 'governance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Safeguarding */}
                    <div className="card border-amber-200 dark:border-amber-800">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="font-bold text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                <ShieldAlert className="w-5 h-5" /> Safeguarding
                            </h3>
                            <button onClick={handleSafeguardingScan} disabled={isScanningSafety} className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-3 py-1 rounded font-bold hover:bg-amber-200 transition-colors flex items-center gap-2 disabled:opacity-50">
                                {isScanningSafety ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} AI Scan
                            </button>
                        </div>
                        
                        {safetyAlert && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl mb-4 text-sm text-red-700 dark:text-red-300">
                                <strong>AI Alert:</strong> {safetyAlert.type} - {safetyAlert.reason}
                            </div>
                        )}

                        <div className="flex gap-4 mb-4">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-700 dark:text-slate-200">
                                <input type="checkbox" checked={activeDraft.governance.safeguarding.concerns} onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, concerns: e.target.checked } } })} className="w-5 h-5 text-ams-blue rounded focus:ring-ams-blue" />
                                Concerns Raised?
                            </label>
                        </div>
                        
                        {activeDraft.governance.safeguarding.concerns && (
                            <div className="space-y-3 animate-in fade-in">
                                <input className="input-field" placeholder="Type of Concern (e.g. Neglect, Abuse)" value={activeDraft.governance.safeguarding.type} onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, type: e.target.value } } })} />
                                <textarea className="input-field" rows={3} placeholder="Details of concern and referral made..." value={activeDraft.governance.safeguarding.details} onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, details: e.target.value } } })} />
                            </div>
                        )}
                    </div>

                    {/* Capacity */}
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2"><Brain className="w-5 h-5 text-ams-blue" /> Mental Capacity Act</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="input-label">Capacity Status</label>
                                <select className="input-field mb-4" value={activeDraft.governance.capacity.status} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, status: e.target.value as any } } })}>
                                    <option>Capacity Present</option>
                                    <option>Capacity Lacking</option>
                                </select>
                                
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 border p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                                        <input type="checkbox" checked={activeDraft.governance.capacity.stage1Impairment} onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage1Impairment: e.target.checked } } })} className="w-4 h-4 text-ams-blue rounded" />
                                        <span>Stage 1: Impairment of Mind/Brain?</span>
                                    </label>
                                    
                                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                                        <p className="text-xs font-bold text-slate-500 uppercase mb-2">Stage 2: Functional Test</p>
                                        {(['understand', 'retain', 'weigh', 'communicate'] as const).map(k => (
                                            <label key={k} className="flex items-center gap-2 mb-2 text-sm">
                                                <input 
                                                    type="checkbox" 
                                                    checked={activeDraft.governance.capacity.stage2Functional[k]}
                                                    onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, [k]: e.target.checked } } } })}
                                                    className="w-4 h-4 text-green-600 rounded"
                                                />
                                                Can {k}?
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Best Interests Rationale</label>
                                <textarea 
                                    className="input-field h-full min-h-[150px]" 
                                    placeholder="If capacity is lacking, describe why the proposed treatment/conveyance is in the patient's best interests..."
                                    value={activeDraft.governance.capacity.bestInterestsRationale || ''}
                                    onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, bestInterestsRationale: e.target.value } } })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Discharge */}
                    <div className="card">
                        <h3 className="card-title">Discharge & Plan</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="input-label">Outcome</label>
                                <select className="input-field" value={activeDraft.governance.discharge} onChange={e => updateDraft({ governance: { ...activeDraft.governance, discharge: e.target.value } })}>
                                    <option value="">Select Outcome...</option>
                                    <option>Conveyed to ED</option>
                                    <option>Conveyed to Other (Medical)</option>
                                    <option>Referral to GP / Community</option>
                                    <option>See & Treat (Discharged on Scene)</option>
                                    <option>Patient Refusal (Against Advice)</option>
                                    <option>Handover to Police</option>
                                </select>
                            </div>

                            {activeDraft.governance.discharge.includes('Conveyed') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in">
                                    <div><label className="input-label">Destination</label><input className="input-field" placeholder="Hospital Name" value={activeDraft.governance.destinationLocation} onChange={e => updateDraft({ governance: { ...activeDraft.governance, destinationLocation: e.target.value } })} /></div>
                                    <div><label className="input-label">Handover To</label><input className="input-field" placeholder="Nurse / Doctor Name" value={activeDraft.governance.handoverClinician} onChange={e => updateDraft({ governance: { ...activeDraft.governance, handoverClinician: e.target.value } })} /></div>
                                </div>
                            )}

                            {(activeDraft.governance.discharge.includes('Discharged') || activeDraft.governance.discharge.includes('Refusal')) && (
                                <div className="space-y-4 animate-in fade-in">
                                    <div>
                                        <label className="input-label">Worsening Advice (Safety Netting)</label>
                                        <textarea className="input-field" rows={3} placeholder="Specific advice given to patient regarding when to call back..." value={activeDraft.governance.worseningAdviceDetails} onChange={e => updateDraft({ governance: { ...activeDraft.governance, worseningAdviceDetails: e.target.value } })} />
                                    </div>
                                    
                                    {activeDraft.governance.discharge.includes('Refusal') && (
                                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl">
                                            <h4 className="font-bold text-red-800 dark:text-red-400 mb-3 text-sm">Refusal Checklist</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activeDraft.governance.refusal.capacityConfirmed} onChange={e => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, capacityConfirmed: e.target.checked } } })} className="w-4 h-4 text-red-600 rounded" /> Capacity Confirmed</label>
                                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activeDraft.governance.refusal.risksExplained} onChange={e => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, risksExplained: e.target.checked } } })} className="w-4 h-4 text-red-600 rounded" /> Risks Explained</label>
                                                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={activeDraft.governance.refusal.alternativesOffered} onChange={e => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, alternativesOffered: e.target.checked } } })} className="w-4 h-4 text-red-600 rounded" /> Alternatives Offered</label>
                                            </div>
                                            <div className="mt-4">
                                                <SignaturePad label="Patient Signature (Refusal Confirmation)" value={activeDraft.governance.refusal.patientSignature} onSave={val => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, patientSignature: val } } })} />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Handover */}
            {activeTab === 'handover' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="card-title mb-0">SBAR Handovers</h3>
                            <button onClick={handleGenerateSBAR} className="btn-secondary text-xs" disabled={!isOnline}>
                                <Sparkles className="w-3 h-3 text-ams-gold" /> AI Generate SBAR
                            </button>
                        </div>
                        <SpeechTextArea 
                            label="Situation / Background / Assessment / Recommendation" 
                            rows={8} 
                            value={activeDraft.handover.sbar} 
                            onChange={e => updateDraft({ handover: { ...activeDraft.handover, sbar: e.target.value } })} 
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title">Clinician Declaration</h3>
                            <div className="mb-4 text-xs text-slate-500 italic">
                                I confirm that the information recorded is accurate and I have acted within my scope of practice.
                            </div>
                            <SignaturePad 
                                label="Clinician Signature" 
                                value={activeDraft.handover.clinicianSignature} 
                                onSave={val => updateDraft({ handover: { ...activeDraft.handover, clinicianSignature: val } })} 
                            />
                        </div>
                        
                        <div className="card">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                                <h3 className="card-title mb-0 border-0 pb-0">Patient Confirmation</h3>
                                <div className="flex gap-1">
                                    <button onClick={() => updateDraft({ handover: { ...activeDraft.handover, patientSignatureType: 'Signed' } })} className={`px-2 py-1 text-xs font-bold rounded ${activeDraft.handover.patientSignatureType !== 'Unable' && activeDraft.handover.patientSignatureType !== 'Refused' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>Sign</button>
                                    <button onClick={() => updateDraft({ handover: { ...activeDraft.handover, patientSignatureType: 'Unable', patientSignature: '' } })} className={`px-2 py-1 text-xs font-bold rounded ${activeDraft.handover.patientSignatureType === 'Unable' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>Unable</button>
                                    <button onClick={() => updateDraft({ handover: { ...activeDraft.handover, patientSignatureType: 'Refused', patientSignature: '' } })} className={`px-2 py-1 text-xs font-bold rounded ${activeDraft.handover.patientSignatureType === 'Refused' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>Refused</button>
                                </div>
                            </div>
                            
                            {activeDraft.handover.patientSignatureType === 'Unable' && (
                                <div className="p-8 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-700 font-bold text-sm">
                                    Patient unable to sign (e.g. Unconscious/Injury).
                                </div>
                            )}
                            
                            {activeDraft.handover.patientSignatureType === 'Refused' && (
                                <div className="p-8 bg-red-50 border border-red-200 rounded-xl text-center text-red-700 font-bold text-sm">
                                    Patient refused to sign.
                                </div>
                            )}

                            {(activeDraft.handover.patientSignatureType !== 'Unable' && activeDraft.handover.patientSignatureType !== 'Refused') && (
                                <SignaturePad 
                                    label="Patient Signature" 
                                    value={activeDraft.handover.patientSignature} 
                                    onSave={val => updateDraft({ handover: { ...activeDraft.handover, patientSignature: val } })} 
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

      {showDrugModal && (
          // ... Drug Modal same as before ...
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                  <h3 className="font-bold text-lg text-slate-800 dark:text-white">Add Medication</h3>
                  <select className="input-field h-12 text-lg" value={newDrug.name} onChange={e => setNewDrug({...newDrug, name: e.target.value})}>
                      <option value="">Select Drug...</option>
                      {DRUG_DATABASE.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                  </select>
                  
                  {CONTROLLED_DRUGS.includes(newDrug.name) && (
                      <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-200 dark:border-purple-800 space-y-1 animate-in slide-in-from-top-2">
                          <p className="text-sm font-bold text-purple-700 dark:text-purple-300 flex items-center gap-2"><Lock className="w-4 h-4" /> Controlled Drug</p>
                          <p className="text-xs text-purple-600 dark:text-purple-400 pl-6">Witness verification required upon submission.</p>
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="input-label">Dose</label><input className="input-field" placeholder="e.g. 10mg" value={newDrug.dose} onChange={e => setNewDrug({...newDrug, dose: e.target.value})} /></div>
                     <div><label className="input-label">Route</label><input className="input-field" placeholder="e.g. IV" value={newDrug.route} onChange={e => setNewDrug({...newDrug, route: e.target.value})} /></div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="input-label">Batch No.</label><input className="input-field" placeholder="Optional" value={newDrug.batch} onChange={e => setNewDrug({...newDrug, batch: e.target.value})} /></div>
                     <div><label className="input-label">Expiry</label><input type="date" className="input-field" value={newDrug.expiry} onChange={e => setNewDrug({...newDrug, expiry: e.target.value})} /></div>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
                      <label className="input-label mb-2">Authorisation</label>
                      <select className="input-field mb-3" value={newDrug.authorisation} onChange={e => setNewDrug({...newDrug, authorisation: e.target.value})}>
                          <option>JRCALC</option>
                          <option>PGD</option>
                          <option>Patient's Own Meds</option>
                          <option>Out of Scope / Unlicensed</option>
                      </select>
                      
                      {newDrug.authorisation === 'Out of Scope / Unlicensed' && (
                          <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800 space-y-3 animate-in slide-in-from-top-2">
                              <p className="text-xs font-bold text-red-700 dark:text-red-400 flex items-center gap-1"><AlertOctagon className="w-3 h-3" /> Authorising Clinician Required</p>
                              <input className="input-field border-red-200" placeholder="Clinician Name" value={newDrug.authName} onChange={e => setNewDrug({...newDrug, authName: e.target.value})} />
                              <input type="password" className="input-field border-red-200" placeholder="Clinician PIN" value={newDrug.authPin} onChange={e => setNewDrug({...newDrug, authPin: e.target.value})} maxLength={4} />
                          </div>
                      )}
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setShowDrugModal(false)} className="btn-secondary">Cancel</button>
                      <button onClick={initiateDrugAdd} className="btn-primary">Add Drug</button>
                  </div>
              </div>
          </div>
      )}
      
      {showWitnessModal && <WitnessModal drugName={newDrug.name} onWitnessConfirmed={completeDrugAdd} onCancel={() => setShowWitnessModal(false)} />}
      
      {/* Submit Modal */}
      {showSubmitModal && (
          <div className="fixed inset-0 z-[70] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 border border-white/10">
                  <div className="text-center mb-8">
                      <div className="w-20 h-20 bg-blue-50 dark:bg-blue-900/30 text-ams-blue dark:text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-inner">
                          <Lock className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-white">Sign & Submit</h3>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Enter your secure PIN to sign this record.</p>
                  </div>
                  <div className="relative">
                      <Key className="absolute left-4 top-4 w-5 h-5 text-slate-400" />
                      <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={4} autoFocus className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-lg mb-6 focus:ring-2 focus:ring-ams-blue outline-none text-center tracking-[0.5em] font-mono font-bold dark:text-white" placeholder="••••" value={submitPin} onChange={e => setSubmitPin(e.target.value.replace(/\D/g, ''))} />
                  </div>
                  <div className="space-y-3">
                      <button onClick={finalizeSubmit} disabled={isSubmitting || submitPin.length !== 4} className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 disabled:opacity-50 flex items-center justify-center gap-3 transition-transform active:scale-95">
                          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />} Confirm Signature
                      </button>
                      <button onClick={() => setShowSubmitModal(false)} className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white">Cancel</button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .card { @apply bg-white dark:bg-[#172030] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6; }
        .card-title { @apply font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2 block; }
        .btn-primary { @apply px-5 py-2.5 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-sm text-sm active:scale-95; }
        .btn-secondary { @apply px-5 py-2.5 bg-white dark:bg-[#172030] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm flex items-center gap-2 active:scale-95 shadow-sm; }
      `}</style>
    </div>
  );
};

export default EPRFPage;
