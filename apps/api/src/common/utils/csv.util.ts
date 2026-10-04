const escapeCell = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  const str = value instanceof Date ? value.toISOString() : String(value);
  // Guard against CSV injection in spreadsheet apps.
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

/**
 * Render rows as RFC-4180 CSV (with a UTF-8 BOM so Excel opens it correctly).
 *
 * ```ts
 * res.type('text/csv').send(toCsv(rows, [['Name','fullName'], ['Email','email']]));
 * ```
 */
export function toCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<[header: string, key: keyof T | ((row: T) => unknown)]>,
): string {
  const header = columns.map(([label]) => escapeCell(label)).join(',');
  const body = rows.map((row) =>
    columns
      .map(([, key]) => escapeCell(typeof key === 'function' ? key(row) : row[key]))
      .join(','),
  );
  return `﻿${[header, ...body].join('\r\n')}\r\n`;
}
