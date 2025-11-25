
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../services/firebase';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from './useAuth';

interface DataSyncContextType {
  isOnline: boolean;
  syncStatus: 'Synced' | 'Syncing' | 'Offline' | 'Error';
  saveEPRF: (data: any) => Promise<void>;
  loadEPRF: (id: string) => Promise<any>;
  currentEPRF: any | null;
  pendingChanges: number;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

interface SyncQueueItem {
    id: string;
    data: any;
    timestamp: number;
}

export const DataSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'Synced' | 'Syncing' | 'Offline' | 'Error'>('Synced');
  const [currentEPRF, setCurrentEPRF] = useState<any | null>(null);
  const [pendingChanges, setPendingChanges] = useState(0);

  // Monitor Online Status & Process Queue
  useEffect(() => {
    const processQueue = async () => {
        if (!navigator.onLine || !user) return;
        
        const queueStr = localStorage.getItem('aegis_sync_queue');
        if (!queueStr) return;

        try {
            const queue: SyncQueueItem[] = JSON.parse(queueStr);
            if (queue.length === 0) return;

            setSyncStatus('Syncing');
            console.log(`Processing ${queue.length} offline changes...`);

            // Sort by timestamp to apply in order
            queue.sort((a, b) => a.timestamp - b.timestamp);

            // Process strictly sequential
            for (const item of queue) {
                const draftId = `draft_${user.uid}_${item.id}`; // Ensure uniqueness per draft
                await setDoc(doc(db, 'eprfs', draftId), item.data, { merge: true });
            }

            // Clear queue
            localStorage.removeItem('aegis_sync_queue');
            setPendingChanges(0);
            setSyncStatus('Synced');
        } catch (error) {
            console.error("Error processing sync queue:", error);
            setSyncStatus('Error');
        }
    };

    const handleOnline = () => {
        setIsOnline(true);
        processQueue();
    };
    
    const handleOffline = () => {
        setIsOnline(false);
        setSyncStatus('Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue check
    if (navigator.onLine) processQueue();
    else {
        const q = localStorage.getItem('aegis_sync_queue');
        if (q) setPendingChanges(JSON.parse(q).length);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  // Subscribe to the current user's active draft
  useEffect(() => {
      if (!user) return;
      // Using a generic ID strategy for demo. Real app would handle multiple draft IDs via URL param.
      // We will assume 'active_draft' is stored in local state, but here we listen to a generic user doc
      // In a real app, this would be `doc(db, 'eprfs', activeDraftId)`
  }, [user]);

  const saveEPRF = async (data: any) => {
    if (!user) return;
    
    // Always save to LocalStorage first (Source of Truth for UI)
    // The App component loads initial state from localStorage, so this keeps UI snappy.
    
    if (isOnline) {
        setSyncStatus('Syncing');
        try {
            const draftId = `draft_${user.uid}_${data.id}`;
            await setDoc(doc(db, 'eprfs', draftId), {
                ...data,
                userId: user.uid,
                lastSync: new Date().toISOString()
            }, { merge: true });
            setSyncStatus('Synced');
        } catch (e) {
            console.error("Direct save failed, queuing...", e);
            queueChange(data);
        }
    } else {
        queueChange(data);
    }
  };

  const queueChange = (data: any) => {
      setSyncStatus('Offline');
      const queueStr = localStorage.getItem('aegis_sync_queue');
      let queue: SyncQueueItem[] = queueStr ? JSON.parse(queueStr) : [];
      
      // Upsert: if an item for this draft exists, verify timestamp? 
      // Simplified: Just push new state. In production, we might want to merge diffs.
      // For this demo, we replace any pending write for this ID with the newest state to save bandwidth.
      queue = queue.filter(item => item.id !== data.id);
      
      queue.push({
          id: data.id,
          data: { ...data, userId: user?.uid },
          timestamp: Date.now()
      });
      
      localStorage.setItem('aegis_sync_queue', JSON.stringify(queue));
      setPendingChanges(queue.length);
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

  return (
    <DataSyncContext.Provider value={{ isOnline, syncStatus, saveEPRF, loadEPRF, currentEPRF, pendingChanges }}>
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
