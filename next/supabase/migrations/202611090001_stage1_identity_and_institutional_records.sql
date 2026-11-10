-- Stage 1 identity, institution-scoped accounts, invitations and reusable official records.
-- Apply only to a dedicated development/staging project after review; this file is not executed by the app.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.institutions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  institution_type text not null default '',
  location text not null default '',
  official_contact text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','published','suspended','rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists institutions_unique_name on public.institutions(lower(name));

create table if not exists public.institution_registrations (
  id uuid primary key default gen_random_uuid(),
  applicant_id uuid not null references auth.users(id) on delete cascade,
  institution_name text not null,
  institution_type text not null,
  location text not null,
  official_contact text not null,
  status text not null default 'submitted' check (status in ('submitted','under_review','approved','rejected')),
  institution_id uuid references public.institutions(id),
  reviewer_id uuid references auth.users(id),
  decision_reason text,
  submitted_at timestamptz not null default now(),
  decided_at timestamptz
);

create table if not exists public.institution_verification_records (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null references public.institution_registrations(id),
  reviewer_id uuid not null references auth.users(id),
  evidence_method text not null,
  evidence_reference text not null,
  result text not null check (result in ('verified','rejected')),
  verified_at timestamptz not null default now()
);

create table if not exists public.institution_memberships (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('pending','active','suspended','ended')),
  created_at timestamptz not null default now(),
  unique (institution_id, user_id)
);

create table if not exists public.role_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('independent_student','institutional_student','tutor','lecturer','institution_admin','global_admin')),
  institution_id uuid references public.institutions(id),
  status text not null default 'active' check (status in ('pending','active','suspended','revoked')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check ((role in ('independent_student','global_admin') and institution_id is null) or (role not in ('independent_student','global_admin') and institution_id is not null))
);
create index if not exists role_assignments_user_active on public.role_assignments(user_id, status);
create index if not exists role_assignments_institution_active on public.role_assignments(institution_id, role, status);
create unique index if not exists role_assignments_unique_scope on public.role_assignments(user_id, role, coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.programmes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);
create table if not exists public.learning_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  active boolean not null default true
);
create unique index if not exists programmes_unique_casefold on public.programmes(lower(name));
create unique index if not exists learning_levels_unique_casefold on public.learning_levels(lower(name));
create table if not exists public.institution_programme_offerings (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  programme_id uuid not null references public.programmes(id),
  status text not null default 'active' check (status in ('active','inactive')),
  unique (institution_id, programme_id)
);

create table if not exists public.student_enrolments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution_id uuid references public.institutions(id),
  programme_id uuid not null references public.programmes(id),
  learning_level_id uuid not null references public.learning_levels(id),
  year_of_study text,
  status text not null default 'active' check (status in ('pending','active','ended')),
  created_at timestamptz not null default now()
);

create table if not exists public.study_workspace_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (length(trim(title)) between 1 and 160),
  content text not null default '' check (length(content) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists study_workspace_notes_owner_updated on public.study_workspace_notes(owner_id,updated_at desc);
create index if not exists student_enrolments_user on public.student_enrolments(user_id);
create index if not exists student_enrolments_institution on public.student_enrolments(institution_id, status);
create unique index if not exists student_enrolments_unique_path on public.student_enrolments(user_id, coalesce(institution_id, '00000000-0000-0000-0000-000000000000'::uuid), programme_id, learning_level_id);

create table if not exists public.institutional_records (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  account_type text not null check (account_type in ('student','tutor')),
  identifier text not null,
  normalized_identifier text generated always as (lower(regexp_replace(normalize(trim(identifier), NFKC), '[-[:space:]]+', '', 'g'))) stored,
  original_data jsonb not null default '{}'::jsonb,
  current_data jsonb not null default '{}'::jsonb,
  verified_data jsonb,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','needs_review','rejected')),
  account_user_id uuid references auth.users(id),
  source text not null default 'manual' check (source in ('manual','spreadsheet','pdf','ocr')),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (institution_id, account_type, normalized_identifier),
  unique (account_user_id)
);
create index if not exists institutional_records_lookup on public.institutional_records(institution_id, account_type, normalized_identifier);

create table if not exists public.institutional_record_change_log (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.institutional_records(id),
  actor_id uuid references auth.users(id),
  changed_fields jsonb not null,
  previous_data jsonb not null,
  next_data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.institutional_import_batches (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  import_name text not null,
  account_type text not null check (account_type in ('student','tutor')),
  status text not null default 'review' check (status in ('review','applied','cancelled')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  applied_at timestamptz
);
create table if not exists public.institutional_import_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.institutional_import_batches(id) on delete cascade,
  row_number integer not null,
  proposed_data jsonb not null,
  matched_record_id uuid references public.institutional_records(id),
  review_status text not null default 'pending' check (review_status in ('pending','new','changed','conflict','accepted','skipped')),
  conflict_reason text,
  created_at timestamptz not null default now(),
  unique (batch_id, row_number)
);

create table if not exists public.institutional_account_tokens (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  record_id uuid not null references public.institutional_records(id),
  token_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (consumed_at is null or revoked_at is null)
);
create index if not exists institutional_account_tokens_pending on public.institutional_account_tokens(institution_id, expires_at) where consumed_at is null and revoked_at is null;

create table if not exists public.institutional_invitations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  record_id uuid not null references public.institutional_records(id),
  token_hash text not null unique,
  account_type text not null check (account_type in ('student','tutor')),
  intended_identifier text not null,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  check (consumed_at is null or revoked_at is null)
);
create unique index if not exists institutional_account_tokens_one_active on public.institutional_account_tokens(record_id) where consumed_at is null and revoked_at is null;
create unique index if not exists institutional_invitations_one_active on public.institutional_invitations(record_id) where consumed_at is null and revoked_at is null;
create index if not exists institutional_invitations_pending on public.institutional_invitations(institution_id, expires_at) where consumed_at is null and revoked_at is null;

create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id),
  institution_id uuid references public.institutions(id),
  action text not null,
  target_type text not null,
  target_id text,
  outcome text not null default 'success',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.tutor_authorizations (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  tutor_user_id uuid not null references auth.users(id) on delete cascade,
  programme_id uuid references public.programmes(id),
  subject_name text not null,
  status text not null default 'active' check (status in ('active','revoked')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists audit_events_institution_time on public.audit_events(institution_id, created_at desc);

create or replace function public.is_active_institution_admin(target_institution uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$ select exists (
  select 1 from public.role_assignments r
  join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id and m.status = 'active'
  join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
  where r.user_id = auth.uid() and r.institution_id = target_institution and r.role = 'institution_admin' and r.status = 'active'
) $$;

create or replace function public.is_global_admin()
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$ select exists (select 1 from public.role_assignments r where r.user_id = auth.uid() and r.role = 'global_admin' and r.status = 'active') $$;

create or replace function public.complete_independent_registration(p_user_id uuid,p_programme_id uuid,p_learning_level_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare u record; inserted_role integer;
begin
  if auth.uid() is null or auth.uid() <> p_user_id then raise exception 'forbidden'; end if;
  select id,email_confirmed_at,raw_user_meta_data into u from auth.users where id = p_user_id;
  if not found or u.email_confirmed_at is null then raise exception 'email verification required'; end if;
  if exists(select 1 from public.role_assignments where user_id = p_user_id and status = 'active' and role <> 'independent_student') then raise exception 'account already has another role'; end if;
  if not exists(select 1 from public.programmes where id = p_programme_id and active) or not exists(select 1 from public.learning_levels where id = p_learning_level_id and active) then raise exception 'academic selection unavailable'; end if;
  insert into public.profiles(id,display_name) values (p_user_id,coalesce(u.raw_user_meta_data->>'display_name','')) on conflict (id) do nothing;
  insert into public.role_assignments(user_id,role,institution_id,status) values (p_user_id,'independent_student',null,'active') on conflict do nothing;
  get diagnostics inserted_role = row_count;
  insert into public.student_enrolments(user_id,programme_id,learning_level_id,status) values (p_user_id,p_programme_id,p_learning_level_id,'active') on conflict do nothing;
  if inserted_role > 0 then insert into public.audit_events(actor_id,action,target_type,target_id) values (p_user_id,'independent_account_completed','user',p_user_id::text); end if;
end $$;

create or replace function public.finalize_institutional_provision(
  p_token_hash text, p_user_id uuid, p_display_name text, p_programme_id uuid default null, p_learning_level_id uuid default null,
  p_year_of_study text default null, p_subjects text[] default '{}'
) returns void language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare tok record; rec record; role_name text;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then raise exception 'forbidden'; end if;
  select t.id, t.institution_id, t.record_id into tok from public.institutional_account_tokens t
    where t.token_hash = p_token_hash and t.consumed_at is null and t.revoked_at is null and t.expires_at > now() for update;
  if not found then raise exception 'invalid invitation'; end if;
  select * into rec from public.institutional_records r where r.id = tok.record_id and r.institution_id = tok.institution_id for update;
  if rec.account_user_id is not null or rec.verification_status <> 'verified' then raise exception 'record unavailable'; end if;
  if not exists(select 1 from public.institutions where id = tok.institution_id and status = 'published') then raise exception 'institution unavailable'; end if;
  role_name := case rec.account_type when 'student' then 'institutional_student' else 'tutor' end;
  insert into public.profiles(id, display_name) values (p_user_id, p_display_name) on conflict (id) do update set display_name = excluded.display_name;
  insert into public.institution_memberships(institution_id, user_id, status) values (tok.institution_id, p_user_id, 'active') on conflict (institution_id,user_id) do nothing;
  insert into public.role_assignments(user_id, role, institution_id, status) values (p_user_id, role_name, tok.institution_id, 'active');
  update public.institutional_records set account_user_id = p_user_id, verification_status = 'verified', verified_data = current_data, updated_at = now() where id = rec.id;
  if rec.account_type = 'student' then
    insert into public.student_enrolments(user_id, institution_id, programme_id, learning_level_id, year_of_study, status)
    values (p_user_id, tok.institution_id, coalesce(p_programme_id, (rec.current_data->>'programme_id')::uuid), coalesce(p_learning_level_id, (rec.current_data->>'learning_level_id')::uuid), coalesce(p_year_of_study, rec.current_data->>'year_of_study'), 'active');
  end if;
  if rec.account_type = 'tutor' then
    insert into public.tutor_authorizations(institution_id,tutor_user_id,subject_name,granted_by)
    select tok.institution_id,p_user_id,trim(subject),p_user_id
    from unnest(string_to_array(coalesce(rec.current_data->>'subjects',''), ',')) as subjects(subject) where trim(subject) <> '';
  end if;
  update public.institutional_account_tokens set consumed_at = now() where id = tok.id;
  update public.institutional_invitations set consumed_at = now() where record_id = rec.id and consumed_at is null and revoked_at is null;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values (p_user_id,tok.institution_id,'account_activated','institutional_record',rec.id::text);
end $$;

create or replace function public.finalize_invitation_provision(
  p_token_hash text, p_identifier text, p_account_type text, p_user_id uuid, p_display_name text
) returns void language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare inv record; rec record;
begin
  if current_setting('request.jwt.claim.role', true) <> 'service_role' then raise exception 'forbidden'; end if;
  select i.id, i.institution_id, i.record_id, i.account_type, i.intended_identifier into inv from public.institutional_invitations i
    where i.token_hash = p_token_hash and i.consumed_at is null and i.revoked_at is null and i.expires_at > now() for update;
  if not found or inv.account_type <> p_account_type or lower(regexp_replace(normalize(trim(inv.intended_identifier), NFKC), '[-[:space:]]+', '', 'g')) <> lower(regexp_replace(normalize(trim(p_identifier), NFKC), '[-[:space:]]+', '', 'g')) then raise exception 'invalid invitation'; end if;
  select * into rec from public.institutional_records r where r.id = inv.record_id and r.institution_id = inv.institution_id for update;
  if rec.account_user_id is not null or rec.verification_status <> 'verified' or rec.normalized_identifier <> lower(regexp_replace(normalize(trim(p_identifier), NFKC), '[-[:space:]]+', '', 'g')) then raise exception 'identifier unavailable'; end if;
  if not exists(select 1 from public.institutions where id = inv.institution_id and status = 'published') then raise exception 'institution unavailable'; end if;
  if inv.account_type = 'student' and (rec.current_data->>'programme_id' is null or rec.current_data->>'learning_level_id' is null) then raise exception 'academic assignment missing'; end if;
  insert into public.profiles(id, display_name) values (p_user_id,p_display_name) on conflict (id) do update set display_name = excluded.display_name;
  insert into public.institution_memberships(institution_id,user_id,status) values (inv.institution_id,p_user_id,'active') on conflict (institution_id,user_id) do nothing;
  insert into public.role_assignments(user_id,role,institution_id,status) values (p_user_id,case inv.account_type when 'student' then 'institutional_student' else 'tutor' end,inv.institution_id,'active');
  update public.institutional_records set account_user_id = p_user_id, verification_status = 'verified', verified_data = current_data, updated_at = now() where id = rec.id;
  if inv.account_type = 'student' and rec.current_data ? 'programme_id' and rec.current_data ? 'learning_level_id' then
    insert into public.student_enrolments(user_id,institution_id,programme_id,learning_level_id,year_of_study,status)
    values (p_user_id,inv.institution_id,(rec.current_data->>'programme_id')::uuid,(rec.current_data->>'learning_level_id')::uuid,rec.current_data->>'year_of_study','active');
  end if;
  if inv.account_type = 'tutor' then
    insert into public.tutor_authorizations(institution_id,tutor_user_id,subject_name,granted_by)
    select inv.institution_id,p_user_id,trim(subject),p_user_id
    from unnest(string_to_array(coalesce(rec.current_data->>'subjects',''), ',')) as subjects(subject) where trim(subject) <> '';
  end if;
  update public.institutional_invitations set consumed_at = now() where id = inv.id;
  update public.institutional_account_tokens set revoked_at = now() where record_id = rec.id and consumed_at is null and revoked_at is null;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values (p_user_id,inv.institution_id,'account_activated_from_invitation','institutional_record',rec.id::text);
end $$;

create or replace function public.apply_institutional_import(p_actor_id uuid, p_batch_id uuid, p_accept_row_ids uuid[])
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare b record; r record; existing_record record; created_count integer := 0; updated_count integer := 0; skipped_count integer := 0; accepted boolean;
begin
  select * into b from public.institutional_import_batches where id = p_batch_id for update;
  if not found or b.status <> 'review' then raise exception 'import batch unavailable'; end if;
  if not exists (
    select 1 from public.role_assignments ra join public.institution_memberships im on im.user_id = ra.user_id and im.institution_id = ra.institution_id
    join public.institutions i on i.id = ra.institution_id and i.status in ('approved','published')
    where ra.user_id = p_actor_id and ra.institution_id = b.institution_id and ra.role = 'institution_admin' and ra.status = 'active' and im.status = 'active'
  ) then raise exception 'forbidden'; end if;
  for r in select * from public.institutional_import_rows where batch_id = p_batch_id and review_status in ('new','changed','conflict') order by row_number for update loop
    accepted := r.id = any(coalesce(p_accept_row_ids, '{}'::uuid[]));
    if accepted and r.review_status in ('new','changed') then
      if r.review_status = 'new' then
        insert into public.institutional_records(institution_id, account_type, identifier, original_data, current_data, verification_status, source, created_by, updated_by)
        values (b.institution_id, b.account_type, r.proposed_data->>'identifier', r.proposed_data - 'identifier', r.proposed_data - 'identifier', 'pending', 'spreadsheet', p_actor_id, p_actor_id);
        created_count := created_count + 1;
      else
        select * into existing_record from public.institutional_records where id = r.matched_record_id for update;
        if not found or existing_record.account_user_id is not null then raise exception 'claimed record cannot be bulk changed'; end if;
        update public.institutional_records set current_data = current_data || (r.proposed_data - 'identifier'), verification_status = 'pending', updated_by = p_actor_id, updated_at = now() where id = existing_record.id;
        insert into public.institutional_record_change_log(record_id,actor_id,changed_fields,previous_data,next_data)
        values (existing_record.id,p_actor_id,r.proposed_data - 'identifier',existing_record.current_data,existing_record.current_data || (r.proposed_data - 'identifier'));
        updated_count := updated_count + 1;
      end if;
      update public.institutional_import_rows set review_status = 'accepted' where id = r.id;
    else
      update public.institutional_import_rows set review_status = 'skipped' where id = r.id;
      skipped_count := skipped_count + 1;
    end if;
  end loop;
  update public.institutional_import_batches set status = 'applied', applied_at = now() where id = p_batch_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
  values (p_actor_id,b.institution_id,'official_register_import_applied','institutional_import_batch',b.id::text,jsonb_build_object('created',created_count,'updated',updated_count,'skipped',skipped_count));
  return jsonb_build_object('created',created_count,'updated',updated_count,'skipped',skipped_count);
end $$;

create or replace function public.link_existing_student_account(p_actor_id uuid, p_token_hash text, p_identifier text)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare target_institution uuid; target_record uuid; rec record; inv record; tok record;
begin
  if p_actor_id <> auth.uid() or not exists(select 1 from public.role_assignments where user_id = p_actor_id and role = 'independent_student' and status = 'active') then raise exception 'forbidden'; end if;
  select * into inv from public.institutional_invitations where token_hash = p_token_hash and consumed_at is null and revoked_at is null and expires_at > now() for update;
  if found then
    if inv.account_type <> 'student' or lower(regexp_replace(normalize(trim(inv.intended_identifier), NFKC), '[-[:space:]]+', '', 'g')) <> lower(regexp_replace(normalize(trim(p_identifier), NFKC), '[-[:space:]]+', '', 'g')) then raise exception 'invalid invitation'; end if;
    target_institution := inv.institution_id; target_record := inv.record_id;
  else
    select * into tok from public.institutional_account_tokens where token_hash = p_token_hash and consumed_at is null and revoked_at is null and expires_at > now() for update;
    if not found then raise exception 'invalid invitation'; end if;
    target_institution := tok.institution_id; target_record := tok.record_id;
  end if;
  select * into rec from public.institutional_records where id = target_record and institution_id = target_institution for update;
  if not found or rec.account_type <> 'student' or rec.account_user_id is not null or rec.verification_status <> 'verified' or rec.normalized_identifier <> lower(regexp_replace(normalize(trim(p_identifier), NFKC), '[-[:space:]]+', '', 'g')) then raise exception 'identifier unavailable'; end if;
  if not exists(select 1 from public.institutions where id = target_institution and status = 'published') then raise exception 'institution unavailable'; end if;
  if rec.current_data->>'programme_id' is null or rec.current_data->>'learning_level_id' is null then raise exception 'academic assignment missing'; end if;
  insert into public.institution_memberships(institution_id,user_id,status) values (target_institution,p_actor_id,'active') on conflict (institution_id,user_id) do update set status = 'active';
  insert into public.role_assignments(user_id,role,institution_id,status,granted_by) values (p_actor_id,'institutional_student',target_institution,'active',p_actor_id) on conflict do nothing;
  update public.institutional_records set account_user_id = p_actor_id, updated_at = now() where id = rec.id;
  insert into public.student_enrolments(user_id,institution_id,programme_id,learning_level_id,year_of_study,status)
  values (p_actor_id,target_institution,(rec.current_data->>'programme_id')::uuid,(rec.current_data->>'learning_level_id')::uuid,rec.current_data->>'year_of_study','active')
  on conflict do nothing;
  if inv.id is not null then update public.institutional_invitations set consumed_at = now() where id = inv.id; else update public.institutional_account_tokens set consumed_at = now() where id = tok.id; end if;
  update public.institutional_invitations set consumed_at = now() where record_id = rec.id and consumed_at is null and revoked_at is null;
  update public.institutional_account_tokens set revoked_at = now() where record_id = rec.id and consumed_at is null and revoked_at is null;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values (p_actor_id,target_institution,'independent_account_linked_to_institution','institutional_record',rec.id::text);
end $$;

create or replace function public.review_institution_registration(p_actor_id uuid, p_registration_id uuid, p_action text, p_reason text default null, p_evidence_method text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare app record; institution_key uuid;
begin
  if not exists(select 1 from public.role_assignments where user_id = p_actor_id and role = 'global_admin' and status = 'active') then raise exception 'forbidden'; end if;
  select * into app from public.institution_registrations where id = p_registration_id for update;
  if not found then raise exception 'application not found'; end if;
  if p_action = 'verify' then
    if app.status not in ('submitted','under_review') or app.institution_id is not null or nullif(trim(coalesce(p_reason,'')),'') is null or nullif(trim(coalesce(p_evidence_method,'')),'') is null then raise exception 'verification details required'; end if;
    insert into public.institution_verification_records(registration_id,reviewer_id,evidence_method,evidence_reference,result)
    values (app.id,p_actor_id,left(trim(p_evidence_method),120),left(trim(p_reason),500),'verified');
    update public.institution_registrations set status = 'under_review' where id = app.id and status = 'submitted';
    insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values (p_actor_id,'institution_verification_recorded','institution_registration',app.id::text,jsonb_build_object('evidence_method',left(trim(p_evidence_method),120)));
    return jsonb_build_object('status','under_review','verified',true);
  elsif p_action = 'approve' then
    if app.status not in ('submitted','under_review') or app.institution_id is not null then raise exception 'application unavailable'; end if;
    if not exists(select 1 from public.institution_verification_records v where v.registration_id = app.id and v.result = 'verified') then raise exception 'verification required'; end if;
    if not exists(select 1 from auth.users where id = app.applicant_id and email_confirmed_at is not null) then raise exception 'applicant email is not verified'; end if;
    insert into public.institutions(name,institution_type,location,official_contact,status) values (app.institution_name,app.institution_type,app.location,app.official_contact,'approved') returning id into institution_key;
    insert into public.institution_memberships(institution_id,user_id,status) values (institution_key,app.applicant_id,'active');
    insert into public.role_assignments(user_id,role,institution_id,status,granted_by) values (app.applicant_id,'institution_admin',institution_key,'active',p_actor_id);
    update public.institution_registrations set status = 'approved', institution_id = institution_key, reviewer_id = p_actor_id, decided_at = now(), decision_reason = null where id = app.id;
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values (p_actor_id,institution_key,'institution_registration_approved','institution_registration',app.id::text);
    return jsonb_build_object('institutionId',institution_key,'status','approved');
  elsif p_action = 'reject' then
    if app.status not in ('submitted','under_review') then raise exception 'application unavailable'; end if;
    update public.institution_registrations set status = 'rejected', reviewer_id = p_actor_id, decided_at = now(), decision_reason = left(coalesce(p_reason,''),1000) where id = app.id;
    insert into public.audit_events(actor_id,action,target_type,target_id,metadata) values (p_actor_id,'institution_registration_rejected','institution_registration',app.id::text,jsonb_build_object('reason',left(coalesce(p_reason,''),1000)));
    return jsonb_build_object('status','rejected');
  elsif p_action = 'publish' then
    if app.institution_id is null then raise exception 'institution not approved'; end if;
    update public.institutions set status = 'published', updated_at = now() where id = app.institution_id and status = 'approved';
    if not found then raise exception 'institution is not awaiting publication'; end if;
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values (p_actor_id,app.institution_id,'institution_published','institution',app.institution_id::text);
    return jsonb_build_object('institutionId',app.institution_id,'status','published');
  else raise exception 'invalid action'; end if;
end $$;

create or replace function public.sync_tutor_authorizations(p_actor_id uuid,p_record_id uuid)
returns integer language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare rec record; affected integer; subject_count integer;
begin
  select * into rec from public.institutional_records where id = p_record_id for update;
  if not found or rec.account_type <> 'tutor' or rec.account_user_id is null or rec.verification_status <> 'verified' then raise exception 'verified linked tutor record required'; end if;
  if not exists (
    select 1 from public.role_assignments r join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id
    join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
    where r.user_id = p_actor_id and r.institution_id = rec.institution_id and r.role = 'institution_admin' and r.status = 'active' and m.status = 'active'
  ) then raise exception 'forbidden'; end if;
  if not exists(select 1 from public.role_assignments where user_id = rec.account_user_id and institution_id = rec.institution_id and role in ('tutor','lecturer') and status = 'active') then raise exception 'tutor account is inactive'; end if;
  if nullif(trim(coalesce(rec.current_data->>'subjects','')),'') is null then raise exception 'no verified subjects'; end if;
  update public.tutor_authorizations set status = 'revoked', revoked_at = now() where tutor_user_id = rec.account_user_id and institution_id = rec.institution_id and status = 'active';
  insert into public.tutor_authorizations(institution_id,tutor_user_id,subject_name,granted_by)
  select rec.institution_id,rec.account_user_id,trim(subject),p_actor_id
  from unnest(string_to_array(rec.current_data->>'subjects',',')) as subjects(subject)
  where trim(subject) <> '';
  get diagnostics affected = row_count;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
  values (p_actor_id,rec.institution_id,'tutor_subject_authorizations_updated','institutional_record',rec.id::text,jsonb_build_object('active_subject_count',affected));
  return affected;
end $$;

-- Keep record corrections, change history and audit events in one transaction.
create or replace function public.update_institutional_record(
  p_actor_id uuid, p_record_id uuid, p_next_data jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare rec record; next_status text; fields jsonb;
begin
  select * into rec from public.institutional_records where id = p_record_id for update;
  if not found then raise exception 'record unavailable'; end if;
  if not exists (
    select 1 from public.role_assignments r
    join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id
    join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
    where r.user_id = p_actor_id and r.institution_id = rec.institution_id and r.role = 'institution_admin' and r.status = 'active' and m.status = 'active'
  ) then raise exception 'forbidden'; end if;
  if p_next_data is null or jsonb_typeof(p_next_data) is distinct from 'object' or nullif(trim(p_next_data->>'full_name'),'') is null then raise exception 'invalid record data'; end if;
  if p_next_data ?| array['identifier','institution_id','account_user_id','account_type','verification_status','verified_data'] then raise exception 'protected record field'; end if;
  next_status := case when rec.account_user_id is null then 'pending' else 'needs_review' end;
  select coalesce(jsonb_agg(key order by key),'[]'::jsonb) into fields
    from (select keys.key from jsonb_object_keys(rec.current_data || p_next_data) as keys(key)
          where rec.current_data->keys.key is distinct from p_next_data->keys.key) changed;
  if fields = '[]'::jsonb then return jsonb_build_object('updated',false,'verificationStatus',rec.verification_status,'changedFields',fields); end if;
  update public.institutional_records set current_data = p_next_data, verification_status = next_status, updated_by = p_actor_id, updated_at = now() where id = rec.id;
  insert into public.institutional_record_change_log(record_id,actor_id,changed_fields,previous_data,next_data)
    values (rec.id,p_actor_id,fields,rec.current_data,p_next_data);
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values (p_actor_id,rec.institution_id,'institutional_record_corrected','institutional_record',rec.id::text,jsonb_build_object('fields',fields,'linked_account',rec.account_user_id is not null));
  return jsonb_build_object('updated',true,'verificationStatus',next_status,'changedFields',fields);
end $$;

create or replace function public.create_institutional_invitation(
  p_actor_id uuid, p_institution_id uuid, p_record_id uuid, p_account_type text, p_token_hash text, p_expires_at timestamptz
) returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare rec record; invitation_id uuid;
begin
  if not exists (
    select 1 from public.role_assignments r
    join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id
    join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
    where r.user_id = p_actor_id and r.institution_id = p_institution_id and r.role = 'institution_admin' and r.status = 'active' and m.status = 'active'
  ) then raise exception 'forbidden'; end if;
  select * into rec from public.institutional_records where id = p_record_id and institution_id = p_institution_id for update;
  if not found or rec.account_type <> p_account_type or rec.account_user_id is not null or rec.verification_status <> 'verified' then raise exception 'record unavailable'; end if;
  update public.institutional_invitations set revoked_at = now()
    where record_id = rec.id and consumed_at is null and revoked_at is null and expires_at <= now();
  insert into public.institutional_invitations(institution_id,record_id,account_type,intended_identifier,token_hash,expires_at,created_by)
    values (p_institution_id,rec.id,p_account_type,rec.identifier,p_token_hash,p_expires_at,p_actor_id) returning id into invitation_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values (p_actor_id,p_institution_id,'invitation_created','institutional_invitation',invitation_id::text,jsonb_build_object('account_type',p_account_type,'identifier_suffix',right(rec.identifier,3),'expires_at',p_expires_at));
  return invitation_id;
end $$;

create or replace function public.revoke_institutional_token(p_actor_id uuid, p_token_id uuid, p_kind text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare target_institution uuid; changed_id uuid; target_table text;
begin
  if p_kind = 'invitation' then
    select institution_id into target_institution from public.institutional_invitations where id = p_token_id for update;
  elsif p_kind = 'setup' then
    select institution_id into target_institution from public.institutional_account_tokens where id = p_token_id for update;
  else raise exception 'invalid token type'; end if;
  if target_institution is null then raise exception 'token unavailable'; end if;
  if not exists (
    select 1 from public.role_assignments r
    join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id
    join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
    where r.user_id = p_actor_id and r.institution_id = target_institution and r.role = 'institution_admin' and r.status = 'active' and m.status = 'active'
  ) then raise exception 'forbidden'; end if;
  if p_kind = 'invitation' then
    update public.institutional_invitations set revoked_at = now() where id = p_token_id and consumed_at is null and revoked_at is null returning id into changed_id;
    target_table := 'institutional_invitation';
  else
    update public.institutional_account_tokens set revoked_at = now() where id = p_token_id and consumed_at is null and revoked_at is null returning id into changed_id;
    target_table := 'institutional_account_token';
  end if;
  if changed_id is null then raise exception 'token unavailable'; end if;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id)
    values (p_actor_id,target_institution,case when p_kind = 'invitation' then 'invitation_revoked' else 'setup_link_revoked' end,target_table,p_token_id::text);
  return true;
end $$;

-- Record verification, optional account setup-token issuance and both audit rows are atomic.
create or replace function public.verify_institutional_record_and_issue_setup(
  p_actor_id uuid, p_record_id uuid, p_token_hash text, p_expires_at timestamptz
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare rec record;
begin
  select * into rec from public.institutional_records where id = p_record_id for update;
  if not found then raise exception 'record unavailable'; end if;
  if not exists (
    select 1 from public.role_assignments r
    join public.institution_memberships m on m.user_id = r.user_id and m.institution_id = r.institution_id
    join public.institutions i on i.id = r.institution_id and i.status in ('approved','published')
    where r.user_id = p_actor_id and r.institution_id = rec.institution_id and r.role = 'institution_admin' and r.status = 'active' and m.status = 'active'
  ) then raise exception 'forbidden'; end if;
  if rec.verification_status not in ('pending','needs_review','verified') then raise exception 'record requires review'; end if;
  if rec.verification_status <> 'verified' then
    update public.institutional_records set verification_status = 'verified', verified_data = rec.current_data, updated_by = p_actor_id, updated_at = now() where id = rec.id;
    insert into public.institutional_record_change_log(record_id,actor_id,changed_fields,previous_data,next_data)
      values (rec.id,p_actor_id,'["verification_status","verified_data"]'::jsonb,
        jsonb_build_object('verification_status',rec.verification_status,'verified_data',rec.verified_data),
        jsonb_build_object('verification_status','verified','verified_data',rec.current_data));
  end if;
  if rec.account_user_id is null then
    update public.institutional_account_tokens set revoked_at = now()
      where record_id = rec.id and consumed_at is null and revoked_at is null and expires_at <= now();
    insert into public.institutional_account_tokens(institution_id,record_id,token_hash,expires_at,created_by)
      values (rec.institution_id,rec.id,p_token_hash,p_expires_at,p_actor_id);
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
      values (p_actor_id,rec.institution_id,'official_record_verified_and_setup_link_issued','institutional_record',rec.id::text,jsonb_build_object('expires_at',p_expires_at));
    return jsonb_build_object('verified',true,'setupIssued',true);
  end if;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id)
    values (p_actor_id,rec.institution_id,'linked_official_record_reverified','institutional_record',rec.id::text);
  return jsonb_build_object('verified',true,'setupIssued',false);
end $$;

revoke all on function public.finalize_institutional_provision(text,uuid,text,uuid,uuid,text,text[]) from public, anon, authenticated;
revoke all on function public.finalize_invitation_provision(text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.apply_institutional_import(uuid,uuid,uuid[]) from public, anon, authenticated;
revoke all on function public.link_existing_student_account(uuid,text,text) from public, anon;
grant execute on function public.finalize_institutional_provision(text,uuid,text,uuid,uuid,text,text[]) to service_role;
revoke all on function public.complete_independent_registration(uuid,uuid,uuid) from public, anon;
grant execute on function public.complete_independent_registration(uuid,uuid,uuid) to authenticated;
grant execute on function public.finalize_invitation_provision(text,text,text,uuid,text) to service_role;
grant execute on function public.apply_institutional_import(uuid,uuid,uuid[]) to service_role;
grant execute on function public.link_existing_student_account(uuid,text,text) to authenticated, service_role;
revoke all on function public.review_institution_registration(uuid,uuid,text,text,text) from public, anon, authenticated;
grant execute on function public.review_institution_registration(uuid,uuid,text,text,text) to service_role;
revoke all on function public.sync_tutor_authorizations(uuid,uuid) from public, anon, authenticated;
grant execute on function public.sync_tutor_authorizations(uuid,uuid) to service_role;
revoke all on function public.update_institutional_record(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.update_institutional_record(uuid,uuid,jsonb) to service_role;
revoke all on function public.create_institutional_invitation(uuid,uuid,uuid,text,text,timestamptz) from public, anon, authenticated;
grant execute on function public.create_institutional_invitation(uuid,uuid,uuid,text,text,timestamptz) to service_role;
revoke all on function public.revoke_institutional_token(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.revoke_institutional_token(uuid,uuid,text) to service_role;
revoke all on function public.verify_institutional_record_and_issue_setup(uuid,uuid,text,timestamptz) from public, anon, authenticated;
grant execute on function public.verify_institutional_record_and_issue_setup(uuid,uuid,text,timestamptz) to service_role;
revoke all on function public.is_active_institution_admin(uuid) from public, anon;
grant execute on function public.is_active_institution_admin(uuid) to authenticated, service_role;
revoke all on function public.is_global_admin() from public, anon;
grant execute on function public.is_global_admin() to authenticated, service_role;

alter table public.profiles enable row level security;
alter table public.institutions enable row level security;
alter table public.institution_registrations enable row level security;
alter table public.institution_verification_records enable row level security;
alter table public.institution_memberships enable row level security;
alter table public.role_assignments enable row level security;
alter table public.programmes enable row level security;
alter table public.learning_levels enable row level security;
alter table public.institution_programme_offerings enable row level security;
alter table public.student_enrolments enable row level security;
alter table public.study_workspace_notes enable row level security;
alter table public.institutional_records enable row level security;
alter table public.institutional_record_change_log enable row level security;
alter table public.institutional_import_batches enable row level security;
alter table public.institutional_import_rows enable row level security;
alter table public.institutional_account_tokens enable row level security;
alter table public.institutional_invitations enable row level security;
alter table public.audit_events enable row level security;
alter table public.tutor_authorizations enable row level security;

create policy profiles_read_own on public.profiles for select to authenticated using (id = auth.uid() or public.is_global_admin());
create policy profiles_update_own_display on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy institutions_read_published on public.institutions for select to anon, authenticated using (status = 'published' or public.is_active_institution_admin(id) or public.is_global_admin());
create policy registration_read_own_or_global on public.institution_registrations for select to authenticated using (applicant_id = auth.uid() or public.is_global_admin());
create policy verification_records_global_read on public.institution_verification_records for select to authenticated using (public.is_global_admin());
create policy memberships_read_scoped on public.institution_memberships for select to authenticated using (user_id = auth.uid() or public.is_active_institution_admin(institution_id) or public.is_global_admin());
create policy roles_read_own_or_admin on public.role_assignments for select to authenticated using (user_id = auth.uid() or public.is_global_admin());
create policy programmes_read_active on public.programmes for select to anon, authenticated using (active);
create policy levels_read_active on public.learning_levels for select to anon, authenticated using (active);
create policy offerings_read_published on public.institution_programme_offerings for select to authenticated using (status = 'active' and exists(select 1 from public.institutions i where i.id = institution_id and i.status = 'published') or public.is_active_institution_admin(institution_id) or public.is_global_admin());
create policy enrolments_read_scoped on public.student_enrolments for select to authenticated using (user_id = auth.uid() or (institution_id is not null and public.is_active_institution_admin(institution_id)) or public.is_global_admin());
create policy workspace_notes_owner_all on public.study_workspace_notes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy records_read_scoped on public.institutional_records for select to authenticated using (public.is_active_institution_admin(institution_id) or public.is_global_admin() or account_user_id = auth.uid());
create policy records_insert_admin on public.institutional_records for insert to authenticated with check (public.is_active_institution_admin(institution_id) and created_by = auth.uid() and account_user_id is null);
create policy records_update_admin on public.institutional_records for update to authenticated using (public.is_active_institution_admin(institution_id) and account_user_id is null) with check (public.is_active_institution_admin(institution_id) and account_user_id is null);
create policy record_changes_read_admin on public.institutional_record_change_log for select to authenticated using (exists(select 1 from public.institutional_records r where r.id = record_id and public.is_active_institution_admin(r.institution_id)) or public.is_global_admin());
create policy imports_read_admin on public.institutional_import_batches for select to authenticated using (public.is_active_institution_admin(institution_id) or public.is_global_admin());
create policy import_rows_read_admin on public.institutional_import_rows for select to authenticated using (exists(select 1 from public.institutional_import_batches b where b.id = batch_id and (public.is_active_institution_admin(b.institution_id) or public.is_global_admin())));
create policy tokens_read_admin_status on public.institutional_account_tokens for select to authenticated using (public.is_active_institution_admin(institution_id) or public.is_global_admin());
create policy invitations_read_admin_status on public.institutional_invitations for select to authenticated using (public.is_active_institution_admin(institution_id) or public.is_global_admin());
create policy audit_read_admin on public.audit_events for select to authenticated using (public.is_global_admin() or (institution_id is not null and public.is_active_institution_admin(institution_id)));
create policy tutor_authorizations_read on public.tutor_authorizations for select to authenticated using (tutor_user_id = auth.uid() or public.is_active_institution_admin(institution_id) or public.is_global_admin());

-- Supabase projects may have permissive default grants for new public tables.
-- Revoke them explicitly before granting the narrow client operations below.
revoke all on table public.profiles, public.institutions, public.institution_registrations,
  public.institution_verification_records, public.institution_memberships, public.role_assignments,
  public.programmes, public.learning_levels, public.institution_programme_offerings,
  public.student_enrolments, public.study_workspace_notes, public.institutional_records,
  public.institutional_record_change_log, public.institutional_import_batches,
  public.institutional_import_rows, public.institutional_account_tokens,
  public.institutional_invitations, public.audit_events, public.tutor_authorizations
from anon, authenticated;
revoke update(display_name) on public.profiles from authenticated;

grant select on public.institutions, public.programmes, public.learning_levels to anon, authenticated;
grant select on public.institution_registrations to authenticated;
grant select on public.institution_verification_records to authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select on public.institution_memberships, public.role_assignments, public.institution_programme_offerings, public.student_enrolments, public.institutional_records, public.institutional_record_change_log, public.institutional_import_batches, public.institutional_import_rows, public.audit_events, public.tutor_authorizations to authenticated;
grant select, insert, update, delete on public.study_workspace_notes to authenticated;
grant select (id,institution_id,record_id,expires_at,consumed_at,revoked_at,created_at) on public.institutional_account_tokens to authenticated;
grant select (id,institution_id,record_id,account_type,intended_identifier,expires_at,consumed_at,revoked_at,created_by,created_at) on public.institutional_invitations to authenticated;

-- No client write grants exist for roles, memberships, invitations, setup tokens or audit events.
