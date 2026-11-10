import { checkRateLimit, clearIdentifierRateLimit, normalizeIdentifier, preflight, rateLimitKeys, readJson, recordRateLimitFailure, respond, serviceClient, syntheticEmail, trustedClientIp } from '../_shared/core.ts';

const failure = () => respond({ error: 'Those account details could not be verified.' }, 400);

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  const admin = serviceClient();
  let buckets: string[] = [];
  let identifierBucket = '';
  try {
    const body = await readJson(request, 16 * 1024);
    const accountType = body.accountType === 'tutor' ? 'tutor' : body.accountType === 'student' ? 'student' : null;
    const institutionId = String(body.institutionId ?? '');
    const identifier = normalizeIdentifier(body.identifier);
    const password = String(body.password ?? '');
    if (!accountType || !institutionId || !identifier || !password || password.length > 256) return failure();

    const ip = trustedClientIp(request);
    identifierBucket = (await rateLimitKeys([`institutional-login:id:${institutionId}:${accountType}:${identifier}`]))[0];
    buckets = [identifierBucket, ...(ip ? await rateLimitKeys([`institutional-login:institution-ip:${institutionId}:${ip}`, `institutional-login:ip:${ip}`]) : [])];
    const limit = await checkRateLimit(admin, buckets);
    if (limit.blocked) {
      const seconds = Math.max(1, Math.ceil((new Date(limit.retryAt ?? Date.now()).getTime() - Date.now()) / 1000));
      return respond({ error: 'Those account details could not be verified. Try again later.' }, 429, { 'Retry-After': String(seconds) });
    }

    const record = await admin.from('institutional_records').select('account_user_id,verification_status').eq('institution_id', institutionId).eq('account_type', accountType).eq('normalized_identifier', identifier).maybeSingle();
    let eligibleUserId: string | null = null;
    if (!record.error && record.data?.account_user_id && record.data.verification_status === 'verified') {
      const institution = await admin.from('institutions').select('status').eq('id', institutionId).maybeSingle();
      const role = await admin.from('role_assignments').select('id').eq('user_id', record.data.account_user_id).eq('institution_id', institutionId).in('role', accountType === 'student' ? ['institutional_student'] : ['tutor','lecturer']).eq('status', 'active').maybeSingle();
      const membership = await admin.from('institution_memberships').select('id').eq('user_id', record.data.account_user_id).eq('institution_id', institutionId).eq('status', 'active').maybeSingle();
      if (institution.data?.status === 'published' && role.data && membership.data) eligibleUserId = record.data.account_user_id;
    }

    // Always execute the Auth password grant, even for an unknown/inactive ID, to
    // reduce identifier timing differences. Failures are deliberately indistinguishable.
    let authEmail = syntheticEmail(crypto.randomUUID());
    if (eligibleUserId) {
      const user = await admin.auth.admin.getUserById(eligibleUserId);
      if (!user.error && user.data.user?.email) authEmail = user.data.user.email;
    }
    const login = await fetch(`${Deno.env.get('SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: Deno.env.get('SUPABASE_ANON_KEY')!, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: authEmail, password }),
    });
    if (!login.ok || !eligibleUserId) {
      await recordRateLimitFailure(admin, buckets);
      return failure();
    }
    const session = await login.json();
    await clearIdentifierRateLimit(admin, identifierBucket);
    return respond({ access_token: session.access_token, refresh_token: session.refresh_token, expires_at: session.expires_at });
  } catch {
    if (buckets.length) { try { await recordRateLimitFailure(admin, buckets); } catch { /* fail closed; no secrets are logged */ } }
    return failure();
  }
});
