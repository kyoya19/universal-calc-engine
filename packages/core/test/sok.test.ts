import { expect, it } from 'vitest';
import { isReportStatusSummaryOk } from '../src';

it('sok', () => {
  expect(isReportStatusSummaryOk({ ok: 1, warning: 0, rejected: 0, info: 1 })).toBe(true);
  expect(isReportStatusSummaryOk({ ok: 1, warning: 1, rejected: 0, info: 1 })).toBe(false);
});

it('sok rejected', () => {
  expect(isReportStatusSummaryOk({ ok: 1, warning: 0, rejected: 1, info: 0 })).toBe(false);
});
