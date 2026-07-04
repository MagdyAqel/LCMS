import { MailCheck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { AuthShell } from "./AuthShell";

export function ForgotPassword() {
  const { resetPassword, error, clearError } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => clearError, [clearError]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setSent(false);

    try {
      await resetPassword(email);
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="استعادة كلمة المرور"
      subtitle="سنرسل رابط إعادة تعيين كلمة المرور إلى بريدك المسجل."
    >
      <form className="space-y-4" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}

        {sent ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
            تم إرسال رابط الاستعادة إن كان البريد مسجلاً.
          </div>
        ) : null}

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

        <button className="btn-primary w-full" type="submit" disabled={submitting}>
          <MailCheck size={18} aria-hidden="true" />
          {submitting ? "جاري الإرسال" : "إرسال الرابط"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm">
        <Link className="font-semibold text-learning-blue" to="/login">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </AuthShell>
  );
}
