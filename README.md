# LCMS

Learning Content Management System built with React, Vite, Tailwind CSS, and Firebase.

The project follows the GitHub `PROJECT_SPEC.md` for an Arabic RTL educational content management system for Admin, Teacher, and Student roles.

## Stack

- React + Vite
- TypeScript
- Tailwind CSS
- React Router
- Firebase Authentication
- Cloud Firestore
- Firebase Storage
- Firebase Hosting-ready config

## Run Locally

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in your Firebase web app values. This workspace already has a local `.env.local` for `lcms-9ed7b`.

## Roles

- `admin`: manages teachers, users, settings, audit logs, and demo accounts.
- `teacher`: created by an admin with a username and initial password.
- `student`: created by a teacher with a username and initial password.

Login accepts either username or email. Usernames are converted internally to Firebase Auth emails like `student01@lcms.test`, but the user only types `student01`.

Create the first admin account manually once, then use `/admin/demo-accounts` to create the sample accounts:

- Admins: `admin01` / `Admin@2026!01`, `admin02` / `Admin@2026!02`
- Teachers: `teacher01`..`teacher05` / `Teacher@2026!01`..`Teacher@2026!05`
- Students: `student01`..`student10` / `Student@2026!01`..`Student@2026!10`

Deploy `firestore.rules` and `storage.rules` before using the app with real data.

```bash
firebase deploy --only firestore:rules,storage
```

## Documentation

- Database schema: `docs/DATABASE_SCHEMA.md`
- Security notes: `docs/SECURITY.md`
- Pages and permissions: `docs/PAGES_AND_PERMISSIONS.md`
