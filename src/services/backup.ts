import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export const backupCollections = [
  "users",
  "usernames",
  "teachers",
  "students",
  "educationalStages",
  "curriculums",
  "teacherCourses",
  "lessons",
  "lessonBlocks",
  "quizzes",
  "quizAttempts",
  "studentProgress",
  "notifications",
  "messages",
  "systemSettings",
] as const;

export type BackupPayload = {
  version: 1;
  exportedAt: string;
  collections: Record<string, Array<{ id: string; data: Record<string, unknown> }>>;
};

function serializeValue(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if ("seconds" in value && typeof value.seconds === "number") {
    return { __type: "timestamp", seconds: value.seconds };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      serializeValue(item),
    ]),
  );
}

function deserializeValue(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  if (
    !Array.isArray(value) &&
    (value as Record<string, unknown>).__type === "timestamp"
  ) {
    return serverTimestamp();
  }

  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      deserializeValue(item),
    ]),
  );
}

export async function exportBackup(): Promise<BackupPayload> {
  const collections: BackupPayload["collections"] = {};

  for (const collectionName of backupCollections) {
    const snapshot = await getDocs(collection(db, collectionName));
    collections[collectionName] = snapshot.docs.map((item) => ({
      id: item.id,
      data: serializeValue(item.data()) as Record<string, unknown>,
    }));
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    collections,
  };
}

export async function importBackup(payload: BackupPayload) {
  if (!payload || payload.version !== 1 || !payload.collections) {
    throw new Error("ملف النسخة الاحتياطية غير صالح.");
  }

  const entries = Object.entries(payload.collections).flatMap(
    ([collectionName, records]) =>
      records.map((record) => ({
        collectionName,
        id: record.id,
        data: deserializeValue(record.data) as Record<string, unknown>,
      })),
  );

  for (let index = 0; index < entries.length; index += 450) {
    const batch = writeBatch(db);
    for (const entry of entries.slice(index, index + 450)) {
      batch.set(doc(db, entry.collectionName, entry.id), entry.data, {
        merge: true,
      });
    }
    await batch.commit();
  }
}

export function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
