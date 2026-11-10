import { preflight, respond, serviceClient, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const caller = userClient(request); const { data: auth, error } = await caller.auth.getUser();
    if (error || !auth.user) return respond({ error: 'Sign in with a global administrator account.' }, 401);
    const body = await request.json(); const kind = body.kind === 'programme' ? 'programme' : body.kind === 'level' ? 'level' : null;
    const action = ['add','deactivate','activate'].includes(body.action) ? body.action : null;
    if (!kind || !action) return respond({ error: 'Choose a valid catalogue action.' }, 400);
    const admin = serviceClient(); const role = await admin.from('role_assignments').select('id').eq('user_id', auth.user.id).eq('role', 'global_admin').eq('status', 'active').maybeSingle();
    if (!role.data) return respond({ error: 'This action is not authorized.' }, 403);
    const name = String(body.name ?? '').trim();
    if (action === 'add' && (!name || name.length > 150)) return respond({ error: 'Enter a valid catalogue name.' }, 400);
    const sortOrder = Number(body.sortOrder ?? 0);
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) return respond({ error: 'Enter a valid catalogue order.' }, 400);
    const result = await admin.rpc('manage_academic_catalogue', { p_actor_id: auth.user.id, p_kind: kind, p_action: action, p_id: String(body.id ?? '') || null, p_name: name, p_sort_order: sortOrder });
    if (result.error || !result.data) return respond({ error: 'The catalogue item could not be saved and audited. It may already exist or be in use.' }, 409);
    return respond({ saved: true });
  } catch { return respond({ error: 'The catalogue action could not be completed.' }, 400); }
});
