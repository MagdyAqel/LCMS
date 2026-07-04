import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  FileText,
  Image,
  Link as LinkIcon,
  Pencil,
  Plus,
  Save,
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

export function LessonBuilderPage() {
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
  const [editingBlockId, setEditingBlockId] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("text");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockContent, setBlockContent] = useState("");
  const [blockUrl, setBlockUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const teacherGradeId = String(teacherProfile?.gradeId ?? "");
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

    return () => {
      lessonUnsub();
      blockUnsub();
    };
  }, [appUser]);

  const filteredLessons = useMemo(
    () =>
      lessons
        .filter((lesson) => {
          const lessonGrade = String(lesson.gradeId ?? "");
          const lessonTrack = String(lesson.track ?? "");
          const lessonSubject = String(lesson.subject ?? "");
          return (
            lessonGrade === gradeId &&
            lessonSubject === subject &&
            (!showTrack || lessonTrack === track)
          );
        })
        .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)),
    [gradeId, lessons, showTrack, subject, track],
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

  useEffect(() => {
    setLessonId(selectedLesson?.id ?? "");
  }, [selectedLesson?.id]);

  function resetLessonForm() {
    setEditingLessonId("");
    setLessonTitle("");
    setLessonObjectives("");
  }

  function resetBlockForm() {
    setEditingBlockId("");
    setBlockType("text");
    setBlockTitle("");
    setBlockContent("");
    setBlockUrl("");
    setImageFile(null);
  }

  function startEditLesson(lesson: AppRecord) {
    setEditingLessonId(lesson.id);
    setLessonTitle(String(lesson.title ?? ""));
    setLessonObjectives(String(lesson.objectives ?? ""));
  }

  function startEditBlock(block: AppRecord) {
    setEditingBlockId(block.id);
    setBlockType(String(block.type ?? "text") as BlockType);
    setBlockTitle(String(block.title ?? ""));
    setBlockContent(String(block.content ?? ""));
    setBlockUrl(String(block.url ?? block.filePath ?? ""));
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
        status: "published",
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

    if (!appUser || !selectedLesson || !blockTitle.trim()) {
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
        status: "active",
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
            <h2 className="text-lg font-black text-slate-950">دروس المنهاج</h2>
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

            <label className="block space-y-2 md:col-span-2">
              <span className="form-label">المحتوى أو الوصف</span>
              <textarea
                className="form-input min-h-28"
                value={blockContent}
                onChange={(event) => setBlockContent(event.target.value)}
              />
            </label>

            <button
              className="btn-primary md:col-span-2"
              type="submit"
              disabled={saving || !selectedLesson}
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
                    {block.type === "image" && block.url ? (
                      <img
                        className="mt-3 max-h-72 w-full rounded-lg border border-slate-200 object-contain"
                        src={String(block.url)}
                        alt={String(block.title ?? "صورة الدرس")}
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
        </section>
      </div>
    </div>
  );
}
