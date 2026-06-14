import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportStatusSummary } from '../src';

describe('public boundary status summary export', () => {
  it('exports boundary status summary helper from the package entrypoint', () => {
    const summary = definitionModelToBoundaryReportStatusSummary({
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

    expect(summary.ok).toBeGreaterThan(0);
    expect(summary.info).toBeGreaterThan(0);
    expect(summary.warning).toBe(0);
    expect(summary.rejected).toBe(0);
  });
});
