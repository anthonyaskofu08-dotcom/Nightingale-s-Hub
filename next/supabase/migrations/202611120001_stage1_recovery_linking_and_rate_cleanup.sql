-- Align institutional recovery with immediate institution-admin issuance,
-- preserve existing account suspension decisions during account linking, and
-- safely prune expired Stage 1 rate-limit state.

alter table public.institutional_recovery_requests
  add column if not exists issued_at timestamptz,
  add column if not exists failed_at timestamptz,
  add column if not exists failure_code text;
alter table public.institutional_recovery_requests
  drop constraint if exists institutional_recovery_requests_status_check;
alter table public.institutional_recovery_requests
  add constraint institutional_recovery_requests_status_check
  check (status in ('pending','issued','failed','escalated','closed','approved','rejected'));
alter table public.institutional_recovery_requests
  drop constraint if exists institutional_recovery_requests_check;
alter table public.institutional_recovery_requests
  add constraint institutional_recovery_requests_resolution_check check (
    (status='pending' and reviewed_by is null and reviewed_at is null and issued_at is null and failed_at is null)
    or (status='issued' and reviewed_by is null and reviewed_at is null and issued_at is not null and failed_at is null)
    or (status='failed' and reviewed_by is null and reviewed_at is null and issued_at is null and failed_at is not null)
    or (status='escalated' and reviewed_by is not null and reviewed_at is not null)
    or (status='closed' and reviewed_by is not null and reviewed_at is not null)
    or (status in ('approved','rejected') and reviewed_by is not null and reviewed_at is not null)
  );

drop policy if exists recovery_requests_global_read on public.institutional_recovery_requests;
create policy recovery_requests_scoped_read on public.institutional_recovery_requests
  for select to authenticated
  using (public.is_global_admin() or public.is_active_institution_admin(institution_id));

create or replace function public.create_institutional_recovery_request(
  p_actor_id uuid,p_record_id uuid,p_method text,p_case_reference text
) returns uuid language plpgsql security definer set search_path = pg_catalog, public
as $$
declare rec record; request_id uuid; expected_role text;
begin
  select id,institution_id,account_user_id,account_type,verification_status
    into rec from public.institutional_records where id=p_record_id for update;
  if not found or rec.account_user_id is null or rec.verification_status<>'verified' then raise exception 'account unavailable'; end if;
  if not public.is_active_institution_admin_actor(p_actor_id,rec.institution_id) then raise exception 'forbidden'; end if;
  expected_role := case rec.account_type when 'student' then 'institutional_student' else null end;
  if not exists(select 1 from public.institution_memberships where user_id=rec.account_user_id and institution_id=rec.institution_id and status='active')
    or not exists(select 1 from public.role_assignments where user_id=rec.account_user_id and institution_id=rec.institution_id and status='active' and (role=expected_role or (rec.account_type='tutor' and role in ('tutor','lecturer')))) then
    raise exception 'account role or membership is inactive';
  end if;
  if length(trim(coalesce(p_method,''))) not between 5 and 200 or length(trim(coalesce(p_case_reference,''))) not between 3 and 200 then
    raise exception 'verification method and case reference required';
  end if;
  insert into public.institutional_recovery_requests(institution_id,record_id,account_user_id,account_type,requested_by,verification_method,case_reference)
    values(rec.institution_id,rec.id,rec.account_user_id,rec.account_type,p_actor_id,trim(p_method),trim(p_case_reference)) returning id into request_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,rec.institution_id,'institutional_recovery_requested','institutional_recovery_request',request_id::text,
      jsonb_build_object('account_type',rec.account_type,'verification_method',left(trim(p_method),200)));
  return request_id;
end $$;

create or replace function public.complete_institutional_recovery_request(
  p_actor_id uuid,p_request_id uuid,p_outcome text,p_failure_code text default null
) returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
declare req record; next_status text;
begin
  select * into req from public.institutional_recovery_requests where id=p_request_id for update;
  if not found or req.requested_by<>p_actor_id or req.status<>'pending' then raise exception 'recovery request unavailable'; end if;
  if p_outcome is null or p_outcome not in ('issued','failed') then raise exception 'invalid recovery outcome'; end if;
  if p_outcome='issued' then
    if not public.is_active_institution_admin_actor(p_actor_id,req.institution_id) then raise exception 'institution administrator access is no longer active'; end if;
    update public.institutional_recovery_requests set status='issued',issued_at=now(),failure_code=null where id=p_request_id;
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
      values(p_actor_id,req.institution_id,'institutional_password_recovery_issued','institutional_recovery_request',p_request_id::text,
        jsonb_build_object('account_type',req.account_type,'identity_verified_by_admin',true));
  else
    next_status := 'failed';
    update public.institutional_recovery_requests set status=next_status,failed_at=now(),failure_code=left(coalesce(nullif(p_failure_code,''),'recovery_link_generation_failed'),80) where id=p_request_id;
    insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
      values(p_actor_id,req.institution_id,'institutional_password_recovery_failed','institutional_recovery_request',p_request_id::text,
        jsonb_build_object('account_type',req.account_type,'failure_code',left(coalesce(nullif(p_failure_code,''),'recovery_link_generation_failed'),80)));
  end if;
  return true;
end $$;

-- Global review remains available for exceptional cases only. It can escalate
-- an issued or failed request, or close an escalated case; it does not gate issue.
create or replace function public.finalize_institutional_recovery(
  p_reviewer_id uuid,p_request_id uuid,p_action text,p_evidence_method text,p_evidence_reference text
) returns jsonb language plpgsql security definer set search_path = pg_catalog, public
as $$
declare req record; next_status text;
begin
  if not exists(select 1 from public.role_assignments where user_id=p_reviewer_id and role='global_admin' and status='active' and institution_id is null) then raise exception 'forbidden'; end if;
  select * into req from public.institutional_recovery_requests where id=p_request_id for update;
  if not found or p_action is null or p_action not in ('escalate','close') then raise exception 'request unavailable'; end if;
  if length(trim(coalesce(p_evidence_method,'')))<5 or length(trim(coalesce(p_evidence_reference,'')))<3 then raise exception 'review evidence required'; end if;
  if p_action='escalate' and req.status not in ('pending','issued','failed') then raise exception 'request cannot be escalated'; end if;
  if p_action='close' and req.status<>'escalated' then raise exception 'only escalated cases can be closed'; end if;
  next_status:=case when p_action='escalate' then 'escalated' else 'closed' end;
  update public.institutional_recovery_requests set status=next_status,reviewed_by=p_reviewer_id,reviewed_at=now() where id=p_request_id;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_reviewer_id,req.institution_id,'institutional_recovery_'||next_status,'institutional_recovery_request',p_request_id::text,
      jsonb_build_object('evidence_method',left(p_evidence_method,200),'evidence_reference',left(p_evidence_reference,200),'prior_status',req.status));
  return jsonb_build_object('requestId',p_request_id,'status',next_status);
end $$;

-- Linking is allowed only for a verified, unclaimed official record. Existing
-- non-active memberships or role assignments are rejected and never revived.
create or replace function public.link_existing_student_account(p_actor_id uuid,p_token_hash text,p_identifier text)
returns void language plpgsql security definer set search_path = pg_catalog, public, auth
as $$
declare target_institution uuid; target_record uuid; rec record; inv record; tok record; membership_status text; existing_role record;
begin
  if auth.uid() is null or p_actor_id<>auth.uid()
    or not exists(select 1 from public.role_assignments where user_id=p_actor_id and role='independent_student' and institution_id is null and status='active') then
    raise exception 'forbidden';
  end if;
  select * into inv from public.institutional_invitations where token_hash=p_token_hash and consumed_at is null and revoked_at is null and expires_at>now() for update;
  if found then
    if inv.account_type<>'student' or lower(regexp_replace(normalize(trim(inv.intended_identifier),NFKC),'[-[:space:]]+','','g'))<>lower(regexp_replace(normalize(trim(p_identifier),NFKC),'[-[:space:]]+','','g')) then raise exception 'invalid invitation'; end if;
    target_institution:=inv.institution_id; target_record:=inv.record_id;
  else
    select * into tok from public.institutional_account_tokens where token_hash=p_token_hash and consumed_at is null and revoked_at is null and expires_at>now() for update;
    if not found then raise exception 'invalid invitation'; end if;
    target_institution:=tok.institution_id; target_record:=tok.record_id;
  end if;
  select * into rec from public.institutional_records where id=target_record and institution_id=target_institution for update;
  if not found or rec.account_type<>'student' or rec.account_user_id is not null or rec.verification_status<>'verified'
    or rec.normalized_identifier<>lower(regexp_replace(normalize(trim(p_identifier),NFKC),'[-[:space:]]+','','g')) then raise exception 'identifier unavailable'; end if;
  if not exists(select 1 from public.institutions where id=target_institution and status='published') then raise exception 'institution unavailable'; end if;
  if rec.current_data->>'programme_id' is null or rec.current_data->>'learning_level_id' is null then raise exception 'academic assignment missing'; end if;
  if exists(select 1 from public.institutional_records where account_user_id=p_actor_id) then raise exception 'account is already linked to an official record'; end if;

  select status into membership_status from public.institution_memberships where institution_id=target_institution and user_id=p_actor_id for update;
  if found and membership_status<>'active' then raise exception 'institution membership is suspended or ended'; end if;
  for existing_role in select role,status from public.role_assignments where institution_id=target_institution and user_id=p_actor_id for update loop
    if existing_role.role<>'institutional_student' then raise exception 'a different institutional role already exists'; end if;
    if existing_role.status<>'active' then raise exception 'institutional student role is suspended or revoked'; end if;
  end loop;

  insert into public.institution_memberships(institution_id,user_id,status) values(target_institution,p_actor_id,'active') on conflict(institution_id,user_id) do nothing;
  insert into public.role_assignments(user_id,role,institution_id,status,granted_by) values(p_actor_id,'institutional_student',target_institution,'active',p_actor_id) on conflict do nothing;
  select status into membership_status from public.institution_memberships where institution_id=target_institution and user_id=p_actor_id for update;
  if membership_status<>'active' then raise exception 'institution membership is suspended or ended'; end if;
  select * into existing_role from public.role_assignments where user_id=p_actor_id and institution_id=target_institution and role='institutional_student' for update;
  if not found or existing_role.status<>'active' then raise exception 'institutional student role is suspended or revoked'; end if;

  update public.institutional_records set account_user_id=p_actor_id,updated_at=now() where id=rec.id;
  insert into public.student_enrolments(user_id,institution_id,programme_id,learning_level_id,year_of_study,status)
    values(p_actor_id,target_institution,(rec.current_data->>'programme_id')::uuid,(rec.current_data->>'learning_level_id')::uuid,rec.current_data->>'year_of_study','active') on conflict do nothing;
  if inv.id is not null then update public.institutional_invitations set consumed_at=now() where id=inv.id; else update public.institutional_account_tokens set consumed_at=now() where id=tok.id; end if;
  update public.institutional_invitations set consumed_at=now() where record_id=rec.id and consumed_at is null and revoked_at is null;
  update public.institutional_account_tokens set revoked_at=now() where record_id=rec.id and consumed_at is null and revoked_at is null;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id) values(p_actor_id,target_institution,'independent_account_linked_to_institution','institutional_record',rec.id::text);
end $$;

-- Expire stale failure counters only after their failure window and any lockout
-- have ended, regardless of an overly recent caller-supplied cutoff.
create or replace function public.prune_auth_rate_limits(p_before timestamptz)
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$
declare removed integer; cutoff timestamptz;
begin
  cutoff:=least(coalesce(p_before,now()-interval '15 minutes'),now()-interval '15 minutes');
  delete from public.auth_rate_limit_buckets
    where updated_at<cutoff and window_started_at<now()-interval '15 minutes'
      and (locked_until is null or locked_until<=now());
  get diagnostics removed=row_count;
  return removed;
end $$;

create or replace function public.cleanup_expired_stage1_rate_limits()
returns integer language plpgsql security definer set search_path = pg_catalog, public
as $$
declare removed integer; request_removed integer;
begin
  removed:=public.prune_auth_rate_limits(now());
  delete from public.auth_request_limits
    where updated_at<now()-interval '1 hour' and window_started_at<now()-interval '1 hour';
  get diagnostics request_removed=row_count;
  return removed+request_removed;
end $$;

revoke all on function public.create_institutional_recovery_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_institutional_recovery_request(uuid,uuid,text,text) to service_role;
revoke all on function public.complete_institutional_recovery_request(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.complete_institutional_recovery_request(uuid,uuid,text,text) to service_role;
revoke all on function public.finalize_institutional_recovery(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.finalize_institutional_recovery(uuid,uuid,text,text,text) to service_role;
revoke all on function public.link_existing_student_account(uuid,text,text) from public,anon,service_role;
grant execute on function public.link_existing_student_account(uuid,text,text) to authenticated;
revoke all on function public.prune_auth_rate_limits(timestamptz) from public,anon,authenticated;
grant execute on function public.prune_auth_rate_limits(timestamptz) to service_role;
revoke all on function public.cleanup_expired_stage1_rate_limits() from public,anon,authenticated;
grant execute on function public.cleanup_expired_stage1_rate_limits() to service_role;

drop function if exists public.record_institutional_recovery_link_issued(uuid,uuid);
