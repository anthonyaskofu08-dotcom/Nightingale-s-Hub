import { preflight, publicError, requireAdmin, respond, serviceClient, provisioningRecord } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json();
    if (body.identityVerified !== true) return respond({ error: 'Confirm that the institution has completed its identity-verification procedure.' }, 400);
    const accountType = body.accountType === 'tutor' ? 'tutor' : body.accountType === 'student' ? 'student' : null;
    if (!accountType) return respond({ error: 'Choose a valid institutional account type.' }, 400);
    const verificationMethod = String(body.verificationMethod ?? '').trim();
    const caseReference = String(body.caseReference ?? '').trim();
    if (verificationMethod.length < 5 || verificationMethod.length > 200 || caseReference.length < 3 || caseReference.length > 200) return respond({ error: 'Record the official verification method and a minimal case reference.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const { data: record } = await provisioningRecord(admin, institutionId, accountType, body.identifier);
    if (!record?.account_user_id || record.verification_status !== 'verified') return respond({ error: 'No active matching account could be verified.' }, 404);
    const role = await admin.from('role_assignments').select('id').eq('user_id', record.account_user_id).eq('institution_id', institutionId).in('role', accountType === 'student' ? ['institutional_student'] : ['tutor','lecturer']).eq('status', 'active').maybeSingle();
    const user = await admin.auth.admin.getUserById(record.account_user_id);
    if (!role.data || user.error || !user.data.user?.email) return respond({ error: 'No active matching account could be verified.' }, 404);
    const requested = await admin.rpc('create_institutional_recovery_request', { p_actor_id: actorId, p_record_id: record.id, p_method: verificationMethod, p_case_reference: caseReference });
    if (requested.error || !requested.data) return respond({ error: 'Recovery request could not be recorded. No link was generated.' }, 409);
    const redirectTo = `${Deno.env.get('APP_ORIGIN')}/reset-password`;
    const generated = await admin.auth.admin.generateLink({ type: 'recovery', email: user.data.user.email, options: { redirectTo } });
    if (generated.error || !generated.data.properties?.action_link) {
      const failed = await admin.rpc('complete_institutional_recovery_request', { p_actor_id: actorId, p_request_id: requested.data, p_outcome: 'failed', p_failure_code: 'recovery_link_generation_failed' });
      if (failed.error) return respond({ error: 'Recovery link generation failed and the request needs administrator follow-up.' }, 503);
      return respond({ error: 'Recovery link could not be created. The failed request was recorded for audit.' }, 502);
    }
    const issued = await admin.rpc('complete_institutional_recovery_request', { p_actor_id: actorId, p_request_id: requested.data, p_outcome: 'issued' });
    if (issued.error || issued.data !== true) return respond({ error: 'A recovery link was generated but not released because issuance could not be recorded. Contact support before retrying.' }, 503);
    return respond({ recoveryUrl: generated.data.properties.action_link, requestId: requested.data });
  } catch (error) { return publicError(error); }
});
