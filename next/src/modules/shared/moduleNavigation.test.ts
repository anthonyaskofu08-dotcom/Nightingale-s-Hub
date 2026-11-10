import { describe, expect, it } from 'vitest';
import { navigation } from '../../components/Sidebar';
import type { ScreenId } from '../../data/models';
import { hasModuleWorkspace } from './ModuleWorkspace';

const existingScreens = new Set<ScreenId>([
  'overview', 'catalogue', 'learning', 'saved', 'materials', 'workspace', 'activity', 'profile',
  'subjects', 'resources', 'upload', 'students-activity', 'programmes', 'students', 'lecturers',
  'codes', 'academics', 'records', 'invitations', 'registrations', 'catalogue-admin', 'recovery-cases',
]);

describe('portal navigation', () => {
  it('maps every visible navigation item to an implemented screen or an explicit module skeleton', () => {
    const screens = Object.values(navigation).flatMap((portal) => portal.items.map(([screen]) => screen));
    const missing = screens.filter((screen) => !existingScreens.has(screen) && !hasModuleWorkspace(screen));
    expect(missing).toEqual([]);
  });

  it('keeps independent learning visible to students without requiring an institution', () => {
    const studentScreens = navigation.student.items.map(([screen]) => screen);
    expect(studentScreens).toContain('catalogue');
    expect(studentScreens).toContain('workspace');
    expect(studentScreens).toContain('subscription');
  });
});
