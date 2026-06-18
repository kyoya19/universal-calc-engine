import { describe, expect, test } from 'vitest';
import { toReportStatusOverview } from '../src/report_status_overview';
import { formatReportStatusSummaryPlainText, selectReportStatusSummaryLevel } from '../src/report_status_summary';

describe('report status overview JSON boundary', () => {
  test('keeps summary level and plain text stable after JSON serialization', () => {
    const overview = toReportStatusOverview({ ok: 1, warning: 0, rejected: 2, info: 3 });
    const serialized = JSON.parse(JSON.stringify(overview));

    expect(serialized).toEqual({
      summary: { ok: 1, warning: 0, rejected: 2, info: 3 },
      level: 'rejected',
      plainText: ['ok: 1', 'warning: 0', 'rejected: 2', 'info: 3'].join('\n')
    });
  });

  test('keeps warning summaries stable after JSON serialization', () => {
    const summary = JSON.parse(JSON.stringify({ ok: 4, warning: 1, rejected: 0, info: 2 }));

    expect(selectReportStatusSummaryLevel(summary)).toBe('warning');
    expect(formatReportStatusSummaryPlainText(summary)).toBe(
      ['ok: 4', 'warning: 1', 'rejected: 0', 'info: 2'].join('\n')
    );
  });

  test('keeps ok summaries stable after JSON serialization', () => {
    const summary = JSON.parse(JSON.stringify({ ok: 3, warning: 0, rejected: 0, info: 1 }));

    expect(selectReportStatusSummaryLevel(summary)).toBe('ok');
    expect(formatReportStatusSummaryPlainText(summary)).toBe(
      ['ok: 3', 'warning: 0', 'rejected: 0', 'info: 1'].join('\n')
    );
  });
});
