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

function text(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  if (!req.headers.get('apikey')) return respond({ error: 'Missing project API key.' }, 401);

  try {
    const contentLength = Number(req.headers.get('content-length') ?? '0');
    if (contentLength > 12_000) return respond({ error: 'Request is too large.' }, 413);

    const body = await req.json();
    const username = text(body.username, 24).toLowerCase();
    const fullName = text(body.full_name, 100);
    const unitName = text(body.unit_name, 100);
    const unit = text(body.unit, 100);
    const address = text(body.address, 300);
    const gender = text(body.gender, 32);
    const contactNumber = text(body.contact_number, 24);
    const age = Number(body.age);
    const password = typeof body.password === 'string' ? body.password : '';

    if (!/^[a-z0-9._]{3,24}$/.test(username)) {
      return respond({ error: 'Username must be 3–24 characters and use only lowercase letters, numbers, dots, or underscores.' }, 400);
    }
    if (!fullName || !unitName || !unit || !address || !gender || !contactNumber) {
      return respond({ error: 'Please complete all registration fields.' }, 400);
    }
    if (!Number.isInteger(age) || age < 1 || age > 120) {
      return respond({ error: 'Please enter a valid age.' }, 400);
    }
    if (!['Male', 'Female', 'Other', 'Prefer not to say'].includes(gender)) {
      return respond({ error: 'Please select a valid gender option.' }, 400);
    }
    if (!/^\+?[0-9][0-9\s()-]{6,18}$/.test(contactNumber)) {
      return respond({ error: 'Please enter a valid contact number.' }, 400);
    }
    if (password.length < 8 || password.length > 72 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      return respond({ error: 'Password must be 8–72 characters and include at least one letter and one number.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const secretKeysRaw = Deno.env.get('SUPABASE_SECRET_KEYS');
    const secretKeys = secretKeysRaw ? JSON.parse(secretKeysRaw) : {};
    const serverSecretKey = secretKeys.default ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serverSecretKey) {
      console.error('Missing Supabase server environment variables.');
      return respond({ error: 'Registration service is not configured.' }, 500);
    }

    const admin = createClient(supabaseUrl, serverSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Limit each network address to five registration attempts per hour.
    // Only a one-way hash of the IP address is stored in the private schema.
    const ipAddress = req.headers.get('cf-connecting-ip')
      ?? req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? 'unknown';
    const ipHash = await sha256(ipAddress);
    const { data: allowed, error: limitError } = await admin.rpc('consume_krian_registration_limit', {
      p_ip_hash: ipHash,
    });
    if (limitError) {
      console.error('Registration rate limit check failed:', limitError.message);
      return respond({ error: 'Registration is temporarily unavailable. Please try again later.' }, 503);
    }
    if (allowed !== true) return respond({ error: 'Too many registration attempts. Please try again in one hour.' }, 429);

    // This synthetic address is internal to Supabase Auth. It is not a real mailbox.
    // Email is pre-confirmed server-side, so no global Confirm Email setting needs to change.
    const internalEmail = `${username}@accounts.krianstyle.test`;
    const { data, error } = await admin.auth.admin.createUser({
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

    if (error || !data.user) {
      console.error('Member account creation failed:', error?.message ?? 'No user returned.');
      return respond({ error: 'Unable to create the account. The username may already be taken; please check and try again.' }, 409);
    }

    return respond({ ok: true, message: 'KrianStyle member account created.' }, 201);
  } catch (error) {
    console.error('Unexpected registration error:', error);
    return respond({ error: 'Something went wrong while creating the account. Please try again.' }, 500);
  }
});
