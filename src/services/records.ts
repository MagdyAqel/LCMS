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
import { getDemoUsers, isDemoUser } from "./demoAuth";

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

const LOCAL_RECORDS_KEY = "lcms.demo.records";

type LocalStore = Record<string, AppRecord[]>;

function nowStamp() {
  return new Date().toISOString();
}

function demoTeachers() {
  return getDemoUsers()
    .filter((user) => user.role === "teacher")
    .map((user, index) => ({
      id: user.uid,
      teacherId: user.uid,
      userId: user.uid,
      username: user.username,
      fullName: user.displayName,
      nationalId: `T-${String(index + 1).padStart(3, "0")}`,
      birthDate: "",
      specializationId: "",
      whatsappNumber: "",
      email: user.contactEmail ?? "",
      status: "active",
      createdBy: "demo-admin01",
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
    }));
}

function demoStudents() {
  const teachers = demoTeachers();
  const teacherId = String(teachers[0]?.id ?? "demo-teacher01");
  return getDemoUsers()
    .filter((user) => user.role === "student")
    .map((user, index) => ({
      id: user.uid,
      studentId: user.uid,
      userId: user.uid,
      teacherId,
      username: user.username,
      fullName: user.displayName,
      nationalId: `S-${String(index + 1).padStart(3, "0")}`,
      stageId: "",
      gradeId: "",
      whatsappNumber: "",
      email: user.contactEmail ?? "",
      status: "active",
      createdAt: nowStamp(),
      updatedAt: nowStamp(),
    }));
}

function defaultLocalStore(): LocalStore {
  return {
    users: getDemoUsers().map((user) => ({ id: user.uid, ...user })),
    teachers: demoTeachers(),
    students: demoStudents(),
    auditLogs: [],
    specializations: [],
    educationalStages: [],
    gradeLevels: [],
    subjects: [],
    curriculums: [],
    teacherCourses: [],
    lessons: [],
    lessonBlocks: [],
    quizzes: [],
    quizAttempts: [],
    notifications: [],
    messages: [],
    systemSettings: [],
  };
}

function readLocalStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_RECORDS_KEY);
    const parsed = raw ? (JSON.parse(raw) as LocalStore) : {};
    return { ...defaultLocalStore(), ...parsed };
  } catch {
    return defaultLocalStore();
  }
}

function writeLocalStore(store: LocalStore) {
  localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event("lcms-demo-records"));
}

function filterLocalRecords(records: AppRecord[], scope: RecordScope, user: AppUser) {
  if (user.role === "admin" || scope.type === "all") {
    return records;
  }

  if (scope.type === "teacherOwned") {
    const field = scope.field ?? "teacherId";
    return records.filter((record) => record[field] === user.uid);
  }

  if (scope.type === "studentArray") {
    const field = scope.field ?? "studentIds";
    return records.filter(
      (record) => Array.isArray(record[field]) && record[field].includes(user.uid),
    );
  }

  if (scope.type === "studentOwned") {
    const field = scope.field ?? "studentId";
    return records.filter((record) => record[field] === user.uid);
  }

  if (scope.type === "sentOrReceived") {
    return records.filter(
      (record) => record.senderId === user.uid || record.receiverId === user.uid,
    );
  }

  return records;
}

function emitLocalRecords(
  collectionName: string,
  user: AppUser,
  scope: RecordScope,
  onChange: (records: AppRecord[]) => void,
) {
  const store = readLocalStore();
  const records = filterLocalRecords(store[collectionName] ?? [], scope, user).sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
  );
  onChange(records);
}

export function subscribeToRecords(
  collectionName: string,
  user: AppUser,
  scope: RecordScope,
  onChange: (records: AppRecord[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  if (isDemoUser(user)) {
    emitLocalRecords(collectionName, user, scope, onChange);
    const listener = () => emitLocalRecords(collectionName, user, scope, onChange);
    window.addEventListener("lcms-demo-records", listener);
    window.addEventListener("storage", listener);
    return () => {
      window.removeEventListener("lcms-demo-records", listener);
      window.removeEventListener("storage", listener);
    };
  }

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
  if (isDemoUser(user)) {
    const store = readLocalStore();
    const id = `${collectionName}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    store[collectionName] = [
      ...(store[collectionName] ?? []),
      { id, ...data, createdAt: nowStamp(), updatedAt: nowStamp() },
    ];
    writeLocalStore(store);
    await createAuditLog(user, "create", collectionName, id, { newValue: data });
    return id;
  }

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
  if (isDemoUser(user)) {
    const store = readLocalStore();
    store[collectionName] = [
      ...(store[collectionName] ?? []).filter((record) => record.id !== recordId),
      { id: recordId, ...data, createdAt: nowStamp(), updatedAt: nowStamp() },
    ];
    writeLocalStore(store);
    await createAuditLog(user, "create", collectionName, recordId, {
      newValue: data,
    });
    return recordId;
  }

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
  if (isDemoUser(user)) {
    const store = readLocalStore();
    store[collectionName] = (store[collectionName] ?? []).map((record) =>
      record.id === recordId
        ? { ...record, ...data, updatedAt: nowStamp() }
        : record,
    );
    writeLocalStore(store);
    await createAuditLog(user, "update", collectionName, recordId, {
      newValue: data,
    });
    return;
  }

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
  if (isDemoUser(user)) {
    const store = readLocalStore();
    store[collectionName] = (store[collectionName] ?? []).filter(
      (record) => record.id !== recordId,
    );
    writeLocalStore(store);
    await createAuditLog(user, "delete", collectionName, recordId);
    return;
  }

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
  if (isDemoUser(user)) {
    const store = readLocalStore();
    const logId = `audit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    store.auditLogs = [
      {
        id: logId,
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
        createdAt: nowStamp(),
        ipAddress: "",
      },
      ...(store.auditLogs ?? []),
    ];
    writeLocalStore(store);
    return;
  }

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
