import { preflight, respond, serviceClient, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const caller = userClient(request); const { data: auth, error } = await caller.auth.getUser();
    if (error || !auth.user) return respond({ error: 'Sign in to continue.' }, 401);
    const body = await request.json(); const admin = serviceClient();
    const result = await admin.rpc('sync_tutor_authorizations', { p_actor_id: auth.user.id, p_record_id: String(body.recordId ?? '') });
    if (result.error) return respond({ error: 'Verified tutor subjects could not be applied. Check the record and institution permissions.' }, 409);
    return respond({ updatedSubjects: result.data });
  } catch { return respond({ error: 'Verified tutor subjects could not be applied.' }, 400); }
});
