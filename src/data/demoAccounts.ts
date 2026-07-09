import type { UserRole } from "../types";

export type DemoAccount = {
  role: UserRole;
  username: string;
  password: string;
  displayName: string;
  contactEmail: string;
};

export const demoAdminAccounts: DemoAccount[] = [];

export const demoTeacherAccounts: DemoAccount[] = [];

export const demoStudentAccounts: DemoAccount[] = [];

export const demoAccounts: DemoAccount[] = [];
