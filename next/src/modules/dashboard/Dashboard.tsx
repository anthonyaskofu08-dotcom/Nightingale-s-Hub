type DashboardProps = {
  onOpenTopic: (topic: string) => void;
  onOpenSubject: (subject: string) => void;
};

const subjects = [
  'Anatomy & Physiology',
  'Fundamentals of Nursing',
  'Pharmacology',
  'Medical-Surgical Nursing',
];

export default function Dashboard({ onOpenTopic, onOpenSubject }: DashboardProps) {
  return (
    <section id="dashboard" className="dashboard-page" aria-labelledby="welcome-heading">
      <p className="eyebrow">YOUR LEARNING SPACE</p>
      <h1 id="welcome-heading">Welcome to your learning centre.</h1>
      <p className="muted">Build your knowledge one topic at a time.</p>

      <div className="stats" aria-label="Sample learning statistics">
        <div className="stat">
          <small>Topics explored</small>
          <h2>12</h2>
        </div>
        <div className="stat">
          <small>Practice questions</small>
          <h2>86</h2>
        </div>
        <div className="stat">
          <small>Study time</small>
          <h2>8h 40m</h2>
        </div>
      </div>

      <div className="panel continue-panel">
        <p className="eyebrow">CONTINUE LEARNING</p>
        <h2>Heart Failure</h2>
        <p className="muted">Medical-Surgical Nursing</p>
        <p>Study the causes, clinical manifestations, management and nursing care of heart failure.</p>
        <button className="primary" type="button" onClick={() => onOpenTopic('Heart Failure')}>
          Continue learning <span aria-hidden="true">→</span>
        </button>
      </div>

      <h2 className="explore-heading">Explore your subjects</h2>
      <div className="subject-grid">
        {subjects.map((subject) => (
          <button className="subject" type="button" key={subject} onClick={() => onOpenSubject(subject)}>
            <span>{subject}</span>
            <span className="subject-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </section>
  );
}
