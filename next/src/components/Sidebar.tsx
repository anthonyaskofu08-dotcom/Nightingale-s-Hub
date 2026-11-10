import type { Portal, ScreenId } from '../data/models';

type Props = { portal: Portal; activeScreen: ScreenId; isOpen: boolean; mobile: boolean; onNavigate: (screen: ScreenId) => void; onClose: () => void; authenticated?: boolean; displayName?: string };
const navigation: Record<Portal, { label: string; items: [ScreenId, string][] }> = {
  student: { label: 'STUDENT LEARNING', items: [['overview', 'Overview'], ['catalogue', 'Nursing Catalogue'], ['saved', 'Saved Resources'], ['materials', 'My Study Materials'], ['workspace', 'Academic Workspace'], ['activity', 'Learning Activity'], ['profile', 'My Profile']] },
  lecturer: { label: 'TEACHING WORKSPACE', items: [['overview', 'Overview'], ['subjects', 'My Subjects'], ['resources', 'Learning Resources'], ['upload', 'Educational Materials'], ['students-activity', 'Student Activity'], ['profile', 'My Profile']] },
  admin: { label: 'INSTITUTION ADMIN', items: [['overview', 'Overview'], ['profile', 'Institution Profile'], ['programmes', 'Programmes'], ['students', 'Students'], ['lecturers', 'Lecturers'], ['records', 'Official Records'], ['invitations', 'Invitations'], ['codes', 'Access Codes'], ['academics', 'Academic Administration']] },
  global_admin: { label: 'PLATFORM GOVERNANCE', items: [['overview', 'Overview'], ['registrations', 'Institution Review'], ['catalogue-admin', 'Academic Catalogue'], ['recovery-cases', 'Exceptional Recovery Cases']] },
};

export function Sidebar({ portal, activeScreen, isOpen, mobile, onNavigate, onClose, authenticated = false, displayName }: Props) {
  const menu = navigation[portal];
  const sample = portal === 'student' ? { initials: 'AL', name: 'Alex Learner', role: 'Student · Demo' } : portal === 'lecturer' ? { initials: 'MK', name: 'Dr. Miriam Kilonzo', role: 'Lecturer · Demo' } : portal === 'admin' ? { initials: 'LA', name: 'Lakeview Admin', role: 'Institution Admin · Demo' } : { initials: 'GA', name: 'Platform Admin', role: 'Global Admin · Demo' };
  const name = authenticated ? displayName || 'My account' : sample.name;
  const profile = { initials: authenticated ? name.split(/\s+/).slice(0, 2).map((word) => word[0]).join('').toUpperCase() : sample.initials, name, role: authenticated ? ({ student: 'Student', lecturer: 'Lecturer or tutor', admin: 'Institution administrator', global_admin: 'Global administrator' } as const)[portal] : sample.role };
  return <>
    <aside className={`sidebar${isOpen ? ' open' : ''}`} aria-label={`${menu.label.toLowerCase()} navigation`} id="sidebar" aria-hidden={mobile && !isOpen} inert={mobile && !isOpen}>
      <div className="brand"><div className="logo" aria-hidden="true">✚</div><div className="brand-copy"><h2>Nightingale&apos;s Hub</h2><small>Learning with Ease.</small></div><button className="close-menu" type="button" aria-label="Close navigation" onClick={onClose}>×</button></div>
      <p className="nav-label">{menu.label}</p><nav aria-label="Portal pages">{menu.items.map(([id, label]) => <button type="button" key={id} className={`nav${activeScreen === id || (activeScreen === 'learning' && id === 'catalogue') ? ' active' : ''}`} aria-current={activeScreen === id || (activeScreen === 'learning' && id === 'catalogue') ? 'page' : undefined} onClick={() => { onNavigate(id); onClose(); }}><span className="nav-icon" aria-hidden="true">{iconFor(id)}</span>{label}</button>)}</nav>
      <div className="sidebar-bottom"><div className="profile"><div className="avatar">{profile.initials}</div><div className="profile-copy"><strong>{profile.name}</strong><small>{profile.role}</small></div></div></div>
    </aside>
    {mobile && <button className={`sidebar-backdrop${isOpen ? ' active' : ''}`} type="button" aria-label="Close navigation" tabIndex={isOpen ? 0 : -1} onClick={onClose}/>}
  </>;
}
function iconFor(id: ScreenId) { const icons: Partial<Record<ScreenId, string>> = { overview: '⌂', catalogue: '▤', saved: '☆', materials: '▧', workspace: '▦', activity: '◷', profile: '◉', subjects: '▧', resources: '▤', upload: '↑', 'students-activity': '◷', programmes: '▦', students: '♙', lecturers: '♧', codes: '⌑', academics: '▧' }; return icons[id] ?? '•'; }
