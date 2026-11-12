import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function respond(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function clean(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function getServerSecret() {
  const secretsRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
  const secrets = secretsRaw ? JSON.parse(secretsRaw) : {};
  return secrets.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);

  try {
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > 20_000) return respond({ error: 'Request is too large.' }, 413);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKey = getServerSecret();
    if (!supabaseUrl || !secretKey) {
      console.error('Admin function is missing server credentials.');
      return respond({ error: 'Admin service is not configured.' }, 500);
    }

    const admin = createClient(supabaseUrl, secretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Validate the caller's JWT, then authorize using the protected database role.
    const authHeader = req.headers.get('authorization') ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return respond({ error: 'Please sign in again.' }, 401);

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) return respond({ error: 'Your session is invalid or expired.' }, 401);

    const { data: actor, error: actorError } = await admin
      .from('profiles')
      .select('user_id, role')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (actorError || actor?.role !== 'admin') {
      return respond({ error: 'Administrator access is required for this action.' }, 403);
    }

    const body = await req.json();
    const action = clean(body.action, 32);

    if (action === 'list') {
      const { data: profiles, error: profilesError } = await admin
        .from('profiles')
        .select('user_id, username, full_name, unit_name, unit, age, address, gender, contact_number, role, position, created_at')
        .order('created_at', { ascending: false })
        .limit(1000);
      if (profilesError) throw profilesError;

      const { data: authUsers, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (usersError) throw usersError;
      const authById = new Map(authUsers.users.map((user) => [user.id, user]));

      const accounts = (profiles ?? []).map((profile) => {
        const authUser = authById.get(profile.user_id);
        const bannedUntil = authUser?.banned_until ?? null;
        const isSuspended = Boolean(bannedUntil && Date.parse(bannedUntil) > Date.now());
        return {
          ...profile,
          is_suspended: isSuspended,
          last_sign_in_at: authUser?.last_sign_in_at ?? null,
        };
      });

      return respond({ ok: true, accounts, total: accounts.length });
    }

    if (action === 'create_leader') {
      const username = clean(body.username, 24).toLowerCase();
      const fullName = clean(body.full_name, 100);
      const unitName = clean(body.unit_name, 100);
      const unit = clean(body.unit, 100);
      const age = Number(body.age);
      const address = clean(body.address, 300);
      const gender = clean(body.gender, 32);
      const contactNumber = clean(body.contact_number, 24);
      const password = typeof body.password === 'string' ? body.password : '';
      const position = clean(body.position, 32);

      if (!/^[a-z0-9._]{3,24}$/.test(username)) {
        return respond({ error: 'Username must be 3–24 characters and use lowercase letters, numbers, dots, or underscores.' }, 400);
      }
      if (!fullName || !unitName || !unit || !address || !gender || !contactNumber) {
        return respond({ error: 'Please complete all required account details.' }, 400);
      }
      if (!Number.isInteger(age) || age < 1 || age > 120) return respond({ error: 'Please enter a valid age.' }, 400);
      if (!['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) return respond({ error: 'Please select a valid gender.' }, 400);
      if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(contactNumber)) return respond({ error: 'Please enter a valid contact number.' }, 400);
      if (!['president', 'vice_president'].includes(position)) return respond({ error: 'Choose President or Vice President.' }, 400);
      if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return respond({ error: 'Password must be 8–72 characters and include at least one letter and one number.' }, 400);
      }
      if (body.confirm_password !== password) return respond({ error: 'Password and confirmation do not match.' }, 400);

      const { data: duplicate, error: duplicateError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return respond({ error: 'That username is already in use.' }, 409);

      // The synthetic email is internal to Supabase Auth; users sign in with username only.
      const internalEmail = `${username}@accounts.krianstyle.test`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: internalEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: fullName,
          unit_name: unitName,
          unit,
          age,
          address,
          gender,
          contact_number: contactNumber,
        },
      });
      if (createError || !created.user) {
        console.error('Leader account creation failed:', createError?.message ?? 'No user returned.');
        return respond({ error: 'Unable to create this account. Check the username and try again.' }, 409);
      }

      const { data: createdProfile, error: roleError } = await admin
        .from('profiles')
        .update({ role: 'president_vp', position })
        .eq('user_id', created.user.id)
        .select('user_id')
        .maybeSingle();

      if (roleError || !createdProfile) {
        const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
        if (rollbackError) console.error('Could not roll back a partially created leader account:', rollbackError.message);
        throw roleError ?? new Error('The leadership profile could not be created.');
      }

      return respond({ ok: true, message: `${position === 'president' ? 'President' : 'Vice President'} account created.` }, 201);
    }

    if (action === 'update_role') {
      const userId = clean(body.user_id, 64);
      const role = clean(body.role, 32);
      const position = clean(body.position, 32) || null;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return respond({ error: 'Invalid account ID.' }, 400);
      }
      if (userId === actor.user_id) return respond({ error: 'You cannot change your own administrator access.' }, 400);
      if (!['member', 'officer', 'president_vp'].includes(role)) {
        return respond({ error: 'Choose a valid non-admin account role.' }, 400);
      }
      if (role === 'president_vp' && !['president', 'vice_president'].includes(position ?? '')) {
        return respond({ error: 'Choose President or Vice President.' }, 400);
      }
      if (role !== 'president_vp' && position !== null) {
        return respond({ error: 'Only President/VP accounts may have a leadership position.' }, 400);
      }

      const { data: target, error: targetError } = await admin
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target) return respond({ error: 'Account not found.' }, 404);
      if (target.role === 'admin') return respond({ error: 'Administrator accounts cannot be modified here.' }, 403);

      const { error: updateError } = await admin
        .from('profiles')
        .update({ role, position })
        .eq('user_id', userId);
      if (updateError) throw updateError;
      return respond({ ok: true, message: 'Account role updated.' });
    }

    return respond({ error: 'Unknown admin action.' }, 400);
  } catch (error) {
    console.error('Admin accounts function error:', error);
    return respond({ error: 'The admin request could not be completed. Please try again.' }, 500);
  }
});
