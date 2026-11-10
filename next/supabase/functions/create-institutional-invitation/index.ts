import { hashToken, preflight, publicError, randomToken, requireAdmin, respond, provisioningRecord } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const accountType = body.accountType === 'tutor' ? 'tutor' : body.accountType === 'student' ? 'student' : null;
    const identifier = String(body.identifier ?? '').trim();
    if (!accountType || !identifier) return respond({ error: 'Enter an account type and identifier.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const { data: record } = await provisioningRecord(admin, institutionId, accountType, identifier);
    if (!record || record.account_user_id || record.verification_status !== 'verified') return respond({ error: 'No available verified official record matches those details.' }, 409);
    const token = randomToken(); const tokenHash = await hashToken(token); const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const result = await admin.rpc('create_institutional_invitation', { p_actor_id: actorId, p_institution_id: institutionId, p_record_id: record.id, p_account_type: accountType, p_token_hash: tokenHash, p_expires_at: expiresAt });
    if (result.error) return respond({ error: 'An active invitation already exists or this identifier is unavailable.' }, 409);
    const origin = Deno.env.get('APP_ORIGIN') ?? request.headers.get('origin') ?? '';
    return respond({ invitationUrl: `${origin}/invitation?token=${token}`, expiresAt });
  } catch (error) { return publicError(error); }
});
