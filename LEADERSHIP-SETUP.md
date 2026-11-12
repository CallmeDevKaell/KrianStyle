# KrianStyle President / Vice President Module

This module adds the President and Vice President workspace to the Expo app.

## Included screens

- `app/leadership/index.tsx` — President / VP dashboard and account overview.
- `app/leadership/create-officer.tsx` — create an Officer account or submit an Officer account request, with a required position assignment.
- `app/leadership/accounts.tsx` — account directory, search and filters, President approval/rejection actions.
- `lib/leadershipApi.ts` — calls the secured leadership Edge Function.
- `lib/useLeadershipGuard.ts` — restricts the screens to approved President / VP profiles.
- `supabase/functions/leadership-accounts/index.ts` — server-side role checks and account operations.
- `supabase/sql/officer-approval-workflow.sql` — schema migration reference.

## Approval rules

1. Each new Officer must be assigned one position: `moderator`, `secretary`, `treasurer`, `auditor`, or `editor_media` (Editor & Media).
2. President-created Officer accounts are created with `role = officer` and `approval_status = approved`.
3. Vice President-created Officer accounts are created with `role = officer` and `approval_status = pending`.
4. Only an approved President profile can approve or reject a pending Officer request.
5. Pending or rejected Officer accounts are signed out by the app at login and cannot enter the Officer area.
6. President and Vice President can view Account Management. The VP can see their own pending requests, while the President can see all pending requests.
7. Only the President can change an existing Member/Officer role from Account Management. Admin and President/VP roles cannot be modified in this screen.

## Supabase status

The approval columns and indexes have already been applied to the existing `KrianStyle Website` Supabase project. The `leadership-accounts` Edge Function has also been deployed and is active. It is configured with platform JWT verification off because the function validates the signed-in user's bearer token itself and checks the user's approved President/VP role before every action. The server secret remains in Supabase and is never included in the Expo app.

The SQL file is included as a reference for the schema change; do not re-run it on the current production project unless you are setting up another project. Its statements use `IF NOT EXISTS` and are repeatable.

## Run the app

From the `KrianStyleApp` folder:

```bash
npm install
npx expo start -c
```

Sign in with an existing President or Vice President username. The login screen routes approved leadership accounts to `/leadership` automatically. The President/VP create-officer form now requires the assigned Officer position.
