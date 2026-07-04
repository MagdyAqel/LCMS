import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import type { AppUser } from "../types";

export type AppRecord = {
  id: string;
  [key: string]: unknown;
};

export type RecordScope =
  | { type: "all" }
  | { type: "teacherOwned"; field?: string }
  | { type: "studentArray"; field?: string }
  | { type: "studentOwned"; field?: string }
  | { type: "sentOrReceived" };

function toAppRecord(id: string, data: DocumentData): AppRecord {
  return { id, ...data };
}

function buildScopeConstraints(
  scope: RecordScope,
  user: AppUser,
): QueryConstraint[] {
  if (user.role === "admin" || scope.type === "all") {
    return [];
  }

  if (scope.type === "teacherOwned") {
    return [where(scope.field ?? "teacherId", "==", user.uid)];
  }

  if (scope.type === "studentArray") {
    return [where(scope.field ?? "studentIds", "array-contains", user.uid)];
  }

  if (scope.type === "studentOwned") {
    return [where(scope.field ?? "studentId", "==", user.uid)];
  }

  if (scope.type === "sentOrReceived") {
    return [];
  }

  return [];
}

export function subscribeToRecords(
  collectionName: string,
  user: AppUser,
  scope: RecordScope,
  onChange: (records: AppRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (scope.type === "sentOrReceived" && user.role !== "admin") {
    const seen = new Map<string, AppRecord>();
    let senderLoaded = false;
    let receiverLoaded = false;

    function emitIfReady() {
      if (senderLoaded && receiverLoaded) {
        onChange(Array.from(seen.values()));
      }
    }

    const senderUnsub = onSnapshot(
      query(collection(db, collectionName), where("senderId", "==", user.uid)),
      (snapshot) => {
        snapshot.docs.forEach((item) => {
          seen.set(item.id, toAppRecord(item.id, item.data()));
        });
        senderLoaded = true;
        emitIfReady();
      },
      onError,
    );

    const receiverUnsub = onSnapshot(
      query(collection(db, collectionName), where("receiverId", "==", user.uid)),
      (snapshot) => {
        snapshot.docs.forEach((item) => {
          seen.set(item.id, toAppRecord(item.id, item.data()));
        });
        receiverLoaded = true;
        emitIfReady();
      },
      onError,
    );

    return () => {
      senderUnsub();
      receiverUnsub();
    };
  }

  const constraints = buildScopeConstraints(scope, user);
  const recordsQuery = constraints.length
    ? query(collection(db, collectionName), ...constraints)
    : query(collection(db, collectionName));

  return onSnapshot(
    recordsQuery,
    (snapshot) => {
      const records = snapshot.docs
        .map((item) => toAppRecord(item.id, item.data()))
        .sort((a, b) => {
          const aValue = Number(a.order ?? 0);
          const bValue = Number(b.order ?? 0);
          return aValue - bValue;
        });
      onChange(records);
    },
    onError,
  );
}

export async function createRecord(
  collectionName: string,
  data: Record<string, unknown>,
  user: AppUser,
) {
  const ref = await addDoc(collection(db, collectionName), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog(user, "create", collectionName, ref.id, {
    newValue: data,
  });

  return ref.id;
}

export async function createRecordWithId(
  collectionName: string,
  recordId: string,
  data: Record<string, unknown>,
  user: AppUser,
) {
  await setDoc(doc(db, collectionName, recordId), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await createAuditLog(user, "create", collectionName, recordId, {
    newValue: data,
  });

  return recordId;
}

export async function updateRecord(
  collectionName: string,
  recordId: string,
  data: Record<string, unknown>,
  user: AppUser,
) {
  await updateDoc(doc(db, collectionName, recordId), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  await createAuditLog(user, "update", collectionName, recordId, {
    newValue: data,
  });
}

export async function removeRecord(
  collectionName: string,
  recordId: string,
  user: AppUser,
) {
  await deleteDoc(doc(db, collectionName, recordId));
  await createAuditLog(user, "delete", collectionName, recordId);
}

export async function archiveRecord(
  collectionName: string,
  recordId: string,
  user: AppUser,
) {
  await updateRecord(collectionName, recordId, { status: "archived" }, user);
}

export async function createAuditLog(
  user: AppUser,
  actionType: string,
  entityType: string,
  entityId: string,
  details: { description?: string; oldValue?: unknown; newValue?: unknown } = {},
) {
  try {
    await addDoc(collection(db, "auditLogs"), {
      userId: user.uid,
      userRole: user.role,
      userName: user.displayName,
      actionType,
      entityType,
      entityId,
      description:
        details.description ?? `${actionType} ${entityType} ${entityId}`,
      oldValue: details.oldValue ?? null,
      newValue: details.newValue ?? null,
      createdAt: serverTimestamp(),
      ipAddress: "",
    });
  } catch {
    // Audit logging should not block the user action when rules are still being tuned.
  }
}
