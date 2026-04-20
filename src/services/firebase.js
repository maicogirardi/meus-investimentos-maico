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

const requiredFirebaseEnvKeys = Object.freeze([
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
]);

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

function getMissingFirebaseEnvKeys() {
  return requiredFirebaseEnvKeys.filter((key) => {
    const value = import.meta.env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
}

// Inicializa o app apenas quando o ambiente estiver completo.
export function initializeFirebaseApp() {
  const missingKeys = getMissingFirebaseEnvKeys();

  if (missingKeys.length > 0) {
    console.warn(`Firebase não inicializado: variáveis ausentes (${missingKeys.join(", ")}).`);
    return null;
  }

  firebaseApp = getApps()[0] ?? initializeApp(firebaseConfig);
  firebaseAuth = getAuth(firebaseApp);
  firebaseDb = getFirestore(firebaseApp);

  return firebaseApp;
}

// Reaproveita a instância de Auth já criada pelo app.
export function getFirebaseAuth() {
  if (!firebaseAuth) {
    initializeFirebaseApp();
  }

  return firebaseAuth;
}

// Reaproveita a instância de Firestore já criada pelo app.
export function getFirebaseDb() {
  if (!firebaseDb) {
    initializeFirebaseApp();
  }

  return firebaseDb;
}
