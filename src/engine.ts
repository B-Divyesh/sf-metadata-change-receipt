export type CsvRow = Record<string, string>;

export interface CsvTable {
  headers: string[];
  rows: CsvRow[];
  sourceName: string;
}

export type Operation = 'set' | 'find-replace' | 'append-keywords' | 'prepend' | 'shift-date';

export interface TransformRule {
  identityField: string;
  targetField: string;
  operation: Operation;
  value: string;
  find: string;
  days: number;
  conditionField: string;
  conditionValue: string;
}

export interface ChangeEntry {
  rowNumber: number;
  identity: string;
  field: string;
  before: string;
  after: string;
}

export interface ExceptionEntry {
  rowNumber: number | '';
  identity: string;
  field: string;
  reason: string;
  expected?: string;
  actual?: string;
}

export interface PlanResult {
  rule: TransformRule;
  sourceName: string;
  totalRows: number;
  matchedRows: number;
  unchangedRows: number;
  skippedRows: number;
  changes: ChangeEntry[];
  exceptions: ExceptionEntry[];
  plannedTable: CsvTable;
}

export interface VerificationResult {
  verified: number;
  mismatched: number;
  exceptions: ExceptionEntry[];
  checkedSourceName: string;
}

export interface ReceiptPayload {
  version: 1;
  issuedAt: string;
  sourceName: string;
  sourceRows: number;
  rule: TransformRule;
  changes: ChangeEntry[];
  exceptions: ExceptionEntry[];
  verification: VerificationResult | null;
  note: string;
}

const MAX_BYTES = 25 * 1024 * 1024;

export function parseCsv(text: string, sourceName = 'metadata.csv'): CsvTable {
  if (new Blob([text]).size > MAX_BYTES) {
    throw new Error('This CSV is larger than 25 MB. Split it into smaller exports and process each separately.');
  }
  const input = text.replace(/^\uFEFF/, '');
  if (!input.trim()) throw new Error('This file is empty. Choose a CSV with a header row and at least one record.');

  const matrix: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index] ?? '';
    if (quoted) {
      if (character === '"' && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"' && field === '') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      matrix.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }
  if (quoted) throw new Error('A quoted field is not closed. Check the final rows of the CSV and export it again.');
  if (field !== '' || row.length > 0) {
    row.push(field.replace(/\r$/, ''));
    matrix.push(row);
  }
  while (matrix.length > 0 && matrix.at(-1)?.every((cell) => cell === '')) matrix.pop();

  const rawHeaders = matrix.shift();
  if (!rawHeaders || rawHeaders.length === 0) throw new Error('No header row was found.');
  const headers = rawHeaders.map((header) => header.trim());
  if (headers.some((header) => !header)) throw new Error('Every column needs a name. One or more CSV headers are blank.');
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length > 0) throw new Error(`Column names must be unique. Duplicate: ${duplicates[0]}.`);

  const rows = matrix.map((cells) => {
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      record[header] = cells[index] ?? '';
    });
    if (cells.length > headers.length) {
      record.__extra_columns = cells.slice(headers.length).join(',');
    }
    return record;
  });
  if (rows.length === 0) throw new Error('The CSV has headers but no records to inspect.');
  return { headers, rows, sourceName };
}

function escapeCsv(value: unknown): string {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function serializeCsv(headers: string[], rows: CsvRow[]): string {
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) lines.push(headers.map((header) => escapeCsv(row[header])).join(','));
  return `${lines.join('\r\n')}\r\n`;
}

function shiftDate(value: string, days: number): string | null {
  const match = /^(\d{4})([-:])(\d{2})\2(\d{2})(.*)$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[3]);
  const day = Number(match[4]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  date.setUTCDate(date.getUTCDate() + days);
  const pad = (part: number) => String(part).padStart(2, '0');
  const separator = match[2] ?? '-';
  return `${date.getUTCFullYear()}${separator}${pad(date.getUTCMonth() + 1)}${separator}${pad(date.getUTCDate())}${match[5] ?? ''}`;
}

export function transformValue(before: string, rule: TransformRule): { value: string; error?: string } {
  switch (rule.operation) {
    case 'set':
      return { value: rule.value };
    case 'find-replace':
      if (!rule.find) return { value: before, error: 'Find text is blank.' };
      return { value: before.replaceAll(rule.find, rule.value) };
    case 'append-keywords': {
      const additions = rule.value.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
      if (additions.length === 0) return { value: before, error: 'No keyword was provided.' };
      const current = before.split(/[;,]/).map((item) => item.trim()).filter(Boolean);
      const seen = new Set(current.map((item) => item.toLocaleLowerCase()));
      for (const addition of additions) {
        if (!seen.has(addition.toLocaleLowerCase())) {
          current.push(addition);
          seen.add(addition.toLocaleLowerCase());
        }
      }
      return { value: current.join('; ') };
    }
    case 'prepend':
      return { value: `${rule.value}${before}` };
    case 'shift-date': {
      if (!Number.isInteger(rule.days)) return { value: before, error: 'Day shift must be a whole number.' };
      const shifted = shiftDate(before, rule.days);
      return shifted === null
        ? { value: before, error: 'Date is not in YYYY-MM-DD, YYYY:MM:DD, or a compatible date-time format.' }
        : { value: shifted };
    }
  }
}

export function planChanges(table: CsvTable, rule: TransformRule): PlanResult {
  for (const field of [rule.identityField, rule.targetField, rule.conditionField].filter(Boolean)) {
    if (!table.headers.includes(field)) throw new Error(`Column “${field}” is not present in the source CSV.`);
  }
  const changes: ChangeEntry[] = [];
  const exceptions: ExceptionEntry[] = [];
  const plannedRows: CsvRow[] = [];
  let matchedRows = 0;
  let unchangedRows = 0;
  let skippedRows = 0;

  table.rows.forEach((original, index) => {
    const rowNumber = index + 2;
    const row = { ...original };
    plannedRows.push(row);
    const identity = (original[rule.identityField] ?? '').trim();
    if (!identity) {
      exceptions.push({ rowNumber, identity: '(blank)', field: rule.identityField, reason: 'Identity value is blank; this row cannot be audited safely.' });
      return;
    }
    if (original.__extra_columns) {
      exceptions.push({ rowNumber, identity, field: '(row)', reason: 'Row has more values than the header; export a structurally consistent CSV.' });
      return;
    }
    if (rule.conditionField && (original[rule.conditionField] ?? '') !== rule.conditionValue) {
      skippedRows += 1;
      return;
    }
    matchedRows += 1;
    const before = original[rule.targetField] ?? '';
    const transformed = transformValue(before, rule);
    if (transformed.error) {
      exceptions.push({ rowNumber, identity, field: rule.targetField, reason: transformed.error });
    } else if (transformed.value === before) {
      unchangedRows += 1;
    } else {
      row[rule.targetField] = transformed.value;
      changes.push({ rowNumber, identity, field: rule.targetField, before, after: transformed.value });
    }
  });

  return {
    rule,
    sourceName: table.sourceName,
    totalRows: table.rows.length,
    matchedRows,
    unchangedRows,
    skippedRows,
    changes,
    exceptions,
    plannedTable: { ...table, rows: plannedRows }
  };
}

export function verifyChanges(plan: PlanResult, after: CsvTable): VerificationResult {
  if (!after.headers.includes(plan.rule.identityField) || !after.headers.includes(plan.rule.targetField)) {
    throw new Error(`The verification CSV needs “${plan.rule.identityField}” and “${plan.rule.targetField}” columns.`);
  }
  const byIdentity = new Map<string, CsvRow[]>();
  for (const row of after.rows) {
    const identity = (row[plan.rule.identityField] ?? '').trim();
    const matches = byIdentity.get(identity) ?? [];
    matches.push(row);
    byIdentity.set(identity, matches);
  }
  const exceptions: ExceptionEntry[] = [];
  let verified = 0;
  let mismatched = 0;
  for (const change of plan.changes) {
    const matches = byIdentity.get(change.identity) ?? [];
    if (matches.length === 0) {
      exceptions.push({ rowNumber: change.rowNumber, identity: change.identity, field: change.field, reason: 'Asset is missing from the verification export.', expected: change.after, actual: '(missing)' });
      mismatched += 1;
    } else if (matches.length > 1) {
      exceptions.push({ rowNumber: change.rowNumber, identity: change.identity, field: change.field, reason: 'Identity occurs more than once in the verification export.', expected: change.after, actual: '(duplicate identity)' });
      mismatched += 1;
    } else {
      const actual = matches[0]?.[change.field] ?? '';
      if (actual === change.after) verified += 1;
      else {
        exceptions.push({ rowNumber: change.rowNumber, identity: change.identity, field: change.field, reason: 'Value does not match the planned change.', expected: change.after, actual });
        mismatched += 1;
      }
    }
  }
  return { verified, mismatched, exceptions, checkedSourceName: after.sourceName };
}

export function receiptCanonicalJson(payload: ReceiptPayload): string {
  return JSON.stringify(payload);
}

export function exceptionsCsv(exceptions: ExceptionEntry[]): string {
  const headers = ['row_number', 'identity', 'field', 'reason', 'expected', 'actual'];
  const rows = exceptions.map((entry) => ({
    row_number: String(entry.rowNumber),
    identity: entry.identity,
    field: entry.field,
    reason: entry.reason,
    expected: entry.expected ?? '',
    actual: entry.actual ?? ''
  }));
  return serializeCsv(headers, rows);
}

export function changesCsv(changes: ChangeEntry[]): string {
  const headers = ['row_number', 'identity', 'field', 'before', 'after'];
  return serializeCsv(headers, changes.map((entry) => ({
    row_number: String(entry.rowNumber), identity: entry.identity, field: entry.field, before: entry.before, after: entry.after
  })));
}
