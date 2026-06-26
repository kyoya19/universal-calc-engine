import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportDigest, formatBoundaryReportDigestPlainText } from '../src/boundary_report_digest';

const model = {
  startState: 'start',
  states: [{ id: 'start' }, { id: 'end', terminal: true }],
  transitions: [{ from: 'start', to: 'end', probability: 1 }]
};

describe('boundary report digest status JSON boundary', () => {
  it('preserves non-ok digest status through JSON serialization', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serialized = JSON.parse(JSON.stringify(digest));

    expect(serialized.statusOverview.level).toBe('rejected');
    expect(serialized.statusOverview.summary.rejected).toBeGreaterThan(0);
    expect(serialized.reportText).toBe(digest.reportText);
  });

  it('copies digest status overview through JSON serialization', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serialized = JSON.parse(JSON.stringify(digest));

    expect(serialized.statusOverview).toEqual(digest.statusOverview);
    expect(serialized.statusOverview).not.toBe(digest.statusOverview);
    expect(serialized.statusOverview.summary).not.toBe(digest.statusOverview.summary);
  });

  it('keeps formatted digest text stable after JSON serialization', () => {
    const digest = definitionModelToBoundaryReportDigest(model);
    const serialized = JSON.parse(JSON.stringify(digest));

    expect(formatBoundaryReportDigestPlainText(serialized)).toBe(formatBoundaryReportDigestPlainText(digest));
    expect(formatBoundaryReportDigestPlainText(serialized)).toContain('statusLevel: rejected');
  });
});
