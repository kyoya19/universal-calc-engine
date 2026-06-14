import { describe, expect, it } from 'vitest';
import { formatReportStatusSummaryPlainText } from '../src';

describe('public report status text export', () => {
  it('exports report status text formatter from the package entrypoint', () => {
    expect(formatReportStatusSummaryPlainText({ ok: 1, warning: 2, rejected: 3, info: 4 })).toBe(
      'ok: 1\nwarning: 2\nrejected: 3\ninfo: 4'
    );
  });
});
