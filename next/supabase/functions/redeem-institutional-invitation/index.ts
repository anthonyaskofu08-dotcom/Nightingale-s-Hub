import { checkRateLimit, clearIdentifierRateLimit, hashToken, normalizeIdentifier, preflight, rateLimitKeys, readJson, recordRateLimitFailure, respond, serviceClient, syntheticEmail, trustedClientIp } from '../_shared/core.ts';

const invalid = () => respond({ error: 'The invitation or account details are invalid or expired.' }, 400);

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  const admin = serviceClient();
  let buckets: string[] = [];
  let identifierBucket = '';
  try {
    const body = await readJson(request, 16 * 1024);
    const token = String(body.token ?? '');
    const identifier = normalizeIdentifier(body.identifier);
    const password = String(body.password ?? '');
    if (token.length < 32 || token.length > 512 || !identifier || password.length < 10 || password.length > 256) return invalid();

    const tokenHash = await hashToken(token);
    const ip = trustedClientIp(request);
    identifierBucket = (await rateLimitKeys([`redeem:token:${tokenHash}`]))[0];
    buckets = [identifierBucket, ...(ip ? await rateLimitKeys([`redeem:ip:${ip}`]) : [])];
    const limit = await checkRateLimit(admin, buckets);
    if (limit.blocked) {
      const seconds = Math.max(1, Math.ceil((new Date(limit.retryAt ?? Date.now()).getTime() - Date.now()) / 1000));
      return respond({ error: 'The invitation or account details are invalid or expired. Try again later.' }, 429, { 'Retry-After': String(seconds) });
    }

    const reservationResult = await admin.rpc('reserve_institutional_provision', { p_token_hash: tokenHash, p_identifier: identifier, p_account_type: null });
    const reservation = reservationResult.data as { reservationId?: string; status?: string; accountType?: 'student' | 'tutor'; authUserId?: string; recordId?: string } | null;
    if (reservationResult.error || !reservation?.reservationId || !reservation.accountType || !reservation.recordId || reservation.status !== 'reserved') {
      await recordRateLimitFailure(admin, buckets);
      return invalid();
    }
    const record = await admin.from('institutional_records').select('account_type,current_data,account_user_id,verification_status').eq('id', reservation.recordId).maybeSingle();
    const displayName = String(record.data?.current_data?.full_name ?? '').trim();
    if (record.error || !record.data || record.data.account_type !== reservation.accountType || record.data.account_user_id || record.data.verification_status !== 'verified' || !displayName) {
      await recordRateLimitFailure(admin, buckets); return invalid();
    }

    const email = syntheticEmail(reservation.reservationId);
    let authUser = await admin.auth.admin.getUserByEmail(email);
    if (!authUser.data.user) {
      const created = await admin.auth.admin.createUser({
        email, password, email_confirm: true, ban_duration: '876000h',
        user_metadata: { provisioning_reservation_id: reservation.reservationId, display_name: displayName },
      });
      if (created.error || !created.data.user) {
        authUser = await admin.auth.admin.getUserByEmail(email);
        if (!authUser.data.user || authUser.data.user.user_metadata?.provisioning_reservation_id !== reservation.reservationId) {
          await recordRateLimitFailure(admin, buckets); return invalid();
        }
      } else authUser = { data: { user: created.data.user }, error: null } as typeof authUser;
    } else if (authUser.data.user.user_metadata?.provisioning_reservation_id !== reservation.reservationId) {
      await recordRateLimitFailure(admin, buckets); return invalid();
    }

    const userId = authUser.data.user!.id;
    if (reservation.authUserId && reservation.authUserId !== userId) { await recordRateLimitFailure(admin, buckets); return invalid(); }
    const passwordUpdate = await admin.auth.admin.updateUserById(userId, { password, ban_duration: '876000h' });
    if (passwordUpdate.error) { await recordRateLimitFailure(admin, buckets); return invalid(); }
    const attached = await admin.rpc('attach_institutional_provision_user', { p_reservation_id: reservation.reservationId, p_user_id: userId });
    if (attached.error) { await recordRateLimitFailure(admin, buckets); return invalid(); }
    const finalized = await admin.rpc('finalize_reserved_institutional_provision', { p_reservation_id: reservation.reservationId, p_user_id: userId, p_display_name: displayName });
    if (finalized.error) { await recordRateLimitFailure(admin, buckets); return invalid(); }

    const enabled = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' });
    if (enabled.error) return respond({ error: 'Account setup is complete and is being finalized. Please try signing in shortly.' }, 503);
    await admin.rpc('finish_institutional_provision_cleanup', { p_reservation_id: reservation.reservationId, p_user_deleted: false });
    const login = await admin.auth.signInWithPassword({ email, password });
    if (login.error || !login.data.session) return respond({ error: 'Account setup is complete. Please sign in using your institution and identifier.' }, 200);
    await clearIdentifierRateLimit(admin, identifierBucket);
    return respond({ access_token: login.data.session.access_token, refresh_token: login.data.session.refresh_token, expires_at: login.data.session.expires_at });
  } catch {
    if (buckets.length) { try { await recordRateLimitFailure(admin, buckets); } catch { /* no raw token or password is logged */ } }
    return invalid();
  }
});
