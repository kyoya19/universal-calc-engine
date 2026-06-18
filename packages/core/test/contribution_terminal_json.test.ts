import { describe, expect, test } from 'vitest';
import { evaluateModel, expandModel, solveExpectedReward, toContributionResult } from '../src';
import { positionStateId, representativeSugorokuModel } from './fixtures/sugoroku';

describe('terminal contribution JSON boundary', () => {
  test('keeps terminal contribution rows empty after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const serialized = JSON.parse(JSON.stringify(contributions));

    expect(serialized.transitionContributionsByState[positionStateId(3)]).toEqual([]);
  });
});
