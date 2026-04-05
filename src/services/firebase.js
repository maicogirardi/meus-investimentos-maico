import { getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const defaultFirebaseConfig = {
  apiKey: "AIzaSyAirXYYM6Cds5XfVv5h9vqNruw18r0d66E",
  authDomain: "meus-investimentos-maico.firebaseapp.com",
  projectId: "meus-investimentos-maico",
  storageBucket: "meus-investimentos-maico.firebasestorage.app",
  messagingSenderId: "137709460544",
  appId: "1:137709460544:web:34157b78d38b448be693a5",
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
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
