import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// --- INSTRUCTIONS ---
// 1. Go to https://console.firebase.google.com
// 2. Create a project and enable "Authentication" (Email/Password) and "Firestore Database".
// 3. In Project Settings, look for the "SDK Setup and Configuration" (Web) section.
// 4. Copy the values and paste them inside the quotes below.

const MANUAL_CONFIG = {
  apiKey: "AIzaSyBVnsl_5Bk9s1ot-Mu178SS5bQNNSZ9Luw",
  authDomain: "swaply-1085e.firebaseapp.com",
  databaseURL: "https://swaply-1085e-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "swaply-1085e",
  storageBucket: "swaply-1085e.firebasestorage.app",
  messagingSenderId: "834251447524",
  appId: "1:834251447524:web:35ad02db2db77a80b960f1",
  measurementId: "G-WRBS55ZDX1"
};

// Safe environment variable access supporting multiple prefixes
const getEnv = (key: string): string => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[`REACT_APP_${key}`] || process.env[`VITE_${key}`] || process.env[key] || '';
        }
    } catch (e) {
        // Ignore error
    }
    return '';
};

// Try to get config from Environment Variables first
const envConfig = {
  apiKey: getEnv("FIREBASE_API_KEY"),
  authDomain: getEnv("FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("FIREBASE_APP_ID"),
  measurementId: getEnv("FIREBASE_MEASUREMENT_ID")
};

// Determine which config to use. 
// If Environment variables are missing, we fall back to MANUAL_CONFIG.
const firebaseConfig = (envConfig.apiKey && envConfig.apiKey.length > 0) ? envConfig : MANUAL_CONFIG;

let app: any = {};
let auth: any = { 
    currentUser: null, 
    onAuthStateChanged: () => () => {}, 
    signOut: async () => {},
    signInWithEmailAndPassword: async () => {},
    createUserWithEmailAndPassword: async () => {}
};
let db: any = {};
let storage: any = {};
let analytics: any = null;

export const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.apiKey.length > 0);

try {
    if (isConfigured) {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        if (firebaseConfig.measurementId) {
             try {
                analytics = getAnalytics(app);
             } catch(e) {
                 console.warn("Analytics failed to init");
             }
        }
        console.log("✅ Firebase connected to project:", firebaseConfig.projectId);
    } else {
        console.warn("⚠️ Firebase keys missing in MANUAL_CONFIG. App running in DEMO MODE (Local Storage only).");
        console.warn("   Data will NOT sync between devices.");
    }
} catch (error) {
    console.error("❌ Firebase Initialization Error:", error);
}

export { app, auth, db, storage, analytics };