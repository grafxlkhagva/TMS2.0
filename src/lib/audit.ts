import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface AuditLogEntry {
    targetUserId: string;
    action: string;
    changedBy: {
        uid: string;
        name: string;
    };
    details: string;
}

export async function logAuditAction(entry: AuditLogEntry) {
    if (!db) return;
    try {
        await addDoc(collection(db, 'audit_logs'), {
            ...entry,
            timestamp: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error logging audit action:', error);
    }
}
