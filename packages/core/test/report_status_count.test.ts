import { describe, expect, it } from 'vitest';
import { countReportStatusSummaryRows } from '../src/report_status_count';

describe('countReportStatusSummaryRows', () => {
  it('counts all status rows', () => {
    expect(countReportStatusSummaryRows({ ok: 2, warning: 1, rejected: 3, info: 4 })).toBe(10);
  });
});
