import { hashToken, preflight, publicError, randomToken, requireAdmin, respond, serviceClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const admin = serviceClient();
    const found = await admin.from('institutional_records').select('*').eq('id', String(body.recordId ?? '')).maybeSingle();
    if (!found.data) return respond({ error: 'The record could not be found.' }, 404);
    const context = await requireAdmin(request, found.data.institution_id);
    if (!['pending','needs_review','verified'].includes(found.data.verification_status)) return respond({ error: 'This record requires a separate verification review.' }, 409);
    const token = found.data.account_user_id ? '' : randomToken(); const tokenHash = token ? await hashToken(token) : null;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const result = await admin.rpc('verify_institutional_record_and_issue_setup', { p_actor_id: context.actorId, p_record_id: found.data.id, p_token_hash: tokenHash, p_expires_at: expiresAt });
    if (result.error) return respond({ error: 'The record could not be verified or a setup link may already be active.' }, 409);
    if (!result.data?.setupIssued) return respond({ verified: true, linkedAccountAccessChanged: false });
    const origin = Deno.env.get('APP_ORIGIN') ?? request.headers.get('origin') ?? '';
    return respond({ setupUrl: `${origin}/invitation?token=${token}`, expiresAt });
  } catch (error) { return publicError(error); }
});
