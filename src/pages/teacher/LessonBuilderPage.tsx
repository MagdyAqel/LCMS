import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  FileText,
  Image,
  Link as LinkIcon,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  getSubjectsForGrade,
  gradeOptions,
  requiresTrack,
  trackOptions,
} from "../../data/curriculumCatalog";
import { useAuth } from "../../context/AuthContext";
import {
  createRecord,
  removeRecord,
  subscribeToRecords,
  updateRecord,
  type AppRecord,
} from "../../services/records";
import { formatCellValue } from "../../utils/format";

type BlockType = "text" | "image" | "youtube" | "externalLink" | "file";

const blockTypes: Array<{
  value: BlockType;
  label: string;
  icon: ReactNode;
}> = [
  { value: "text", label: "??", icon: <FileText size={18} /> },
  { value: "image", label: "????", icon: <Image size={18} /> },
  { value: "youtube", label: "??????", icon: <Video size={18} /> },
  { value: "externalLink", label: "???? ?????", icon: <LinkIcon size={18} /> },
  { value: "file", label: "???", icon: <FileText size={18} /> },
];

export function LessonBuilderPage() {
  const { appUser } = useAuth();
  const [lessons, setLessons] = useState<AppRecord[]>([]);
  const [blocks, setBlocks] = useState<AppRecord[]>([]);
  const [gradeId, setGradeId] = useState("1");
  const [track, setTrack] = useState("");
  const [subject, setSubject] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonObjectives, setLessonObjectives] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("text");
  const [blockTitle, setBlockTitle] = useState("");
  const [blockContent, setBlockContent] = useState("");
  const [blockUrl, setBlockUrl] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const showTrack = requiresTrack(gradeId);
  const subjects = useMemo(
    () => getSubjectsForGrade(gradeId, showTrack ? track : ""),
    [gradeId, showTrack, track],
  );

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

  async function handleCreateLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !lessonTitle.trim() || !subject) {
      return;
    }

    const id = await createRecord(
      "lessons",
      {
        title: lessonTitle.trim(),
        objectives: lessonObjectives.trim(),
        gradeId,
        track: showTrack ? track : "",
        subject,
        order: filteredLessons.length + 1,
        status: "published",
        teacherId: appUser.uid,
      },
      appUser,
    );

    setLessonId(id);
    setLessonTitle("");
    setLessonObjectives("");
    setNotice("??? ????? ?????.");
  }

  async function handleCreateBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || !selectedLesson || !blockTitle.trim()) {
      return;
    }

    await createRecord(
      "lessonBlocks",
      {
        lessonId: selectedLesson.id,
        teacherId: appUser.uid,
        type: blockType,
        title: blockTitle.trim(),
        content: blockContent.trim(),
        url: blockType === "text" ? "" : blockUrl.trim(),
        filePath: blockType === "file" ? blockUrl.trim() : "",
        order: lessonBlocks.length + 1,
        status: "active",
      },
      appUser,
    );

    setBlockTitle("");
    setBlockContent("");
    setBlockUrl("");
    setNotice("??? ????? ???? ?????.");
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

  async function deleteBlock(block: AppRecord) {
    if (!appUser) {
      return;
    }

    await removeRecord("lessonBlocks", block.id, appUser);
    setNotice("?? ??? ??????.");
  }

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-bold text-learning-blue">Teacher</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">????? ?????</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          ???? ???? ?????? ?? ??????? ????? ??? ?????? ???? ????? ???????.
        </p>
      </section>

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      <section className="surface grid gap-4 p-5 lg:grid-cols-[1fr_1fr_2fr]">
        <label className="block space-y-2">
          <span className="form-label">????</span>
          <select
            className="form-input"
            value={gradeId}
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
            <span className="form-label">??????</span>
            <select
              className="form-input"
              value={track}
              onChange={(event) => setTrack(event.target.value)}
              required
            >
              <option value="">???? ??????</option>
              {trackOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="space-y-2">
          <span className="form-label">??????? ?????? ?????</span>
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
                ???? ?????? ???? ????? ????.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(280px,380px)_1fr]">
        <section className="space-y-4">
          <form className="surface space-y-4 p-5" onSubmit={handleCreateLesson}>
            <div className="flex items-center gap-2">
              <BookOpen className="text-learning-blue" size={21} />
              <h2 className="text-lg font-black text-slate-950">????? ???</h2>
            </div>
            <label className="block space-y-2">
              <span className="form-label">????? ?????</span>
              <input
                className="form-input"
                value={lessonTitle}
                onChange={(event) => setLessonTitle(event.target.value)}
                required
              />
            </label>
            <label className="block space-y-2">
              <span className="form-label">????? ?????</span>
              <textarea
                className="form-input min-h-24"
                value={lessonObjectives}
                onChange={(event) => setLessonObjectives(event.target.value)}
              />
            </label>
            <button
              className="btn-primary w-full"
              type="submit"
              disabled={!subject || (showTrack && !track)}
            >
              <Plus size={18} />
              ????? ???
            </button>
          </form>

          <section className="surface p-5">
            <h2 className="text-lg font-black text-slate-950">???? ???????</h2>
            <div className="mt-4 space-y-2">
              {filteredLessons.map((lesson) => (
                <button
                  key={lesson.id}
                  className={`w-full rounded-lg border px-3 py-3 text-right text-sm font-bold ${
                    lesson.id === selectedLesson?.id
                      ? "border-learning-blue bg-blue-50 text-learning-blue"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  type="button"
                  onClick={() => setLessonId(lesson.id)}
                >
                  {formatCellValue(lesson.title)}
                </button>
              ))}
              {!filteredLessons.length ? (
                <p className="rounded-lg bg-slate-50 px-3 py-4 text-sm font-semibold text-slate-500">
                  ?? ???? ???? ???? ???? ???????? ???.
                </p>
              ) : null}
            </div>
          </section>
        </section>

        <section className="space-y-4">
          <form className="surface grid gap-4 p-5 md:grid-cols-2" onSubmit={handleCreateBlock}>
            <div className="md:col-span-2">
              <h2 className="text-lg font-black text-slate-950">????? ???? ?????</h2>
              <p className="mt-1 text-sm text-slate-500">
                {selectedLesson
                  ? formatCellValue(selectedLesson.title)
                  : "???? ????? ?? ??? ????? ?????? ?????."}
              </p>
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
              <span className="form-label">????? ??????</span>
              <input
                className="form-input"
                value={blockTitle}
                onChange={(event) => setBlockTitle(event.target.value)}
                required
              />
            </label>

            {blockType !== "text" ? (
              <label className="block space-y-2">
                <span className="form-label">?????? ?? ???? ?????</span>
                <input
                  className="form-input"
                  value={blockUrl}
                  onChange={(event) => setBlockUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            ) : null}

            <label className="block space-y-2 md:col-span-2">
              <span className="form-label">??????? ?? ?????</span>
              <textarea
                className="form-input min-h-28"
                value={blockContent}
                onChange={(event) => setBlockContent(event.target.value)}
              />
            </label>

            <button
              className="btn-primary md:col-span-2"
              type="submit"
              disabled={!selectedLesson}
            >
              <Plus size={18} />
              ????? ????
            </button>
          </form>

          <div className="grid gap-3">
            {lessonBlocks.map((block, index) => (
              <article key={block.id} className="surface p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold text-learning-blue">
                      {formatCellValue(block.type)}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-slate-950">
                      {index + 1}. {formatCellValue(block.title)}
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {formatCellValue(block.content)}
                    </p>
                    {block.url ? (
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
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary"
                      type="button"
                      title="???"
                      onClick={() => moveBlock(block, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      title="???"
                      onClick={() => moveBlock(block, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="btn-secondary"
                      type="button"
                      title="???"
                      onClick={() => deleteBlock(block)}
                    >
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
