# KrianStyle Mobile App

Expo Router mobile application for the KrianStyle community. The app uses a dark navy and blue visual theme and the existing KrianStyle Website Supabase project.

## Current features

- Community landing page with the two KrianStyle logos.
- Username/password login and member registration.
- Admin dashboard, President/VP account creation, and account management.
- President/VP dashboard, Officer account creation, and account management.
- Position-based Officer dashboard with separate Secretary attendance for Eyeball and Meeting.
- Vice President Officer requests require President approval before the Officer can log in.
- Supabase Edge Functions keep privileged account operations on the server.

## Requirements

- Node.js LTS
- npm
- Expo Go or an Android/iOS emulator

## Install and run

```bash
npm install
npx expo start -c
```

## Project structure

```text
KrianStyleApp/
├── app/
│   ├── admin/
│   ├── leadership/
│   ├── officer/
│   ├── index.tsx
│   ├── login.tsx
│   └── register.tsx
├── assets/
├── lib/
├── supabase/
│   ├── functions/
│   └── sql/
├── .env.local
└── package.json
```

## Supabase configuration

The `.env.local` file contains the project URL and publishable key. These are public-client values; do not add the Supabase secret/service-role key to this file or to any Expo file.

The production project already has the `profiles` table, RLS policies, registration rate limiter, approval workflow columns, and the `register-member`, `admin-accounts`, and `leadership-accounts` Edge Functions deployed. See `ADMIN-SETUP.md`, `README-AUTH-SETUP.md`, `LEADERSHIP-SETUP.md`, and `OFFICER-SETUP.md` for their respective workflows.

## Important role behavior

- Public registration creates Member accounts only.
- Admin creates President/VP accounts.
- President-created Officer accounts activate immediately.
- Vice President-created Officer accounts remain pending until President approval.
- Every Officer account is assigned one position: Moderator, Secretary, Treasurer, Auditor, or Editor & Media.
- Only an approved Secretary account can open and manage the attendance module. Other Officer areas remain visible but read-only until their modules are built.
- Eyeball and Meeting attendance are stored separately with a member name and date.
- Pending and rejected Officers cannot enter the app's Officer area.
