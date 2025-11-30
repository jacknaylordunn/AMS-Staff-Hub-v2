
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './useAuth';

interface DataSyncContextType {
  isOnline: boolean;
  syncStatus: 'Synced' | 'Syncing' | 'Offline' | 'Error';
  saveEPRF: (data: any) => Promise<void>;
  loadEPRF: (id: string) => Promise<any>;
  deleteEPRF: (id: string) => Promise<void>;
  currentEPRF: any | null;
  pendingChanges: number;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

export const DataSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Syncing' | 'Offline' | 'Error'>('Synced');
  const [currentEPRF, setCurrentEPRF] = useState<any | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Monitor Online Status
  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        setSyncStatus('Synced');
    };
    
    const handleOffline = () => {
        setIsOnline(false);
        setSyncStatus('Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveEPRF = async (data: any) => {
    if (!user) return;
    
    setSyncStatus(isOnline ? 'Syncing' : 'Offline');
    
    try {
        const draftId = `draft_${user.uid}_${data.id}`;
        // Ensure undefined values are handled in Context before reaching here,
        // but as a failsafe, Firestore ignores fields if we use merge properly, 
        // however specific fields must not be undefined.
        await setDoc(doc(db, 'eprfs', draftId), {
            ...data,
            userId: user.uid,
            lastSync: new Date().toISOString()
        }, { merge: true });
        
        if (isOnline) setSyncStatus('Synced');
    } catch (e) {
        console.error("Save failed", e);
        setSyncStatus('Error');
    }
  };

  const loadEPRF = async (id: string) => {
      if (!user) return null;
      try {
          const docRef = doc(db, 'eprfs', `draft_${user.uid}_${id}`);
          const docSnap = await getDoc(docRef);
          return docSnap.exists() ? docSnap.data() : null;
      } catch (e) {
          console.error("Load error", e);
          return null;
      }
  };

  const deleteEPRF = async (id: string) => {
      if (!user) return;
      try {
          const draftId = `draft_${user.uid}_${id}`;
          await deleteDoc(doc(db, 'eprfs', draftId));
      } catch (e) {
          console.error("Delete error", e);
          throw e;
      }
  };

  return (
    <DataSyncContext.Provider value={{ isOnline, syncStatus, saveEPRF, loadEPRF, deleteEPRF, currentEPRF, pendingChanges }}>
      {children}
    </DataSyncContext.Provider>
  );
};

export const useDataSync = () => {
  const context = useContext(DataSyncContext);
  if (context === undefined) {
    throw new Error('useDataSync must be used within a DataSyncProvider');
  }
  return context;
};
