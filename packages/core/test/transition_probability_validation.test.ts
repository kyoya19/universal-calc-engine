import { describe, expect, test } from 'vitest';
import {
  auditTransitionProbabilityTotals,
  evaluateModel,
  expandModel,
  formatTransitionProbabilityTotalError,
  isTransitionProbabilityTotalValid
} from '../src';

describe('transition probability validation boundary', () => {
  test('keeps probability total validity tolerance unchanged', () => {
    expect(isTransitionProbabilityTotalValid(1)).toBe(true);
    expect(isTransitionProbabilityTotalValid(1 + 5e-10)).toBe(true);
    expect(isTransitionProbabilityTotalValid(1 + 2e-9)).toBe(false);
    expect(isTransitionProbabilityTotalValid(0.99, 0.02)).toBe(true);
    expect(isTransitionProbabilityTotalValid(0.97, 0.02)).toBe(false);
  });

  test('keeps evaluateModel probability error message unchanged', () => {
    const model = expandModel({
      startState: 's0',
      states: [
        { id: 's0' },
        { id: 's1', terminal: true }
      ],
      transitions: [
        { from: 's0', to: 's1', probability: 0.5 }
      ]
    });

    expect(() => evaluateModel(model)).toThrow(
      formatTransitionProbabilityTotalError('s0', 0.5)
    );
    expect(formatTransitionProbabilityTotalError('s0', 0.5)).toBe(
      'Transition probabilities from s0 sum to 0.5, not 1'
    );
  });

  test('keeps audit invalid row behavior unchanged', () => {
    const model = expandModel({
      startState: 's0',
      states: [
        { id: 's0' },
        { id: 's1', terminal: true }
      ],
      transitions: [
        { from: 's0', to: 's1', probability: 0.5 }
      ]
    });

    const audit = auditTransitionProbabilityTotals(model);

    expect(audit.valid).toBe(false);
    expect(audit.invalidRows).toEqual([
      {
        stateId: 's0',
        transitionCount: 1,
        probabilityTotal: 0.5,
        deviationFromOne: -0.5,
        terminal: false,
        valid: false
      }
    ]);
  });

  test('keeps terminal-state audit exemption unchanged', () => {
    const model = expandModel({
      startState: 's0',
      states: [
        { id: 's0', terminal: true }
      ],
      transitions: []
    });

    expect(auditTransitionProbabilityTotals(model)).toEqual({
      rows: [
        {
          stateId: 's0',
          transitionCount: 0,
          probabilityTotal: 0,
          deviationFromOne: -1,
          terminal: true,
          valid: true
        }
      ],
      invalidRows: [],
      valid: true
    });
  });
});
