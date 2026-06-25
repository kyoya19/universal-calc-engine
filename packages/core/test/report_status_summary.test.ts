import { describe, expect, it } from 'vitest';
import type { ReportModel } from '../src/report_model';
import {
  definitionModelToBoundaryReportStatusIsOk,
  definitionModelToBoundaryReportStatusLevel,
  definitionModelToBoundaryReportStatusSummary,
  definitionModelToBoundaryReportStatusSummaryPlainText,
  formatReportStatusSummaryPlainText,
  isReportStatusSummaryOk,
  reportStatusSummaryToJson,
  selectReportStatusSummaryLevel,
  serializeReportStatusSummary,
  summarizeReportModelsStatuses,
  summarizeReportModelStatuses
} from '../src/report_status_summary';

const one: ReportModel = {
  kind: 'one',
  title: 'One',
  sections: [
    {
      id: 's',
      title: 'S',
      rows: [
        { id: 'a', label: 'a', plainText: 'a', status: 'ok' },
        { id: 'b', label: 'b', plainText: 'b', status: 'warning' },
        { id: 'c', label: 'c', plainText: 'c', status: 'rejected' },
        { id: 'd', label: 'd', plainText: 'd', status: 'info' },
        { id: 'e', label: 'e', plainText: 'e' }
      ]
    }
  ]
};

const two: ReportModel = {
  kind: 'two',
  title: 'Two',
  sections: [{ id: 's', title: 'S', rows: [{ id: 'a', label: 'a', plainText: 'a', status: 'ok' }] }]
};

const validDefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start', properties: { step: 0 } },
    { id: 'state:{step=1}', terminal: true, properties: { step: 1 } }
  ],
  transitions: [
    {
      from: 'start',
      to: 'state:{step=1}',
      probability: 1,
      effects: [{ type: 'set_property' as const, property: 'step', value: 1 }]
    }
  ]
};

describe('report status summary helpers', () => {
  it('summarizes one report', () => {
    expect(summarizeReportModelStatuses(one)).toEqual({ ok: 1, warning: 1, rejected: 1, info: 1 });
  });

  it('summarizes report arrays', () => {
    expect(summarizeReportModelsStatuses([one, two])).toEqual({ ok: 2, warning: 1, rejected: 1, info: 1 });
  });

  it('summarizes empty report arrays', () => {
    expect(summarizeReportModelsStatuses([])).toEqual({ ok: 0, warning: 0, rejected: 0, info: 0 });
  });

  it('serializes report status summaries', () => {
    const summary = summarizeReportModelsStatuses([one, two]);

    expect(serializeReportStatusSummary(summary)).toEqual({ ok: 2, warning: 1, rejected: 1, info: 1 });
    expect(JSON.parse(reportStatusSummaryToJson(summary))).toEqual({ ok: 2, warning: 1, rejected: 1, info: 1 });
  });

  it('selects a summary level', () => {
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 0, rejected: 0, info: 1 })).toBe('ok');
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 1, rejected: 0, info: 1 })).toBe('warning');
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 0, rejected: 1, info: 1 })).toBe('rejected');
  });

  it('checks whether a summary is ok', () => {
    expect(isReportStatusSummaryOk({ ok: 1, warning: 0, rejected: 0, info: 1 })).toBe(true);
    expect(isReportStatusSummaryOk({ ok: 1, warning: 1, rejected: 0, info: 1 })).toBe(false);
  });

  it('formats a status summary as plain text', () => {
    expect(formatReportStatusSummaryPlainText({ ok: 2, warning: 1, rejected: 0, info: 3 })).toBe(
      'ok: 2\nwarning: 1\nrejected: 0\ninfo: 3'
    );
  });

  it('summarizes boundary reports built from a definition model', () => {
    const summary = definitionModelToBoundaryReportStatusSummary(validDefinitionModel);

    expect(summary.ok).toBeGreaterThan(0);
    expect(summary.info).toBeGreaterThan(0);
    expect(summary.warning).toBe(0);
    expect(summary.rejected).toBe(0);
    expect(isReportStatusSummaryOk(summary)).toBe(true);
  });

  it('formats boundary report status summary directly from a definition model', () => {
    const text = definitionModelToBoundaryReportStatusSummaryPlainText(validDefinitionModel);

    expect(text).toContain('ok:');
    expect(text).toContain('warning: 0');
    expect(text).toContain('rejected: 0');
    expect(text).toContain('info:');
  });

  it('selects boundary report status level directly from a definition model', () => {
    expect(definitionModelToBoundaryReportStatusLevel(validDefinitionModel)).toBe('ok');
  });

  it('checks boundary report status directly from a definition model', () => {
    expect(definitionModelToBoundaryReportStatusIsOk(validDefinitionModel)).toBe(true);
  });
});
