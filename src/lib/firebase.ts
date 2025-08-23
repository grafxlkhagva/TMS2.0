
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Initialize Firebase only if the config is valid
let app: FirebaseApp;
if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
} else {
    console.warn("Firebase config is incomplete. Firebase services will be unavailable.");
    // Create a dummy app object to avoid crashing the app
    app = {} as FirebaseApp;
}


const auth = app.name ? getAuth(app) : {};
const db = app.name ? getFirestore(app) : {};
const storage = app.name ? getStorage(app) : {};


export { app, auth, db, storage, doc, updateDoc, deleteDoc };
