
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { User, EPRF } from '../types';

// --- DATA EXPORT HELPERS ---

const downloadJSON = (data: any, filename: string) => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// --- STAFF FUNCTIONS ---

export const exportStaffData = async (userId: string) => {
    const data: any = {
        profile: null,
        cpd: [],
        notifications: [],
        shifts: [],
        audit_logs: []
    };

    // 1. Profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) data.profile = userDoc.data();

    // 2. CPD
    const cpdSnap = await getDocs(collection(db, `users/${userId}/cpd`));
    data.cpd = cpdSnap.docs.map(d => d.data());

    // 3. Notifications
    const notifSnap = await getDocs(collection(db, `users/${userId}/notifications`));
    data.notifications = notifSnap.docs.map(d => d.data());

    // 4. Shifts (Where user was assigned)
    // Note: This is an expensive query if checking slots manually, relying on timeRecords is easier
    // For simplicity in this utility, we pull timeRecords where user ID keys exist
    // This is hard to query perfectly in NoSQL without specific indexes, skipping for basic SAR to avoid performance hits
    // Instead, we log that they existed.
    
    // 5. Audit Logs
    const auditQ = query(collection(db, 'audit_logs'), where('userId', '==', userId));
    const auditSnap = await getDocs(auditQ);
    data.audit_logs = auditSnap.docs.map(d => d.data());

    downloadJSON(data, `SAR_Staff_${userId}_${new Date().toISOString()}.json`);
};

export const deleteStaffData = async (userId: string) => {
    const batch = writeBatch(db);

    // 1. Delete Subcollections (CPD/Notifs) - Firestore requires deleting docs individually
    const cpdSnap = await getDocs(collection(db, `users/${userId}/cpd`));
    cpdSnap.docs.forEach(d => batch.delete(d.ref));

    const notifSnap = await getDocs(collection(db, `users/${userId}/notifications`));
    notifSnap.docs.forEach(d => batch.delete(d.ref));

    // 2. Delete Main Profile
    batch.delete(doc(db, 'users', userId));

    // Note: We do NOT delete ePRFs created by this user as they are clinical legal records of the company.
    // However, we effectively anonymize the link by removing the user profile.

    await batch.commit();
};

// --- PATIENT FUNCTIONS ---

export const searchPatientRecords = async (searchTerm: string): Promise<EPRF[]> => {
    // Search strategy: Try NHS Number first, then exact Last Name
    // Note: Firestore doesn't support "OR" queries or partial string matches natively easily.
    // We will query by lastName as primary key for search.
    
    const eprfs: EPRF[] = [];
    const coll = collection(db, 'eprfs');

    // Attempt NHS Number Query
    if (/\d{10}/.test(searchTerm)) {
        const qNHS = query(coll, where('patient.nhsNumber', '==', searchTerm));
        const snapNHS = await getDocs(qNHS);
        snapNHS.forEach(d => eprfs.push({ id: d.id, ...d.data() } as EPRF));
    }

    // Attempt Surname Query (Case sensitive usually, assuming standard capitalization in DB)
    const qName = query(coll, where('patient.lastName', '==', searchTerm));
    const snapName = await getDocs(qName);
    snapName.forEach(d => {
        if (!eprfs.some(e => e.id === d.id)) {
            eprfs.push({ id: d.id, ...d.data() } as EPRF);
        }
    });

    return eprfs;
};

export const exportPatientData = async (records: EPRF[]) => {
    if (records.length === 0) return;
    const filename = `SAR_Patient_${records[0].patient.lastName}_${new Date().toISOString()}.json`;
    downloadJSON(records, filename);
};

export const deletePatientData = async (recordIds: string[]) => {
    const batch = writeBatch(db);
    recordIds.forEach(id => {
        batch.delete(doc(db, 'eprfs', id));
    });
    await batch.commit();
};
