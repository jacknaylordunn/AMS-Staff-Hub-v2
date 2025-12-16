
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db, storage } from '../services/firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import { sanitizeData } from '../utils/dataHelpers';

interface DataSyncContextType {
  isOnline: boolean;
  syncStatus: 'Synced' | 'Syncing' | 'Offline' | 'Error';
  saveEPRF: (data: any, immediate?: boolean) => Promise<void>;
  loadEPRF: (id: string) => Promise<any>;
  deleteEPRF: (id: string) => Promise<void>;
  currentEPRF: any | null;
  pendingChanges: number;
}

const DataSyncContext = createContext<DataSyncContextType | undefined>(undefined);

export const DataSyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { toast } = useToast();
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
        setSyncStatus('Syncing');
        processOfflineUploads(); // Trigger sync
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
  }, [currentEPRF]); // Re-bind if EPRF changes so we access latest state

  // Recursive function to find and replace OFFLINE_PENDING strings
  const processOfflineUploads = async () => {
      if (!currentEPRF) {
          setSyncStatus('Synced');
          return;
      }

      let hasChanges = false;
      const dataCopy = JSON.parse(JSON.stringify(currentEPRF));

      const traverseAndUpload = async (obj: any) => {
          for (const key in obj) {
              if (typeof obj[key] === 'string' && obj[key].startsWith('OFFLINE_PENDING::')) {
                  // Found one!
                  const [_, folder, base64] = obj[key].split('::');
                  try {
                      const fileName = `${Date.now()}_synced_image.png`;
                      const storageRef = ref(storage, `${folder}/${fileName}`);
                      await uploadString(storageRef, base64, 'data_url');
                      const url = await getDownloadURL(storageRef);
                      
                      obj[key] = url; // Replace with actual URL
                      hasChanges = true;
                  } catch (e) {
                      console.error("Background sync failed for image", e);
                  }
              } else if (typeof obj[key] === 'object' && obj[key] !== null) {
                  await traverseAndUpload(obj[key]);
              }
          }
      };

      await traverseAndUpload(dataCopy);

      if (hasChanges) {
          toast.info("Offline images synced to cloud.");
          saveEPRF(dataCopy, true); // Save the updated URLs
      } else {
          setSyncStatus('Synced');
      }
  };

  const saveEPRF = async (data: any, immediate = false) => {
    if (!user) return;
    
    // We sanitize locally for state consistency, but critical for the Firestore payload
    const safeData = sanitizeData(data);
    setCurrentEPRF(safeData); 
    setSyncStatus('Syncing');
    
    // Clear any existing pending write
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
    }

    const performSave = async () => {
        try {
            const draftId = `draft_${user.uid}_${safeData.id}`;
            
            // Perform the write with sanitized data
            await setDoc(doc(db, 'eprfs', draftId), {
                ...safeData,
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
            // Do not throw, allows app to continue working "locally"
        }
    };
    
    if (immediate) {
        await performSave();
    } else {
        // Schedule the write execution (Debounce)
        saveTimeoutRef.current = setTimeout(() => {
            performSave().catch(e => console.error("Background save failed", e));
        }, 2000); 
    }
  };

  const loadEPRF = async (id: string) => {
      if (!user) return null;
      try {
          const docRef = doc(db, 'eprfs', `draft_${user.uid}_${id}`);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
              const data = docSnap.data();
              setCurrentEPRF(data);
              return data;
          }
          return null;
      } catch (e) {
          console.error("Load error", e);
          return null;
      }
  };

  const deleteEPRF = async (id: string) => {
      if (!user) return;
      try {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          const draftId = `draft_${user.uid}_${id}`;
          await deleteDoc(doc(db, 'eprfs', draftId));
          setCurrentEPRF(null);
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
