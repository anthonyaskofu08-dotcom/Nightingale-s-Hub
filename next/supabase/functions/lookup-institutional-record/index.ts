import { consumeLookupLimit, normalizeIdentifier, preflight, publicError, rateLimitKeys, requireAdmin, respond, trustedClientIp, provisioningRecord } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json();
    const accountType = body.accountType === 'tutor' ? 'tutor' : body.accountType === 'student' ? 'student' : null;
    const identifier = String(body.identifier ?? '').trim();
    if (!accountType || !normalizeIdentifier(identifier) || identifier.length > 100) return respond({ error: 'Enter a valid identifier.' }, 400);
    const { admin, institutionId, actorId } = await requireAdmin(request, String(body.institutionId ?? ''));
    const ip = trustedClientIp(request);
    const buckets = await rateLimitKeys([`record-lookup:user:${actorId}`, `record-lookup:institution:${institutionId}`, ...(ip ? [`record-lookup:ip:${ip}`] : [])]);
    if (!await consumeLookupLimit(admin, buckets)) return respond({ error: 'Too many record lookups. Wait a minute and try again.' }, 429, { 'Retry-After': '60' });
    const { data, error } = await provisioningRecord(admin, institutionId, accountType, identifier);
    if (error) throw new Error('record lookup failed');
    if (!data) return respond({ found: false });
    return respond({ found: true, record: { id: data.id, account_type: data.account_type, identifier: data.identifier, original_data: data.original_data, current_data: data.current_data, verified_data: data.verified_data, verification_status: data.verification_status, account_user_id: data.account_user_id, updated_at: data.updated_at } });
  } catch (error) { return publicError(error); }
});
