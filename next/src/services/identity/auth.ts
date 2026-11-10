import type { Session, User } from '@supabase/supabase-js';
import { requireSupabase } from '../supabase/client';

export type AccountRole = 'independent_student' | 'institutional_student' | 'tutor' | 'institution_admin';
export type AcademicChoice = { programmeId: string; learningLevelId: string };

export async function registerIndependentStudent(input: { name: string; email: string; password: string } & AcademicChoice) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({
    email: input.email.trim(), password: input.password,
    options: { data: { display_name: input.name.trim(), registration_path: 'independent_student', programme_id: input.programmeId, learning_level_id: input.learningLevelId } },
  });
  if (error) throw error;
  if (data.user && data.session) {
    const { error: profileError } = await client.functions.invoke('complete-independent-registration', {
      body: { programmeId: input.programmeId, learningLevelId: input.learningLevelId },
    });
    if (profileError) throw profileError;
  }
  return data;
}

export async function registerInstitutionApplicant(input: { institutionName: string; institutionType: string; location: string; officialContact: string; applicantName: string; email: string; password: string }) {
  const client = requireSupabase();
  const { data, error } = await client.auth.signUp({ email: input.email.trim(), password: input.password, options: { data: {
    display_name: input.applicantName.trim(), registration_path: 'institution_applicant',
    institution_application: { institution_name: input.institutionName.trim(), institution_type: input.institutionType.trim(), location: input.location.trim(), official_contact: input.officialContact.trim() },
  } } });
  if (error) throw error;
  if (data.session) {
    const { error: submitError } = await client.functions.invoke('submit-institution-registration', { body: {} });
    if (submitError) throw submitError;
  }
  return data;
}

export async function loginIndependent(email: string, password: string) {
  const { data, error } = await requireSupabase().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  return data;
}

export async function loginInstitutional(input: { institutionId: string; identifier: string; accountType: 'student' | 'tutor'; password: string }) {
  const { data, error } = await requireSupabase().functions.invoke('institutional-login', { body: input });
  if (error) throw error;
  if (!data?.access_token || !data?.refresh_token) throw new Error('Unable to sign in with those details.');
  const { data: sessionData, error: sessionError } = await requireSupabase().auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
  if (sessionError) throw sessionError;
  return sessionData;
}

export async function redeemInstitutionalInvitation(input: { token: string; identifier: string; password: string }) {
  const { data, error } = await requireSupabase().functions.invoke('redeem-institutional-invitation', { body: input });
  if (error) throw error;
  if (data?.access_token && data?.refresh_token) {
    const { data: sessionData, error: sessionError } = await requireSupabase().auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
    if (sessionError) throw sessionError;
    return sessionData;
  }
  return data;
}

export async function linkIndependentAccount(input: { token: string; identifier: string }) {
  const { data, error } = await requireSupabase().functions.invoke('link-existing-institutional-account', { body: input });
  if (error) throw error;
  return data;
}

export async function createInstitutionalRecord(input: Record<string, unknown>) {
  const { data, error } = await requireSupabase().functions.invoke('create-institutional-record', { body: input });
  if (error) throw error;
  return data;
}

export async function lookupInstitutionalRecord(input: { institutionId: string; accountType: 'student' | 'tutor'; identifier: string }) {
  const { data, error } = await requireSupabase().functions.invoke('lookup-institutional-record', { body: input });
  if (error) throw error;
  return data as { found: boolean; record?: { id: string; account_type: string; identifier: string; original_data: Record<string, unknown>; current_data: Record<string, unknown>; verified_data: Record<string, unknown> | null; verification_status: string; account_user_id: string | null; updated_at: string } };
}

export async function getTutorIdSettings(institutionId: string) {
  const { data, error } = await requireSupabase().functions.invoke('manage-tutor-id', { body: { action: 'get-settings', institutionId } });
  if (error) throw error;
  return data as { prefix: string; sequenceWidth: number };
}

export async function allocateTutorId(input: { institutionId: string; prefix: string }) {
  const { data, error } = await requireSupabase().functions.invoke('manage-tutor-id', { body: { ...input, action: 'allocate' } });
  if (error) throw error;
  return data as { identifier: string };
}

export async function verifyInstitutionalRecord(recordId: string) {
  const { data, error } = await requireSupabase().functions.invoke('verify-institutional-record', { body: { recordId } });
  if (error) throw error;
  return data;
}

export async function updateInstitutionalRecord(recordId: string, changes: Record<string, unknown>) {
  const { data, error } = await requireSupabase().functions.invoke('update-institutional-record', { body: { recordId, changes } });
  if (error) throw error;
  return data;
}

export async function syncTutorAuthorizations(recordId: string) {
  const { data, error } = await requireSupabase().functions.invoke('sync-tutor-authorizations', { body: { recordId } });
  if (error) throw error;
  return data;
}

export async function createInstitutionalInvitation(input: Record<string, unknown>) {
  const { data, error } = await requireSupabase().functions.invoke('create-institutional-invitation', { body: input });
  if (error) throw error;
  return data;
}

export async function importInstitutionRecords(input: { records: Record<string, unknown>[]; importName: string; institutionId: string; clientImportId: string; chunkIndex: number }) {
  const { data, error } = await requireSupabase().functions.invoke('import-institution-records', { body: input });
  if (error) throw error;
  return data;
}

export async function applyInstitutionImport(batchId: string, acceptedRowIds: string[], institutionId: string) {
  const { data, error } = await requireSupabase().functions.invoke('apply-institutional-import', { body: { batchId, acceptedRowIds, institutionId } });
  if (error) throw error;
  return data;
}

export async function getInstitutionImportRows(batchId: string) {
  const { data, error } = await requireSupabase().from('institutional_import_rows').select('id,batch_id,row_number,proposed_data,review_status,conflict_reason').eq('batch_id', batchId).order('row_number');
  if (error) throw error;
  return data ?? [];
}

export async function getPendingInstitutionImportBatches(institutionId: string) {
  const { data, error } = await requireSupabase().from('institutional_import_batches').select('id').eq('institution_id', institutionId).eq('status', 'review').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string);
}

export async function getInstitutionRecords(institutionId: string) {
  const { data, error } = await requireSupabase().from('institutional_records').select('id,institution_id,account_type,identifier,current_data,verification_status,account_user_id,updated_at').eq('institution_id', institutionId).order('updated_at', { ascending: false }).limit(500);
  if (error) throw error;
  return data ?? [];
}

export async function getInstitutionalInvitations(institutionId: string) {
  const client = requireSupabase();
  const [invites, setups] = await Promise.all([
    client.from('institutional_invitations').select('id,institution_id,record_id,account_type,intended_identifier,expires_at,consumed_at,revoked_at,created_at').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(200),
    client.from('institutional_account_tokens').select('id,institution_id,record_id,expires_at,consumed_at,revoked_at,created_at').eq('institution_id', institutionId).order('created_at', { ascending: false }).limit(200),
  ]);
  if (invites.error) throw invites.error;
  if (setups.error) throw setups.error;
  return [
    ...(invites.data ?? []).map((item) => ({ ...item, kind: 'invitation' as const, label: `${item.account_type} · ${item.intended_identifier}` })),
    ...(setups.data ?? []).map((item) => ({ ...item, kind: 'setup' as const, label: 'Administrator-created setup link' })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function revokeInstitutionalInvitation(id: string, kind: 'invitation' | 'setup') {
  const { data, error } = await requireSupabase().functions.invoke('revoke-institutional-invitation', { body: { id, kind } });
  if (error) throw error;
  return data;
}

export async function issueInstitutionalRecoveryLink(input: { institutionId: string; accountType: 'student' | 'tutor'; identifier: string; identityVerified: boolean; verificationMethod: string; caseReference: string }) {
  const { data, error } = await requireSupabase().functions.invoke('institutional-recovery-link', { body: input });
  if (error) throw error;
  return data;
}

export async function reviewInstitutionalRecovery(requestId: string, action: 'escalate' | 'close', evidenceMethod: string, evidenceReference: string) {
  const { data, error } = await requireSupabase().functions.invoke('review-institutional-recovery', { body: { requestId, action, evidenceMethod, evidenceReference } });
  if (error) throw error;
  return data;
}

export async function getInstitutionAdminInstitutions() {
  const client = requireSupabase();
  const roles = await client.from('role_assignments').select('institution_id').eq('role', 'institution_admin').eq('status', 'active');
  if (roles.error) throw roles.error;
  const ids = [...new Set((roles.data ?? []).map((row) => row.institution_id).filter((id): id is string => Boolean(id)))];
  if (!ids.length) return [];
  const { data, error } = await client.from('institutions').select('id,name').in('id', ids);
  if (error) throw error;
  return data ?? [];
}

export async function getInstitutionProfile(institutionId: string) {
  const { data, error } = await requireSupabase().from('institutions').select('id,name,institution_type,location,official_contact,status').eq('id', institutionId).single();
  if (error) throw error;
  return data;
}

export async function saveInstitutionProfile(input: { institutionId: string; location: string; officialContact: string }) {
  const { data, error } = await requireSupabase().functions.invoke('update-institution-profile', { body: input });
  if (error) throw error;
  return data;
}

export async function getInstitutionProgrammeData(institutionId: string) {
  const client = requireSupabase();
  const [catalogue, offerings] = await Promise.all([
    client.from('programmes').select('id,name').eq('active', true).order('name'),
    client.from('institution_programme_offerings').select('id,programme_id,status,programmes(name)').eq('institution_id', institutionId).order('programme_id'),
  ]);
  if (catalogue.error) throw catalogue.error;
  if (offerings.error) throw offerings.error;
  return { catalogue: catalogue.data ?? [], offerings: offerings.data ?? [] };
}

export async function manageInstitutionProgramme(input: { institutionId: string; action: 'add' | 'activate' | 'deactivate'; programmeId?: string; offeringId?: string }) {
  const { data, error } = await requireSupabase().functions.invoke('manage-institution-programme', { body: input });
  if (error) throw error;
  return data;
}

export async function manageAcademicCatalogue(input: { kind: 'programme' | 'level'; action: 'add' | 'activate' | 'deactivate'; name?: string; id?: string; sortOrder?: number }) {
  const { data, error } = await requireSupabase().functions.invoke('manage-academic-catalogue', { body: input });
  if (error) throw error;
  return data;
}

export async function listLearningLevels() {
  const { data, error } = await requireSupabase().from('learning_levels').select('id,name,sort_order,active').order('sort_order');
  if (error) throw error;
  return data ?? [];
}

export async function requestPasswordRecovery(email: string) {
  const { error } = await requireSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${location.origin}/reset-password` });
  if (error) throw error;
}

export async function updateRecoveredPassword(password: string) {
  const { error } = await requireSupabase().auth.updateUser({ password });
  if (error) throw error;
}

export async function signOut() {
  const { error } = await requireSupabase().auth.signOut();
  if (error) throw error;
}

export type AuthSnapshot = { user: User | null; session: Session | null };
