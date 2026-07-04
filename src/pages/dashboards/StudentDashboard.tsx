import { BookMarked, CheckCircle2, Clock3 } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";

export function StudentDashboard() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Student</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          أهلاً بك، {appUser?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          تابع مساقاتك، تقدمك، والمهام التعليمية من لوحة واحدة.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="المساقات"
          value="0"
          helper="سيتم عرض المساقات المسجلة هنا"
          icon={<BookMarked size={21} aria-hidden="true" />}
        />
        <StatCard
          label="التقدم"
          value="0%"
          helper="متوسط إكمال المحتوى"
          icon={<CheckCircle2 size={21} aria-hidden="true" />}
        />
        <StatCard
          label="المهام"
          value="--"
          helper="المواعيد القادمة"
          icon={<Clock3 size={21} aria-hidden="true" />}
        />
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-black text-slate-950">مساقاتي</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          تم تجهيز الحماية والمسار الخاص بدور Student. بعد إضافة نموذج المساقات
          ستظهر هنا المواد المسجل فيها الطالب.
        </p>
      </section>
    </div>
  );
}
