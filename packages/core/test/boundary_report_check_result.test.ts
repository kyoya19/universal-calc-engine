import { describe, expect, it } from 'vitest';
import {
  boundaryReportDigestToCheckResult,
  definitionModelToBoundaryReportCheckResult
} from '../src/boundary_report_check_result';
import { definitionModelToBoundaryReportDigest } from '../src/boundary_report_digest';

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

describe('boundary report check result helpers', () => {
  it('builds a check result from a digest', () => {
    const result = boundaryReportDigestToCheckResult(definitionModelToBoundaryReportDigest(model));

    expect(result.ok).toBe(true);
    expect(result.digest.statusOverview.level).toBe('ok');
  });

  it('builds a check result from a definition model', () => {
    const result = definitionModelToBoundaryReportCheckResult(model);

    expect(result.ok).toBe(true);
    expect(result.digest.reports).toHaveLength(3);
  });
});
