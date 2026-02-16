
import React, { createContext, useContext, useState, useEffect } from 'react';
import { EPRF, VitalsEntry, DrugAdministration, Procedure, Role } from '../types';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { sanitizeData } from '../utils/dataHelpers';

interface EPRFContextType {
    activeDraft: EPRF | null;
    setActiveDraft: (draft: EPRF | null) => void;
    updateDraft: (updates: Partial<EPRF>) => void;
    submitDraft: (token: string, pdfUrl?: string) => Promise<void>;
    handleNestedUpdate: (path: string[], value: any) => void;
    addVitals: (entry: VitalsEntry) => void;
    addDrug: (entry: DrugAdministration) => void;
    addProcedure: (entry: Procedure) => void;
    generateIncidentId: () => string;
    deleteCurrentDraft: () => Promise<void>;
    createNeonateDraft: () => Promise<void>;
}

const EPRFContext = createContext<EPRFContextType | undefined>(undefined);

const STORAGE_KEY = 'aegis_local_draft_backup';

// Default Template for new records (Simplified for context brevity)
const DEFAULT_NEONATE_TEMPLATE: any = {
    status: 'Draft',
    mode: 'Clinical',
    patient: { firstName: 'Neonate of', lastName: '', dob: new Date().toISOString().split('T')[0], address: '', postcode: '', nhsNumber: '' },
    history: { presentingComplaint: 'Born at Scene', historyOfPresentingComplaint: 'Neonate delivered at scene.', pastMedicalHistory: 'Maternal Hx: ', allergies: 'NKDA', medications: 'Nil' },
    assessment: { 
        primary: { airway: { status: 'Patent', intervention: '' }, breathing: { rate: '', effort: 'Normal', oxygenSats: '' }, circulation: { radialPulse: '', skin: 'Pink/Warm', color: 'Pink' }, disability: { avpu: 'A', gcs: '15', pupils: '', bloodGlucose: '' }, exposure: { injuriesFound: false, rash: false, temp: '' } },
        neuro: { gcs: {}, pupils: {}, fast: { testPositive: false }, limbs: { leftArm: {}, rightArm: {}, leftLeg: {}, rightLeg: {} } },
        clinicalNarrative: 'APGAR 1 min: \nAPGAR 5 min: \nAPGAR 10 min: '
    },
    clinicalDecision: { workingImpression: 'Neonate', differentialDiagnosis: '', managementPlan: '', finalDisposition: '' },
    vitals: [], injuries: [], treatments: { drugs: [], procedures: [] }, governance: { safeguarding: { concerns: false }, capacity: { status: 'Not Assessed' }, refusal: { isRefusal: false } },
    handover: { handoverType: 'Hospital Staff' }, logs: []
};

export const EPRFProvider: React.FC<{ children: React.ReactNode, initialDraft: EPRF | null }> = ({ children, initialDraft }) => {
    const { saveEPRF, deleteEPRF } = useDataSync();
    const { user } = useAuth();
    const [activeDraft, setActiveDraftState] = useState<EPRF | null>(initialDraft);

    useEffect(() => {
        if (initialDraft) setActiveDraftState(initialDraft);
    }, [initialDraft]);

    // Real-time Sync for Active Draft
    useEffect(() => {
        if (!activeDraft || !user) return;

        const draftDocId = `draft_${user.uid}_${activeDraft.id}`;
        
        const unsub = onSnapshot(doc(db, 'eprfs', draftDocId), (snapshot) => {
            if (snapshot.exists()) {
                const remoteData = snapshot.data() as EPRF;
                const localTime = new Date(activeDraft.lastUpdated).getTime();
                const remoteTime = new Date(remoteData.lastUpdated).getTime();

                if (remoteTime > localTime + 2000) {
                    console.log("Syncing from remote...");
                    setActiveDraftState(remoteData);
                }
            }
        }, (error) => {
            console.error("Context snapshot error (likely permissions)", error);
        });

        return () => unsub();
    }, [activeDraft?.id, user]);

    const setActiveDraft = (draft: EPRF | null) => {
        setActiveDraftState(draft);
        if (draft) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
        } else {
            localStorage.removeItem(STORAGE_KEY);
        }
    };

    const persist = (draft: EPRF, immediate = false) => {
        const safeData = sanitizeData(draft);
        setActiveDraftState(safeData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData));
        saveEPRF(safeData, immediate);
    };

    const updateDraft = (updates: Partial<EPRF>) => {
        if (!activeDraft) return;
        const updated = { ...activeDraft, ...updates, lastUpdated: new Date().toISOString() };
        persist(updated);
    };

    const submitDraft = async (token: string, pdfUrl?: string) => {
        if (!activeDraft) return;
        
        const updates = {
            status: 'Submitted' as const,
            lastUpdated: new Date().toISOString(),
            pdfUrl: pdfUrl,
            locked: true,
            handover: {
                ...activeDraft.handover,
                digitalToken: token
            }
        };

        const updated = { ...activeDraft, ...updates };
        const safeData = sanitizeData(updated);
        
        setActiveDraftState(safeData);
        localStorage.removeItem(STORAGE_KEY);
        
        await saveEPRF(safeData, true);
    };

    const handleNestedUpdate = (path: string[], value: any) => {
        if (!activeDraft) return;
        
        const newDraft = structuredClone(activeDraft); 
        let current = newDraft;
        
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {}; 
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        
        newDraft.lastUpdated = new Date().toISOString();
        persist(newDraft);
    };

    const addVitals = (entry: VitalsEntry) => {
        if (!activeDraft) return;
        const newVitals = [...activeDraft.vitals, entry];
        newVitals.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        updateDraft({ vitals: newVitals });
    };

    const addDrug = (entry: DrugAdministration) => {
        if (!activeDraft) return;
        const newDrugs = [...activeDraft.treatments.drugs, entry];
        handleNestedUpdate(['treatments', 'drugs'], newDrugs);
    };

    const addProcedure = (entry: Procedure) => {
        if (!activeDraft) return;
        const newProcs = [...activeDraft.treatments.procedures, entry];
        handleNestedUpdate(['treatments', 'procedures'], newProcs);
    };

    const generateIncidentId = () => {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const xxxx = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `AMS${yyyy}${mm}${dd}${xxxx}`;
    };

    const deleteCurrentDraft = async () => {
        if (!activeDraft) return;
        if (activeDraft.status === 'Submitted') {
            alert("Cannot delete a submitted record.");
            return;
        }
        await deleteEPRF(activeDraft.id);
        setActiveDraftState(null);
        localStorage.removeItem(STORAGE_KEY);
    };

    const createNeonateDraft = async () => {
        if (!activeDraft || !user) return;

        const newId = Date.now().toString();
        const neonateRecord: EPRF = {
            ...DEFAULT_NEONATE_TEMPLATE,
            id: newId,
            incidentNumber: `${activeDraft.incidentNumber}-BABY`,
            userId: user.uid,
            location: activeDraft.location,
            callSign: activeDraft.callSign,
            times: { ...activeDraft.times }, // Copy timings
            patient: {
                ...DEFAULT_NEONATE_TEMPLATE.patient,
                lastName: activeDraft.patient.lastName || 'Unknown',
                address: activeDraft.patient.address
            },
            assistingClinicians: activeDraft.assistingClinicians,
            lastUpdated: new Date().toISOString()
        };

        // Save new record
        await saveEPRF(neonateRecord, true);
        
        // Switch to it
        setActiveDraft(neonateRecord);
    };

    return (
        <EPRFContext.Provider value={{ 
            activeDraft, 
            setActiveDraft, 
            updateDraft,
            submitDraft,
            handleNestedUpdate,
            addVitals,
            addDrug,
            addProcedure,
            generateIncidentId,
            deleteCurrentDraft,
            createNeonateDraft
        }}>
            {children}
        </EPRFContext.Provider>
    );
};

export const useEPRF = () => {
    const context = useContext(EPRFContext);
    if (!context) throw new Error("useEPRF must be used within EPRFProvider");
    return context;
};
