import { describe, expect, test } from 'vitest';
import {
  evaluateModel,
  expandGraphFromModel,
  expandModel,
  selectGraphTarget,
  solveExpectedReward,
  toContributionResult,
  toOutputResult
} from '../src';
import {
  requireGeneratedMatchPlanningDecision,
  validateGeneratedTargetSolverPlanningBoundary
} from '../src/generated_target_solver_policy';
import {
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel,
  representativeSugorokuStartExpectedReward
} from './fixtures/sugoroku';

describe('generated target solver planning boundary', () => {
  test('accepts the representative Sugoroku graph when every explicit/generated target matches', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);

    expect(validateGeneratedTargetSolverPlanningBoundary(graph)).toEqual({ accepted: true });
  });

  test('rejects a missing generated target before solver runtime integration', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });

    expect(validateGeneratedTargetSolverPlanningBoundary(graph)).toMatchObject({
      accepted: false,
      rejection: {
        type: 'missing_generated_target',
        edge: {
          from: positionStateId(0),
          explicitTo: positionStateId(1)
        }
      }
    });
  });

  test('rejects an explicit/generated mismatch before solver runtime integration', () => {
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(validateGeneratedTargetSolverPlanningBoundary(graph)).toMatchObject({
      accepted: false,
      rejection: {
        type: 'explicit_generated_mismatch',
        edge: {
          from: positionStateId(0),
          explicitTo: 'legacy_pos_1',
          generatedTo: positionStateId(1)
        }
      }
    });
  });

  test('keeps rejected planning decisions stable after JSON serialization', () => {
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const decision = validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = JSON.parse(JSON.stringify(decision));

    expect(serializedDecision).toMatchObject({
      accepted: false,
      rejection: {
        type: 'explicit_generated_mismatch',
        edge: {
          from: positionStateId(0),
          explicitTo: 'legacy_pos_1',
          generatedTo: positionStateId(1)
        }
      }
    });
  });

  test('keeps graph target selection explicit-only during diagnostics-only planning', () => {
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const firstEdge = graph.edges[0]!;

    expect(firstEdge).toMatchObject({
      explicitTo: 'legacy_pos_1',
      generatedTo: positionStateId(1)
    });
    expect(selectGraphTarget(firstEdge)).toBe('legacy_pos_1');
    expect(selectGraphTarget(firstEdge, 'diagnostics_only')).toBe('legacy_pos_1');
  });

  test('keeps the representative expected reward baseline unchanged', () => {
    expect(requireGeneratedMatchPlanningDecision.expectedRewardBaseline).toBe('must_remain_unchanged');

    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);

    expect(output.expectedReward).toBe(representativeSugorokuStartExpectedReward);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(0)]);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(1)]);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(2)]);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(3)]);
  });

  test('keeps contribution output explicit-target based', () => {
    expect(requireGeneratedMatchPlanningDecision.contributionOutput).toBe('report_explicit_target');

    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const contributions = toContributionResult(evaluated, solved);

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
  });

  test('keeps solver output and contribution results stable after JSON serialization', () => {
    const evaluated = evaluateModel(expandModel(representativeSugorokuModel));
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const contributions = toContributionResult(evaluated, solved);

    const serializedOutput = JSON.parse(JSON.stringify(output));
    const serializedContributions = JSON.parse(JSON.stringify(contributions));

    expect(serializedOutput).toMatchObject({
      startState: representativeSugorokuModel.startState,
      expectedReward: representativeSugorokuStartExpectedReward,
      expectedRewardByState: {
        [positionStateId(0)]: representativeSugorokuExpectedRewardByState[positionStateId(0)],
        [positionStateId(1)]: representativeSugorokuExpectedRewardByState[positionStateId(1)],
        [positionStateId(2)]: representativeSugorokuExpectedRewardByState[positionStateId(2)],
        [positionStateId(3)]: representativeSugorokuExpectedRewardByState[positionStateId(3)]
      }
    });
    expect(serializedContributions.transitionContributionsByState[positionStateId(0)]).toEqual([
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
  });
});
