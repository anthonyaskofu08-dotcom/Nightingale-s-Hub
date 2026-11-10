export interface MediaAsset {
  src: string;
  alt: string;
  creator: string;
  sourceUrl: string;
  license: string;
  futureStorageKey: string;
}

// Central media manifest: replace src with an authorised Storage URL in a later backend phase.
export const photos = {
  simulation: {
    src: '/images/nursing-students-training.jpg',
    alt: 'Nursing students in blue scrubs practicing patient care with a training mannequin in a simulation lab.',
    creator: 'Sahil Singh',
    sourceUrl: 'https://www.pexels.com/photo/nursing-students-practicing-patient-care-35645504/',
    license: 'Pexels License',
    futureStorageKey: 'demo/hero/nursing-students-training.jpg',
  },
  bedside: {
    src: '/images/nurse-patient-care.jpg',
    alt: 'A nurse in teal scrubs assisting a patient in a bright hospital room.',
    creator: 'Wellington Tavares',
    sourceUrl: 'https://www.pexels.com/photo/nurse-assisting-patient-in-hospital-corridor-33932453/',
    license: 'Pexels License',
    futureStorageKey: 'demo/hero/nurse-patient-care.jpg',
  },
  assessment: {
    src: '/images/nurse-clinical-assessment.jpg',
    alt: 'A nurse in blue scrubs measuring a patient’s blood pressure during a clinical assessment.',
    creator: 'RDNE Stock project',
    sourceUrl: 'https://www.pexels.com/photo/nurse-measuring-the-blood-pressure-of-a-patient-6129676/',
    license: 'Pexels License',
    futureStorageKey: 'demo/hero/nurse-clinical-assessment.jpg',
  },
  learning: {
    src: '/images/nursing-students-lab.jpg',
    alt: 'A nursing student holding a nursing textbook in a clinical education laboratory.',
    creator: 'Yusuf Çelik',
    sourceUrl: 'https://www.pexels.com/photo/aspiring-nurse-students-in-laboratory-setting-32213307/',
    license: 'Pexels License',
    futureStorageKey: 'demo/subjects/nursing-students-lab.jpg',
  },
} satisfies Record<string, MediaAsset>;

export const illustrations = {
  anatomy: { src: '/illustrations/anatomy-overview.svg', alt: 'Simplified decorative torso and organ shapes; not an anatomical reference.', futureStorageKey: 'demo/illustrations/anatomy-overview.svg' },
  pharmacology: { src: '/illustrations/pharmacology-overview.svg', alt: 'Decorative capsule and molecule shapes; not medication guidance.', futureStorageKey: 'demo/illustrations/pharmacology-overview.svg' },
  clinical: { src: '/illustrations/clinical-learning.svg', alt: 'Decorative clinical observation card with a heart rhythm motif; not a diagnostic tracing.', futureStorageKey: 'demo/illustrations/clinical-learning.svg' },
} as const;

export const heroSlides = [
  { image: photos.simulation, eyebrow: 'LEARN BY PRACTICE', title: 'Build confidence through guided learning.', body: 'Explore nursing topics, revisit key ideas and keep your study organised.', label: 'Clinical skills simulation' },
  { image: photos.bedside, eyebrow: 'CARE WITH PURPOSE', title: 'Connect knowledge with compassionate care.', body: 'Follow learning resources from core concepts through clinical context.', label: 'Nursing in practice' },
  { image: photos.assessment, eyebrow: 'GROW YOUR PRACTICE', title: 'Strengthen your clinical learning journey.', body: 'Use the catalogue and learning workspace to study at your own pace.', label: 'Clinical assessment' },
  { image: photos.learning, eyebrow: 'LEARNING TOGETHER', title: 'Make every study session count.', body: 'Explore structured nursing learning built around your programme and level.', label: 'Nursing education' },
];
