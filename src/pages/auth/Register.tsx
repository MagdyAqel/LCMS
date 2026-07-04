import { UserPlus } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "./AuthShell";

export function Register() {
  const { firebaseUser, appUser, register, error, clearError } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => clearError, [clearError]);

  if (firebaseUser && appUser) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await register(displayName, email, password);
      navigate("/dashboard", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="إنشاء حساب طالب"
      subtitle="الحسابات الجديدة تبدأ بدور Student. يستطيع المدير ترقية الدور لاحقاً من لوحة المستخدمين."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="form-label">الاسم الكامل</span>
          <input
            className="form-input"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="form-label">البريد الإلكتروني</span>
          <input
            className="form-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="form-label">كلمة المرور</span>
          <input
            className="form-input"
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          <UserPlus size={18} aria-hidden="true" />
          {submitting ? "جاري الإنشاء" : "إنشاء الحساب"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500">
        لديك حساب؟{" "}
        <Link className="font-semibold text-learning-blue" to="/login">
          سجّل الدخول
        </Link>
      </p>
    </AuthShell>
  );
}
