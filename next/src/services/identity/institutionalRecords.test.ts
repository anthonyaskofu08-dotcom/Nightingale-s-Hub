import { describe, expect, it } from 'vitest';
import { parseInstitutionRegister } from './institutionalRecords';

function csvFile(contents: string, name = 'register.csv') {
  return new File([contents], name, { type: 'text/csv' });
}

describe('institution register parsing', () => {
  it('maps supported CSV headers and preserves quoted commas', async () => {
    const rows = await parseInstitutionRegister(csvFile('Full Name,Admission Number,Programme,Academic Level,Year of Study\n"Amina, Wanjiku",ADM-17,Diploma in Nursing,Year 2,2'), 'student');
    expect(rows).toEqual([{ accountType: 'student', fullName: 'Amina, Wanjiku', identifier: 'ADM-17', programme: 'Diploma in Nursing', academicLevel: 'Year 2', yearOfStudy: '2' }]);
  });

  it('rejects a row with a missing institutional identifier', async () => {
    await expect(parseInstitutionRegister(csvFile('Full Name,Admission Number\nAmina,'), 'student')).rejects.toThrow(/name and an ADM number or Tutor ID/i);
  });

  it('rejects duplicate identifiers in a single file', async () => {
    await expect(parseInstitutionRegister(csvFile('Name,ADM\nAmina,ADM-1\nBrian,adm-1'), 'student')).rejects.toThrow(/duplicate identifier/i);
  });

  it('normalizes spacing, hyphens and compatibility characters when checking duplicates', async () => {
    await expect(parseInstitutionRegister(csvFile('Name,ADM\nAmina,ADM-12\nBrian,ＡＤＭ １２'), 'student')).rejects.toThrow(/duplicate identifier/i);
  });

  it('does not claim that PDF registers were processed', async () => {
    await expect(parseInstitutionRegister(csvFile('not a spreadsheet', 'register.pdf'), 'student')).rejects.toThrow(/PDF and scanned-register extraction is not enabled/i);
  });
});
