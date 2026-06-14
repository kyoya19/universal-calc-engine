import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportDigest,
  definitionModelToBoundaryReportDigestPlainText,
  formatBoundaryReportDigestPlainText
} from '../src';

describe('public boundary report digest text exports', () => {
  it('exports boundary report digest text helpers from the package entrypoint', () => {
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

    const digest = definitionModelToBoundaryReportDigest(model);
    expect(formatBoundaryReportDigestPlainText(digest)).toContain('statusLevel: ok');
    expect(definitionModelToBoundaryReportDigestPlainText(model)).toContain('Generated Target Comparison Report');
  });
});
