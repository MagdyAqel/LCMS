import { deleteApp, initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import { db, firebaseConfig } from "../lib/firebase";
import type { AppUser, UserRole } from "../types";
import { normalizeUsername, usernameToEmail } from "../utils/username";

type CreateManagedAccountInput = {
  username: string;
  password: string;
  displayName: string;
  role: UserRole;
  createdBy: AppUser;
  contactEmail?: string;
  disabled?: boolean;
};

export type ManagedAccountResult = {
  uid: string;
  username: string;
  email: string;
};

export async function findUsernameAccount(username: string) {
  const normalized = normalizeUsername(username);

  if (!normalized) {
    return null;
  }

  const snapshot = await getDoc(doc(db, "usernames", normalized));

  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    uid: String(data.uid ?? ""),
    username: normalized,
    email: String(data.email ?? usernameToEmail(normalized)),
    role: data.role as UserRole,
  };
}

export async function createManagedAccount({
  username,
  password,
  displayName,
  role,
  createdBy,
  contactEmail = "",
  disabled = false,
}: CreateManagedAccountInput): Promise<ManagedAccountResult> {
  const normalized = normalizeUsername(username);

  if (normalized.length < 3) {
    throw new Error("اسم المستخدم يجب أن يكون 3 أحرف على الأقل.");
  }

  if (password.length < 6) {
    throw new Error("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");
  }

  const existing = await findUsernameAccount(normalized);

  if (existing) {
    throw new Error("اسم المستخدم مستخدم بالفعل.");
  }

  const email = usernameToEmail(normalized);
  const secondaryApp = initializeApp(
    firebaseConfig,
    `managed-account-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const credentials = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    );

    await updateProfile(credentials.user, { displayName });
    await signOut(secondaryAuth);

    const batch = writeBatch(db);
    const userRef = doc(db, "users", credentials.user.uid);
    const usernameRef = doc(db, "usernames", normalized);

    batch.set(userRef, {
      uid: credentials.user.uid,
      email,
      username: normalized,
      contactEmail,
      displayName,
      photoURL: null,
      role,
      disabled,
      createdBy: createdBy.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    batch.set(usernameRef, {
      uid: credentials.user.uid,
      email,
      username: normalized,
      contactEmail,
      displayName,
      role,
      createdBy: createdBy.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return {
      uid: credentials.user.uid,
      username: normalized,
      email,
    };
  } finally {
    await deleteApp(secondaryApp);
  }
}
