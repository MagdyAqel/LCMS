import { Activity, BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { db } from "../lib/firebase";
import type { AppRecord } from "../services/records";
import type { UserRole } from "../types";
import { formatCellValue } from "../utils/format";

const adminCollections = [
  "teachers",
  "students",
  "curriculums",
  "teacherCourses",
  "lessons",
  "quizzes",
  "auditLogs",
];

const teacherCollections = [
  "students",
  "teacherCourses",
  "lessons",
  "quizzes",
  "messages",
  "quizAttempts",
];

export function ReportsPage({ role }: { role: UserRole }) {
  const { appUser } = useAuth();
  const [data, setData] = useState<Record<string, AppRecord[]>>({});

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const collections = role === "admin" ? adminCollections : teacherCollections;
    const unsubs: Unsubscribe[] = [];

    for (const collectionName of collections) {
      const scoped =
        role === "teacher" &&
        !["messages", "quizAttempts"].includes(collectionName)
          ? query(collection(db, collectionName), where("teacherId", "==", appUser.uid))
          : query(collection(db, collectionName));

      unsubs.push(
        onSnapshot(scoped, (snapshot) => {
          setData((current) => ({
            ...current,
            [collectionName]: snapshot.docs.map((item) => ({
              id: item.id,
              ...item.data(),
            })),
          }));
        }),
      );
    }

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [appUser, role]);

  const stats = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "المعلمون", value: data.teachers?.length ?? 0, icon: <Users size={21} /> },
        { label: "الطلاب", value: data.students?.length ?? 0, icon: <GraduationCap size={21} /> },
        { label: "المناهج", value: data.curriculums?.length ?? 0, icon: <BookOpen size={21} /> },
        { label: "الدروس", value: data.lessons?.length ?? 0, icon: <ClipboardList size={21} /> },
      ];
    }

    return [
      { label: "طلابي", value: data.students?.length ?? 0, icon: <Users size={21} /> },
      { label: "مناهجي", value: data.teacherCourses?.length ?? 0, icon: <BookOpen size={21} /> },
      { label: "الدروس", value: data.lessons?.length ?? 0, icon: <ClipboardList size={21} /> },
      { label: "الاختبارات", value: data.quizzes?.length ?? 0, icon: <Activity size={21} /> },
    ];
  }, [data, role]);

  const recentLogs =
    role === "admin"
      ? data.auditLogs?.slice(0, 8) ?? []
      : data.messages?.slice(0, 8) ?? [];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">
          {role === "admin" ? "Admin" : "Teacher"}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">
          {role === "admin" ? "التقارير العامة" : "تقارير المعلم"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          مؤشرات سريعة حسب ما طلبته المواصفات، مع مساحة قابلة للتوسع لرسوم
          تفصيلية لاحقاً.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={String(stat.value)}
            helper="قراءة مباشرة من Firestore"
            icon={stat.icon}
          />
        ))}
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">
            {role === "admin" ? "آخر العمليات" : "آخر الرسائل"}
          </h2>
        </div>
        <div className="divide-y divide-slate-100">
          {recentLogs.map((item) => (
            <div key={item.id} className="px-5 py-4">
              <p className="text-sm font-bold text-slate-900">
                {formatCellValue(item.actionType ?? item.subject ?? "سجل")}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {formatCellValue(item.description ?? item.message ?? item.status)}
              </p>
            </div>
          ))}
          {recentLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-500">
              لا توجد بيانات بعد.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
