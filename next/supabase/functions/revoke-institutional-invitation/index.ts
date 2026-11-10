import { preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const id = String(body.id ?? ''); const kind = body.kind === 'setup' ? 'setup' : body.kind === 'invitation' ? 'invitation' : null;
    if (!id || !kind) return respond({ error: 'Choose a valid pending invitation.' }, 400);
    const { admin, actorId } = await requireAdmin(request);
    const revoked = await admin.rpc('revoke_institutional_token', { p_actor_id: actorId, p_token_id: id, p_kind: kind });
    if (revoked.error) return respond({ error: 'The invitation could not be revoked.' }, 409);
    return respond({ revoked: true });
  } catch (error) { return publicError(error); }
});
