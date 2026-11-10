import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, Eyebrow } from '../../components/ui/Primitives';
import { allocateTutorId, applyInstitutionImport, createInstitutionalInvitation, createInstitutionalRecord, getInstitutionImportRows, getInstitutionRecords, getInstitutionalInvitations, getPendingInstitutionImportBatches, getTutorIdSettings, importInstitutionRecords, lookupInstitutionalRecord, revokeInstitutionalInvitation, verifyInstitutionalRecord, issueInstitutionalRecoveryLink, getInstitutionAdminInstitutions, updateInstitutionalRecord, syncTutorAuthorizations } from '../../services/identity/auth';
import { parseInstitutionRegister, type ImportedInstitutionRecord } from '../../services/identity/institutionalRecords';

type Props = { mode: 'records' | 'invitations' | 'students' | 'lecturers'; notify: (message: string) => void };
export default function InstitutionalRecords({ mode, notify }: Props) {
  const directoryKind = mode === 'students' ? 'student' : mode === 'lecturers' ? 'tutor' : null;
  const [kind, setKind] = useState<'student' | 'tutor'>(directoryKind ?? 'student');
  const [rows, setRows] = useState<ImportedInstitutionRecord[]>([]);
  const [fileName, setFileName] = useState('');
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [issuedLink, setIssuedLink] = useState('');
  const [batchIds, setBatchIds] = useState<string[]>([]);
  const [clientImportId, setClientImportId] = useState(() => crypto.randomUUID());
  const [stagedRows, setStagedRows] = useState<{ id: string; batch_id: string; row_number: number; proposed_data: Record<string, unknown>; review_status: string; conflict_reason: string | null }[]>([]);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [officialRecords, setOfficialRecords] = useState<{ id: string; account_type: string; identifier: string; current_data: Record<string, unknown>; verification_status: string; account_user_id: string | null }[]>([]);
  const [recordsError, setRecordsError] = useState('');
  const [editingRecord, setEditingRecord] = useState<(typeof officialRecords)[number] | null>(null);
  const [invites, setInvites] = useState<Awaited<ReturnType<typeof getInstitutionalInvitations>>>([]);
  const [adminInstitutions, setAdminInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [institutionId, setInstitutionId] = useState('');
  const [identifierValue, setIdentifierValue] = useState('');
  const [tutorPrefix, setTutorPrefix] = useState('');
  const [matchingRecord, setMatchingRecord] = useState<(typeof officialRecords)[number] | null>(null);

  useEffect(() => { void getInstitutionAdminInstitutions().then((items) => { setAdminInstitutions(items); if (items.length === 1) setInstitutionId(items[0].id); }).catch((cause: unknown) => setRecordsError(cause instanceof Error ? cause.message : 'Institution scope unavailable.')); }, []);
  useEffect(() => { if (directoryKind) setKind(directoryKind); }, [directoryKind]);
  useEffect(() => { if (institutionId && mode === 'records') void getPendingInstitutionImportBatches(institutionId).then(setBatchIds).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Pending import reviews could not be loaded.')); else setBatchIds([]); }, [institutionId, mode]);
  useEffect(() => { setIdentifierValue(''); setMatchingRecord(null); }, [institutionId, kind]);
  useEffect(() => { if (institutionId && kind === 'tutor') void getTutorIdSettings(institutionId).then((settings) => setTutorPrefix(settings.prefix)).catch((cause: unknown) => setRecordsError(cause instanceof Error ? cause.message : 'Tutor ID settings could not be loaded.')); }, [institutionId, kind]);

  useEffect(() => {
    if (!['records','students','lecturers'].includes(mode)) return;
    if (!institutionId) return;
    void getInstitutionRecords(institutionId).then(setOfficialRecords).catch((cause: unknown) => setRecordsError(cause instanceof Error ? cause.message : 'Official records could not be loaded.'));
  }, [mode, institutionId]);
  useEffect(() => {
    if (mode !== 'invitations') return;
    if (!institutionId) return;
    void getInstitutionalInvitations(institutionId).then(setInvites).catch((cause: unknown) => setRecordsError(cause instanceof Error ? cause.message : 'Invitation status could not be loaded.'));
  }, [mode, institutionId]);
  useEffect(() => {
    if (!batchIds.length) { setStagedRows([]); return; }
    void Promise.all(batchIds.map((id) => getInstitutionImportRows(id))).then((groups) => {
      const rows = groups.flat() as typeof stagedRows; setStagedRows(rows);
      setSelectedRows(rows.filter((row) => row.review_status === 'new' || row.review_status === 'changed').map((row) => row.id));
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Import review could not be loaded.'));
  }, [batchIds]);

  const clear = () => { setError(''); setNotice(''); };
  const lookupIdentifier = async () => {
    const identifier = identifierValue.trim();
    if (!institutionId || !identifier) { setMatchingRecord(null); return; }
    setRecordsError('');
    try {
      const result = await lookupInstitutionalRecord({ institutionId, accountType: kind, identifier });
      if (result.found && result.record) {
        setMatchingRecord(result.record as (typeof officialRecords)[number]);
        setNotice('An existing official record was retrieved. Review it below; do not create a duplicate.');
      } else {
        setMatchingRecord(null);
        setNotice('No official record matches this identifier. You can add it with pending verification.');
      }
    } catch (cause) { setRecordsError(cause instanceof Error ? cause.message : 'Identifier lookup could not be completed.'); }
  };
  const generateTutorIdentifier = async () => {
    clear(); setBusy(true);
    try { const result = await allocateTutorId({ institutionId, prefix: tutorPrefix }); setIdentifierValue(result.identifier); setNotice(`Generated ${result.identifier}. Review it, then save the tutor record. The sequence is allocated and will not be reused.`); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Tutor ID could not be generated.'); }
    finally { setBusy(false); }
  };
  const onFile = async (file?: File) => {
    if (!file) return;
    clear(); setBusy(true); setFileName(file.name);
    try { setRows(await parseInstitutionRegister(file, kind)); setNotice('Review the parsed rows below. No official records change until you confirm the import.'); }
    catch (cause) { setRows([]); setError(cause instanceof Error ? cause.message : 'The file could not be read.'); }
    finally { setBusy(false); }
  };
  const submitImport = async () => {
    setBusy(true); clear();
    try {
      const allBatchIds = new Set(batchIds); let newCount = 0; let changedCount = 0; let conflictCount = 0;
      for (let offset = 0; offset < rows.length; offset += 500) {
        const result = await importInstitutionRecords({ records: rows.slice(offset, offset + 500), importName: fileName, institutionId, clientImportId, chunkIndex: Math.floor(offset / 500) });
        if (result?.batchId) allBatchIds.add(result.batchId);
        newCount += result?.new ?? 0; changedCount += result?.changed ?? 0; conflictCount += result?.conflicts ?? 0;
      }
      setBatchIds([...allBatchIds]); setNotice(`Import staged in ${Math.ceil(rows.length / 500)} recoverable chunk(s): ${newCount} new, ${changedCount} changed and ${conflictCount} conflicts. Review all chunks before applying updates.`);
      setRows([]); setClientImportId(crypto.randomUUID()); notify('Institution register staged for review.');
    } catch (cause) { try { setBatchIds(await getPendingInstitutionImportBatches(institutionId)); } catch { /* Keep the original staging error visible; pending batches can be reloaded on the next visit. */ } setError(cause instanceof Error ? cause.message : 'Import could not be submitted. Any completed chunks remain available for review.'); }
    finally { setBusy(false); }
  };
  const addRecord = async (event: FormEvent) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form as HTMLFormElement);
    clear(); setBusy(true);
    try {
      if (matchingRecord) throw new Error('A record already exists for this identifier. Review or edit the matching record instead.');
      await createInstitutionalRecord({ institutionId, accountType: kind, fullName: data.get('fullName'), identifier: identifierValue || data.get('identifier'), programme: data.get('programme'), academicLevel: data.get('academicLevel'), yearOfStudy: data.get('yearOfStudy'), subjects: data.get('subjects') });
      setNotice('Record added with pending verification status. Confirm the matching official source before issuing account setup.');
      (form as HTMLFormElement).reset(); setIdentifierValue(''); setMatchingRecord(null); notify('Official institutional record added.');
      setOfficialRecords(await getInstitutionRecords(institutionId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The record could not be saved.'); }
    finally { setBusy(false); }
  };
  const issueInvite = async (event: FormEvent) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form as HTMLFormElement);
    clear(); setBusy(true);
    try {
      const result = await createInstitutionalInvitation({ institutionId, accountType: kind, identifier: data.get('identifier'), fullName: data.get('fullName'), programme: data.get('programme'), academicLevel: data.get('academicLevel'), subjects: data.get('subjects') });
      setIssuedLink(result?.invitationUrl ?? ''); setNotice('Invitation created. It is single-use, expiring and tied to this account type, institution and identifier. Share the link through your approved institutional channel.');
      setInvites(await getInstitutionalInvitations(institutionId));
      (form as HTMLFormElement).reset(); setIdentifierValue(''); setMatchingRecord(null); notify('Institution invitation issued.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invitation could not be created.'); }
    finally { setBusy(false); }
  };
  const filteredRows = useMemo(() => rows.filter((row) => `${row.fullName} ${row.identifier} ${row.programme ?? ''} ${row.subjects ?? ''}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const filteredRecords = useMemo(() => officialRecords.filter((row) => (!directoryKind || row.account_type === directoryKind) && `${row.current_data.full_name ?? ''} ${row.identifier} ${row.account_type} ${row.verification_status}`.toLowerCase().includes(query.toLowerCase())), [officialRecords, query, directoryKind]);
  const issueSetup = async (recordId: string) => { clear(); setBusy(true); try { const result = await verifyInstitutionalRecord(recordId); setIssuedLink(result.setupUrl ?? ''); setNotice(result.setupUrl ? 'Record verified and one-time setup link issued. The recipient sets their own permanent password.' : 'Official record corrected and reverified. Existing account role, identifier and academic permissions were not changed.'); setOfficialRecords(await getInstitutionRecords(institutionId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Record verification could not be completed.'); } finally { setBusy(false); } };
  const applyBatch = async () => { if (!batchIds.length) return; clear(); setBusy(true); const appliedIds: string[] = []; let created = 0; let updated = 0; let skipped = 0; try { for (const id of batchIds) { const rowIds = stagedRows.filter((row) => row.batch_id === id && selectedRows.includes(row.id)).map((row) => row.id); const result = await applyInstitutionImport(id, rowIds, institutionId); created += result.applied?.created ?? 0; updated += result.applied?.updated ?? 0; skipped += result.applied?.skipped ?? 0; appliedIds.push(id); } setBatchIds(batchIds.filter((id) => !appliedIds.includes(id))); setNotice(`Import applied: ${created} new records, ${updated} reviewed updates and ${skipped} skipped rows. New or corrected records remain pending verification.`); setOfficialRecords(await getInstitutionRecords(institutionId)); notify('Reviewed institutional register changes applied.'); } catch (cause) { setBatchIds(batchIds.filter((id) => !appliedIds.includes(id))); setError(cause instanceof Error ? cause.message : 'Import changes could not be applied. Successfully completed chunks were retained; retry the remaining review chunks.'); } finally { setBusy(false); } };
  const saveRecord = async (event: FormEvent) => { event.preventDefault(); if (!editingRecord) return; const data = new FormData(event.currentTarget as HTMLFormElement); setBusy(true); clear(); try { const result = await updateInstitutionalRecord(editingRecord.id, { full_name: data.get('editName'), programme: data.get('editProgramme'), academic_level: data.get('editLevel'), year_of_study: data.get('editYear'), subjects: data.get('editSubjects') }); setNotice(result.linkedAccountAccessChanged === false ? 'Correction saved for verification. Linked account access and permissions remain unchanged.' : 'Correction saved and marked for verification.'); setEditingRecord(null); setOfficialRecords(await getInstitutionRecords(institutionId)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Record correction could not be saved.'); } finally { setBusy(false); } };
  const syncSubjects = async (recordId: string) => { if (!window.confirm('Apply the verified subject list to this tutor’s active authorizations? This changes which subjects the tutor may access and is recorded in the audit log.')) return; setBusy(true); clear(); try { const result = await syncTutorAuthorizations(recordId); setNotice(`${result.updatedSubjects} verified tutor subject authorizations are now active.`); notify('Tutor subject permissions updated and audited.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tutor subject permissions could not be updated.'); } finally { setBusy(false); } };

  const institutionPicker = <label className="field-label institution-picker">Institution<select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required><option value="">Choose institution scope</option>{adminInstitutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>;

  if (mode === 'invitations') return <><Eyebrow>INSTITUTION ACCESS</Eyebrow><h1>Invite a student or tutor</h1><p className="muted">Each invitation is restricted to your institution, account type and intended identifier.</p><Card>{institutionPicker}<label className="field-label">Account type<select value={kind} onChange={(e) => setKind(e.target.value as 'student' | 'tutor')}><option value="student">Student · Admission Number</option><option value="tutor">Lecturer or tutor · Tutor ID</option></select></label><form onSubmit={issueInvite}><label className="field-label">{kind === 'student' ? 'Admission Number' : 'Tutor ID'}<input name="identifier" value={identifierValue} onChange={(e) => { setIdentifierValue(e.target.value); setMatchingRecord(null); }} onBlur={() => void lookupIdentifier()} required/></label><Feedback error={error} notice={notice}/><Button variant="primary" type="submit" disabled={busy || !institutionId || Boolean(matchingRecord && (matchingRecord.account_user_id || matchingRecord.verification_status !== 'verified'))}>{busy ? 'Creating secure invitation…' : 'Generate invitation'}</Button></form>{matchingRecord && <div className="callout"><b>Matching official record</b><p>{String(matchingRecord.current_data.full_name ?? 'Name unavailable')} · {matchingRecord.account_type} · {matchingRecord.verification_status}{matchingRecord.account_user_id ? ' · already linked' : ''}</p></div>}{issuedLink && <div className="secure-link"><b>One-time invitation link</b><p>Copy and deliver using your approved institutional channel. The token is not shown again.</p><input readOnly value={issuedLink} onFocus={(e) => e.currentTarget.select()}/><Button onClick={() => void navigator.clipboard.writeText(issuedLink)}>Copy link</Button><Button onClick={() => setIssuedLink('')}>Hide link</Button></div>}</Card><Card><h2>Active and recent links</h2><Feedback error={recordsError} notice=""/><div className="table-wrap"><table><thead><tr><th>Purpose</th><th>Created</th><th>Expires</th><th>Status</th><th>Action</th></tr></thead><tbody>{invites.map((item) => { const status = item.consumed_at ? 'Used' : item.revoked_at ? 'Revoked' : new Date(item.expires_at) <= new Date() ? 'Expired' : 'Active'; return <tr key={`${item.kind}-${item.id}`}><td>{item.label}</td><td>{new Date(item.created_at).toLocaleString()}</td><td>{new Date(item.expires_at).toLocaleString()}</td><td>{status}</td><td>{(status === 'Active' || status === 'Expired') && <Button disabled={busy} onClick={async () => { setBusy(true); try { await revokeInstitutionalInvitation(item.id, item.kind); setInvites(await getInstitutionalInvitations(institutionId)); notify('Invitation revoked.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Invitation could not be revoked.'); } finally { setBusy(false); } }}>Revoke</Button>}</td></tr>; })}</tbody></table></div></Card><InstitutionalRecovery/><Card><h2>Invitation safeguards</h2><p>Single-use, expiring, revocable, identifier-bound and institution-scoped. Revoke or reissue a link if it is sent to the wrong recipient or may have been exposed.</p><div className="callout">Do not send invitation links through public channels. Anyone holding a valid link must still supply the intended identifier before they can set a password.</div></Card></>;

  return <><Eyebrow>INSTITUTION OFFICIAL RECORDS</Eyebrow><h1>{directoryKind === 'student' ? 'Student directory' : directoryKind === 'tutor' ? 'Tutor directory' : 'Student and tutor records'}</h1><p className="muted">{directoryKind ? 'Official institution-scoped records and account status.' : 'Upload a register once, review it, then reuse verified records for later account setup.'}</p><Card>{institutionPicker}</Card>{!directoryKind && <div className="grid two"><Card><h2>Import a register</h2><label className="field-label">Record type<select value={kind} onChange={(e) => { setKind(e.target.value as 'student' | 'tutor'); setRows([]); }}><option value="student">Student register</option><option value="tutor">Tutor/staff register</option></select></label><label className="field-label" htmlFor="institution-register">Excel or CSV file</label><input id="institution-register" type="file" accept=".xlsx,.csv" onChange={(e) => void onFile(e.target.files?.[0])}/><small className="muted">PDF and scanned-register extraction is not enabled yet. No unsupported file is treated as imported.</small>{fileName && <p className="identity-small">Selected: {fileName}</p>}</Card><Card><h2>Add one official record</h2><form onSubmit={(e) => void addRecord(e)}><label className="field-label">Record type<select value={kind} onChange={(e) => setKind(e.target.value as 'student' | 'tutor')}><option value="student">Student</option><option value="tutor">Tutor</option></select></label><Field name="fullName" label="Full name" required/><label className="field-label">{kind === 'student' ? 'Admission Number' : 'Tutor ID'}<input name="identifier" value={identifierValue} onChange={(e) => { setIdentifierValue(e.target.value); setMatchingRecord(null); }} onBlur={() => void lookupIdentifier()} required/></label>{kind === 'tutor' && <><label className="field-label">Institution Tutor ID prefix<input value={tutorPrefix} maxLength={12} onChange={(e) => setTutorPrefix(e.target.value.toUpperCase())} placeholder="For example, NTH"/></label><Button type="button" disabled={busy || !institutionId || !tutorPrefix.trim()} onClick={() => void generateTutorIdentifier()}>Generate next Tutor ID</Button><small className="muted">IDs use your institution prefix and a permanent sequence. Manually assigned Tutor IDs remain supported.</small></>}<AcademicFields kind={kind}/>{matchingRecord && <div className="callout"><b>Matching official record found</b><p>{String(matchingRecord.current_data.full_name ?? 'Name unavailable')} · {matchingRecord.verification_status}{matchingRecord.account_user_id ? ' · linked account' : ''}</p><p>Imported source data is retained and corrections are recorded.</p><Button type="button" onClick={() => setEditingRecord(matchingRecord)}>Review and correct existing record</Button></div>}<Feedback error={error} notice={notice}/><Button variant="primary" type="submit" disabled={busy || !institutionId || Boolean(matchingRecord)}>{busy ? 'Saving…' : 'Add official record'}</Button></form></Card></div>}
    {rows.length > 0 && <Card><div className="section-heading"><div><h2>Review import · {rows.length} rows</h2><p className="muted">Local preview before server-side identifier and academic validation.</p></div><Button variant="primary" disabled={busy} onClick={() => void submitImport()}>{busy ? 'Submitting…' : 'Stage for review'}</Button></div><label className="field-label">Filter preview<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, identifier or subject"/></label><div className="table-wrap"><table><thead><tr><th>Name</th><th>Identifier</th><th>Programme</th><th>Level</th><th>Year</th><th>Subjects</th></tr></thead><tbody>{filteredRows.map((row, i) => <tr key={`${row.identifier}-${i}`}><td>{row.fullName}</td><td>{row.identifier}</td><td>{row.programme || 'Not supplied'}</td><td>{row.academicLevel || 'Not supplied'}</td><td>{row.yearOfStudy || 'Not supplied'}</td><td>{row.subjects || 'Not supplied'}</td></tr>)}</tbody></table></div><Feedback error={error} notice={notice}/></Card>}
    {stagedRows.length > 0 && <Card><div className="section-heading"><div><h2>Server import review · {stagedRows.length} rows</h2><p className="muted">Conflicts are not selectable. Existing account records cannot be bulk edited.</p></div><Button variant="primary" disabled={busy} onClick={() => void applyBatch()}>{busy ? 'Applying…' : 'Apply selected rows'}</Button></div><div className="table-wrap"><table><thead><tr><th>Apply</th><th>Row</th><th>Name</th><th>Identifier</th><th>Status</th><th>Review detail</th></tr></thead><tbody>{stagedRows.map((row) => <tr key={row.id}><td><input aria-label={`Apply row ${row.row_number}`} type="checkbox" disabled={row.review_status === 'conflict'} checked={selectedRows.includes(row.id)} onChange={(e) => setSelectedRows((items) => e.target.checked ? [...items, row.id] : items.filter((id) => id !== row.id))}/></td><td>{row.row_number}</td><td>{String(row.proposed_data.full_name ?? '')}</td><td>{String(row.proposed_data.identifier ?? '')}</td><td>{row.review_status}</td><td>{row.conflict_reason ?? 'Ready for review'}</td></tr>)}</tbody></table></div><Feedback error={error} notice={notice}/></Card>}
    {editingRecord && <Card><div className="section-heading"><div><h2>Correct official record</h2><p className="muted">Identifier {editingRecord.identifier} remains fixed. Changes are audited and require revalidation.</p></div><Button onClick={() => setEditingRecord(null)}>Cancel</Button></div><form onSubmit={(e) => void saveRecord(e)}><Field name="editName" label="Official full name" defaultValue={String(editingRecord.current_data.full_name ?? '')} required/><Field name="editProgramme" label={editingRecord.account_type === 'student' ? 'Programme' : 'Programme responsibility'} defaultValue={String(editingRecord.current_data.programme ?? editingRecord.current_data.programme_responsibility ?? '')}/>{editingRecord.account_type === 'student' && <Field name="editLevel" label="Academic level" defaultValue={String(editingRecord.current_data.academic_level ?? '')} required/>}<Field name="editYear" label="Year of study" defaultValue={String(editingRecord.current_data.year_of_study ?? '')}/><Field name="editSubjects" label="Authorised subjects (tutors)" defaultValue={String(editingRecord.current_data.subjects ?? '')}/><Feedback error={error} notice=""/><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving correction…' : 'Save audited correction'}</Button></form>{editingRecord.account_user_id && <div className="callout">This account is already linked. Correcting its record does not update the learner’s enrollment or tutor permissions; use a separately verified administrative change for access updates.</div>}</Card>}
    <Card><div className="section-heading"><div><h2>Reusable official records · {officialRecords.length}</h2><p className="muted">Search the institution register and verify records before onboarding.</p></div><label className="record-search">Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, ADM, Tutor ID"/></label></div><Feedback error={recordsError} notice=""/><div className="table-wrap"><table><thead><tr><th>Name</th><th>Type</th><th>Identifier</th><th>Verification</th><th>Account</th><th>Actions</th></tr></thead><tbody>{filteredRecords.map((row) => <tr key={row.id}><td>{String(row.current_data.full_name ?? 'Name not recorded')}</td><td>{row.account_type}</td><td>{row.identifier}</td><td>{row.verification_status}</td><td>{row.account_user_id ? 'Linked' : 'Not activated'}</td><td><Button disabled={busy} onClick={() => setEditingRecord(row)}>Edit</Button>{row.verification_status !== 'verified' || !row.account_user_id ? <Button disabled={busy} onClick={() => void issueSetup(row.id)}>{row.account_user_id ? 'Verify correction' : row.verification_status === 'verified' ? 'Issue setup link' : 'Verify and issue setup link'}</Button> : null}{row.account_type === 'tutor' && row.account_user_id && row.verification_status === 'verified' && <Button disabled={busy} onClick={() => void syncSubjects(row.id)}>Apply verified subjects</Button>}</td></tr>)}</tbody></table></div></Card>
    <Card><h2>Verified register storage</h2><p>Institution records are retained for future validation and registration. Imported source values, administrator corrections and verified account details are tracked separately. Corrections that change identity or access require additional verification.</p><div className="callout">Register entries do not by themselves create an account or grant access. Existing ADM numbers and Tutor IDs cannot be reassigned through an import.</div></Card></>;
}

function Field(p: { name: string; label: string; required?: boolean; defaultValue?: string }) { return <label className="field-label">{p.label}<input name={p.name} required={p.required} defaultValue={p.defaultValue}/></label>; }
function AcademicFields({ kind }: { kind: 'student' | 'tutor' }) { return kind === 'student' ? <><Field name="programme" label="Programme" required/><Field name="academicLevel" label="Academic level" required/><Field name="yearOfStudy" label="Year of study"/></> : <><Field name="programme" label="Programme responsibility"/><Field name="subjects" label="Authorised subjects" required/></>; }
function Feedback(p: { error: string; notice: string }) { return <>{p.error && <div className="identity-error" role="alert">{p.error}</div>}{p.notice && <div className="identity-success" role="status">{p.notice}</div>}</>; }

function InstitutionalRecovery() {
  const [institutions, setInstitutions] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [link, setLink] = useState('');
  useEffect(() => { void getInstitutionAdminInstitutions().then(setInstitutions).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Institution scope unavailable.')); }, []);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget as HTMLFormElement);
    try {
      const result = await issueInstitutionalRecoveryLink({ institutionId: String(form.get('institutionId')), accountType: String(form.get('accountType')) as 'student' | 'tutor', identifier: String(form.get('identifier')), identityVerified: form.get('identityVerified') === 'on', verificationMethod: String(form.get('verificationMethod')), caseReference: String(form.get('caseReference')) });
      setLink(result.recoveryUrl); setNotice(`Recovery request ${result.requestId} was audited and a one-time link was created. Deliver it securely to the verified account holder.`);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Recovery link could not be issued.'); }
    finally { setBusy(false); }
  };
  return <Card><h2>Institutional account recovery</h2><p>Verify the account holder against official institutional records. Institution administrators may issue a recovery link immediately; global review is reserved for exceptional, disputed or suspicious cases. Administrators cannot see or set the permanent password.</p><form onSubmit={(e) => void submit(e)}><label className="field-label">Institution<select name="institutionId" required><option value="">Choose institution</option>{institutions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label className="field-label">Account type<select name="accountType"><option value="student">Student</option><option value="tutor">Tutor</option></select></label><Field name="identifier" label="ADM number or Tutor ID" required/><Field name="verificationMethod" label="Official identity-verification method" required/><Field name="caseReference" label="Minimal case reference (no document contents)" required/><label className="field-label identity-check"><input type="checkbox" name="identityVerified" required/> I confirm I matched the account holder to official institutional records.</label><Feedback error={error} notice={notice}/><Button variant="primary" type="submit" disabled={busy || !institutions.length}>{busy ? 'Creating recovery link…' : 'Issue one-time recovery link'}</Button></form>{link && <div className="secure-link"><b>Private recovery link</b><p>Deliver securely to the verified account holder. Do not include this link in public or shared records. The link is single-use and expires according to the configured Supabase Auth email OTP lifetime.</p><input readOnly value={link} onFocus={(e) => e.currentTarget.select()}/><Button onClick={() => void navigator.clipboard.writeText(link)}>Copy link</Button><Button onClick={() => setLink('')}>Hide link</Button></div>}</Card>;
}
