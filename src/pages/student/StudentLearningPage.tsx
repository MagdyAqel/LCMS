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
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { getSubjectsForGrade, gradeOptions, requiresTrack } from "../../data/curriculumCatalog";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../lib/firebase";
import {
  createRecord,
  type AppRecord,
} from "../../services/records";
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

function useLessonsForTeachers(
  teacherIds: string[],
  gradeId: string,
  track: string,
  showTrack: boolean,
) {
  const [records, setRecords] = useState<AppRecord[]>([]);

  useEffect(() => {
    if (!teacherIds.length || !gradeId) {
      setRecords([]);
      return;
    }

    const lessonsById = new Map<string, AppRecord>();
    const unsubs = teacherIds.map((teacherId) => {
      return onSnapshot(
        query(collection(db, "lessons"), where("teacherId", "==", teacherId)),
        (snapshot) => {
          for (const key of Array.from(lessonsById.keys())) {
            if (key.startsWith(`${teacherId}:`)) {
              lessonsById.delete(key);
            }
          }

          for (const item of snapshot.docs) {
            const lesson: AppRecord = { id: item.id, ...item.data() };
            const matchesStudent =
              String(lesson.gradeId ?? "") === gradeId &&
              String(lesson.status ?? "draft") === "published" &&
              (!showTrack || String(lesson.track ?? "") === track);

            if (matchesStudent) {
              lessonsById.set(`${teacherId}:${item.id}`, lesson);
            }
          }
          setRecords(Array.from(lessonsById.values()));
        },
        () => undefined,
      );
    });

    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [gradeId, showTrack, teacherIds, track]);

  return records;
}

function useTeacherProfiles(teacherIds: string[]) {
  const [records, setRecords] = useState<AppRecord[]>([]);

  useEffect(() => {
    if (!teacherIds.length) {
      setRecords([]);
      return;
    }

    const teachersById = new Map<string, AppRecord>();
    const unsubs = teacherIds.map((teacherId) =>
      onSnapshot(
        doc(db, "teachers", teacherId),
        (snapshot) => {
          if (snapshot.exists()) {
            teachersById.set(snapshot.id, { id: snapshot.id, ...snapshot.data() });
          }
          setRecords(Array.from(teachersById.values()));
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

function usernameFromAppUser(appUser: { username?: string; email?: string } | null) {
  if (!appUser) {
    return "";
  }

  if (appUser.username) {
    return appUser.username;
  }

  return appUser.email?.endsWith("@lcms.test") ? appUser.email.split("@")[0] : "";
}

function youtubeEmbedUrl(url: unknown) {
  const raw = String(url ?? "").trim();

  if (!raw) {
    return "";
  }

  try {
    const parsed = new URL(raw);
    const host = parsed.hostname.replace(/^www\./, "");
    const videoId =
      host === "youtu.be"
        ? parsed.pathname.slice(1)
        : parsed.searchParams.get("v") ??
          (parsed.pathname.startsWith("/embed/")
            ? parsed.pathname.replace("/embed/", "")
            : "");

    return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
  } catch {
    return "";
  }
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
  const [trackedBlockIds, setTrackedBlockIds] = useState<string[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const accountUsername = usernameFromAppUser(appUser);

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
  const teacherProfiles = useTeacherProfiles(assignedTeacherIds);
  const teacherNames = useMemo(
    () => {
      const namesFromProfile = [
        ...getRecordStringArray(studentProfile, "teacherNames"),
        studentProfile?.teacherName,
      ]
        .map((name) => String(name ?? "").trim())
        .filter(Boolean);

      if (namesFromProfile.length) {
        return Array.from(new Set(namesFromProfile));
      }

      return assignedTeacherIds.map((teacherId) => {
        const teacher = teacherProfiles.find((item) => item.id === teacherId);
        return String(teacher?.fullName ?? teacher?.displayName ?? teacherId);
      });
    },
    [assignedTeacherIds, studentProfile, teacherProfiles],
  );
  const lessons = useLessonsForTeachers(
    assignedTeacherIds,
    gradeId,
    track,
    showTrack,
  );
  const publishedTeacherLessonSubjects = useMemo(
    () =>
      Array.from(
        new Set(
          lessons
            .filter(
              (lesson) =>
                String(lesson.gradeId ?? "") === gradeId &&
                (!showTrack || String(lesson.track ?? "") === track) &&
                assignedTeacherIds.includes(String(lesson.teacherId ?? "")) &&
                String(lesson.status ?? "draft") === "published",
            )
            .map((lesson) => String(lesson.subject ?? "").trim())
            .filter(Boolean),
        ),
      ),
    [assignedTeacherIds, gradeId, lessons, showTrack, track],
  );
  const availableSubjects = useMemo(() => {
    const gradeSubjects = getSubjectsForGrade(gradeId, showTrack ? track : "");
    const subjects = Array.from(
      new Set([...assignedSubjects, ...publishedTeacherLessonSubjects]),
    );
    return subjects.filter(
      (subject) => gradeSubjects.includes(subject) || publishedTeacherLessonSubjects.includes(subject),
    );
  }, [assignedSubjects, gradeId, publishedTeacherLessonSubjects, showTrack, track]);
  const selectedSubject = activeSubject || availableSubjects[0] || "";
  const lessonsBySubject = useMemo(
    () =>
      availableSubjects.reduce<Record<string, AppRecord[]>>((groups, subject) => {
        groups[subject] = lessons
          .filter((lesson) => String(lesson.subject ?? "") === subject)
          .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
        return groups;
      }, {}),
    [availableSubjects, lessons],
  );
  const attempts = useCollectionByField(
    "quizAttempts",
    "studentId",
    appUser?.uid,
  );

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

    setStudentProfile(null);
    const matchesCurrentStudent = (profile: AppRecord) =>
      profile.id === appUser.uid ||
      profile.studentId === appUser.uid ||
      profile.userId === appUser.uid ||
      profile.username === accountUsername ||
      profile.authEmail === appUser.email;
    const applyStudentProfile = (profile: AppRecord | null) => {
      if (!profile) {
        return;
      }

      setStudentProfile((current) => {
        const profileHasLearningLink =
          Boolean(profile.gradeId) ||
          Boolean(profile.teacherId) ||
          getRecordStringArray(profile, "teacherIds").length > 0;
        const currentHasLearningLink =
          Boolean(current?.gradeId) ||
          Boolean(current?.teacherId) ||
          getRecordStringArray(current, "teacherIds").length > 0;

        if (
          !current ||
          (profileHasLearningLink && !currentHasLearningLink) ||
          profile.id === appUser.uid ||
          current.id !== appUser.uid
        ) {
          return profile;
        }

        return current;
      });
    };

    const studentProfileQueries: Unsubscribe[] = [
      onSnapshot(
        doc(db, "students", appUser.uid),
        (snapshot) => {
          if (snapshot.exists()) {
            applyStudentProfile({ id: snapshot.id, ...snapshot.data() });
          }
        },
        () => undefined,
      ),
      onSnapshot(
        query(collection(db, "students"), where("studentId", "==", appUser.uid)),
        (snapshot) => {
          const profile = snapshot.docs[0];
          applyStudentProfile(profile ? { id: profile.id, ...profile.data() } : null);
        },
        () => undefined,
      ),
      onSnapshot(
        query(collection(db, "students"), where("userId", "==", appUser.uid)),
        (snapshot) => {
          const profile = snapshot.docs[0];
          applyStudentProfile(profile ? { id: profile.id, ...profile.data() } : null);
        },
        () => undefined,
      ),
    ];

    if (accountUsername) {
      studentProfileQueries.push(
        onSnapshot(
          query(collection(db, "students"), where("username", "==", accountUsername)),
          (snapshot) => {
            const profile = snapshot.docs[0];
            applyStudentProfile(profile ? { id: profile.id, ...profile.data() } : null);
          },
          () => undefined,
        ),
      );
    }

    if (appUser.email) {
      studentProfileQueries.push(
        onSnapshot(
          query(collection(db, "students"), where("authEmail", "==", appUser.email)),
          (snapshot) => {
            const profile = snapshot.docs[0];
            applyStudentProfile(profile ? { id: profile.id, ...profile.data() } : null);
          },
          () => undefined,
        ),
      );
    }

    const unsubs: Unsubscribe[] = [
      ...studentProfileQueries,
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
  }, [accountUsername, appUser]);

  useEffect(() => {
    if (!appUser || studentProfile || !accountUsername) {
      return;
    }

    let cancelled = false;
    const currentUser = appUser;

    async function repairMissingStudentProfile() {
      try {
        const usernameSnapshot = await getDoc(doc(db, "usernames", accountUsername));
        if (!usernameSnapshot.exists()) {
          return;
        }

        const usernameData = usernameSnapshot.data();
        const teacherId = String(usernameData.createdBy ?? "");
        if (
          String(usernameData.uid ?? "") !== currentUser.uid ||
          String(usernameData.role ?? "") !== "student" ||
          !teacherId
        ) {
          return;
        }

        let teacherName = "";
        let teacherLessons: AppRecord[] = [];

        try {
          const teacherSnapshot = await getDoc(doc(db, "teachers", teacherId));
          if (teacherSnapshot.exists()) {
            const teacherData = teacherSnapshot.data();
            teacherName = String(
              teacherData.fullName ?? teacherData.displayName ?? "",
            );
          }
        } catch {
          teacherName = "";
        }

        try {
          const lessonsSnapshot = await getDocs(
            query(
              collection(db, "lessons"),
              where("teacherId", "==", teacherId),
            ),
          );
          teacherLessons = lessonsSnapshot.docs
            .map((item): AppRecord => ({
              id: item.id,
              ...item.data(),
            }))
            .filter((lesson) => String(lesson.status ?? "draft") === "published");
        } catch {
          teacherLessons = [];
        }

        const firstLesson = teacherLessons[0];

        const payload = {
          studentId: currentUser.uid,
          userId: currentUser.uid,
          username: accountUsername,
          authEmail: currentUser.email ?? "",
          fullName: currentUser.displayName,
          teacherId,
          teacherIds: [teacherId],
          teacherName,
          teacherNames: teacherName ? [teacherName] : [],
          gradeId: String(firstLesson?.gradeId ?? ""),
          track: String(firstLesson?.track ?? ""),
          curriculumSubject: String(firstLesson?.subject ?? ""),
          curriculumSubjects: Array.from(
            new Set(
              teacherLessons
                .map((lesson) => String(lesson.subject ?? "").trim())
                .filter(Boolean),
            ),
          ),
          status: "active",
          createdFrom: "student-login-repair",
          updatedAt: serverTimestamp(),
        };

        if (!cancelled) {
          setStudentProfile({ id: currentUser.uid, ...payload });
        }

        try {
          await setDoc(doc(db, "students", currentUser.uid), payload, { merge: true });
        } catch {
          // The in-memory profile still lets the learner see the teacher's published content.
        }
      } catch {
        // The visible warning on the page is enough; failed repair should not block navigation.
      }
    }

    repairMissingStudentProfile();

    return () => {
      cancelled = true;
    };
  }, [accountUsername, appUser, studentProfile]);

  const subjectLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const lessonTeacherId = String(lesson.teacherId ?? "");
          return (
            String(lesson.gradeId ?? "") === gradeId &&
            String(lesson.subject ?? "") === selectedSubject &&
            (!showTrack || String(lesson.track ?? "") === track) &&
            assignedTeacherIds.includes(lessonTeacherId) &&
            String(lesson.status ?? "draft") === "published"
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
  const lessonBlocks = useCollectionByField(
    "lessonBlocks",
    "lessonId",
    selectedLessonId,
  );
  const quizzes = useCollectionByField("quizzes", "lessonId", selectedLessonId);
  const selectedQuiz = quizzes.find((quiz) => quiz.id === quizId) ?? quizzes[0];
  const quizQuestions = useCollectionByField(
    "quizQuestions",
    "quizId",
    selectedQuiz?.id,
  );
  const quizOptions = useCollectionByField(
    "quizOptions",
    "quizId",
    selectedQuiz?.id,
  );
  const progressRecords = useCollectionByField(
    "studentProgress",
    "studentId",
    appUser?.uid,
  );
  const publishedLessonBlocks = useMemo(
    () => lessonBlocks.filter((block) => String(block.status ?? "draft") === "published"),
    [lessonBlocks],
  );

  function lessonProgress(lesson: AppRecord) {
    const lessonRows = progressRecords.filter((item) => item.lessonId === lesson.id);
    const viewedBlocks = new Set(
      lessonRows.map((item) => String(item.blockId ?? "")).filter(Boolean),
    );
    const totalBlocks =
      lesson.id === selectedLessonId
        ? publishedLessonBlocks.length
        : Number(lessonRows[0]?.totalBlocks ?? 0);
    return totalBlocks ? Math.round((viewedBlocks.size / totalBlocks) * 100) : 0;
  }

  function lessonPassed(lesson: AppRecord) {
    const required = Number(lesson.requiredProgress ?? 80);
    const passedQuiz = attempts.some(
      (attempt) => attempt.lessonId === lesson.id && attempt.passed === true,
    );
    return lessonProgress(lesson) >= required || passedQuiz;
  }

  function canOpenLesson(lesson: AppRecord) {
    if (lesson.learningMode !== "linear") {
      return true;
    }

    const index = subjectLessons.findIndex((item) => item.id === lesson.id);
    if (index <= 0) {
      return true;
    }

    return lessonPassed(subjectLessons[index - 1]);
  }

  const completedLessons = subjectLessons.filter(lessonPassed).length;
  const overallProgress = subjectLessons.length
    ? Math.round(
        subjectLessons.reduce((sum, lesson) => sum + lessonProgress(lesson), 0) /
          subjectLessons.length,
      )
    : 0;

  useEffect(() => {
    if (!subjectLessons.length) {
      setActiveLessonId("");
      return;
    }

    if (!subjectLessons.some((item) => item.id === activeLessonId)) {
      setActiveLessonId(subjectLessons[0].id);
    }
  }, [activeLessonId, subjectLessons]);

  useEffect(() => {
    if (!appUser || !selectedLesson || !publishedLessonBlocks.length) {
      return;
    }

    const totalBlocks = publishedLessonBlocks.length;
    const unseenBlocks = publishedLessonBlocks.filter(
      (block) => !trackedBlockIds.includes(block.id),
    );

    if (!unseenBlocks.length) {
      return;
    }

    setTrackedBlockIds((current) => [
      ...current,
      ...unseenBlocks.map((block) => block.id),
    ]);

    unseenBlocks.forEach((block) => {
      const progressId = `${appUser.uid}_${selectedLesson.id}_${block.id}`;
      setDoc(
        doc(db, "studentProgress", progressId),
        {
          studentId: appUser.uid,
          teacherId: selectedLesson.teacherId ?? "",
          lessonId: selectedLesson.id,
          lessonTitle: selectedLesson.title ?? "",
          gradeId,
          track: showTrack ? track : "",
          subject: selectedSubject,
          blockId: block.id,
          blockTitle: block.title ?? "",
          blockType: block.type ?? "",
          viewCount: increment(1),
          totalBlocks,
          progressPercent: Math.round(100 / Math.max(totalBlocks, 1)),
          lastViewedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    });
  }, [
    appUser,
    gradeId,
    publishedLessonBlocks,
    selectedLesson,
    selectedSubject,
    showTrack,
    track,
    trackedBlockIds,
  ]);

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
    setNotice("تم إرسال الرسالة.");
  }

  async function submitQuizAttempt() {
    if (!appUser || !selectedQuiz) {
      return;
    }

    const passingScore = Number(selectedQuiz.passingScore ?? 70);
    const correctCount = quizQuestions.filter((question) => {
      const answerId = selectedAnswers[question.id];
      const option = quizOptions.find((item) => item.id === answerId);
      return option?.isCorrect === true;
    }).length;
    const percentage = quizQuestions.length
      ? Math.round((correctCount / quizQuestions.length) * 100)
      : passingScore;

    await createRecord(
      "quizAttempts",
      {
        quizId: selectedQuiz.id,
        lessonId: selectedQuiz.lessonId ?? selectedLessonId,
        teacherId: selectedQuiz.teacherId ?? selectedLesson?.teacherId ?? "",
        studentId: appUser.uid,
        score: percentage,
        percentage,
        passed: percentage >= passingScore,
        attemptNumber: attempts.filter((item) => item.quizId === selectedQuiz.id).length + 1,
      },
      appUser,
    );

    setNotice(percentage >= passingScore ? "تم اجتياز الاختبار بنجاح." : "تم تسجيل المحاولة. تحتاج درجة أعلى للاجتياز.");
  }

  if (view === "profile") {
    return (
      <StudentShell title="الملف الشخصي" subtitle="بيانات الحساب والصف التعليمي.">
        <div className="surface p-5">
          <p className="text-lg font-black text-slate-950">{appUser?.displayName}</p>
          <p className="mt-1 text-sm text-slate-500">{appUser?.username ?? appUser?.email}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="الصف" value={formatGrade(gradeId)} />
            <MiniMetric label="المسار" value={formatCellValue(showTrack ? track : "لا يوجد")} />
            <MiniMetric label="المناهج" value={String(availableSubjects.length)} />
          </div>
        </div>
      </StudentShell>
    );
  }

  if (view === "notifications") {
    return (
      <StudentShell title="تنبيهات الطالب" subtitle="التنبيهات الفعالة الموجهة للطلاب.">
        <RecordList records={notifications} empty="لا توجد تنبيهات حاليًا." />
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
            <input className="form-input" value={messageSubject} onChange={(e) => setMessageSubject(e.target.value)} required />
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
            <div className="mt-5 space-y-4">
              {quizQuestions.map((question, index) => (
                <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="font-black text-slate-950">
                    {index + 1}. {formatCellValue(question.questionText)}
                  </p>
                  <div className="mt-3 grid gap-2">
                    {quizOptions
                      .filter((option) => option.questionId === question.id)
                      .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
                      .map((option) => (
                        <label
                          key={option.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
                        >
                          <input
                            type="radio"
                            name={question.id}
                            checked={selectedAnswers[question.id] === option.id}
                            onChange={() =>
                              setSelectedAnswers((current) => ({
                                ...current,
                                [question.id]: option.id,
                              }))
                            }
                          />
                          {formatCellValue(option.text)}
                        </label>
                      ))}
                  </div>
                </div>
              ))}
              {!quizQuestions.length ? (
                <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                  لم يضف المعلم أسئلة لهذا الاختبار بعد.
                </p>
              ) : null}
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

  return (
    <StudentShell title="المناهج المتاحة" subtitle="المناهج والدروس التي فعلها المعلم لك.">
      {teacherNames.length ? (
        <div className="surface flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-bold text-slate-500">المعلم</span>
          <strong className="text-lg font-black text-slate-950">
            {teacherNames.join("، ")}
          </strong>
        </div>
      ) : null}
      {!studentProfile ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          لم يتم العثور على سجل الطالب المرتبط بهذا الحساب بعد. تأكد أن اسم المستخدم في سجل الطالب هو {accountUsername || appUser?.email}.
        </div>
      ) : null}
      <section className="surface grid gap-3 p-5 sm:grid-cols-3">
        <MiniMetric label="الصف" value={formatGrade(gradeId)} />
        <MiniMetric label="المسار" value={formatCellValue(showTrack ? track : "لا يوجد")} />
        <MiniMetric
          label="المعلم"
          value={teacherNames.length ? teacherNames.join("، ") : "لا يوجد"}
        />
      </section>

      <section className="surface grid gap-3 p-5 sm:grid-cols-3">
        <MiniMetric label="الدروس المكتملة" value={`${completedLessons}/${subjectLessons.length}`} />
        <MiniMetric label="آخر درس" value={formatCellValue(selectedLesson?.title ?? "لا يوجد")} />
        <MiniMetric label="نسبة الإنجاز" value={`${overallProgress}%`} />
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
                    {(lessonsBySubject[subject] ?? []).length} درس منشور من معلمك.
                  </p>
                  <p className="mt-1 text-xs font-bold text-slate-400">
                    {teacherNames.length ? teacherNames.join("، ") : "المعلم غير محدد"}
                  </p>
                </div>
                <BookOpen className="text-learning-blue" size={26} />
              </div>
            </button>
          ))}
          {!availableSubjects.length ? (
            <EmptyState text="لا توجد مناهج مفعلة لك بعد. اطلب من المعلم ربط المنهاج بسجلك." />
          ) : null}
        </section>

        {selectedSubject ? (
          <section className="space-y-3">
            <div className="surface p-5">
              <p className="text-xs font-bold text-learning-blue">الدروس والعرض</p>
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
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                  type="button"
                  disabled={!canOpenLesson(lesson)}
                  onClick={() => {
                    if (canOpenLesson(lesson)) {
                      setActiveLessonId(lesson.id);
                    }
                  }}
                >
                  <p className="text-xs font-bold text-slate-400">
                    الدرس {formatCellValue(lesson.order)}
                  </p>
                  <h3 className="mt-1 text-lg font-black text-slate-950">
                    {formatCellValue(lesson.title)}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCellValue(lesson.objectives ?? "الدرس متاح الآن.")}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-500">
                      {lesson.learningMode === "linear" ? "خطي" : "حر"}
                    </span>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-learning-blue">
                      {lessonProgress(lesson)}%
                    </span>
                    {!canOpenLesson(lesson) ? (
                      <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">
                        يحتاج إكمال الدرس السابق
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>

            {!subjectLessons.length ? (
              <EmptyState text="لا توجد دروس منشورة لهذا المنهاج بعد." />
            ) : null}

            {selectedLesson ? (
              <section className="space-y-3">
                <div className="surface p-5">
                  <p className="text-xs font-bold text-learning-blue">عرض الدرس</p>
                  <h2 className="mt-2 text-xl font-black text-slate-950">
                    {formatCellValue(selectedLesson.title)}
                  </h2>
                </div>
                <LessonBlocks blocks={publishedLessonBlocks} />
                {quizzes.length ? (
                  <div className="surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold text-learning-blue">الاختبار</p>
                      <h3 className="mt-1 text-lg font-black text-slate-950">
                        {formatCellValue(quizzes[0].title ?? "اختبار الدرس")}
                      </h3>
                    </div>
                    <Link className="btn-primary" to={`/student/quiz?lessonId=${selectedLessonId}&quizId=${quizzes[0].id}`}>
                      فتح الاختبار
                    </Link>
                  </div>
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
    return <EmptyState text="لا توجد عناصر لهذا الدرس بعد." />;
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
                alt={String(block.title ?? "صورة الدرس")}
              />
            ) : null}
            {block.type === "youtube" && youtubeEmbedUrl(block.url) ? (
              <div className="mt-3 aspect-video overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
                <iframe
                  className="h-full w-full"
                  src={youtubeEmbedUrl(block.url)}
                  title={String(block.title ?? "YouTube")}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ) : null}
            {block.type === "text" ? (
              <div
                className="prose prose-sm mt-2 max-w-none text-right leading-8 text-slate-600"
                dir="rtl"
                dangerouslySetInnerHTML={{ __html: String(block.content ?? "") }}
              />
            ) : (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                {formatCellValue(block.content)}
              </p>
            )}
            {block.url && block.type !== "image" && block.type !== "youtube" ? (
              <a
                className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-learning-blue"
                href={String(block.url)}
                target="_blank"
                rel="noreferrer"
              >
                <LinkIcon size={16} />
                فتح الرابط
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
