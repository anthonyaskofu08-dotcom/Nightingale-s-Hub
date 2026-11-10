import type { LearningResource, Programme } from '../../data/models';

// UI-facing data boundary. A future approved backend adapter can implement this contract.
// This phase provides only an in-memory demonstration; no network requests are made.
export interface LearningRepository {
  listProgrammes(): Promise<Programme[]>;
  listResources(programmeId: string): Promise<LearningResource[]>;
  saveBookmark(resourceId: string): Promise<void>;
}
