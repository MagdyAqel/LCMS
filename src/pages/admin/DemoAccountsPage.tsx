import { KeyRound, RefreshCw, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { demoAccounts } from "../../data/demoAccounts";
import { seedDemoAccounts, type SeedResult } from "../../services/demoSeeder";

const roleLabels = {
  admin: "Admin",
  teacher: "Teacher",
  student: "Student",
};

export function DemoAccountsPage() {
  const { appUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<SeedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      admins: demoAccounts.filter((account) => account.role === "admin").length,
      teachers: demoAccounts.filter((account) => account.role === "teacher").length,
      students: demoAccounts.filter((account) => account.role === "student").length,
    }),
    [],
  );

  async function handleSeed() {
    if (!appUser) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      setResults(await seedDemoAccounts(appUser));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر إنشاء الحسابات الوهمية.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-learning-blue">Admin</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            الحسابات الوهمية
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            هذه الحسابات تستخدم اسم المستخدم وكلمة المرور. يمكن إنشاؤها في Firebase
            من هذه الصفحة بعد الدخول كمسؤول.
          </p>
        </div>

        <button className="btn-primary" type="button" onClick={handleSeed} disabled={saving}>
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <KeyRound size={18} />}
          إنشاء الحسابات في Firebase
        </button>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {results.length ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          تم إنشاء أو تأكيد {results.length} حساب.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="surface p-5">
          <UsersRound className="text-learning-blue" size={22} />
          <p className="mt-3 text-sm text-slate-500">مسؤولون</p>
          <p className="text-2xl font-black text-slate-950">{counts.admins}</p>
        </div>
        <div className="surface p-5">
          <UsersRound className="text-learning-blue" size={22} />
          <p className="mt-3 text-sm text-slate-500">معلمون</p>
          <p className="text-2xl font-black text-slate-950">{counts.teachers}</p>
        </div>
        <div className="surface p-5">
          <UsersRound className="text-learning-blue" size={22} />
          <p className="mt-3 text-sm text-slate-500">طلاب</p>
          <p className="text-2xl font-black text-slate-950">{counts.students}</p>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">الدور</th>
                <th className="px-5 py-3">الاسم</th>
                <th className="px-5 py-3">اسم المستخدم</th>
                <th className="px-5 py-3">كلمة المرور</th>
                <th className="px-5 py-3">بريد التواصل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {demoAccounts.map((account) => (
                <tr key={account.username} className="bg-white">
                  <td className="px-5 py-4 font-bold">{roleLabels[account.role]}</td>
                  <td className="px-5 py-4">{account.displayName}</td>
                  <td className="px-5 py-4 font-mono text-learning-blue">{account.username}</td>
                  <td className="px-5 py-4 font-mono">{account.password}</td>
                  <td className="px-5 py-4">{account.contactEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
