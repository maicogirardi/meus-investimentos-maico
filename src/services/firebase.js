import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

function hasRequiredConfig() {
  return Object.values(firebaseConfig).every(Boolean);
}

export function initializeFirebaseApp() {
  if (!hasRequiredConfig()) {
    return null;
  }

  firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);

  return firebaseApp;
}

export function getFirebaseAuth() {
  if (!firebaseAuth) {
    initializeFirebaseApp();
  }

  return firebaseAuth;
}

export function getFirebaseDb() {
  if (!firebaseDb) {
    initializeFirebaseApp();
  }

  return firebaseDb;
}
