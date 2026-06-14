import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusLevel, selectReportStatusSummaryLevel } from '../src';

describe('public report status level exports', () => {
  it('exports report status level helpers from the package entrypoint', () => {
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 0, rejected: 0, info: 1 })).toBe('ok');
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 1, rejected: 0, info: 1 })).toBe('warning');
    expect(selectReportStatusSummaryLevel({ ok: 1, warning: 0, rejected: 1, info: 1 })).toBe('rejected');

    expect(definitionModelToBoundaryReportStatusLevel({
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
          effects: [{ type: 'set_property', property: 'step', value: 1 }]
        }
      ]
    })).toBe('ok');
  });
});
