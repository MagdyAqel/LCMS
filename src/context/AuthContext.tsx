import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import {
  ensureUserDocument,
  subscribeToUser,
  userDocumentRef,
} from "../services/users";
import type { AppUser } from "../types";
import { serverTimestamp, setDoc } from "firebase/firestore";
import { identifierToAuthEmail } from "../utils/username";

type AuthContextValue = {
  firebaseUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    displayName: string,
    email: string,
    password: string,
  ) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getAuthMessage(error: unknown) {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "بيانات الدخول غير صحيحة.";
    case "auth/email-already-in-use":
      return "هذا البريد مستخدم بالفعل.";
    case "auth/weak-password":
      return "كلمة المرور يجب أن تكون 6 أحرف على الأقل.";
    case "auth/too-many-requests":
      return "تم إيقاف المحاولة مؤقتاً بسبب كثرة الطلبات. حاول لاحقاً.";
    default:
      return "حدث خطأ غير متوقع. حاول مرة أخرى.";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    let userSubscription: (() => void) | undefined;

    const authSubscription = onAuthStateChanged(auth, async (user) => {
      userSubscription?.();
      setFirebaseUser(user);
      setAppUser(null);

      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        await ensureUserDocument(user);
        userSubscription = subscribeToUser(
          user.uid,
          (profile) => {
            setAppUser(profile);
            setLoading(false);
          },
          () => {
            setError("تعذر تحميل ملف المستخدم.");
            setLoading(false);
          },
        );
      } catch {
        setError("تعذر تهيئة ملف المستخدم.");
        setLoading(false);
      }
    });

    return () => {
      userSubscription?.();
      authSubscription();
    };
  }, []);

  const login = useCallback(async (identifier: string, password: string) => {
    setError(null);

    try {
      await signInWithEmailAndPassword(
        auth,
        identifierToAuthEmail(identifier),
        password,
      );
    } catch (err) {
      const message = getAuthMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const register = useCallback(
    async (displayName: string, email: string, password: string) => {
      setError(null);

      try {
        const credentials = await createUserWithEmailAndPassword(
          auth,
          email,
          password,
        );

        await updateProfile(credentials.user, { displayName });
        await setDoc(userDocumentRef(credentials.user.uid), {
          uid: credentials.user.uid,
          email,
          username: "",
          contactEmail: email,
          displayName,
          photoURL: null,
          role: "student",
          disabled: false,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        const message = getAuthMessage(err);
        setError(message);
        throw new Error(message);
      }
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    setError(null);

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const message = getAuthMessage(err);
      setError(message);
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    setAppUser(null);
    setFirebaseUser(null);
    await signOut(auth);
  }, []);

  const value = useMemo(
    () => ({
      firebaseUser,
      appUser,
      loading,
      error,
      login,
      register,
      resetPassword,
      logout,
      clearError,
    }),
    [
      firebaseUser,
      appUser,
      loading,
      error,
      login,
      register,
      resetPassword,
      logout,
      clearError,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
