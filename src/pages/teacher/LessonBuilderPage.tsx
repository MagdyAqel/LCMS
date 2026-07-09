import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  Eye,
  FileText,
  HelpCircle,
  Image,
  Link as LinkIcon,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  getSubjectsForGrade,
  gradeOptions,
  requiresTrack,
  trackOptions,
} from "../../data/curriculumCatalog";
import { useAuth } from "../../context/AuthContext";
import { db, storage } from "../../lib/firebase";
import { isDemoUser } from "../../services/demoAuth";
import {
  createRecord,
  removeRecord,
  subscribeToRecords,
  updateRecord,
  type AppRecord,
} from "../../services/records";
import { formatCellValue } from "../../utils/format";

type BlockType = "text" | "image" | "youtube" | "externalLink" | "file";

const blockTypes: Array<{ value: BlockType; label: string; icon: ReactNode }> = [
  { value: "text", label: "نص", icon: <FileText size={18} /> },
  { value: "image", label: "صورة", icon: <Image size={18} /> },
  { value: "youtube", label: "يوتيوب", icon: <Video size={18} /> },
  { value: "externalLink", label: "رابط خارجي", icon: <LinkIcon size={18} /> },
  { value: "file", label: "ملف", icon: <FileText size={18} /> },
];

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function safeFileName(name: string) {
  return name.replace(/[^\w.-]+/g, "-").slice(0, 90);
}

export function LessonBuilderPage({ mode = "lesson" }: { mode?: "lesson" | "quiz" }) {
  const { appUser } = useAuth();
  const [teacherProfile, setTeacherProfile] = useState<AppRecord | null>(null);
  const [lessons, setLessons] = useState<AppRecord[]>([]);
  const [blocks, setBlocks] = useState<AppRecord[]>([]);
  const [gradeId, setGradeId] = useState("1");
  const [track, setTrack] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [editingLessonId, setEditingLessonId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonObjectives, setLessonObjectives] = useState("");
  const [lessonStatus, setLessonStatus] = useState("draft");
  const [learningMode, setLearningMode] = useState("free");
  const [requiredProgress, setRequiredProgress] = useState("80");
  const [editingBlockId, setEditingBlockId] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("text");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockContent, setBlockContent] = useState("");
  const [blockUrl, setBlockUrl] = useState("");
  const [blockStatus, setBlockStatus] = useState("draft");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [quizzes, setQuizzes] = useState<AppRecord[]>([]);
  const [questions, setQuestions] = useState<AppRecord[]>([]);
  const [options, setOptions] = useState<AppRecord[]>([]);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizPassingScore, setQuizPassingScore] = useState("70");
  const [questionText, setQuestionText] = useState("");
  const [answerOptions, setAnswerOptions] = useState(["", "", "", ""]);
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [lessonSearch, setLessonSearch] = useState("");
  const [lessonStatusFilter, setLessonStatusFilter] = useState("all");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const teacherGradeId = String(teacherProfile?.gradeId ?? "");
  const quizMode = mode === "quiz";
  const teacherTrack = String(teacherProfile?.track ?? "");
  const teacherSubjects = useMemo(
    () => {
      const assignedSubjects = teacherProfile?.teachingSubjects;
      return Array.isArray(assignedSubjects)
        ? assignedSubjects.map((item) => String(item ?? "").trim()).filter(Boolean)
        : [];
    },
    [teacherProfile],
  );
  const showTrack = requiresTrack(gradeId);
  const subjects = useMemo(
    () => {
      const catalogSubjects = getSubjectsForGrade(gradeId, showTrack ? track : "");
      if (!teacherSubjects.length) {
        return [];
      }

      return catalogSubjects.filter((item) => teacherSubjects.includes(item));
    },
    [gradeId, showTrack, teacherSubjects, track],
  );

  useEffect(() => {
    if (!appUser) {
      return;
    }

    if (isDemoUser(appUser)) {
      return subscribeToRecords(
        "teachers",
        appUser,
        { type: "all" },
        (items) =>
          setTeacherProfile(
            items.find((item) => item.id === appUser.uid || item.userId === appUser.uid) ??
              null,
          ),
        () => setTeacherProfile(null),
      );
    }

    return onSnapshot(
      doc(db, "teachers", appUser.uid),
      (snapshot) => {
        setTeacherProfile(
          snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null,
        );
      },
      () => setTeacherProfile(null),
    );
  }, [appUser]);

  useEffect(() => {
    if (!teacherGradeId) {
      return;
    }

    setGradeId(teacherGradeId);
    setTrack(requiresTrack(teacherGradeId) ? teacherTrack : "");
  }, [teacherGradeId, teacherTrack]);

  useEffect(() => {
    if (!showTrack) {
      setTrack("");
    }
  }, [showTrack]);

  useEffect(() => {
    if (!subjects.includes(subject)) {
      setSubject(subjects[0] ?? "");
    }
  }, [subjects, subject]);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const lessonUnsub = subscribeToRecords(
      "lessons",
      appUser,
      { type: "teacherOwned" },
      setLessons,
      () => undefined,
    );
    const blockUnsub = subscribeToRecords(
      "lessonBlocks",
      appUser,
      { type: "teacherOwned" },
      setBlocks,
      () => undefined,
    );
    const quizUnsub = subscribeToRecords(
      "quizzes",
      appUser,
      { type: "teacherOwned" },
      setQuizzes,
      () => undefined,
    );
    const questionUnsub = subscribeToRecords(
      "quizQuestions",
      appUser,
      { type: "teacherOwned" },
      setQuestions,
      () => undefined,
    );
    const optionUnsub = subscribeToRecords(
      "quizOptions",
      appUser,
      { type: "teacherOwned" },
      setOptions,
      () => undefined,
    );

    return () => {
      lessonUnsub();
      blockUnsub();
      quizUnsub();
      questionUnsub();
      optionUnsub();
    };
  }, [appUser]);

  const filteredLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const lessonGrade = String(lesson.gradeId ?? "");
          const lessonTrack = String(lesson.track ?? "");
          const lessonSubject = String(lesson.subject ?? "");
          const needle = lessonSearch.trim().toLowerCase();
          const statusMatch =
            lessonStatusFilter === "all" ||
            String(lesson.status ?? "draft") === lessonStatusFilter;
          const searchMatch =
            !needle ||
            [lesson.title, lesson.objectives, lesson.subject]
              .map((value) => String(value ?? "").toLowerCase())
              .some((value) => value.includes(needle));
          return (
            lessonGrade === gradeId &&
            lessonSubject === subject &&
            (!showTrack || lessonTrack === track) &&
            statusMatch &&
            searchMatch
          );
        })
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [gradeId, lessonSearch, lessonStatusFilter, lessons, showTrack, subject, track],
  );

  const selectedLesson =
    filteredLessons.find((lesson) => lesson.id === lessonId) ?? filteredLessons[0];

  const lessonBlocks = useMemo(
    () =>
      blocks
        .filter((block) => block.lessonId === selectedLesson?.id)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [blocks, selectedLesson],
  );
  const selectedQuiz = useMemo(
    () => quizzes.find((quiz) => quiz.lessonId === selectedLesson?.id),
    [quizzes, selectedLesson],
  );
  const selectedQuizQuestions = useMemo(
    () =>
      questions
        .filter((question) => question.quizId === selectedQuiz?.id)
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [questions, selectedQuiz],
  );

  useEffect(() => {
    setLessonId(selectedLesson?.id ?? "");
  }, [selectedLesson?.id]);

  function applyRichTextCommand(command: string) {
    document.execCommand(command);
  }

  function applyRichTextValue(command: string, value: string) {
    document.execCommand(command, false, value);
  }

  function applyRichTextColor(command: "foreColor" | "hiliteColor", value: string) {
    if (!value) {
      return;
    }

    document.execCommand(command, false, value);
  }

  function resetLessonForm() {
    setEditingLessonId("");
    setLessonTitle("");
    setLessonObjectives("");
    setLessonStatus("draft");
    setLearningMode("free");
    setRequiredProgress("80");
  }

  function resetBlockForm() {
    setEditingBlockId("");
    setBlockType("text");
    setBlockTitle("");
    setBlockContent("");
    setBlockUrl("");
    setBlockStatus("draft");
    setImageFile(null);
  }

  function startEditLesson(lesson: AppRecord) {
    setEditingLessonId(lesson.id);
    setLessonTitle(String(lesson.title ?? ""));
    setLessonObjectives(String(lesson.objectives ?? ""));
    setLessonStatus(String(lesson.status ?? "draft"));
    setLearningMode(String(lesson.learningMode ?? "free"));
    setRequiredProgress(String(lesson.requiredProgress ?? 80));
  }

  function startEditBlock(block: AppRecord) {
    setEditingBlockId(block.id);
    setBlockType(String(block.type ?? "text") as BlockType);
    setBlockTitle(String(block.title ?? ""));
    setBlockContent(String(block.content ?? ""));
    setBlockUrl(String(block.url ?? block.filePath ?? ""));
    setBlockStatus(String(block.status ?? "draft"));
    setImageFile(null);
  }

  async function uploadImage(file: File) {
    if (!appUser || !selectedLesson) {
      return "";
    }

    if (isDemoUser(appUser)) {
      return fileToDataUrl(file);
    }

    try {
      const imageRef = ref(
        storage,
        `course-assets/${appUser.uid}/${selectedLesson.id}/${Date.now()}-${safeFileName(file.name)}`,
      );
      await uploadBytes(imageRef, file, { contentType: file.type });
      return getDownloadURL(imageRef);
    } catch {
      if (file.size > 700_000) {
        throw new Error("تعذر رفع الصورة إلى التخزين. فعّل Firebase Storage أو استخدم رابط صورة مباشر.");
      }
      return fileToDataUrl(file);
    }
  }

  async function handleSaveLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !lessonTitle.trim() || !subject) {
      return;
    }

    if (!subjects.includes(subject)) {
      setNotice("المنهاج المختار غير مخصص لحساب هذا المعلم.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: lessonTitle.trim(),
        objectives: lessonObjectives.trim(),
        gradeId,
        track: showTrack ? track : "",
        subject,
        status: lessonStatus,
        learningMode,
        requiredProgress: Number(requiredProgress) || 0,
        teacherId: appUser.uid,
      };

      if (editingLessonId) {
        await updateRecord("lessons", editingLessonId, payload, appUser);
        setNotice("تم تعديل الدرس.");
      } else {
        const id = await createRecord(
          "lessons",
          { ...payload, order: filteredLessons.length + 1 },
          appUser,
        );
        setLessonId(id);
        setNotice("تمت إضافة الدرس.");
      }

      resetLessonForm();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ الدرس.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser) {
      return;
    }

    if (!selectedLesson) {
      setNotice("أضف درسًا أو اختر درسًا قبل إضافة عناصر المحتوى.");
      return;
    }

    if (!blockTitle.trim()) {
      setNotice("عنوان العنصر مطلوب قبل الحفظ.");
      return;
    }

    setSaving(true);
    try {
      const uploadedImageUrl =
        blockType === "image" && imageFile ? await uploadImage(imageFile) : "";
      const url = uploadedImageUrl || blockUrl.trim();
      const payload = {
        lessonId: selectedLesson.id,
        teacherId: appUser.uid,
        type: blockType,
        title: blockTitle.trim(),
        content: blockContent.trim(),
        url: blockType === "text" ? "" : url,
        filePath: blockType === "file" ? url : "",
        status: blockStatus,
      };

      if (editingBlockId) {
        await updateRecord("lessonBlocks", editingBlockId, payload, appUser);
        setNotice("تم تعديل عنصر الدرس.");
      } else {
        await createRecord(
          "lessonBlocks",
          { ...payload, order: lessonBlocks.length + 1 },
          appUser,
        );
        setNotice("تمت إضافة عنصر الدرس.");
      }

      resetBlockForm();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ عنصر الدرس.");
    } finally {
      setSaving(false);
    }
  }

  async function moveBlock(block: AppRecord, direction: -1 | 1) {
    if (!appUser) {
      return;
    }

    const currentIndex = lessonBlocks.findIndex((item) => item.id === block.id);
    const target = lessonBlocks[currentIndex + direction];

    if (!target) {
      return;
    }

    await updateRecord(
      "lessonBlocks",
      block.id,
      { order: Number(target.order ?? currentIndex + direction + 1) },
      appUser,
    );
    await updateRecord(
      "lessonBlocks",
      target.id,
      { order: Number(block.order ?? currentIndex + 1) },
      appUser,
    );
  }

  async function deleteLesson(lesson: AppRecord) {
    if (!appUser) {
      return;
    }

    const relatedBlocks = blocks.filter((block) => block.lessonId === lesson.id);
    await Promise.all(
      relatedBlocks.map((block) => removeRecord("lessonBlocks", block.id, appUser)),
    );
    await removeRecord("lessons", lesson.id, appUser);
    resetLessonForm();
    resetBlockForm();
    setNotice("تم حذف الدرس وعناصره.");
  }

  async function deleteBlock(block: AppRecord) {
    if (!appUser) {
      return;
    }

    await removeRecord("lessonBlocks", block.id, appUser);
    if (editingBlockId === block.id) {
      resetBlockForm();
    }
    setNotice("تم حذف العنصر.");
  }

  async function handleSaveQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !selectedLesson || !questionText.trim()) {
      return;
    }

    const cleanOptions = answerOptions.map((item) => item.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setNotice("أضف خيارين على الأقل للسؤال.");
      return;
    }

    setSaving(true);
    try {
      const quizId =
        selectedQuiz?.id ??
        (await createRecord(
          "quizzes",
          {
            title: quizTitle.trim() || `اختبار ${selectedLesson.title}`,
            description: "",
            lessonId: selectedLesson.id,
            teacherId: appUser.uid,
            gradeId,
            track: showTrack ? track : "",
            subject,
            passingScore: Number(quizPassingScore) || 70,
            attemptsAllowed: 3,
            isActive: true,
          },
          appUser,
        ));

      if (selectedQuiz) {
        await updateRecord(
          "quizzes",
          selectedQuiz.id,
          {
            title: quizTitle.trim() || selectedQuiz.title || `اختبار ${selectedLesson.title}`,
            passingScore: Number(quizPassingScore) || 70,
            isActive: true,
            gradeId,
            track: showTrack ? track : "",
            subject,
          },
          appUser,
        );
      }

      const questionId = await createRecord(
        "quizQuestions",
        {
          quizId,
          lessonId: selectedLesson.id,
          teacherId: appUser.uid,
          questionText: questionText.trim(),
          type: "multipleChoice",
          order: selectedQuizQuestions.length + 1,
          points: 1,
        },
        appUser,
      );

      await Promise.all(
        cleanOptions.map((option, index) =>
          createRecord(
            "quizOptions",
            {
              quizId,
              questionId,
              teacherId: appUser.uid,
              text: option,
              isCorrect: index === correctAnswerIndex,
              order: index + 1,
            },
            appUser,
          ),
        ),
      );

      setQuestionText("");
      setAnswerOptions(["", "", "", ""]);
      setCorrectAnswerIndex(0);
      setNotice("تمت إضافة السؤال إلى بنك الأسئلة.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر حفظ السؤال.");
    } finally {
      setSaving(false);
    }
  }

  function formatStatus(value: unknown) {
    return value === "published" ? "منشور" : value === "archived" ? "مؤرشف" : "مسودة";
  }

  function renderBlock(block: AppRecord) {
    return (
      <article key={block.id} className="rounded-lg border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold text-learning-blue">{formatCellValue(block.type)}</p>
        <h3 className="mt-1 text-base font-black text-slate-950">
          {formatCellValue(block.title)}
        </h3>
        {block.type === "image" && block.url ? (
          <img
            className="mt-3 max-h-72 w-full rounded-lg border border-slate-200 object-contain"
            src={String(block.url)}
            alt={String(block.title ?? "صورة الدرس")}
          />
        ) : null}
        {block.type === "text" ? (
          <div
            className="prose prose-sm mt-2 max-w-none text-slate-600"
            dangerouslySetInnerHTML={{ __html: String(block.content ?? "") }}
          />
        ) : (
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
            {formatCellValue(block.content)}
          </p>
        )}
        {block.url && block.type !== "image" ? (
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
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Teacher</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">إدارة الدرس</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          أضف الدروس والعناصر داخل الصف والمناهج التي خصصها المسؤول لحسابك.
        </p>
      </section>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="surface grid gap-4 p-5 lg:grid-cols-[1fr_1fr_2fr]">
        <label className="block space-y-2">
          <span className="form-label">الصف</span>
          <select
            className="form-input"
            value={gradeId}
            disabled={Boolean(teacherGradeId)}
            onChange={(event) => setGradeId(event.target.value)}
          >
            {gradeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {showTrack ? (
          <label className="block space-y-2">
            <span className="form-label">المسار</span>
            <select
              className="form-input"
              value={track}
              disabled={Boolean(teacherGradeId)}
              onChange={(event) => setTrack(event.target.value)}
              required
            >
              <option value="">اختر المسار</option>
              {trackOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="space-y-2">
          <span className="form-label">المناهج الخاصة بالصف</span>
          <div className="flex flex-wrap gap-2">
            {subjects.map((item) => (
              <button
                key={item}
                className={`rounded-lg border px-3 py-2 text-sm font-bold ${
                  item === subject
                    ? "border-learning-blue bg-blue-50 text-learning-blue"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
                type="button"
                onClick={() => setSubject(item)}
              >
                {item}
              </button>
            ))}
            {!subjects.length ? (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                لم يتم تخصيص مناهج لهذا المعلم بعد. حدّد الصف والمناهج من إدارة المعلمين.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <section className="space-y-4">
          <form className="surface space-y-4 p-5" onSubmit={handleSaveLesson}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BookOpen className="text-learning-blue" size={21} />
                <h2 className="text-lg font-black text-slate-950">
                  {editingLessonId ? "تعديل درس" : "إضافة درس"}
                </h2>
              </div>
              {editingLessonId ? (
                <button className="btn-secondary" type="button" onClick={resetLessonForm}>
                  <X size={16} />
                  إلغاء
                </button>
              ) : null}
            </div>
            <label className="block space-y-2">
              <span className="form-label">عنوان الدرس</span>
              <input
                className="form-input"
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="form-label">أهداف الدرس</span>
              <textarea
                className="form-input min-h-24"
                value={lessonObjectives}
                onChange={(event) => setLessonObjectives(event.target.value)}
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="form-label">حالة الدرس</span>
                <select
                  className="form-input"
                  value={lessonStatus}
                  onChange={(event) => setLessonStatus(event.target.value)}
                >
                  <option value="draft">مسودة</option>
                  <option value="published">منشور</option>
                </select>
              </label>
              <label className="block space-y-2">
                <span className="form-label">نمط التعلم</span>
                <select
                  className="form-input"
                  value={learningMode}
                  onChange={(event) => setLearningMode(event.target.value)}
                >
                  <option value="free">حر</option>
                  <option value="linear">خطي</option>
                </select>
              </label>
            </div>
            {learningMode === "linear" ? (
              <label className="block space-y-2">
                <span className="form-label">نسبة النجاح المطلوبة للانتقال</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  value={requiredProgress}
                  onChange={(event) => setRequiredProgress(event.target.value)}
                />
              </label>
            ) : null}
            <button
              className="btn-primary w-full"
              type="submit"
              disabled={saving || !subject || (showTrack && !track)}
            >
              {editingLessonId ? <Save size={18} /> : <Plus size={18} />}
              {editingLessonId ? "حفظ تعديل الدرس" : "إضافة درس"}
            </button>
          </form>

          <section className="surface p-5">
            <div className="space-y-3">
              <h2 className="text-lg font-black text-slate-950">دروس المنهاج</h2>
              <label className="relative block">
                <Search
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  size={16}
                />
                <input
                  className="form-input pr-9"
                  value={lessonSearch}
                  placeholder="بحث في الدروس"
                  onChange={(event) => setLessonSearch(event.target.value)}
                />
              </label>
              <select
                className="form-input"
                value={lessonStatusFilter}
                onChange={(event) => setLessonStatusFilter(event.target.value)}
              >
                <option value="all">كل الحالات</option>
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
              </select>
            </div>
            <div className="mt-4 space-y-2">
              {filteredLessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`rounded-lg border p-3 ${
                    lesson.id === selectedLesson?.id
                      ? "border-learning-blue bg-blue-50"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <button
                    className="w-full text-right text-sm font-bold text-slate-800"
                    type="button"
                    onClick={() => setLessonId(lesson.id)}
                  >
                    {formatCellValue(lesson.title)}
                  </button>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                    <span className="rounded-full bg-white px-2 py-1 text-slate-500">
                      {formatStatus(lesson.status)}
                    </span>
                    <span className="rounded-full bg-white px-2 py-1 text-learning-blue">
                      {lesson.learningMode === "linear" ? "خطي" : "حر"}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button className="btn-secondary" type="button" onClick={() => startEditLesson(lesson)}>
                      <Pencil size={16} />
                      تعديل
                    </button>
                    <button className="btn-secondary" type="button" onClick={() => deleteLesson(lesson)}>
                      <Trash2 size={16} />
                      حذف
                    </button>
                  </div>
                </div>
              ))}
              {!filteredLessons.length ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
                  لا توجد دروس لهذا الصف والمنهاج بعد.
                </p>
              ) : null}
            </div>
          </section>
        </section>

        <section className="space-y-4">
          {!quizMode && selectedLesson ? (
            <section className="surface p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold text-learning-blue">معاينة الطالب</p>
                  <h2 className="mt-1 text-lg font-black text-slate-950">
                    {formatCellValue(selectedLesson.title)}
                  </h2>
                </div>
                <button
                  className="btn-secondary"
                  type="button"
                  onClick={() => setPreviewOpen((value) => !value)}
                >
                  <Eye size={17} aria-hidden="true" />
                  {previewOpen ? "إخفاء المعاينة" : "معاينة الدرس"}
                </button>
              </div>
              {previewOpen ? (
                <div className="mt-4 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                  {lessonBlocks.filter((block) => block.status === "published").length
                    ? lessonBlocks
                        .filter((block) => block.status === "published")
                        .map(renderBlock)
                    : (
                      <p className="text-sm font-semibold text-slate-500">
                        لا توجد عناصر منشورة في هذا الدرس بعد.
                      </p>
                    )}
                </div>
              ) : null}
            </section>
          ) : null}

          {!quizMode ? (
          <>
          <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSaveBlock}>
            <div className="md:col-span-2 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-slate-950">
                  {editingBlockId ? "تعديل عنصر الدرس" : "إضافة عنصر للدرس"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedLesson
                    ? formatCellValue(selectedLesson.title)
                    : "اختر درسًا أو أضف درسًا جديدًا أولًا."}
                </p>
              </div>
              {editingBlockId ? (
                <button className="btn-secondary" type="button" onClick={resetBlockForm}>
                  <X size={16} />
                  إلغاء
                </button>
              ) : null}
            </div>

            <div className="md:col-span-2 flex flex-wrap gap-2">
              {blockTypes.map((item) => (
                <button
                  key={item.value}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-bold ${
                    blockType === item.value
                      ? "border-learning-blue bg-blue-50 text-learning-blue"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  type="button"
                  onClick={() => setBlockType(item.value)}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <label className="block space-y-2">
              <span className="form-label">عنوان العنصر</span>
              <input
                className="form-input"
                value={blockTitle}
                onChange={(event) => setBlockTitle(event.target.value)}
                required
              />
            </label>

            <label className="block space-y-2">
              <span className="form-label">حالة العنصر</span>
              <select
                className="form-input"
                value={blockStatus}
                onChange={(event) => setBlockStatus(event.target.value)}
              >
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
              </select>
            </label>

            {blockType !== "text" ? (
              <label className="block space-y-2">
                <span className="form-label">
                  {blockType === "image" ? "رابط الصورة" : "الرابط أو مسار الملف"}
                </span>
                <input
                  className="form-input"
                  value={blockUrl}
                  onChange={(event) => setBlockUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            ) : null}

            {blockType === "image" ? (
              <label className="block space-y-2 md:col-span-2">
                <span className="form-label">تحميل صورة من الجهاز</span>
                <input
                  className="form-input"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                />
                <span className="text-xs font-semibold text-slate-500">
                  يمكنك استخدام ملف من الجهاز أو وضع رابط مباشر للصورة.
                </span>
              </label>
            ) : null}

            <div className="block space-y-2 md:col-span-2">
              <span className="form-label">المحتوى أو الوصف</span>
              {blockType === "text" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <select
                      className="form-input h-10 w-36 py-1 text-sm"
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) {
                          applyRichTextValue("fontName", event.target.value);
                          event.target.value = "";
                        }
                      }}
                      title="نوع الخط"
                    >
                      <option value="">نوع الخط</option>
                      <option value="Arial">Arial</option>
                      <option value="Tahoma">Tahoma</option>
                      <option value="Times New Roman">Times New Roman</option>
                    </select>
                    <select
                      className="form-input h-10 w-32 py-1 text-sm"
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) {
                          applyRichTextValue("fontSize", event.target.value);
                          event.target.value = "";
                        }
                      }}
                      title="حجم الخط"
                    >
                      <option value="">حجم الخط</option>
                      <option value="2">صغير</option>
                      <option value="3">عادي</option>
                      <option value="5">كبير</option>
                      <option value="7">كبير جدًا</option>
                    </select>
                    <select
                      className="form-input h-10 w-32 py-1 text-sm"
                      defaultValue=""
                      onChange={(event) => {
                        if (event.target.value) {
                          applyRichTextValue("formatBlock", event.target.value);
                          event.target.value = "";
                        }
                      }}
                      title="نمط النص"
                    >
                      <option value="">نمط النص</option>
                      <option value="p">فقرة</option>
                      <option value="h2">عنوان كبير</option>
                      <option value="h3">عنوان فرعي</option>
                    </select>
                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                      لون الخط
                      <input
                        className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                        type="color"
                        defaultValue="#0f172a"
                        onInput={(event) =>
                          applyRichTextColor("foreColor", event.currentTarget.value)
                        }
                      />
                    </label>
                    <label className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700">
                      الخلفية
                      <input
                        className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                        type="color"
                        defaultValue="#ffffff"
                        onInput={(event) =>
                          applyRichTextColor("hiliteColor", event.currentTarget.value)
                        }
                      />
                    </label>
                    {[
                      { command: "bold", label: "B" },
                      { command: "italic", label: "I" },
                      { command: "underline", label: "U" },
                      { command: "justifyRight", label: "يمين" },
                      { command: "justifyCenter", label: "وسط" },
                      { command: "insertOrderedList", label: "1." },
                      { command: "insertUnorderedList", label: "•" },
                    ].map((item) => (
                      <button
                        key={item.command}
                        className="btn-secondary h-10 min-w-10 px-3"
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyRichTextCommand(item.command)}
                        title={item.command}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <div
                    className="form-input min-h-32 text-right leading-8"
                    dir="rtl"
                    style={{ unicodeBidi: "plaintext" }}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={(event) => setBlockContent(event.currentTarget.innerHTML)}
                    dangerouslySetInnerHTML={{ __html: blockContent }}
                  />
                </div>
              ) : (
                <textarea
                  className="form-input min-h-28"
                  value={blockContent}
                  onChange={(event) => setBlockContent(event.target.value)}
                />
              )}
            </div>

            <button
              className="btn-primary md:col-span-2"
              type="submit"
              disabled={saving}
            >
              {editingBlockId ? <Save size={18} /> : <Plus size={18} />}
              {editingBlockId ? "حفظ تعديل العنصر" : "إضافة عنصر"}
            </button>
          </form>

          <div className="grid gap-3">
            {lessonBlocks.map((block, index) => (
              <article key={block.id} className="surface p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-learning-blue">
                      {formatCellValue(block.type)}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {index + 1}. {formatCellValue(block.title)}
                    </h3>
                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500">
                      {formatStatus(block.status)}
                    </span>
                    {block.type === "image" && block.url ? (
                      <img
                        className="mt-3 max-h-72 w-full rounded-lg border border-slate-200 object-contain"
                        src={String(block.url)}
                        alt={String(block.title ?? "صورة الدرس")}
                      />
                    ) : null}
                    {block.type === "text" ? (
                      <div
                        className="lesson-rich-text mt-3 max-w-none text-right leading-8"
                        dir="rtl"
                        style={{ unicodeBidi: "plaintext" }}
                        dangerouslySetInnerHTML={{ __html: String(block.content ?? "") }}
                      />
                    ) : (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                        {formatCellValue(block.content)}
                      </p>
                    )}
                    {block.url && block.type !== "image" ? (
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
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-secondary" type="button" title="رفع" onClick={() => moveBlock(block, -1)}>
                      <ArrowUp size={16} />
                    </button>
                    <button className="btn-secondary" type="button" title="خفض" onClick={() => moveBlock(block, 1)}>
                      <ArrowDown size={16} />
                    </button>
                    <button className="btn-secondary" type="button" title="تعديل" onClick={() => startEditBlock(block)}>
                      <Pencil size={16} />
                    </button>
                    <button className="btn-secondary" type="button" title="حذف" onClick={() => deleteBlock(block)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          </>
          ) : null}

          {quizMode && selectedLesson ? (
            <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleSaveQuestion}>
              <div className="md:col-span-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="text-learning-blue" size={21} />
                  <h2 className="text-lg font-black text-slate-950">بنك أسئلة الدرس</h2>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  اربط أسئلة اختيار من متعدد بالدرس الحالي لاستخدامها في الاختبار.
                </p>
              </div>
              <label className="block space-y-2">
                <span className="form-label">عنوان الاختبار</span>
                <input
                  className="form-input"
                  value={quizTitle}
                  placeholder={`اختبار ${formatCellValue(selectedLesson.title)}`}
                  onChange={(event) => setQuizTitle(event.target.value)}
                />
              </label>
              <label className="block space-y-2">
                <span className="form-label">درجة النجاح</span>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  max="100"
                  value={quizPassingScore}
                  onChange={(event) => setQuizPassingScore(event.target.value)}
                />
              </label>
              <label className="block space-y-2 md:col-span-2">
                <span className="form-label">نص السؤال</span>
                <textarea
                  className="form-input min-h-20"
                  value={questionText}
                  onChange={(event) => setQuestionText(event.target.value)}
                />
              </label>
              {answerOptions.map((answer, index) => (
                <label key={index} className="block space-y-2">
                  <span className="form-label">الخيار {index + 1}</span>
                  <div className="flex gap-2">
                    <input
                      className="form-input"
                      value={answer}
                      onChange={(event) =>
                        setAnswerOptions((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? event.target.value : item,
                          ),
                        )
                      }
                    />
                    <label className="btn-secondary cursor-pointer">
                      <input
                        type="radio"
                        name="correct-answer"
                        checked={correctAnswerIndex === index}
                        onChange={() => setCorrectAnswerIndex(index)}
                      />
                      صحيح
                    </label>
                  </div>
                </label>
              ))}
              <button className="btn-primary md:col-span-2" type="submit" disabled={saving}>
                <CheckCircle2 size={18} />
                إضافة السؤال
              </button>
              <div className="md:col-span-2 space-y-2">
                {selectedQuizQuestions.map((question) => (
                  <div key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-bold text-slate-800">
                      {formatCellValue(question.questionText)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {options.filter((option) => option.questionId === question.id).length} خيارات
                    </p>
                  </div>
                ))}
              </div>
            </form>
          ) : null}
        </section>
      </div>
    </div>
  );
}
