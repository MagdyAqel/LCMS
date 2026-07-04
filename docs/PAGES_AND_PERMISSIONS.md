# LCMS Pages And Permissions

## Admin

- `/dashboard`
- `/admin/users`
- `/admin/teachers`
- `/admin/specializations`
- `/admin/stages`
- `/admin/grades`
- `/admin/subjects`
- `/admin/curriculums`
- `/admin/reports`
- `/admin/audit-logs`
- `/admin/settings`

Admin can manage users, teachers, stages, grades, subjects, official curriculums, reports, audit logs, and system settings.

## Teacher

- `/dashboard`
- `/teacher/students`
- `/teacher/students/import`
- `/teacher/students/export`
- `/teacher/courses`
- `/teacher/lessons`
- `/teacher/lesson-blocks`
- `/teacher/quizzes`
- `/teacher/quiz-results`
- `/teacher/notifications`
- `/teacher/messages`
- `/teacher/reports`
- `/teacher/activity-log`

Teacher pages are scoped by `teacherId == request.auth.uid` where applicable.

## Student

- `/dashboard`
- `/student/courses`
- `/student/course-detail`
- `/student/lesson`
- `/student/quiz`
- `/student/result`
- `/student/messages`
- `/student/notifications`
- `/student/profile`

Student pages are scoped to the current student UID through course membership, messages, notifications, and quiz attempts.
