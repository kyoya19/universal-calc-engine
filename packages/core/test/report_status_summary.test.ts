import { describe, expect, it } from 'vitest';
import type { ReportModel } from '../src/report_model';
import {
  definitionModelToBoundaryReportStatusSummary,
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

describe('report status summary helpers', () => {
  it('summarizes one report', () => {
    expect(summarizeReportModelStatuses(one)).toEqual({ ok: 1, warning: 1, rejected: 1, info: 1 });
  });

  it('summarizes report arrays', () => {
    expect(summarizeReportModelsStatuses([one, two])).toEqual({ ok: 2, warning: 1, rejected: 1, info: 1 });
  });

  it('summarizes boundary reports built from a definition model', () => {
    expect(definitionModelToBoundaryReportStatusSummary({
      startState: 'start',
      states: [
        { id: 'start', properties: { step: 0 } },
        { id: 'state:{step=1}', properties: { step: 1 } }
      ],
      transitions: [
        {
          from: 'start',
          to: 'state:{step=1}',
          probability: 1,
          effects: [{ type: 'set_property', property: 'step', value: 1 }]
        }
      ]
    })).toEqual({ ok: 8, warning: 3, rejected: 0, info: 16 });
  });
});
