import { describe, expect, it } from 'vitest';
import { definitionModelToGeneratedTargetComparisonReportModel } from '../src/report_model';

describe('definitionModelToGeneratedTargetComparisonReportModel', () => {
  it('builds a generated target comparison report directly from a definition model', () => {
    const report = definitionModelToGeneratedTargetComparisonReportModel({
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

    expect(report.kind).toBe('generated_target_comparison');
    expect(report.sections.map((section) => section.id)).toEqual(['summary', 'rows']);

    const rows = report.sections.flatMap((section) => section.rows);
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'edgeCount',
        plainText: 'edgeCount: 1'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'matchCount',
        plainText: 'matchCount: 1',
        status: 'ok'
      })
    );
    expect(rows).toContainEqual(
      expect.objectContaining({
        id: 'row-0',
        status: 'ok',
        metadata: expect.objectContaining({
          from: 'start',
          explicitTo: 'state:{step=1}',
          generatedTo: 'state:{step=1}',
          comparisonStatus: 'match'
        })
      })
    );
  });
});
