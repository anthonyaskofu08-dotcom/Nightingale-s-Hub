import { preflight, publicError, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await request.json(); const batchId = String(body.batchId ?? ''); const acceptedRowIds = body.acceptedRowIds;
    if (!batchId || !Array.isArray(acceptedRowIds) || acceptedRowIds.length > 5000) return respond({ error: 'Select the reviewed rows to apply.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, body.institutionId);
    const batch = await admin.from('institutional_import_batches').select('id,institution_id,status').eq('id', batchId).eq('institution_id', institutionId).maybeSingle();
    if (!batch.data || batch.data.status !== 'review') return respond({ error: 'The import batch is no longer available for review.' }, 404);
    const result = await admin.rpc('apply_institutional_import', { p_actor_id: actorId, p_batch_id: batchId, p_accept_row_ids: acceptedRowIds });
    if (result.error) return respond({ error: 'The selected import rows could not be applied. Review the batch and try again.' }, 409);
    return respond({ applied: result.data });
  } catch (error) { return publicError(error); }
});
