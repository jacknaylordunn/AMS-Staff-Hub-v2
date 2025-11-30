
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

export interface AuditEntry {
    action: string;
    details: string;
    userId: string;
    userName: string;
    timestamp: string;
    category: 'Clinical' | 'Operational' | 'Security' | 'Drug';
}

export const logAuditAction = async (
    userId: string, 
    userName: string, 
    action: string, 
    details: string, 
    category: 'Clinical' | 'Operational' | 'Security' | 'Drug'
) => {
    try {
        const entry: AuditEntry = {
            action,
            details,
            userId,
            userName,
            timestamp: new Date().toISOString(),
            category
        };
        
        await addDoc(collection(db, 'audit_logs'), {
            ...entry,
            serverTimestamp: Timestamp.now()
        });
        
    } catch (e) {
        console.error("Failed to log audit entry", e);
        // We log locally if remote fails to ensure at least console visibility
        console.warn("AUDIT FAILURE BACKUP:", action, details);
    }
};
