// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVkZ4cvMGbIdKG6gOCD-kcmHjIThP_2E0",
  authDomain: "tumen-tech-tms-1.firebaseapp.com",
  projectId: "tumen-tech-tms-1",
  storageBucket: "tumen-tech-tms-1.appspot.com",
  messagingSenderId: "983460389511",
  appId: "1:983460389511:web:d4a4e47c7f660ff6788e22"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export { app };
