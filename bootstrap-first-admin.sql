-- Run this ONCE after you register your own account through the KrianStyle app.
-- Replace the username placeholder with the exact username you registered.
-- Check that exactly one row was updated.
UPDATE public.profiles
SET role = 'admin', position = NULL
WHERE lower(username) = lower('your_admin_username');

-- Verify the result:
SELECT username, full_name, role
FROM public.profiles
WHERE lower(username) = lower('your_admin_username');
