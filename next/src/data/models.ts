export type Portal = 'student' | 'lecturer' | 'admin' | 'global_admin';
export type StudentPathway = 'independent' | 'institutional';
export type ProgrammeId = 'diploma-nursing' | 'bscn';
export type ScreenId =
  | 'overview' | 'catalogue' | 'learning' | 'saved' | 'materials' | 'workspace' | 'activity' | 'profile'
  | 'subjects' | 'resources' | 'upload' | 'students-activity' | 'programmes' | 'students' | 'lecturers' | 'codes' | 'academics' | 'records' | 'invitations' | 'registrations' | 'catalogue-admin' | 'recovery-cases'
  | 'exams' | 'research' | 'case-studies' | 'pharmacology' | 'anatomy-lab' | 'ai-tutor' | 'progress' | 'notifications' | 'subscription' | 'publications' | 'shorts'
  | 'question-bank' | 'assessment-prep' | 'assignment-support' | 'teaching-history'
  | 'academic-years' | 'intakes' | 'institution-subscription' | 'institution-analytics' | 'announcements'
  | 'users' | 'institutions' | 'library-admin' | 'knowledge-engine' | 'resource-review' | 'moderation' | 'publications-admin' | 'shorts-admin' | 'platform-analytics' | 'audit-log' | 'announcements-admin' | 'support' | 'settings' | 'system-activity';

export interface LearningResource {
  id: string; title: string; kind: string; duration: string; description: string;
  discipline: string; programmeId: ProgrammeId; level: string; subject: string;
  topic: string; subtopic: string; status: 'Published' | 'Draft';
  visual?: 'anatomy' | 'pharmacology' | 'clinical';
}

export interface Programme { id: ProgrammeId; name: string; level: string; institution?: string }
export interface DemoNotice { title: string; body: string }
