import {
  Activity,
  Award,
  BookOpen,
  ClipboardList,
  Printer,
  Users,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
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
  "lessons",
  "quizzes",
  "auditLogs",
];

const teacherCollections = [
  "students",
  "lessons",
  "lessonBlocks",
  "quizzes",
  "studentProgress",
];

function openPrintDocument(title: string, body: string) {
  const popup = window.open("", "_blank", "width=900,height=700");
  if (!popup) {
    window.print();
    return;
  }

  popup.document.write(`
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 32px; color: #0f172a; }
          .page { page-break-after: always; min-height: 88vh; border: 2px solid #1d4ed8; padding: 36px; }
          .center { text-align: center; }
          h1 { font-size: 36px; margin: 20px 0; }
          h2 { font-size: 22px; margin: 12px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; font-size: 13px; }
          th, td { border: 1px solid #cbd5e1; padding: 9px; text-align: right; }
          th { background: #eff6ff; }
          .muted { color: #64748b; }
          .signature { margin-top: 60px; display: flex; justify-content: space-between; gap: 24px; }
          .signature div { width: 44%; border-top: 1px solid #334155; padding-top: 10px; text-align: center; }
          @media print { button { display: none; } body { margin: 18px; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()" style="padding:10px 18px;margin-bottom:20px">طباعة</button>
        ${body}
      </body>
    </html>
  `);
  popup.document.close();
}

function getStudentIds(record: AppRecord) {
  const ids = [record.studentId, record.userId, record.id]
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

function calculateLessonProgress(
  student: AppRecord,
  lesson: AppRecord,
  blocks: AppRecord[],
  progress: AppRecord[],
) {
  const studentIds = getStudentIds(student);
  const lessonBlocks = blocks.filter((block) => block.lessonId === lesson.id);
  const lessonProgress = progress.filter(
    (item) =>
      studentIds.includes(String(item.studentId ?? "")) &&
      item.lessonId === lesson.id,
  );
  const viewedBlocks = new Set(
    lessonProgress.map((item) => String(item.blockId ?? "")).filter(Boolean),
  );
  const viewCount = lessonProgress.reduce(
    (sum, item) => sum + Number(item.viewCount ?? 0),
    0,
  );
  const totalBlocks = lessonBlocks.length || Number(lessonProgress[0]?.totalBlocks ?? 0);
  const percent = totalBlocks
    ? Math.round((viewedBlocks.size / totalBlocks) * 100)
    : 0;

  return {
    totalBlocks,
    viewedBlocks: viewedBlocks.size,
    viewCount,
    percent,
  };
}

export function ReportsPage({ role }: { role: UserRole }) {
  const { appUser } = useAuth();
  const [data, setData] = useState<Record<string, AppRecord[]>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const collections = role === "admin" ? adminCollections : teacherCollections;
    const unsubs: Unsubscribe[] = [];

    for (const collectionName of collections) {
      let scoped = query(collection(db, collectionName));

      if (role === "teacher") {
        if (collectionName === "students") {
          scoped = query(
            collection(db, collectionName),
            where("teacherIds", "array-contains", appUser.uid),
          );
        } else {
          scoped = query(
            collection(db, collectionName),
            where("teacherId", "==", appUser.uid),
          );
        }
      }

      unsubs.push(
        onSnapshot(
          scoped,
          (snapshot) => {
            setData((current) => ({
              ...current,
              [collectionName]: snapshot.docs.map((item) => ({
                id: item.id,
                ...item.data(),
              })),
            }));
          },
          () => undefined,
        ),
      );
    }

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [appUser, role]);

  const stats = useMemo(() => {
    if (role === "admin") {
      return [
        { label: "المعلمون", value: data.teachers?.length ?? 0, icon: <Users size={21} /> },
        { label: "الطلاب", value: data.students?.length ?? 0, icon: <Users size={21} /> },
        { label: "المناهج", value: data.curriculums?.length ?? 0, icon: <BookOpen size={21} /> },
        { label: "الدروس", value: data.lessons?.length ?? 0, icon: <ClipboardList size={21} /> },
      ];
    }

    return [
      { label: "طلابي", value: data.students?.length ?? 0, icon: <Users size={21} /> },
      { label: "الدروس", value: data.lessons?.length ?? 0, icon: <ClipboardList size={21} /> },
      { label: "العناصر", value: data.lessonBlocks?.length ?? 0, icon: <BookOpen size={21} /> },
      { label: "التفاعل", value: data.studentProgress?.length ?? 0, icon: <Activity size={21} /> },
    ];
  }, [data, role]);

  const students = data.students ?? [];
  const lessons = data.lessons ?? [];
  const blocks = data.lessonBlocks ?? [];
  const progress = data.studentProgress ?? [];
  const selectedStudents = students.filter((student) =>
    selectedStudentIds.includes(student.id),
  );
  const reportStudents = selectedStudents.length ? selectedStudents : students;

  function toggleStudent(id: string) {
    setSelectedStudentIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  function averageProgress(student: AppRecord) {
    if (!lessons.length) {
      return 0;
    }

    const total = lessons.reduce(
      (sum, lesson) =>
        sum + calculateLessonProgress(student, lesson, blocks, progress).percent,
      0,
    );
    return Math.round(total / lessons.length);
  }

  function printCertificates() {
    const rows = reportStudents
      .map((student) => {
        const percent = averageProgress(student);
        return `
          <section class="page center">
            <p class="muted">نظام إدارة المحتوى التعليمي LCMS</p>
            <h1>شهادة نجاح</h1>
            <p>تشهد إدارة النظام بأن الطالب/ة</p>
            <h2>${formatCellValue(student.fullName)}</h2>
            <p>قد أتم/ت الأنشطة التعليمية المخصصة بنسبة تقدم ${percent}%.</p>
            <p class="muted">الصف: ${formatCellValue(student.gradeId)} - المنهاج: ${formatCellValue(student.curriculumSubject)}</p>
            <div class="signature">
              <div>توقيع المعلم: ${formatCellValue(appUser?.displayName)}</div>
              <div>التاريخ: ${new Date().toLocaleDateString("ar")}</div>
            </div>
          </section>
        `;
      })
      .join("");

    openPrintDocument("شهادات نجاح", rows);
  }

  function printInteractionReport() {
    const rows = reportStudents
      .map((student) => {
        const lessonRows = lessons
          .map((lesson) => {
            const metrics = calculateLessonProgress(student, lesson, blocks, progress);
            return `
              <tr>
                <td>${formatCellValue(student.fullName)}</td>
                <td>${formatCellValue(lesson.title)}</td>
                <td>${formatCellValue(lesson.subject)}</td>
                <td>${metrics.viewedBlocks}/${metrics.totalBlocks}</td>
                <td>${metrics.viewCount}</td>
                <td>${metrics.percent}%</td>
              </tr>
            `;
          })
          .join("");

        return lessonRows;
      })
      .join("");

    openPrintDocument(
      "كشف تفاعل الطالب",
      `
        <section>
          <h1 class="center">كشف تفاعل الطالب</h1>
          <p class="center muted">يوضح نسبة تقدم الطالب في كل درس وعدد مرات مشاهدة عناصر الدرس.</p>
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>الدرس</th>
                <th>المنهاج</th>
                <th>العناصر المشاهدة</th>
                <th>عدد المشاهدات</th>
                <th>نسبة التقدم</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="signature">
            <div>توقيع المعلم: ${formatCellValue(appUser?.displayName)}</div>
            <div>التاريخ: ${new Date().toLocaleDateString("ar")}</div>
          </div>
        </section>
      `,
    );
  }

  if (role === "admin") {
    const recentLogs = data.auditLogs?.slice(0, 8) ?? [];

    return (
      <ReportShell role={role} title="التقارير العامة">
        <StatsGrid stats={stats} />
        <section className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">آخر العمليات</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {recentLogs.map((item) => (
              <div key={item.id} className="px-5 py-4">
                <p className="text-sm font-bold text-slate-900">
                  {formatCellValue(item.actionType ?? "سجل")}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {formatCellValue(item.description ?? item.status)}
                </p>
              </div>
            ))}
            {!recentLogs.length ? <EmptyLine /> : null}
          </div>
        </section>
      </ReportShell>
    );
  }

  return (
    <ReportShell role={role} title="تقارير المعلم">
      <StatsGrid stats={stats} />

      <section className="surface p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">طباعة التقارير</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              اختر طالبًا واحدًا أو عدة طلاب، ثم اطبع شهادة نجاح أو كشف تفاعل.
              عند عدم الاختيار ستتم الطباعة لكل الطلاب الظاهرين.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" type="button" onClick={printCertificates}>
              <Award size={18} aria-hidden="true" />
              طباعة شهادات نجاح
            </button>
            <button className="btn-primary" type="button" onClick={printInteractionReport}>
              <Printer size={18} aria-hidden="true" />
              طباعة كشف التفاعل
            </button>
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-black text-slate-950">طلاب المعلم</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                <th className="px-5 py-3">اختيار</th>
                <th className="px-5 py-3">الطالب</th>
                <th className="px-5 py-3">الصف</th>
                <th className="px-5 py-3">المنهاج</th>
                <th className="px-5 py-3">نسبة التقدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student) => (
                <tr key={student.id} className="bg-white">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => toggleStudent(student.id)}
                    />
                  </td>
                  <td className="px-5 py-4 font-bold text-slate-950">
                    {formatCellValue(student.fullName)}
                  </td>
                  <td className="px-5 py-4">{formatCellValue(student.gradeId)}</td>
                  <td className="px-5 py-4">
                    {formatCellValue(student.curriculumSubject)}
                  </td>
                  <td className="px-5 py-4">{averageProgress(student)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!students.length ? <EmptyLine /> : null}
      </section>
    </ReportShell>
  );
}

function ReportShell({
  role,
  title,
  children,
}: {
  role: UserRole;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">
          {role === "admin" ? "Admin" : "Teacher"}
        </p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          تقارير قابلة للطباعة ومؤشرات مباشرة من قاعدة البيانات.
        </p>
      </section>
      {children}
    </div>
  );
}

function StatsGrid({
  stats,
}: {
  stats: Array<{ label: string; value: number; icon: React.ReactNode }>;
}) {
  return (
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
  );
}

function EmptyLine() {
  return (
    <div className="px-5 py-8 text-center text-sm text-slate-500">
      لا توجد بيانات بعد.
    </div>
  );
}
