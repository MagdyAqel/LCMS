import type { UserRole } from "../types";

export type DemoAccount = {
  role: UserRole;
  username: string;
  password: string;
  displayName: string;
  contactEmail: string;
};

export const demoAdminAccounts: DemoAccount[] = [
  {
    role: "admin",
    username: "ayat",
    password: "Admin@2026!01",
    displayName: "Ayat",
    contactEmail: "ayat@example.com",
  },
  {
    role: "admin",
    username: "admin01",
    password: "Admin@2026!01",
    displayName: "مسؤول النظام 01",
    contactEmail: "admin01@example.com",
  },
  {
    role: "admin",
    username: "admin02",
    password: "Admin@2026!02",
    displayName: "مسؤول النظام 02",
    contactEmail: "admin02@example.com",
  },
];

export const demoTeacherAccounts: DemoAccount[] = [];

export const demoStudentAccounts: DemoAccount[] = Array.from(
  { length: 10 },
  (_, index) => {
    const number = String(index + 1).padStart(2, "0");
    return {
      role: "student",
      username: `student${number}`,
      password: `Student@2026!${number}`,
      displayName: `طالب تجريبي ${number}`,
      contactEmail: `student${number}@example.com`,
    };
  },
);

export const demoAccounts = [
  ...demoAdminAccounts,
  ...demoTeacherAccounts,
  ...demoStudentAccounts,
];
