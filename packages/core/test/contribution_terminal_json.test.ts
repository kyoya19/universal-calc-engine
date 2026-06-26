import { describe, expect, test } from 'vitest';
import * as core from '../src';
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

  test('returns parseable JSON text from the contribution result JSON helper', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const jsonText = contributionResultToJson(contributions);
    const parsed = JSON.parse(jsonText);

    expect(jsonText.trim().startsWith('{')).toBe(true);
    expect(parsed.transitionContributionsByState[positionStateId(3)]).toEqual([]);
  });

  test('exposes JSON helpers from the public entrypoint', () => {
    const evaluated = core.evaluateModel(core.expandModel(representativeSugorokuModel));
    const solved = core.solveExpectedReward(evaluated);
    const contributions = core.toContributionResult(evaluated, solved);
    const serialized = core.serializeContributionResult(contributions);

    expect(serialized.transitionContributionsByState[positionStateId(3)]).toEqual([]);
    expect(JSON.parse(core.contributionResultToJson(contributions))).toEqual(serialized);
  });
});