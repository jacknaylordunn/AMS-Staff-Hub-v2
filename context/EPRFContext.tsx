
import React, { createContext, useContext, useState, useEffect } from 'react';
import { EPRF, VitalsEntry, DrugAdministration, Procedure } from '../types';
import { useDataSync } from '../hooks/useDataSync';
import { useAuth } from '../hooks/useAuth';

interface EPRFContextType {
    activeDraft: EPRF | null;
    setActiveDraft: (draft: EPRF | null) => void;
    updateDraft: (updates: Partial<EPRF>) => void;
    submitDraft: (token: string) => Promise<void>;
    handleNestedUpdate: (path: string[], value: any) => void;
    addVitals: (entry: VitalsEntry) => void;
    addDrug: (entry: DrugAdministration) => void;
    addProcedure: (entry: Procedure) => void;
    generateIncidentId: () => string;
    deleteCurrentDraft: () => Promise<void>;
}

const EPRFContext = createContext<EPRFContextType | undefined>(undefined);

// Helper to remove undefined values for Firestore
const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
        return data.map(sanitizeData);
    } else if (data !== null && typeof data === 'object') {
        const newObj: any = {};
        Object.keys(data).forEach(key => {
            const val = data[key];
            if (val === undefined) {
                newObj[key] = null; // Convert undefined to null
            } else {
                newObj[key] = sanitizeData(val);
            }
        });
        return newObj;
    }
    return data;
};

export const EPRFProvider: React.FC<{ children: React.ReactNode, initialDraft: EPRF | null }> = ({ children, initialDraft }) => {
    const { saveEPRF, deleteEPRF } = useDataSync();
    const [activeDraft, setActiveDraftState] = useState<EPRF | null>(initialDraft);

    useEffect(() => {
        if (initialDraft) setActiveDraftState(initialDraft);
    }, [initialDraft]);

    const setActiveDraft = (draft: EPRF | null) => {
        setActiveDraftState(draft);
    };

    const updateDraft = (updates: Partial<EPRF>) => {
        if (!activeDraft) return;
        const updated = { ...activeDraft, ...updates, lastUpdated: new Date().toISOString() };
        const safeData = sanitizeData(updated);
        setActiveDraftState(safeData);
        saveEPRF(safeData, false); // Auto-save (debounced)
    };

    // Specific function for final submission to ensure data integrity
    const submitDraft = async (token: string) => {
        if (!activeDraft) return;
        
        const updates = {
            status: 'Submitted' as const,
            lastUpdated: new Date().toISOString(),
            handover: {
                ...activeDraft.handover,
                digitalToken: token
            }
        };

        const updated = { ...activeDraft, ...updates };
        const safeData = sanitizeData(updated);
        
        // Update local state immediately for UI responsiveness
        setActiveDraftState(safeData);
        
        // FORCE SAVE IMMEDIATE
        await saveEPRF(safeData, true);
    };

    const handleNestedUpdate = (path: string[], value: any) => {
        if (!activeDraft) return;
        
        // Performance Upgrade: Use structuredClone
        const newDraft = structuredClone(activeDraft); 
        let current = newDraft;
        
        for (let i = 0; i < path.length - 1; i++) {
            if (!current[path[i]]) current[path[i]] = {}; // Safety init
            current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
        
        newDraft.lastUpdated = new Date().toISOString();
        const safeData = sanitizeData(newDraft);
        
        setActiveDraftState(safeData);
        saveEPRF(safeData, false); // Auto-save (debounced)
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
        // Random 4 digit suffix
        const xxxx = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
        return `AMS${yyyy}${mm}${dd}${xxxx}`;
    };

    const deleteCurrentDraft = async () => {
        if (!activeDraft) return;
        await deleteEPRF(activeDraft.id);
        setActiveDraftState(null);
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
