import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportStatusOverview,
  reportStatusOverviewToJson,
  serializeReportStatusOverview,
  toReportStatusOverview
} from '../src/report_status_overview';

describe('report status overview helpers', () => {
  it('builds an overview from a status summary', () => {
    expect(toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 })).toEqual({
      summary: { ok: 2, warning: 0, rejected: 0, info: 3 },
      level: 'ok',
      plainText: 'ok: 2\nwarning: 0\nrejected: 0\ninfo: 3'
    });
  });

  it('serializes a report status overview', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 });

    expect(serializeReportStatusOverview(overview)).toEqual(overview);
    expect(JSON.parse(reportStatusOverviewToJson(overview))).toEqual(overview);
  });

  it('builds a boundary report status overview from a definition model', () => {
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
    expect(overview.summary.ok).toBeGreaterThan(0);
    expect(overview.summary.warning).toBe(0);
    expect(overview.summary.rejected).toBe(0);
    expect(overview.summary.info).toBeGreaterThan(0);
    expect(overview.plainText).toContain('ok:');
    expect(overview.plainText).toContain('warning: 0');
    expect(overview.plainText).toContain('rejected: 0');
  });
});
