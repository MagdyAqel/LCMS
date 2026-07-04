import type { RecordScope } from "../services/records";
import type { UserRole } from "../types";
import { palestinianTeacherSpecializations } from "./lcmsSpec";

export type FieldOption = {
  label: string;
  value: string;
};

export type FormField = {
  key: string;
  label: string;
  type:
    | "text"
    | "email"
    | "tel"
    | "password"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "checkbox";
  required?: boolean;
  placeholder?: string;
  options?: FieldOption[];
  reference?: {
    collection: string;
    labelKey: string;
  };
  hiddenOnCreate?: boolean;
  hiddenOnEdit?: boolean;
  readOnly?: boolean;
};

export type ModuleConfig = {
  path: string;
  title: string;
  description: string;
  collection: string;
  roles: UserRole[];
  scope: RecordScope;
  mode?: "crud" | "readonly" | "report" | "import" | "export";
  ownerField?: string;
  formFields: FormField[];
  tableFields: string[];
  searchableFields: string[];
  seedRecords?: Array<Record<string, unknown>>;
};

const studentFormFields: FormField[] = [
  { key: "fullName", label: "الاسم الكامل", type: "text", required: true },
  { key: "username", label: "اسم المستخدم", type: "text", required: true, placeholder: "student01" },
  { key: "password", label: "كلمة المرور الأولية", type: "password", required: true, hiddenOnEdit: true },
  { key: "nationalId", label: "رقم الهوية", type: "text", required: true },
  { key: "stageId", label: "المرحلة", type: "select", reference: { collection: "educationalStages", labelKey: "name" } },
  { key: "gradeId", label: "الصف", type: "select", reference: { collection: "gradeLevels", labelKey: "name" } },
  { key: "whatsappNumber", label: "رقم الواتس", type: "tel" },
  { key: "email", label: "البريد الإلكتروني", type: "email" },
  {
    key: "status",
    label: "حالة الطالب",
    type: "select",
    options: [
      { label: "فعال", value: "active" },
      { label: "غير فعال", value: "inactive" },
      { label: "مؤرشف", value: "archived" },
    ],
    required: true,
  },
];

export const statusOptions: FieldOption[] = [
  { label: "فعال", value: "active" },
  { label: "غير فعال", value: "inactive" },
  { label: "مؤرشف", value: "archived" },
];

export const draftStatusOptions: FieldOption[] = [
  { label: "مسودة", value: "draft" },
  { label: "منشور", value: "published" },
  { label: "مؤرشف", value: "archived" },
];

const learningModeOptions: FieldOption[] = [
  { label: "خطي", value: "linear" },
  { label: "حر", value: "free" },
];

const priorityOptions: FieldOption[] = [
  { label: "معلومات", value: "info" },
  { label: "مهم", value: "important" },
  { label: "عاجل", value: "urgent" },
];

const targetTypeOptions: FieldOption[] = [
  { label: "كل الطلاب", value: "allStudents" },
  { label: "طلاب منهاج", value: "courseStudents" },
  { label: "طالب واحد", value: "singleStudent" },
  { label: "معلم", value: "teacher" },
  { label: "كل المعلمين", value: "allTeachers" },
];

const blockTypeOptions: FieldOption[] = [
  { label: "نص", value: "text" },
  { label: "صورة", value: "image" },
  { label: "فيديو يوتيوب", value: "youtube" },
  { label: "رابط خارجي", value: "externalLink" },
  { label: "ملف", value: "file" },
  { label: "اختبار", value: "quiz" },
  { label: "تنبيه داخل الدرس", value: "note" },
  { label: "نشاط قصير", value: "activity" },
];

const specializationSeeds = palestinianTeacherSpecializations.map((name, index) => ({
  name,
  status: "active",
  order: index + 1,
}));

const stageSeeds = [
  { name: "المرحلة الأساسية الدنيا", description: "من الصف الأول إلى الرابع", order: 1, status: "active" },
  { name: "المرحلة الأساسية العليا", description: "من الصف الخامس إلى العاشر", order: 2, status: "active" },
  { name: "المرحلة الثانوية", description: "الصفان الحادي عشر والثاني عشر", order: 3, status: "active" },
  { name: "رياض الأطفال", description: "مرحلة الطفولة المبكرة", order: 4, status: "active" },
];

const allModuleConfigs: ModuleConfig[] = [
  {
    path: "/admin/teachers",
    title: "إدارة المعلمين",
    description: "إضافة وتعديل وتعطيل المعلمين وربطهم بالتخصصات الرسمية.",
    collection: "teachers",
    roles: ["admin"],
    scope: { type: "all" },
    ownerField: "createdBy",
    tableFields: ["fullName", "username", "nationalId", "specializationId", "whatsappNumber", "email", "status"],
    searchableFields: ["fullName", "username", "nationalId", "email", "whatsappNumber"],
    formFields: [
      { key: "fullName", label: "الاسم الكامل", type: "text", required: true },
      { key: "username", label: "اسم المستخدم", type: "text", required: true, placeholder: "teacher01" },
      { key: "password", label: "كلمة المرور الأولية", type: "password", required: true, hiddenOnEdit: true },
      { key: "nationalId", label: "رقم الهوية", type: "text", required: true },
      { key: "birthDate", label: "تاريخ الميلاد", type: "date" },
      {
        key: "specializationId",
        label: "التخصص",
        type: "select",
        reference: { collection: "specializations", labelKey: "name" },
      },
      { key: "whatsappNumber", label: "رقم الواتس", type: "tel" },
      { key: "email", label: "البريد الإلكتروني", type: "email" },
      { key: "status", label: "حالة الحساب", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/admin/specializations",
    title: "إدارة التخصصات",
    description: "قائمة تخصصات وزارة التربية والتعليم الفلسطينية القابلة للتحديث.",
    collection: "specializations",
    roles: ["admin"],
    scope: { type: "all" },
    seedRecords: specializationSeeds,
    tableFields: ["name", "status", "order"],
    searchableFields: ["name"],
    formFields: [
      { key: "name", label: "اسم التخصص", type: "text", required: true },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/admin/stages",
    title: "إدارة المراحل التعليمية",
    description: "إنشاء المراحل التعليمية الأساسية والثانوية ورياض الأطفال.",
    collection: "educationalStages",
    roles: ["admin"],
    scope: { type: "all" },
    seedRecords: stageSeeds,
    tableFields: ["name", "description", "order", "status"],
    searchableFields: ["name", "description"],
    formFields: [
      { key: "name", label: "اسم المرحلة", type: "text", required: true },
      { key: "description", label: "الوصف", type: "textarea" },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/admin/grades",
    title: "إدارة الصفوف",
    description: "ربط الصفوف بالمراحل التعليمية.",
    collection: "gradeLevels",
    roles: ["admin"],
    scope: { type: "all" },
    tableFields: ["name", "stageId", "order", "status"],
    searchableFields: ["name", "stageId"],
    formFields: [
      { key: "name", label: "اسم الصف", type: "text", required: true },
      {
        key: "stageId",
        label: "المرحلة التعليمية",
        type: "select",
        reference: { collection: "educationalStages", labelKey: "name" },
        required: true,
      },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/admin/subjects",
    title: "إدارة المواد",
    description: "تعريف المواد وربطها بالمرحلة والصف.",
    collection: "subjects",
    roles: ["admin"],
    scope: { type: "all" },
    tableFields: ["name", "stageId", "gradeId", "order", "status"],
    searchableFields: ["name", "stageId", "gradeId"],
    formFields: [
      { key: "name", label: "اسم المادة", type: "text", required: true },
      {
        key: "stageId",
        label: "المرحلة",
        type: "select",
        reference: { collection: "educationalStages", labelKey: "name" },
        required: true,
      },
      {
        key: "gradeId",
        label: "الصف",
        type: "select",
        reference: { collection: "gradeLevels", labelKey: "name" },
        required: true,
      },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/admin/curriculums",
    title: "إدارة المناهج الرسمية",
    description: "إنشاء مناهج رسمية وربطها بالمعلمين والمواد والصفوف.",
    collection: "curriculums",
    roles: ["admin"],
    scope: { type: "all" },
    ownerField: "createdBy",
    tableFields: ["name", "stageId", "gradeId", "subjectId", "teacherId", "status"],
    searchableFields: ["name", "description", "teacherId"],
    formFields: [
      { key: "name", label: "اسم المنهاج", type: "text", required: true },
      { key: "stageId", label: "المرحلة", type: "select", reference: { collection: "educationalStages", labelKey: "name" } },
      { key: "gradeId", label: "الصف", type: "select", reference: { collection: "gradeLevels", labelKey: "name" } },
      { key: "subjectId", label: "المادة", type: "select", reference: { collection: "subjects", labelKey: "name" } },
      { key: "teacherId", label: "المعلم المسؤول", type: "select", reference: { collection: "teachers", labelKey: "fullName" } },
      { key: "startDate", label: "تاريخ البداية", type: "date" },
      { key: "endDate", label: "تاريخ النهاية", type: "date" },
      { key: "description", label: "وصف مختصر", type: "textarea" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/teacher/students",
    title: "إدارة الطلاب",
    description: "إضافة الطلاب المرتبطين بالمعلم الحالي فقط.",
    collection: "students",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    tableFields: ["fullName", "username", "nationalId", "stageId", "gradeId", "whatsappNumber", "status"],
    searchableFields: ["fullName", "username", "nationalId", "whatsappNumber", "email"],
    formFields: studentFormFields,
  },
  {
    path: "/teacher/students/import",
    title: "استيراد الطلاب من Excel",
    description: "استيراد الطلاب من ملف Excel مع التحقق من الحقول الأساسية.",
    collection: "students",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    mode: "import",
    tableFields: ["fullName", "username", "nationalId", "stageId", "gradeId", "whatsappNumber", "email"],
    searchableFields: ["fullName", "username", "nationalId", "email"],
    formFields: studentFormFields,
  },
  {
    path: "/teacher/students/export",
    title: "تصدير الطلاب",
    description: "تصدير الطلاب وبياناتهم إلى ملف Excel.",
    collection: "students",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    mode: "export",
    tableFields: ["fullName", "username", "nationalId", "stageId", "gradeId", "whatsappNumber", "email", "status"],
    searchableFields: ["fullName", "username", "nationalId", "email"],
    formFields: studentFormFields,
  },
  {
    path: "/teacher/courses",
    title: "المناهج الخاصة",
    description: "إنشاء مناهج خاصة أو تخصيص مناهج رسمية.",
    collection: "teacherCourses",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    tableFields: ["title", "subjectId", "gradeId", "learningMode", "passingScore", "status"],
    searchableFields: ["title", "description", "objectives"],
    formFields: [
      { key: "title", label: "عنوان المنهاج", type: "text", required: true },
      { key: "curriculumId", label: "منهاج رسمي اختياري", type: "select", reference: { collection: "curriculums", labelKey: "name" } },
      { key: "subjectId", label: "المادة", type: "select", reference: { collection: "subjects", labelKey: "name" } },
      { key: "stageId", label: "المرحلة", type: "select", reference: { collection: "educationalStages", labelKey: "name" } },
      { key: "gradeId", label: "الصف", type: "select", reference: { collection: "gradeLevels", labelKey: "name" } },
      { key: "objectives", label: "الأهداف العامة", type: "textarea" },
      { key: "description", label: "وصف المنهاج", type: "textarea" },
      { key: "learningMode", label: "نمط التعلم", type: "select", options: learningModeOptions, required: true },
      { key: "passingScore", label: "درجة النجاح المطلوبة", type: "number" },
      { key: "studentIds", label: "معرّفات الطلاب المسجلين مفصولة بفواصل", type: "textarea" },
      { key: "startDate", label: "تاريخ البداية", type: "date" },
      { key: "endDate", label: "تاريخ النهاية", type: "date" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/teacher/lessons",
    title: "إدارة الدروس",
    description: "إضافة الدروس وترتيبها داخل المنهاج.",
    collection: "lessons",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    tableFields: ["title", "courseId", "order", "status", "availableFrom"],
    searchableFields: ["title", "objectives", "courseId"],
    formFields: [
      { key: "title", label: "عنوان الدرس", type: "text", required: true },
      { key: "courseId", label: "المنهاج", type: "select", reference: { collection: "teacherCourses", labelKey: "title" }, required: true },
      { key: "objectives", label: "أهداف الدرس", type: "textarea" },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "availableFrom", label: "تاريخ الإتاحة", type: "date" },
      { key: "status", label: "حالة الدرس", type: "select", options: draftStatusOptions, required: true },
    ],
  },
  {
    path: "/teacher/lesson-blocks",
    title: "ترتيب عناصر الدرس",
    description: "إدارة عناصر الدرس القابلة للترتيب.",
    collection: "lessonBlocks",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    tableFields: ["title", "lessonId", "type", "order", "status"],
    searchableFields: ["title", "content", "url"],
    formFields: [
      { key: "lessonId", label: "الدرس", type: "select", reference: { collection: "lessons", labelKey: "title" }, required: true },
      { key: "type", label: "نوع العنصر", type: "select", options: blockTypeOptions, required: true },
      { key: "title", label: "العنوان", type: "text" },
      { key: "content", label: "المحتوى", type: "textarea" },
      { key: "url", label: "رابط", type: "text" },
      { key: "filePath", label: "مسار الملف", type: "text" },
      { key: "order", label: "الترتيب", type: "number" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions, required: true },
    ],
  },
  {
    path: "/teacher/quizzes",
    title: "إنشاء الاختبارات",
    description: "اختبارات اختيار من متعدد مرتبطة بالدروس.",
    collection: "quizzes",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    ownerField: "teacherId",
    tableFields: ["title", "lessonId", "passingScore", "attemptsAllowed", "isActive"],
    searchableFields: ["title", "description"],
    formFields: [
      { key: "title", label: "عنوان الاختبار", type: "text", required: true },
      { key: "lessonId", label: "الدرس", type: "select", reference: { collection: "lessons", labelKey: "title" }, required: true },
      { key: "description", label: "وصف الاختبار", type: "textarea" },
      { key: "startDate", label: "تاريخ البداية", type: "date" },
      { key: "endDate", label: "تاريخ النهاية", type: "date" },
      { key: "passingScore", label: "درجة النجاح", type: "number" },
      { key: "attemptsAllowed", label: "عدد المحاولات", type: "number" },
      { key: "showResultImmediately", label: "إظهار النتيجة مباشرة", type: "checkbox" },
      { key: "randomizeQuestions", label: "ترتيب الأسئلة عشوائي", type: "checkbox" },
      { key: "randomizeOptions", label: "ترتيب الخيارات عشوائي", type: "checkbox" },
      { key: "isActive", label: "الاختبار مفعل", type: "checkbox" },
    ],
  },
  {
    path: "/teacher/quiz-results",
    title: "نتائج الاختبارات",
    description: "متابعة درجات ومحاولات الطلاب.",
    collection: "quizAttempts",
    roles: ["teacher"],
    scope: { type: "teacherOwned" },
    mode: "readonly",
    tableFields: ["studentId", "quizId", "score", "percentage", "passed", "attemptNumber"],
    searchableFields: ["studentId", "quizId"],
    formFields: [],
  },
  {
    path: "/teacher/notifications",
    title: "التنبيهات",
    description: "إرسال تنبيهات للطلاب أو المعلمين.",
    collection: "notifications",
    roles: ["teacher"],
    scope: { type: "teacherOwned", field: "senderId" },
    ownerField: "senderId",
    tableFields: ["title", "priority", "targetType", "isActive", "endAt"],
    searchableFields: ["title", "message", "targetId"],
    formFields: [
      { key: "title", label: "عنوان التنبيه", type: "text", required: true },
      { key: "message", label: "نص التنبيه", type: "textarea", required: true },
      { key: "priority", label: "نوع التنبيه", type: "select", options: priorityOptions },
      { key: "targetType", label: "الفئة المستهدفة", type: "select", options: targetTypeOptions },
      { key: "targetId", label: "معرّف الهدف", type: "text" },
      { key: "startAt", label: "تاريخ البداية", type: "date" },
      { key: "endAt", label: "تاريخ الانتهاء", type: "date" },
      { key: "isActive", label: "فعال", type: "checkbox" },
    ],
  },
  {
    path: "/teacher/messages",
    title: "الرسائل",
    description: "قراءة رسائل الطلاب والرد عليها.",
    collection: "messages",
    roles: ["teacher"],
    scope: { type: "sentOrReceived" },
    mode: "crud",
    tableFields: ["subject", "senderId", "receiverId", "status", "reply"],
    searchableFields: ["subject", "message", "reply", "senderId", "receiverId"],
    formFields: [
      { key: "receiverId", label: "المستلم", type: "text", required: true },
      { key: "courseId", label: "المنهاج", type: "select", reference: { collection: "teacherCourses", labelKey: "title" } },
      { key: "lessonId", label: "الدرس", type: "select", reference: { collection: "lessons", labelKey: "title" } },
      { key: "subject", label: "الموضوع", type: "text", required: true },
      { key: "message", label: "نص الرسالة", type: "textarea", required: true },
      { key: "reply", label: "رد المعلم", type: "textarea" },
      { key: "status", label: "الحالة", type: "select", options: [
        { label: "جديدة", value: "new" },
        { label: "مقروءة", value: "read" },
        { label: "تم الرد", value: "replied" },
      ] },
    ],
  },
  {
    path: "/teacher/activity-log",
    title: "سجل النشاط",
    description: "سجل العمليات التي قام بها المعلم.",
    collection: "auditLogs",
    roles: ["teacher"],
    scope: { type: "teacherOwned", field: "userId" },
    mode: "readonly",
    tableFields: ["actionType", "entityType", "entityId", "description", "createdAt"],
    searchableFields: ["actionType", "entityType", "description"],
    formFields: [],
  },
  {
    path: "/admin/audit-logs",
    title: "سجل التدقيق",
    description: "سجل تدقيق كامل لعمليات النظام.",
    collection: "auditLogs",
    roles: ["admin"],
    scope: { type: "all" },
    mode: "readonly",
    tableFields: ["userName", "userRole", "actionType", "entityType", "description", "createdAt"],
    searchableFields: ["userName", "userRole", "actionType", "entityType", "description"],
    formFields: [],
  },
  {
    path: "/admin/settings",
    title: "إعدادات النظام",
    description: "إعدادات عامة للنظام.",
    collection: "systemSettings",
    roles: ["admin"],
    scope: { type: "all" },
    tableFields: ["key", "value", "description", "status"],
    searchableFields: ["key", "value", "description"],
    formFields: [
      { key: "key", label: "المفتاح", type: "text", required: true },
      { key: "value", label: "القيمة", type: "text", required: true },
      { key: "description", label: "الوصف", type: "textarea" },
      { key: "status", label: "الحالة", type: "select", options: statusOptions },
    ],
  },
];

const hiddenAdminConfigPaths = new Set([
  "/admin/specializations",
  "/admin/grades",
  "/admin/subjects",
]);

export const moduleConfigs: ModuleConfig[] = allModuleConfigs
  .filter((config) => !hiddenAdminConfigPaths.has(config.path))
  .map((config) => {
    if (config.path === "/admin/curriculums") {
      return {
        ...config,
        title: "إدارة مناهج المعلمين",
        description:
          "إدارة المناهج التي ينشئها المعلمون وربطها بالمرحلة التعليمية المناسبة.",
        tableFields: ["name", "stageId", "teacherId", "status"],
        searchableFields: ["name", "description", "teacherId", "stageId"],
        formFields: config.formFields.filter(
          (field) => field.key !== "gradeId" && field.key !== "subjectId",
        ),
      };
    }

    if (config.path === "/teacher/courses") {
      return {
        ...config,
        tableFields: ["title", "stageId", "learningMode", "passingScore", "status"],
        formFields: config.formFields.filter(
          (field) => field.key !== "gradeId" && field.key !== "subjectId",
        ),
      };
    }

    if (config.path === "/admin/stages") {
      return {
        ...config,
        description:
          "إدارة المراحل التعليمية مع عرض المناهج المرتبطة بكل مرحلة داخل نفس الصفحة.",
      };
    }

    return config;
  });

export function getModuleConfig(path: string) {
  return moduleConfigs.find((config) => config.path === path);
}

export function getFieldLabel(config: ModuleConfig, key: string) {
  return config.formFields.find((field) => field.key === key)?.label ?? key;
}
