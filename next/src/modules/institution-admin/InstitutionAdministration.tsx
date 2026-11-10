import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import type { ScreenId } from '../../data/models';
import { Button, Card, Eyebrow } from '../../components/ui/Primitives';
import { getInstitutionAdminInstitutions, getInstitutionProfile, getInstitutionProgrammeData, manageInstitutionProgramme, saveInstitutionProfile } from '../../services/identity/auth';
import { requireSupabase } from '../../services/supabase/client';

type InstitutionChoice = { id: string; name: string };
export default function InstitutionAdministration({ screen, notify }: { screen: ScreenId; notify: (message: string) => void }) {
  const [institutions, setInstitutions] = useState<InstitutionChoice[]>([]); const [institutionId, setInstitutionId] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [profile, setProfile] = useState<{ id: string; name: string; institution_type: string; location: string; official_contact: string; status: string } | null>(null);
  const [programmes, setProgrammes] = useState<{ catalogue: { id: string; name: string }[]; offerings: { id: string; programme_id: string; status: string; programmes: { name: string }[] }[] }>({ catalogue: [], offerings: [] });
  const [levels, setLevels] = useState<{ id: string; name: string; sort_order: number; active: boolean }[]>([]);
  const [summary, setSummary] = useState({ students: 0, tutors: 0, programmes: 0 });

  useEffect(() => { void getInstitutionAdminInstitutions().then((items) => { setInstitutions(items); if (items.length === 1) setInstitutionId(items[0].id); }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Institution access could not be loaded.')); }, []);
  const reload = async () => {
    if (!institutionId) return;
    if (screen === 'profile' || screen === 'overview') setProfile(await getInstitutionProfile(institutionId));
    if (screen === 'programmes') setProgrammes(await getInstitutionProgrammeData(institutionId));
    if (screen === 'overview') {
      const client = requireSupabase();
      const [students, tutors, offerings] = await Promise.all([
        client.from('institutional_records').select('id',{ count:'exact',head:true }).eq('institution_id',institutionId).eq('account_type','student'),
        client.from('institutional_records').select('id',{ count:'exact',head:true }).eq('institution_id',institutionId).eq('account_type','tutor'),
        client.from('institution_programme_offerings').select('id',{ count:'exact',head:true }).eq('institution_id',institutionId).eq('status','active'),
      ]);
      if (students.error || tutors.error || offerings.error) throw new Error('Institution summary could not be loaded.');
      setSummary({ students:students.count ?? 0, tutors:tutors.count ?? 0, programmes:offerings.count ?? 0 });
    }
    if (screen === 'academics') { const { data, error: queryError } = await requireSupabase().from('learning_levels').select('id,name,sort_order,active').order('sort_order'); if (queryError) throw queryError; setLevels(data ?? []); }
  };
  useEffect(() => { void reload().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Institution information could not be loaded.')); }, [screen, institutionId]);
  const saveProfile = async (event: FormEvent) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); setBusy(true); setError(''); try { await saveInstitutionProfile({ institutionId, location: String(data.get('location')), officialContact: String(data.get('officialContact')) }); await reload(); notify('Institution profile updated and audited.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profile could not be saved.'); } finally { setBusy(false); } };
  const manageOffering = async (event: FormEvent) => { event.preventDefault(); const data = new FormData(event.currentTarget as HTMLFormElement); setBusy(true); setError(''); try { await manageInstitutionProgramme({ institutionId, action: 'add', programmeId: String(data.get('programmeId')) }); await reload(); (event.currentTarget as HTMLFormElement).reset(); notify('Programme offering added.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Programme offering could not be added.'); } finally { setBusy(false); } };
  const toggleOffering = async (offeringId: string, active: boolean) => { setBusy(true); setError(''); try { await manageInstitutionProgramme({ institutionId, offeringId, action: active ? 'deactivate' : 'activate' }); await reload(); notify(active ? 'Programme offering deactivated.' : 'Programme offering reactivated.'); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Programme offering could not be changed.'); } finally { setBusy(false); } };

  const title = screen === 'overview' ? 'Institution dashboard' : screen === 'profile' ? 'Institution profile' : screen === 'academics' ? 'Academic levels' : 'Programme offerings';
  return <><Eyebrow>INSTITUTION ADMINISTRATION</Eyebrow><h1>{title}</h1><p className="muted">Changes are scoped to an institution where you hold an active administrator role.</p><Card><label className="field-label">Institution<select value={institutionId} onChange={(e) => setInstitutionId(e.target.value)} required><option value="">Choose institution scope</option>{institutions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></Card>{error && <div className="identity-error" role="alert">{error}</div>}
    {screen === 'overview' && profile && <><Card className="welcome-card"><div><Eyebrow>APPROVED INSTITUTION · {profile.status.toUpperCase()}</Eyebrow><h2>{profile.name}</h2><p>{profile.location} · {profile.official_contact}</p></div><div className="programme-mark">Hub</div></Card><div className="stats"><div className="stat"><small>Student records</small><strong>{summary.students}</strong></div><div className="stat"><small>Tutor records</small><strong>{summary.tutors}</strong></div><div className="stat"><small>Active programme offerings</small><strong>{summary.programmes}</strong></div></div><Card>Manage institution-approved programmes, student and tutor records, invitations, account recovery and verified subject assignments from the navigation.</Card></>}
    {screen === 'profile' && profile && <Card><div className="section-heading"><div><h2>{profile.name}</h2><p className="muted">{profile.institution_type} · {profile.status}</p></div></div><form onSubmit={(e) => void saveProfile(e)}><Field name="location" label="Institution location" defaultValue={profile.location} required/><Field name="officialContact" label="Official contact email" defaultValue={profile.official_contact} required/><Button variant="primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save institution profile'}</Button></form><div className="callout">Institution name and verification status are controlled by the platform review process.</div></Card>}
    {screen === 'programmes' && <><Card><h2>Published platform programmes</h2><p>Choose the programmes your institution offers. Programme catalogue entries are maintained by global academic governance.</p><form onSubmit={(e) => void manageOffering(e)}><label className="field-label">Add programme<select name="programmeId" required><option value="">Choose active programme</option>{programmes.catalogue.filter((item) => !programmes.offerings.some((offering) => offering.programme_id === item.id && offering.status === 'active')).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><Button variant="primary" type="submit" disabled={busy || !institutionId || !programmes.catalogue.length}>{busy ? 'Saving…' : 'Add programme offering'}</Button></form></Card><Card><h2>Institution programme offerings</h2>{programmes.offerings.length === 0 ? <p className="muted">No programme offerings are configured yet.</p> : programmes.offerings.map((item) => <div className="list-row" key={item.id}><div><b>{item.programmes[0]?.name ?? 'Unavailable catalogue item'}</b><small>{item.status === 'active' ? 'Active' : 'Inactive'}</small></div><Button disabled={busy} onClick={() => void toggleOffering(item.id,item.status === 'active')}>{item.status === 'active' ? 'Deactivate' : 'Reactivate'}</Button></div>)}</Card></>}
    {screen === 'academics' && <Card><h2>Platform academic levels</h2><p>Academic levels are shared catalogue values maintained by global academic governance. They are not institution-specific curriculum rules.</p>{levels.filter((item) => item.active).length === 0 ? <p className="muted">No active academic levels are configured yet.</p> : levels.filter((item) => item.active).map((item) => <div className="list-row" key={item.id}><div><b>{item.name}</b><small>Display order {item.sort_order}</small></div></div>)}</Card>}
  </>;
}

function Field(p: { name: string; label: string; required?: boolean; defaultValue?: string }) { return <label className="field-label">{p.label}<input name={p.name} defaultValue={p.defaultValue} required={p.required}/></label>; }
