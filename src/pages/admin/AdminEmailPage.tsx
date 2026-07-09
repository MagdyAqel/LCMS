import { FormEvent, useEffect, useMemo, useState } from "react";
import { Mail } from "lucide-react";
import { subscribeToUsers } from "../../services/users";
import type { AppUser } from "../../types";

export function AdminEmailPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [target, setTarget] = useState("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return subscribeToUsers(setUsers, () =>
      setError("تعذر تحميل المعلمين. تأكد من الصلاحيات."),
    );
  }, []);

  const teachers = useMemo(
    () =>
      users.filter(
        (user) => user.role === "teacher" && (user.contactEmail || user.email),
      ),
    [users],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const recipients =
      target === "all"
        ? teachers
        : teachers.filter((teacher) => teacher.uid === target);
    const emails = recipients
      .map((teacher) => teacher.contactEmail || teacher.email)
      .filter(Boolean);

    if (!emails.length) {
      setError("لا يوجد بريد حقيقي للمعلم المحدد.");
      return;
    }

    const mailto = `mailto:${emails.join(",")}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Admin</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          إرسال بريد للمعلمين
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          إرسال رسالة إلى معلم واحد أو جميع المعلمين عبر البريد الحقيقي المسجل.
        </p>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="form-label">المستلم</span>
          <select
            className="form-input"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="all">جميع المعلمين</option>
            {teachers.map((teacher) => (
              <option key={teacher.uid} value={teacher.uid}>
                {teacher.displayName} - {teacher.contactEmail || teacher.email}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2">
          <span className="form-label">الموضوع</span>
          <input
            className="form-input"
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            required
          />
        </label>
        <label className="block space-y-2 md:col-span-2">
          <span className="form-label">نص الرسالة</span>
          <textarea
            className="form-input min-h-40 resize-y"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
          />
        </label>
        <div className="md:col-span-2">
          <button className="btn-primary" type="submit">
            <Mail size={18} />
            فتح البريد للإرسال
          </button>
        </div>
      </form>
    </div>
  );
}
