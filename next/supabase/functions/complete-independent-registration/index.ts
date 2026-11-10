import { preflight, respond, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const user = userClient(request); const { data: auth, error } = await user.auth.getUser();
    if (error || !auth.user || !auth.user.email_confirmed_at) return respond({ error: 'Verify your email before completing account setup.' }, 401);
    const body = await request.json();
    const programmeId = String(body.programmeId ?? auth.user.user_metadata?.programme_id ?? '');
    const levelId = String(body.learningLevelId ?? auth.user.user_metadata?.learning_level_id ?? '');
    if (!programmeId || !levelId) return respond({ error: 'Choose an available programme and academic level.' }, 400);
    const { error: completionError } = await user.rpc('complete_independent_registration', { p_user_id: auth.user.id, p_programme_id: programmeId, p_learning_level_id: levelId });
    if (completionError) return respond({ error: 'Account setup could not be completed.' }, 400);
    return respond({ complete: true });
  } catch { return respond({ error: 'Account setup could not be completed.' }, 400); }
});
