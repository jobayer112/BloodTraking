import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAFWHlevE6Qb9iwYBNlsKwhZV8Oqt6x180",
  authDomain: "bizsight-o8tvx.firebaseapp.com",
  projectId: "bizsight-o8tvx",
  storageBucket: "bizsight-o8tvx.firebasestorage.app",
  messagingSenderId: "21467871849",
  appId: "1:21467871849:web:6e2ad8954756a1fe4480f8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Messaging might fail in some environments (like if not supported)
export let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn("Firebase Messaging not supported in this environment");
}

export default app;
