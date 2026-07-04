import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBAWtIQSmUTADrPl9HQZr8wDOtHk62lDcM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "lcms-9ed7b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "lcms-9ed7b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "lcms-9ed7b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "461291397964",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:461291397964:web:ff8205fd67d86cc0f1a5e9",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
