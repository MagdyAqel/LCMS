import { BookOpen, Download, ShieldCheck, Upload, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";
import {
  downloadJson,
  exportBackup,
  importBackup,
  type BackupPayload,
} from "../../services/backup";

export function AdminDashboard() {
  const { appUser } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExportBackup() {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const payload = await exportBackup();
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`lcms-backup-${date}.json`, payload);
      setNotice("تم تصدير النسخة الاحتياطية بنجاح.");
    } catch {
      setError("تعذر تصدير النسخة الاحتياطية. تأكد من صلاحيات حساب المسؤول.");
    } finally {
      setBusy(false);
    }
  }

  async function handleImportBackup(file: File | null) {
    if (!file) {
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const text = await file.text();
      await importBackup(JSON.parse(text) as BackupPayload);
      setNotice("تم استيراد النسخة الاحتياطية بنجاح.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر استيراد النسخة الاحتياطية.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          أهلاً، {appUser?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          تستطيع إدارة المستخدمين، مراجعة المساقات، وضبط الصلاحيات الأساسية
          للنظام.
        </p>
      </section>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="المستخدمون"
          value="Roles"
          helper="إسناد Admin وTeacher وStudent"
          icon={<Users size={21} aria-hidden="true" />}
        />
        <StatCard
          label="المساقات"
          value="Courses"
          helper="إدارة المحتوى والمنشورات التعليمية"
          icon={<BookOpen size={21} aria-hidden="true" />}
        />
        <StatCard
          label="الصلاحيات"
          value="Rules"
          helper="حماية Firestore حسب الدور"
          icon={<ShieldCheck size={21} aria-hidden="true" />}
        />
      </section>

      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              النسخ الاحتياطي والاستيراد
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              تصدير واستيراد بيانات Firestore الخاصة بالنظام. حسابات Firebase Auth
              تُدار من صفحة المستخدمين ولا تُصدّر كلمات مرورها.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              type="button"
              onClick={handleExportBackup}
              disabled={busy}
            >
              <Download size={18} aria-hidden="true" />
              تصدير نسخة احتياطية
            </button>
            <label className="btn-primary cursor-pointer">
              <Upload size={18} aria-hidden="true" />
              استيراد نسخة
              <input
                className="hidden"
                type="file"
                accept="application/json,.json"
                onChange={(event) =>
                  handleImportBackup(event.target.files?.[0] ?? null)
                }
              />
            </label>
          </div>
        </div>
      </section>

      <section className="surface p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              إدارة المستخدمين
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              غيّر دور المستخدم أو أوقف وصوله من مكان واحد.
            </p>
          </div>
          <Link className="btn-primary" to="/admin/users">
            <Users size={18} aria-hidden="true" />
            فتح المستخدمين
          </Link>
        </div>
      </section>
    </div>
  );
}
