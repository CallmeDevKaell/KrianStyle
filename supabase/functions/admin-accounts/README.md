# admin-accounts Edge Function

Deploy as `admin-accounts` with **Verify JWT ON**. It validates the caller's Auth JWT and then checks `public.profiles.role = 'admin'` before returning account data, creating leadership accounts, or changing non-admin roles.

Never expose the Supabase secret/service-role key to the mobile app.
