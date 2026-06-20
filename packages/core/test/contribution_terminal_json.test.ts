import { describe, expect, test } from 'vitest';
import {
  contributionResultToJson,
  evaluateModel,
  expandModel,
  serializeContributionResult,
  solveExpectedReward,
  toContributionResult
} from '../src';
import { positionStateId, representativeSugorokuModel } from './fixtures/sugoroku';

describe('terminal contribution JSON boundary', () => {
  test('keeps terminal contribution rows empty after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(serialized.transitionContributionsByState[positionStateId(3)]).toEqual([]);
  });

  test('keeps contribution state keys stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(Object.keys(serialized.transitionContributionsByState).sort()).toEqual(
      [positionStateId(0), positionStateId(1), positionStateId(2), positionStateId(3)].sort()
    );
  });

  test('keeps starting state contribution row count stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(serialized.transitionContributionsByState[positionStateId(0)]).toHaveLength(2);
  });

  test('keeps first contribution row values stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(serialized.transitionContributionsByState[positionStateId(0)][0]).toMatchObject({
      to: positionStateId(1),
      probability: 0.5,
      reward: 1,
      contribution: 1.25
    });
  });

  test('keeps all starting contribution row values stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(serialized.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1.5,
        contribution: 1.25
      },
      {
        to: positionStateId(2),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1,
        contribution: 1
      }
    ]);
  });

  test('serializes contribution result with a stable JSON helper shape', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = serializeContributionResult(contributions);
    const serializedRows = serialized.transitionContributionsByState[positionStateId(0)]!;
    const originalRows = contributions.transitionContributionsByState[positionStateId(0)]!;

    expect(Object.keys(serialized.transitionContributionsByState).sort()).toEqual(
      [positionStateId(0), positionStateId(1), positionStateId(2), positionStateId(3)].sort()
    );
    expect(serializedRows).toEqual(originalRows);
    expect(serializedRows).not.toBe(originalRows);
    expect(serializedRows[0]).not.toBe(originalRows[0]);
    expect(JSON.parse(contributionResultToJson(contributions))).toEqual(serialized);
  });
});
