import { describe, expect, it } from 'vitest';
import { countReportStatusSummaryRows } from '../src/report_status_count';

describe('countReportStatusSummaryRows', () => {
  it('counts all status rows', () => {
    expect(countReportStatusSummaryRows({ ok: 2, warning: 1, rejected: 3, info: 4 })).toBe(10);
  });

  it('counts zero status rows', () => {
    expect(countReportStatusSummaryRows({ ok: 0, warning: 0, rejected: 0, info: 0 })).toBe(0);
  });

  it('counts a single warning status row', () => {
    expect(countReportStatusSummaryRows({ ok: 0, warning: 1, rejected: 0, info: 0 })).toBe(1);
  });
});
