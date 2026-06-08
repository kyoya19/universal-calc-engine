import { describe, expect, test } from 'vitest';
import {
  evaluateModel,
  expandGraphFromModel,
  expandModel,
  serializeStateGraphSummary,
  solveExpectedReward,
  summarizeStateGraph,
  toContributionResult
} from '../src';
import { explicitGeneratedMismatchSugorokuModel } from './fixtures/mismatch_sugoroku';
import { positionStateId } from './fixtures/sugoroku';

describe('explicit/generated mismatch diagnostics', () => {
  test('reports mismatch without changing explicit-only solver or contribution targets', () => {
    const expanded = expandModel(explicitGeneratedMismatchSugorokuModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);
    const graph = expandGraphFromModel(explicitGeneratedMismatchSugorokuModel);
    const summary = summarizeStateGraph(graph);
    const serialized = serializeStateGraphSummary(summary);

    expect(solved.expectedRewardByState.get(positionStateId(0))).toBe(7);
    expect(contributions.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 1,
        reward: 7,
        downstreamExpectedReward: 0,
        contribution: 7
      }
    ]);

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0]).toMatchObject({
      from: positionStateId(0),
      explicitTo: positionStateId(1),
      generatedTo: positionStateId(2)
    });
    expect(graph.diagnostics).toEqual([
      expect.objectContaining({
        type: 'explicit_generated_mismatch',
        stateId: positionStateId(0)
      })
    ]);
    expect(serialized.explicitGeneratedMatchCount).toBe(0);
    expect(serialized.explicitGeneratedMismatchCount).toBe(1);
    expect(serialized.diagnosticCountsByType.explicit_generated_mismatch).toBe(1);
  });
});
