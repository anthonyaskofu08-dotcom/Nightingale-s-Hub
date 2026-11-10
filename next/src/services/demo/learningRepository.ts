import { programmes, resources } from '../../data/demo/catalogue';
import type { LearningRepository } from '../repositories/learningRepository';

export const demoLearningRepository: LearningRepository = {
  async listProgrammes() { return programmes; },
  async listResources(programmeId) { return resources.filter((resource) => resource.programmeId === programmeId); },
  async saveBookmark() { /* Bookmark state is held in the local preview session only. */ },
};
