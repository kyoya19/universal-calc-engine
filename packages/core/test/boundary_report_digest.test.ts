import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportDigest,
  definitionModelToBoundaryReportDigestPlainText,
  formatBoundaryReportDigestPlainText
} from '../src/boundary_report_digest';

const model = {
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

describe('definitionModelToBoundaryReportDigest', () => {
  it('builds boundary reports, report text, and status overview together', () => {
    const digest = definitionModelToBoundaryReportDigest(model);

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

  it('formats a digest as plain text', () => {
    const text = formatBoundaryReportDigestPlainText(definitionModelToBoundaryReportDigest(model));

    expect(text).toContain('statusLevel: ok');
    expect(text).toContain('rejected: 0');
    expect(text).toContain('---');
    expect(text).toContain('State Graph Summary');
  });

  it('builds digest plain text directly from a definition model', () => {
    const text = definitionModelToBoundaryReportDigestPlainText(model);

    expect(text).toContain('statusLevel: ok');
    expect(text).toContain('Generated Target Comparison Report');
  });
});
