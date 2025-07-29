// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVkZ4cvMGbIdKG6gOCD-kcmHjIThP_2E0",
  authDomain: "tumen-tech-tms-1.firebaseapp.com",
  projectId: "tumen-tech-tms-1",
  storageBucket: "tumen-tech-tms-1.firebasestorage.app",
  messagingSenderId: "983460389511",
  appId: "1:983460389511:web:d4a4e47c7f660ff6788e22"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage, doc, updateDoc, deleteDoc };

    