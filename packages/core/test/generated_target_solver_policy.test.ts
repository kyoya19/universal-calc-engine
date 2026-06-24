import { describe, expect, test } from 'vitest';
import * as core from '../src';
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
  generatedTargetSolverPlanningValidationResultToJson,
  requireGeneratedMatchPlanningDecision,
  serializeGeneratedTargetSolverPlanningDecision,
  serializeGeneratedTargetSolverPlanningEdge,
  serializeGeneratedTargetSolverPlanningRejection,
  serializeGeneratedTargetSolverPlanningValidationResult,
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

  test('keeps accepted planning decisions stable after JSON serialization', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const decision = validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = JSON.parse(JSON.stringify(decision));

    expect(serializedDecision).toEqual({ accepted: true });
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

  test('keeps missing generated target rejections stable after JSON serialization', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const decision = validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = JSON.parse(JSON.stringify(decision));

    expect(serializedDecision).toMatchObject({
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

  test('keeps generated match planning policy stable after JSON serialization', () => {
    const serializedPolicy = JSON.parse(JSON.stringify(requireGeneratedMatchPlanningDecision));

    expect(serializedPolicy).toMatchObject({
      expectedRewardBaseline: 'must_remain_unchanged',
      contributionOutput: 'report_explicit_target'
    });
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

  test('exposes planning boundary from the public entrypoint', () => {
    const graph = core.expandGraphFromModel(representativeSugorokuModel);
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);

    expect(decision).toEqual({ accepted: true });
    expect(core.requireGeneratedMatchPlanningDecision).toMatchObject({
      policy: 'require_generated_match',
      missingGeneratedTarget: 'reject',
      explicitGeneratedMismatch: 'reject'
    });
  });

  test('keeps public entrypoint accepted planning decisions stable after JSON serialization', () => {
    const graph = core.expandGraphFromModel(representativeSugorokuModel);
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = JSON.parse(JSON.stringify(decision));

    expect(serializedDecision).toEqual({ accepted: true });
  });

  test('keeps public entrypoint planning policy stable after JSON serialization', () => {
    const serializedPolicy = JSON.parse(JSON.stringify(core.requireGeneratedMatchPlanningDecision));

    expect(serializedPolicy).toMatchObject({
      policy: 'require_generated_match',
      missingGeneratedTarget: 'reject',
      explicitGeneratedMismatch: 'reject',
      expectedRewardBaseline: 'must_remain_unchanged',
      contributionOutput: 'report_explicit_target'
    });
  });

  test('keeps public entrypoint planning policy values aligned with the canonical policy', () => {
    expect(core.requireGeneratedMatchPlanningDecision).toMatchObject(requireGeneratedMatchPlanningDecision);
  });

  test('exposes explicit-only graph target selection from the public entrypoint', () => {
    const graph = core.expandGraphFromModel({
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
    expect(core.selectGraphTarget(firstEdge)).toBe('legacy_pos_1');
    expect(core.selectGraphTarget(firstEdge, 'diagnostics_only')).toBe('legacy_pos_1');
  });

  test('exposes rejection planning decisions from the public entrypoint', () => {
    const graph = core.expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);

    expect(decision).toMatchObject({
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

  test('keeps public entrypoint rejection decisions stable after JSON serialization', () => {
    const graph = core.expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);
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

  test('exposes missing generated target rejections from the public entrypoint', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const graph = core.expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);

    expect(decision).toMatchObject({
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

  test('keeps public entrypoint missing generated target rejections stable after JSON serialization', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const graph = core.expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const decision = core.validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = JSON.parse(JSON.stringify(decision));

    expect(serializedDecision).toMatchObject({
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

  test('serializes planning decisions through the helper as a stable copy', () => {
    const serializedDecision = serializeGeneratedTargetSolverPlanningDecision(requireGeneratedMatchPlanningDecision);

    expect(serializedDecision).toEqual(requireGeneratedMatchPlanningDecision);
    expect(serializedDecision).not.toBe(requireGeneratedMatchPlanningDecision);
  });

  test('serializes planning edges without changing explicit/generated target meaning', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const firstEdge = graph.edges[0]!;
    const serializedEdge = serializeGeneratedTargetSolverPlanningEdge(firstEdge);

    expect(serializedEdge).toEqual(firstEdge);
    expect(serializedEdge).not.toBe(firstEdge);
    expect(serializedEdge.transition).toEqual(firstEdge.transition);
    expect(serializedEdge.transition).not.toBe(firstEdge.transition);
    expect(serializedEdge.generatedTo).toBe(positionStateId(1));
    expect(selectGraphTarget(serializedEdge)).toBe(positionStateId(1));
  });

  test('serializes accepted validation results through helpers and JSON', () => {
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const result = validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedResult = serializeGeneratedTargetSolverPlanningValidationResult(result);

    expect(serializedResult).toEqual({ accepted: true });
    expect(serializedResult).not.toBe(result);
    expect(JSON.parse(generatedTargetSolverPlanningValidationResultToJson(result))).toEqual({ accepted: true });
  });

  test('serializes missing generated target rejections through helpers and JSON', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });
    const result = validateGeneratedTargetSolverPlanningBoundary(graph);

    expect(result.accepted).toBe(false);
    if (result.accepted) {
      throw new Error('Expected a missing generated target rejection');
    }

    const serializedRejection = serializeGeneratedTargetSolverPlanningRejection(result.rejection);
    const serializedResult = serializeGeneratedTargetSolverPlanningValidationResult(result);

    expect(serializedRejection).toMatchObject({
      type: 'missing_generated_target',
      edge: {
        from: positionStateId(0),
        explicitTo: positionStateId(1)
      }
    });
    expect(serializedRejection).not.toBe(result.rejection);
    expect(serializedResult).toMatchObject({
      accepted: false,
      rejection: {
        type: 'missing_generated_target',
        edge: {
          from: positionStateId(0),
          explicitTo: positionStateId(1)
        }
      }
    });
    expect(JSON.parse(generatedTargetSolverPlanningValidationResultToJson(result))).toMatchObject({
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

  test('serializes explicit/generated mismatch rejections through helpers and JSON', () => {
    const graph = expandGraphFromModel({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });
    const result = validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedResult = serializeGeneratedTargetSolverPlanningValidationResult(result);

    expect(serializedResult).toMatchObject({
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
    expect(JSON.parse(generatedTargetSolverPlanningValidationResultToJson(result))).toMatchObject({
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

  test('exposes generated target planning serialization helpers from the public entrypoint', () => {
    const graph = core.expandGraphFromModel(representativeSugorokuModel);
    const result = core.validateGeneratedTargetSolverPlanningBoundary(graph);
    const serializedDecision = core.serializeGeneratedTargetSolverPlanningDecision(core.requireGeneratedMatchPlanningDecision);
    const serializedResult = core.serializeGeneratedTargetSolverPlanningValidationResult(result);

    expect(serializedDecision).toMatchObject({
      policy: 'require_generated_match',
      expectedRewardBaseline: 'must_remain_unchanged',
      contributionOutput: 'report_explicit_target'
    });
    expect(serializedResult).toEqual({ accepted: true });
    expect(JSON.parse(core.generatedTargetSolverPlanningValidationResultToJson(result))).toEqual({ accepted: true });
  });
});
