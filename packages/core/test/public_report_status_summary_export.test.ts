import { describe, expect, it } from 'vitest';
import { createEmptyReportStatusSummary, summarizeReportModelsStatuses } from '../src';

describe('public report status summary exports', () => {
  it('exports report status summary helpers from the package entrypoint', () => {
    expect(createEmptyReportStatusSummary()).toEqual({ ok: 0, warning: 0, rejected: 0, info: 0 });
    expect(summarizeReportModelsStatuses([])).toEqual({ ok: 0, warning: 0, rejected: 0, info: 0 });
  });
});
