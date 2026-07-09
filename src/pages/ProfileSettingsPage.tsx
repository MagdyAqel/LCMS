import { FormEvent, useState } from "react";
import { Save } from "lucide-react";
import { updatePassword, updateProfile } from "firebase/auth";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import { updateUserProfile } from "../services/users";

export function ProfileSettingsPage() {
  const { appUser, firebaseUser } = useAuth();
  const [displayName, setDisplayName] = useState(appUser?.displayName ?? "");
  const [contactEmail, setContactEmail] = useState(appUser?.contactEmail ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const passwordMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !firebaseUser) {
      return;
    }

    setSaving(true);
    setNotice(null);
    setError(null);

    try {
      if (passwordMismatch) {
        throw new Error("كلمة المرور وتأكيدها غير متطابقين.");
      }

      await updateProfile(firebaseUser, { displayName });
      await updateUserProfile(appUser.uid, { displayName, contactEmail });

      if (appUser.role === "teacher") {
        await updateDoc(doc(db, "teachers", appUser.uid), {
          fullName: displayName,
          email: contactEmail,
          updatedAt: serverTimestamp(),
        });
      }

      if (password) {
        await updatePassword(firebaseUser, password);
      }

      setPassword("");
      setConfirmPassword("");
      setNotice("تم تحديث بياناتك بنجاح.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر تحديث البيانات. قد تحتاج إلى تسجيل الخروج والدخول مجددًا قبل تغيير كلمة المرور.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Profile</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">الملف الشخصي</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          تعديل بيانات الحساب وكلمة المرور.
        </p>
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

      <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="form-label">الاسم الكامل</span>
          <input
            className="form-input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2">
          <span className="form-label">البريد الحقيقي</span>
          <input
            className="form-input"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="form-label">كلمة مرور جديدة</span>
          <input
            className="form-input"
            type="password"
            value={password}
            minLength={6}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="block space-y-2">
          <span className="form-label">تأكيد كلمة المرور الجديدة</span>
          <input
            className="form-input"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {passwordMismatch ? (
            <span className="text-xs font-bold text-red-600">
              كلمة المرور وتأكيدها غير متطابقين.
            </span>
          ) : null}
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit" disabled={saving}>
            <Save size={18} />
            حفظ البيانات
          </button>
        </div>
      </form>
    </div>
  );
}
