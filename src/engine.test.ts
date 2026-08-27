import { describe, expect, it } from 'vitest';
import { changesCsv, exceptionsCsv, parseCsv, planChanges, serializeCsv, verifyChanges, type TransformRule } from './engine.ts';

const baseRule: TransformRule = {
  identityField: 'filename',
  targetField: 'keywords',
  operation: 'append-keywords',
  value: 'archive; reviewed',
  find: '',
  days: 0,
  conditionField: '',
  conditionValue: ''
};

describe('CSV parser', () => {
  it('handles quoted commas, escaped quotes, and multiline values', () => {
    const table = parseCsv('filename,caption\r\na.jpg,"A pond, at dawn"\r\nb.jpg,"He said ""wait""\nthen left"\r\n');
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]?.caption).toBe('A pond, at dawn');
    expect(table.rows[1]?.caption).toBe('He said "wait"\nthen left');
  });

  it('round-trips CSV-sensitive values', () => {
    const original = parseCsv('id,caption\n1,"one, two"\n2,"line 1\nline 2"');
    const reparsed = parseCsv(serializeCsv(original.headers, original.rows));
    expect(reparsed.rows).toEqual(original.rows);
  });

  it('reports empty, duplicate-header, and unterminated-quote errors', () => {
    expect(() => parseCsv('')).toThrow(/empty/i);
    expect(() => parseCsv('id,id\n1,2')).toThrow(/unique/i);
    expect(() => parseCsv('id,caption\n1,"broken')).toThrow(/not closed/i);
  });
});

describe('transformation and evidence', () => {
  it('represents every intended edit exactly once for a 10,000-row fixture', () => {
    const lines = ['filename,keywords'];
    for (let index = 0; index < 10_000; index += 1) lines.push(`IMG_${String(index).padStart(5, '0')}.jpg,nature`);
    const plan = planChanges(parseCsv(lines.join('\n'), 'fixture-10000.csv'), baseRule);
    expect(plan.changes).toHaveLength(10_000);
    expect(new Set(plan.changes.map((change) => change.identity)).size).toBe(10_000);
    expect(plan.changes.every((change) => change.after === 'nature; archive; reviewed')).toBe(true);
    expect(parseCsv(changesCsv(plan.changes)).rows).toHaveLength(10_000);
  });

  it('keeps blank identities and invalid dates out of the change ledger', () => {
    const table = parseCsv('filename,date\na.jpg,2024:01:31\n,2024:02:01\nb.jpg,not-a-date');
    const plan = planChanges(table, { ...baseRule, targetField: 'date', operation: 'shift-date', days: 1 });
    expect(plan.changes).toEqual([{ rowNumber: 2, identity: 'a.jpg', field: 'date', before: '2024:01:31', after: '2024:02:01' }]);
    expect(plan.exceptions).toHaveLength(2);
    expect(parseCsv(exceptionsCsv(plan.exceptions)).rows).toHaveLength(2);
  });

  it('does not duplicate an existing keyword with different casing', () => {
    const plan = planChanges(parseCsv('filename,keywords\na.jpg,Nature; ARCHIVE'), baseRule);
    expect(plan.changes[0]?.after).toBe('Nature; ARCHIVE; reviewed');
  });

  it('verifies matches and identifies missing, duplicate, and mismatched assets', () => {
    const source = parseCsv('filename,caption\na.jpg,old\nb.jpg,old\nc.jpg,old\nd.jpg,old');
    const plan = planChanges(source, { ...baseRule, targetField: 'caption', operation: 'set', value: 'new' });
    const after = parseCsv('filename,caption\na.jpg,new\nb.jpg,wrong\nc.jpg,new\nc.jpg,new');
    const result = verifyChanges(plan, after);
    expect(result.verified).toBe(1);
    expect(result.mismatched).toBe(3);
    expect(result.exceptions.map((item) => item.reason)).toEqual(expect.arrayContaining([
      expect.stringMatching(/does not match/), expect.stringMatching(/more than once/), expect.stringMatching(/missing/)
    ]));
  });

  it('applies exact-match conditions without treating skipped rows as exceptions', () => {
    const plan = planChanges(parseCsv('filename,rating,caption\na.jpg,5,old\nb.jpg,3,old'), {
      ...baseRule, targetField: 'caption', operation: 'set', value: 'selected', conditionField: 'rating', conditionValue: '5'
    });
    expect(plan.changes).toHaveLength(1);
    expect(plan.skippedRows).toBe(1);
    expect(plan.exceptions).toHaveLength(0);
  });
});
