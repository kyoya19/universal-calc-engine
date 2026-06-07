import { describe, expect, test } from 'vitest';
import {
  ContributionResult,
  contributionResultToTex,
  evaluateModel,
  expandGraphFromModel,
  expandModel,
  outputResultToTex,
  outputResultToValueFunctionTex,
  solveExpectedReward,
  summarizeStateGraph,
  toContributionResult,
  toOutputResult
} from '../src';
import {
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel,
  representativeSugorokuStartExpectedReward
} from './fixtures/sugoroku';

describe('Sugoroku PoC v0.3 completion checklist', () => {
  test('keeps the representative explicit-only solver pipeline complete', () => {
    const expanded = expandModel(representativeSugorokuModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const contributions: ContributionResult = toContributionResult(evaluated, solved);
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const summary = summarizeStateGraph(graph);

    expect(output.expectedReward).toBe(representativeSugorokuStartExpectedReward);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(0)]);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(1)]);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(2)]);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(3)]);

    expect(contributions.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: representativeSugorokuExpectedRewardByState[positionStateId(1)],
        contribution: 1.25
      },
      {
        to: positionStateId(2),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: representativeSugorokuExpectedRewardByState[positionStateId(2)],
        contribution: 1
      }
    ]);

    expect(outputResultToTex(output)).toContain('E[\\mathrm{state:\\{position=0\\}}] &= 2.25');
    expect(outputResultToValueFunctionTex(output)).toContain('V(\\mathrm{state:\\{position=0\\}}) &= 2.25');
    expect(contributionResultToTex(contributions)).toContain('\\text{from} & \\text{to} & p & r');

    expect(summary.stateCount).toBe(4);
    expect(summary.generatedStateCount).toBe(3);
    expect(summary.edgeCount).toBe(6);
    expect(summary.edgeWithGeneratedTargetCount).toBe(6);
    expect(summary.explicitGeneratedMatchCount).toBe(6);
    expect(summary.explicitGeneratedMismatchCount).toBe(0);
    expect(summary.diagnosticCountsByType.explicit_generated_mismatch).toBe(0);
  });
});
