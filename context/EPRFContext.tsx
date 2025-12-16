
import React, { createContext, useContext, useState, useEffect } from 'react';
import { EPRF, VitalsEntry, DrugAdministration, Procedure } from '../types';
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
}

const EPRFContext = createContext<EPRFContextType | undefined>(undefined);

const STORAGE_KEY = 'aegis_local_draft_backup';

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

        // If it's a new draft not saved yet (no ID in DB), skip listener
        // Assuming ID format 'draft_uid_timestamp'
        const draftDocId = `draft_${user.uid}_${activeDraft.id}`;
        
        const unsub = onSnapshot(doc(db, 'eprfs', draftDocId), (snapshot) => {
            if (snapshot.exists()) {
                const remoteData = snapshot.data() as EPRF;
                
                // Only update if remote is newer or different to prevent loop with local typing
                // We use lastUpdated timestamp
                const localTime = new Date(activeDraft.lastUpdated).getTime();
                const remoteTime = new Date(remoteData.lastUpdated).getTime();

                // Allow 2 second buffer for clock skew / latency to prefer local if actively typing
                if (remoteTime > localTime + 2000) {
                    console.log("Syncing from remote...");
                    setActiveDraftState(remoteData);
                }
            }
        }, (error) => {
            console.error("Context snapshot error (likely permissions)", error);
        });

        return () => unsub();
    }, [activeDraft?.id, user]); // Only re-bind if the ID changes

    // Local Storage Recovery
    useEffect(() => {
        if (!activeDraft) {
            const backup = localStorage.getItem(STORAGE_KEY);
            if (backup) {
                try {
                    const parsed = JSON.parse(backup);
                    // Only restore if less than 24 hours old
                    const age = Date.now() - new Date(parsed.lastUpdated).getTime();
                    if (age < 24 * 60 * 60 * 1000) {
                        console.log("Restoring ePRF draft from local storage");
                    } else {
                        localStorage.removeItem(STORAGE_KEY);
                    }
                } catch (e) {
                    localStorage.removeItem(STORAGE_KEY);
                }
            }
        }
    }, []);

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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(safeData)); // Instant local backup
        saveEPRF(safeData, immediate); // Firestore sync
    };

    const updateDraft = (updates: Partial<EPRF>) => {
        if (!activeDraft) return;
        const updated = { ...activeDraft, ...updates, lastUpdated: new Date().toISOString() };
        persist(updated);
    };

    // Specific function for final submission to ensure data integrity
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
        
        // Update local state immediately for UI responsiveness
        setActiveDraftState(safeData);
        localStorage.removeItem(STORAGE_KEY); // Clear backup on submission
        
        // FORCE SAVE IMMEDIATE
        await saveEPRF(safeData, true);
    };

    const handleNestedUpdate = (path: string[], value: any) => {
        if (!activeDraft) return;
        
        const newDraft = structuredClone(activeDraft); 
        let current = newDraft;
        
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {}; // Safety init
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        
        newDraft.lastUpdated = new Date().toISOString();
        persist(newDraft);
    };

    const addVitals = (entry: VitalsEntry) => {
        if (!activeDraft) return;
        const newVitals = [...activeDraft.vitals, entry];
        // Sort by time
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
            deleteCurrentDraft
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
