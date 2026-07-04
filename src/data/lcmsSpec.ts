import type { UserRole } from "../types";

export type SpecModule = {
  path: string;
  title: string;
  eyebrow: string;
  description: string;
  collection?: string;
  fields: string[];
  actions: string[];
  notes?: string[];
};

export type NavGroup = {
  title: string;
  items: Array<{
    label: string;
    to: string;
    roles: UserRole[];
  }>;
};

export const palestinianTeacherSpecializations = [
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "العلوم",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "التربية الإسلامية",
  "التربية الاجتماعية والوطنية",
  "التكنولوجيا",
  "التربية الفنية",
  "التربية الرياضية",
  "الإرشاد التربوي",
  "التعليم الأساسي",
  "رياض الأطفال",
];

const allAdminModules: SpecModule[] = [
  {
    path: "/admin/teachers",
    title: "إدارة المعلمين",
    eyebrow: "Admin",
    collection: "teachers",
    description: "إضافة وتعديل وتعطيل المعلمين وربطهم بالتخصصات والمناهج الرسمية.",
    fields: [
      "الاسم الكامل",
      "رقم الهوية",
      "تاريخ الميلاد",
      "الصف",
      "المسار",
      "المناهج التي يدرسها",
      "التخصص",
      "رقم الواتس",
      "البريد الإلكتروني",
      "حالة الحساب",
    ],
    actions: ["إضافة معلم", "تعديل البيانات", "تعطيل الحساب", "مراجعة المناهج المرتبطة"],
  },
  {
    path: "/admin/specializations",
    title: "إدارة التخصصات",
    eyebrow: "Admin",
    collection: "specializations",
    description: "حفظ تخصصات وزارة التربية والتعليم الفلسطينية داخل قاعدة البيانات لتحديثها دون تعديل الكود.",
    fields: ["اسم التخصص", "الحالة", "تاريخ الإنشاء", "آخر تحديث"],
    actions: ["إضافة تخصص", "تعديل تخصص", "تفعيل/تعطيل"],
    notes: palestinianTeacherSpecializations.slice(0, 6),
  },
  {
    path: "/admin/stages",
    title: "إدارة المراحل التعليمية",
    eyebrow: "Admin",
    collection: "educationalStages",
    description: "بناء الهيكل التعليمي العام مثل الأساسية الدنيا والعليا والثانوية ورياض الأطفال.",
    fields: ["اسم المرحلة", "الوصف", "الترتيب", "الحالة"],
    actions: ["إضافة مرحلة", "تعديل مرحلة", "ترتيب المراحل"],
  },
  {
    path: "/admin/grades",
    title: "إدارة الصفوف",
    eyebrow: "Admin",
    collection: "gradeLevels",
    description: "ربط كل صف بمرحلة تعليمية محددة لضمان ظهور المحتوى المناسب للمعلم والطالب.",
    fields: ["اسم الصف", "المرحلة التعليمية", "الترتيب", "الحالة"],
    actions: ["إضافة صف", "تعديل صف", "ربط الصف بمرحلة"],
  },
  {
    path: "/admin/subjects",
    title: "إدارة المواد",
    eyebrow: "Admin",
    collection: "subjects",
    description: "تعريف مواد كل صف ومرحلة مثل العربية والرياضيات والعلوم والحياة.",
    fields: ["اسم المادة", "المرحلة", "الصف", "الترتيب", "الحالة"],
    actions: ["إضافة مادة", "تعديل مادة", "فلترة حسب الصف"],
  },
  {
    path: "/admin/curriculums",
    title: "إدارة المناهج الرسمية",
    eyebrow: "Admin",
    collection: "curriculums",
    description: "إنشاء الإطار الرسمي للمنهاج وربطه بالمرحلة والصف والمادة والمعلم.",
    fields: [
      "اسم المنهاج",
      "المرحلة",
      "الصف",
      "المادة",
      "المعلم المسؤول",
      "تاريخ البداية",
      "تاريخ النهاية",
      "الحالة",
    ],
    actions: ["إنشاء منهاج", "تعديل منهاج", "أرشفة منهاج", "مراجعة الدروس"],
  },
  {
    path: "/admin/reports",
    title: "التقارير العامة",
    eyebrow: "Admin",
    collection: "reports",
    description: "مؤشرات المعلمين والطلاب والمناهج والمواد والصفوف والحسابات غير المفعلة.",
    fields: ["عدد المعلمين", "عدد الطلاب", "عدد المناهج", "آخر العمليات", "أكثر المناهج نشاطاً"],
    actions: ["عرض التقرير", "فلترة", "تصدير"],
  },
  {
    path: "/admin/audit-logs",
    title: "سجل التدقيق",
    eyebrow: "Admin",
    collection: "auditLogs",
    description: "تسجيل العمليات المهمة مثل إضافة معلم، تعديل منهج، حذف درس، واستيراد الطلاب.",
    fields: ["المستخدم", "نوع العملية", "وقت التنفيذ", "البيانات المتغيرة", "الجهة المتأثرة"],
    actions: ["بحث", "فلترة حسب العملية", "مراجعة التفاصيل"],
  },
  {
    path: "/admin/settings",
    title: "إعدادات النظام",
    eyebrow: "Admin",
    collection: "systemSettings",
    description: "إعدادات عامة للنظام، سياسة الأرشفة، والخيارات المرتبطة بتجربة المستخدم.",
    fields: ["اسم النظام", "حالة التسجيل", "سياسة الملفات", "لغة الواجهة"],
    actions: ["حفظ الإعدادات", "تحديث السياسة"],
  },
];

const hiddenAdminModulePaths = new Set([
  "/admin/specializations",
  "/admin/grades",
  "/admin/subjects",
]);

export const adminModules: SpecModule[] = allAdminModules
  .filter((module) => !hiddenAdminModulePaths.has(module.path))
  .map((module) =>
    module.path === "/admin/curriculums"
      ? {
          ...module,
          title: "إدارة مناهج المعلمين",
          description:
            "إدارة المناهج التي ينشئها المعلمون وربط كل منها بمرحلة تعليمية ليتم عرضها داخل المرحلة المناسبة.",
          fields: [
            "اسم المنهاج",
            "المرحلة التعليمية",
            "المعلم المسؤول",
            "تاريخ البداية",
            "تاريخ النهاية",
            "الحالة",
          ],
          actions: [
            "إنشاء منهاج",
            "تعديل منهاج",
            "أرشفة منهاج",
            "عرض المناهج حسب المرحلة",
          ],
        }
      : module,
  );

const allTeacherModules: SpecModule[] = [
  {
    path: "/teacher/students",
    title: "إدارة الطلاب",
    eyebrow: "Teacher",
    collection: "students",
    description: "إضافة وتعديل وتعطيل الطلاب المرتبطين بالمعلم الحالي فقط.",
    fields: ["الاسم الكامل", "رقم الهوية", "الصف", "المسار", "المنهاج", "رقم الواتس", "البريد الإلكتروني", "الحالة"],
    actions: ["إضافة طالب", "تعديل طالب", "تعطيل طالب", "ربط بالمناهج"],
  },
  {
    path: "/teacher/students/import",
    title: "استيراد الطلاب من Excel",
    eyebrow: "Teacher",
    collection: "students",
    description: "استيراد ملف Excel مع التحقق من الاسم ورقم الهوية والهاتف ومطابقة المنهاج للصف.",
    fields: ["الاسم الكامل", "رقم الهوية", "الصف", "المنهاج", "رقم الواتس", "البريد الإلكتروني"],
    actions: ["رفع ملف", "فحص الأخطاء", "اعتماد الاستيراد"],
  },
  {
    path: "/teacher/students/export",
    title: "تصدير الطلاب",
    eyebrow: "Teacher",
    collection: "students",
    description: "تصدير بيانات الطلاب والصفوف والمناهج والتقدم ونتائج الاختبارات عند الحاجة.",
    fields: ["بيانات الطلاب", "الصفوف", "المناهج", "حالة التقدم", "نتائج الاختبارات"],
    actions: ["اختيار الحقول", "تصدير Excel"],
  },
  {
    path: "/teacher/courses",
    title: "المناهج الخاصة",
    eyebrow: "Teacher",
    collection: "teacherCourses",
    description: "إنشاء منهاج من الصفر أو تخصيص منهاج رسمي وربطه بالطلاب ونمط التعلم.",
    fields: ["العنوان", "المادة", "الصف", "الأهداف", "نمط التعلم", "درجة النجاح", "الحالة"],
    actions: ["إنشاء منهاج", "تعديل منهاج", "تفعيل", "أرشفة"],
  },
  {
    path: "/teacher/lessons",
    title: "إدارة الدروس",
    eyebrow: "Teacher",
    collection: "lessons",
    description: "إضافة دروس داخل كل منهاج مع ترتيبها وتحديد حالتها وتاريخ إتاحتها.",
    fields: ["عنوان الدرس", "الأهداف", "المنهاج", "الحالة", "الترتيب", "تاريخ الإتاحة"],
    actions: ["إضافة درس", "تعديل درس", "إخفاء", "حذف مع تدقيق"],
  },
  {
    path: "/teacher/lesson-blocks",
    title: "ترتيب عناصر الدرس",
    eyebrow: "Teacher",
    collection: "lessonBlocks",
    description: "بناء الدرس من عناصر مستقلة: نص، صورة، يوتيوب، رابط، ملف، اختبار، تنبيه، نشاط.",
    fields: ["نوع العنصر", "العنوان", "المحتوى", "الرابط", "مسار الملف", "الترتيب", "الحالة"],
    actions: ["إضافة عنصر", "إعادة ترتيب", "تفعيل/تعطيل"],
  },
  {
    path: "/teacher/quizzes",
    title: "إنشاء الاختبارات",
    eyebrow: "Teacher",
    collection: "quizzes",
    description: "اختبارات اختيار من متعدد مع درجة نجاح ومحاولات وترتيب عشوائي للأسئلة والخيارات.",
    fields: ["العنوان", "الوصف", "فترة الإتاحة", "درجة النجاح", "عدد المحاولات", "إظهار النتيجة"],
    actions: ["إنشاء اختبار", "إضافة أسئلة", "تفعيل/تعطيل"],
  },
  {
    path: "/teacher/quiz-results",
    title: "نتائج الاختبارات",
    eyebrow: "Teacher",
    collection: "quizAttempts",
    description: "متابعة الدرجات والنسب وحالة النجاح وعدد المحاولات والطلاب الذين لم يقدموا.",
    fields: ["الطالب", "الاختبار", "الدرجة", "النسبة", "الحالة", "وقت التسليم", "المحاولة"],
    actions: ["بحث", "فلترة", "تصدير"],
  },
  {
    path: "/teacher/notifications",
    title: "التنبيهات",
    eyebrow: "Teacher",
    collection: "notifications",
    description: "إرسال تنبيه عام، لمنهاج محدد، لطالب واحد، أو مرتبط بدرس/اختبار.",
    fields: ["العنوان", "النص", "النوع", "الفئة المستهدفة", "تاريخ البداية", "تاريخ الانتهاء", "الحالة"],
    actions: ["إرسال تنبيه", "إيقاف تنبيه"],
  },
  {
    path: "/teacher/messages",
    title: "الرسائل",
    eyebrow: "Teacher",
    collection: "messages",
    description: "قراءة رسائل الطلاب والرد عليها مع تتبع حالة الرسالة.",
    fields: ["الطالب", "المنهاج", "الدرس", "نص الرسالة", "الحالة", "رد المعلم"],
    actions: ["قراءة", "رد", "تعليم كمقروءة"],
  },
  {
    path: "/teacher/reports",
    title: "تقارير المعلم",
    eyebrow: "Teacher",
    collection: "reports",
    description: "تقارير الطلاب والمناهج والدروس والاختبارات وتقدم الطالب.",
    fields: ["عدد الطلاب", "المناهج الفعالة", "الدروس المنشورة", "الاختبارات", "الرسائل الجديدة"],
    actions: ["عرض", "فلترة", "تصدير"],
  },
  {
    path: "/teacher/activity-log",
    title: "سجل النشاط",
    eyebrow: "Teacher",
    collection: "auditLogs",
    description: "سجل عمليات المعلم مثل إضافة طالب أو درس أو اختبار أو إرسال تنبيه.",
    fields: ["العملية", "الجهة", "وقت التنفيذ", "الوصف"],
    actions: ["بحث", "فلترة"],
  },
];

const hiddenTeacherModulePaths = new Set([
  "/teacher/courses",
  "/teacher/lessons",
]);

export const teacherModules: SpecModule[] = allTeacherModules
  .filter((module) => !hiddenTeacherModulePaths.has(module.path))
  .map((module) =>
    module.path === "/teacher/lesson-blocks"
      ? {
          ...module,
          title: "إدارة الدرس",
          description:
            "بناء درس حسب الصف والمنهاج: نصوص، صور، روابط يوتيوب، روابط خارجية وملفات قابلة للترتيب.",
          fields: ["الصف", "المسار", "المنهاج", "عنوان الدرس", "نوع العنصر", "العنوان", "الرابط", "الترتيب"],
          actions: ["اختيار الصف", "اختيار المنهاج", "إضافة درس", "إضافة عنصر", "ترتيب العناصر"],
        }
      : module,
  );

const allStudentModules: SpecModule[] = [
  {
    path: "/student/courses",
    title: "المناهج المتاحة",
    eyebrow: "Student",
    collection: "teacherCourses",
    description: "عرض بطاقات المناهج الفعالة المتاحة للطالب فقط مع نسبة التقدم وعدد الدروس.",
    fields: ["اسم المنهاج", "المعلم", "المادة", "الصف", "نسبة التقدم", "عدد الدروس", "الحالة"],
    actions: ["دخول المنهاج", "متابعة آخر درس"],
  },
  {
    path: "/student/course-detail",
    title: "تفاصيل المنهاج",
    eyebrow: "Student",
    collection: "teacherCourses",
    description: "قائمة دروس المنهاج مع توضيح المتاح والمقفل والمكتمل وسبب القفل.",
    fields: ["الدرس", "حالة الدرس", "نسبة الإنجاز", "حالة الاختبار", "سبب القفل"],
    actions: ["فتح درس", "عرض سبب القفل"],
  },
  {
    path: "/student/lesson",
    title: "عرض الدرس",
    eyebrow: "Student",
    collection: "lessonBlocks",
    description: "عرض عناصر الدرس حسب ترتيب المعلم: أهداف، نص، صورة، فيديو، روابط، واختبار.",
    fields: ["أهداف الدرس", "نص المحتوى", "الصورة", "فيديو يوتيوب", "روابط خارجية", "الاختبار"],
    actions: ["متابعة", "تعليم كمكتمل"],
  },
  {
    path: "/student/quiz",
    title: "تقديم الاختبار",
    eyebrow: "Student",
    collection: "quizAttempts",
    description: "تقديم اختبار الدرس إذا كان مفعلًا وداخل فترة الإتاحة ولم تتجاوز المحاولات.",
    fields: ["عنوان الاختبار", "عدد الأسئلة", "درجة النجاح", "المحاولات", "وقت البداية", "وقت النهاية"],
    actions: ["بدء الاختبار", "تسليم"],
  },
  {
    path: "/student/result",
    title: "نتيجة الاختبار",
    eyebrow: "Student",
    collection: "quizAttempts",
    description: "عرض الدرجة والنسبة وحالة النجاح والتغذية الراجعة حسب إعدادات المعلم.",
    fields: ["الدرجة", "النسبة", "حالة النجاح", "التغذية الراجعة", "المحاولة"],
    actions: ["عرض النتيجة", "إعادة المحاولة إذا سمح المعلم"],
  },
  {
    path: "/student/messages",
    title: "رسائل الطالب",
    eyebrow: "Student",
    collection: "messages",
    description: "إرسال رسالة للمعلم وقراءة الردود المرتبطة بمنهاج أو درس.",
    fields: ["المعلم", "المنهاج", "الدرس", "الموضوع", "الرسالة", "الرد", "الحالة"],
    actions: ["إرسال رسالة", "قراءة الرد"],
  },
  {
    path: "/student/notifications",
    title: "تنبيهات الطالب",
    eyebrow: "Student",
    collection: "notifications",
    description: "عرض التنبيهات الخاصة بالطالب أو منهاجه أو جميع طلاب المعلم.",
    fields: ["العنوان", "النص", "الأولوية", "تاريخ الظهور", "تاريخ الانتهاء"],
    actions: ["قراءة التنبيه"],
  },
  {
    path: "/student/profile",
    title: "الملف الشخصي",
    eyebrow: "Student",
    collection: "students",
    description: "عرض بيانات الطالب الأساسية والمرحلة والصف ونسبة التقدم العامة.",
    fields: ["الاسم", "رقم الهوية", "المرحلة", "الصف", "رقم الواتس", "التقدم العام"],
    actions: ["عرض البيانات", "طلب تعديل من المعلم"],
  },
];

const hiddenStudentModulePaths = new Set([
  "/student/course-detail",
  "/student/lesson",
]);

export const studentModules: SpecModule[] = allStudentModules.filter(
  (module) => !hiddenStudentModulePaths.has(module.path),
);

const rawRoleNavigation: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      title: "الرئيسية",
      items: [
        { label: "لوحة التحكم", to: "/dashboard", roles: ["admin"] },
        { label: "المستخدمون", to: "/admin/users", roles: ["admin"] },
        { label: "حسابات وهمية", to: "/admin/demo-accounts", roles: ["admin"] },
      ],
    },
    {
      title: "الإدارة الأكاديمية",
      items: adminModules.slice(0, 3).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["admin"],
      })),
    },
    {
      title: "الرقابة",
      items: adminModules.slice(3).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["admin"],
      })),
    },
  ],
  teacher: [
    {
      title: "الرئيسية",
      items: [{ label: "لوحة التحكم", to: "/dashboard", roles: ["teacher"] }],
    },
    {
      title: "الطلاب والمناهج",
      items: teacherModules.slice(0, 8).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["teacher"],
      })),
    },
    {
      title: "التواصل والتقارير",
      items: teacherModules.slice(8).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["teacher"],
      })),
    },
  ],
  student: [
    {
      title: "الرئيسية",
      items: [{ label: "لوحة التحكم", to: "/dashboard", roles: ["student"] }],
    },
    {
      title: "التعلم",
      items: studentModules.slice(0, 5).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["student"],
      })),
    },
    {
      title: "التواصل",
      items: studentModules.slice(5).map((item) => ({
        label: item.title,
        to: item.path,
        roles: ["student"],
      })),
    },
  ],
};

const moduleLabels: Record<string, string> = {
  "/admin/teachers": "إدارة المعلمين",
  "/admin/stages": "إدارة المراحل التعليمية",
  "/admin/curriculums": "إدارة مناهج المعلمين",
  "/admin/reports": "التقارير العامة",
  "/admin/audit-logs": "سجل التدقيق",
  "/admin/settings": "إعدادات النظام",
  "/teacher/students": "إدارة الطلاب",
  "/teacher/students/import": "استيراد الطلاب من Excel",
  "/teacher/students/export": "تصدير الطلاب",
  "/teacher/lesson-blocks": "إدارة الدرس",
  "/teacher/quizzes": "إنشاء الاختبارات",
  "/teacher/quiz-results": "نتائج الاختبارات",
  "/teacher/notifications": "التنبيهات",
  "/teacher/messages": "الرسائل",
  "/teacher/reports": "تقارير المعلم",
  "/teacher/activity-log": "سجل النشاط",
  "/student/courses": "المناهج المتاحة",
  "/student/course-detail": "تفاصيل المنهاج",
  "/student/lesson": "عرض الدرس",
  "/student/quiz": "تقديم الاختبار",
  "/student/result": "نتيجة الاختبار",
  "/student/messages": "رسائل الطالب",
  "/student/notifications": "تنبيهات الطالب",
  "/student/profile": "الملف الشخصي",
};

function moduleNavItem(module: SpecModule, roles: UserRole[]) {
  return {
    label: moduleLabels[module.path] ?? module.title,
    to: module.path,
    roles,
  };
}

export const roleNavigation: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      title: "الرئيسية",
      items: [
        { label: "لوحة التحكم", to: "/dashboard", roles: ["admin"] },
        { label: "المستخدمون", to: "/admin/users", roles: ["admin"] },
        { label: "حسابات وهمية", to: "/admin/demo-accounts", roles: ["admin"] },
      ],
    },
    {
      title: "الإدارة الأكاديمية",
      items: adminModules.slice(0, 3).map((item) => moduleNavItem(item, ["admin"])),
    },
    {
      title: "الرقابة",
      items: adminModules.slice(3).map((item) => moduleNavItem(item, ["admin"])),
    },
  ],
  teacher: [
    {
      title: "الرئيسية",
      items: [{ label: "لوحة التحكم", to: "/dashboard", roles: ["teacher"] }],
    },
    {
      title: "الطلاب والمناهج",
      items: teacherModules
        .slice(0, 8)
        .map((item) => moduleNavItem(item, ["teacher"])),
    },
    {
      title: "التواصل والتقارير",
      items: teacherModules
        .slice(8)
        .map((item) => moduleNavItem(item, ["teacher"])),
    },
  ],
  student: [
    {
      title: "الرئيسية",
      items: [{ label: "لوحة التحكم", to: "/dashboard", roles: ["student"] }],
    },
    {
      title: "التعلم",
      items: studentModules
        .slice(0, 5)
        .map((item) => moduleNavItem(item, ["student"])),
    },
    {
      title: "التواصل",
      items: studentModules
        .slice(5)
        .map((item) => moduleNavItem(item, ["student"])),
    },
  ],
};

export function findSpecModule(path: string) {
  return [...adminModules, ...teacherModules, ...studentModules].find(
    (module) => module.path === path,
  );
}
