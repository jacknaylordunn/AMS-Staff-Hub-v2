
import { db } from '../services/firebase';
import { collection, query, where, getDocs, doc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';
import { User, EPRF } from '../types';

// Helper to download text file
const downloadTextFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/plain' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export const exportStaffData = async (userId: string) => {
    // 1. Profile
    const userDoc = await getDoc(doc(db, 'users', userId));
    const profile = userDoc.exists() ? userDoc.data() : {};

    // 2. CPD
    const cpdSnap = await getDocs(collection(db, `users/${userId}/cpd`));
    const cpd = cpdSnap.docs.map(d => d.data());

    let report = `SUBJECT ACCESS REQUEST (SAR) - STAFF DATA\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Subject ID: ${userId}\n\n`;
    
    report += `--- PROFILE DATA ---\n`;
    report += `Name: ${profile.name}\n`;
    report += `Email: ${profile.email}\n`;
    report += `Role: ${profile.role}\n`;
    report += `Status: ${profile.status}\n`;
    report += `Joined: ${profile.createdAt || 'Unknown'}\n\n`;

    report += `--- CPD RECORDS (${cpd.length}) ---\n`;
    cpd.forEach(entry => {
        report += `Date: ${entry.date} | Title: ${entry.title} | Hours: ${entry.hours} | Type: ${entry.type}\n`;
        report += `Reflection: ${entry.reflection}\n---\n`;
    });

    downloadTextFile(report, `SAR_Staff_${userId}.txt`);
};

export const deleteStaffData = async (userId: string) => {
    const batch = writeBatch(db);
    const cpdSnap = await getDocs(collection(db, `users/${userId}/cpd`));
    cpdSnap.docs.forEach(d => batch.delete(d.ref));
    const notifSnap = await getDocs(collection(db, `users/${userId}/notifications`));
    notifSnap.docs.forEach(d => batch.delete(d.ref));
    batch.delete(doc(db, 'users', userId));
    await batch.commit();
};

export const searchPatientRecords = async (searchTerm: string): Promise<EPRF[]> => {
    const eprfs: EPRF[] = [];
    const coll = collection(db, 'eprfs');

    if (/\d{10}/.test(searchTerm)) {
        const qNHS = query(coll, where('patient.nhsNumber', '==', searchTerm));
        const snapNHS = await getDocs(qNHS);
        snapNHS.forEach(d => eprfs.push({ id: d.id, ...d.data() } as EPRF));
    }

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
    
    let report = `SUBJECT ACCESS REQUEST (SAR) - PATIENT DATA\n`;
    report += `Generated: ${new Date().toISOString()}\n`;
    report += `Records Found: ${records.length}\n\n`;

    records.forEach((rec, idx) => {
        report += `RECORD #${idx + 1}\n`;
        report += `Date: ${new Date(rec.lastUpdated).toLocaleDateString()}\n`;
        report += `Incident Ref: ${rec.incidentNumber}\n`;
        report += `Patient: ${rec.patient.firstName} ${rec.patient.lastName} (DOB: ${rec.patient.dob})\n`;
        report += `Location: ${rec.location}\n`;
        report += `Working Impression: ${rec.clinicalDecision?.workingImpression}\n`;
        report += `Outcome: ${rec.clinicalDecision?.finalDisposition}\n`;
        report += `Narrative:\n${rec.assessment.clinicalNarrative}\n`;
        report += `==========================================\n\n`;
    });

    const filename = `SAR_Patient_${records[0].patient.lastName}_${new Date().toISOString().split('T')[0]}.txt`;
    downloadTextFile(report, filename);
};

export const deletePatientData = async (recordIds: string[]) => {
    const batch = writeBatch(db);
    recordIds.forEach(id => {
        batch.delete(doc(db, 'eprfs', id));
    });
    await batch.commit();
};
