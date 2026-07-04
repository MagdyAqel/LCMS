import { BookOpen, CheckCircle2, Lock, Mail, Send, ShieldAlert } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { createRecord, type AppRecord } from "../../services/records";
import { formatCellValue } from "../../utils/format";

function useQueryParam(name: string) {
  const location = useLocation();
  return new URLSearchParams(location.search).get(name);
}

function useStudentCollection(
  collectionName: string,
  field: string,
  value: string | null | undefined,
) {
  const [records, setRecords] = useState<AppRecord[]>([]);

  useEffect(() => {
    if (!value) {
      setRecords([]);
      return;
    }

    const unsubscribe = onSnapshot(
      query(collection(db, collectionName), where(field, "==", value)),
      (snapshot) => {
        setRecords(
          snapshot.docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })),
        );
      },
    );

    return unsubscribe;
  }, [collectionName, field, value]);

  return records;
}

export function StudentLearningPage({ view }: { view: string }) {
  const { appUser } = useAuth();
  const courseId = useQueryParam("courseId");
  const lessonId = useQueryParam("lessonId");
  const quizId = useQueryParam("quizId");
  const [courses, setCourses] = useState<AppRecord[]>([]);
  const [notifications, setNotifications] = useState<AppRecord[]>([]);
  const [messages, setMessages] = useState<AppRecord[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const unsubs: Unsubscribe[] = [
      onSnapshot(
        query(collection(db, "teacherCourses"), where("studentIds", "array-contains", appUser.uid)),
        (snapshot) => {
          setCourses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
      ),
      onSnapshot(
        query(collection(db, "notifications"), where("targetType", "==", "allStudents")),
        (snapshot) => {
          setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
      ),
      onSnapshot(
        query(collection(db, "messages"), where("senderId", "==", appUser.uid)),
        (snapshot) => {
          setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
      ),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [appUser]);

  const selectedCourse = courses.find((course) => course.id === courseId);
  const lessons = useStudentCollection("lessons", "courseId", courseId);
  const lessonBlocks = useStudentCollection("lessonBlocks", "lessonId", lessonId);
  const quizzes = useStudentCollection("quizzes", "lessonId", lessonId);
  const attempts = useStudentCollection("quizAttempts", "studentId", appUser?.uid);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === quizId) ?? quizzes[0];

  const unlockedLessons = useMemo<Array<AppRecord & { locked: boolean }>>(() => {
    const freeMode = selectedCourse?.learningMode === "free";
    return lessons
      .slice()
      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
      .map((lesson, index) => ({
        ...lesson,
        locked: !freeMode && index > 0,
      }));
  }, [lessons, selectedCourse]);

  async function handleSendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser) {
      return;
    }

    await createRecord(
      "messages",
      {
        senderId: appUser.uid,
        receiverId,
        subject,
        message,
        status: "new",
        courseId: courseId ?? "",
        lessonId: lessonId ?? "",
      },
      appUser,
    );

    setSubject("");
    setMessage("");
    setReceiverId("");
    setNotice("تم إرسال الرسالة.");
  }

  async function submitQuizAttempt() {
    if (!appUser || !selectedQuiz) {
      return;
    }

    const passingScore = Number(selectedQuiz.passingScore ?? 70);

    await createRecord(
      "quizAttempts",
      {
        quizId: selectedQuiz.id,
        lessonId: selectedQuiz.lessonId ?? "",
        courseId: selectedQuiz.courseId ?? courseId ?? "",
        teacherId: selectedQuiz.teacherId ?? "",
        studentId: appUser.uid,
        score: passingScore,
        percentage: passingScore,
        passed: true,
        attemptNumber: attempts.filter((item) => item.quizId === selectedQuiz.id).length + 1,
      },
      appUser,
    );

    setNotice("تم تسجيل محاولة الاختبار بنجاح.");
  }

  if (view === "profile") {
    return (
      <StudentShell title="الملف الشخصي" subtitle="بيانات الحساب والهوية التعليمية.">
        <div className="surface p-5">
          <p className="text-lg font-black text-slate-950">{appUser?.displayName}</p>
          <p className="mt-1 text-sm text-slate-500">{appUser?.email}</p>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            الدور: Student
          </p>
        </div>
      </StudentShell>
    );
  }

  if (view === "notifications") {
    return (
      <StudentShell title="تنبيهات الطالب" subtitle="التنبيهات الفعالة الموجهة للطلاب.">
        <RecordList records={notifications} empty="لا توجد تنبيهات حالياً." />
      </StudentShell>
    );
  }

  if (view === "messages") {
    return (
      <StudentShell title="رسائل الطالب" subtitle="إرسال رسالة للمعلم وقراءة الرسائل السابقة.">
        {notice ? <Notice text={notice} /> : null}
        <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSendMessage}>
          <label className="block space-y-2">
            <span className="form-label">معرّف المعلم المستلم</span>
            <input className="form-input" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} required />
          </label>
          <label className="block space-y-2">
            <span className="form-label">الموضوع</span>
            <input className="form-input" value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="form-label">الرسالة</span>
            <textarea className="form-input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <button className="btn-primary md:col-span-2" type="submit">
            <Send size={18} />
            إرسال
          </button>
        </form>
        <RecordList records={messages} empty="لا توجد رسائل مرسلة." />
      </StudentShell>
    );
  }

  if (view === "lesson") {
    return (
      <StudentShell title="عرض الدرس" subtitle="عناصر الدرس تظهر حسب ترتيب المعلم.">
        {notice ? <Notice text={notice} /> : null}
        <div className="space-y-3">
          {lessonBlocks
            .slice()
            .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
            .map((block) => (
              <article key={block.id} className="surface p-5">
                <p className="text-xs font-bold text-learning-blue">{formatCellValue(block.type)}</p>
                <h2 className="mt-2 text-lg font-black text-slate-950">{formatCellValue(block.title)}</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{formatCellValue(block.content)}</p>
                {block.url ? (
                  <a className="mt-3 inline-flex text-sm font-bold text-learning-blue" href={String(block.url)} target="_blank">
                    فتح الرابط
                  </a>
                ) : null}
              </article>
            ))}
        </div>
        {quizzes.length ? (
          <Link className="btn-primary mt-4" to={`/student/quiz?lessonId=${lessonId}&quizId=${quizzes[0].id}&courseId=${courseId ?? ""}`}>
            فتح الاختبار
          </Link>
        ) : null}
      </StudentShell>
    );
  }

  if (view === "quiz") {
    return (
      <StudentShell title="تقديم الاختبار" subtitle="يعرض إعدادات الاختبار ويحفظ محاولة الطالب.">
        {notice ? <Notice text={notice} /> : null}
        {selectedQuiz ? (
          <section className="surface p-5">
            <h2 className="text-xl font-black text-slate-950">{formatCellValue(selectedQuiz.title)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{formatCellValue(selectedQuiz.description)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="درجة النجاح" value={formatCellValue(selectedQuiz.passingScore)} />
              <MiniMetric label="المحاولات" value={formatCellValue(selectedQuiz.attemptsAllowed)} />
              <MiniMetric label="مفعل" value={formatCellValue(selectedQuiz.isActive)} />
            </div>
            <button className="btn-primary mt-5" type="button" onClick={submitQuizAttempt}>
              <CheckCircle2 size={18} />
              تسجيل محاولة
            </button>
          </section>
        ) : (
          <EmptyState text="لا يوجد اختبار لهذا الدرس." />
        )}
      </StudentShell>
    );
  }

  if (view === "result") {
    return (
      <StudentShell title="نتائج الاختبارات" subtitle="درجات ومحاولات الطالب.">
        <RecordList records={attempts} empty="لا توجد نتائج بعد." />
      </StudentShell>
    );
  }

  if (view === "course-detail") {
    return (
      <StudentShell title={formatCellValue(selectedCourse?.title ?? "تفاصيل المنهاج")} subtitle="الدروس المتاحة والمقفلة حسب نمط التعلم.">
        <div className="space-y-3">
          {unlockedLessons.map((lesson) => (
            <article key={lesson.id} className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black text-slate-950">{formatCellValue(lesson["title"])}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {lesson.locked ? "هذا الدرس مقفل حتى تنجح في الدرس السابق." : "الدرس متاح الآن."}
                </p>
              </div>
              {lesson.locked ? (
                <span className="inline-flex items-center gap-2 text-sm font-bold text-amber-700">
                  <Lock size={16} />
                  مقفل
                </span>
              ) : (
                <Link className="btn-primary" to={`/student/lesson?courseId=${courseId}&lessonId=${lesson.id}`}>
                  فتح الدرس
                </Link>
              )}
            </article>
          ))}
        </div>
      </StudentShell>
    );
  }

  return (
    <StudentShell title="المناهج المتاحة" subtitle="المناهج الفعالة المرتبطة بحساب الطالب.">
      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <article key={course.id} className="surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-learning-blue">{formatCellValue(course.learningMode)}</p>
                <h2 className="mt-2 text-xl font-black text-slate-950">{formatCellValue(course.title)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">{formatCellValue(course.description)}</p>
              </div>
              <BookOpen className="text-learning-blue" size={26} />
            </div>
            <Link className="btn-primary mt-5" to={`/student/course-detail?courseId=${course.id}`}>
              دخول المنهاج
            </Link>
          </article>
        ))}
      </div>
      {!courses.length ? <EmptyState text="لا توجد مناهج متاحة لهذا الحساب بعد." /> : null}
    </StudentShell>
  );
}

function StudentShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Student</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {subtitle}
        </p>
      </section>
      {children}
    </div>
  );
}

function RecordList({ records, empty }: { records: AppRecord[]; empty: string }) {
  if (!records.length) {
    return <EmptyState text={empty} />;
  }

  return (
    <div className="space-y-3">
      {records.map((record) => (
        <article key={record.id} className="surface p-5">
          <div className="flex items-start gap-3">
            <Mail className="mt-1 text-learning-blue" size={20} />
            <div>
              <h2 className="text-base font-black text-slate-950">
                {formatCellValue(record.title ?? record.subject ?? record.actionType ?? record.id)}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {formatCellValue(record.message ?? record.reply ?? record.description ?? record.status)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <section className="surface grid min-h-48 place-items-center p-8 text-center">
      <div>
        <ShieldAlert className="mx-auto text-slate-400" size={28} />
        <p className="mt-3 text-sm font-semibold text-slate-500">{text}</p>
      </div>
    </section>
  );
}

function Notice({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
      {text}
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}
