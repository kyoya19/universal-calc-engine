import { describe, expect, it } from 'vitest';
import {
  auditTransitionProbabilityTotals,
  DefinitionModel,
  expandModel
} from '../src/model';

function auditModel(model: DefinitionModel) {
  return auditTransitionProbabilityTotals(expandModel(model));
}

describe('auditTransitionProbabilityTotals', () => {
  it('reports valid probability totals without changing solver validation behavior', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.25 },
        { from: 'start', to: 'lose', probability: { type: 'constant', value: 0.75 } }
      ]
    });

    expect(audit.valid).toBe(true);
    expect(audit.invalidRows).toEqual([]);
    expect(audit.rows).toContainEqual(
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 2,
        probabilityTotal: 1,
        deviationFromOne: 0,
        terminal: false,
        valid: true
      })
    );
    expect(audit.rows).toContainEqual(
      expect.objectContaining({
        stateId: 'win',
        transitionCount: 0,
        terminal: true,
        valid: true
      })
    );
  });

  it('reports invalid non-terminal totals without throwing', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });

    expect(audit.valid).toBe(false);
    expect(audit.invalidRows).toHaveLength(1);
    expect(audit.invalidRows).toEqual([
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 2,
        probabilityTotal: 0.8,
        deviationFromOne: -0.19999999999999996,
        terminal: false,
        valid: false
      })
    ]);
  });
});
