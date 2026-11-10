import { hashToken, preflight, respond, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const caller = userClient(request); const { data: auth, error } = await caller.auth.getUser();
    if (error || !auth.user || !auth.user.email_confirmed_at) return respond({ error: 'Sign in to your verified independent learner account before linking.' }, 401);
    const body = await request.json(); const token = String(body.token ?? ''); const identifier = String(body.identifier ?? '').trim();
    if (token.length < 32 || !identifier) return respond({ error: 'The invitation or identifier could not be verified.' }, 400);
    const { error: linkError } = await caller.rpc('link_existing_student_account', { p_actor_id: auth.user.id, p_token_hash: await hashToken(token), p_identifier: identifier });
    if (linkError) return respond({ error: 'The invitation or identifier could not be verified, or it is already linked to an account.' }, 400);
    return respond({ linked: true });
  } catch { return respond({ error: 'The invitation or identifier could not be verified.' }, 400); }
});
