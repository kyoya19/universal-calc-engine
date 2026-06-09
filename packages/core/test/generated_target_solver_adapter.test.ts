import { describe, expect, test } from 'vitest';
import { toContributionResult, toOutputResult } from '../src';
import {
  solveExpectedRewardWithGeneratedTargetGate,
  summarizeGeneratedTargetSolverGateResult
} from '../src/generated_target_solver_adapter';
import {
  positionStateId,
  representativeSugorokuExpectedRewardByState,
  representativeSugorokuModel,
  representativeSugorokuStartExpectedReward
} from './fixtures/sugoroku';

describe('generated target solver gated wrapper', () => {
  test('runs the existing explicit-target solver after generated-target validation succeeds', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const output = toOutputResult(representativeSugorokuModel, result.solvedModel);

    expect(output.expectedReward).toBe(representativeSugorokuStartExpectedReward);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(0)]);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(1)]);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(2)]);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(representativeSugorokuExpectedRewardByState[positionStateId(3)]);
  });

  test('summarizes an accepted generated-target gate result', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(summarizeGeneratedTargetSolverGateResult(result)).toEqual({
      accepted: true,
      edgeCount: result.graph.edges.length,
      generatedTargetReadyEdgeCount: result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length
    });
  });

  test('rejects before solving when a generated target is missing', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });

    expect(result).toMatchObject({
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

  test('summarizes a rejected generated-target gate result', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [transitionWithoutEffects, ...representativeSugorokuModel.transitions.slice(1)]
    });

    expect(summarizeGeneratedTargetSolverGateResult(result)).toEqual({
      accepted: false,
      edgeCount: result.graph.edges.length,
      generatedTargetReadyEdgeCount: result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length,
      rejectionCode: 'missing_generated_target',
      rejectionType: 'missing_generated_target',
      rejectionMessage: `Generated target is missing for edge from ${positionStateId(0)} to ${positionStateId(1)}`
    });
  });

  test('rejects before evaluating probabilities when a generated target is missing', () => {
    const { effects: _effects, ...transitionWithoutEffects } = representativeSugorokuModel.transitions[0]!;
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...transitionWithoutEffects, probability: 0.25 },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
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

  test('rejects before solving when explicit/generated targets mismatch', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1' },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
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

  test('rejects before evaluating probabilities when explicit/generated targets mismatch', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate({
      ...representativeSugorokuModel,
      transitions: [
        { ...representativeSugorokuModel.transitions[0]!, to: 'legacy_pos_1', probability: 0.25 },
        ...representativeSugorokuModel.transitions.slice(1)
      ]
    });

    expect(result).toMatchObject({
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

  test('keeps contribution output explicit-target based after the gate accepts', () => {
    const result = solveExpectedRewardWithGeneratedTargetGate(representativeSugorokuModel);

    expect(result.accepted).toBe(true);
    if (!result.accepted) {
      throw new Error('Expected generated-target gate to accept the representative Sugoroku model');
    }

    const contributions = toContributionResult(result.evaluatedModel, result.solvedModel);

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
});
