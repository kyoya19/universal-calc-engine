import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusOverview, toReportStatusOverview } from '../src';

describe('public report status overview exports', () => {
  it('exports report status overview helpers from the package entrypoint', () => {
    expect(toReportStatusOverview({ ok: 1, warning: 0, rejected: 0, info: 2 })).toEqual({
      summary: { ok: 1, warning: 0, rejected: 0, info: 2 },
      level: 'ok',
      plainText: 'ok: 1\nwarning: 0\nrejected: 0\ninfo: 2'
    });

    const overview = definitionModelToBoundaryReportStatusOverview({
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
    });

    expect(overview.level).toBe('ok');
    expect(overview.plainText).toContain('rejected: 0');
  });
});
