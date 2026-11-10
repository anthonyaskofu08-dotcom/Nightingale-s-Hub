import type { LearningResource, Programme } from '../models';

export const programmes: Programme[] = [
  { id: 'diploma-nursing', name: 'Diploma in Nursing', level: 'Diploma' },
  { id: 'bscn', name: 'Bachelor of Science in Nursing', level: 'BScN' },
];

// Fictitious preview catalogue. Resources are scoped to one programme and level.
export const resources: LearningResource[] = [
  { id: 'd1', title: 'Heart Failure: Nursing Care', kind: 'Study guide', duration: '12 min', description: 'Assessment priorities, manifestations and nursing care planning for heart failure.', discipline: 'Nursing', programmeId: 'diploma-nursing', level: 'Diploma', subject: 'Medical-Surgical Nursing', topic: 'Cardiovascular Conditions', subtopic: 'Heart Failure', status: 'Published', visual: 'clinical' },
  { id: 'd2', title: 'Fluid Balance Observation', kind: 'Clinical notes', duration: '8 min', description: 'A practical guide to recording intake, output and daily weight observations.', discipline: 'Nursing', programmeId: 'diploma-nursing', level: 'Diploma', subject: 'Fundamentals of Nursing', topic: 'Patient Monitoring', subtopic: 'Fluid Balance', status: 'Published' },
  { id: 'd3', title: 'Safe Medication Administration', kind: 'Revision notes', duration: '10 min', description: 'Medication checks and nursing responsibilities in routine administration.', discipline: 'Nursing', programmeId: 'diploma-nursing', level: 'Diploma', subject: 'Pharmacology', topic: 'Medication Safety', subtopic: 'Administration Checks', status: 'Published', visual: 'pharmacology' },
  { id: 'd4', title: 'Body Systems: An Introduction', kind: 'Illustrated overview', duration: '9 min', description: 'A demonstration overview of body systems for foundational nursing study.', discipline: 'Nursing', programmeId: 'diploma-nursing', level: 'Diploma', subject: 'Anatomy & Physiology', topic: 'Organisation of the Body', subtopic: 'Body Systems', status: 'Published', visual: 'anatomy' },
  { id: 'b1', title: 'Heart Failure: Evidence and Pathophysiology', kind: 'Seminar reading', duration: '18 min', description: 'Connect cardiac pathophysiology with evidence-informed assessment and care decisions.', discipline: 'Nursing', programmeId: 'bscn', level: 'BScN', subject: 'Medical-Surgical Nursing', topic: 'Cardiovascular Conditions', subtopic: 'Heart Failure', status: 'Published', visual: 'clinical' },
  { id: 'b2', title: 'Critical Appraisal of Clinical Evidence', kind: 'Reading', duration: '16 min', description: 'Consider study design, bias and the applicability of evidence to nursing practice.', discipline: 'Nursing', programmeId: 'bscn', level: 'BScN', subject: 'Research and Evidence-Based Practice', topic: 'Evidence Appraisal', subtopic: 'Appraisal Frameworks', status: 'Published' },
  { id: 'b3', title: 'Advanced Pharmacology: Diuretics', kind: 'Lecture notes', duration: '14 min', description: 'Review mechanisms, monitoring considerations and evidence in diuretic therapy.', discipline: 'Nursing', programmeId: 'bscn', level: 'BScN', subject: 'Pharmacology', topic: 'Cardiovascular Medicines', subtopic: 'Diuretics', status: 'Published', visual: 'pharmacology' },
  { id: 'b4', title: 'Cardiorespiratory Physiology', kind: 'Concept overview', duration: '15 min', description: 'A demonstration overview of the relationships between circulation and respiration.', discipline: 'Nursing', programmeId: 'bscn', level: 'BScN', subject: 'Anatomy & Physiology', topic: 'Integrated Body Systems', subtopic: 'Cardiorespiratory Physiology', status: 'Published', visual: 'anatomy' },
];

export const subjectsByProgramme: Record<string, string[]> = {
  'diploma-nursing': ['Fundamentals of Nursing', 'Medical-Surgical Nursing', 'Pharmacology', 'Anatomy & Physiology'],
  bscn: ['Medical-Surgical Nursing', 'Pharmacology', 'Anatomy & Physiology', 'Research and Evidence-Based Practice', 'Leadership in Nursing'],
};
