# KrianStyle Login & Registration Setup

## Files added or changed

- `app/index.tsx` — landing page now includes Log In and Join KrianStyle buttons.
- `app/_layout.tsx` — Expo Router stack layout (add only if your project does not already have one).
- `app/login.tsx` — username + password login screen.
- `app/register.tsx` — member registration form.
- `lib/supabase.ts` — Supabase client with persistent React Native sessions.
- `.env.local` — existing KrianStyle Supabase URL and publishable key.
- `supabase/functions/register-member/index.ts` — secure server-side member account creation.
- `supabase/config.toml` — disables JWT verification for the public registration endpoint.

## Install the React Native dependencies

```bash
npx expo install @react-native-async-storage/async-storage react-native-url-polyfill
```

The project also needs `@supabase/supabase-js`, `expo-router`, and `react-native-safe-area-context`.

## Deploy the registration Edge Function

The registration function creates the internal Supabase Auth account as a pre-confirmed user. This avoids turning off Confirm Email globally, which could change email sign-up behavior on the existing KrianStyle website. The Supabase secret key is read from the Edge Function environment only and is never included in the mobile app.

Using the Supabase Dashboard:

1. Open the **KrianStyle Website** project.
2. Go to **Edge Functions** → **Deploy a new function** → **Via Editor**.
3. Name the function `register-member`.
4. Replace the sample code with `supabase/functions/register-member/index.ts`.
5. Deploy the function.
6. Open its settings/details and turn **Verify JWT** OFF. The function is an unauthenticated registration endpoint; its code validates all fields and applies a database-backed limit of five attempts per IP hash per hour.

Do not put a Supabase secret/service-role key in `.env.local` or in any app source file. Supabase supplies `SUPABASE_SECRET_KEYS` to Edge Functions as a server environment variable; the function uses its `default` key (with a legacy fallback).

The database rate-limit helper and private table have already been created in the KrianStyle project.

## Registration fields

Username, full name, name of unit, unit, age, address, gender, contact number, password, and confirm password. Passwords are handled by Supabase Auth and are not stored in `profiles`.

New public registrations are always assigned the `member` role. The form cannot choose Admin, President/VP, or Officer. Those roles must be assigned separately by an authorized administrator.

## Database and shared website safety

The `public.profiles` table and RLS policies have been created in the existing KrianStyle Supabase project. The Auth trigger creates a profile only when the complete KrianStyle mobile registration metadata is supplied; unrelated website signups in the shared project are skipped. The initial role is fixed to `member`.
