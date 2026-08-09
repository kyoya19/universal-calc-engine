import { describe, expect, it } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime,
  solveExpectedReward
} from '../src/model';
import { toRewardRateResult } from '../src/reward_rate';

function evaluateDefinitionModel(model: DefinitionModel) {
  return evaluateModel(expandModel(model));
}

describe('toRewardRateResult', () => {
  it('reports the ratio of expected reward to expected elapsed time', () => {
    const definition: DefinitionModel = {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'fast', terminal: true },
        { id: 'slow', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'fast',
          probability: 0.5,
          reward: 100,
          elapsedTime: { value: 30, unit: 'minutes' }
        },
        {
          from: 'start',
          to: 'slow',
          probability: 0.5,
          reward: 500,
          elapsedTime: { value: 2, unit: 'hours' }
        }
      ]
    };
    const evaluated = evaluateDefinitionModel(definition);

    const result = toRewardRateResult(
      definition,
      solveExpectedReward(evaluated),
      solveExpectedElapsedTime(evaluated)
    );

    expect(result.expectedReward).toBe(300);
    expect(result.expectedElapsedTimeSeconds).toBe(4_500);
    expect(result.rewardPerSecond).toBeCloseTo(1 / 15);
    expect(result.rewardPerHour).toBeCloseTo(240);
    expect(result.rateKind).toBe('ratio_of_expectations');
  });

  it('returns null rates when expected elapsed time is zero', () => {
    const definition: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 1, reward: 10 }]
    };
    const evaluated = evaluateDefinitionModel(definition);

    const result = toRewardRateResult(
      definition,
      solveExpectedReward(evaluated),
      solveExpectedElapsedTime(evaluated)
    );

    expect(result.expectedReward).toBe(10);
    expect(result.expectedElapsedTimeSeconds).toBe(0);
    expect(result.rewardPerSecond).toBeNull();
    expect(result.rewardPerHour).toBeNull();
  });
});
