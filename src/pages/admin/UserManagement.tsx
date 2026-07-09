import { Ban, CheckCircle2, Edit3, Plus, RefreshCw, Save, ShieldCheck, Users, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { RoleBadge } from "../../components/RoleBadge";
import { useAuth } from "../../context/AuthContext";
import { createManagedAccount } from "../../services/accounts";
import {
  subscribeToUsers,
  updateUserDisabled,
  updateUserProfile,
  updateUserRole,
} from "../../services/users";
import type { AppUser, UserRole } from "../../types";

const roles: UserRole[] = ["admin", "teacher", "student"];

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

export function UserManagement() {
  const { appUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [savingUid, setSavingUid] = useState<string | null>(null);
  const [editingUid, setEditingUid] = useState<string | null>(null);
  const [editUser, setEditUser] = useState({
    displayName: "",
    contactEmail: "",
  });
  const [filter, setFilter] = useState<UserRole | "all">("all");
  const [newUser, setNewUser] = useState({
    displayName: "",
    username: "",
    password: "",
    confirmPassword: "",
    contactEmail: "",
    role: "admin" as UserRole,
  });

  const passwordMismatch =
    newUser.confirmPassword.length > 0 && newUser.password !== newUser.confirmPassword;

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const unsubscribe = subscribeToUsers(
      (items) => {
        setUsers(items);
        setLoading(false);
      },
      () => {
        setError("تعذر تحميل المستخدمين. تأكد من نشر قواعد Firestore.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [appUser]);

  const filteredUsers = useMemo(() => {
    if (filter === "all") {
      return users;
    }

    return users.filter((user) => user.role === filter);
  }, [filter, users]);

  async function handleRoleChange(uid: string, role: UserRole) {
    setSavingUid(uid);
    setError(null);

    try {
      await updateUserRole(uid, role);
    } catch {
      setError("تعذر تحديث الدور.");
    } finally {
      setSavingUid(null);
    }
  }

  async function handleDisabledChange(uid: string, disabled: boolean) {
    setSavingUid(uid);
    setError(null);

    try {
      await updateUserDisabled(uid, disabled);
    } catch {
      setError("تعذر تحديث حالة المستخدم.");
    } finally {
      setSavingUid(null);
    }
  }

  async function handleCreateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser) {
      return;
    }

    setSavingUid("new");
    setError(null);
    setNotice(null);

    try {
      if (newUser.password !== newUser.confirmPassword) {
        throw new Error("كلمة المرور وتأكيدها غير متطابقين.");
      }

      await createManagedAccount({
        username: newUser.username,
        password: newUser.password,
        displayName: newUser.displayName,
        role: newUser.role,
        createdBy: appUser,
        contactEmail: newUser.contactEmail,
      });

      setNotice(
        newUser.role === "admin"
          ? "تمت إضافة المسؤول الجديد بنجاح."
          : "تمت إضافة المستخدم بنجاح.",
      );
      setNewUser({
        displayName: "",
        username: "",
        password: "",
        confirmPassword: "",
        contactEmail: "",
        role: "admin",
      });

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إنشاء المستخدم. راجع اسم المستخدم وكلمة المرور والصلاحيات.",
      );
    } finally {
      setSavingUid(null);
    }
  }

  function startEditUser(user: AppUser) {
    setEditingUid(user.uid);
    setEditUser({
      displayName: user.displayName,
      contactEmail: user.contactEmail ?? "",
    });
    setError(null);
    setNotice(null);
  }

  async function handleSaveUser(uid: string) {
    setSavingUid(uid);
    setError(null);
    setNotice(null);

    try {
      await updateUserProfile(uid, editUser);
      setNotice("تم تحديث بيانات المستخدم بنجاح.");
      setEditingUid(null);
    } catch {
      setError("تعذر تحديث بيانات المستخدم. تأكد من الصلاحيات.");
    } finally {
      setSavingUid(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-learning-blue">Admin</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            المستخدمون والصلاحيات
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            إدارة أدوار Admin وTeacher وStudent وربطها بحماية المسارات وقواعد
            Firestore.
          </p>
        </div>

        <div className="surface flex w-full items-center gap-2 p-1 sm:w-auto">
          <button
            className={`btn-secondary flex-1 border-0 sm:flex-none ${
              filter === "all" ? "bg-slate-100 text-slate-950" : ""
            }`}
            type="button"
            onClick={() => setFilter("all")}
          >
            <Users size={16} aria-hidden="true" />
            الكل
          </button>
          {roles.map((role) => (
            <button
              key={role}
              className={`btn-secondary flex-1 border-0 sm:flex-none ${
                filter === role ? "bg-slate-100 text-slate-950" : ""
              }`}
              type="button"
              onClick={() => setFilter(role)}
            >
              {roleLabels[role]}
            </button>
          ))}
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="surface p-5">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">إضافة مستخدم</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            لإضافة مسؤول آخر اختر الدور Admin، ثم أدخل اسم المستخدم وكلمة المرور.
          </p>
        </div>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleCreateUser}>
          <label className="block space-y-2">
            <span className="form-label">الاسم الكامل</span>
            <input
              className="form-input"
              value={newUser.displayName}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="form-label">اسم المستخدم</span>
            <input
              className="form-input"
              value={newUser.username}
              placeholder="admin03"
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  username: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="form-label">كلمة المرور</span>
            <input
              className="form-input"
              type="password"
              value={newUser.password}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
              required
            />
          </label>
          <label className="block space-y-2">
            <span className="form-label">تأكيد كلمة المرور</span>
            <input
              className="form-input"
              type="password"
              value={newUser.confirmPassword}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              required
            />
            {passwordMismatch ? (
              <span className="text-xs font-bold text-red-600">
                كلمة المرور وتأكيدها غير متطابقين.
              </span>
            ) : null}
          </label>
          <label className="block space-y-2">
            <span className="form-label">الدور</span>
            <select
              className="form-input"
              value={newUser.role}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  role: event.target.value as UserRole,
                }))
              }
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="form-label">البريد للتواصل</span>
            <input
              className="form-input"
              type="email"
              value={newUser.contactEmail}
              onChange={(event) =>
                setNewUser((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }))
              }
            />
          </label>
          <div className="md:col-span-2">
            <button className="btn-primary" type="submit" disabled={savingUid === "new"}>
              <Plus size={18} aria-hidden="true" />
              إضافة المستخدم
            </button>
          </div>
        </form>
      </section>

      <section className="surface p-5">
        <div className="mb-5">
          <h2 className="text-lg font-black text-slate-950">تعديل بيانات مستخدم</h2>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            اختر مسؤولًا أو معلمًا أو طالبًا لتعديل الاسم والبريد الحقيقي.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block space-y-2">
            <span className="form-label">المستخدم</span>
            <select
              className="form-input"
              value={editingUid ?? ""}
              onChange={(event) => {
                const user = users.find((item) => item.uid === event.target.value);
                if (user) {
                  startEditUser(user);
                } else {
                  setEditingUid(null);
                }
              }}
            >
              <option value="">اختر مستخدمًا</option>
              {users.map((user) => (
                <option key={user.uid} value={user.uid}>
                  {user.displayName} - {user.username ? `@${user.username}` : user.email}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2">
            <span className="form-label">الاسم الكامل</span>
            <input
              className="form-input"
              value={editUser.displayName}
              disabled={!editingUid}
              onChange={(event) =>
                setEditUser((current) => ({
                  ...current,
                  displayName: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-2">
            <span className="form-label">البريد الحقيقي</span>
            <input
              className="form-input"
              type="email"
              value={editUser.contactEmail}
              disabled={!editingUid}
              onChange={(event) =>
                setEditUser((current) => ({
                  ...current,
                  contactEmail: event.target.value,
                }))
              }
            />
          </label>
          <div className="flex items-end gap-2 md:col-span-3">
            <button
              className="btn-primary"
              type="button"
              disabled={!editingUid || savingUid === editingUid}
              onClick={() => editingUid && handleSaveUser(editingUid)}
            >
              <Save size={18} aria-hidden="true" />
              حفظ التعديل
            </button>
            <button
              className="btn-secondary"
              type="button"
              disabled={!editingUid}
              onClick={() => setEditingUid(null)}
            >
              <X size={18} aria-hidden="true" />
              إلغاء
            </button>
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-lg font-black text-slate-950">قائمة المستخدمين</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredUsers.length} مستخدم ظاهر
            </p>
          </div>
          {loading ? (
            <RefreshCw className="animate-spin text-slate-400" size={20} />
          ) : (
            <ShieldCheck className="text-learning-blue" size={22} />
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">المستخدم</th>
                <th className="px-5 py-3">الدور الحالي</th>
                <th className="px-5 py-3">تغيير الدور</th>
                <th className="px-5 py-3">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.uid} className="bg-white">
                  <td className="px-5 py-4">
                    <div className="font-bold text-slate-950">
                      {user.displayName}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {user.username ? `@${user.username}` : user.email}
                    </div>
                    {user.contactEmail ? (
                      <div className="mt-1 text-xs text-slate-400">
                        {user.contactEmail}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-5 py-4">
                    <select
                      className="form-input max-w-44"
                      value={user.role}
                      disabled={savingUid === user.uid}
                      onChange={(event) =>
                        handleRoleChange(user.uid, event.target.value as UserRole)
                      }
                    >
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabels[role]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-5 py-4">
                    <button
                      className="btn-secondary"
                      type="button"
                      disabled={savingUid === user.uid}
                      onClick={() =>
                        handleDisabledChange(user.uid, !user.disabled)
                      }
                    >
                      {user.disabled ? (
                        <>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          تفعيل
                        </>
                      ) : (
                        <>
                          <Ban size={16} aria-hidden="true" />
                          إيقاف
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredUsers.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            لا توجد نتائج لهذا المرشح.
          </div>
        ) : null}
      </section>
    </div>
  );
}
