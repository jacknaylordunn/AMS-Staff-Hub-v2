
import React, { useState, useEffect } from 'react';
import { Save, Activity, User, AlertTriangle, Bot, Pill, FileText, ClipboardList, Plus, Lock, Search, Cloud, ShieldCheck, Sparkles, Loader2, Camera, Trash2, X, Eye, Gauge, Brain, Stethoscope, Syringe, Briefcase, FilePlus, Zap, Clock, MessageSquare, Menu, CheckCircle, AlertOctagon, UserPlus, Coffee, Moon, ThumbsUp, ThumbsDown, Droplets, ChevronRight, ShieldAlert, MoreVertical, Key, Users } from 'lucide-react';
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
import { VitalsEntry, EPRF, Role, NeuroAssessment as NeuroType, DrugAdministration, Consumable, MediaAttachment, LogEntry, Patient, AssistingClinician, User as UserType } from '../types';
import { DRUG_DATABASE, CONTROLLED_DRUGS } from '../data/drugDatabase';
import { generateEPRF_PDF } from '../utils/pdfGenerator';
import { useAuth } from '../hooks/useAuth';
import { useDataSync } from '../hooks/useDataSync';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, addDoc, onSnapshot } from 'firebase/firestore';

// --- Default Data Structures ---

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
    assessment: { airway: 'Patent', breathing: 'Normal', circulation: 'Normal', disability: 'A - Alert', exposure: 'Normal', neuro: DEFAULT_NEURO },
    vitals: [],
    injuries: [],
    treatments: { drugs: [], interventions: [], consumables: [] },
    governance: { 
        safeguarding: { concerns: false, type: '', details: '' }, 
        capacity: { status: 'Capacity Present', stage1Impairment: false, stage2Functional: { understand: true, retain: true, weigh: true, communicate: true } }, 
        discharge: 'Conveyed to Hospital',
        refusal: { risksExplained: false, alternativesOffered: false, capacityConfirmed: false, worseningAdviceGiven: false }
    },
    handover: { sbar: '', clinicianSignature: '', patientSignature: '', media: [] },
    logs: []
};

const CONSUMABLES_LIST = [
    'IV Cannula (18G Green)', 'IV Cannula (20G Pink)', 'IV Cannula (22G Blue)',
    'IV Giving Set', '0.9% Saline (500ml)', '0.9% Saline (1000ml)',
    'Oxygen Mask (Non-rebreather)', 'Nebuliser Mask', 'ECG Electrodes (Pack)',
    'Bandage (Crepe)', 'Bandage (Triangular)', 'Dressings (Pack)', 'Maternity Pack',
    'Sick Bowl', 'Blanket', 'Pillows'
];

const INTERVENTIONS_LIST = [
    'Recovery Position', 'Oropharyngeal Airway (OPA)', 'Nasopharyngeal Airway (NPA)', 
    'i-gel / SGA', 'Endotracheal Intubation', 'Manual In-line Stabilisation', 
    'C-Collar', 'Pelvic Binder', 'Traction Splint', 'Wound Dressing', 
    'Direct Pressure', 'Tourniquet', 'Defibrillation', 'CPR', 'Oxygen Therapy'
];

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
    if (v.rr) { if (v.rr <= 8 || v.rr >= 25) score += 3; else if (v.rr >= 21) score += 2; else if (v.rr <= 11) score += 1; }
    if (v.spo2) { if (v.spo2 <= 91) score += 3; else if (v.spo2 <= 93) score += 2; else if (v.spo2 <= 95) score += 1; }
    if (v.oxygen) score += 2;
    if (v.bpSystolic) { if (v.bpSystolic <= 90 || v.bpSystolic >= 220) score += 3; else if (v.bpSystolic <= 100) score += 2; else if (v.bpSystolic <= 110) score += 1; }
    if (v.hr) { if (v.hr <= 40 || v.hr >= 131) score += 3; else if (v.hr >= 111) score += 2; else if (v.hr <= 50 || v.hr >= 91) score += 1; }
    if (v.avpu && v.avpu !== 'A') score += 3;
    if (v.temp) { if (v.temp <= 35.0) score += 3; else if (v.temp >= 39.1) score += 2; else if (v.temp <= 36.0 || v.temp >= 38.1) score += 1; }
    return score;
};

const EPRFPage = () => {
  const { user, verifyPin } = useAuth();
  const { saveEPRF, syncStatus, pendingChanges } = useDataSync();
  
  // -- State: Draft Management --
  const [drafts, setDrafts] = useState<EPRF[]>([]);
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null);

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
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [lookupQuery, setLookupQuery] = useState('');
  const [foundPatients, setFoundPatients] = useState<Patient[]>([]);
  const [newPatientData, setNewPatientData] = useState({ firstName: '', lastName: '', dob: '', nhsNumber: '', gender: '' });
  
  const [showDrugModal, setShowDrugModal] = useState(false);
  const [showWitnessModal, setShowWitnessModal] = useState(false);
  const [newDrug, setNewDrug] = useState({ name: '', dose: '', route: '' });
  
  const [badgeInput, setBadgeInput] = useState('');
  const [crewLookupLoading, setCrewLookupLoading] = useState(false);

  // -- State: Submission --
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitPin, setSubmitPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- Load Drafts (Sync with Firestore for Shared Drafts) --
  useEffect(() => {
    if (!user) return;

    // 1. Load from LocalStorage initially for speed
    const localSaved = localStorage.getItem('aegis_eprfs');
    let localDrafts: EPRF[] = [];
    if (localSaved) {
        try { localDrafts = JSON.parse(localSaved); } catch(e) {}
    }

    // 2. Subscribe to Firestore for any draft where I am an allowed user (Creator or Assisting)
    const q = query(collection(db, 'eprfs'), where('accessUids', 'array-contains', user.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
        const serverDrafts = snapshot.docs.map(doc => doc.data() as EPRF);
        
        // Merge Strategy: Prefer Server for Shared, Prefer Local for pure local (not yet synced)
        // Simple approach: Union arrays by ID, using server version if exists.
        
        const mergedMap = new Map<string, EPRF>();
        
        // Add local drafts first
        localDrafts.forEach(d => mergedMap.set(d.id, d));
        
        // Overwrite with server drafts (source of truth for collaboration)
        serverDrafts.forEach(d => mergedMap.set(d.id, d));
        
        const finalDrafts = Array.from(mergedMap.values());
        
        if (finalDrafts.length === 0 && localDrafts.length === 0) {
            // Only create new if absolutely nothing exists
            createNewDraft();
        } else {
            setDrafts(finalDrafts);
            if (!activeDraftId && finalDrafts.length > 0) {
                setActiveDraftId(finalDrafts[0].id);
            }
        }
    });

    return () => unsub();
  }, [user]); // Run on user auth change

  // -- Save Drafts on Change --
  useEffect(() => {
    if (drafts.length > 0) {
        localStorage.setItem('aegis_eprfs', JSON.stringify(drafts));
        // Sync active draft to Cloud
        const active = drafts.find(d => d.id === activeDraftId);
        if (active) saveEPRF(active);
    }
  }, [drafts, activeDraftId]);

  const activeDraft = drafts.find(d => d.id === activeDraftId) || drafts[0];
  const isReadOnly = activeDraft?.status === 'Submitted' && user?.role !== Role.Manager;
  const isManagerReview = activeDraft?.status === 'Submitted' && user?.role === Role.Manager;

  const updateDraft = (updates: Partial<EPRF>) => {
      if (!activeDraftId || isReadOnly) return;
      setDrafts(prev => prev.map(d => 
          d.id === activeDraftId ? { ...d, ...updates, lastUpdated: new Date().toISOString() } : d
      ));
  };

  const createNewDraft = () => {
      if (!user) return;
      const date = new Date();
      const yyyy = date.getFullYear();
      const mm = (date.getMonth()+1).toString().padStart(2,'0');
      const dd = date.getDate().toString().padStart(2,'0');
      const uniqueSuffix = Date.now().toString().slice(-6);
      const newId = `AMS${yyyy}${mm}${dd}-${uniqueSuffix}`;
      
      const shiftData = localStorage.getItem('aegis_on_shift');
      const shiftLoc = localStorage.getItem('aegis_shift_location_name');
      
      let location = '';
      if (shiftData === 'true' && shiftLoc) location = shiftLoc;

      const newDraft: EPRF = {
          id: Date.now().toString(),
          incidentNumber: newId,
          ...DEFAULT_EPRF,
          location: location,
          callSign: user?.role === Role.Paramedic ? 'RRV-01' : 'MEDIC-01', 
          accessUids: [user.uid], // Important: Initialize with creator
      };
      setDrafts(prev => [...prev, newDraft]);
      setActiveDraftId(newDraft.id);
      setActiveTab('incident');
  };

  const closeDraft = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (drafts.length === 1) {
          if (confirm('Clear this draft?')) {
             setDrafts([]);
             createNewDraft();
          }
      } else {
          const newDrafts = drafts.filter(d => d.id !== id);
          setDrafts(newDrafts);
          if (activeDraftId === id) setActiveDraftId(newDrafts[0].id);
      }
  };

  const handleCrewLookup = async () => {
      if (!badgeInput) return;
      
      // Handle both "AMS1234..." and just the numbers
      const fullId = badgeInput.toUpperCase().startsWith('AMS') ? badgeInput.toUpperCase() : `AMS${badgeInput}`;
      
      setCrewLookupLoading(true);
      try {
          const q = query(collection(db, 'users'), where('employeeId', '==', fullId));
          const snap = await getDocs(q);
          
          if (snap.empty) {
              alert("Clinician not found. Please check Badge ID.");
          } else {
              const crewUser = snap.docs[0].data() as UserType;
              
              // Check if already added
              if (activeDraft.assistingClinicians.some(c => c.uid === crewUser.uid) || crewUser.uid === user?.uid) {
                  alert("Clinician already assigned to this incident.");
                  setCrewLookupLoading(false);
                  return;
              }

              const newClinician: AssistingClinician = {
                  uid: crewUser.uid,
                  name: crewUser.name,
                  role: crewUser.role,
                  badgeNumber: crewUser.employeeId || fullId
              };

              // Add to Assisting Clinicians AND Access UIDs (for permissions)
              updateDraft({
                  assistingClinicians: [...activeDraft.assistingClinicians, newClinician],
                  accessUids: [...activeDraft.accessUids, crewUser.uid]
              });
              
              setBadgeInput('');
          }
      } catch (e) {
          console.error("Lookup failed", e);
          alert("Error verifying badge ID.");
      } finally {
          setCrewLookupLoading(false);
      }
  };

  const removeCrewMember = (uid: string) => {
      updateDraft({
          assistingClinicians: activeDraft.assistingClinicians.filter(c => c.uid !== uid),
          accessUids: activeDraft.accessUids.filter(id => id !== uid)
      });
  };

  const handleValidation = () => {
      const missing = [];
      if (!activeDraft.patient.lastName) missing.push("Patient Name");
      if (activeDraft.vitals.length === 0 && activeDraft.mode === 'Clinical') missing.push("Vitals");
      if (!activeDraft.history.presentingComplaint) missing.push("Presenting Complaint");
      
      if (missing.length > 0) {
          alert(`Cannot submit. Missing: ${missing.join(', ')}`);
          return false;
      }
      return true;
  };

  const initiateSubmit = () => {
      if (!handleValidation()) return;
      setShowSubmitModal(true);
  };

  const finalizeSubmit = async () => {
      setIsSubmitting(true);
      const verified = await verifyPin(submitPin);
      if (verified) {
          updateDraft({ status: 'Submitted' });
          setShowSubmitModal(false);
          setSubmitPin('');
          alert("ePRF Signed & Submitted for Review.");
      } else {
          alert("Incorrect PIN. Signature Failed.");
      }
      setIsSubmitting(false);
  };

  const handleManagerAction = async (action: 'Approved' | 'Returned') => {
      if (!managerNote) {
          alert("Please enter a review note.");
          return;
      }
      const newStatus = action === 'Approved' ? 'Approved' : 'Draft';
      const newNote = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          managerName: user?.name || 'Manager',
          note: managerNote,
          action
      };
      
      setDrafts(prev => prev.map(d => 
        d.id === activeDraftId ? { 
            ...d, 
            status: newStatus, 
            reviewNotes: [...(d.reviewNotes || []), newNote] 
        } : d
      ));
      
      setManagerNote('');
      if (action === 'Approved') {
          await generateEPRF_PDF(activeDraft);
      }
  };

  const handleTimeNow = (field: keyof EPRF['times']) => {
      const time = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      updateDraft({ times: { ...activeDraft.times, [field]: time } });
  };

  const handlePatientLookup = async () => {
      if (!lookupQuery) return;
      try {
          const q = query(collection(db, 'patients'), where('nhsNumber', '==', lookupQuery));
          const snap = await getDocs(q);
          const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
          setFoundPatients(results);
      } catch (error) {
          console.error("Lookup failed", error);
      }
  };

  const selectPatient = (p: Patient) => {
      updateDraft({
          patient: {
              ...activeDraft.patient,
              firstName: p.firstName,
              lastName: p.lastName,
              dob: p.dob,
              nhsNumber: p.nhsNumber || '',
              address: p.address || ''
          }
      });
      setShowLookup(false);
      setFoundPatients([]);
      setLookupQuery('');
  };
  
  const handleCreatePatient = async () => {
      try {
          await addDoc(collection(db, 'patients'), {
              ...newPatientData,
              createdAt: new Date().toISOString()
          });

          updateDraft({
              patient: {
                  ...activeDraft.patient,
                  ...newPatientData,
                  address: ''
              }
          });
          setShowCreatePatient(false);
          setNewPatientData({ firstName: '', lastName: '', dob: '', nhsNumber: '', gender: '' });
      } catch (error) {
          console.error("Failed to create patient", error);
          alert("Error creating patient profile");
      }
  };

  const addVitalsRow = () => {
    const newVital: VitalsEntry = {
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        hr: 0, rr: 0, bpSystolic: 0, bpDiastolic: 0, spo2: 0, oxygen: false, temp: 0, gcs: 15, news2Score: 0, avpu: 'A'
    };
    updateDraft({ vitals: [...activeDraft.vitals, newVital] });
  };

  const updateVital = (index: number, field: keyof VitalsEntry, value: any) => {
      const newVitals = [...activeDraft.vitals];
      const entry = { ...newVitals[index], [field]: value };
      entry.news2Score = calculateNEWS2(entry);
      newVitals[index] = entry;
      updateDraft({ vitals: newVitals });
  };

  const initiateDrugAdd = () => {
      if (!newDrug.name) return;
      if (CONTROLLED_DRUGS.includes(newDrug.name)) {
          setShowWitnessModal(true);
      } else {
          completeDrugAdd(undefined, undefined);
      }
  };

  const completeDrugAdd = (witnessName?: string, witnessUid?: string) => {
      const drug: DrugAdministration = {
          id: Date.now().toString(),
          time: new Date().toLocaleTimeString(),
          drugName: newDrug.name,
          dose: newDrug.dose,
          route: newDrug.route,
          administeredBy: user?.name || 'Unknown',
          witnessedBy: witnessName,
          witnessUid: witnessUid
      };
      const drugs = [...activeDraft.treatments.drugs, drug];
      updateDraft({ treatments: { ...activeDraft.treatments, drugs } });
      setShowDrugModal(false);
      setShowWitnessModal(false);
      setNewDrug({ name: '', dose: '', route: '' });
  };

  const handleAddIntervention = (name: string) => {
      if (!activeDraft.treatments.interventions.includes(name)) {
          updateDraft({ treatments: { ...activeDraft.treatments, interventions: [...activeDraft.treatments.interventions, name] } });
      }
  };

  const handleAddConsumable = (name: string) => {
      const current = activeDraft.treatments.consumables.find(c => c.name === name);
      let newConsumables;
      if (current) {
          newConsumables = activeDraft.treatments.consumables.map(c => c.name === name ? { ...c, quantity: c.quantity + 1 } : c);
      } else {
          newConsumables = [...activeDraft.treatments.consumables, { id: Date.now().toString(), name, quantity: 1 }];
      }
      updateDraft({ treatments: { ...activeDraft.treatments, consumables: newConsumables } });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  const newMedia: MediaAttachment = {
                      id: Date.now().toString(),
                      type: 'Photo',
                      url: ev.target.result as string,
                      timestamp: new Date().toLocaleTimeString()
                  };
                  updateDraft({ handover: { ...activeDraft.handover, media: [...activeDraft.handover.media, newMedia] } });
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleGenerateSBAR = async () => {
    const sbar = await generateSBAR(activeDraft);
    updateDraft({ handover: { ...activeDraft.handover, sbar } });
  };

  const runAudit = async () => {
      setIsAuditing(true);
      const res = await auditEPRF(activeDraft);
      setAuditResult(res);
      setIsAuditing(false);
      setShowAuditModal(true);
  };

  const handleSafeguardingScan = async () => {
      setIsScanningSafety(true);
      setSafetyAlert(null);
      const narrative = `
        PC: ${activeDraft.history.presentingComplaint}
        HPC: ${activeDraft.history.historyOfPresentingComplaint}
        PMH: ${activeDraft.history.pastMedicalHistory}
        Logs: ${activeDraft.logs.map(l => l.message).join('. ')}
      `;
      
      const result = await analyzeSafeguarding(narrative);
      if (result.detected) {
          setSafetyAlert({ type: result.type || 'General Concern', reason: result.reasoning || 'AI detected risk factors in narrative.' });
          updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, concerns: true } } });
      } else {
          alert("No obvious safeguarding keywords detected in narrative.");
      }
      setIsScanningSafety(false);
  };

  const handleAddLog = (msg?: string) => {
      const message = msg || newLogMsg;
      if (!message.trim()) return;
      
      const newLog: LogEntry = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          category: activeDraft.mode === 'Welfare' ? 'Clinical' : 'Info',
          message: message,
          author: user?.name || 'User'
      };
      updateDraft({ logs: [...(activeDraft.logs || []), newLog] });
      setNewLogMsg('');
      setShowLogModal(false);
  };

  useEffect(() => {
      if (!activeDraft) return;
      const { stage1Impairment, stage2Functional } = activeDraft.governance.capacity;
      const functionFailed = !stage2Functional.understand || !stage2Functional.retain || !stage2Functional.weigh || !stage2Functional.communicate;
      
      const newStatus = (stage1Impairment && functionFailed) ? 'Capacity Lacking' : 'Capacity Present';
      
      if (newStatus !== activeDraft.governance.capacity.status) {
          updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, status: newStatus } } });
      }
  }, [activeDraft?.governance.capacity.stage1Impairment, activeDraft?.governance.capacity.stage2Functional]);


  const getTabStatus = (tabId: string) => {
      if (!activeDraft) return 'neutral';
      switch(tabId) {
          case 'incident': return activeDraft.times.callReceived ? 'complete' : 'incomplete';
          case 'patient': return activeDraft.patient.lastName ? 'complete' : 'incomplete';
          case 'assessment': return activeDraft.assessment.airway ? 'complete' : 'incomplete';
          case 'vitals': return activeDraft.vitals.length > 0 ? 'complete' : 'incomplete';
          case 'governance': return activeDraft.governance.discharge ? 'complete' : 'incomplete';
          case 'handover': return activeDraft.handover.clinicianSignature ? 'complete' : 'incomplete';
          default: return 'neutral';
      }
  };

  if (!activeDraft) return <div className="p-8 text-center flex flex-col items-center justify-center h-full"><Loader2 className="animate-spin mb-2 text-ams-blue" /> <span className="text-slate-500">Retrieving ePRF Data...</span></div>;

  const visibleTabs = TABS.filter(tab => {
      if (activeDraft.mode === 'Welfare' && tab.id === 'treatment') return false;
      return true;
  });

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col bg-white/50 dark:bg-[#0F1115] backdrop-blur-xl rounded-2xl shadow-xl border border-white/40 dark:border-slate-800 overflow-hidden relative font-sans">
      
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
      <div className="flex items-center bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 px-2 pt-2 gap-1 overflow-x-auto no-scrollbar">
          {drafts.map(draft => (
              <div 
                key={draft.id}
                onClick={() => setActiveDraftId(draft.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold cursor-pointer transition-all border-t border-x min-w-[140px] max-w-[200px] ${
                    activeDraftId === draft.id 
                    ? 'bg-white dark:bg-[#172030] border-white dark:border-[#172030] text-ams-blue dark:text-white shadow-[0_-2px_10px_rgba(0,0,0,0.05)] relative z-10' 
                    : 'bg-slate-200/50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                  <span className="truncate flex-1 font-mono">{draft.incidentNumber}</span>
                  {draft.status === 'Submitted' && <Lock className="w-3 h-3 text-slate-400" />}
                  {draft.assistingClinicians && draft.assistingClinicians.length > 0 && <Users className="w-3 h-3 text-blue-500" />}
                  {pendingChanges > 0 && activeDraftId === draft.id && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" title="Changes pending sync" />}
                  <button onClick={(e) => closeDraft(draft.id, e)} className="hover:text-red-500 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20"><X className="w-3 h-3" /></button>
              </div>
          ))}
          <button onClick={createNewDraft} className="px-3 py-2 text-slate-500 dark:text-slate-400 hover:text-ams-blue hover:bg-white/50 dark:hover:bg-slate-700/50 rounded-t-lg transition-colors">
              <Plus className="w-5 h-5" />
          </button>
      </div>

      {/* --- Header Toolbar --- */}
      <div className="px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap justify-between items-center bg-white dark:bg-[#172030] shadow-sm z-10 gap-4">
          <div className="flex flex-col gap-1 w-full md:w-auto">
              <h2 className="text-xl font-extrabold text-slate-800 dark:text-white flex items-center gap-3 flex-wrap">
                  {activeDraft.incidentNumber}
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide ${activeDraft.mode === 'Welfare' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                      {activeDraft.mode}
                  </span>
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2 mt-1 flex-wrap font-medium">
                  <span className="bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-700 dark:text-slate-200 font-bold">{activeDraft.callSign}</span> 
                  <ChevronRight className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  <span>{activeDraft.location || 'No location set'}</span>
                  {syncStatus === 'Syncing' && <span className="text-blue-500 flex items-center gap-1 ml-2"><Cloud className="w-3 h-3 animate-pulse" /> Saving...</span>}
                  {syncStatus === 'Offline' && <span className="text-amber-500 flex items-center gap-1 ml-2"><Cloud className="w-3 h-3" /> Offline ({pendingChanges})</span>}
              </p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto justify-start md:justify-end">
              <button onClick={() => setShowLogModal(true)} className="btn-secondary flex-1 md:flex-none justify-center"><MessageSquare className="w-4 h-4" /> Log</button>
              <button onClick={runAudit} disabled={isAuditing} className="btn-secondary text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 flex-1 md:flex-none justify-center">
                  {isAuditing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Audit
              </button>
              {!isReadOnly && !isManagerReview && (
                  <button onClick={initiateSubmit} className="btn-primary flex items-center gap-2 shadow-lg shadow-blue-500/20 flex-1 md:flex-none justify-center">
                      <Lock className="w-4 h-4" /> Sign & Submit
                  </button>
              )}
          </div>
      </div>

      {/* --- Navigation Tabs --- */}
      <div className="bg-white dark:bg-[#172030] border-b border-slate-200 dark:border-slate-700 shadow-sm z-10 w-full">
          <div className="flex overflow-x-auto no-scrollbar px-2 w-full">
            {visibleTabs.map(tab => {
                const status = getTabStatus(tab.id);
                return (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative flex-shrink-0 flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap outline-none ${
                            activeTab === tab.id 
                            ? 'border-ams-blue text-ams-blue bg-blue-50/50 dark:bg-blue-900/20 dark:text-blue-400' 
                            : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                    >
                        <div className={`p-1.5 rounded-lg ${activeTab === tab.id ? 'bg-white dark:bg-slate-800 shadow-sm text-ams-blue dark:text-blue-400' : 'bg-transparent text-slate-400 dark:text-slate-500'}`}>
                            <tab.icon className="w-4 h-4" />
                        </div>
                        {tab.label}
                        {status === 'incomplete' && <span className="w-2 h-2 rounded-full bg-red-500 absolute top-3 right-3 ring-2 ring-white dark:ring-slate-800" />}
                        {status === 'complete' && <span className="w-2 h-2 rounded-full bg-green-500 absolute top-3 right-3 ring-2 ring-white dark:ring-slate-800" />}
                    </button>
                );
            })}
          </div>
      </div>

      {/* --- Main Content --- */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50/50 dark:bg-[#0F1115] scroll-smooth">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">

            {/* Incident */}
            {activeTab === 'incident' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card">
                            <h3 className="card-title">Event Configuration</h3>
                            <div className="space-y-6">
                                <div>
                                    <label className="input-label">Operational Mode</label>
                                    <div className="flex gap-3 bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                                        <button onClick={() => updateDraft({ mode: 'Clinical' })} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${activeDraft.mode === 'Clinical' ? 'bg-white dark:bg-slate-600 text-ams-blue dark:text-white ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Clinical</button>
                                        <button onClick={() => updateDraft({ mode: 'Welfare' })} className={`flex-1 py-3 rounded-lg font-bold text-sm transition-all shadow-sm ${activeDraft.mode === 'Welfare' ? 'bg-white dark:bg-slate-600 text-amber-600 dark:text-amber-400 ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>Welfare</button>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 px-1">Switching to Welfare mode hides complex clinical tools.</p>
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
                                    <div key={key} className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-ams-blue/30 transition-colors shadow-sm">
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

                    {/* Crew Resource Management */}
                    <div className="card">
                        <h3 className="card-title flex items-center gap-2"><Users className="w-5 h-5 text-ams-blue" /> Clinical Crew & Access</h3>
                        <p className="text-xs text-slate-500 mb-4">Add other treating staff to this incident. They will be able to view and edit this record.</p>
                        
                        <div className="flex gap-2 mb-4">
                            <div className="relative flex-1">
                                <div className="absolute left-0 top-0 bottom-0 w-16 bg-slate-100 dark:bg-slate-700 border-r border-slate-200 dark:border-slate-600 rounded-l-xl flex items-center justify-center text-slate-500 font-bold text-xs">
                                    AMS
                                </div>
                                <input 
                                    className="input-field pl-20" 
                                    placeholder="Badge ID (e.g. 25031234)" 
                                    value={badgeInput}
                                    onChange={e => setBadgeInput(e.target.value.replace(/\D/g, ''))}
                                />
                            </div>
                            <button 
                                onClick={handleCrewLookup}
                                disabled={crewLookupLoading || !badgeInput}
                                className="btn-primary w-32 flex items-center justify-center gap-2 disabled:opacity-50"
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
                                <span className="text-xs font-bold bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded text-slate-600 dark:text-slate-300">Lead</span>
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
                        <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 p-4 max-h-[400px] overflow-y-auto">
                            <Timeline data={activeDraft} />
                        </div>
                    </div>
                </div>
            )}

            {/* Patient */}
            {activeTab === 'patient' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-3">
                            <h3 className="card-title mb-0">Demographics</h3>
                            <div className="flex gap-3 w-full md:w-auto">
                                <button onClick={() => setShowCreatePatient(true)} className="btn-secondary text-xs flex-1 md:flex-none justify-center"><UserPlus className="w-3 h-3" /> Create New</button>
                                <button onClick={() => setShowLookup(true)} className="btn-secondary text-xs flex-1 md:flex-none justify-center"><Search className="w-3 h-3" /> Spine Lookup</button>
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
                        <SpeechTextArea label="Presenting Complaint (PC)" value={activeDraft.history.presentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, presentingComplaint: e.target.value } })} rows={2} />
                        <SpeechTextArea label="History of PC (HPC)" value={activeDraft.history.historyOfPresentingComplaint} onChange={e => updateDraft({ history: { ...activeDraft.history, historyOfPresentingComplaint: e.target.value } })} rows={4} />
                        <SpeechTextArea label="Past Medical History (PMH)" value={activeDraft.history.pastMedicalHistory} onChange={e => updateDraft({ history: { ...activeDraft.history, pastMedicalHistory: e.target.value } })} rows={2} />
                        
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

            {/* Assessment */}
            {activeTab === 'assessment' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Welfare Mode UI */}
                    {activeDraft.mode === 'Welfare' ? (
                        <div className="space-y-6">
                            <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl shadow-sm">
                                <h3 className="text-amber-800 dark:text-amber-400 font-bold mb-6 flex items-center gap-2 text-lg">
                                    <Coffee className="w-6 h-6" /> Welfare Observations Dashboard
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    {[
                                        { label: 'Sleeping', icon: Moon, color: 'text-purple-500', msg: 'Patient sleeping comfortably.' },
                                        { label: 'Hydration', icon: Droplets, color: 'text-blue-500', msg: 'Offered water. Patient accepted.' },
                                        { label: 'Calm', icon: ThumbsUp, color: 'text-green-500', msg: 'Patient alert and oriented. Behaviour calm.' },
                                        { label: 'Agitated', icon: ThumbsDown, color: 'text-red-500', msg: 'Patient agitated / aggressive.' }
                                    ].map((action, i) => (
                                        <button 
                                            key={i}
                                            onClick={() => handleAddLog(action.msg)} 
                                            className="p-4 bg-white dark:bg-slate-800 border border-amber-100/50 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md hover:scale-105 transition-all flex flex-col items-center gap-3 group"
                                        >
                                            <action.icon className={`w-8 h-8 ${action.color} group-hover:animate-bounce`} />
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{action.label}</span>
                                        </button>
                                    ))}
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-amber-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300 text-sm mb-4 uppercase tracking-wide">Rapid Vitals (Simplified)</h4>
                                    <div className="flex flex-col md:flex-row gap-4 items-end">
                                        <div className="flex-1 w-full"><label className="input-label">HR</label><input type="number" className="input-field" placeholder="BPM" /></div>
                                        <div className="flex-1 w-full"><label className="input-label">RR</label><input type="number" className="input-field" placeholder="/min" /></div>
                                        <div className="flex-1 w-full"><label className="input-label">AVPU</label>
                                        <select className="input-field h-[46px]">
                                            <option>A</option><option>V</option><option>P</option><option>U</option>
                                        </select></div>
                                        <button onClick={addVitalsRow} className="btn-secondary h-[46px] px-6 w-full md:w-auto">Log</button>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="card">
                                <h3 className="card-title">Observation Log</h3>
                                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                    {activeDraft.logs?.filter(l => l.category === 'Clinical').map(log => (
                                        <div key={log.id} className="p-3 border-l-4 border-amber-400 bg-slate-50 dark:bg-slate-900/50 rounded-r-lg text-sm flex gap-3">
                                            <span className="font-mono text-xs font-bold text-slate-400 pt-0.5">{log.timestamp.split('T')[1].substring(0,5)}</span>
                                            <span className="text-slate-700 dark:text-slate-300">{log.message}</span>
                                        </div>
                                    ))}
                                    {(!activeDraft.logs || activeDraft.logs.filter(l => l.category === 'Clinical').length === 0) && (
                                        <div className="text-center py-8 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                            <p className="text-slate-400 text-sm font-medium">No observations recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        // Clinical Mode UI
                        <>
                            <div className="card">
                                <h3 className="card-title">Primary Survey (ABCDE)</h3>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {['Airway', 'Breathing', 'Circulation', 'Disability', 'Exposure'].map(f => (
                                        <div key={f} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2 block">{f}</label>
                                            <select 
                                                className={`w-full bg-white dark:bg-slate-800 border rounded-lg px-2 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-ams-blue ${
                                                    (activeDraft.assessment as any)[f.toLowerCase()] === 'Normal' || (activeDraft.assessment as any)[f.toLowerCase()] === 'Patent' || (activeDraft.assessment as any)[f.toLowerCase()] === 'A - Alert'
                                                    ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400' 
                                                    : 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400'
                                                }`}
                                                value={(activeDraft.assessment as any)[f.toLowerCase()]}
                                                onChange={e => updateDraft({ assessment: { ...activeDraft.assessment, [f.toLowerCase()]: e.target.value } })}
                                            >
                                                <option>Normal</option><option>Abnormal</option><option>Critical</option>
                                                {f === 'Airway' && <option>Patent</option>}
                                                {f === 'Disability' && <option>A - Alert</option>}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <NeuroAssessment 
                                        data={activeDraft.assessment.neuro} 
                                        onChange={(neuro) => updateDraft({ assessment: { ...activeDraft.assessment, neuro } })}
                                    />
                                    <TraumaTriage 
                                        value={activeDraft.assessment.traumaTriage}
                                        onChange={(res) => updateDraft({ assessment: { ...activeDraft.assessment, traumaTriage: res } })}
                                    />
                                </div>

                                <div className="card flex flex-col h-full">
                                    <h3 className="card-title mb-4">Body Map</h3>
                                    <div className="flex-1 flex justify-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                        <BodyMap 
                                            value={activeDraft.injuries} 
                                            onChange={(injuries) => updateDraft({ injuries })} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Vitals */}
            {activeTab === 'vitals' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                             <h3 className="card-title mb-0">Observations Trend</h3>
                             <button onClick={addVitalsRow} className="btn-primary shadow-lg shadow-blue-500/20">+ Add Set</button>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
                            <VitalsChart data={activeDraft.vitals} />
                        </div>
                        
                        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                             <table className="w-full min-w-[900px] text-sm text-left">
                                <thead className="bg-slate-100 dark:bg-slate-900 text-xs uppercase text-slate-600 dark:text-slate-400 font-bold">
                                    <tr>
                                        <th className="p-3">Time</th><th>HR</th><th>BP (Sys)</th><th>BP (Dia)</th><th>RR</th><th>O2</th><th>SpO2</th><th>Temp</th><th>BG</th><th>Pain</th><th>AVPU</th><th>NEWS2</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-[#172030]">
                                    {activeDraft.vitals.map((v, i) => (
                                        <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="p-3"><input type="time" value={v.time} readOnly className="w-full bg-transparent font-mono font-bold text-slate-900 dark:text-white outline-none text-center" /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.hr} onChange={e => updateVital(i, 'hr', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.bpSystolic} onChange={e => updateVital(i, 'bpSystolic', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.bpDiastolic} onChange={e => updateVital(i, 'bpDiastolic', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.rr} onChange={e => updateVital(i, 'rr', Number(e.target.value))} /></td>
                                            <td className="p-3 flex justify-center pt-5"><input type="checkbox" className="w-6 h-6 rounded border-slate-300 dark:border-slate-600 text-ams-blue focus:ring-ams-blue" checked={v.oxygen} onChange={e => updateVital(i, 'oxygen', e.target.checked)} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.spo2} onChange={e => updateVital(i, 'spo2', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.temp} onChange={e => updateVital(i, 'temp', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" className="w-16 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.bloodGlucose} onChange={e => updateVital(i, 'bloodGlucose', Number(e.target.value))} /></td>
                                            <td className="p-3"><input type="number" max="10" className="w-14 h-12 border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white rounded px-2 text-center font-medium text-slate-900" value={v.painScore} onChange={e => updateVital(i, 'painScore', Number(e.target.value))} /></td>
                                            <td className="p-3">
                                                <select className="w-16 h-12 border border-slate-300 dark:border-slate-600 rounded px-1 text-center font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white" value={v.avpu} onChange={e => updateVital(i, 'avpu', e.target.value)}>
                                                    <option>A</option><option>V</option><option>P</option><option>U</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <span className={`font-bold px-3 py-1.5 rounded-full text-white text-xs inline-block min-w-[30px] text-center ${
                                                    v.news2Score >= 7 ? 'bg-red-600 shadow-sm' : 
                                                    v.news2Score >= 5 ? 'bg-amber-500' : 
                                                    v.news2Score >= 1 ? 'bg-yellow-500' : 'bg-green-500'
                                                }`}>
                                                    {v.news2Score}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                             </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Treatment */}
            {activeTab === 'treatment' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="card-title flex items-center gap-2 mb-0"><Syringe className="w-5 h-5 text-ams-blue" /> Medications</h3>
                            <button onClick={() => setShowDrugModal(true)} className="btn-secondary text-xs"><Plus className="w-3 h-3" /> Add Drug</button>
                        </div>
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
                                                <span className="text-slate-600 dark:text-slate-400 text-sm font-medium">{d.dose} • {d.route}</span>
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

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="card h-full">
                             <h3 className="card-title mb-4">Interventions</h3>
                             <div className="flex flex-wrap gap-2 mb-6">
                                 {INTERVENTIONS_LIST.map(item => (
                                     <button 
                                        key={item} 
                                        onClick={() => handleAddIntervention(item)} 
                                        disabled={activeDraft.treatments.interventions.includes(item)}
                                        className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-ams-blue hover:text-ams-blue disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:border-slate-100 dark:disabled:border-slate-800 rounded-lg text-xs font-bold transition-all dark:text-slate-300"
                                     >
                                         + {item}
                                     </button>
                                 ))}
                             </div>
                             <div className="space-y-2">
                                 {activeDraft.treatments.interventions.map(item => (
                                     <div key={item} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800 text-sm font-bold">
                                         {item}
                                         <button onClick={() => updateDraft({ treatments: { ...activeDraft.treatments, interventions: activeDraft.treatments.interventions.filter(i => i !== item) } })} className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded text-blue-500"><X className="w-4 h-4" /></button>
                                     </div>
                                 ))}
                             </div>
                        </div>

                        <div className="card h-full">
                             <h3 className="card-title flex items-center gap-2 mb-4"><Briefcase className="w-5 h-5 text-ams-blue" /> Consumables</h3>
                             <div className="flex flex-wrap gap-2 mb-6">
                                 {CONSUMABLES_LIST.map(item => (
                                     <button key={item} onClick={() => handleAddConsumable(item)} className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-ams-blue hover:text-ams-blue dark:text-slate-300 rounded-lg text-xs font-bold transition-all">
                                         + {item}
                                     </button>
                                 ))}
                             </div>
                             <div className="space-y-2">
                                 {activeDraft.treatments.consumables.map(c => (
                                     <div key={c.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-sm shadow-sm">
                                         <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                                         <span className="font-bold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded text-slate-600 dark:text-slate-300">x{c.quantity}</span>
                                     </div>
                                 ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Governance */}
            {activeTab === 'governance' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                         <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-700 pb-2">
                             <h3 className="font-bold text-red-600 dark:text-red-400 flex items-center gap-2 text-sm uppercase tracking-wide"><ShieldCheck className="w-5 h-5" /> Safeguarding</h3>
                             <button 
                                onClick={handleSafeguardingScan}
                                disabled={isScanningSafety}
                                className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-lg text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
                             >
                                {isScanningSafety ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                                AI Scan Narrative
                             </button>
                         </div>
                         
                         {safetyAlert && (
                             <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl animate-in fade-in">
                                 <h4 className="text-amber-800 dark:text-amber-400 font-bold text-sm flex items-center gap-2 mb-1">
                                     <AlertTriangle className="w-4 h-4" /> Potential Concern: {safetyAlert.type}
                                 </h4>
                                 <p className="text-amber-700 dark:text-amber-300 text-xs leading-relaxed">{safetyAlert.reason}</p>
                             </div>
                         )}

                         <label className="flex items-center gap-3 p-5 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                             <input type="checkbox" className="w-6 h-6 text-ams-blue rounded focus:ring-ams-blue border-slate-300" checked={activeDraft.governance.safeguarding.concerns} onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, concerns: e.target.checked } } })} />
                             <span className="font-bold text-slate-700 dark:text-slate-200 text-lg">Safeguarding Concerns Identified?</span>
                         </label>
                         {activeDraft.governance.safeguarding.concerns && (
                             <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                                 <label className="input-label">Details of Concern</label>
                                 <textarea 
                                    className="input-field leading-relaxed" 
                                    rows={4}
                                    placeholder="Describe the nature of the concern..." 
                                    value={activeDraft.governance.safeguarding.details}
                                    onChange={e => updateDraft({ governance: { ...activeDraft.governance, safeguarding: { ...activeDraft.governance.safeguarding, details: e.target.value } } })}
                                 />
                             </div>
                         )}
                    </div>

                    <div className="card">
                         <h3 className="card-title text-amber-600 flex items-center gap-2"><Brain className="w-5 h-5" /> Mental Capacity Act 2005</h3>
                         <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 mt-4 space-y-6">
                             <div>
                                <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-sm uppercase tracking-wide">Stage 1: Diagnostic Test</h4>
                                <label className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-amber-300 transition-colors">
                                    <input 
                                        type="checkbox" 
                                        className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                                        checked={activeDraft.governance.capacity.stage1Impairment}
                                        onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage1Impairment: e.target.checked } } })}
                                    />
                                    <span className="font-medium text-slate-700 dark:text-slate-200">Is there an impairment of, or disturbance in the functioning of, the mind or brain?</span>
                                </label>
                             </div>

                             {activeDraft.governance.capacity.stage1Impairment && (
                                 <div className="animate-in fade-in slide-in-from-top-2">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 text-sm uppercase tracking-wide">Stage 2: Functional Test (Can the patient...)</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {[
                                            { key: 'understand', label: 'Understand information' },
                                            { key: 'retain', label: 'Retain information' },
                                            { key: 'weigh', label: 'Weigh up information' },
                                            { key: 'communicate', label: 'Communicate decision' }
                                        ].map((item) => (
                                            <label key={item.key} className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-amber-300 transition-colors">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-slate-300"
                                                    checked={(activeDraft.governance.capacity.stage2Functional as any)[item.key]} 
                                                    onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, stage2Functional: { ...activeDraft.governance.capacity.stage2Functional, [item.key]: e.target.checked } } } })} 
                                                />
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{item.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                 </div>
                             )}

                             <div className={`p-4 rounded-xl text-center font-bold text-lg border-2 ${activeDraft.governance.capacity.status === 'Capacity Lacking' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900' : 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900'}`}>
                                 RESULT: {activeDraft.governance.capacity.status.toUpperCase()}
                             </div>

                             {activeDraft.governance.capacity.status === 'Capacity Lacking' && (
                                 <div>
                                     <label className="input-label">Best Interests Rationale</label>
                                     <textarea 
                                        className="input-field" 
                                        placeholder="Document decision rationale here..."
                                        rows={3}
                                        value={activeDraft.governance.capacity.bestInterestsRationale}
                                        onChange={e => updateDraft({ governance: { ...activeDraft.governance, capacity: { ...activeDraft.governance.capacity, bestInterestsRationale: e.target.value } } })}
                                     />
                                 </div>
                             )}
                         </div>
                    </div>

                    <div className="card">
                         <h3 className="card-title text-slate-800 dark:text-slate-200 mb-4">Discharge & Refusal</h3>
                         <div className="mb-6">
                             <label className="input-label">Discharge Decision</label>
                             <select className="input-field text-lg font-medium h-12" value={activeDraft.governance.discharge} onChange={e => updateDraft({ governance: { ...activeDraft.governance, discharge: e.target.value as any } })}>
                                 <option>Conveyed to Hospital</option>
                                 <option>Discharged on Scene</option>
                                 <option>Refusal of Care</option>
                             </select>
                         </div>

                         {activeDraft.governance.discharge === 'Refusal of Care' && (
                             <div className="p-6 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl space-y-6 animate-in fade-in">
                                 <div className="flex items-center gap-2 text-red-800 dark:text-red-400 font-bold border-b border-red-200 dark:border-red-800 pb-2 text-lg">
                                     <AlertOctagon className="w-6 h-6" /> Refusal of Care Checklist
                                 </div>
                                 <div className="space-y-3">
                                     {[
                                         { key: 'risksExplained', label: 'Risks of refusal explained to patient' },
                                         { key: 'alternativesOffered', label: 'Alternative options offered' },
                                         { key: 'worseningAdviceGiven', label: 'Advised to call 999 if condition worsens' },
                                         { key: 'capacityConfirmed', label: 'Patient has capacity to refuse (Confirmed)', bold: true }
                                     ].map((item) => (
                                         <label key={item.key} className="flex items-center gap-3">
                                             <input 
                                                type="checkbox" 
                                                className="w-5 h-5 text-red-600 rounded focus:ring-red-500 border-red-300"
                                                checked={(activeDraft.governance.refusal as any)[item.key]} 
                                                onChange={e => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, [item.key]: e.target.checked } } })} 
                                             /> 
                                             <span className={`text-sm ${item.bold ? 'font-bold text-red-900 dark:text-red-300' : 'text-red-800 dark:text-red-200'}`}>{item.label}</span>
                                         </label>
                                     ))}
                                 </div>
                                 <div className="pt-2">
                                     <p className="text-xs text-red-600 dark:text-red-400 mb-2 font-bold uppercase tracking-wide">Patient Signature Required for Refusal</p>
                                     <SignaturePad label="Patient Refusal Signature" value={activeDraft.governance.refusal.signature} onSave={val => updateDraft({ governance: { ...activeDraft.governance, refusal: { ...activeDraft.governance.refusal, signature: val } } })} />
                                 </div>
                             </div>
                         )}
                    </div>
                </div>
            )}

            {/* Handover */}
            {activeTab === 'handover' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="card">
                         <div className="flex justify-between items-center mb-4">
                             <h3 className="card-title flex items-center gap-2 mb-0"><Bot className="w-5 h-5 text-ams-blue" /> SBAR Handover</h3>
                             <button onClick={handleGenerateSBAR} className="btn-secondary text-xs shadow-sm bg-gradient-to-r from-white to-blue-50 dark:from-slate-700 dark:to-slate-600">
                                 <Sparkles className="w-3 h-3 text-ams-light-blue" /> Generate with AI
                             </button>
                         </div>
                         <textarea className="input-field h-48 font-mono text-sm leading-relaxed p-4" value={activeDraft.handover.sbar} onChange={e => updateDraft({ handover: { ...activeDraft.handover, sbar: e.target.value } })} placeholder="Situation, Background, Assessment, Recommendation..." />
                    </div>

                    <div className="card">
                         <h3 className="card-title flex items-center gap-2 mb-4"><Camera className="w-5 h-5 text-ams-blue" /> Media Attachments</h3>
                         <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                             <label className="aspect-square bg-slate-50 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-ams-blue transition-all group">
                                 <div className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                                    <Camera className="w-6 h-6 text-slate-400 group-hover:text-ams-blue" />
                                 </div>
                                 <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-ams-blue">Add Photo</span>
                                 <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleMediaUpload} />
                             </label>
                             {activeDraft.handover.media.map(m => (
                                 <div key={m.id} className="aspect-square relative rounded-xl overflow-hidden group border border-slate-200 dark:border-slate-700 shadow-sm">
                                     <img src={m.url} className="w-full h-full object-cover" alt="Attachment" />
                                     <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                         <button onClick={() => {
                                             const media = activeDraft.handover.media.filter(x => x.id !== m.id);
                                             updateDraft({ handover: { ...activeDraft.handover, media } });
                                         }} className="text-white hover:text-red-400 p-2 bg-white/10 rounded-full backdrop-blur-sm"><Trash2 className="w-6 h-6" /></button>
                                     </div>
                                     <span className="absolute bottom-1 right-1 text-[10px] text-white bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-sm">{m.type}</span>
                                 </div>
                             ))}
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <SignaturePad 
                            label="Clinician Signature" 
                            value={activeDraft.handover.clinicianSignature}
                            onSave={(sig) => updateDraft({ handover: { ...activeDraft.handover, clinicianSignature: sig } })} 
                        />
                        <SignaturePad 
                            label="Patient Signature" 
                            value={activeDraft.handover.patientSignature}
                            onSave={(sig) => updateDraft({ handover: { ...activeDraft.handover, patientSignature: sig } })} 
                        />
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* --- Modals --- */}
      {showAuditModal && auditResult && <AuditSummaryModal score={auditResult.score} feedback={auditResult.feedback} criticalIssues={auditResult.critical_issues} onClose={() => setShowAuditModal(false)} />}
      
      {showWitnessModal && (
          <WitnessModal 
            drugName={newDrug.name} 
            onWitnessConfirmed={completeDrugAdd} 
            onCancel={() => setShowWitnessModal(false)} 
          />
      )}
      {showLogModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Add Log Entry</h3>
                  <textarea 
                    className="input-field h-32 mb-4" 
                    placeholder="e.g. Police arrived on scene..." 
                    value={newLogMsg} 
                    onChange={e => setNewLogMsg(e.target.value)} 
                    autoFocus
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowLogModal(false)} className="btn-secondary">Cancel</button>
                      <button onClick={() => handleAddLog()} className="btn-primary">Save Log</button>
                  </div>
              </div>
          </div>
      )}
      {showLookup && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">Patient Lookup</h3>
                  <div className="flex gap-2 mb-4">
                      <input className="input-field" placeholder="Search NHS Number..." value={lookupQuery} onChange={e => setLookupQuery(e.target.value)} />
                      <button onClick={handlePatientLookup} className="btn-primary">Search</button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {foundPatients.map(p => (
                          <div key={p.id} onClick={() => selectPatient(p)} className="p-3 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer hover:border-ams-blue transition-colors">
                              <p className="font-bold text-slate-800 dark:text-white">{p.firstName} {p.lastName}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{p.dob} • {p.nhsNumber}</p>
                          </div>
                      ))}
                      {foundPatients.length === 0 && lookupQuery && <p className="text-sm text-slate-400 text-center py-4">No patients found</p>}
                  </div>
                  <div className="flex justify-end mt-4">
                      <button onClick={() => setShowLookup(false)} className="btn-secondary">Close</button>
                  </div>
              </div>
          </div>
      )}
      {showCreatePatient && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
                  <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white">New Patient Registration</h3>
                  <div className="space-y-4 mb-6">
                    <input className="input-field" placeholder="First Name" value={newPatientData.firstName} onChange={e => setNewPatientData({...newPatientData, firstName: e.target.value})} />
                    <input className="input-field" placeholder="Last Name" value={newPatientData.lastName} onChange={e => setNewPatientData({...newPatientData, lastName: e.target.value})} />
                    <div className="grid grid-cols-2 gap-3">
                        <input className="input-field" type="date" value={newPatientData.dob} onChange={e => setNewPatientData({...newPatientData, dob: e.target.value})} />
                        <select className="input-field h-[46px]" value={newPatientData.gender} onChange={e => setNewPatientData({...newPatientData, gender: e.target.value})}>
                            <option value="">Gender</option><option>Male</option><option>Female</option><option>Other</option>
                        </select>
                    </div>
                    <input className="input-field font-mono" placeholder="NHS Number (Optional)" value={newPatientData.nhsNumber} onChange={e => setNewPatientData({...newPatientData, nhsNumber: e.target.value})} />
                  </div>
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowCreatePatient(false)} className="btn-secondary">Cancel</button>
                      <button onClick={handleCreatePatient} className="btn-primary">Create Profile</button>
                  </div>
              </div>
          </div>
      )}
      
      {/* Signature & Submission Modal */}
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
                      <input 
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={4}
                          autoFocus
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl pl-12 pr-4 py-4 text-lg mb-6 focus:ring-2 focus:ring-ams-blue outline-none text-center tracking-[0.5em] font-mono font-bold dark:text-white"
                          placeholder="••••"
                          value={submitPin}
                          onChange={e => setSubmitPin(e.target.value.replace(/\D/g, ''))}
                      />
                  </div>
                  
                  <div className="space-y-3">
                      <button 
                        onClick={finalizeSubmit}
                        disabled={isSubmitting || submitPin.length !== 4}
                        className="w-full py-4 bg-ams-blue text-white font-bold rounded-xl shadow-lg hover:bg-blue-900 disabled:opacity-50 flex items-center justify-center gap-3 transition-transform active:scale-95"
                      >
                          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                          Confirm Signature
                      </button>
                      <button onClick={() => setShowSubmitModal(false)} className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold hover:text-slate-800 dark:hover:text-white">Cancel</button>
                  </div>
              </div>
          </div>
      )}
      
      {showDrugModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl border border-slate-200 dark:border-slate-700">
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
                     <input className="input-field" placeholder="Dose (e.g. 10mg)" value={newDrug.dose} onChange={e => setNewDrug({...newDrug, dose: e.target.value})} />
                     <input className="input-field" placeholder="Route (e.g. IV)" value={newDrug.route} onChange={e => setNewDrug({...newDrug, route: e.target.value})} />
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                      <button onClick={() => setShowDrugModal(false)} className="btn-secondary">Cancel</button>
                      <button onClick={initiateDrugAdd} className="btn-primary">Add Drug</button>
                  </div>
              </div>
          </div>
      )}
      
      <style>{`
        .card { @apply bg-white dark:bg-[#172030] p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-6; }
        .card-title { @apply font-bold text-slate-800 dark:text-white mb-4 text-sm uppercase tracking-wide border-b border-slate-100 dark:border-slate-700 pb-2 block; }
        .input-label { @apply block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-2 ml-1; }
        .input-field { @apply w-full bg-white dark:bg-[#0F1115] border border-slate-300 dark:border-slate-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-ams-blue focus:border-transparent outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-900 dark:text-white; }
        .btn-primary { @apply px-5 py-2.5 bg-ams-blue text-white font-bold rounded-xl hover:bg-blue-900 transition-colors shadow-sm text-sm active:scale-95; }
        .btn-secondary { @apply px-5 py-2.5 bg-white dark:bg-[#172030] border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-sm flex items-center gap-2 active:scale-95 shadow-sm; }
      `}</style>
    </div>
  );
};

export default EPRFPage;
