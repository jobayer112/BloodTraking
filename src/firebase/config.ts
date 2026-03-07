import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getMessaging } from "firebase/messaging";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBfbLiTNuU0FFTgAosqQ5GQKPAMDfuyo3w",
  authDomain: "register-7df95.firebaseapp.com",
  databaseURL: "https://register-7df95-default-rtdb.firebaseio.com",
  projectId: "register-7df95",
  storageBucket: "register-7df95.firebasestorage.app",
  messagingSenderId: "672996110076",
  appId: "1:672996110076:web:c86089000750cdbf973179",
  measurementId: "G-N1TQTWV3MZ"
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
