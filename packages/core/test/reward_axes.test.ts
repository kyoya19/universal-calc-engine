import { describe, expect, it } from 'vitest';
import { solveExpectedReward } from '../src/model';
import {
  RewardAxesDefinitionModel,
  evaluateRewardAxesModel,
  expandRewardAxesModel,
  solveExpectedRewardAxes,
  toRewardAxesContributionResult,
  toRewardAxesOutputResult
} from '../src/reward_axes';

function evaluateDefinition(model: RewardAxesDefinitionModel) {
  return evaluateRewardAxesModel(expandRewardAxesModel(model));
}

describe('named reward axes', () => {
  it('keeps money, cost, and score on separate axes without changing legacy reward semantics', () => {
    const definition: RewardAxesDefinitionModel = {
      startState: 'start',
      rewardAxes: [
        { id: 'revenue', label: 'Revenue', unit: 'JPY', kind: 'benefit' },
        { id: 'cost', label: 'Operating cost', unit: 'JPY', kind: 'cost' },
        { id: 'score', label: 'Score', unit: 'points', kind: 'benefit' }
      ],
      states: [
        { id: 'start' },
        { id: 'success', terminal: true },
        { id: 'failure', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: 0.5,
          reward: 42,
          rewardsByAxis: {
            revenue: 1_000,
            cost: 200,
            score: 10
          }
        },
        {
          from: 'start',
          to: 'failure',
          probability: 0.5,
          reward: 42,
          rewardsByAxis: {
            revenue: 0,
            cost: 100,
            score: -2
          }
        }
      ]
    };

    const evaluated = evaluateDefinition(definition);
    const solved = solveExpectedRewardAxes(evaluated);
    const output = toRewardAxesOutputResult(definition, solved);
    const contributions = toRewardAxesContributionResult(evaluated, solved);

    expect(output.expectedRewardByAxis).toEqual({ revenue: 500, cost: 150, score: 4 });
    expect(output.rewardAxes).toEqual(definition.rewardAxes);
    expect(output.expectedRewardByAxisByState.revenue?.start).toBe(500);
    expect(output.expectedRewardByAxisByState.cost?.start).toBe(150);
    expect(output.expectedRewardByAxisByState.score?.start).toBe(4);

    const revenueRows = contributions.transitionContributionsByAxisByState.revenue?.start ?? [];
    const costRows = contributions.transitionContributionsByAxisByState.cost?.start ?? [];
    expect(revenueRows.reduce((sum, row) => sum + row.contribution, 0)).toBe(500);
    expect(costRows.reduce((sum, row) => sum + row.contribution, 0)).toBe(150);

    const legacy = solveExpectedReward(evaluated);
    expect(legacy.expectedRewardByState.get('start')).toBe(42);
  });

  it('includes downstream values independently for every reward axis', () => {
    const definition: RewardAxesDefinitionModel = {
      startState: 'start',
      rewardAxes: [
        { id: 'cash', unit: 'JPY', kind: 'benefit' },
        { id: 'time_penalty', unit: 'points', kind: 'cost' }
      ],
      states: [{ id: 'start' }, { id: 'mid' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'mid',
          probability: 1,
          rewardsByAxis: { cash: 100, time_penalty: 2 }
        },
        {
          from: 'mid',
          to: 'done',
          probability: 1,
          rewardsByAxis: { cash: 50, time_penalty: 3 }
        }
      ]
    };

    const solved = solveExpectedRewardAxes(evaluateDefinition(definition));

    expect(solved.expectedRewardByAxisByState.get('cash')?.get('mid')).toBe(50);
    expect(solved.expectedRewardByAxisByState.get('cash')?.get('start')).toBe(150);
    expect(solved.expectedRewardByAxisByState.get('time_penalty')?.get('mid')).toBe(3);
    expect(solved.expectedRewardByAxisByState.get('time_penalty')?.get('start')).toBe(5);
  });

  it('rejects transition values for undeclared reward axes', () => {
    const definition: RewardAxesDefinitionModel = {
      startState: 'start',
      rewardAxes: [{ id: 'cash', unit: 'JPY', kind: 'benefit' }],
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          rewardsByAxis: { score: 10 }
        }
      ]
    };

    expect(() => expandRewardAxesModel(definition)).toThrow(
      'Unknown reward axis on transition start -> done: score'
    );
  });
});
