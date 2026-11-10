import { preflight, respond, serviceClient, userClient } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const authClient = userClient(request); const { data: auth, error } = await authClient.auth.getUser();
    if (error || !auth.user || !auth.user.email_confirmed_at) return respond({ error: 'Verify your applicant email before submitting.' }, 401);
    const details = auth.user.user_metadata?.institution_application;
    if (auth.user.user_metadata?.registration_path !== 'institution_applicant' || !details || typeof details !== 'object') return respond({ error: 'Institution application details are incomplete.' }, 400);
    const institutionName = String(details.institution_name ?? '').trim(); const institutionType = String(details.institution_type ?? '').trim(); const location = String(details.location ?? '').trim(); const contact = String(details.official_contact ?? '').trim();
    if (!institutionName || !institutionType || !location || !contact) return respond({ error: 'Institution application details are incomplete.' }, 400);
    const admin = serviceClient();
    const result = await admin.rpc('submit_institution_registration', { p_actor_id: auth.user.id, p_institution_name: institutionName, p_type: institutionType, p_location: location, p_contact: contact, p_display_name: String(auth.user.user_metadata?.display_name ?? '').trim() });
    if (result.error || !result.data) return respond({ error: 'Institution application could not be recorded and audited.' }, 400);
    return respond({ submitted: true, registrationId: result.data });
  } catch { return respond({ error: 'Institution application could not be recorded.' }, 400); }
});
