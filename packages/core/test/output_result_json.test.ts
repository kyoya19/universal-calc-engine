import { describe, expect, test } from 'vitest';
import * as core from '../src';
import {
  evaluateModel,
  expandModel,
  outputResultToJson,
  serializeOutputResult,
  solveExpectedReward,
  toOutputResult
} from '../src';
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

  test('keeps output expected reward state keys stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const serialized = JSON.parse(JSON.stringify(output));

    expect(Object.keys(serialized.expectedRewardByState).sort()).toEqual(
      [positionStateId(0), positionStateId(1), positionStateId(2), positionStateId(3)].sort()
    );
  });

  test('serializes output result with a stable JSON helper shape', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const serialized = serializeOutputResult(output);

    expect(serialized).toEqual({
      startState: positionStateId(0),
      expectedReward: representativeSugorokuStartExpectedReward,
      expectedRewardByState: representativeSugorokuExpectedRewardByState
    });
    expect(serialized.expectedRewardByState).not.toBe(output.expectedRewardByState);
    expect(JSON.parse(outputResultToJson(output))).toEqual(serialized);
  });

  test('exposes output JSON helpers from the public entrypoint', () => {
    const evaluated = core.evaluateModel(core.expandModel(representativeSugorokuModel));
    const solved = core.solveExpectedReward(evaluated);
    const output = core.toOutputResult(representativeSugorokuModel, solved);
    const serialized = core.serializeOutputResult(output);

    expect(serialized.expectedReward).toBe(representativeSugorokuStartExpectedReward);
    expect(JSON.parse(core.outputResultToJson(output))).toEqual(serialized);
  });
});
