import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportDigest,
  definitionModelToBoundaryReportDigestIsOk,
  isBoundaryReportDigestOk
} from '../src';

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

describe('public boundary report checks export', () => {
  it('exports boundary report check helpers from the package entrypoint', () => {
    expect(isBoundaryReportDigestOk(definitionModelToBoundaryReportDigest(model))).toBe(true);
    expect(definitionModelToBoundaryReportDigestIsOk(model)).toBe(true);
  });
});
