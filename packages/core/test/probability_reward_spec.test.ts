import { describe, expect, test } from 'vitest';
import {
  type ProbabilitySpec,
  type RewardSpec,
  evaluateModel,
  evaluateProbabilitySpec,
  evaluateRewardSpec,
  expandModel,
  serializeProbabilitySpec,
  serializeRewardSpec
} from '../src';

describe('ProbabilitySpec and RewardSpec boundaries', () => {
  test('keeps probability evaluation aligned with scalar evaluation', () => {
    const rawProbability: ProbabilitySpec = 0.5;
    const constantProbability: ProbabilitySpec = { type: 'constant', value: 0.25 };

    expect(evaluateProbabilitySpec(rawProbability)).toBe(0.5);
    expect(evaluateProbabilitySpec(constantProbability)).toBe(0.25);
    expect(serializeProbabilitySpec(rawProbability)).toBe(0.5);
    expect(serializeProbabilitySpec(constantProbability)).toEqual({ type: 'constant', value: 0.25 });
  });

  test('keeps reward evaluation aligned with scalar evaluation', () => {
    const rawReward: RewardSpec = 2;
    const constantReward: RewardSpec = { type: 'constant', value: 3 };

    expect(evaluateRewardSpec(rawReward)).toBe(2);
    expect(evaluateRewardSpec(constantReward)).toBe(3);
    expect(serializeRewardSpec(rawReward)).toBe(2);
    expect(serializeRewardSpec(constantReward)).toEqual({ type: 'constant', value: 3 });
  });

  test('evaluates model transitions through separated probability and reward helpers', () => {
    const evaluated = evaluateModel(expandModel({
      startState: 's0',
      states: [
        { id: 's0' },
        { id: 's1', terminal: true }
      ],
      transitions: [
        {
          from: 's0',
          to: 's1',
          probability: { type: 'constant', value: 1 },
          reward: { type: 'constant', value: 4 }
        }
      ]
    }));

    expect(evaluated.transitions).toEqual([
      {
        from: 's0',
        to: 's1',
        probability: 1,
        reward: 4
      }
    ]);
  });
});
