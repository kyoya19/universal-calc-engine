import { describe, expect, test } from 'vitest';
import { evaluateModel, expandModel, solveExpectedReward, toOutputResult } from '../src';
import {
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel,
  representativeSugorokuStartExpectedReward
} from './fixtures/sugoroku';

describe('output result JSON boundary', () => {
  test('keeps output result values stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const serialized = JSON.parse(JSON.stringify(output));

    expect(serialized).toEqual({
      startState: positionStateId(0),
      expectedReward: representativeSugorokuStartExpectedReward,
      expectedRewardByState: representativeSugorokuExpectedRewardByState
    });
  });
});
