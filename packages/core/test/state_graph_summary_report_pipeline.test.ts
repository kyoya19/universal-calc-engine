import { describe, expect, it } from 'vitest';
import { definitionModelToStateGraphSummaryReportModel } from '../src/report_model';

describe('definitionModelToStateGraphSummaryReportModel', () => {
  it('builds a state graph summary report directly from a definition model', () => {
    const report = definitionModelToStateGraphSummaryReportModel({
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
    });

    expect(report.kind).toBe('state_graph_summary');
    expect(report.sections.map((section) => section.id)).toEqual(['summary', 'diagnostics']);

    const rows = report.sections.flatMap((section) => section.rows);
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'stateCount',
        plainText: 'stateCount: 2'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'edgeCount',
        plainText: 'edgeCount: 1'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'edgeWithoutGeneratedTargetCount',
        plainText: 'edgeWithoutGeneratedTargetCount: 0',
        status: 'ok'
      })
    );
  });
});
