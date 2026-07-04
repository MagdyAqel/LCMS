export type UserRole = "admin" | "teacher" | "student";
export type RecordStatus = "active" | "inactive" | "archived" | "draft" | "published";

export type AppUser = {
  uid: string;
  email: string;
  username?: string;
  contactEmail?: string;
  displayName: string;
  role: UserRole;
  disabled?: boolean;
  photoURL?: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type CourseStatus = "draft" | "published" | "archived";

export type Course = {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  status: CourseStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TeacherProfile = {
  teacherId: string;
  userId: string;
  fullName: string;
  nationalId: string;
  birthDate: string;
  specializationId: string;
  whatsappNumber: string;
  email: string;
  status: "active" | "inactive";
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type StudentProfile = {
  studentId: string;
  userId: string;
  fullName: string;
  nationalId: string;
  stageId: string;
  gradeId: string;
  whatsappNumber: string;
  email?: string;
  teacherId: string;
  status: "active" | "inactive";
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type LookupRecord = {
  id: string;
  name: string;
  description?: string;
  order?: number;
  status: "active" | "inactive";
  stageId?: string;
  gradeId?: string;
};

export type Curriculum = {
  curriculumId: string;
  name: string;
  stageId: string;
  gradeId: string;
  subjectId: string;
  teacherId: string;
  startDate: string;
  endDate: string;
  status: "active" | "inactive" | "archived";
  description: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type TeacherCourse = {
  courseId: string;
  teacherId: string;
  curriculumId?: string;
  title: string;
  subjectId: string;
  stageId: string;
  gradeId: string;
  objectives: string;
  description: string;
  learningMode: "linear" | "free";
  passingScore: number;
  startDate: string;
  endDate: string;
  status: "draft" | "active" | "archived";
  studentIds?: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type LessonBlockType =
  | "text"
  | "image"
  | "youtube"
  | "externalLink"
  | "file"
  | "quiz"
  | "note"
  | "activity";

export type Lesson = {
  lessonId: string;
  courseId: string;
  teacherId: string;
  title: string;
  objectives: string;
  status: "draft" | "published" | "archived";
  order: number;
  availableFrom?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type LessonBlock = {
  blockId: string;
  lessonId: string;
  type: LessonBlockType;
  title?: string;
  content?: string;
  url?: string;
  filePath?: string;
  order: number;
  status: "active" | "inactive";
};

export type Quiz = {
  quizId: string;
  lessonId: string;
  courseId: string;
  teacherId: string;
  title: string;
  description: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  passingScore: number;
  attemptsAllowed: number;
  showResultImmediately: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type NotificationPriority = "info" | "important" | "urgent";
export type NotificationTargetType =
  | "allStudents"
  | "courseStudents"
  | "singleStudent"
  | "teacher"
  | "allTeachers";

export type AuditLog = {
  logId: string;
  userId: string;
  userRole: UserRole;
  actionType: string;
  entityType: string;
  entityId: string;
  description: string;
  oldValue?: unknown;
  newValue?: unknown;
  createdAt?: unknown;
  ipAddress?: string;
};
