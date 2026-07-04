import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import {
  demoAdminAccounts,
  demoStudentAccounts,
  demoTeacherAccounts,
  type DemoAccount,
} from "../data/demoAccounts";
import { db } from "../lib/firebase";
import type { AppUser } from "../types";
import { findUsernameAccount, createManagedAccount } from "./accounts";
import { createAuditLog } from "./records";

export type SeedResult = {
  username: string;
  role: DemoAccount["role"];
  status: "created" | "exists";
};

async function ensureDemoAccount(account: DemoAccount, createdBy: AppUser) {
  const existing = await findUsernameAccount(account.username);

  if (existing?.uid) {
    return { uid: existing.uid, status: "exists" as const };
  }

  const created = await createManagedAccount({
    username: account.username,
    password: account.password,
    displayName: account.displayName,
    role: account.role,
    createdBy,
    contactEmail: account.contactEmail,
  });

  return { uid: created.uid, status: "created" as const };
}

export async function seedDemoAccounts(createdBy: AppUser) {
  const results: SeedResult[] = [];

  for (const account of demoAdminAccounts) {
    const result = await ensureDemoAccount(account, createdBy);
    results.push({ username: account.username, role: account.role, status: result.status });
  }

  const teacherIds: string[] = [];

  for (const account of demoTeacherAccounts) {
    const result = await ensureDemoAccount(account, createdBy);
    teacherIds.push(result.uid);
    results.push({ username: account.username, role: account.role, status: result.status });

    await setDoc(
      doc(db, "teachers", result.uid),
      {
        teacherId: result.uid,
        userId: result.uid,
        username: account.username,
        fullName: account.displayName,
        nationalId: `T-${account.username}`,
        birthDate: "",
        specializationId: "",
        whatsappNumber: "",
        email: account.contactEmail,
        authEmail: `${account.username}@lcms.test`,
        status: "active",
        createdBy: createdBy.uid,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  const defaultTeacherId = teacherIds[0] ?? createdBy.uid;

  for (const account of demoStudentAccounts) {
    const result = await ensureDemoAccount(account, createdBy);
    results.push({ username: account.username, role: account.role, status: result.status });

    await setDoc(
      doc(db, "students", result.uid),
      {
        studentId: result.uid,
        userId: result.uid,
        teacherId: defaultTeacherId,
        username: account.username,
        fullName: account.displayName,
        nationalId: `S-${account.username}`,
        stageId: "",
        gradeId: "",
        whatsappNumber: "",
        email: account.contactEmail,
        authEmail: `${account.username}@lcms.test`,
        status: "active",
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  await createAuditLog(createdBy, "seed", "demoAccounts", "demo-accounts", {
    description: "Seeded demo LCMS accounts",
    newValue: results,
  });

  return results;
}
