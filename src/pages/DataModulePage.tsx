import {
  Archive,
  Database,
  Download,
  FileInput,
  Plus,
  Save,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
import {
  getStageCatalog,
  getSubjectsForGrade,
  gradeOptions,
  requiresTrack,
  trackOptions,
} from "../data/curriculumCatalog";
import type { FormField, ModuleConfig } from "../data/moduleConfigs";
import { getFieldLabel } from "../data/moduleConfigs";
import {
  archiveRecord,
  createRecord,
  createRecordWithId,
  removeRecord,
  subscribeToRecords,
  updateRecord,
  type AppRecord,
} from "../services/records";
import { createManagedAccount } from "../services/accounts";
import { createSearchText, formatCellValue } from "../utils/format";
import { exportRecordsToWorkbook, readWorkbookRows } from "../utils/excel";

type ReferenceMap = Record<string, AppRecord[]>;

const teacherOwnedReferenceCollections = new Set([
  "students",
  "teacherCourses",
  "lessons",
  "lessonBlocks",
  "quizzes",
]);

function getInitialValue(field: FormField) {
  if (field.type === "multiselect") {
    return [];
  }

  if (field.type === "checkbox") {
    return false;
  }

  if (field.type === "number") {
    return "";
  }

  if (field.type === "select") {
    return field.options?.[0]?.value ?? "";
  }

  return "";
}

function getDefaultFormValues(fields: FormField[]) {
  return fields.reduce<Record<string, unknown>>((values, field) => {
    values[field.key] = getInitialValue(field);
    return values;
  }, {});
}

function normalizeForSave(fields: FormField[], values: Record<string, unknown>) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    const value = values[field.key];

    if (field.type === "number") {
      payload[field.key] = value === "" || value === undefined ? 0 : Number(value);
      return payload;
    }

    if (field.type === "checkbox") {
      payload[field.key] = Boolean(value);
      return payload;
    }

    if (field.type === "multiselect") {
      const items = Array.isArray(value)
        ? value
        : String(value ?? "")
            .split(",")
            .map((item) => item.trim());
      payload[field.key] = uniqueStrings(items);
      return payload;
    }

    payload[field.key] = typeof value === "string" ? value.trim() : value ?? "";
    return payload;
  }, {});
}

function getReferenceCollections(config: ModuleConfig) {
  const collections = Array.from(
    new Set(
      config.formFields
        .map((field) => field.reference?.collection)
        .filter((value): value is string => Boolean(value)),
    ),
  );

  if (config.collection === "educationalStages") {
    return Array.from(new Set([...collections, "curriculums", "teachers"]));
  }

  return collections;
}

function resolveReferenceValue(
  field: FormField | undefined,
  value: unknown,
  references: ReferenceMap,
) {
  if (!field?.reference || !value) {
    const option = field?.options?.find((item) => item.value === String(value));
    if (option) {
      return option.label;
    }

    return formatCellValue(value);
  }

  const record = references[field.reference.collection]?.find(
    (item) => item.id === value || item[field.key] === value,
  );

  return formatCellValue(record?.[field.reference.labelKey] ?? value);
}

function mapImportedRow(row: Record<string, unknown>, fields: FormField[]) {
  return fields.reduce<Record<string, unknown>>((payload, field) => {
    payload[field.key] = row[field.label] ?? row[field.key] ?? getInitialValue(field);
    return payload;
  }, {});
}

function getVisibleFormFields(
  fields: FormField[],
  editing: boolean,
  values: Record<string, unknown>,
) {
  return fields.filter((field) => {
    if (editing && field.hiddenOnEdit) {
      return false;
    }

    if (!editing && field.hiddenOnCreate) {
      return false;
    }

    if (field.key === "track") {
      return requiresTrack(values.gradeId);
    }

    if (field.key === "curriculumSubject" || field.key === "teachingSubjects") {
      const gradeId = String(values.gradeId ?? "");
      const track = String(values.track ?? "");
      return Boolean(gradeId) && (!requiresTrack(gradeId) || Boolean(track));
    }

    return true;
  });
}

function getDynamicFieldOptions(field: FormField, values: Record<string, unknown>) {
  if (field.key !== "curriculumSubject" && field.key !== "teachingSubjects") {
    return null;
  }

  return getSubjectsForGrade(values.gradeId, values.track).map((subject) => ({
    label: subject,
    value: subject,
  }));
}

function getManagedRole(collectionName: string) {
  if (collectionName === "teachers") {
    return "teacher" as const;
  }

  if (collectionName === "students") {
    return "student" as const;
  }

  return null;
}

function uniqueStrings(values: unknown[]) {
  return Array.from(
    new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map((value) => String(value ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export function DataModulePage({ config }: { config: ModuleConfig }) {
  const { appUser } = useAuth();
  const [records, setRecords] = useState<AppRecord[]>([]);
  const [references, setReferences] = useState<ReferenceMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AppRecord | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>(
    getDefaultFormValues(config.formFields),
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [importRows, setImportRows] = useState<Array<Record<string, unknown>>>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [teacherProfile, setTeacherProfile] = useState<AppRecord | null>(null);
  const [systemSettings, setSystemSettings] = useState<AppRecord[]>([]);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToRecords(
      config.collection,
      appUser,
      config.scope,
      (items) => {
        setRecords(items);
        setLoading(false);
      },
      () => {
        setError("تعذر تحميل البيانات. تأكد من نشر قواعد Firestore وصلاحية الحساب.");
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [appUser, config.collection, config.scope]);

  useEffect(() => {
    if (!appUser || appUser.role !== "teacher" || config.collection !== "students") {
      setSystemSettings([]);
      return;
    }

    return subscribeToRecords(
      "systemSettings",
      appUser,
      { type: "all" },
      setSystemSettings,
      () => setSystemSettings([]),
    );
  }, [appUser, config.collection]);

  useEffect(() => {
    if (!appUser || appUser.role !== "teacher" || config.collection !== "students") {
      setTeacherProfile(null);
      return;
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
  }, [appUser, config.collection]);

  useEffect(() => {
    if (!appUser) {
      return;
    }

    const unsubs: Unsubscribe[] = [];

    for (const collectionName of getReferenceCollections(config)) {
      const constraints =
        appUser.role === "teacher" &&
        teacherOwnedReferenceCollections.has(collectionName)
          ? collectionName === "students"
            ? [where("teacherIds", "array-contains", appUser.uid)]
            : [where("teacherId", "==", appUser.uid)]
          : [];

      const refQuery = constraints.length
        ? query(collection(db, collectionName), ...constraints)
        : query(collection(db, collectionName));

      unsubs.push(
        onSnapshot(refQuery, (snapshot) => {
          setReferences((current) => ({
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
  }, [appUser, config]);

  const filteredRecords = useMemo(() => {
    const needle = search.trim().toLowerCase();

    return records.filter((record) => {
      const statusMatch =
        statusFilter === "all" || String(record.status ?? "") === statusFilter;
      const searchMatch = !needle || createSearchText(record).includes(needle);
      return statusMatch && searchMatch;
    });
  }, [records, search, statusFilter]);

  const visibleFormFields = useMemo(
    () => getVisibleFormFields(config.formFields, Boolean(editing), formValues),
    [config.formFields, editing, formValues],
  );
  const showStudentPasswordsToTeachers = useMemo(() => {
    const setting = systemSettings.find(
      (item) => String(item.key ?? "") === "showStudentPasswordsToTeachers",
    );
    return String(setting?.value ?? "false").trim().toLowerCase() === "true";
  }, [systemSettings]);
  const tableFields = useMemo(() => {
    if (
      config.collection === "students" &&
      appUser?.role === "teacher" &&
      !showStudentPasswordsToTeachers
    ) {
      return config.tableFields.filter((field) => field !== "password");
    }

    return config.tableFields;
  }, [appUser?.role, config.collection, config.tableFields, showStudentPasswordsToTeachers]);

  const teacherStudentSubjects = useMemo(() => {
    if (config.collection !== "students" || appUser?.role !== "teacher") {
      return [];
    }

    const subjects = teacherProfile?.teachingSubjects;
    return Array.isArray(subjects)
      ? subjects.map((item) => String(item ?? "").trim()).filter(Boolean)
      : [];
  }, [appUser?.role, config.collection, teacherProfile?.teachingSubjects]);

  useEffect(() => {
    if (
      editing ||
      config.collection !== "students" ||
      appUser?.role !== "teacher" ||
      !teacherProfile
    ) {
      return;
    }

    const teacherGradeId = String(teacherProfile.gradeId ?? "");
    const teacherTrack = requiresTrack(teacherGradeId)
      ? String(teacherProfile.track ?? "")
      : "";
    const teacherSubjects = Array.isArray(teacherProfile.teachingSubjects)
      ? teacherProfile.teachingSubjects
          .map((item) => String(item ?? "").trim())
          .filter(Boolean)
      : [];

    setFormValues((current) => ({
      ...current,
      gradeId: teacherGradeId,
      track: teacherTrack,
      curriculumSubject: teacherSubjects.includes(String(current.curriculumSubject ?? ""))
        ? current.curriculumSubject
        : teacherSubjects[0] ?? "",
    }));
  }, [appUser?.role, config.collection, editing, teacherProfile]);

  function startCreate() {
    setEditing(null);
    const defaults = getDefaultFormValues(config.formFields);

    if (config.collection === "students" && appUser?.role === "teacher" && teacherProfile) {
      const gradeId = String(teacherProfile.gradeId ?? "");
      const track = requiresTrack(gradeId) ? String(teacherProfile.track ?? "") : "";
      const teacherSubjects = Array.isArray(teacherProfile.teachingSubjects)
        ? teacherProfile.teachingSubjects
            .map((item) => String(item ?? "").trim())
            .filter(Boolean)
        : [];

      defaults.gradeId = gradeId;
      defaults.track = track;
      defaults.curriculumSubject = teacherSubjects[0] ?? "";
    }

    setFormValues(defaults);
    setError(null);
    setNotice(null);
  }

  function startEdit(record: AppRecord) {
    setEditing(record);
    setFormValues(
      config.formFields.reduce<Record<string, unknown>>((values, field) => {
        values[field.key] = record[field.key] ?? getInitialValue(field);
        return values;
      }, {}),
    );
    setError(null);
    setNotice(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!appUser || config.mode === "readonly") {
      return;
    }

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const payload = normalizeForSave(visibleFormFields, formValues);
      const managedRole = getManagedRole(config.collection);

      if (config.collection === "students" && appUser.role === "teacher" && teacherProfile) {
        const teacherGradeId = String(teacherProfile.gradeId ?? "");
        const teacherTrack = requiresTrack(teacherGradeId)
          ? String(teacherProfile.track ?? "")
          : "";
        const teacherSubjects = Array.isArray(teacherProfile.teachingSubjects)
          ? teacherProfile.teachingSubjects
              .map((item) => String(item ?? "").trim())
              .filter(Boolean)
          : [];

        payload.gradeId = teacherGradeId;
        payload.track = teacherTrack;

        if (!teacherSubjects.includes(String(payload.curriculumSubject ?? ""))) {
          payload.curriculumSubject = teacherSubjects[0] ?? "";
        }
      }

      if (!editing && managedRole) {
        const password = String(formValues.password ?? "");
        const confirmPassword = String(formValues.confirmPassword ?? "");

        if (!password) {
          throw new Error("كلمة المرور مطلوبة عند إنشاء الحساب.");
        }

        if (
          visibleFormFields.some((field) => field.key === "confirmPassword") &&
          password !== confirmPassword
        ) {
          throw new Error("كلمة المرور وتأكيدها غير متطابقين.");
        }
      }

      delete payload.confirmPassword;

      if (!requiresTrack(payload.gradeId)) {
        payload.track = "";
      } else if (!payload.track) {
        throw new Error("اختر المسار للصف الحادي عشر أو الثاني عشر قبل الحفظ.");
      }

      if (config.collection === "students") {
        payload.status = String(payload.status ?? "") || "active";
        const allowedSubjects = getSubjectsForGrade(payload.gradeId, payload.track);
        if (!payload.curriculumSubject) {
          throw new Error("اختر المنهاج المرتبط بصف الطالب قبل الحفظ.");
        }

        if (
          payload.curriculumSubject &&
          !allowedSubjects.includes(String(payload.curriculumSubject))
        ) {
          throw new Error("المنهاج المختار لا يتبع صف الطالب. اختر منهاجًا من القائمة بعد تحديد الصف.");
        }
      }

      if (config.collection === "teachers") {
        const allowedSubjects = getSubjectsForGrade(payload.gradeId, payload.track);
        const selectedSubjects = uniqueStrings(
          Array.isArray(payload.teachingSubjects)
            ? payload.teachingSubjects
            : [payload.teachingSubjects],
        );

        if (!selectedSubjects.length) {
          throw new Error("اختر منهجًا واحدًا على الأقل للمعلم من القائمة الثابتة.");
        }

        if (selectedSubjects.some((item) => !allowedSubjects.includes(item))) {
          throw new Error("يوجد منهاج لا يتبع الصف أو المسار المحدد للمعلم.");
        }

        payload.teachingSubjects = selectedSubjects;
      }

      if (typeof payload.studentIds === "string") {
        payload.studentIds = payload.studentIds
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean);
      }

      if (config.ownerField && !editing) {
        payload[config.ownerField] = appUser.uid;
      }

      if (config.collection === "notifications") {
        payload.senderRole = appUser.role;
      }

      if (config.collection === "messages" && !editing) {
        payload.senderId = appUser.uid;
      }

      if (config.collection === "students" && appUser.role === "teacher") {
        const existingTeacherIds = editing?.teacherIds ?? editing?.teacherId ?? [];
        const existingTeacherNames = editing?.teacherNames ?? editing?.teacherName ?? [];
        const teacherName = String(
          teacherProfile?.fullName ?? teacherProfile?.displayName ?? appUser.displayName ?? "",
        );
        payload.teacherId = String(editing?.teacherId ?? payload.teacherId ?? appUser.uid);
        payload.teacherIds = uniqueStrings([existingTeacherIds, payload.teacherId, appUser.uid]);
        payload.teacherName = String(editing?.teacherName ?? teacherName);
        payload.teacherNames = uniqueStrings([existingTeacherNames, payload.teacherName]);
      }

      if (config.collection === "teachers" && editing && !payload.password) {
        delete payload.password;
      }

      if (editing) {
        await updateRecord(config.collection, editing.id, payload, appUser);
        setNotice("تم تحديث السجل بنجاح.");
      } else {
        if (managedRole) {
          const password = String(formValues.password ?? "");
          const displayName = String(payload.fullName ?? payload.name ?? "");
          const contactEmail = String(payload.email ?? "");
          const account = await createManagedAccount({
            username: String(payload.username ?? ""),
            password,
            displayName,
            role: managedRole,
            createdBy: appUser,
            contactEmail,
            disabled: payload.status === "inactive",
          });

          if (config.collection !== "teachers" && config.collection !== "students") {
            delete payload.password;
          }
          payload.username = account.username;
          payload.userId = account.uid;
          payload.authEmail = account.email;

          if (config.collection === "teachers") {
            payload.teacherId = account.uid;
          }

          if (config.collection === "students") {
            payload.studentId = account.uid;
          }

          await createRecordWithId(config.collection, account.uid, payload, appUser);
        } else {
          await createRecord(config.collection, payload, appUser);
        }
        setNotice("تمت إضافة السجل بنجاح.");
      }

      startCreate();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "تعذر حفظ البيانات. راجع الحقول والصلاحيات.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(record: AppRecord) {
    if (!appUser) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (record.status && record.status !== "archived") {
        await archiveRecord(config.collection, record.id, appUser);
        setNotice("تمت أرشفة السجل.");
      } else {
        await removeRecord(config.collection, record.id, appUser);
        setNotice("تم حذف السجل.");
      }
    } catch {
      setError("تعذر تنفيذ العملية.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeed() {
    if (!appUser || !config.seedRecords?.length) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      for (const seed of config.seedRecords) {
        const exists = records.some(
          (record) => String(record.name) === String(seed.name),
        );

        if (!exists) {
          await createRecord(config.collection, seed, appUser);
        }
      }

      setNotice("تمت إضافة البيانات الأساسية غير الموجودة.");
    } catch {
      setError("تعذر إضافة البيانات الأساسية.");
    } finally {
      setSaving(false);
    }
  }

  async function handleImportFile(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setNotice(null);

    const rows = await readWorkbookRows(file);
    const mapped = rows.map((row) => mapImportedRow(row, config.formFields));
    const errors: string[] = [];
    const existingIds = new Set(records.map((record) => String(record.nationalId)));

    mapped.forEach((row, index) => {
      if (!row.fullName) {
        errors.push(`السطر ${index + 2}: الاسم الكامل مطلوب.`);
      }

      if (!row.nationalId) {
        errors.push(`السطر ${index + 2}: رقم الهوية مطلوب.`);
      }

      if (config.collection === "students" && !row.username) {
        errors.push(`السطر ${index + 2}: اسم المستخدم مطلوب.`);
      }

      if (config.collection === "students" && !row.password) {
        errors.push(`السطر ${index + 2}: كلمة المرور الأولية مطلوبة.`);
      }

      if (row.nationalId && existingIds.has(String(row.nationalId))) {
        errors.push(`السطر ${index + 2}: رقم الهوية مكرر.`);
      }
    });

    setImportRows(mapped);
    setImportErrors(errors);
  }

  async function commitImport() {
    if (!appUser || importErrors.length) {
      return;
    }

    setSaving(true);

    try {
      for (const row of importRows) {
        const payload = normalizeForSave(config.formFields, row);
        delete payload.confirmPassword;

        if (typeof payload.studentIds === "string") {
          payload.studentIds = payload.studentIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
        if (config.ownerField) {
          payload[config.ownerField] = appUser.uid;
        }

        if (config.collection === "students" && appUser.role === "teacher") {
          payload.teacherId = String(payload.teacherId ?? appUser.uid);
          payload.teacherIds = uniqueStrings([payload.teacherId, appUser.uid]);
        }

        const managedRole = getManagedRole(config.collection);

        if (managedRole && payload.username && row.password) {
          const account = await createManagedAccount({
            username: String(payload.username),
            password: String(row.password),
            displayName: String(payload.fullName ?? payload.name ?? ""),
            role: managedRole,
            createdBy: appUser,
            contactEmail: String(payload.email ?? ""),
            disabled: payload.status === "inactive",
          });

          if (config.collection !== "teachers" && config.collection !== "students") {
            delete payload.password;
          }
          payload.username = account.username;
          payload.userId = account.uid;
          payload.authEmail = account.email;

          if (config.collection === "teachers") {
            payload.teacherId = account.uid;
          }

          if (config.collection === "students") {
            payload.studentId = account.uid;
          }

          await createRecordWithId(config.collection, account.uid, payload, appUser);
        } else {
          delete payload.password;
          await createRecord(config.collection, payload, appUser);
        }
      }

      setNotice(`تم استيراد ${importRows.length} سجل.`);
      setImportRows([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذر اعتماد الاستيراد.");
    } finally {
      setSaving(false);
    }
  }

  const columns = tableFields.map((key) => ({
    key,
    label: getFieldLabel(config, key),
  }));

  const stageCatalogRecords =
    config.collection === "educationalStages" && filteredRecords.length === 0
      ? ([
          {
            id: "basic-lower",
            name: "المرحلة الأساسية الدنيا",
            status: "active",
          },
          {
            id: "basic-upper",
            name: "المرحلة الأساسية العليا",
            status: "active",
          },
          {
            id: "secondary",
            name: "المرحلة الثانوية",
            status: "active",
          },
        ] satisfies AppRecord[])
      : filteredRecords;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-bold text-learning-blue">{config.collection}</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">
            {config.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {config.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {config.seedRecords?.length ? (
            <button
              className="btn-secondary"
              type="button"
              onClick={handleSeed}
              disabled={saving}
            >
              <Database size={17} aria-hidden="true" />
              إضافة البيانات الأساسية
            </button>
          ) : null}
          <button
            className="btn-secondary"
            type="button"
            onClick={() =>
              exportRecordsToWorkbook(config.collection, filteredRecords, columns)
            }
          >
            <Download size={17} aria-hidden="true" />
            تصدير Excel
          </button>
        </div>
      </section>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
          {notice}
        </div>
      ) : null}

      {config.mode === "import" ? (
        <section className="surface p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                استيراد ملف Excel
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                يجب أن يحتوي الملف على أعمدة مطابقة للحقول: الاسم الكامل، رقم
                الهوية، الصف، المنهاج، رقم الواتس، البريد الإلكتروني.
              </p>
            </div>
            <label className="btn-primary cursor-pointer">
              <FileInput size={18} aria-hidden="true" />
              اختيار ملف
              <input
                className="hidden"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(event) => handleImportFile(event.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {importErrors.length ? (
            <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {importErrors.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}

          {importRows.length ? (
            <div className="mt-5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-700">
                {importRows.length} سجل جاهز للمراجعة
              </p>
              <button
                className="btn-primary"
                type="button"
                onClick={commitImport}
                disabled={saving || importErrors.length > 0}
              >
                <Upload size={17} aria-hidden="true" />
                اعتماد الاستيراد
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      {visibleFormFields.length && config.mode !== "readonly" && config.mode !== "export" && config.mode !== "import" ? (
        <section className="surface p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                {editing ? "تعديل سجل" : "إضافة سجل"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                الحقول المطلوبة يتم التحقق منها قبل الحفظ.
              </p>
            </div>
            {editing ? (
              <button className="btn-secondary" type="button" onClick={startCreate}>
                <X size={16} aria-hidden="true" />
                إلغاء
              </button>
            ) : null}
          </div>

          <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
            {visibleFormFields.map((field) => {
              const value = formValues[field.key];
              const dynamicOptions = getDynamicFieldOptions(field, formValues);
              const baseOptions =
                dynamicOptions ??
                (field.reference && references[field.reference.collection]
                  ? references[field.reference.collection].map((record) => ({
                      value: record.id,
                      label: formatCellValue(record[field.reference!.labelKey]),
                    }))
                  : field.options ?? []);
              const options =
                config.collection === "students" &&
                appUser?.role === "teacher" &&
                field.key === "curriculumSubject" &&
                teacherStudentSubjects.length
                  ? baseOptions.filter((option) =>
                      teacherStudentSubjects.includes(option.value),
                    )
                  : baseOptions;

              if (field.type === "multiselect") {
                const selectedValues = Array.isArray(value)
                  ? value.map((item) => String(item))
                  : String(value ?? "")
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean);

                return (
                  <div key={field.key} className="block space-y-2 md:col-span-2">
                    <span className="form-label">{field.label}</span>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {options.map((option) => {
                        const checked = selectedValues.includes(option.value);

                        return (
                          <label
                            key={option.value}
                            className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm font-bold transition ${
                              checked
                                ? "border-learning-blue bg-blue-50 text-learning-blue"
                                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(event) =>
                                setFormValues((current) => {
                                  const currentValues = Array.isArray(current[field.key])
                                    ? (current[field.key] as unknown[]).map((item) =>
                                        String(item),
                                      )
                                    : [];
                                  return {
                                    ...current,
                                    [field.key]: event.target.checked
                                      ? uniqueStrings([...currentValues, option.value])
                                      : currentValues.filter((item) => item !== option.value),
                                  };
                                })
                              }
                            />
                            <span>{option.label}</span>
                          </label>
                        );
                      })}
                    </div>
                    {!options.length ? (
                      <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-700">
                        اختر الصف والمسار لعرض المناهج المتاحة.
                      </p>
                    ) : null}
                  </div>
                );
              }

              return (
                <label
                  key={field.key}
                  className={`block space-y-2 ${
                    field.type === "textarea" ? "md:col-span-2" : ""
                  }`}
                >
                  <span className="form-label">{field.label}</span>
                  {field.type === "textarea" ? (
                    <textarea
                      className="form-input min-h-28 resize-y"
                      value={String(value ?? "")}
                      required={field.required}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  ) : field.type === "select" ? (
                    <select
                      className="form-input"
                      value={String(value ?? "")}
                      required={field.required}
                      disabled={
                        config.collection === "students" &&
                        appUser?.role === "teacher" &&
                        (field.key === "gradeId" || field.key === "track") &&
                        Boolean(teacherProfile)
                      }
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                          ...(field.key === "gradeId" &&
                          event.target.value !== "11" &&
                          event.target.value !== "12"
                            ? { track: "", curriculumSubject: "", teachingSubjects: [] }
                            : {}),
                          ...(field.key === "gradeId" &&
                          (event.target.value === "11" ||
                            event.target.value === "12")
                            ? { curriculumSubject: "", teachingSubjects: [] }
                            : {}),
                          ...(field.key === "track"
                            ? { curriculumSubject: "", teachingSubjects: [] }
                            : {}),
                        }))
                      }
                    >
                      <option value="">اختر</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : field.type === "checkbox" ? (
                    <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3">
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(event) =>
                          setFormValues((current) => ({
                            ...current,
                            [field.key]: event.target.checked,
                          }))
                        }
                      />
                      <span className="text-sm font-semibold text-slate-700">
                        {field.label}
                      </span>
                    </label>
                  ) : (
                    <input
                      className="form-input"
                      type={field.type}
                      value={String(value ?? "")}
                      required={field.required}
                      readOnly={field.readOnly}
                      placeholder={field.placeholder}
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
                        }))
                      }
                    />
                  )}
                </label>
              );
            })}

            <div className="md:col-span-2">
              <button className="btn-primary" type="submit" disabled={saving}>
                {editing ? <Save size={18} /> : <Plus size={18} />}
                {editing ? "حفظ التعديل" : "إضافة"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">السجلات</h2>
            <p className="mt-1 text-sm text-slate-500">
              {filteredRecords.length} من {records.length} سجل
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className="relative">
              <Search
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                className="form-input pr-9"
                value={search}
                placeholder="بحث"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <select
              className="form-input sm:w-44"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">كل الحالات</option>
              <option value="active">فعال</option>
              <option value="inactive">غير فعال</option>
              <option value="draft">مسودة</option>
              <option value="published">منشور</option>
              <option value="archived">مؤرشف</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-sm">
            <thead className="bg-slate-50 text-xs font-bold text-slate-500">
              <tr>
                {tableFields.map((key) => (
                  <th key={key} className="px-5 py-3">
                    {getFieldLabel(config, key)}
                  </th>
                ))}
                <th className="px-5 py-3">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="bg-white">
                  {tableFields.map((key) => {
                    const field = config.formFields.find((item) => item.key === key);
                    return (
                      <td key={key} className="max-w-60 px-5 py-4 align-top">
                        <span className="line-clamp-2">
                          {resolveReferenceValue(field, record[key], references)}
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {config.mode !== "readonly" && config.mode !== "export" ? (
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => startEdit(record)}
                        >
                          تعديل
                        </button>
                      ) : null}
                      {config.mode !== "readonly" && config.mode !== "export" ? (
                        <button
                          className="btn-secondary"
                          type="button"
                          onClick={() => handleDelete(record)}
                          disabled={saving}
                          title={record.status === "archived" ? "حذف" : "أرشفة"}
                        >
                          {record.status === "archived" ? (
                            <Trash2 size={16} />
                          ) : (
                            <Archive size={16} />
                          )}
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filteredRecords.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            لا توجد سجلات مطابقة.
          </div>
        ) : null}

        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            جاري تحميل البيانات...
          </div>
        ) : null}
      </section>

      {config.collection === "educationalStages" ? (
        <section className="surface overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="text-lg font-black text-slate-950">
              المناهج داخل المراحل التعليمية
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              يتم عرض مناهج المعلمين تحت المرحلة المرتبطة بها مباشرة.
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {stageCatalogRecords.map((stage) => {
              const stageCurriculums = (references.curriculums ?? []).filter(
                (curriculum) => curriculum.stageId === stage.id,
              );
              const officialCatalog = getStageCatalog(stage.name);

              return (
                <div key={stage.id} className="bg-white px-5 py-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-base font-black text-slate-950">
                        {formatCellValue(stage.name)}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {officialCatalog.length} صف/مسار معتمد، {stageCurriculums.length} منهاج معلم مرتبط
                      </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-learning-blue">
                      {formatCellValue(stage.status)}
                    </span>
                  </div>

                  {officialCatalog.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {officialCatalog.map((entry) => (
                        <div
                          key={`${entry.gradeNumber}-${entry.track ?? "general"}`}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-black text-slate-950">
                              {entry.gradeName}
                            </p>
                            {entry.trackName ? (
                              <span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-learning-blue">
                                {entry.trackName}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {entry.subjects.map((subject) => (
                              <span
                                key={subject}
                                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                              >
                                {subject}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                      لا توجد مناهج معتمدة لهذه المرحلة في الكتالوج الحالي.
                    </p>
                  )}

                  {stageCurriculums.length ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {stageCurriculums.map((curriculum) => {
                        const teacher = (references.teachers ?? []).find(
                          (item) => item.id === curriculum.teacherId,
                        );

                        return (
                          <div
                            key={curriculum.id}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                          >
                            <p className="font-black text-slate-950">
                              {formatCellValue(curriculum.name)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              الصف: {resolveReferenceValue(
                                { key: "gradeId", label: "الصف", type: "select", options: gradeOptions },
                                curriculum.gradeId,
                                references,
                              )}
                              {curriculum.track ? ` - المسار: ${resolveReferenceValue(
                                { key: "track", label: "المسار", type: "select", options: trackOptions },
                                curriculum.track,
                                references,
                              )}` : ""}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              المعلم:{" "}
                              {formatCellValue(
                                teacher?.fullName ?? curriculum.teacherId ?? "غير محدد",
                              )}
                            </p>
                            <p className="mt-1 text-xs font-bold text-slate-400">
                              {formatCellValue(curriculum.status)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
