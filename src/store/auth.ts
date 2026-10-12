import { create } from "zustand";
import { onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "../lib/firebase";

/**
 * F12 — đăng nhập bằng Firebase Authentication (Email/Password).
 * Phiên đăng nhập do Firebase SDK tự lưu; quyền xem dữ liệu do Security Rules quyết định (readerUids).
 */
interface AuthUser {
  uid: string;
  email: string;
}

/** Mã lỗi đăng nhập đã quy đổi để UI chọn câu thông báo. */
export type AuthErrorKind = "invalidCredential" | "tooManyRequests" | "network" | "unknown";

interface AuthState {
  /** false cho tới khi Firebase báo trạng thái đăng nhập lần đầu. */
  ready: boolean;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthErrorKind | null>;
  resetPassword: (email: string) => Promise<AuthErrorKind | null>;
  logout: () => Promise<void>;
}

function errorKind(error: unknown): AuthErrorKind {
  if (!(error instanceof FirebaseError)) return "unknown";
  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/invalid-email":
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/user-disabled":
      return "invalidCredential";
    case "auth/too-many-requests":
      return "tooManyRequests";
    case "auth/network-request-failed":
      return "network";
    default:
      return "unknown";
  }
}

export const useAuth = create<AuthState>()(() => ({
  ready: false,
  user: null,
  login: async (email, password) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return null;
    } catch (error) {
      return errorKind(error);
    }
  },
  resetPassword: async (email) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
      return null;
    } catch (error) {
      return errorKind(error);
    }
  },
  logout: () => signOut(auth),
}));

onAuthStateChanged(auth, (user) => {
  useAuth.setState({ ready: true, user: user ? { uid: user.uid, email: user.email ?? "" } : null });
});
