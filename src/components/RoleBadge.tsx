import type { UserRole } from "../types";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

const roleClasses: Record<UserRole, string> = {
  admin: "bg-amber-50 text-amber-700 ring-amber-200",
  teacher: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  student: "bg-blue-50 text-blue-700 ring-blue-200",
};

export function RoleBadge({ role }: { role: UserRole }) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full px-3 text-xs font-bold ring-1 ${roleClasses[role]}`}
    >
      {roleLabels[role]}
    </span>
  );
}
