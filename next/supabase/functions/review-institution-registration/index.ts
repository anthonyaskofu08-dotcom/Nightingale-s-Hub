import { preflight, respond, serviceClient, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const caller = userClient(request); const { data: auth, error } = await caller.auth.getUser();
    if (error || !auth.user) return respond({ error: 'Sign in with a platform administrator account.' }, 401);
    const body = await request.json(); const action = ['verify','approve','reject','publish'].includes(body.action) ? body.action : '';
    const admin = serviceClient();
    const role = await admin.from('role_assignments').select('id').eq('user_id', auth.user.id).eq('role', 'global_admin').eq('status', 'active').maybeSingle();
    if (!role.data) return respond({ error: 'This action is not authorized.' }, 403);
    const result = await admin.rpc('review_institution_registration', { p_actor_id: auth.user.id, p_registration_id: String(body.registrationId ?? ''), p_action: action, p_reason: String(body.reason ?? ''), p_evidence_method: String(body.evidenceMethod ?? '') });
    if (result.error) return respond({ error: 'The institution review action could not be completed.' }, 409);
    return respond(result.data);
  } catch { return respond({ error: 'The institution review action could not be completed.' }, 400); }
});
