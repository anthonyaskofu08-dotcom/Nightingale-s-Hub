import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { HeroCarousel } from '../components/ui/HeroCarousel';
import StudentScreens from '../modules/student/StudentScreens';
import LecturerScreens from '../modules/lecturer/LecturerScreens';
import AdminScreens from '../modules/institution-admin/AdminScreens';
import { accessCodes as initialCodes, programmesDemo as initialProgrammes, students as initialStudents } from '../data/demo/records';
import type { Portal, ProgrammeId, ScreenId, StudentPathway } from '../data/models';
import type { Session } from '@supabase/supabase-js';
import AuthScreens from '../modules/identity/AuthScreens';
import { isSupabaseConfigured, requireSupabase } from '../services/supabase/client';
import { signOut } from '../services/identity/auth';
import InstitutionalRecords from '../modules/institution-admin/InstitutionalRecords';
import { LinkInstitutionInvitation } from '../modules/identity/AuthScreens';
import GlobalAdminScreens from '../modules/global-admin/GlobalAdminScreens';
import InstitutionAdministration from '../modules/institution-admin/InstitutionAdministration';
import StudentAccountScreens from '../modules/student/StudentAccountScreens';
import LecturerAccountScreens from '../modules/lecturer/LecturerAccountScreens';
import ModuleWorkspace, { hasModuleWorkspace } from '../modules/shared/ModuleWorkspace';

const portalForRole: Record<string, Portal> = { independent_student: 'student', institutional_student: 'student', tutor: 'lecturer', lecturer: 'lecturer', institution_admin: 'admin', global_admin: 'global_admin' };
const pathwayForRole: Record<string, StudentPathway> = { independent_student: 'independent', institutional_student: 'institutional' };

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!isSupabaseConfigured);
  const [roleReady, setRoleReady] = useState(false);
  const [demo, setDemo] = useState(false);
  const [portal, setPortal] = useState<Portal>('student');
  const [pathway, setPathway] = useState<StudentPathway>('independent');
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const client = requireSupabase();
    void client.auth.getSession().then(({ data }) => { setSession(data.session); setAccessError(''); setRoleReady(!data.session); setReady(true); });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setAccessError(''); setRoleReady(!nextSession); setReady(true); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setRoleReady(true); return; }
    let active = true;
    setRoleReady(false);
    const resolveAccess = async () => {
      if (session.user.user_metadata?.registration_path === 'independent_student') {
        await requireSupabase().functions.invoke('complete-independent-registration', { body: {} });
      } else if (session.user.user_metadata?.registration_path === 'institution_applicant') {
        await requireSupabase().functions.invoke('submit-institution-registration', { body: {} });
      }
      const { data, error } = await requireSupabase().from('role_assignments').select('role,status').eq('user_id', session.user.id).eq('status', 'active');
      if (!active) return;
      const roles = data?.map((item) => item.role) ?? [];
      const role = ['global_admin','institution_admin','institutional_student','tutor','lecturer','independent_student'].find((candidate) => roles.includes(candidate) && portalForRole[candidate]);
      if (role) { setPortal(portalForRole[role]); setPathway(pathwayForRole[role] ?? 'independent'); }
      else setAccessError(error ? 'Your account access could not be loaded. Please sign in again or contact support.' : 'Your account is awaiting activation. Contact your institution administrator for help.');
      setRoleReady(true);
    };
    void resolveAccess();
    return () => { active = false; };
  }, [session]);

  if (session && location.pathname === '/invitation') return <LinkInstitutionInvitation session={session} onLinked={() => location.replace('/')}/>;
  if (session && !roleReady && !accessError) return <main className="identity-page"><p>Loading your secure account permissions…</p></main>;
  if (session && !accessError) return <DemoApp key={`${portal}-${pathway}`} authenticated displayName={String(session.user.user_metadata?.display_name ?? session.user.email ?? 'My account')} onLogout={() => { void signOut(); }} initialPortal={portal} initialPathway={pathway}/>;
  if (demo) return <DemoApp onLogout={() => setDemo(false)} initialPortal="student" initialPathway="independent"/>;
  if (!ready) return <main className="identity-page"><p>Loading secure account session…</p></main>;
  if (session && accessError) return <main className="identity-page"><div className="identity-card"><h1>{session.user.user_metadata?.registration_path === 'institution_applicant' ? 'Application pending review' : 'Account access'}</h1><p>{session.user.user_metadata?.registration_path === 'institution_applicant' ? 'Your email-confirmed institution application is submitted for review. No institution administrator access is active until verification and approval.' : accessError}</p><button className="button" onClick={() => void signOut()}>Log out</button></div></main>;
  return <AuthScreens onSession={(nextSession) => setSession(nextSession)} onDemo={() => setDemo(true)}/>;
}

const labels: Record<ScreenId, string> = {
  overview: 'Overview', catalogue: 'Nursing Catalogue', learning: 'Learning Resource', saved: 'Saved Resources', materials: 'My Study Materials', workspace: 'Academic Workspace', activity: 'Learning Activity & Progress', profile: 'Profile',
  subjects: 'My Subjects', resources: 'Learning Resources', upload: 'Educational Materials', 'students-activity': 'Student Activity', programmes: 'Programme Management', students: 'Student Management', lecturers: 'Lecturer Management', codes: 'Access Codes', academics: 'Academic Administration', records: 'Official Records', invitations: 'Invitations', registrations: 'Institution Review', 'catalogue-admin': 'Academic Catalogue', 'recovery-cases': 'Exceptional Recovery Cases',
  exams: 'Examination Centre', research: 'Assignment Research Centre', 'case-studies': 'Clinical Case Studies', pharmacology: 'Pharmacology Centre', 'anatomy-lab': 'Anatomy and Physiology Lab', 'ai-tutor': 'AI Nursing Tutor', progress: 'Student Progress Centre', notifications: 'Notifications', subscription: 'Subscription and Access', publications: 'Nightingale Publications', shorts: 'Nightingale Shorts',
  'question-bank': 'Question Bank Management', 'assessment-prep': 'Examination Preparation', 'assignment-support': 'Assignment Support', 'teaching-history': 'Teaching Activity History',
  'academic-years': 'Academic Years', intakes: 'Intakes and Cohorts', 'institution-subscription': 'Institution Subscription', 'institution-analytics': 'Institution Analytics', announcements: 'Institution Announcements',
  users: 'Platform User Management', institutions: 'Institution Management', 'library-admin': 'Global Academic Library', 'knowledge-engine': 'Knowledge Engine', 'resource-review': 'Resource Approval Queue', moderation: 'Content Moderation', 'publications-admin': 'Nightingale Publications Administration', 'shorts-admin': 'Nightingale Shorts Administration', 'platform-analytics': 'Platform Analytics', 'audit-log': 'Audit Log', 'announcements-admin': 'Platform Announcements', support: 'Support and Exceptional Cases', settings: 'System Configuration', 'system-activity': 'Administrator Activity History',
};

function DemoApp({ authenticated = false, displayName, onLogout, initialPortal, initialPathway }: { authenticated?: boolean; displayName?: string; onLogout: () => void; initialPortal: Portal; initialPathway: StudentPathway }) {
  const [portal, setPortal] = useState<Portal>(initialPortal);
  const [pathway, setPathway] = useState<StudentPathway>(initialPathway);
  const [screen, setScreen] = useState<ScreenId>('overview');
  const [mobile, setMobile] = useState(() => window.matchMedia('(max-width: 820px)').matches);
  const [menuOpen, setMenuOpen] = useState(false);
  const [programme, setProgramme] = useState<ProgrammeId>('diploma-nursing');
  const [selected, setSelected] = useState('d1');
  const [bookmarks, setBookmarks] = useState<string[]>(['d2']);
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState('');
  const [demoStudents, setDemoStudents] = useState(initialStudents);
  const [demoProgrammes, setDemoProgrammes] = useState(initialProgrammes);
  const [demoCodes, setDemoCodes] = useState(initialCodes);
  const titleRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onResize = () => { const next = window.matchMedia('(max-width: 820px)').matches; setMobile(next); if (!next) setMenuOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButtonRef.current?.focus(); } };
    window.addEventListener('resize', onResize);
    document.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

  useEffect(() => {
    document.body.classList.toggle('menu-open', menuOpen && mobile);
    if (menuOpen && mobile) document.querySelector<HTMLButtonElement>('.close-menu')?.focus();
    return () => document.body.classList.remove('menu-open');
  }, [menuOpen, mobile]);

  const notify = (message: string) => setToast(message);
  const navigate = (next: ScreenId) => { setScreen(next); titleRef.current?.focus(); };
  const changePortal = (next: Portal) => {
    setPortal(next);
    setScreen('overview');
  };
  const toggleBookmark = (id: string) => {
    setBookmarks((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
    notify(bookmarks.includes(id) ? 'Removed from saved resources in this preview.' : 'Saved for this preview session.');
  };

  return <div className="app-shell">
    <Sidebar portal={portal} activeScreen={screen} isOpen={menuOpen} mobile={mobile} onNavigate={navigate} onClose={() => setMenuOpen(false)} authenticated={authenticated} displayName={displayName}/>
    <main className="main-content" inert={mobile && menuOpen}>
      <Topbar portal={portal} pathway={pathway} title={labels[screen]} titleRef={titleRef} menuOpen={menuOpen} menuButtonRef={menuButtonRef} onMenuToggle={() => setMenuOpen((value) => !value)} onPortalChange={changePortal} onPathwayChange={setPathway} demoMode={!authenticated} onLogout={onLogout}/>
      <div className="content">
        <div className="preview-banner"><span className="preview-dot"/><div><b>{authenticated ? 'Account access is connected' : 'Interactive frontend demonstration'}</b><small>{authenticated ? 'Learning content and most workspace actions remain sample data and are not persisted.' : 'Sample records and local-only actions · No account, database or file storage is connected'}</small></div></div>
        {screen === 'overview' && <HeroCarousel />}
        {hasModuleWorkspace(screen) && <ModuleWorkspace screen={screen} onNavigate={navigate}/>}
        {!hasModuleWorkspace(screen) && portal === 'student' && authenticated && ['overview','workspace','profile','activity'].includes(screen) && <StudentAccountScreens screen={screen} pathway={pathway} displayName={displayName ?? 'Student'} notify={notify}/>}
        {!hasModuleWorkspace(screen) && portal === 'student' && (!authenticated || !['overview','workspace','profile','activity'].includes(screen)) && <StudentScreens screen={screen} programme={programme} pathway={pathway} bookmarks={bookmarks} selected={selected} setProgramme={setProgramme} setScreen={navigate} openResource={(id) => { setSelected(id); navigate('learning'); }} toggleBookmark={toggleBookmark} notify={notify} fileName={fileName} setFileName={setFileName}/>}
        {!hasModuleWorkspace(screen) && portal === 'lecturer' && (!authenticated || !['overview','subjects','students-activity','profile','resources','upload'].includes(screen)) && <LecturerScreens screen={screen} notify={notify} fileName={fileName} setFileName={setFileName}/>}
        {!hasModuleWorkspace(screen) && portal === 'lecturer' && authenticated && ['overview','subjects','students-activity','profile','resources','upload'].includes(screen) && <LecturerAccountScreens screen={screen} displayName={displayName ?? 'Tutor'} notify={notify}/>}
        {!hasModuleWorkspace(screen) && portal === 'admin' && ['records','invitations','students','lecturers'].includes(screen) && <InstitutionalRecords mode={screen as 'records' | 'invitations' | 'students' | 'lecturers'} notify={notify}/>}
        {!hasModuleWorkspace(screen) && portal === 'admin' && ['overview','profile','programmes','academics'].includes(screen) && <InstitutionAdministration screen={screen} notify={notify}/>}
        {!hasModuleWorkspace(screen) && portal === 'global_admin' && <GlobalAdminScreens screen={screen} notify={notify}/>}
        {!hasModuleWorkspace(screen) && portal === 'admin' && (!authenticated || !['overview','profile','programmes','students','lecturers','academics','records','invitations'].includes(screen)) && <AdminScreens screen={screen} notify={notify} programmes={demoProgrammes} addProgramme={(name) => setDemoProgrammes((items) => [...items, { name, award: 'Unspecified demo award', learners: '0', status: 'Demo draft' }])} students={demoStudents} addStudent={(name) => setDemoStudents((items) => [...items, { name, id: `DEMO-${items.length + 1}`, programme: 'Not assigned', level: 'Unassigned', status: 'Demo only' }])} codes={demoCodes} addCode={() => setDemoCodes((items) => [...items, { code: `PREVIEW-${String(items.length + 1).padStart(2, '0')}`, programme: 'Unassigned demo programme', places: '0 / 0', expiry: 'Not set', status: 'Not valid' }])} revokeCode={(code) => { setDemoCodes((items) => items.map((item) => item.code === code ? { ...item, status: 'Revoked locally · demo' } : item)); notify('Code marked revoked in this preview only; it was never a valid access code.'); }}/>}
      </div>
    </main>
    {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
  </div>;
}
