import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportPlainText,
  formatReportModelsPlainText
} from '../src';

describe('public boundary report text exports', () => {
  it('exports boundary report text helpers from the package entrypoint', () => {
    expect(typeof formatReportModelsPlainText).toBe('function');
    expect(typeof definitionModelToBoundaryReportPlainText).toBe('function');

    const text = definitionModelToBoundaryReportPlainText({
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

    expect(text).toContain('State Graph Summary');
    expect(text).toContain('Transition Probability Audit');
    expect(text).toContain('Generated Target Comparison Report');
  });
});
