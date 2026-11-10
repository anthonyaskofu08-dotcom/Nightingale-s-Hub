-- Stage 1 hardening: transactional administration, safe provisioning, abuse controls,
-- reusable import chunks and institution-scoped sequential Tutor IDs.
-- Apply after 202611090001_stage1_identity_and_institutional_records.sql in staging.

alter table public.institutional_import_batches
  add column if not exists client_import_id uuid,
  add column if not exists chunk_index integer;
create unique index if not exists institutional_import_batches_idempotency
  on public.institutional_import_batches(institution_id, created_by, client_import_id, chunk_index)
  where client_import_id is not null and chunk_index is not null;
alter table public.institutional_import_rows add column if not exists matched_data jsonb;
alter table public.institutional_import_rows drop constraint if exists institutional_import_rows_review_status_check;
alter table public.institutional_import_rows add constraint institutional_import_rows_review_status_check
  check (review_status in ('pending','new','changed','unchanged','conflict','accepted','skipped'));

create table if not exists public.institution_tutor_id_settings (
  institution_id uuid primary key references public.institutions(id) on delete cascade,
  current_prefix text not null check (current_prefix ~ '^[A-Z0-9][A-Z0-9-]{0,11}$'),
  sequence_width integer not null default 4 check (sequence_width between 2 and 10),
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
create table if not exists public.institution_tutor_id_counters (
  institution_id uuid not null references public.institutions(id) on delete cascade,
  prefix text not null check (prefix ~ '^[A-Z0-9][A-Z0-9-]{0,11}$'),
  next_value bigint not null default 1 check (next_value > 0),
  primary key (institution_id,prefix)
);

create table if not exists public.auth_rate_limit_buckets (
  bucket_hash text primary key check (bucket_hash ~ '^[a-f0-9]{64}$'),
  failure_count integer not null default 0,
  window_started_at timestamptz not null default now(),
  lock_level integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists auth_rate_limit_expiry on public.auth_rate_limit_buckets(updated_at);

create table if not exists public.institutional_provisioning_reservations (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  token_kind text not null check (token_kind in ('setup','invitation')),
  institution_id uuid not null references public.institutions(id),
  record_id uuid not null references public.institutional_records(id),
  account_type text not null check (account_type in ('student','tutor')),
  normalized_identifier text not null,
  status text not null default 'reserved' check (status in ('reserved','activated','cleanup','expired')),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  auth_enabled_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists institutional_provisioning_pending on public.institutional_provisioning_reservations(status,expires_at);

create table if not exists public.institutional_recovery_requests (
  id uuid primary key default gen_random_uuid(),
  institution_id uuid not null references public.institutions(id),
  record_id uuid not null references public.institutional_records(id),
  account_user_id uuid not null references auth.users(id),
  account_type text not null check (account_type in ('student','tutor')),
  requested_by uuid not null references auth.users(id),
  verification_method text not null,
  case_reference text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((status = 'pending' and reviewed_by is null and reviewed_at is null) or (status <> 'pending' and reviewed_by is not null and reviewed_at is not null))
);
create unique index if not exists institutional_recovery_one_pending
  on public.institutional_recovery_requests(record_id) where status = 'pending';

alter table public.institution_tutor_id_settings enable row level security;
alter table public.institution_tutor_id_counters enable row level security;
alter table public.auth_rate_limit_buckets enable row level security;
alter table public.institutional_provisioning_reservations enable row level security;
alter table public.institutional_recovery_requests enable row level security;
revoke all on table public.institution_tutor_id_settings, public.institution_tutor_id_counters,
  public.auth_rate_limit_buckets, public.institutional_provisioning_reservations,
  public.institutional_recovery_requests from anon, authenticated;

create policy recovery_requests_global_read on public.institutional_recovery_requests
  for select to authenticated using (public.is_global_admin());
grant select on public.institutional_recovery_requests to authenticated;

create or replace function public.is_active_institution_admin_actor(p_actor_id uuid,p_institution_id uuid)
returns boolean language sql stable security definer set search_path = pg_catalog, public
as $$ select exists (
  select 1 from public.role_assignments r
  join public.institution_memberships m on m.user_id=r.user_id and m.institution_id=r.institution_id and m.status='active'
  join public.institutions i on i.id=r.institution_id and i.status in ('approved','published')
  where r.user_id=p_actor_id and r.institution_id=p_institution_id and r.role='institution_admin' and r.status='active'
) $$;

create or replace function public.create_institutional_record(p_actor_id uuid,p_institution_id uuid,p_account_type text,p_identifier text,p_data jsonb)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare record_id uuid; norm text; programme_id uuid; level_id uuid;
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  if p_account_type not in ('student','tutor') or jsonb_typeof(p_data) is distinct from 'object' then raise exception 'invalid record'; end if;
  norm := lower(regexp_replace(normalize(trim(coalesce(p_identifier,'')),NFKC),'[-[:space:]]+','','g'));
  if norm='' or length(norm)>100 or length(trim(coalesce(p_data->>'full_name',''))) not between 1 and 200 then raise exception 'invalid record'; end if;
  if p_account_type='student' then
    programme_id := (p_data->>'programme_id')::uuid; level_id := (p_data->>'learning_level_id')::uuid;
    if not exists(select 1 from public.programmes p join public.institution_programme_offerings o on o.programme_id=p.id
      where p.id=programme_id and p.active and o.institution_id=p_institution_id and o.status='active')
      or not exists(select 1 from public.learning_levels where id=level_id and active) then raise exception 'academic assignment unavailable'; end if;
  end if;
  insert into public.institutional_records(institution_id,account_type,identifier,original_data,current_data,verification_status,source,created_by,updated_by)
    values(p_institution_id,p_account_type,trim(p_identifier),p_data,p_data,'pending','manual',p_actor_id,p_actor_id) returning id into record_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,p_institution_id,'institutional_record_created','institutional_record',record_id::text,
      jsonb_build_object('account_type',p_account_type,'identifier_suffix',right(trim(p_identifier),3),'source','manual'));
  return record_id;
end $$;

create or replace function public.set_institution_tutor_id_prefix(p_actor_id uuid,p_institution_id uuid,p_prefix text)
returns text language plpgsql security definer set search_path = pg_catalog, public
as $$
declare normalized_prefix text; prior_prefix text;
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  normalized_prefix := upper(trim(coalesce(p_prefix,'')));
  if normalized_prefix !~ '^[A-Z0-9][A-Z0-9-]{0,11}$' then raise exception 'invalid Tutor ID prefix'; end if;
  select current_prefix into prior_prefix from public.institution_tutor_id_settings where institution_id=p_institution_id for update;
  insert into public.institution_tutor_id_settings(institution_id,current_prefix,updated_by)
    values(p_institution_id,normalized_prefix,p_actor_id)
    on conflict(institution_id) do update set current_prefix=excluded.current_prefix,updated_by=excluded.updated_by,updated_at=now();
  if prior_prefix is distinct from normalized_prefix then
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
      values(p_actor_id,p_institution_id,'tutor_id_prefix_configured','institution',p_institution_id::text,jsonb_build_object('prefix',normalized_prefix));
  end if;
  return normalized_prefix;
end $$;

create or replace function public.allocate_institution_tutor_id(p_actor_id uuid,p_institution_id uuid,p_prefix text default null)
returns text language plpgsql security definer set search_path = pg_catalog, public
as $$
declare settings record; counter bigint; candidate text; prefix_value text; tries integer:=0;
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  if nullif(trim(coalesce(p_prefix,'')),'') is not null then perform public.set_institution_tutor_id_prefix(p_actor_id,p_institution_id,p_prefix); end if;
  select * into settings from public.institution_tutor_id_settings where institution_id=p_institution_id for update;
  if not found then raise exception 'configure Tutor ID prefix first'; end if;
  prefix_value:=settings.current_prefix;
  insert into public.institution_tutor_id_counters(institution_id,prefix,next_value) values(p_institution_id,prefix_value,1) on conflict do nothing;
  loop
    select next_value into counter from public.institution_tutor_id_counters where institution_id=p_institution_id and prefix=prefix_value for update;
    update public.institution_tutor_id_counters set next_value=counter+1 where institution_id=p_institution_id and prefix=prefix_value;
    candidate:=prefix_value||lpad(counter::text,greatest(settings.sequence_width,length(counter::text)),'0');
    tries:=tries+1;
    exit when not exists(select 1 from public.institutional_records where institution_id=p_institution_id and account_type='tutor' and normalized_identifier=lower(regexp_replace(normalize(candidate,NFKC),'[-[:space:]]+','','g')));
    if tries>=1000 then raise exception 'Tutor ID allocation needs administrator review'; end if;
  end loop;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,p_institution_id,'tutor_id_allocated','tutor_identifier',candidate,jsonb_build_object('prefix',prefix_value));
  return candidate;
end $$;

create or replace function public.create_institutional_import_chunk(
  p_actor_id uuid,p_institution_id uuid,p_account_type text,p_import_name text,p_client_import_id uuid,p_chunk_index integer,p_rows jsonb
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare v_batch_id uuid; item jsonb; row_no integer:=0; ident text; norm text; full_name text; proposed jsonb; existing public.institutional_records%rowtype; status_value text; reason text; seen text[]:='{}'; programme_key uuid; level_key uuid; counts jsonb;
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  if p_account_type not in ('student','tutor') or jsonb_typeof(p_rows) is distinct from 'array' or jsonb_array_length(p_rows) not between 1 and 500 or p_chunk_index<0 then raise exception 'invalid import chunk'; end if;
  insert into public.institutional_import_batches(institution_id,import_name,account_type,created_by,client_import_id,chunk_index)
    values(p_institution_id,left(coalesce(p_import_name,'Institution register'),255),p_account_type,p_actor_id,p_client_import_id,p_chunk_index)
    on conflict(institution_id,created_by,client_import_id,chunk_index) where client_import_id is not null and chunk_index is not null do nothing
    returning id into v_batch_id;
  if v_batch_id is null then
    select ib.id into v_batch_id from public.institutional_import_batches ib where ib.institution_id=p_institution_id and ib.created_by=p_actor_id and ib.client_import_id=p_client_import_id and ib.chunk_index=p_chunk_index;
    select jsonb_build_object('batchId',v_batch_id,'rows',count(*),'new',count(*) filter(where r.review_status='new'),'changed',count(*) filter(where r.review_status='changed'),'unchanged',count(*) filter(where r.review_status='unchanged'),'conflicts',count(*) filter(where r.review_status='conflict'),'reused',true)
      into counts from public.institutional_import_rows r where r.batch_id=v_batch_id;
    return counts;
  end if;
  for item in select value from jsonb_array_elements(p_rows) with ordinality as rows(value,ordinality) order by ordinality loop
    row_no:=row_no+1; ident:=trim(coalesce(item->>'identifier','')); norm:=lower(regexp_replace(normalize(ident,NFKC),'[-[:space:]]+','','g')); full_name:=trim(coalesce(item->>'fullName',''));
    reason:=null; existing:=null; programme_key:=null; level_key:=null;
    if coalesce(item->>'accountType',p_account_type)<>p_account_type then reason:='Account type differs from this import batch.';
    elsif norm='' or length(norm)>100 or full_name='' or length(full_name)>200 then reason:='Name or identifier is missing or too long.';
    elsif norm=any(seen) then reason:='Identifier is repeated in this file.';
    elsif length(coalesce(item->>'programme',''))>500 or length(coalesce(item->>'academicLevel',''))>500 or length(coalesce(item->>'yearOfStudy',''))>500 or length(coalesce(item->>'subjects',''))>500 then reason:='A field exceeds the 500-character limit.';
    end if;
    seen:=array_append(seen,norm);
    proposed:=jsonb_build_object('full_name',full_name,'programme',nullif(trim(coalesce(item->>'programme','')),''),'academic_level',nullif(trim(coalesce(item->>'academicLevel','')),''),'year_of_study',nullif(trim(coalesce(item->>'yearOfStudy','')),''),'subjects',nullif(trim(coalesce(item->>'subjects','')),''));
    if reason is null and p_account_type='student' then
      select p.id into programme_key from public.programmes p where p.active and lower(p.name)=lower(trim(coalesce(item->>'programme','')));
      select ll.id into level_key from public.learning_levels ll where ll.active and lower(ll.name)=lower(trim(coalesce(item->>'academicLevel','')));
      if programme_key is null or level_key is null then reason:='Programme or academic level does not match the active catalogue.';
      elsif not exists(select 1 from public.institution_programme_offerings o where o.institution_id=p_institution_id and o.programme_id=programme_key and o.status='active') then reason:='Programme is not offered by this institution.';
      else proposed:=proposed||jsonb_build_object('programme_id',programme_key,'learning_level_id',level_key); end if;
    end if;
    if reason is null then
      select * into existing from public.institutional_records r where r.institution_id=p_institution_id and r.account_type=p_account_type and r.normalized_identifier=norm;
      if found and existing.account_user_id is not null then reason:='Identifier is already linked to an account and cannot be bulk changed.';
    end if;
    if reason is not null then status_value:='conflict';
    elsif existing.id is null then status_value:='new';
    elsif existing.current_data is distinct from proposed then status_value:='changed';
    else status_value:='unchanged'; end if;
    insert into public.institutional_import_rows(batch_id,row_number,proposed_data,matched_record_id,matched_data,review_status,conflict_reason)
      values(v_batch_id,row_no+1,proposed||jsonb_build_object('identifier',ident),existing.id,case when existing.id is null then null else existing.current_data end,status_value,reason);
  end loop;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,p_institution_id,'official_register_import_staged','institutional_import_batch',v_batch_id::text,jsonb_build_object('rows',row_no,'account_type',p_account_type,'chunk',p_chunk_index));
  select jsonb_build_object('batchId',v_batch_id,'rows',count(*),'new',count(*) filter(where r.review_status='new'),'changed',count(*) filter(where r.review_status='changed'),'unchanged',count(*) filter(where r.review_status='unchanged'),'conflicts',count(*) filter(where r.review_status='conflict'),'reused',false)
    into counts from public.institutional_import_rows r where r.batch_id=v_batch_id;
  return counts;
end $$;

create or replace function public.apply_institutional_import(p_actor_id uuid,p_batch_id uuid,p_accept_row_ids uuid[])
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare b record; r record; existing_record public.institutional_records%rowtype; created_count integer:=0; updated_count integer:=0; skipped_count integer:=0; accepted boolean; prior jsonb;
begin
  select * into b from public.institutional_import_batches where id=p_batch_id for update;
  if not found then raise exception 'import batch unavailable'; end if;
  if not public.is_active_institution_admin_actor(p_actor_id,b.institution_id) then raise exception 'forbidden'; end if;
  if b.status='applied' then
    select metadata into prior from public.audit_events where action='official_register_import_applied' and target_id=b.id::text order by created_at desc limit 1;
    return coalesce(prior,jsonb_build_object('created',0,'updated',0,'skipped',0))||jsonb_build_object('alreadyApplied',true);
  end if;
  if b.status<>'review' then raise exception 'import batch unavailable'; end if;
  for r in select * from public.institutional_import_rows where batch_id=p_batch_id and review_status in ('new','changed','unchanged','conflict') order by row_number for update loop
    accepted:=r.id=any(coalesce(p_accept_row_ids,'{}'::uuid[]));
    if accepted and r.review_status='new' then
      insert into public.institutional_records(institution_id,account_type,identifier,original_data,current_data,verification_status,source,created_by,updated_by)
        values(b.institution_id,b.account_type,r.proposed_data->>'identifier',r.proposed_data-'identifier',r.proposed_data-'identifier','pending','spreadsheet',p_actor_id,p_actor_id);
      created_count:=created_count+1;
      update public.institutional_import_rows set review_status='accepted' where id=r.id;
    elsif accepted and r.review_status='changed' then
      select * into existing_record from public.institutional_records where id=r.matched_record_id and institution_id=b.institution_id and account_type=b.account_type for update;
      if not found or existing_record.account_user_id is not null or existing_record.current_data is distinct from r.matched_data or existing_record.normalized_identifier<>lower(regexp_replace(normalize(trim(r.proposed_data->>'identifier'),NFKC),'[-[:space:]]+','','g')) then raise exception 'record changed since import review; stage it again'; end if;
      update public.institutional_records set current_data=r.proposed_data-'identifier',verification_status='pending',updated_by=p_actor_id,updated_at=now() where id=existing_record.id;
      insert into public.institutional_record_change_log(record_id,actor_id,changed_fields,previous_data,next_data)
        values(existing_record.id,p_actor_id,'["bulk_register_update"]'::jsonb,existing_record.current_data,r.proposed_data-'identifier');
      updated_count:=updated_count+1;
      update public.institutional_import_rows set review_status='accepted' where id=r.id;
    else
      update public.institutional_import_rows set review_status='skipped' where id=r.id;
      skipped_count:=skipped_count+1;
    end if;
  end loop;
  update public.institutional_import_batches set status='applied',applied_at=now() where id=p_batch_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,b.institution_id,'official_register_import_applied','institutional_import_batch',b.id::text,jsonb_build_object('created',created_count,'updated',updated_count,'skipped',skipped_count));
  return jsonb_build_object('created',created_count,'updated',updated_count,'skipped',skipped_count,'alreadyApplied',false);
end $$;

create or replace function public.submit_institution_registration(p_actor_id uuid,p_institution_name text,p_type text,p_location text,p_contact text,p_display_name text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare registration_id uuid; prior_id uuid;
begin
  if not exists(select 1 from auth.users where id=p_actor_id and email_confirmed_at is not null and raw_user_meta_data->>'registration_path'='institution_applicant') then raise exception 'verified applicant required'; end if;
  select id into prior_id from public.institution_registrations where applicant_id=p_actor_id and status in ('submitted','under_review') for update;
  if prior_id is not null then return prior_id; end if;
  if length(trim(p_institution_name)) not between 1 and 200 or length(trim(p_type)) not between 1 and 100 or length(trim(p_location)) not between 1 and 200 or length(trim(p_contact)) not between 3 and 254 then raise exception 'invalid application'; end if;
  insert into public.institution_registrations(applicant_id,institution_name,institution_type,location,official_contact)
    values(p_actor_id,trim(p_institution_name),trim(p_type),trim(p_location),trim(p_contact)) returning id into registration_id;
  insert into public.profiles(id,display_name) values(p_actor_id,left(trim(p_display_name),200)) on conflict(id) do update set display_name=excluded.display_name;
  insert into public.audit_events(actor_id,action,target_type,target_id) values(p_actor_id,'institution_registration_submitted','institution_registration',registration_id::text);
  return registration_id;
end $$;

create or replace function public.update_institution_profile(p_actor_id uuid,p_institution_id uuid,p_location text,p_contact text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  if length(trim(p_location)) not between 1 and 200 or length(trim(p_contact)) not between 3 and 254 then raise exception 'invalid institution profile'; end if;
  update public.institutions set location=trim(p_location),official_contact=trim(p_contact),updated_at=now() where id=p_institution_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,p_institution_id,'institution_profile_updated','institution',p_institution_id::text,jsonb_build_object('location_changed',true,'official_contact_changed',true));
  return true;
end $$;

create or replace function public.manage_institution_programme(p_actor_id uuid,p_institution_id uuid,p_action text,p_programme_id uuid default null,p_offering_id uuid default null)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare result_id uuid;
begin
  if not public.is_active_institution_admin_actor(p_actor_id,p_institution_id) then raise exception 'forbidden'; end if;
  if p_action='add' then
    if not exists(select 1 from public.programmes where id=p_programme_id and active) then raise exception 'programme unavailable'; end if;
    insert into public.institution_programme_offerings(institution_id,programme_id,status) values(p_institution_id,p_programme_id,'active') returning id into result_id;
  elsif p_action in ('activate','deactivate') then
    update public.institution_programme_offerings set status=case when p_action='activate' then 'active' else 'inactive' end
      where id=p_offering_id and institution_id=p_institution_id returning id into result_id;
    if result_id is null then raise exception 'programme offering unavailable'; end if;
  else raise exception 'invalid programme action'; end if;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id)
    values(p_actor_id,p_institution_id,'institution_programme_'||p_action,'institution_programme_offering',result_id::text);
  return result_id;
end $$;

create or replace function public.manage_academic_catalogue(p_actor_id uuid,p_kind text,p_action text,p_id uuid,p_name text,p_sort_order integer)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare target_table text; result_id uuid; name_value text;
begin
  if not exists(select 1 from public.role_assignments where user_id=p_actor_id and role='global_admin' and status='active') then raise exception 'forbidden'; end if;
  if p_kind not in ('programme','level') or p_action not in ('add','activate','deactivate') then raise exception 'invalid catalogue operation'; end if;
  if p_kind='programme' then target_table:='programmes'; else target_table:='learning_levels'; end if;
  if p_action='add' then
    name_value:=trim(coalesce(p_name,'')); if length(name_value) not between 1 and 150 then raise exception 'invalid catalogue name'; end if;
    if p_kind='programme' then insert into public.programmes(name,active) values(name_value,true) returning id into result_id;
    else insert into public.learning_levels(name,active,sort_order) values(name_value,true,coalesce(p_sort_order,0)) returning id into result_id; end if;
  elsif p_kind='programme' then
    update public.programmes set active=(p_action='activate') where id=p_id returning id into result_id;
  else update public.learning_levels set active=(p_action='activate') where id=p_id returning id into result_id; end if;
  if result_id is null then raise exception 'catalogue item unavailable'; end if;
  insert into public.audit_events(actor_id,action,target_type,target_id,metadata)
    values(p_actor_id,'academic_catalogue_'||p_action,p_kind,result_id::text,jsonb_build_object('kind',p_kind));
  return result_id;
end $$;

create or replace function public.create_institutional_recovery_request(p_actor_id uuid,p_record_id uuid,p_method text,p_case_reference text)
returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare rec record; request_id uuid;
begin
  select * into rec from public.institutional_records where id=p_record_id for update;
  if not found or rec.account_user_id is null or rec.verification_status<>'verified' then raise exception 'account unavailable'; end if;
  if not public.is_active_institution_admin_actor(p_actor_id,rec.institution_id) then raise exception 'forbidden'; end if;
  if length(trim(p_method)) not between 5 and 200 or length(trim(p_case_reference)) not between 3 and 200 then raise exception 'verification evidence required'; end if;
  insert into public.institutional_recovery_requests(institution_id,record_id,account_user_id,account_type,requested_by,verification_method,case_reference)
    values(rec.institution_id,rec.id,rec.account_user_id,rec.account_type,p_actor_id,trim(p_method),trim(p_case_reference)) returning id into request_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,rec.institution_id,'institutional_recovery_requested','institutional_recovery_request',request_id::text,jsonb_build_object('account_type',rec.account_type));
  return request_id;
end $$;

create or replace function public.finalize_institutional_recovery(p_reviewer_id uuid,p_request_id uuid,p_action text,p_evidence_method text,p_evidence_reference text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare request_row record;
begin
  if not exists(select 1 from public.role_assignments where user_id=p_reviewer_id and role='global_admin' and status='active') then raise exception 'forbidden'; end if;
  select * into request_row from public.institutional_recovery_requests where id=p_request_id for update;
  if not found or request_row.status<>'pending' then raise exception 'request unavailable'; end if;
  if p_action not in ('approve','reject') then raise exception 'invalid recovery action'; end if;
  if p_action='approve' and (length(trim(p_evidence_method))<5 or length(trim(p_evidence_reference))<3) then raise exception 'independent verification evidence required'; end if;
  update public.institutional_recovery_requests set status=case when p_action='approve' then 'approved' else 'rejected' end,reviewed_by=p_reviewer_id,reviewed_at=now() where id=p_request_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_reviewer_id,request_row.institution_id,'institutional_recovery_'||p_action,'institutional_recovery_request',p_request_id::text,jsonb_build_object('evidence_method',left(coalesce(p_evidence_method,''),200),'evidence_reference',left(coalesce(p_evidence_reference,''),200)));
  return jsonb_build_object('requestId',p_request_id,'accountUserId',request_row.account_user_id,'approved',p_action='approve');
end $$;

-- Persistent hashed buckets. Edge Functions supply hashes only; raw passwords, IDs,
-- IPs and invitation tokens are never written to this table.
create or replace function public.check_auth_rate_limits(p_bucket_hashes text[])
returns jsonb language sql security definer set search_path = pg_catalog, public
as $$ select jsonb_build_object('blocked',exists(select 1 from public.auth_rate_limit_buckets b where b.bucket_hash=any(p_bucket_hashes) and b.locked_until>now()),'retryAt',(select max(locked_until) from public.auth_rate_limit_buckets b where b.bucket_hash=any(p_bucket_hashes) and b.locked_until>now())) $$;

create or replace function public.record_auth_failures(p_bucket_hashes text[])
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare item text; b public.auth_rate_limit_buckets%rowtype; next_count integer; next_level integer; delay_minutes integer;
begin
  foreach item in array p_bucket_hashes loop
    if item !~ '^[a-f0-9]{64}$' then raise exception 'invalid bucket'; end if;
    insert into public.auth_rate_limit_buckets(bucket_hash) values(item) on conflict do nothing;
    select * into b from public.auth_rate_limit_buckets where bucket_hash=item for update;
    next_count:=case when b.window_started_at<now()-interval '15 minutes' then 1 else b.failure_count+1 end;
    next_level:=case when next_count>=8 then least(b.lock_level+1,5) else b.lock_level end;
    delay_minutes:=least(60,5*(2^greatest(next_level-1,0))::integer);
    update public.auth_rate_limit_buckets set failure_count=next_count,
      window_started_at=case when b.window_started_at<now()-interval '15 minutes' then now() else b.window_started_at end,
      lock_level=next_level,locked_until=case when next_count>=8 then now()+make_interval(mins=>delay_minutes) else locked_until end,updated_at=now()
      where bucket_hash=item;
  end loop;
end $$;

create or replace function public.record_auth_success(p_identifier_bucket_hash text)
returns void language sql security definer set search_path = pg_catalog, public
as $$ update public.auth_rate_limit_buckets set failure_count=0,window_started_at=now(),locked_until=null,updated_at=now() where bucket_hash=p_identifier_bucket_hash $$;

create or replace function public.prune_auth_rate_limits(p_before timestamptz)
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$ declare removed integer; begin delete from public.auth_rate_limit_buckets where updated_at<p_before and (locked_until is null or locked_until<now()); get diagnostics removed=row_count; return removed; end $$;

create or replace function public.reserve_institutional_provision(p_token_hash text,p_identifier text,p_account_type text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare tok record; rec record; prior public.institutional_provisioning_reservations%rowtype; token_kind text; institution_key uuid; record_key uuid; type_key text; expected_id text; normalized text;
begin
  select * into prior from public.institutional_provisioning_reservations where token_hash=p_token_hash for update;
  if found then
    if prior.status in ('cleanup','expired','activated') then raise exception 'invitation unavailable'; end if;
    if prior.status='reserved' and prior.expires_at<=now() then update public.institutional_provisioning_reservations set status='cleanup',updated_at=now() where id=prior.id; raise exception 'invitation unavailable'; end if;
    if prior.normalized_identifier<>lower(regexp_replace(normalize(trim(p_identifier),NFKC),'[-[:space:]]+','','g')) or (p_account_type is not null and prior.account_type<>p_account_type) then raise exception 'invitation unavailable'; end if;
    return jsonb_build_object('reservationId',prior.id,'status',prior.status,'authUserId',prior.auth_user_id,'institutionId',prior.institution_id,'recordId',prior.record_id,'accountType',prior.account_type);
  end if;
  select i.id,i.institution_id,i.record_id,i.account_type,i.intended_identifier,'invitation'::text as kind into tok from public.institutional_invitations i where i.token_hash=p_token_hash and i.consumed_at is null and i.revoked_at is null and i.expires_at>now() for update;
  if found then token_kind:='invitation'; institution_key:=tok.institution_id; record_key:=tok.record_id; type_key:=tok.account_type; expected_id:=tok.intended_identifier;
  else
    select t.id,t.institution_id,t.record_id,'setup'::text as kind into tok from public.institutional_account_tokens t where t.token_hash=p_token_hash and t.consumed_at is null and t.revoked_at is null and t.expires_at>now() for update;
    if not found then raise exception 'invitation unavailable'; end if;
    token_kind:='setup'; institution_key:=tok.institution_id; record_key:=tok.record_id;
    select account_type,identifier into type_key,expected_id from public.institutional_records where id=record_key and institution_id=institution_key;
  end if;
  if (p_account_type is not null and type_key<>p_account_type) or lower(regexp_replace(normalize(trim(expected_id),NFKC),'[-[:space:]]+','','g'))<>lower(regexp_replace(normalize(trim(p_identifier),NFKC),'[-[:space:]]+','','g')) then raise exception 'invitation unavailable'; end if;
  select * into rec from public.institutional_records where id=record_key and institution_id=institution_key for update;
  if not found or rec.account_user_id is not null or rec.verification_status<>'verified' or not exists(select 1 from public.institutions where id=institution_key and status='published') then raise exception 'invitation unavailable'; end if;
  normalized:=rec.normalized_identifier;
  insert into public.institutional_provisioning_reservations(token_hash,token_kind,institution_id,record_id,account_type,normalized_identifier,expires_at)
    values(p_token_hash,token_kind,institution_key,record_key,type_key,normalized,now()+interval '30 minutes') returning * into prior;
  return jsonb_build_object('reservationId',prior.id,'status',prior.status,'authUserId',prior.auth_user_id,'institutionId',prior.institution_id,'recordId',prior.record_id,'accountType',prior.account_type);
end $$;

create or replace function public.attach_institutional_provision_user(p_reservation_id uuid,p_user_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$ declare r record; begin
  select * into r from public.institutional_provisioning_reservations where id=p_reservation_id for update;
  if not found or r.status<>'reserved' or r.expires_at<=now() then raise exception 'reservation unavailable'; end if;
  if r.auth_user_id is not null and r.auth_user_id<>p_user_id then raise exception 'reservation already attached'; end if;
  update public.institutional_provisioning_reservations set auth_user_id=p_user_id,updated_at=now() where id=p_reservation_id;
  return true;
end $$;

create or replace function public.finalize_reserved_institutional_provision(p_reservation_id uuid,p_user_id uuid,p_display_name text)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$ declare r record; begin
  select * into r from public.institutional_provisioning_reservations where id=p_reservation_id for update;
  if not found or r.auth_user_id<>p_user_id then raise exception 'reservation unavailable'; end if;
  if r.status='activated' then return true; end if;
  if r.status<>'reserved' or r.expires_at<=now() then raise exception 'reservation unavailable'; end if;
  if r.token_kind='invitation' then
    perform public.finalize_invitation_provision(r.token_hash,r.normalized_identifier,r.account_type,p_user_id,p_display_name);
  else
    perform public.finalize_institutional_provision(r.token_hash,p_user_id,p_display_name);
  end if;
  update public.institutional_provisioning_reservations set status='activated',updated_at=now() where id=p_reservation_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id)
    values(p_user_id,r.institution_id,'institutional_provisioning_reserved_and_activated','provisioning_reservation',p_reservation_id::text);
  return true;
end $$;

create or replace function public.claim_institutional_provision_cleanup(p_limit integer default 100)
returns table(reservation_id uuid,status text,auth_user_id uuid) language plpgsql security definer set search_path = pg_catalog, public
as $$ begin
  update public.institutional_provisioning_reservations r set status='cleanup',updated_at=now()
    where r.id in (select id from public.institutional_provisioning_reservations where status='reserved' and expires_at<=now() order by expires_at for update skip locked limit greatest(1,least(p_limit,500)));
  return query select r.id,r.status,r.auth_user_id from public.institutional_provisioning_reservations r
    where r.status='cleanup' or (r.status='activated' and r.auth_user_id is not null and r.auth_enabled_at is null) order by r.updated_at limit greatest(1,least(p_limit,500));
end $$;

create or replace function public.finish_institutional_provision_cleanup(p_reservation_id uuid,p_user_deleted boolean)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$ declare r record; begin
  select * into r from public.institutional_provisioning_reservations where id=p_reservation_id for update;
  if not found then return false; end if;
  if r.status='activated' and r.auth_enabled_at is null then
    update public.institutional_provisioning_reservations set auth_enabled_at=now(),updated_at=now() where id=r.id;
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values(r.auth_user_id,r.institution_id,'institutional_auth_login_enabled','provisioning_reservation',r.id::text);
  elsif r.status='cleanup' then
    if p_user_deleted and r.auth_user_id is not null then delete from auth.users where id=r.auth_user_id; end if;
    update public.institutional_provisioning_reservations set status='expired',updated_at=now() where id=r.id;
    insert into public.audit_events(institution_id,action,target_type,target_id,metadata) values(r.institution_id,'abandoned_institutional_provision_cleaned','provisioning_reservation',r.id::text,jsonb_build_object('auth_user_deleted',p_user_deleted));
  end if;
  return true;
end $$;

-- Restrict every new definer function to the server role; caller identity is checked
-- again within each operation rather than trusting frontend state.
revoke all on function public.is_active_institution_admin_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.is_active_institution_admin_actor(uuid,uuid) to service_role;
revoke all on function public.create_institutional_record(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_institutional_record(uuid,uuid,text,text,jsonb) to service_role;
revoke all on function public.set_institution_tutor_id_prefix(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.set_institution_tutor_id_prefix(uuid,uuid,text) to service_role;
revoke all on function public.allocate_institution_tutor_id(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.allocate_institution_tutor_id(uuid,uuid,text) to service_role;
revoke all on function public.create_institutional_import_chunk(uuid,uuid,text,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.create_institutional_import_chunk(uuid,uuid,text,text,uuid,integer,jsonb) to service_role;
revoke all on function public.apply_institutional_import(uuid,uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.apply_institutional_import(uuid,uuid,uuid[]) to service_role;
revoke all on function public.submit_institution_registration(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.submit_institution_registration(uuid,text,text,text,text,text) to service_role;
revoke all on function public.update_institution_profile(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.update_institution_profile(uuid,uuid,text,text) to service_role;
revoke all on function public.manage_institution_programme(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.manage_institution_programme(uuid,uuid,text,uuid,uuid) to service_role;
revoke all on function public.manage_academic_catalogue(uuid,text,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.manage_academic_catalogue(uuid,text,text,uuid,text,integer) to service_role;
revoke all on function public.create_institutional_recovery_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_institutional_recovery_request(uuid,uuid,text,text) to service_role;
revoke all on function public.finalize_institutional_recovery(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finalize_institutional_recovery(uuid,uuid,text,text,text) to service_role;
revoke all on function public.check_auth_rate_limits(text[]) from public,anon,authenticated;
grant execute on function public.check_auth_rate_limits(text[]) to service_role;
revoke all on function public.record_auth_failures(text[]) from public,anon,authenticated;
grant execute on function public.record_auth_failures(text[]) to service_role;
revoke all on function public.record_auth_success(text) from public,anon,authenticated;
grant execute on function public.record_auth_success(text) to service_role;
revoke all on function public.prune_auth_rate_limits(timestamptz) from public,anon,authenticated;
grant execute on function public.prune_auth_rate_limits(timestamptz) to service_role;
revoke all on function public.reserve_institutional_provision(text,text,text) from public,anon,authenticated;
grant execute on function public.reserve_institutional_provision(text,text,text) to service_role;
revoke all on function public.attach_institutional_provision_user(uuid,uuid) from public,anon,authenticated;
grant execute on function public.attach_institutional_provision_user(uuid,uuid) to service_role;
revoke all on function public.finalize_reserved_institutional_provision(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.finalize_reserved_institutional_provision(uuid,uuid,text) to service_role;
revoke all on function public.claim_institutional_provision_cleanup(integer) from public,anon,authenticated;
grant execute on function public.claim_institutional_provision_cleanup(integer) to service_role;
revoke all on function public.finish_institutional_provision_cleanup(uuid,boolean) from public,anon,authenticated;
grant execute on function public.finish_institutional_provision_cleanup(uuid,boolean) to service_role;
