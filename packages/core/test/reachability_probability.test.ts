import { describe, expect, it } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveReachabilityProbability
} from '../src/model';

function evaluateDefinitionModel(model: DefinitionModel) {
  return evaluateModel(expandModel(model));
}

describe('solveReachabilityProbability', () => {
  it('solves direct reachability probability to a target terminal state', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.25 },
        { from: 'start', to: 'lose', probability: 0.75 }
      ]
    });

    const result = solveReachabilityProbability(model, ['win']);

    expect(result.targetStates).toEqual(['win']);
    expect(result.reachabilityProbabilityByState.get('start')).toBe(0.25);
    expect(result.reachabilityProbabilityByState.get('win')).toBe(1);
    expect(result.reachabilityProbabilityByState.get('lose')).toBe(0);
  });

  it('solves reachability probability through an intermediate state', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'mid' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'mid', probability: 0.5 },
        { from: 'start', to: 'lose', probability: 0.5 },
        { from: 'mid', to: 'win', probability: 0.5 },
        { from: 'mid', to: 'lose', probability: 0.5 }
      ]
    });

    const result = solveReachabilityProbability(model, ['win']);

    expect(result.reachabilityProbabilityByState.get('start')).toBe(0.25);
    expect(result.reachabilityProbabilityByState.get('mid')).toBe(0.5);
    expect(result.reachabilityProbabilityByState.get('win')).toBe(1);
    expect(result.reachabilityProbabilityByState.get('lose')).toBe(0);
  });

  it('rejects unknown reachability target states', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 1 }]
    });

    expect(() => solveReachabilityProbability(model, ['missing'])).toThrow(
      'Unknown reachability target state: missing'
    );
  });
});
