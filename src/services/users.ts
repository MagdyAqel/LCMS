import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "../lib/firebase";
import type { AppUser, UserRole } from "../types";

const usersCollection = collection(db, "users");

export function normalizeUserRole(role: unknown): UserRole {
  if (role === "admin" || role === "teacher" || role === "student") {
    return role;
  }

  return "student";
}

export function userDocumentRef(uid: string) {
  return doc(db, "users", uid);
}

export async function ensureUserDocument(user: User) {
  const ref = userDocumentRef(user.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return;
  }

  await setDoc(ref, {
    uid: user.uid,
    email: user.email ?? "",
    username: user.email?.endsWith("@lcms.test")
      ? user.email.split("@")[0]
      : "",
    contactEmail: "",
    displayName: user.displayName ?? user.email?.split("@")[0] ?? "Student",
    photoURL: user.photoURL ?? null,
    role: "student",
    disabled: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function toAppUser(uid: string, data: Record<string, unknown>): AppUser {
  return {
    uid,
    email: String(data.email ?? ""),
    username: typeof data.username === "string" ? data.username : "",
    contactEmail: typeof data.contactEmail === "string" ? data.contactEmail : "",
    displayName: String(data.displayName ?? "مستخدم"),
    role: normalizeUserRole(data.role),
    disabled: Boolean(data.disabled ?? false),
    photoURL: typeof data.photoURL === "string" ? data.photoURL : null,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeToUser(
  uid: string,
  onChange: (user: AppUser | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    userDocumentRef(uid),
    (snapshot) => {
      onChange(snapshot.exists() ? toAppUser(snapshot.id, snapshot.data()) : null);
    },
    onError,
  );
}

export function subscribeToUsers(
  onChange: (users: AppUser[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const usersQuery = query(usersCollection, orderBy("createdAt", "desc"));

  return onSnapshot(
    usersQuery,
    (snapshot) => {
      onChange(snapshot.docs.map((item) => toAppUser(item.id, item.data())));
    },
    onError,
  );
}

export async function updateUserRole(uid: string, role: UserRole) {
  await updateDoc(userDocumentRef(uid), {
    role,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserDisabled(uid: string, disabled: boolean) {
  await updateDoc(userDocumentRef(uid), {
    disabled,
    updatedAt: serverTimestamp(),
  });
}
