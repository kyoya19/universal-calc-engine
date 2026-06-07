import { describe, expect, test } from 'vitest';
import {
  evaluateModel,
  expandModel,
  solveExpectedReward,
  toContributionResult
} from '../src/model';
import type { DefinitionModel } from '../src/model';

describe('explicit-only solver target behavior', () => {
  test('keeps solver and contribution targets on explicit transition.to', () => {
    const model: DefinitionModel = {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'explicit_win', terminal: true },
        { id: 'effects_candidate', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'explicit_win',
          probability: 1,
          reward: 7,
          effects: [{ type: 'set_property', property: 'result', value: 'effects_candidate' }]
        }
      ]
    };

    const evaluated = evaluateModel(expandModel(model));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const startContributions = contributions.transitionContributionsByState['start']!;

    expect(solved.expectedRewardByState.get('start')).toBe(7);
    expect(startContributions).toHaveLength(1);
    expect(startContributions[0]).toEqual({
      to: 'explicit_win',
      probability: 1,
      reward: 7,
      downstreamExpectedReward: 0,
      contribution: 7
    });
  });
});
