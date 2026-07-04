import {
  BookOpen,
  CheckCircle2,
  Link as LinkIcon,
  Mail,
  Send,
  ShieldAlert,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { collection, onSnapshot, query, where, type Unsubscribe } from "firebase/firestore";
import { getSubjectsForGrade, gradeOptions, requiresTrack } from "../../data/curriculumCatalog";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import { createRecord, type AppRecord } from "../../services/records";
import { formatCellValue } from "../../utils/format";

function useQueryParam(name: string) {
  const location = useLocation();
  return new URLSearchParams(location.search).get(name);
}

function useCollectionByField(
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
        setRecords(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
      },
      () => setRecords([]),
    );

    return unsubscribe;
  }, [collectionName, field, value]);

  return records;
}

function useLessonsForTeachers(teacherIds: string[]) {
  const [records, setRecords] = useState<AppRecord[]>([]);

  useEffect(() => {
    if (!teacherIds.length) {
      setRecords([]);
      return;
    }

    const lessonsById = new Map<string, AppRecord>();
    const unsubs = teacherIds.map((teacherId) =>
      onSnapshot(
        query(collection(db, "lessons"), where("teacherId", "==", teacherId)),
        (snapshot) => {
          for (const item of snapshot.docs) {
            lessonsById.set(item.id, { id: item.id, ...item.data() });
          }
          setRecords(Array.from(lessonsById.values()));
        },
        () => undefined,
      ),
    );

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [teacherIds]);

  return records;
}

function getRecordStringArray(record: AppRecord | null, key: string) {
  const value = record?.[key];
  return Array.isArray(value)
    ? value.map((item) => String(item ?? "").trim()).filter(Boolean)
    : [];
}

export function StudentLearningPage({ view }: { view: string }) {
  const { appUser } = useAuth();
  const lessonId = useQueryParam("lessonId");
  const quizId = useQueryParam("quizId");
  const [studentProfile, setStudentProfile] = useState<AppRecord | null>(null);
  const [notifications, setNotifications] = useState<AppRecord[]>([]);
  const [messages, setMessages] = useState<AppRecord[]>([]);
  const [activeSubject, setActiveSubject] = useState("");
  const [activeLessonId, setActiveLessonId] = useState("");
  const [messageSubject, setMessageSubject] = useState("");
  const [message, setMessage] = useState("");
  const [receiverId, setReceiverId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const gradeId = String(studentProfile?.gradeId ?? "");
  const track = String(studentProfile?.track ?? "");
  const showTrack = requiresTrack(gradeId);
  const assignedTeacherIds = useMemo(() => {
    const ids = [
      ...getRecordStringArray(studentProfile, "teacherIds"),
      studentProfile?.teacherId,
    ];
    return Array.from(new Set(ids.map((id) => String(id ?? "").trim()).filter(Boolean)));
  }, [studentProfile]);
  const assignedSubjects = useMemo(() => {
    const subjects = [
      ...getRecordStringArray(studentProfile, "curriculumSubjects"),
      studentProfile?.curriculumSubject,
    ];
    return Array.from(
      new Set(subjects.map((subject) => String(subject ?? "").trim()).filter(Boolean)),
    );
  }, [studentProfile]);
  const availableSubjects = useMemo(() => {
    const gradeSubjects = getSubjectsForGrade(gradeId, showTrack ? track : "");
    return assignedSubjects.filter((subject) => gradeSubjects.includes(subject));
  }, [assignedSubjects, gradeId, showTrack, track]);
  const selectedSubject = activeSubject || availableSubjects[0] || "";
  const lessons = useLessonsForTeachers(assignedTeacherIds);
  const attempts = useCollectionByField("quizAttempts", "studentId", appUser?.uid);

  useEffect(() => {
    if (!availableSubjects.length) {
      setActiveSubject("");
      return;
    }

    if (!availableSubjects.includes(selectedSubject)) {
      setActiveSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const unsubs: Unsubscribe[] = [
      onSnapshot(
        query(collection(db, "students"), where("studentId", "==", appUser.uid)),
        (snapshot) => {
          const profile = snapshot.docs[0];
          setStudentProfile(profile ? { id: profile.id, ...profile.data() } : null);
        },
        () => undefined,
      ),
      onSnapshot(
        query(collection(db, "notifications"), where("targetType", "==", "allStudents")),
        (snapshot) => {
          setNotifications(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        () => undefined,
      ),
      onSnapshot(
        query(collection(db, "messages"), where("senderId", "==", appUser.uid)),
        (snapshot) => {
          setMessages(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
        },
        () => undefined,
      ),
    ];

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [appUser]);

  const subjectLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const lessonTeacherId = String(lesson.teacherId ?? "");
          return (
            String(lesson.gradeId ?? "") === gradeId &&
            String(lesson.subject ?? "") === selectedSubject &&
            (!showTrack || String(lesson.track ?? "") === track) &&
            assignedTeacherIds.includes(lessonTeacherId)
          );
        })
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [assignedTeacherIds, gradeId, lessons, selectedSubject, showTrack, track],
  );
  const selectedLesson =
    subjectLessons.find((item) => item.id === (lessonId ?? activeLessonId)) ??
    subjectLessons.find((item) => item.id === activeLessonId) ??
    subjectLessons[0];
  const selectedLessonId = selectedLesson?.id ?? lessonId ?? "";
  const lessonBlocks = useCollectionByField("lessonBlocks", "lessonId", selectedLessonId);
  const quizzes = useCollectionByField("quizzes", "lessonId", selectedLessonId);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === quizId) ?? quizzes[0];

  useEffect(() => {
    if (!subjectLessons.length) {
      setActiveLessonId("");
      return;
    }

    if (!subjectLessons.some((item) => item.id === activeLessonId)) {
      setActiveLessonId(subjectLessons[0].id);
    }
  }, [activeLessonId, subjectLessons]);

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
        subject: messageSubject,
        message,
        status: "new",
        lessonId: selectedLessonId,
      },
      appUser,
    );

    setMessageSubject("");
    setMessage("");
    setReceiverId("");
    setNotice("?? ????? ???????.");
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
        lessonId: selectedQuiz.lessonId ?? selectedLessonId,
        teacherId: selectedQuiz.teacherId ?? selectedLesson?.teacherId ?? "",
        studentId: appUser.uid,
        score: passingScore,
        percentage: passingScore,
        passed: true,
        attemptNumber: attempts.filter((item) => item.quizId === selectedQuiz.id).length + 1,
      },
      appUser,
    );

    setNotice("?? ????? ?????? ???????? ?????.");
  }

  if (view === "profile") {
    return (
      <StudentShell title="????? ??????" subtitle="?????? ?????? ????? ????????.">
        <div className="surface p-5">
          <p className="text-lg font-black text-slate-950">{appUser?.displayName}</p>
          <p className="mt-1 text-sm text-slate-500">{appUser?.username ?? appUser?.email}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="????" value={formatGrade(gradeId)} />
            <MiniMetric label="??????" value={formatCellValue(showTrack ? track : "?? ????")} />
            <MiniMetric label="???????" value={String(availableSubjects.length)} />
          </div>
        </div>
      </StudentShell>
    );
  }

  if (view === "notifications") {
    return (
      <StudentShell title="??????? ??????" subtitle="????????? ??????? ??????? ??????.">
        <RecordList records={notifications} empty="?? ???? ??????? ??????." />
      </StudentShell>
    );
  }

  if (view === "messages") {
    return (
      <StudentShell title="????? ??????" subtitle="????? ????? ?????? ?????? ??????? ???????.">
        {notice ? <Notice text={notice} /> : null}
        <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSendMessage}>
          <label className="block space-y-2">
            <span className="form-label">????? ?????? ???????</span>
            <input className="form-input" value={receiverId} onChange={(e) => setReceiverId(e.target.value)} required />
          </label>
          <label className="block space-y-2">
            <span className="form-label">???????</span>
            <input className="form-input" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} required />
          </label>
          <label className="block space-y-2 md:col-span-2">
            <span className="form-label">???????</span>
            <textarea className="form-input min-h-28" value={message} onChange={(e) => setMessage(e.target.value)} required />
          </label>
          <button className="btn-primary md:col-span-2" type="submit">
            <Send size={18} />
            ?????
          </button>
        </form>
        <RecordList records={messages} empty="?? ???? ????? ?????." />
      </StudentShell>
    );
  }

  if (view === "quiz") {
    return (
      <StudentShell title="????? ????????" subtitle="???? ??????? ???????? ????? ?????? ??????.">
        {notice ? <Notice text={notice} /> : null}
        {selectedQuiz ? (
          <section className="surface p-5">
            <h2 className="text-xl font-black text-slate-950">{formatCellValue(selectedQuiz.title)}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{formatCellValue(selectedQuiz.description)}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniMetric label="???? ??????" value={formatCellValue(selectedQuiz.passingScore)} />
              <MiniMetric label="?????????" value={formatCellValue(selectedQuiz.attemptsAllowed)} />
              <MiniMetric label="????" value={formatCellValue(selectedQuiz.isActive)} />
            </div>
            <button className="btn-primary mt-5" type="button" onClick={submitQuizAttempt}>
              <CheckCircle2 size={18} />
              ????? ??????
            </button>
          </section>
        ) : (
          <EmptyState text="?? ???? ?????? ???? ?????." />
        )}
      </StudentShell>
    );
  }

  if (view === "result") {
    return (
      <StudentShell title="????? ??????????" subtitle="????? ???????? ??????.">
        <RecordList records={attempts} empty="?? ???? ????? ???." />
      </StudentShell>
    );
  }

  return (
    <StudentShell title="??????? ???????" subtitle="??????? ??????? ???? ????? ?????? ??.">
      <section className="surface grid gap-3 p-5 sm:grid-cols-3">
        <MiniMetric label="????" value={formatGrade(gradeId)} />
        <MiniMetric label="??????" value={formatCellValue(showTrack ? track : "?? ????")} />
        <MiniMetric label="????????" value={String(assignedTeacherIds.length)} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(260px,360px)_1fr]">
        <section className="space-y-3">
          {availableSubjects.map((subject) => (
            <button
              key={subject}
              className={`surface w-full p-5 text-right transition ${
                subject === selectedSubject ? "ring-2 ring-learning-blue" : ""
              }`}
              type="button"
              onClick={() => setActiveSubject(subject)}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-learning-blue">{formatGrade(gradeId)}</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">{subject}</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {subjectLessons.length} ??? ???? ?? ??????.
                  </p>
                </div>
                <BookOpen className="text-learning-blue" size={26} />
              </div>
            </button>
          ))}
          {!availableSubjects.length ? (
            <EmptyState text="?? ???? ????? ????? ?? ???. ???? ?? ?????? ??? ??????? ?????." />
          ) : null}
        </section>

        {selectedSubject ? (
          <section className="space-y-3">
            <div className="surface p-5">
              <p className="text-xs font-bold text-learning-blue">?????? ??????</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                {selectedSubject}
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {subjectLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className={`surface p-5 text-right ${
                    lesson.id === selectedLesson?.id ? "ring-2 ring-learning-blue" : ""
                  }`}
                  type="button"
                  onClick={() => setActiveLessonId(lesson.id)}
                >
                  <p className="text-xs font-bold text-slate-400">
                    ????? {formatCellValue(lesson.order)}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {formatCellValue(lesson.title)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCellValue(lesson.objectives ?? "????? ???? ????.")}
                  </p>
                </button>
              ))}
            </div>

            {!subjectLessons.length ? (
              <EmptyState text="?? ???? ???? ?????? ???? ??????? ???." />
            ) : null}

            {selectedLesson ? (
              <section className="space-y-3">
                <div className="surface p-5">
                  <p className="text-xs font-bold text-learning-blue">??? ?????</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {formatCellValue(selectedLesson.title)}
                  </h2>
                </div>
                <LessonBlocks blocks={lessonBlocks} />
                {quizzes.length ? (
                  <Link className="btn-primary" to={`/student/quiz?lessonId=${selectedLessonId}&quizId=${quizzes[0].id}`}>
                    ??? ????????
                  </Link>
                ) : null}
              </section>
            ) : null}
          </section>
        ) : null}
      </div>
    </StudentShell>
  );
}

function LessonBlocks({ blocks }: { blocks: AppRecord[] }) {
  if (!blocks.length) {
    return <EmptyState text="?? ???? ????? ???? ????? ???." />;
  }

  return (
    <div className="space-y-3">
      {blocks
        .slice()
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
        .map((block) => (
          <article key={block.id} className="surface p-5">
            <p className="text-xs font-bold text-learning-blue">{formatCellValue(block.type)}</p>
            <h2 className="mt-2 text-lg font-black text-slate-950">{formatCellValue(block.title)}</h2>
            {block.type === "image" && block.url ? (
              <img
                className="mt-3 max-h-96 w-full rounded-lg border border-slate-200 object-contain"
                src={String(block.url)}
                alt={String(block.title ?? "???? ?????")}
              />
            ) : null}
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {formatCellValue(block.content)}
            </p>
            {block.url && block.type !== "image" ? (
              <a
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-learning-blue"
                href={String(block.url)}
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon size={16} />
                ??? ??????
              </a>
            ) : null}
          </article>
        ))}
    </div>
  );
}

function formatGrade(gradeId: string) {
  return formatCellValue(
    gradeOptions.find((grade) => grade.value === gradeId)?.label ?? gradeId,
  );
}

function StudentShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Student</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{subtitle}</p>
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
