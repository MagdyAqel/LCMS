# LCMS Firestore Schema

This file summarizes the collections required by `PROJECT_SPEC.md`.

## Core Identity

| Collection | Purpose |
| --- | --- |
| `users` | Shared authentication profile for Admin, Teacher, and Student. |
| `teachers` | Detailed teacher records managed by Admin. |
| `students` | Detailed student records managed by the assigned Teacher or Admin. |

## Academic Structure

| Collection | Purpose |
| --- | --- |
| `specializations` | Palestinian Ministry teacher specializations. |
| `educationalStages` | Education stages such as lower basic, upper basic, secondary, and kindergarten. |
| `gradeLevels` | Grade levels linked to `educationalStages`. |
| `subjects` | Subjects linked to stage and grade. |
| `curriculums` | Official curriculums created by Admin and assigned to teachers. |

## Teacher Content

| Collection | Purpose |
| --- | --- |
| `teacherCourses` | Teacher-owned custom curriculums/courses. |
| `courseStudents` | Enrollment link between students and teacher courses. |
| `lessons` | Ordered lessons inside a teacher course. |
| `lessonBlocks` | Reorderable lesson elements: text, image, YouTube, file, quiz, note, activity. |

## Assessment

| Collection | Purpose |
| --- | --- |
| `quizzes` | Lesson quizzes and quiz settings. |
| `quizQuestions` | Multiple-choice quiz questions. |
| `quizOptions` | Options for each quiz question. |
| `quizAttempts` | Student submissions and scores. |
| `quizAnswers` | Student answers per attempt. |
| `studentProgress` | Lesson progress, locks, and completion state. |

## Communication And Audit

| Collection | Purpose |
| --- | --- |
| `notifications` | Admin/teacher notifications for targeted recipients. |
| `messages` | Internal student-teacher messages. |
| `auditLogs` | Immutable audit trail for important operations. |
| `systemSettings` | Admin-managed settings. |

## Ownership Convention

For teacher-owned documents, `teacherId` should store the Firebase Auth UID of the teacher. This keeps Firestore security rules straightforward and prevents a teacher from reading or writing records owned by another teacher.
