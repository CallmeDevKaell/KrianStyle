# KrianStyle Officer Module

## Officer positions

Each account created by the President or Vice President must be assigned one position:

- Moderator — module pending development
- Secretary — active attendance module
- Treasurer — module pending development
- Auditor — module pending development
- Editor & Media — one combined position; module pending development

## Access rules

- Only an approved account with `role = officer` can open `/officer`.
- `officer_position` controls the assigned area.
- The Secretary module route requires `officer_position = secretary`. Other Officer positions are redirected to the Officer dashboard.
- Other Officer modules remain visible as read-only/pending cards. A Secretary cannot use the Moderator, Treasurer, Auditor, or Editor & Media modules.
- The `attendance_records` table is protected by RLS. Only an approved Secretary account can read, insert, update, or delete attendance records.

## Secretary attendance

The Secretary module keeps two separate lists:

- Eyeball attendance
- Meeting attendance

Each record contains the member's name and the attendance date. The date must be entered as `YYYY-MM-DD`. A duplicate member/date/type entry is prevented by a unique index.

## Backend status

- The `officer_position` column and constraint are applied to the existing Supabase `profiles` table.
- The `attendance_records` table and Secretary-only RLS policies are applied.
- The `leadership-accounts` Edge Function is deployed and accepts the Officer position during account creation.
- The mobile app uses the public publishable key only. The server secret remains inside Supabase.

## Run

From the `KrianStyleApp` folder:

```bash
npm install
npx expo start -c
```
