import { describe, expect, it } from 'vitest';

const migrationFiles = import.meta.glob('../../../supabase/migrations/*.sql', { query: '?raw', eager: true, import: 'default' }) as Record<string, string>;
const migration = Object.entries(migrationFiles).find(([path]) => path.endsWith('202611120001_stage1_recovery_linking_and_rate_cleanup.sql'))?.[1] ?? '';
const hardening = Object.entries(migrationFiles).find(([path]) => path.endsWith('202611100001_stage1_hardening.sql'))?.[1] ?? '';
function functionSource(source: string, name: string) {
  const start = source.indexOf(`create or replace function public.${name}(`);
  if (start < 0) throw new Error(`Missing SQL function ${name}`);
  const end = source.indexOf('$$;', start);
  if (end < 0) throw new Error(`Could not find end of SQL function ${name}`);
  return source.slice(start, end + 3).toLowerCase();
}

describe('Stage 1 SQL security contracts (source-level)', () => {
  const link = functionSource(migration, 'link_existing_student_account');

  it('allows only an authenticated active independent student to link', () => {
    expect(link).toContain('auth.uid() is null or p_actor_id<>auth.uid()');
    expect(link).toContain("role='independent_student' and institution_id is null and status='active'");
    expect(link).toContain("status='published'");
  });

  it.each(['suspended', 'ended'])('preserves a %s membership instead of reactivating it', (state) => {
    expect(link).toContain("membership_status<>'active'");
    expect(link).toContain('institution membership is suspended or ended');
    expect(link).not.toContain(`set status = '${state}'`);
  });

  it.each(['suspended', 'revoked'])('rejects a %s institution role', (state) => {
    expect(link).toContain("existing_role.status<>'active'");
    expect(link).toContain('institutional student role is suspended or revoked');
    expect(link).not.toContain(`set status = '${state}'`);
  });

  it('rejects already-linked records and leaves role conflicts inactive', () => {
    expect(link).toContain('where account_user_id=p_actor_id');
    expect(link).toContain('rec.account_user_id is not null');
    expect(link).toContain('on conflict do nothing');
    expect(link).toContain('if not found or existing_role.status<>\'active\' then raise exception');
  });

  it('records recovery request, issuance, failure, and exceptional review separately', () => {
    const create = functionSource(migration, 'create_institutional_recovery_request');
    const complete = functionSource(migration, 'complete_institutional_recovery_request');
    const exceptional = functionSource(migration, 'finalize_institutional_recovery');
    expect(create).toContain('institutional_recovery_requested');
    expect(complete).toContain("p_outcome='issued'");
    expect(complete).toContain("p_outcome not in ('issued','failed')");
    expect(complete).toContain("next_status := 'failed'");
    expect(complete).toContain('institutional_password_recovery_failed');
    expect(exceptional).toContain("p_action='escalate'");
    expect(exceptional).toContain("p_action='close'");
    expect(exceptional).not.toContain("p_action='approve'");
  });

  it('limits cleanup to expired failure windows and expired lockouts', () => {
    const cleanup = functionSource(migration, 'prune_auth_rate_limits');
    const combined = functionSource(migration, 'cleanup_expired_stage1_rate_limits');
    expect(cleanup).toContain("window_started_at<now()-interval '15 minutes'");
    expect(cleanup).toContain('locked_until is null or locked_until<=now()');
    expect(combined).toContain("window_started_at<now()-interval '1 hour'");
    expect(combined).toContain("updated_at<now()-interval '1 hour'");
    expect(hardening).toContain('create table if not exists public.auth_rate_limit_buckets');
    expect(migration).toContain('grant execute on function public.cleanup_expired_stage1_rate_limits() to service_role');
  });
});
