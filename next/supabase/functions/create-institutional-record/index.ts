import { normalizeIdentifier, preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json();
    const accountType = body.accountType === 'tutor' ? 'tutor' : body.accountType === 'student' ? 'student' : null;
    const identifier = String(body.identifier ?? '').trim();
    const fullName = String(body.fullName ?? '').trim();
    if (!accountType || !identifier || !fullName || identifier.length > 100 || fullName.length > 200) return respond({ error: 'Enter a valid account type, identifier and name.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const normalized = normalizeIdentifier(identifier);
    if (!normalized) return respond({ error: 'Enter a valid identifier.' }, 400);
    let programmeId: string | null = null; let levelId: string | null = null;
    if (accountType === 'student') {
      const programme = await admin.from('programmes').select('id').ilike('name', String(body.programme ?? '').trim()).eq('active', true).maybeSingle();
      const level = await admin.from('learning_levels').select('id').ilike('name', String(body.academicLevel ?? '').trim()).eq('active', true).maybeSingle();
      if (programme.error || level.error || !programme.data || !level.data) return respond({ error: 'Choose an available programme and academic level.' }, 400);
      const offering = await admin.from('institution_programme_offerings').select('id').eq('institution_id', institutionId).eq('programme_id', programme.data.id).eq('status', 'active').maybeSingle();
      if (!offering.data) return respond({ error: 'That programme is not offered by this institution.' }, 400);
      programmeId = programme.data.id; levelId = level.data.id;
    }
    const currentData = { full_name: fullName, programme: body.programme ?? null, programme_id: programmeId, academic_level: body.academicLevel ?? null, learning_level_id: levelId, year_of_study: body.yearOfStudy ?? null, subjects: body.subjects ?? null };
    const inserted = await admin.rpc('create_institutional_record', { p_actor_id: actorId, p_institution_id: institutionId, p_account_type: accountType, p_identifier: identifier, p_data: currentData });
    if (inserted.error) return respond({ error: 'That identifier is already recorded or could not be added. Check the institutional directory.' }, 409);
    return respond({ recordId: inserted.data, verificationStatus: 'pending' });
  } catch (error) { return publicError(error); }
});
