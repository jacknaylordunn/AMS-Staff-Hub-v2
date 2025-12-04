
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  
  // Ref to hold the timeout ID for debouncing writes
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    
    // Immediately indicate to UI that we are handling changes
    setSyncStatus('Syncing');
    
    // Clear any existing pending write to prevent flooding the queue
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    
    // Schedule the write execution
    saveTimeoutRef.current = setTimeout(async () => {
        try {
            const draftId = `draft_${user.uid}_${data.id}`;
            
            // Perform the write
            await setDoc(doc(db, 'eprfs', draftId), {
                ...data,
                userId: user.uid,
                lastSync: new Date().toISOString()
            }, { merge: true });
            
            // Update status based on current network state
            if (navigator.onLine) {
                setSyncStatus('Synced');
            } else {
                setSyncStatus('Offline');
            }
        } catch (e) {
            console.error("Save failed", e);
            setSyncStatus('Error');
        }
    }, 2000); // 2-second debounce window
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
          // If we are deleting, ensure no pending saves overwrite the deletion
          if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
          }

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
