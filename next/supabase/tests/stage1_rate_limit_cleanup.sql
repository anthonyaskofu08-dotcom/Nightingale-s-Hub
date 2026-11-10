-- Staging-only regression test for cleanup_expired_stage1_rate_limits().
-- Run after all Stage 1 migrations as a database owner. The transaction rolls
-- back all fixtures and deletions. Do not remove BEGIN/ROLLBACK.
begin;

insert into public.auth_rate_limit_buckets(bucket_hash,failure_count,window_started_at,lock_level,locked_until,updated_at) values
  (repeat('a',63)||'1',8,now()-interval '2 days',1,null,now()-interval '2 days'),
  (repeat('b',63)||'2',7,now()-interval '2 minutes',0,null,now()-interval '2 minutes'),
  (repeat('c',63)||'3',8,now()-interval '2 hours',2,now()+interval '1 hour',now()-interval '2 hours'),
  (repeat('d',63)||'4',8,now()-interval '2 days',2,now()-interval '1 day',now()-interval '2 days')
on conflict(bucket_hash) do update set failure_count=excluded.failure_count,window_started_at=excluded.window_started_at,
  lock_level=excluded.lock_level,locked_until=excluded.locked_until,updated_at=excluded.updated_at;

insert into public.auth_request_limits(bucket_hash,request_count,window_started_at,updated_at) values
  (repeat('e',63)||'5',30,now()-interval '2 hours',now()-interval '2 hours'),
  (repeat('f',63)||'6',1,now()-interval '30 seconds',now()-interval '30 seconds')
on conflict(bucket_hash) do update set request_count=excluded.request_count,window_started_at=excluded.window_started_at,updated_at=excluded.updated_at;

select public.cleanup_expired_stage1_rate_limits();

do $$
begin
  if exists(select 1 from public.auth_rate_limit_buckets where bucket_hash in (repeat('a',63)||'1',repeat('d',63)||'4')) then
    raise exception 'expired failure buckets were not removed';
  end if;
  if not exists(select 1 from public.auth_rate_limit_buckets where bucket_hash=repeat('b',63)||'2') then
    raise exception 'active failure window was removed';
  end if;
  if not exists(select 1 from public.auth_rate_limit_buckets where bucket_hash=repeat('c',63)||'3') then
    raise exception 'active lockout was removed';
  end if;
  if exists(select 1 from public.auth_request_limits where bucket_hash=repeat('e',63)||'5') then
    raise exception 'expired lookup window was not removed';
  end if;
  if not exists(select 1 from public.auth_request_limits where bucket_hash=repeat('f',63)||'6') then
    raise exception 'active lookup window was removed';
  end if;
end $$;

rollback;
