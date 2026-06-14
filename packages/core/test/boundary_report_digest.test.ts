import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportDigest } from '../src/boundary_report_digest';

describe('definitionModelToBoundaryReportDigest', () => {
  it('builds boundary reports, report text, and status overview together', () => {
    const digest = definitionModelToBoundaryReportDigest({
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

    expect(digest.reports.map((report) => report.kind)).toEqual([
      'state_graph_summary',
      'transition_probability_audit',
      'generated_target_comparison'
    ]);
    expect(digest.reportText).toContain('State Graph Summary');
    expect(digest.reportText).toContain('Transition Probability Audit');
    expect(digest.reportText).toContain('Generated Target Comparison Report');
    expect(digest.statusOverview.level).toBe('ok');
    expect(digest.statusOverview.plainText).toContain('rejected: 0');
  });
});
