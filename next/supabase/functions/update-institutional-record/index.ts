import { preflight, publicError, requireAdmin, respond, serviceClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const admin = serviceClient();
    const found = await admin.from('institutional_records').select('*').eq('id', String(body.recordId ?? '')).maybeSingle();
    if (!found.data) return respond({ error: 'The record could not be found.' }, 404);
    const { actorId, institutionId } = await requireAdmin(request, found.data.institution_id);
    const input = body.changes;
    if (!input || typeof input !== 'object' || Array.isArray(input)) return respond({ error: 'Enter valid record corrections.' }, 400);
    const next = { ...found.data.current_data } as Record<string, unknown>;
    for (const key of ['full_name','year_of_study','subjects']) if (key in input) next[key] = String(input[key] ?? '').trim() || null;
    if ('programme' in input || 'academic_level' in input) {
      if (found.data.account_type === 'student') {
        const [programme, level] = await Promise.all([
          admin.from('programmes').select('id,name').eq('name', String(input.programme ?? found.data.current_data.programme ?? '')).eq('active', true).maybeSingle(),
          admin.from('learning_levels').select('id,name').eq('name', String(input.academic_level ?? found.data.current_data.academic_level ?? '')).eq('active', true).maybeSingle(),
        ]);
        if (!programme.data || !level.data) return respond({ error: 'Choose an active programme and academic level.' }, 400);
        const offering = await admin.from('institution_programme_offerings').select('id').eq('institution_id', institutionId).eq('programme_id', programme.data.id).eq('status', 'active').maybeSingle();
        if (!offering.data) return respond({ error: 'That programme is not offered by this institution.' }, 400);
        next.programme = programme.data.name; next.programme_id = programme.data.id; next.academic_level = level.data.name; next.learning_level_id = level.data.id;
      } else {
        if ('programme' in input) next.programme_responsibility = String(input.programme ?? '').trim() || null;
      }
    }
    if (!String(next.full_name ?? '').trim()) return respond({ error: 'Full name is required.' }, 400);
    const update = await admin.rpc('update_institutional_record', { p_actor_id: actorId, p_record_id: found.data.id, p_next_data: next });
    if (update.error) return respond({ error: 'The record could not be updated and audited.' }, 409);
    return respond({ ...update.data, linkedAccountAccessChanged: false });
  } catch (error) { return publicError(error); }
});
