import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

// --------------------------------------------------------
// HARDCODED FIREBASE CONFIGURATION
// --------------------------------------------------------
const firebaseConfig = {
    apiKey: "AIzaSyD9V_vgen-T0xF0BGD3MYjsnw_Ehh9ajSs",
    authDomain: "ams-staff-hub-e0b7d.firebaseapp.com",
    projectId: "ams-staff-hub-e0b7d",
    storageBucket: "ams-staff-hub-e0b7d.firebasestorage.app",
    messagingSenderId: "185874797080",
    appId: "1:185874797080:web:33ba24f2a1a30912d9a96d",
    measurementId: "G-FHD8DDRG0K"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);

// Initialize Authentication
export const auth = getAuth(app);

// Initialize Firestore
export const db = getFirestore(app);

// Initialize other services
export const storage = getStorage(app);
export const functions = getFunctions(app);
export const analytics = getAnalytics(app);
