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
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  const keys = raw ? JSON.parse(raw) : {};
  return keys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);

  try {
    if (Number(req.headers.get('content-length') ?? '0') > 24_000) {
      return respond({ error: 'Request is too large.' }, 413);
    }

    const url = Deno.env.get('SUPABASE_URL');
    const secret = getServerSecret();
    if (!url || !secret) return respond({ error: 'Leadership service is not configured.' }, 500);

    const admin = createClient(url, secret, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authorization = req.headers.get('authorization') ?? '';
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    if (!token || token === authorization) {
      return respond({ error: 'Please sign in again.' }, 401);
    }

    const { data: authData, error: authError } = await admin.auth.getUser(token);
    if (authError || !authData.user) {
      return respond({ error: 'Your session is invalid or expired. Please sign in again.' }, 401);
    }

    const { data: actor, error: actorError } = await admin
      .from('profiles')
      .select('user_id, role, position, approval_status, full_name')
      .eq('user_id', authData.user.id)
      .maybeSingle();

    if (actorError || actor?.role !== 'president_vp' || actor?.approval_status !== 'approved') {
      return respond({ error: 'Approved President/VP access is required.' }, 403);
    }

    const isPresident = actor.position === 'president';
    const body = await req.json();
    const action = clean(body.action, 32);

    if (action === 'list') {
      let query = admin
        .from('profiles')
        .select('user_id, username, full_name, unit_name, unit, age, address, gender, contact_number, role, position, officer_position, approval_status, requested_by, reviewed_by, reviewed_at, review_note, created_at')
        .neq('role', 'admin')
        .order('created_at', { ascending: false })
        .limit(1000);

      if (!isPresident) {
        query = query.or('approval_status.eq.approved,approval_status.eq.rejected,requested_by.eq.' + actor.user_id);
      }

      const { data: accounts, error } = await query;
      if (error) throw error;

      const visible = accounts ?? [];
      return respond({
        ok: true,
        accounts: visible,
        total: visible.length,
        pending: visible.filter((item) => item.approval_status === 'pending').length,
        is_president: isPresident,
      });
    }

    if (action === 'create_officer') {
      const username = clean(body.username, 24).toLowerCase();
      const fullName = clean(body.full_name, 100);
      const unitName = clean(body.unit_name, 100);
      const unit = clean(body.unit, 100);
      const age = Number(body.age);
      const address = clean(body.address, 300);
      const gender = clean(body.gender, 32);
      const contact = clean(body.contact_number, 24);
      const password = typeof body.password === 'string' ? body.password : '';
      const officerPosition = clean(body.officer_position, 32);

      if (!['moderator', 'secretary', 'treasurer', 'auditor', 'editor_media'].includes(officerPosition)) {
        return respond({ error: 'Choose a valid Officer position.' }, 400);
      }
      if (!/^[a-z0-9._]{3,24}$/.test(username)) {
        return respond({ error: 'Username must be 3–24 characters and use lowercase letters, numbers, dots, or underscores.' }, 400);
      }
      if (!fullName || !unitName || !unit || !address || !gender || !contact) {
        return respond({ error: 'Please complete all required account details.' }, 400);
      }
      if (!Number.isInteger(age) || age < 1 || age > 120) {
        return respond({ error: 'Please enter a valid age.' }, 400);
      }
      if (!['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) {
        return respond({ error: 'Please select a valid gender.' }, 400);
      }
      if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(contact)) {
        return respond({ error: 'Please enter a valid contact number.' }, 400);
      }
      if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return respond({ error: 'Password must be 8–72 characters and include at least one letter and one number.' }, 400);
      }
      if (body.confirm_password !== password) {
        return respond({ error: 'Password and confirmation do not match.' }, 400);
      }

      const { data: duplicate, error: duplicateError } = await admin
        .from('profiles')
        .select('user_id')
        .eq('username', username)
        .maybeSingle();
      if (duplicateError) throw duplicateError;
      if (duplicate) return respond({ error: 'That username is already in use.' }, 409);

      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: username + '@accounts.krianstyle.test',
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
          contact_number: contact,
        },
      });

      if (createError || !created.user) {
        console.error('Officer account creation failed:', createError?.message ?? 'No user returned.');
        return respond({ error: 'Unable to create this account. Check the username and try again.' }, 409);
      }

      const approvalStatus = isPresident ? 'approved' : 'pending';
      const { data: savedProfile, error: saveError } = await admin
        .from('profiles')
        .update({
          role: 'officer',
          position: null,
          officer_position: officerPosition,
          approval_status: approvalStatus,
          requested_by: actor.user_id,
          reviewed_by: isPresident ? actor.user_id : null,
          reviewed_at: isPresident ? new Date().toISOString() : null,
          review_note: null,
        })
        .eq('user_id', created.user.id)
        .select('user_id')
        .maybeSingle();

      if (saveError || !savedProfile) {
        const { error: rollbackError } = await admin.auth.admin.deleteUser(created.user.id);
        if (rollbackError) console.error('Officer account rollback failed:', rollbackError.message);
        throw saveError ?? new Error('Officer profile could not be saved.');
      }

      return respond({
        ok: true,
        approval_status: approvalStatus,
        officer_position: officerPosition,
        message: isPresident
          ? 'Officer account created and activated.'
          : 'Officer account request submitted. It will be available after President approval.',
      }, 201);
    }

    if (action === 'review_officer') {
      if (!isPresident) return respond({ error: 'Only the President can approve or reject officer account requests.' }, 403);

      const userId = clean(body.user_id, 64);
      const decision = clean(body.decision, 16);
      const note = clean(body.note, 300) || null;

      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return respond({ error: 'Invalid account ID.' }, 400);
      }
      if (!['approve', 'reject'].includes(decision)) {
        return respond({ error: 'Choose approve or reject.' }, 400);
      }

      const { data: target, error: targetError } = await admin
        .from('profiles')
        .select('user_id, role, approval_status')
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target || target.role !== 'officer' || target.approval_status !== 'pending') {
        return respond({ error: 'This officer request is no longer pending.' }, 409);
      }

      const { error: updateError } = await admin
        .from('profiles')
        .update({
          approval_status: decision === 'approve' ? 'approved' : 'rejected',
          reviewed_by: actor.user_id,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq('user_id', userId)
        .eq('approval_status', 'pending');
      if (updateError) throw updateError;

      return respond({
        ok: true,
        message: decision === 'approve' ? 'Officer account approved.' : 'Officer account request rejected.',
      });
    }

    if (action === 'update_role') {
      if (!isPresident) return respond({ error: 'Only the President can change account roles.' }, 403);

      const userId = clean(body.user_id, 64);
      const role = clean(body.role, 32);
      const officerPosition = clean(body.officer_position, 32) || null;
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)) {
        return respond({ error: 'Invalid account ID.' }, 400);
      }
      if (userId === actor.user_id) return respond({ error: 'You cannot change your own leadership access.' }, 400);
      if (!['member', 'officer'].includes(role)) return respond({ error: 'Choose Member or Officer.' }, 400);
      if (role === 'officer' && !['moderator', 'secretary', 'treasurer', 'auditor', 'editor_media'].includes(officerPosition ?? '')) {
        return respond({ error: 'Choose the Officer position to assign.' }, 400);
      }

      const { data: target, error: targetError } = await admin
        .from('profiles')
        .select('user_id, role')
        .eq('user_id', userId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!target || target.role === 'admin' || target.role === 'president_vp') {
        return respond({ error: 'This account role cannot be changed here.' }, 403);
      }

      const { error: updateError } = await admin
        .from('profiles')
        .update({ role, officer_position: role === 'officer' ? officerPosition : null, approval_status: 'approved', requested_by: null, reviewed_by: actor.user_id, reviewed_at: new Date().toISOString(), review_note: null })
        .eq('user_id', userId);
      if (updateError) throw updateError;

      return respond({ ok: true, message: 'Account role updated.' });
    }

    return respond({ error: 'Unknown leadership action.' }, 400);
  } catch (error) {
    console.error('Leadership accounts error:', error);
    return respond({ error: 'The leadership request could not be completed. Please try again.' }, 500);
  }
});
