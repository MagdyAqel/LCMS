export type GradeLevel = {
  number: number;
  name: string;
  stage: "basicLower" | "basicUpper" | "secondary";
};

export type SecondaryTrack =
  | "scientific"
  | "humanities"
  | "entrepreneurship"
  | "industrial"
  | "sharia";

export type CurriculumCatalogEntry = {
  gradeNumber: number;
  gradeName: string;
  stage: GradeLevel["stage"];
  track?: SecondaryTrack;
  trackName?: string;
  subjects: string[];
};

export const gradeLevels: GradeLevel[] = [
  { number: 1, name: "الصف الأول الأساسي", stage: "basicLower" },
  { number: 2, name: "الصف الثاني الأساسي", stage: "basicLower" },
  { number: 3, name: "الصف الثالث الأساسي", stage: "basicLower" },
  { number: 4, name: "الصف الرابع الأساسي", stage: "basicLower" },
  { number: 5, name: "الصف الخامس الأساسي", stage: "basicUpper" },
  { number: 6, name: "الصف السادس الأساسي", stage: "basicUpper" },
  { number: 7, name: "الصف السابع الأساسي", stage: "basicUpper" },
  { number: 8, name: "الصف الثامن الأساسي", stage: "basicUpper" },
  { number: 9, name: "الصف التاسع الأساسي", stage: "basicUpper" },
  { number: 10, name: "الصف العاشر الأساسي", stage: "basicUpper" },
  { number: 11, name: "الصف الحادي عشر", stage: "secondary" },
  { number: 12, name: "الصف الثاني عشر", stage: "secondary" },
];

export const secondaryTracks = [
  { value: "scientific", label: "العلمي" },
  { value: "humanities", label: "العلوم الإنسانية" },
  { value: "entrepreneurship", label: "الريادة والأعمال" },
  { value: "industrial", label: "الصناعي" },
  { value: "sharia", label: "الشرعي" },
] as const;

export const gradeOptions = gradeLevels.map((grade) => ({
  label: grade.name,
  value: String(grade.number),
}));

export const trackOptions = secondaryTracks.map((track) => ({
  label: track.label,
  value: track.value,
}));

const commonPrimarySubjects = [
  "لغتنا الجميلة",
  "الرياضيات",
  "اللغة الإنجليزية",
  "التربية الإسلامية",
  "التربية الوطنية والحياتية",
  "التربية المسيحية عند الحاجة",
];

const gradeThreeFourSubjects = [
  "لغتنا الجميلة",
  "الرياضيات",
  "اللغة الإنجليزية",
  "العلوم والحياة",
  "التربية الإسلامية",
  "التنشئة الوطنية والاجتماعية",
  "التربية المسيحية عند الحاجة",
];

const gradeFiveSixSubjects = [
  "اللغة العربية",
  "الرياضيات",
  "اللغة الإنجليزية",
  "العلوم والحياة",
  "الدراسات الاجتماعية",
  "التربية الإسلامية",
  "التكنولوجيا والبرمجة",
  "التربية الفنية والرياضية",
  "التربية المسيحية عند الحاجة",
];

const gradeSevenNineSubjects = [
  "اللغة العربية",
  "الرياضيات",
  "اللغة الإنجليزية",
  "العلوم والحياة",
  "الدراسات الاجتماعية",
  "التربية الإسلامية",
  "التكنولوجيا والبرمجة",
  "التربية الفنية والرياضية والمهنية",
  "اللغة الفرنسية",
  "التربية المسيحية عند الحاجة",
];

export const curriculumCatalog: CurriculumCatalogEntry[] = [
  ...[1, 2].map((gradeNumber) => ({
    gradeNumber,
    gradeName: gradeLevels[gradeNumber - 1].name,
    stage: "basicLower" as const,
    subjects: commonPrimarySubjects,
  })),
  ...[3, 4].map((gradeNumber) => ({
    gradeNumber,
    gradeName: gradeLevels[gradeNumber - 1].name,
    stage: "basicLower" as const,
    subjects: gradeThreeFourSubjects,
  })),
  ...[5, 6].map((gradeNumber) => ({
    gradeNumber,
    gradeName: gradeLevels[gradeNumber - 1].name,
    stage: "basicUpper" as const,
    subjects: gradeFiveSixSubjects,
  })),
  ...[7, 8, 9].map((gradeNumber) => ({
    gradeNumber,
    gradeName: gradeLevels[gradeNumber - 1].name,
    stage: "basicUpper" as const,
    subjects: gradeSevenNineSubjects,
  })),
  {
    gradeNumber: 10,
    gradeName: "الصف العاشر الأساسي",
    stage: "basicUpper",
    subjects: [
      "اللغة العربية",
      "الرياضيات",
      "اللغة الإنجليزية",
      "الفيزياء",
      "الكيمياء",
      "العلوم الحياتية",
      "جغرافية وتاريخ فلسطين",
      "التربية الإسلامية",
      "حاسوب وتكنولوجيا",
      "التربية الفنية والرياضية",
      "اللغة الفرنسية عند الحاجة",
      "التربية المسيحية عند الحاجة",
    ],
  },
  {
    gradeNumber: 11,
    gradeName: "الصف الحادي عشر",
    stage: "secondary",
    track: "scientific",
    trackName: "العلمي",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "الفيزياء",
      "الكيمياء",
      "العلوم الحياتية",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
      "التربية الفنية والرياضية",
    ],
  },
  {
    gradeNumber: 11,
    gradeName: "الصف الحادي عشر",
    stage: "secondary",
    track: "humanities",
    trackName: "العلوم الإنسانية",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "التاريخ",
      "الجغرافيا",
      "الثقافة العلمية",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
      "التربية الفنية والرياضية",
    ],
  },
  {
    gradeNumber: 11,
    gradeName: "الصف الحادي عشر",
    stage: "secondary",
    track: "entrepreneurship",
    trackName: "الريادة والأعمال",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "الإدارة والاقتصاد",
      "المحاسبة",
      "المشاريع الصغيرة",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
      "التربية الفنية والرياضية",
    ],
  },
  {
    gradeNumber: 11,
    gradeName: "الصف الحادي عشر",
    stage: "secondary",
    track: "sharia",
    trackName: "الشرعي",
    subjects: [
      "القرآن الكريم وعلومه",
      "الحديث الشريف",
      "الفقه الإسلامي",
      "العقيدة",
      "أساليب الدعوة وفن الخطابة",
      "التاريخ",
      "الرياضيات",
      "اللغة العربية",
      "اللغة الإنجليزية",
      "تكنولوجيا المعلومات",
      "التربية الفنية والرياضية",
    ],
  },
  {
    gradeNumber: 11,
    gradeName: "الصف الحادي عشر",
    stage: "secondary",
    track: "industrial",
    trackName: "الصناعي",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
      "مناهج تخصصية حسب التخصص الصناعي مثل الرسم الصناعي، الكهرباء، الإلكترونيات، الاتصالات، الميكانيك",
    ],
  },
  {
    gradeNumber: 12,
    gradeName: "الصف الثاني عشر",
    stage: "secondary",
    track: "scientific",
    trackName: "العلمي",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "الفيزياء",
      "الكيمياء",
      "العلوم الحياتية",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
    ],
  },
  {
    gradeNumber: 12,
    gradeName: "الصف الثاني عشر",
    stage: "secondary",
    track: "humanities",
    trackName: "العلوم الإنسانية",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "التاريخ",
      "الجغرافيا",
      "الثقافة العلمية",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
    ],
  },
  {
    gradeNumber: 12,
    gradeName: "الصف الثاني عشر",
    stage: "secondary",
    track: "entrepreneurship",
    trackName: "الريادة والأعمال",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "الإدارة والاقتصاد",
      "المحاسبة",
      "المشاريع الصغيرة",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
    ],
  },
  {
    gradeNumber: 12,
    gradeName: "الصف الثاني عشر",
    stage: "secondary",
    track: "sharia",
    trackName: "الشرعي",
    subjects: [
      "القرآن الكريم وعلومه",
      "الحديث الشريف",
      "الفقه الإسلامي",
      "النظم الإسلامية",
      "التاريخ",
      "الرياضيات",
      "اللغة العربية",
      "اللغة الإنجليزية",
      "تكنولوجيا المعلومات",
    ],
  },
  {
    gradeNumber: 12,
    gradeName: "الصف الثاني عشر",
    stage: "secondary",
    track: "industrial",
    trackName: "الصناعي",
    subjects: [
      "اللغة العربية",
      "اللغة الإنجليزية",
      "الرياضيات",
      "التربية الإسلامية أو المسيحية",
      "تكنولوجيا المعلومات",
      "مناهج تخصصية حسب المجال الصناعي مثل الإلكترونيات الصناعية، كهرباء السيارات، كهرباء الاستعمال، الرسم الصناعي، الاتصالات، النجارة، الميكانيك",
    ],
  },
];

export function getStageCatalog(stageName: unknown) {
  const name = String(stageName ?? "");

  if (name.includes("الدنيا")) {
    return curriculumCatalog.filter((entry) => entry.stage === "basicLower");
  }

  if (name.includes("العليا")) {
    return curriculumCatalog.filter((entry) => entry.stage === "basicUpper");
  }

  if (name.includes("الثانوية")) {
    return curriculumCatalog.filter((entry) => entry.stage === "secondary");
  }

  return curriculumCatalog;
}
