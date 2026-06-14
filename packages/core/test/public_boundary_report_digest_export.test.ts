import { describe, expect, it } from 'vitest';
import { definitionModelToBoundaryReportDigest } from '../src';

describe('public boundary report digest export', () => {
  it('exports boundary report digest helper from the package entrypoint', () => {
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

    expect(digest.reports).toHaveLength(3);
    expect(digest.reportText).toContain('State Graph Summary');
    expect(digest.statusOverview.level).toBe('ok');
  });
});
