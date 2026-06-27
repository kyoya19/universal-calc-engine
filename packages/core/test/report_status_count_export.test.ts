import { expect, it } from 'vitest';
import { countReportStatusSummaryRows } from '../src/report_status_count';

it('count export direct', () => {
  expect(countReportStatusSummaryRows({ ok: 1, warning: 1, rejected: 1, info: 1 })).toBe(4);
});

it('counts a single info status row through the direct export', () => {
  expect(countReportStatusSummaryRows({ ok: 0, warning: 0, rejected: 0, info: 1 })).toBe(1);
});
