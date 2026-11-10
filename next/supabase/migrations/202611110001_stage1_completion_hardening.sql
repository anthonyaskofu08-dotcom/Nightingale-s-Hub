-- Complete Stage 1 audit coverage and apply a request-rate limit to scoped
-- institutional directory lookup. Apply after the two Stage 1 migrations.

create table if not exists public.auth_request_limits (
  bucket_hash text primary key check (bucket_hash ~ '^[a-f0-9]{64}$'),
  request_count integer not null default 0 check (request_count >= 0),
  window_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.auth_request_limits enable row level security;
revoke all on table public.auth_request_limits from anon, authenticated;

create or replace function public.consume_institutional_lookup_limits(p_bucket_hashes text[],p_max integer default 30,p_window_seconds integer default 60)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
declare item text; b public.auth_request_limits%rowtype;
begin
  if coalesce(array_length(p_bucket_hashes,1),0) not between 1 and 10
    or p_max not between 1 and 1000 or p_window_seconds not between 1 and 3600
    or exists(select 1 from unnest(p_bucket_hashes) h where h !~ '^[a-f0-9]{64}$') then
    raise exception 'invalid lookup rate-limit request';
  end if;
  for item in select distinct h from unnest(p_bucket_hashes) h order by h loop
    insert into public.auth_request_limits(bucket_hash) values(item) on conflict do nothing;
  end loop;
  -- Lock every bucket in stable order so concurrent requests cannot race the
  -- per-user, per-institution or per-proxy limit check.
  for b in select * from public.auth_request_limits where bucket_hash=any(p_bucket_hashes) order by bucket_hash for update loop
    if b.window_started_at >= now()-make_interval(secs=>p_window_seconds) and b.request_count >= p_max then
      return false;
    end if;
  end loop;
  update public.auth_request_limits set
    request_count=case when window_started_at < now()-make_interval(secs=>p_window_seconds) then 1 else request_count+1 end,
    window_started_at=case when window_started_at < now()-make_interval(secs=>p_window_seconds) then now() else window_started_at end,
    updated_at=now()
  where bucket_hash=any(p_bucket_hashes);
  return true;
end $$;

create or replace function public.record_institutional_recovery_link_issued(p_actor_id uuid,p_record_id uuid)
returns boolean language plpgsql security definer set search_path = pg_catalog, public
as $$
declare rec record;
begin
  select id,institution_id,account_user_id,account_type,verification_status into rec
    from public.institutional_records where id=p_record_id for update;
  if not found or rec.account_user_id is null or rec.verification_status<>'verified'
    or not public.is_active_institution_admin_actor(p_actor_id,rec.institution_id)
    or not exists(select 1 from public.role_assignments where user_id=rec.account_user_id and institution_id=rec.institution_id and status='active')
    or not exists(select 1 from public.institution_memberships where user_id=rec.account_user_id and institution_id=rec.institution_id and status='active') then
    raise exception 'account unavailable';
  end if;
  insert into public.audit_events(actor_id,institution_id,action,target_type,target_id,metadata)
    values(p_actor_id,rec.institution_id,'institutional_password_recovery_issued','user',rec.account_user_id::text,
      jsonb_build_object('account_type',rec.account_type,'identity_verified_by_admin',true));
  return true;
end $$;

revoke all on function public.consume_institutional_lookup_limits(text[],integer,integer) from public,anon,authenticated;
grant execute on function public.consume_institutional_lookup_limits(text[],integer,integer) to service_role;
revoke all on function public.record_institutional_recovery_link_issued(uuid,uuid) from public,anon,authenticated;
grant execute on function public.record_institutional_recovery_link_issued(uuid,uuid) to service_role;
