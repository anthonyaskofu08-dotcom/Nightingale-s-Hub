import { useState } from 'react';
import { resources, subjectsByProgramme, programmes } from '../../data/demo/catalogue';
import { illustrations, photos } from '../../data/demo/media';
import type { ProgrammeId, ScreenId } from '../../data/models';
import { Button, Card, DemoTag, EmptyState, Eyebrow } from '../../components/ui/Primitives';
import { MediaImage } from '../../components/ui/MediaImage';

type Props = { screen: ScreenId; programme: ProgrammeId; pathway: 'independent' | 'institutional'; bookmarks: string[]; selected: string; setProgramme: (id: ProgrammeId) => void; setScreen: (id: ScreenId) => void; openResource: (id: string) => void; toggleBookmark: (id: string) => void; notify: (message: string) => void; fileName: string; setFileName: (name: string) => void };

export default function StudentScreens(p: Props) {
  const [subjectFilter, setSubjectFilter] = useState('');
  const [topicFilter, setTopicFilter] = useState('');
  const [catalogueQuery, setCatalogueQuery] = useState('');
  const programme = programmes.find((item) => item.id === p.programme)!;
  const scopedResources = resources.filter((item) => item.programmeId === p.programme);
  const visibleResources = scopedResources.filter((item) => (!subjectFilter || item.subject === subjectFilter) && (!topicFilter || item.topic === topicFilter) && `${item.title} ${item.subject} ${item.topic} ${item.subtopic}`.toLowerCase().includes(catalogueQuery.toLowerCase()));
  const chosen = resources.find((item) => item.id === p.selected) ?? scopedResources[0];
  const heading = p.pathway === 'independent' ? 'your independent learning space' : 'your institution learning space';
  const pathLabel = p.pathway === 'independent' ? 'Independent Student' : 'Institutional Student';
  const photoFor = (visual?: 'anatomy' | 'pharmacology' | 'clinical') => visual === 'anatomy' ? photos.learning : visual === 'pharmacology' ? photos.assessment : photos.simulation;
  const resourceCard = (item: typeof resources[number]) => <Card className="resource-card" key={item.id}>
    <div className="resource-photo"><MediaImage asset={photoFor(item.visual)} sizes="(max-width: 700px) 100vw, 45vw"/><span>Photo: {photoFor(item.visual).creator} · Pexels</span></div>
    <div className="resource-topline"><span className="resource-type">{item.kind} · {item.duration}</span><DemoTag /></div>
    <h3>{item.title}</h3><p className="muted">{item.description}</p>
    <p className="crumb">{item.discipline} / {itemProgramme(item.programmeId)} / {item.level} / {item.subject} / {item.topic} / {item.subtopic}</p>
    <div className="button-row"><Button variant="primary" onClick={() => p.openResource(item.id)}>Open resource</Button><Button onClick={() => p.toggleBookmark(item.id)} aria-pressed={p.bookmarks.includes(item.id)}>{p.bookmarks.includes(item.id) ? '★ Saved' : '☆ Save'}</Button></div>
  </Card>;

  if (p.screen === 'overview') return <>
    <Eyebrow>STUDENT PORTAL · {pathLabel.toUpperCase()} · DEMO DATA</Eyebrow><h1>Welcome to {heading}.</h1><p className="muted">A focused place to explore nursing learning materials and keep track of your study.</p>
    <div className="stats"><Stat label="Topics explored" value="12" /><Stat label="Study resources" value={String(scopedResources.length)} /><Stat label="Study time" value="8h 40m" /></div>
    <Card className="welcome-card"><div><Eyebrow>YOUR CURRENT PROGRAMME</Eyebrow><h2>{programme.name}</h2><p>{programme.level} learning materials are shown in your catalogue. Content for other programmes is kept separate.</p><Button variant="primary" onClick={() => p.setScreen('catalogue')}>Browse {programme.level} catalogue →</Button></div><div className="programme-mark">{programme.level}</div></Card>
    {p.pathway === 'institutional' && <Card><Eyebrow>INSTITUTION CONTEXT · DEMO</Eyebrow><h3>Lakeview College of Nursing</h3><p className="muted">Institution details and enrolment shown here are sample data only.</p></Card>}
    <div className="section-heading"><div><Eyebrow>CONTINUE LEARNING</Eyebrow><h2>{scopedResources[0].topic}</h2><p className="muted">{scopedResources[0].subject} · {programme.level}</p></div><Button onClick={() => p.openResource(scopedResources[0].id)}>Continue →</Button></div>
    <div className="grid two">{scopedResources.slice(0, 2).map(resourceCard)}</div>
  </>;

  if (p.screen === 'catalogue') return <>
    <Eyebrow>LEARNING CENTRE · DEMO CATALOGUE</Eyebrow><h1>Nursing Catalogue</h1><p className="muted">Choose a programme, then browse its subjects, topics, subtopics and resources.</p>
    <div className="subject-photo-grid">{subjectsByProgramme[p.programme].map((subject) => { const photo = subject.includes('Anatomy') ? photos.learning : subject.includes('Pharmacology') ? photos.assessment : subject.includes('Medical-Surgical') ? photos.simulation : photos.bedside; return <button type="button" className={`subject-photo-card${subjectFilter === subject ? ' active' : ''}`} key={subject} onClick={() => { setSubjectFilter(subjectFilter === subject ? '' : subject); setTopicFilter(''); }} aria-pressed={subjectFilter === subject}><MediaImage asset={photo} sizes="(max-width: 600px) 90vw, 30vw"/><span className="subject-photo-shade"/><span className="subject-photo-label">{subject}<small>{programme.level} · Browse topics</small></span></button>; })}</div>
    <Card><label className="field-label" htmlFor="programme-select">Programme and academic level</label><select id="programme-select" value={p.programme} onChange={(e) => p.setProgramme(e.target.value as ProgrammeId)}>{programmes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.level}</option>)}</select><div className="hierarchy" aria-label="Academic hierarchy">Discipline <b>Nursing</b><span>›</span> Programme <b>{programme.name}</b><span>›</span> Academic level <b>{programme.level}</b></div></Card>
    <div className="section-heading"><div><Eyebrow>SUBJECTS · {programme.level.toUpperCase()}</Eyebrow><h2>Browse subjects and topics</h2></div><DemoTag>FICTITIOUS PREVIEW DATA</DemoTag></div>
    <div className="filter-bar"><label className="sr-only" htmlFor="catalogue-search">Search this programme catalogue</label><input id="catalogue-search" type="search" placeholder={`Search ${programme.level} resources`} value={catalogueQuery} onChange={(e) => setCatalogueQuery(e.target.value)}/><Button onClick={() => { setSubjectFilter(''); setTopicFilter(''); setCatalogueQuery(''); }}>Clear filters</Button></div>
    {subjectsByProgramme[p.programme].map((subject) => { const topics = Array.from(new Set(scopedResources.filter((r) => r.subject === subject).map((r) => r.topic))); return <Card key={subject} className={`subject-group${subjectFilter === subject ? ' selected' : ''}`}><button className="subject-select" aria-pressed={subjectFilter === subject} onClick={() => { setSubjectFilter(subjectFilter === subject ? '' : subject); setTopicFilter(''); }}><h3>{subject}</h3><span>{subjectFilter === subject ? 'Selected' : `${topics.length} topics`}</span></button>{subjectFilter === subject && <div className="topic-chips">{topics.length ? topics.map((topic) => <button className={`topic-chip${topicFilter === topic ? ' selected' : ''}`} aria-pressed={topicFilter === topic} key={topic} onClick={() => setTopicFilter(topicFilter === topic ? '' : topic)}>{topic}</button>) : <span className="muted">Topics are not populated in this preview.</span>}</div>}</Card>; })}
    {subjectFilter && <div className="section-heading"><div><Eyebrow>SUBTOPICS · {topicFilter || subjectFilter}</Eyebrow><h2>Choose a learning resource</h2></div></div>}
    {visibleResources.length ? <div className="grid two">{visibleResources.map(resourceCard)}</div> : <EmptyState title="No matching demo resources">Try another subject or clear the search filters.</EmptyState>}
  </>;

  if (p.screen === 'learning') return chosen ? <>
    <button className="text-button" onClick={() => p.setScreen('catalogue')}>← Back to catalogue</button><Eyebrow>LEARNING RESOURCE · {chosen.level.toUpperCase()} · DEMO</Eyebrow><h1>{chosen.title}</h1><p className="muted">{chosen.description}</p><div className="hierarchy">{chosen.discipline} › {itemProgramme(chosen.programmeId)} › {chosen.level} › {chosen.subject} › {chosen.topic} › {chosen.subtopic}</div>
    <Card className="lesson">
      <div className="resource-topline"><span className="resource-type">{chosen.kind} · {chosen.duration}</span><DemoTag /></div>
      <h2>{chosen.subtopic}</h2><p>This learning page is illustrative preview content. It is provided to demonstrate how a resource can be organised under the academic catalogue.</p>
      <div className="learning-visuals">
        <figure><img src={illustrations[chosen.visual ?? 'clinical'].src} alt={illustrations[chosen.visual ?? 'clinical'].alt} loading="lazy" decoding="async" width="720" height="420"/><figcaption>Illustrative preview only · not a clinical or medication reference.</figcaption></figure>
        <figure><MediaImage asset={photoFor(chosen.visual)} sizes="(max-width: 700px) 100vw, 40vw"/><figcaption>Photo: {photoFor(chosen.visual).creator} · Pexels</figcaption></figure>
      </div>
      <h3>Learning focus</h3><ul><li>Review the key concepts for this subtopic.</li><li>Connect assessment findings to nursing priorities.</li><li>Summarise the main points in your own study notes.</li></ul>
      <div className="callout">This sample is not an authoritative clinical reference. Reviewed educational content will be added in a later stage.</div>
      <div className="button-row"><Button variant="primary" onClick={() => p.notify('Marked complete in this preview session only.')}>Mark as studied</Button><Button onClick={() => p.toggleBookmark(chosen.id)}>{p.bookmarks.includes(chosen.id) ? '★ Saved resource' : '☆ Save resource'}</Button></div>
    </Card>
  </> : <EmptyState title="Resource unavailable">Select a resource from the catalogue.</EmptyState>;

  if (p.screen === 'saved') return <><Eyebrow>PERSONAL LIBRARY · DEMO</Eyebrow><h1>Saved Resources</h1><p className="muted">Bookmarks stay in this browser preview session only.</p>{p.bookmarks.length ? <div className="grid two">{resources.filter((r) => p.bookmarks.includes(r.id) && r.programmeId === p.programme).map(resourceCard)}</div> : <EmptyState title="No saved resources yet">Save a resource from your {programme.level} catalogue to find it here.</EmptyState>}</>;

  if (p.screen === 'materials' || p.screen === 'workspace') return <><Eyebrow>PERSONAL WORKSPACE · DEMO ONLY</Eyebrow><h1>{p.screen === 'materials' ? 'My Study Materials' : 'Academic Workspace'}</h1><p className="muted">Private study space preview. Files are not uploaded, stored or sent anywhere.</p><div className="grid two"><Card><Eyebrow>LOCAL FILE PICKER</Eyebrow><h2>Add a study material</h2><p className="muted">Choose a file to display its name in this session. No file transfer occurs.</p><label className="field-label" htmlFor="demo-file">Choose a file</label><input id="demo-file" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" onChange={(e) => p.setFileName(e.target.files?.[0]?.name ?? '')} /><div className="callout">{p.fileName ? `${p.fileName} selected locally. Not uploaded.` : 'Demo only · Local selection, no upload or persistence.'}</div></Card><Card><Eyebrow>MY MATERIALS</Eyebrow><h2>Study notes</h2>{p.fileName ? <div className="list-row"><span>▤ {p.fileName}</span><DemoTag>LOCAL ONLY</DemoTag></div> : <EmptyState title="Your workspace is ready">No demo materials selected yet.</EmptyState>}<Button className="top-gap" onClick={() => p.notify('Study notes editor is not available in this preview.')}>Create a study note</Button></Card></div></>;

  if (p.screen === 'activity') return <><Eyebrow>LEARNING ACTIVITY · SAMPLE DATA</Eyebrow><h1>Learning Activity & Progress</h1><p className="muted">Illustrative activity summaries. These are not saved learner records.</p><div className="stats"><Stat label="Topics explored" value="12" /><Stat label="Resources opened" value="24" /><Stat label="Study sessions" value="8" /></div><Card><h2>Recent activity</h2>{[['Today', 'Heart Failure: Nursing Care', 'Resource opened'], ['Yesterday', 'Fluid Balance Observation', 'Marked studied'], ['6 Nov', 'Medication Safety', 'Resource opened']].map((row) => <div className="activity-row" key={row[1]}><span className="activity-dot"/><div><b>{row[1]}</b><small>{row[0]} · {row[2]}</small></div><DemoTag /></div>)}</Card></>;

  return <><Eyebrow>ACCOUNT · DEMONSTRATION PROFILE</Eyebrow><h1>My Profile</h1><p className="muted">This profile is a static demonstration and has no account connection.</p><Card className="profile-card"><div className="avatar large">AL</div><div><h2>Alex Learner</h2><p className="muted">{pathLabel} · Demo account</p></div></Card><div className="grid two"><Card><h3>Learning pathway</h3><p><b>Programme:</b> {programme.name}</p><p><b>Academic level:</b> {programme.level}</p><p><b>Account type:</b> {pathLabel}</p></Card><Card><h3>Contact details</h3><p>alex.learner@example.test</p><Button onClick={() => p.notify('Profile editing is not connected in this demo.')}>Edit profile</Button></Card></div></>;
}

function itemProgramme(id: ProgrammeId) { return id === 'bscn' ? 'BScN' : 'Diploma in Nursing'; }
function Stat({ label, value }: { label: string; value: string }) { return <div className="stat"><small>{label}</small><strong>{value}</strong><DemoTag>DEMO</DemoTag></div>; }
