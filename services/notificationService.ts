
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { AppNotification } from '../types';
import logo from '../assets/logo.png';

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