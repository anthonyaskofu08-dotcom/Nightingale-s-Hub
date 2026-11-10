import { preflight, respond, serviceClient, syntheticEmail } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405);
  const expected = Deno.env.get('PROVISIONING_RECONCILIATION_SECRET');
  if (!expected || request.headers.get('x-reconciliation-secret') !== expected) return respond({ error: 'Not authorized.' }, 401);
  try {
    const admin = serviceClient();
    const { data: jobs, error } = await admin.rpc('claim_institutional_provision_cleanup', { p_limit: 100 });
    if (error) return respond({ error: 'Reconciliation could not be started.' }, 503);
    let cleaned = 0; let enabled = 0; let failures = 0;
    for (const job of jobs ?? []) {
      if (job.status === 'activated') {
        if (!job.auth_user_id) { failures++; continue; }
        const updated = await admin.auth.admin.updateUserById(job.auth_user_id, { ban_duration: 'none' });
        if (updated.error) { failures++; continue; }
        const finished = await admin.rpc('finish_institutional_provision_cleanup', { p_reservation_id: job.reservation_id, p_user_deleted: false });
        if (finished.error) failures++; else enabled++;
        continue;
      }

      const email = syntheticEmail(job.reservation_id);
      const found = await admin.auth.admin.getUserByEmail(email);
      let userDeleted = false;
      if (found.data.user) {
        if (found.data.user.user_metadata?.provisioning_reservation_id !== job.reservation_id) { failures++; continue; }
        const deleted = await admin.auth.admin.deleteUser(found.data.user.id);
        if (deleted.error) { failures++; continue; }
        userDeleted = true;
      } else if (found.error && found.error.status !== 404) { failures++; continue; }
      const finished = await admin.rpc('finish_institutional_provision_cleanup', { p_reservation_id: job.reservation_id, p_user_deleted: userDeleted });
      if (finished.error) failures++; else cleaned++;
    }
    const rateLimitCleanup = await admin.rpc('cleanup_expired_stage1_rate_limits');
    if (rateLimitCleanup.error) failures++;
    return respond({ cleaned, enabled, failures, rateLimitBucketsRemoved: rateLimitCleanup.error ? null : rateLimitCleanup.data });
  } catch { return respond({ error: 'Reconciliation could not be completed.' }, 503); }
});
