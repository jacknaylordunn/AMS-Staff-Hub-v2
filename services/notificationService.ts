
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { AppNotification, Role } from '../types';

const logo = 'https://145955222.fs1.hubspotusercontent-eu1.net/hubfs/145955222/AMS/Logo%20FINAL%20(2).png';

export const sendNotification = async (
  recipientId: string, 
  title: string, 
  message: string, 
  type: 'info' | 'alert' | 'success' = 'info',
  link?: string
) => {
  try {
    const notification: Partial<AppNotification> = {
      userId: recipientId,
      title,
      message,
      type,
      read: false,
      timestamp: new Date().toISOString(),
      link
    };

    // Write to Firestore subcollection: users/{userId}/notifications
    await addDoc(collection(db, `users/${recipientId}/notifications`), notification);
  } catch (e) {
    console.error("Failed to send notification", e);
  }
};

export const notifyManagers = async (title: string, message: string, type: 'info' | 'alert' | 'success' = 'info', link?: string) => {
    try {
        // Find all managers and admins
        const q = query(collection(db, 'users'), where('role', 'in', [Role.Manager, Role.Admin]));
        const snap = await getDocs(q);
        
        const promises = snap.docs.map(doc => 
            sendNotification(doc.id, title, message, type, link)
        );
        
        await Promise.all(promises);
    } catch (e) {
        console.error("Failed to notify managers", e);
    }
};

export const notifyAllStaff = async (title: string, message: string, type: 'info' | 'alert' | 'success' = 'info', link?: string) => {
    try {
        // Find all active staff
        const q = query(collection(db, 'users'), where('status', '==', 'Active'));
        const snap = await getDocs(q);
        
        // Batching or limiting concurrent writes is ideal for large scale, 
        // but for this scope, parallel promises are acceptable.
        const promises = snap.docs.map(doc => 
            sendNotification(doc.id, title, message, type, link)
        );
        
        await Promise.all(promises);
    } catch (e) {
        console.error("Failed to notify all staff", e);
    }
};

export const requestBrowserPermission = async () => {
  if (!('Notification' in window)) {
    console.log("This browser does not support desktop notification");
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

export const sendBrowserNotification = (title: string, body: string) => {
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: logo
    });
  }
};
