import { expect, it } from 'vitest';
import { countReportStatusSummaryRows } from '../src/report_status_count';

it('count export direct', () => {
  expect(countReportStatusSummaryRows({ ok: 1, warning: 1, rejected: 1, info: 1 })).toBe(4);
});
