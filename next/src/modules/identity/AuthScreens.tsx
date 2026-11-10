import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, requireSupabase } from '../../services/supabase/client';
import { loginIndependent, loginInstitutional, redeemInstitutionalInvitation, registerIndependentStudent, requestPasswordRecovery, updateRecoveredPassword } from '../../services/identity/auth';
import { linkIndependentAccount, registerInstitutionApplicant } from '../../services/identity/auth';
import { Button } from '../../components/ui/Primitives';

type Props = { onSession: (session: Session) => void; onDemo: () => void };
type Choice = { id: string; name: string };
const styles = { page: 'identity-page', card: 'identity-card' };

export default function AuthScreens({ onSession, onDemo }: Props) {
  const [path, setPath] = useState(`${location.pathname}${location.search}`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [programmes, setProgrammes] = useState<Choice[]>([]);
  const [levels, setLevels] = useState<Choice[]>([]);
  const [institutions, setInstitutions] = useState<Choice[]>([]);
  const [token, setToken] = useState(new URLSearchParams(location.search).get('token') ?? '');

  useEffect(() => {
    const onPop = () => setPath(`${location.pathname}${location.search}`);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => { if (new URLSearchParams(location.search).has('token')) history.replaceState({}, '', '/invitation'); }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = requireSupabase();
    void Promise.all([
      client.from('programmes').select('id,name').eq('active', true).order('name'),
      client.from('learning_levels').select('id,name').eq('active', true).order('sort_order'),
      client.from('institutions').select('id,name').eq('status', 'published').order('name'),
    ]).then(([p, l, i]) => {
      if (p.data) setProgrammes(p.data);
      if (l.data) setLevels(l.data);
      if (i.data) setInstitutions(i.data);
    });
  }, []);

  const go = (to: string) => { history.pushState({}, '', to); setPath(to); setError(''); setMessage(''); };
  const submit = async (event: FormEvent, action: () => Promise<unknown>, success?: string) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await action();
      const session = (result as { session?: Session | null; data?: { session?: Session | null } })?.session ?? (result as { data?: { session?: Session | null } })?.data?.session;
      if (session) onSession(session);
      else setMessage(success ?? 'Request received. Check your email or follow the secure setup link.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'We could not complete that request. Please try again.'); }
    finally { setBusy(false); }
  };

  const route = path.split('?')[0];
  const query = new URLSearchParams(path.split('?')[1] ?? '');
  let body: ReactNode;
  if (route === '/register/independent') body = <RegistrationForm programmes={programmes} levels={levels} busy={busy} error={error} message={message} back={() => go('/')} submit={submit}/>;
  else if (route === '/login/institution') body = <InstitutionLogin institutions={institutions} busy={busy} error={error} message={message} back={() => go('/')} submit={submit}/>;
  else if (route === '/login') body = <Login busy={busy} error={error} message={message} back={() => go('/')} go={go} submit={submit}/>;
  else if (route === '/forgot-password') body = <ForgotPassword busy={busy} error={error} message={message} back={() => go('/login')} submit={submit}/>;
  else if (route === '/reset-password') body = <ResetPassword busy={busy} error={error} message={message} submit={submit}/>;
  else if (route === '/register/institution') body = <InstitutionRegistration back={() => go('/')} busy={busy} error={error} message={message} submit={submit}/>;
  else if (route === '/invitation') body = <Invitation token={token || query.get('token') || ''} setToken={setToken} busy={busy} error={error} message={message} submit={submit}/>;
  else body = <Welcome go={go} onDemo={onDemo}/>;

  return <main className={styles.page}><header className="identity-brand"><span className="identity-mark">✚</span><div><b>Nightingale&apos;s Hub</b><small>Learning with Ease.</small></div></header>{!isSupabaseConfigured && <div className="identity-notice"><b>Preview configuration</b><br/>Authentication is not connected in this environment. Configure the public Supabase URL and publishable key to enable account services.</div>}<div className={styles.card}>{body}</div><footer className="identity-footer">Secure account access · Student learning platform</footer></main>;
}

function Welcome({ go, onDemo }: { go: (to: string) => void; onDemo: () => void }) { return <><p className="identity-kicker">WELCOME</p><h1>Learning with Ease.</h1><p className="muted">A dedicated learning space for nursing students, tutors and institutions.</p><div className="identity-actions"><Button variant="primary" onClick={() => go('/login')}>Log in</Button><Button onClick={() => go('/register/independent')}>Create an independent account</Button></div><div className="identity-separator">Institutional account</div><Button onClick={() => go('/login/institution')}>Log in with ADM or Tutor ID</Button><p className="identity-small">Have an institution invitation? <a href="/invitation" onClick={(e) => { e.preventDefault(); go('/invitation'); }}>Set up your account</a></p><p className="identity-small">Represent an institution? <a href="/register/institution" onClick={(e) => { e.preventDefault(); go('/register/institution'); }}>Request institution registration</a></p><button className="identity-demo" type="button" onClick={onDemo}>Open the existing interactive demo</button></>; }

function RegistrationForm(p: { programmes: Choice[]; levels: Choice[]; busy: boolean; error: string; message: string; back: () => void; submit: Props['onDemo'] extends never ? never : (event: FormEvent, action: () => Promise<unknown>, success?: string) => void }) {
  return <><button className="text-button" onClick={p.back}>← Back</button><p className="identity-kicker">INDEPENDENT LEARNER</p><h1>Create your account</h1><p className="muted">No institution or admission number is needed.</p><form onSubmit={(e) => p.submit(e, async () => {
    const form = new FormData(e.currentTarget);
    return registerIndependentStudent({ name: String(form.get('name')), email: String(form.get('email')), password: String(form.get('password')), programmeId: String(form.get('programme')), learningLevelId: String(form.get('level')) });
  }, 'Check your email to verify your account. You can use the independent learner pathway without joining an institution.') }><Field name="name" label="Full name" autoComplete="name" required/><Field name="email" label="Email address" type="email" autoComplete="email" required/><Field name="password" label="Password" type="password" autoComplete="new-password" minLength={10} required/><Select name="programme" label="Programme" options={p.programmes} empty="No programmes are available yet"/><Select name="level" label="Academic level" options={p.levels} empty="No levels are available yet"/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy || !p.programmes.length || !p.levels.length}>{p.busy ? 'Creating account…' : 'Create account'}</Button></form></>;
}

function Login(p: { busy: boolean; error: string; message: string; back: () => void; go: (to: string) => void; submit: (event: FormEvent, action: () => Promise<unknown>) => void }) { return <><button className="text-button" onClick={p.back}>← Back</button><p className="identity-kicker">ACCOUNT ACCESS</p><h1>Log in</h1><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); return loginIndependent(String(f.get('email')), String(f.get('password'))); })}><Field name="email" label="Email address" type="email" autoComplete="username" required/><Field name="password" label="Password" type="password" autoComplete="current-password" required/><div className="identity-link-row"><a href="/forgot-password" onClick={(e) => { e.preventDefault(); p.go('/forgot-password'); }}>Forgot password?</a><a href="/login/institution" onClick={(e) => { e.preventDefault(); p.go('/login/institution'); }}>Institutional login</a></div><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy}>{p.busy ? 'Signing in…' : 'Log in'}</Button></form></>; }

function InstitutionLogin(p: { institutions: Choice[]; busy: boolean; error: string; message: string; back: () => void; submit: (event: FormEvent, action: () => Promise<unknown>) => void }) { return <><button className="text-button" onClick={p.back}>← Back</button><p className="identity-kicker">INSTITUTIONAL ACCESS</p><h1>Log in with your ID</h1><p className="muted">Choose your institution and use your Admission Number or Tutor ID.</p><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); return loginInstitutional({ institutionId: String(f.get('institution')), identifier: String(f.get('identifier')), accountType: String(f.get('type')) as 'student' | 'tutor', password: String(f.get('password')) }); })}><Select name="institution" label="Institution" options={p.institutions} empty="No published institutions are available"/><Select name="type" label="Account type" options={[{ id: 'student', name: 'Student · Admission Number' }, { id: 'tutor', name: 'Lecturer or tutor · Tutor ID' }]} empty=""/><Field name="identifier" label="Admission Number or Tutor ID" autoComplete="username" required/><Field name="password" label="Password" type="password" autoComplete="current-password" required/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy || !p.institutions.length}>{p.busy ? 'Signing in…' : 'Log in'}</Button></form><p className="identity-small">Need account recovery? Contact your institution administrator. They cannot see or set your password.</p></>; }

function Invitation(p: { token: string; setToken: (value: string) => void; busy: boolean; error: string; message: string; submit: (event: FormEvent, action: () => Promise<unknown>) => void }) { return <><p className="identity-kicker">INSTITUTION INVITATION</p><h1>Set up your account</h1><p className="muted">Your official name, institution, programme and account type come from the verified institution record. Use the identifier assigned to you.</p><div className="callout">Already have an independent Nightingale&apos;s Hub account? Log in first, then reopen this invitation while signed in to link your institutional record to your existing account and keep your learning history.</div><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); return redeemInstitutionalInvitation({ token: String(f.get('token')), identifier: String(f.get('identifier')), password: String(f.get('password')) }); })}><Field name="token" label="Invitation token" value={p.token} onChange={(e) => p.setToken(e.target.value)} required/><Field name="identifier" label="Admission Number or Tutor ID" required/><Field name="password" label="Create your password" type="password" minLength={10} autoComplete="new-password" required/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy}>{p.busy ? 'Verifying invitation…' : 'Verify and create account'}</Button></form></>; }

export function LinkInstitutionInvitation({ session, onLinked }: { session: Session; onLinked: () => void }) {
  const [identifier, setIdentifier] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [token] = useState(() => new URLSearchParams(location.search).get('token') ?? '');
  useEffect(() => { if (new URLSearchParams(location.search).has('token')) history.replaceState({}, '', '/invitation'); }, []);
  const submit = async (event: FormEvent) => { event.preventDefault(); setBusy(true); setError(''); try { await linkIndependentAccount({ token, identifier }); onLinked(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'This invitation cannot be linked to the current account.'); } finally { setBusy(false); } };
  return <main className="identity-page"><header className="identity-brand"><span className="identity-mark">✚</span><div><b>Nightingale&apos;s Hub</b><small>Learning with Ease.</small></div></header><div className="identity-card"><p className="identity-kicker">LINK YOUR EXISTING ACCOUNT</p><h1>Join your institution</h1><p className="muted">You are signed in as {session.user.email}. Link your verified institutional student record to this account to keep your learning history together.</p><form onSubmit={(e) => void submit(e)}><Field name="identifier" label="Institution-issued Admission Number" required value={identifier} onChange={(e) => setIdentifier(e.target.value)}/><Feedback error={error} message=""/><Button variant="primary" type="submit" disabled={busy || !token}>{busy ? 'Linking account…' : 'Verify invitation and link account'}</Button></form><p className="identity-small">The account must be confirmed through its existing email session. This process cannot move an identifier from another claimed account.</p></div></main>;
}

function ForgotPassword(p: { busy: boolean; error: string; message: string; back: () => void; submit: (event: FormEvent, action: () => Promise<unknown>, success?: string) => void }) { return <><button className="text-button" onClick={p.back}>← Back</button><h1>Reset your password</h1><p className="muted">We’ll send a secure reset link to your account email.</p><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); await requestPasswordRecovery(String(f.get('email'))); }, 'If an account uses that email, a secure recovery link is on its way.') }><Field name="email" label="Email address" type="email" autoComplete="email" required/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy}>{p.busy ? 'Sending…' : 'Send reset link'}</Button></form></>; }

function ResetPassword(p: { busy: boolean; error: string; message: string; submit: (event: FormEvent, action: () => Promise<unknown>, success?: string) => void }) { return <><p className="identity-kicker">ACCOUNT RECOVERY</p><h1>Choose a new password</h1><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); await updateRecoveredPassword(String(f.get('password'))); }, 'Your password has been updated. You can now log in.') }><Field name="password" label="New password" type="password" minLength={10} autoComplete="new-password" required/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy}>{p.busy ? 'Updating…' : 'Save new password'}</Button></form></>; }

function InstitutionRegistration(p: { back: () => void; busy: boolean; error: string; message: string; submit: (event: FormEvent, action: () => Promise<unknown>, success?: string) => void }) { return <><button className="text-button" onClick={p.back}>← Back</button><p className="identity-kicker">INSTITUTION ONBOARDING</p><h1>Request institution registration</h1><p className="muted">Submission creates a pending application only. It does not grant administrator privileges or approve the institution.</p><form onSubmit={(e) => p.submit(e, async () => { const f = new FormData(e.currentTarget); return registerInstitutionApplicant({ institutionName: String(f.get('institutionName')), institutionType: String(f.get('institutionType')), location: String(f.get('location')), officialContact: String(f.get('officialContact')), applicantName: String(f.get('applicantName')), email: String(f.get('email')), password: String(f.get('password')) }); }, 'Verify your email to submit the institution for review. No administrator role has been granted.') }><Field name="institutionName" label="Institution name" required/><Field name="institutionType" label="Institution type" required/><Field name="location" label="Location" required/><Field name="officialContact" label="Official institution contact email" type="email" required/><Field name="applicantName" label="Your full name" required/><Field name="email" label="Your email address" type="email" autoComplete="email" required/><Field name="password" label="Create a password" type="password" minLength={10} autoComplete="new-password" required/><Feedback error={p.error} message={p.message}/><Button variant="primary" type="submit" disabled={p.busy}>{p.busy ? 'Submitting…' : 'Submit for verification'}</Button></form></>; }

function Field(props: { name: string; label: string; type?: string; autoComplete?: string; minLength?: number; required?: boolean; value?: string; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void }) { return <label className="field-label">{props.label}<input name={props.name} type={props.type ?? 'text'} autoComplete={props.autoComplete} minLength={props.minLength} required={props.required} value={props.value} onChange={props.onChange}/></label>; }
function Select(p: { name: string; label: string; options: Choice[]; empty: string }) { return <label className="field-label">{p.label}<select name={p.name} required disabled={!p.options.length}><option value="">{p.empty || 'Choose one'}</option>{p.options.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>; }
function Feedback(p: { error: string; message: string }) { return <>{p.error && <div className="identity-error" role="alert">{p.error}</div>}{p.message && <div className="identity-success" role="status">{p.message}</div>}</>; }
