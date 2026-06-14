import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportDigestIsOk,
  isBoundaryReportDigestOk
} from '../src/boundary_report_checks';
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

describe('boundary report checks', () => {
  it('checks a digest status level', () => {
    expect(isBoundaryReportDigestOk(definitionModelToBoundaryReportDigest(model))).toBe(true);
  });

  it('checks a definition model directly', () => {
    expect(definitionModelToBoundaryReportDigestIsOk(model)).toBe(true);
  });
});
