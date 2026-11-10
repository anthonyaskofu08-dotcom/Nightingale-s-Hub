import { preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json();
    const { admin, actorId, institutionId } = await requireAdmin(request, String(body.institutionId ?? ''));
    if (body.action === 'get-settings') {
      const { data, error } = await admin.from('institution_tutor_id_settings').select('current_prefix,sequence_width').eq('institution_id', institutionId).maybeSingle();
      if (error) throw new Error('Tutor ID settings could not be loaded.');
      return respond({ prefix: data?.current_prefix ?? '', sequenceWidth: data?.sequence_width ?? 4 });
    }
    if (body.action !== 'allocate') return respond({ error: 'Choose a valid Tutor ID action.' }, 400);
    const allocated = await admin.rpc('allocate_institution_tutor_id', { p_actor_id: actorId, p_institution_id: institutionId, p_prefix: String(body.prefix ?? '') });
    if (allocated.error) return respond({ error: 'A Tutor ID could not be allocated. Check the prefix and try again.' }, 409);
    return respond({ identifier: allocated.data });
  } catch (error) { return publicError(error); }
});
