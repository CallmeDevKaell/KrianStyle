# KrianStyle Admin Module

## New app files

- `app/admin/_layout.tsx` — admin route stack.
- `app/admin/index.tsx` — dashboard and account statistics.
- `app/admin/create-leadership.tsx` — admin-only President / Vice President account form.
- `app/admin/accounts.tsx` — account directory, search, role filters, and role changes.
- `lib/useAdminGuard.ts` — verifies the signed-in user's database role before rendering admin screens.
- `lib/adminApi.ts` — authenticated calls to the admin Edge Function.
- `supabase/functions/admin-accounts/index.ts` — server-side admin API.
- `app/login.tsx` — changed so Admin users are routed to `/admin` after login.
- `supabase/config.toml` — includes the Admin function JWT setting.

## Supabase work already applied

- Added `profiles.position` so the database can distinguish President from Vice President while keeping both under the `president_vp` role.
- The `admin-accounts` Edge Function is deployed and active with JWT verification enabled.
- Profile RLS and role restrictions remain enabled. The app cannot directly change a user's role; privileged role changes run through the Admin Edge Function and require the caller's protected database role to be `admin`.
- Admin accounts cannot be edited from the account-management screen. The admin endpoint does not offer an action to create another Admin.

## IMPORTANT: create the first Admin account

The KrianStyle `profiles` table was empty when this module was set up. There is therefore no Admin account yet. First create one normal Member account through the registration screen, then promote only that account once using the Supabase SQL Editor.

Replace `your_admin_username` with the exact username you registered:

```sql
update public.profiles
set role = 'admin', position = null
where lower(username) = lower('your_admin_username');
```

Check that exactly one row was updated. Then sign out of the app and sign back in using that username and password. The login screen routes database role `admin` to `/admin`.

Do not share the Supabase secret/service-role key with the app or place it in `.env.local`.

## Deploy the public member registration function

The app's existing `app/register.tsx` calls a function named `register-member`. The current Supabase project had a sample `smooth-handler` function, not that registration function, when checked. Deploy the source at `supabase/functions/register-member/index.ts` in the Supabase Dashboard as a function named `register-member`, with **Verify JWT OFF**. This is intentionally a public signup endpoint: the function validates all fields, rate-limits registration, creates only `member` role accounts, and uses the server-side Supabase secret. Keep the secret exclusively in Edge Function environment variables.

## Deploy / update the Admin function manually if needed

The deployed function is named `admin-accounts`, has **Verify JWT ON**, and is already active in the KrianStyle project. Its source is `supabase/functions/admin-accounts/index.ts`.

## Admin features

### Dashboard

- Total registered accounts.
- President / Vice President count.
- Officer count.
- Member count.
- Shortcuts to leadership creation and account management.

### Create President / VP account

- Choose President or Vice President.
- Enter username, full name, unit name, unit, age, address, gender, contact number, password, and confirm password.
- Account is created as `president_vp` and stores the selected `position`.

### Account management

- Search by username, full name, or unit.
- Filter Admin, President / VP, Officers, and Members.
- Reassign non-admin accounts to Member, Officer, President, or Vice President.
- Admin accounts are protected from changes in this screen. Permanent deletion is not included.

## Local app dependencies

The Expo app should already have these packages installed:

```bash
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
npm install @supabase/supabase-js
```

Run with:

```bash
npx expo start -c
```
