import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportModels } from '../src/report_model';

describe('definitionModelToBoundaryReportModels', () => {
  it('builds the current boundary report model set from a definition model', () => {
    const reports = definitionModelToBoundaryReportModels({
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

    expect(reports.map((report) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);

    expect(reports).toHaveLength(3);
    expect(reports.every((report) => report.sections.length > 0)).toBe(true);
  });
});
