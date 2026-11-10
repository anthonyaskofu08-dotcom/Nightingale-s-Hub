import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('APP_ORIGIN') ?? 'null',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
export function respond(body: unknown, status = 200, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...extraHeaders } });
}
export function preflight(request: Request) {
  const origin = request.headers.get('origin'); const allowed = Deno.env.get('APP_ORIGIN');
  if (origin && (!allowed || origin !== allowed)) return respond({ error: 'This application origin is not configured.' }, 403);
  return request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null;
}
export function serviceClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}
export function userClient(request: Request): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: request.headers.get('Authorization') ?? '' } }, auth: { persistSession: false } });
}
export function randomToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}
export async function hashToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, '0')).join('');
}
export async function readJson(request: Request, maxBytes = 1024 * 1024): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new Error('payload too large');
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error('payload too large');
  const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('invalid request');
  return parsed as Record<string, unknown>;
}
export function trustedClientIp(request: Request): string | null {
  // Configure the Supabase/API gateway to overwrite these headers; never trust a
  // browser supplied forwarding header without that proxy guarantee.
  const cloudflare = request.headers.get('cf-connecting-ip')?.trim();
  const forwarded = request.headers.get('x-forwarded-for')?.split(',').map((value) => value.trim()).filter(Boolean).at(-1);
  const candidate = cloudflare || forwarded || '';
  return candidate.length <= 64 && /^[0-9a-fA-F:.]+$/.test(candidate) ? candidate.toLowerCase() : null;
}
export async function rateLimitKeys(parts: string[]) {
  return Promise.all(parts.map((part) => hashToken(part)));
}
export async function checkRateLimit(admin: SupabaseClient, bucketHashes: string[]) {
  const { data, error } = await admin.rpc('check_auth_rate_limits', { p_bucket_hashes: bucketHashes });
  if (error || !data) throw new Error('rate limit check unavailable');
  return data as { blocked: boolean; retryAt: string | null };
}
export async function recordRateLimitFailure(admin: SupabaseClient, bucketHashes: string[]) {
  const { error } = await admin.rpc('record_auth_failures', { p_bucket_hashes: bucketHashes });
  if (error) throw new Error('rate limit update unavailable');
}
export async function clearIdentifierRateLimit(admin: SupabaseClient, identifierHash: string) {
  const { error } = await admin.rpc('record_auth_success', { p_identifier_bucket_hash: identifierHash });
  if (error) throw new Error('rate limit update unavailable');
}
export async function consumeLookupLimit(admin: SupabaseClient, bucketHashes: string[]) {
  const { data, error } = await admin.rpc('consume_institutional_lookup_limits', { p_bucket_hashes: bucketHashes, p_max: 30, p_window_seconds: 60 });
  if (error) throw new Error('lookup rate limit unavailable');
  return data === true;
}
export async function requireAdmin(request: Request, institutionId?: string) {
  const user = userClient(request);
  const { data: auth, error: authError } = await user.auth.getUser();
  if (authError || !auth.user) throw new Error('unauthorized');
  const admin = serviceClient();
  const roles = await admin.from('role_assignments').select('institution_id').eq('user_id', auth.user.id).eq('role', 'institution_admin').eq('status', 'active');
  if (roles.error) throw new Error('authorization check failed');
  const scopes = (roles.data ?? []).map((row) => row.institution_id as string);
  const memberships = scopes.length ? await admin.from('institution_memberships').select('institution_id').eq('user_id', auth.user.id).eq('status', 'active').in('institution_id', scopes) : { data: [] as { institution_id: string }[], error: null };
  if (memberships.error) throw new Error('authorization check failed');
  const allowed = (memberships.data ?? []).map((row) => row.institution_id);
  const selected = institutionId ?? (allowed.length === 1 ? allowed[0] : undefined);
  if (!selected || !allowed.includes(selected)) throw new Error('institution scope required');
  const institution = await admin.from('institutions').select('status').eq('id', selected).maybeSingle();
  if (institution.error) throw new Error('authorization check failed');
  if (!institution.data || !['approved', 'published'].includes(institution.data.status)) throw new Error('institution scope required');
  return { admin, user, actorId: auth.user.id, institutionId: selected };
}
export function normalizeIdentifier(value: unknown) { return String(value ?? '').normalize('NFKC').trim().replace(/[\s-]+/g, '').toLocaleLowerCase('en'); }
export function publicError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'unauthorized') return respond({ error: 'Sign in to continue.' }, 401);
  if (message === 'institution scope required') return respond({ error: 'Institution access could not be verified for this request.' }, 403);
  if (message === 'authorization check failed') return respond({ error: 'Institution access could not be verified for this request.' }, 403);
  return respond({ error: 'The request could not be completed. Check the account details or contact your institution administrator.' }, 400);
}

export async function provisioningRecord(admin: SupabaseClient, institutionId: string, accountType: 'student' | 'tutor', identifier: string) {
  return admin.from('institutional_records').select('*').eq('institution_id', institutionId).eq('account_type', accountType).eq('normalized_identifier', normalizeIdentifier(identifier)).maybeSingle();
}

export function syntheticEmail(id: string) { return `${id.replaceAll('-', '')}@identity.nightingales.invalid`; }
