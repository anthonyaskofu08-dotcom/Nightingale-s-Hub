import { preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const location = String(body.location ?? '').trim(); const officialContact = String(body.officialContact ?? '').trim();
    if (location.length > 200 || officialContact.length > 254 || !location || !officialContact) return respond({ error: 'Enter a valid location and official contact.' }, 400);
    const updated = await admin.rpc('update_institution_profile', { p_actor_id: actorId, p_institution_id: institutionId, p_location: location, p_contact: officialContact });
    if (updated.error) return respond({ error: 'The institution profile could not be updated and audited.' }, 409);
    return respond({ saved: true });
  } catch (error) { return publicError(error); }
});
