export type ImportedInstitutionRecord = {
  accountType: 'student' | 'tutor';
  fullName: string;
  identifier: string;
  programme?: string;
  academicLevel?: string;
  yearOfStudy?: string;
  subjects?: string;
};

const aliases: Record<string, keyof ImportedInstitutionRecord> = {
  name: 'fullName', fullname: 'fullName', 'full name': 'fullName', studentname: 'fullName', tutorname: 'fullName',
  adm: 'identifier', admissionnumber: 'identifier', 'admission number': 'identifier', tutorid: 'identifier', 'tutor id': 'identifier', staffid: 'identifier',
  programme: 'programme', program: 'programme', level: 'academicLevel', academiclevel: 'academicLevel', 'academic level': 'academicLevel',
  year: 'yearOfStudy', yearofstudy: 'yearOfStudy', subjects: 'subjects', subject: 'subjects', accounttype: 'accountType', role: 'accountType',
};

function normalizeHeader(value: unknown) { return String(value ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' '); }
function normalizeIdentifier(value: unknown) { return String(value ?? '').normalize('NFKC').trim().replace(/[\s-]+/g, '').toLocaleLowerCase('en'); }

export async function parseInstitutionRegister(file: File, accountType: 'student' | 'tutor'): Promise<ImportedInstitutionRecord[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (file.size > 10 * 1024 * 1024) throw new Error('Register files must be 10 MB or smaller. Split a larger register into reviewed batches.');
  if (!['csv', 'xlsx'].includes(ext ?? '')) throw new Error('For this import, use an Excel workbook (.xlsx) or CSV file. Legacy .xls, PDF and scanned-register extraction is not enabled yet.');
  let values: unknown[][];
  if (ext === 'csv') values = parseCsv(await file.text());
  else {
    const { default: readXlsxFile } = await import('read-excel-file/browser');
    values = (await readXlsxFile(file))[0]?.data ?? [];
  }
  if (values.length < 2) throw new Error('The register needs a header row and at least one record.');
  const headers = values[0].map(normalizeHeader);
  const rows = values.slice(1).filter((row) => row.some((cell) => String(cell ?? '').trim())).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
  if (rows.length > 5000) throw new Error('A register batch may contain no more than 5,000 rows. Split the file into smaller batches.');
  const seen = new Set<string>();
  return rows.map((row) => {
    const output: Record<string, string> = {};
    for (const [header, value] of Object.entries(row)) {
      const key = aliases[normalizeHeader(header)] ?? aliases[normalizeHeader(header).replaceAll(' ', '')];
      if (key) output[key] = String(value ?? '').trim();
    }
    const record = { ...output, accountType } as ImportedInstitutionRecord;
    const identifier = normalizeIdentifier(record.identifier);
    if (!record.fullName || !identifier) throw new Error('Every row must include a name and an ADM number or Tutor ID. Check the column headings and highlighted row data.');
    if (seen.has(identifier)) throw new Error(`Duplicate identifier in the uploaded file: ${record.identifier}`);
    seen.add(identifier);
    return record;
  });
}

function parseCsv(text: string): string[][] {
  const result: string[][] = []; let row: string[] = []; let cell = ''; let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && (char === '\n' || char === '\r')) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); result.push(row); row = []; cell = '';
    } else cell += char;
  }
  if (quoted) throw new Error('The CSV file contains an unclosed quoted field.');
  if (cell || row.length) { row.push(cell); result.push(row); }
  return result;
}
