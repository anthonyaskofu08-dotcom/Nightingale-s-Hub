import { preflight, respond, serviceClient, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const caller = userClient(request);
    const { data: auth, error } = await caller.auth.getUser();
    if (error || !auth.user) return respond({ error: 'Sign in with a global administrator account.' }, 401);
    const body = await request.json();
    const action = body.action === 'escalate' || body.action === 'close' ? body.action : null;
    const evidenceMethod = String(body.evidenceMethod ?? '').trim();
    const evidenceReference = String(body.evidenceReference ?? '').trim();
    if (!action || evidenceMethod.length < 5 || evidenceMethod.length > 200 || evidenceReference.length < 3 || evidenceReference.length > 200) return respond({ error: 'Choose an exceptional-case action and provide its review evidence.' }, 400);
    const admin = serviceClient();
    const role = await admin.from('role_assignments').select('id').eq('user_id', auth.user.id).eq('role', 'global_admin').is('institution_id', null).eq('status', 'active').maybeSingle();
    if (role.error || !role.data) return respond({ error: 'This action is not authorized.' }, 403);
    const result = await admin.rpc('finalize_institutional_recovery', {
      p_reviewer_id: auth.user.id,
      p_request_id: String(body.requestId ?? ''),
      p_action: action,
      p_evidence_method: evidenceMethod,
      p_evidence_reference: evidenceReference,
    });
    if (result.error) return respond({ error: 'The exceptional recovery case could not be updated.' }, 409);
    return respond(result.data);
  } catch { return respond({ error: 'The exceptional recovery case could not be updated.' }, 400); }
});
