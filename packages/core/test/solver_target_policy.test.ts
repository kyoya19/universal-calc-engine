import { describe, expect, test } from 'vitest';
import {
  evaluateModel,
  expandModel,
  selectSolverTransitionTarget,
  solveExpectedReward,
  toContributionResult
} from '../src/model';
import type { DefinitionModel } from '../src/model';

describe('solver target policy', () => {
  test('selects transition.to for the explicit-only solver policy', () => {
    expect(selectSolverTransitionTarget({ to: 'legacy_target' })).toBe('legacy_target');
    expect(selectSolverTransitionTarget({ to: 'legacy_target' }, 'explicit_only')).toBe('legacy_target');
  });

  test('keeps expected reward and contribution targets on explicit transition.to', () => {
    const model: DefinitionModel = {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'legacy_win', terminal: true },
        { id: 'generated_win', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'legacy_win',
          probability: 1,
          reward: 7,
          effects: [{ type: 'set_property', property: 'position', value: 'generated_win' }]
        }
      ]
    };

    const evaluated = evaluateModel(expandModel(model));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);

    expect(solved.expectedRewardByState.get('start')).toBe(7);
    expect(contributions.transitionContributionsByState['start']).toEqual([
      {
        to: 'legacy_win',
        probability: 1,
        reward: 7,
        downstreamExpectedReward: 0,
        contribution: 7
      }
    ]);
  });
});
