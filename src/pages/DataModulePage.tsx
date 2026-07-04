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
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../context/AuthContext";
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
import { isDemoUser } from "../services/demoAuth";
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

    payload[field.key] = typeof value === "string" ? value.trim() : value ?? "";
    return payload;
  }, {});
}

function getReferenceCollections(config: ModuleConfig) {
  return Array.from(
    new Set(
      config.formFields
        .map((field) => field.reference?.collection)
        .filter((value): value is string => Boolean(value)),
    ),
  );
}

function resolveReferenceValue(
  field: FormField | undefined,
  value: unknown,
  references: ReferenceMap,
) {
  if (!field?.reference || !value) {
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

function getVisibleFormFields(fields: FormField[], editing: boolean) {
  return fields.filter((field) => {
    if (editing && field.hiddenOnEdit) {
      return false;
    }

    if (!editing && field.hiddenOnCreate) {
      return false;
    }

    return true;
  });
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
    if (!appUser) {
      return;
    }

    const unsubs: Unsubscribe[] = [];

    for (const collectionName of getReferenceCollections(config)) {
      if (isDemoUser(appUser)) {
        unsubs.push(
          subscribeToRecords(
            collectionName,
            appUser,
            appUser.role === "teacher" &&
              teacherOwnedReferenceCollections.has(collectionName)
              ? { type: "teacherOwned" }
              : { type: "all" },
            (items) => {
              setReferences((current) => ({
                ...current,
                [collectionName]: items,
              }));
            },
            () => undefined,
          ),
        );
        continue;
      }

      const constraints =
        appUser.role === "teacher" &&
        teacherOwnedReferenceCollections.has(collectionName)
          ? [where("teacherId", "==", appUser.uid)]
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
    () => getVisibleFormFields(config.formFields, Boolean(editing)),
    [config.formFields, editing],
  );

  function startCreate() {
    setEditing(null);
    setFormValues(getDefaultFormValues(config.formFields));
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

      if (editing) {
        await updateRecord(config.collection, editing.id, payload, appUser);
        setNotice("تم تحديث السجل بنجاح.");
      } else {
        const managedRole = getManagedRole(config.collection);

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

          delete payload.password;
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
        if (typeof payload.studentIds === "string") {
          payload.studentIds = payload.studentIds
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean);
        }
        if (config.ownerField) {
          payload[config.ownerField] = appUser.uid;
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

          delete payload.password;
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

  const columns = config.tableFields.map((key) => ({
    key,
    label: getFieldLabel(config, key),
  }));

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
                الهوية، المرحلة، الصف، رقم الواتس، البريد الإلكتروني.
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
              const options =
                field.reference && references[field.reference.collection]
                  ? references[field.reference.collection].map((record) => ({
                      value: record.id,
                      label: formatCellValue(record[field.reference!.labelKey]),
                    }))
                  : field.options ?? [];

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
                      onChange={(event) =>
                        setFormValues((current) => ({
                          ...current,
                          [field.key]: event.target.value,
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
                {config.tableFields.map((key) => (
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
                  {config.tableFields.map((key) => {
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
    </div>
  );
}
