import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportStatusOverview,
  reportStatusOverviewToJson,
  serializeReportStatusOverview,
  toReportStatusOverview
} from '../src/report_status_overview';
import { formatReportStatusSummaryPlainText, selectReportStatusSummaryLevel } from '../src/report_status_summary';

describe('report status overview helpers', () => {
  it('builds an overview from a status summary', () => {
    expect(toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 })).toEqual({
      summary: { ok: 2, warning: 0, rejected: 0, info: 3 },
      level: 'ok',
      plainText: 'ok: 2\nwarning: 0\nrejected: 0\ninfo: 3'
    });
  });

  it('aligns overview level and plain text with shared summary helpers', () => {
    const summary = { ok: 2, warning: 1, rejected: 0, info: 3 };
    const overview = toReportStatusOverview(summary);

    expect(overview.level).toBe(selectReportStatusSummaryLevel(summary));
    expect(overview.plainText).toBe(formatReportStatusSummaryPlainText(summary));
  });

  it('keeps summary counts visible in overview plain text', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 });

    expect(overview.plainText).toContain('ok: 2');
    expect(overview.plainText).toContain('info: 3');
  });

  it('keeps non-ok counts visible in overview plain text', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 1, rejected: 1, info: 3 });

    expect(overview.plainText).toContain('warning: 1');
    expect(overview.plainText).toContain('rejected: 1');
  });

  it('keeps overview plain text stable after JSON serialization', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 1, rejected: 0, info: 3 });

    expect(JSON.parse(JSON.stringify(overview.plainText))).toBe(overview.plainText);
  });

  it('selects rejected overview level when rejected rows exist', () => {
    expect(toReportStatusOverview({ ok: 2, warning: 1, rejected: 1, info: 3 }).level).toBe('rejected');
  });

  it('selects rejected overview level for rejected summaries', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 1, info: 0 });

    expect(overview.level).toBe('rejected');
    expect(overview.plainText).toContain('rejected: 1');
  });

  it('selects warning overview level when warnings exist without rejections', () => {
    expect(toReportStatusOverview({ ok: 2, warning: 1, rejected: 0, info: 3 }).level).toBe('warning');
  });

  it('selects warning overview level for warning-only summaries', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 1, rejected: 0, info: 0 });

    expect(overview.level).toBe('warning');
    expect(overview.plainText).toContain('warning: 1');
  });

  it('selects ok overview level for info-only summaries', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 1 });

    expect(overview.level).toBe('ok');
    expect(overview.plainText).toContain('info: 1');
  });

  it('keeps overview levels stable after JSON serialization', () => {
    const levels = [
      toReportStatusOverview({ ok: 1, warning: 0, rejected: 0, info: 0 }).level,
      toReportStatusOverview({ ok: 0, warning: 1, rejected: 0, info: 0 }).level,
      toReportStatusOverview({ ok: 0, warning: 0, rejected: 1, info: 0 }).level
    ];

    expect(JSON.parse(JSON.stringify(levels))).toEqual(['ok', 'warning', 'rejected']);
  });

  it('builds an empty overview from a zero status summary', () => {
    expect(toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 0 })).toEqual({
      summary: { ok: 0, warning: 0, rejected: 0, info: 0 },
      level: 'ok',
      plainText: 'ok: 0\nwarning: 0\nrejected: 0\ninfo: 0'
    });
  });

  it('keeps empty overview plain text stable after JSON serialization', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 0 });

    expect(JSON.parse(JSON.stringify(overview.plainText))).toBe(overview.plainText);
  });

  it('serializes a report status overview', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 });

    expect(serializeReportStatusOverview(overview)).toEqual(overview);
    expect(JSON.parse(reportStatusOverviewToJson(overview))).toEqual(overview);
  });

  it('matches the JSON helper output to the serialized overview payload', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 });

    expect(reportStatusOverviewToJson(overview)).toBe(JSON.stringify(serializeReportStatusOverview(overview)));
  });

  it('matches empty overview JSON helper output to the serialized payload', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 0 });

    expect(reportStatusOverviewToJson(overview)).toBe(JSON.stringify(serializeReportStatusOverview(overview)));
  });

  it('matches warning overview JSON helper output to the serialized payload', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 1, rejected: 0, info: 0 });

    expect(reportStatusOverviewToJson(overview)).toBe(JSON.stringify(serializeReportStatusOverview(overview)));
    expect(JSON.parse(reportStatusOverviewToJson(overview)).level).toBe('warning');
  });

  it('matches rejected overview JSON helper output to the serialized payload', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 1, info: 0 });

    expect(reportStatusOverviewToJson(overview)).toBe(JSON.stringify(serializeReportStatusOverview(overview)));
    expect(JSON.parse(reportStatusOverviewToJson(overview)).level).toBe('rejected');
  });

  it('parses overview JSON into a copied summary payload', () => {
    const overview = toReportStatusOverview({ ok: 1, warning: 1, rejected: 0, info: 2 });
    const parsed = JSON.parse(reportStatusOverviewToJson(overview));

    expect(parsed).toEqual(serializeReportStatusOverview(overview));
    expect(parsed).not.toBe(overview);
    expect(parsed.summary).not.toBe(overview.summary);
  });

  it('serializes an empty report status overview to JSON', () => {
    expect(JSON.parse(reportStatusOverviewToJson(toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 0 })))).toEqual({
      summary: { ok: 0, warning: 0, rejected: 0, info: 0 },
      level: 'ok',
      plainText: 'ok: 0\nwarning: 0\nrejected: 0\ninfo: 0'
    });
  });

  it('copies a report status overview summary during serialization', () => {
    const overview = toReportStatusOverview({ ok: 2, warning: 0, rejected: 0, info: 3 });
    const serialized = serializeReportStatusOverview(overview);

    expect(serialized).toEqual(overview);
    expect(serialized).not.toBe(overview);
    expect(serialized.summary).not.toBe(overview.summary);
  });

  it('copies an empty report status overview summary during serialization', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 0, info: 0 });
    const serialized = serializeReportStatusOverview(overview);

    expect(serialized).toEqual(overview);
    expect(serialized).not.toBe(overview);
    expect(serialized.summary).not.toBe(overview.summary);
  });

  it('copies a warning report status overview summary during serialization', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 1, rejected: 0, info: 0 });
    const serialized = serializeReportStatusOverview(overview);

    expect(serialized).toEqual(overview);
    expect(serialized).not.toBe(overview);
    expect(serialized.summary).not.toBe(overview.summary);
    expect(serialized.level).toBe('warning');
  });

  it('copies a rejected report status overview summary during serialization', () => {
    const overview = toReportStatusOverview({ ok: 0, warning: 0, rejected: 1, info: 0 });
    const serialized = serializeReportStatusOverview(overview);

    expect(serialized).toEqual(overview);
    expect(serialized).not.toBe(overview);
    expect(serialized.summary).not.toBe(overview.summary);
    expect(serialized.level).toBe('rejected');
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

  it('keeps definition-model boundary status overview copied after JSON serialization', () => {
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
    const parsed = JSON.parse(reportStatusOverviewToJson(overview));

    expect(parsed).toEqual(serializeReportStatusOverview(overview));
    expect(parsed).not.toBe(overview);
    expect(parsed.summary).not.toBe(overview.summary);
    expect(parsed.plainText).toBe(overview.plainText);
  });
});
