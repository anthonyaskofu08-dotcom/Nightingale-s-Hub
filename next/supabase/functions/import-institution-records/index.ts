import { preflight, publicError, readJson, requireAdmin, respond } from '../_shared/core.ts';

Deno.serve(async (request) => {
  const option = preflight(request); if (option) return option;
  try {
    const body = await readJson(request, 1024 * 1024);
    const records = body.records;
    const chunkIndex = Number(body.chunkIndex);
    const clientImportId = String(body.clientImportId ?? '');
    if (!Array.isArray(records) || records.length < 1 || records.length > 500 || !Number.isInteger(chunkIndex) || chunkIndex < 0 || !/^[0-9a-f-]{36}$/i.test(clientImportId)) {
      return respond({ error: 'Choose a valid import chunk of up to 500 rows. Retry the same import with its original import identifier.' }, 400);
    }
    const accountType = records.every((row) => row?.accountType === 'student') ? 'student' : records.every((row) => row?.accountType === 'tutor') ? 'tutor' : null;
    if (!accountType) return respond({ error: 'An import chunk must contain one account type only.' }, 400);
    const { admin, actorId, institutionId } = await requireAdmin(request, String(body.institutionId ?? ''));
    const staged = await admin.rpc('create_institutional_import_chunk', {
      p_actor_id: actorId, p_institution_id: institutionId, p_account_type: accountType,
      p_import_name: String(body.importName ?? 'Institution register').slice(0, 255),
      p_client_import_id: clientImportId, p_chunk_index: chunkIndex, p_rows: records,
    });
    if (staged.error) return respond({ error: 'The import chunk could not be staged. Correct the reported data and retry this chunk.' }, 409);
    return respond(staged.data);
  } catch (error) { return publicError(error); }
});
