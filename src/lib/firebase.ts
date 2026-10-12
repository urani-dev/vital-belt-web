import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

/** Đọc biến môi trường bắt buộc; thiếu thì dừng sớm thay vì để SDK báo lỗi mơ hồ lúc gọi API. */
function requireEnv(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (!value) throw new Error(`Missing env ${name} — xem .env.example`);
  return value;
}

/** Project Firebase "VITAL BELT Demo" (vital-belt-demo-20261010). */
export const firebaseApp = initializeApp({
  apiKey: requireEnv("VITE_FIREBASE_API_KEY"),
  authDomain: requireEnv("VITE_FIREBASE_AUTH_DOMAIN"),
  projectId: requireEnv("VITE_FIREBASE_PROJECT_ID"),
  storageBucket: requireEnv("VITE_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: requireEnv("VITE_FIREBASE_MESSAGING_SENDER_ID"),
  appId: requireEnv("VITE_FIREBASE_APP_ID"),
});

export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
