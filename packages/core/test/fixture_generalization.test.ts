import { describe, expect, test } from 'vitest';
import { evaluateModel, expandModel, solveExpectedReward } from '../src';
import {
  buildLinearSugorokuFixture,
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel
} from './fixtures/sugoroku';

describe('sugoroku fixture generalization', () => {
  test('builds the representative fixture through the reusable builder', () => {
    const rebuilt = buildLinearSugorokuFixture({
      startPosition: 0,
      terminalPosition: 3,
      steps: [
        { from: 0, to: 1, probability: 0.5, reward: 1 },
        { from: 0, to: 2, probability: 0.5, reward: 1 },
        { from: 1, to: 2, probability: 0.5, reward: 1 },
        { from: 1, to: 3, probability: 0.5, reward: 1 },
        { from: 2, to: 3, probability: 0.5, reward: 1 },
        { from: 2, to: 3, probability: 0.5, reward: 1 }
      ]
    });

    expect(rebuilt).toEqual(representativeSugorokuModel);
  });

  test('keeps representative expected rewards unchanged', () => {
    const solved = solveExpectedReward(evaluateModel(expandModel(representativeSugorokuModel)));

    for (const [stateId, expectedReward] of Object.entries(representativeSugorokuExpectedRewardByState)) {
      expect(solved.expectedRewardByState.get(stateId)).toBe(expectedReward);
    }
  });

  test('creates sorted position states and set_property transition effects', () => {
    const model = buildLinearSugorokuFixture({
      startPosition: 0,
      terminalPosition: 4,
      steps: [
        { from: 2, to: 4, probability: 1, reward: 1 },
        { from: 0, to: 2, probability: 1, reward: 1 }
      ]
    });

    expect(model.states.map((state) => state.id)).toEqual([
      positionStateId(0),
      positionStateId(2),
      positionStateId(4)
    ]);
    expect(model.states.at(-1)).toEqual({
      id: positionStateId(4),
      properties: { position: 4 },
      terminalCondition: { type: 'property_equals', property: 'position', value: 4 }
    });
    expect(model.transitions.map((transition) => transition.effects)).toEqual([
      [{ type: 'set_property', property: 'position', value: 4 }],
      [{ type: 'set_property', property: 'position', value: 2 }]
    ]);
  });
});
