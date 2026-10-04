import { toCsv } from '../../src/common/utils/csv.util';

describe('toCsv', () => {
  it('renders a header row and one row per record, CRLF-terminated', () => {
    const csv = toCsv(
      [{ name: 'Ada Lovelace', email: 'ada@example.com' }],
      [
        ['Name', 'name'],
        ['Email', 'email'],
      ],
    );
    const lines = csv.replace(/^﻿/, '').split('\r\n');
    expect(lines[0]).toBe('Name,Email');
    expect(lines[1]).toBe('Ada Lovelace,ada@example.com');
    expect(lines[lines.length - 1]).toBe('');
  });

  it('prefixes the output with a UTF-8 BOM so Excel opens it correctly', () => {
    const csv = toCsv([{ name: 'x' }], [['Name', 'name']]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('quotes fields containing commas, quotes or newlines', () => {
    const csv = toCsv(
      [{ note: 'Hello, "world"\nnext line' }],
      [['Note', 'note']],
    );
    expect(csv).toContain('"Hello, ""world""\nnext line"');
  });

  it('renders null/undefined as an empty cell', () => {
    const csv = toCsv([{ phone: null, fax: undefined }], [['Phone', 'phone'], ['Fax', 'fax']]);
    const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1];
    expect(dataLine).toBe(',');
  });

  it('serializes Date values as ISO-8601', () => {
    const date = new Date('2024-01-15T10:00:00.000Z');
    const csv = toCsv([{ createdAt: date }], [['Created at', 'createdAt']]);
    expect(csv).toContain(date.toISOString());
  });

  it('escapes values that look like spreadsheet formulas (CSV injection guard)', () => {
    const csv = toCsv([{ message: '=1+1' }], [['Message', 'message']]);
    expect(csv).toContain("'=1+1");
  });

  it('supports a derived column via a callback', () => {
    const csv = toCsv(
      [{ assignedTo: { name: 'Sam' } }],
      [['Assignee', (row) => (row.assignedTo as { name: string } | null)?.name ?? '']],
    );
    const dataLine = csv.replace(/^﻿/, '').split('\r\n')[1];
    expect(dataLine).toBe('Sam');
  });
});
