import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeAppCheck } from "firebase/app-check";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getStorage, FirebaseStorage } from "firebase/storage";
import { getFunctions, Functions, httpsCallable } from "firebase/functions";
import { ReCaptchaV3Provider } from "firebase/app-check";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const FUNCTIONS_REGION =
  (import.meta.env.VITE_FIREBASE_FUNCTIONS_REGION as string | undefined) ?? "us-central1";

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;
let functions: Functions;

if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  const recaptchaSiteKey = import.meta.env.VITE_APP_CHECK_RECAPTCHA_SITE_KEY;
  if (recaptchaSiteKey) {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(recaptchaSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  }
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, FUNCTIONS_REGION);
} else {
  app = getApps()[0] as FirebaseApp;
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app, FUNCTIONS_REGION);
}

export { app, auth, db, storage, functions, httpsCallable };
