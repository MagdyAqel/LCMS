import { LogIn } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "./AuthShell";

export function Login() {
  const { appUser, login, error, clearError } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname;

  useEffect(() => clearError, [clearError]);

  if (appUser) {
    return <Navigate to={from ?? "/dashboard"} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);

    try {
      await login(identifier, password);
      navigate(from ?? "/dashboard", { replace: true });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="تسجيل الدخول"
      subtitle="ادخل إلى مساحة التعلم حسب صلاحيتك: مدير، معلم، أو طالب."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        <label className="block space-y-2">
          <span className="form-label">اسم المستخدم</span>
          <input
            className="form-input"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            required
          />
        </label>

        <label className="block space-y-2">
          <span className="form-label">كلمة المرور</span>
          <input
            className="form-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          <LogIn size={18} aria-hidden="true" />
          {submitting ? "جاري الدخول" : "دخول"}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link className="font-semibold text-learning-blue" to="/forgot-password">
          نسيت كلمة المرور؟
        </Link>
      </div>
    </AuthShell>
  );
}
