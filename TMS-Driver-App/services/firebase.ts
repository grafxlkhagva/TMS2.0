import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import Constants from 'expo-constants';

// Firebase configuration from environment variables
// Note: In SDK 50+, use Constants.expoConfig.extra
const extra = Constants.expoConfig?.extra || {};

const firebaseConfig = {
    apiKey: extra.firebaseApiKey,
    authDomain: extra.firebaseAuthDomain,
    projectId: extra.firebaseProjectId,
    storageBucket: extra.firebaseStorageBucket,
    messagingSenderId: extra.firebaseMessagingSenderId,
    appId: extra.firebaseAppId,
};

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

if (firebaseConfig.apiKey) {
    try {
        if (getApps().length === 0) {
            // Modular initialization
            app = initializeApp(firebaseConfig);
            // Compat initialization (Required for some Expo libraries like Recaptcha)
            firebase.initializeApp(firebaseConfig);
            console.log('✅ Firebase initialized (Modular + Compat)');
        } else {
            app = getApp();
            console.log('✅ Firebase initialized (Existing Instance)');
        }

        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (e) {
        console.error('❌ Failed to initialize Firebase:', e);
        throw e;
    }
} else {
    console.error('❌ Firebase config is missing. Check your .env file and app.config.js');
    // Provide dummy objects to avoid crash on import, but logs will show the error
    app = {} as FirebaseApp;
    auth = {} as Auth;
    db = {} as Firestore;
    storage = {} as FirebaseStorage;
}

export { app, auth, db, storage };
