import { preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const action = body.action === 'add' ? 'add' : body.action === 'activate' ? 'activate' : body.action === 'deactivate' ? 'deactivate' : null;
    if (!action) return respond({ error: 'Choose a valid programme action.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const result = await admin.rpc('manage_institution_programme', { p_actor_id: actorId, p_institution_id: institutionId, p_action: action, p_programme_id: action === 'add' ? String(body.programmeId ?? '') : null, p_offering_id: action === 'add' ? null : String(body.offeringId ?? '') });
    if (result.error || !result.data) return respond({ error: 'The programme offering could not be changed and audited. It may already exist or no longer be available.' }, 409);
    return respond({ saved: true });
  } catch (error) { return publicError(error); }
});
