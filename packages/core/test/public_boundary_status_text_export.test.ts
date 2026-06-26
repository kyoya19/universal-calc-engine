import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusSummaryPlainText } from '../src';

describe('public boundary status text export', () => {
  it('exports boundary status text helper from the package entrypoint', () => {
    const text = definitionModelToBoundaryReportStatusSummaryPlainText({
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

    expect(text).toContain('ok:');
    expect(text).toContain('warning: 0');
    expect(text).toContain('rejected: 0');
    expect(text).toContain('info:');
  });

  it('keeps boundary status text helper output stable across repeated entrypoint calls', () => {
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
          effects: [{ type: 'set_property', property: 'step', value: 1 }]
        }
      ]
    };

    expect(definitionModelToBoundaryReportStatusSummaryPlainText(model)).toBe(
      definitionModelToBoundaryReportStatusSummaryPlainText(model)
    );
  });
});
