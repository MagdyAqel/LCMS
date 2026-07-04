# Firebase Security Notes

Security is split between Firebase Authentication, Firestore rules, and Storage rules.

## Roles

The app currently reads the user role from `users/{uid}.role`.

Allowed roles:

- `admin`
- `teacher`
- `student`

Normal self-registration creates `student` accounts. Admin promotion should be done by a trusted Admin from the users screen after the first Admin is manually assigned in Firestore.

## First Admin

1. Create an account from `/register`.
2. Open Firestore.
3. Update `users/{uid}.role` to `admin`.
4. Deploy `firestore.rules`.

## Firestore Rules

The rules in `firestore.rules` enforce:

- Admin can manage global academic structure and user roles.
- Teacher can manage only records where `teacherId == request.auth.uid`.
- Student can read only records assigned to their UID or created by them.
- Audit logs are append-only and readable by Admin only.
- Unknown collections are denied by default.

## Storage Rules

Storage writes are scoped by path:

- `course-assets/{teacherId}/{courseId}/...`
- `student-imports/{teacherId}/...`

Teachers can write only under their own UID path. Admin Storage writes require a custom claim `role: "admin"` because Storage rules cannot read the Firestore role document as flexibly as Firestore rules.

## Production Recommendation

For stronger production security, mirror Firestore roles into Firebase Auth Custom Claims using a trusted backend or Cloud Function. Keep Firestore role documents for UI display, but use custom claims for Storage and highly sensitive checks.
