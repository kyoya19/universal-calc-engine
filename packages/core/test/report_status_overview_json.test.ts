import { describe, expect, test } from 'vitest';
import { toReportStatusOverview } from '../src/report_status_overview';

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
});
