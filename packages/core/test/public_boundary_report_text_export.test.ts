import { describe, expect, it } from 'vitest';
import {
  definitionModelToBoundaryReportPlainText,
  formatReportModelsPlainText
} from '../src';
import type { DefinitionModel } from '../src';

const model: DefinitionModel = {
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
};

describe('public boundary report text exports', () => {
  it('exports boundary report text helpers from the package entrypoint', () => {
    expect(typeof formatReportModelsPlainText).toBe('function');
    expect(typeof definitionModelToBoundaryReportPlainText).toBe('function');

    const text = definitionModelToBoundaryReportPlainText(model);

    expect(text).toContain('State Graph Summary');
    expect(text).toContain('Transition Probability Audit');
    expect(text).toContain('Generated Target Comparison Report');
  });

  it('keeps boundary report text helper output stable across repeated entrypoint calls', () => {
    const firstText = definitionModelToBoundaryReportPlainText(model);
    const secondText = definitionModelToBoundaryReportPlainText(model);

    expect(secondText).toBe(firstText);
  });
});
