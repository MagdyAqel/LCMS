import { BookOpen, FilePlus2, GraduationCap } from "lucide-react";
import { StatCard } from "../../components/StatCard";
import { useAuth } from "../../context/AuthContext";

export function TeacherDashboard() {
  const { appUser } = useAuth();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-green">Teacher</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          مساحة المعلم، {appUser?.displayName}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          هنا تبدأ إدارة المساقات والوحدات التعليمية ومتابعة الطلاب المسجلين.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="مساقاتي"
          value="0"
          helper="اربطها لاحقاً بمجموعة courses"
          icon={<BookOpen size={21} aria-hidden="true" />}
        />
        <StatCard
          label="المحتوى"
          value="Draft"
          helper="إعداد الدروس والملفات"
          icon={<FilePlus2 size={21} aria-hidden="true" />}
        />
        <StatCard
          label="الطلاب"
          value="Enroll"
          helper="متابعة تقدم المتعلمين"
          icon={<GraduationCap size={21} aria-hidden="true" />}
        />
      </section>

      <section className="surface p-5">
        <h2 className="text-lg font-black text-slate-950">مساقات المعلم</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          تم تجهيز الحماية والمسار الخاص بدور Teacher. الخطوة التالية هي ربط
          إنشاء المساقات والوحدات التعليمية حسب تفاصيل المواصفات عند توفرها.
        </p>
      </section>
    </div>
  );
}
