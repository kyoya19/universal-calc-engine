import { describe, expect, it } from 'vitest';
import {
  evaluateDefinitionModel,
  evaluateExternalModelInput
} from '../src/forward_evaluation';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';
import { DefinitionModel } from '../src/model';
import { toForwardResultHandoff } from '../src/forward_result_handoff';

function baseDefinitionModel(): DefinitionModel {
  return {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'success', terminal: true },
      { id: 'failure', terminal: true }
    ],
    transitions: [
      {
        from: 'start',
        to: 'success',
        probability: 0.4,
        reward: 200,
        elapsedTime: { value: 2, unit: 'minutes' }
      },
      {
        from: 'start',
        to: 'failure',
        probability: 0.6,
        reward: 0,
        elapsedTime: { value: 2, unit: 'minutes' }
      }
    ]
  };
}

function externalDocumentFor(model: DefinitionModel) {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    model: {
      ...model,
      parameters: []
    }
  };
}

describe('typed DefinitionModel forward evaluation', () => {
  it('evaluates a valid DefinitionModel directly through the existing forward-v1 calculations', () => {
    const result = evaluateDefinitionModel(baseDefinitionModel(), {
      reachabilityTargets: ['success']
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'base') {
      return;
    }

    expect(result.validation.valid).toBe(true);
    expect(result.expectedReward.expectedReward).toBeCloseTo(80);
    expect(result.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(120);
    expect(result.rewardRate.rewardPerHour).toBeCloseTo(2400);
    expect(result.reachability?.probabilityFromStart).toBeCloseTo(0.4);
    expect(
      result.contribution.transitionContributionsByState.start?.[0]?.contribution
    ).toBeCloseTo(80);
    expect(result.diagnostics.expectedReward.converged).toBe(true);
    expect(result.diagnostics.expectedElapsedTime.converged).toBe(true);
  });

  it('matches the existing external-input path across reward, time, rate, contribution, reachability, and diagnostics', () => {
    const model = baseDefinitionModel();
    const options = {
      reachabilityTargets: ['success'],
      solver: { maxIterations: 50, tolerance: 1e-12 }
    } as const;

    const typed = evaluateDefinitionModel(model, options);
    const external = evaluateExternalModelInput(externalDocumentFor(model), options);

    expect(typed).toEqual(external);
  });

  it('returns the same structured model-validation failure as the external-input path', () => {
    const invalid: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 0.5 }]
    };

    const typed = evaluateDefinitionModel(invalid);
    const external = evaluateExternalModelInput(externalDocumentFor(invalid));

    expect(typed).toEqual(external);
    expect(typed.ok).toBe(false);
    if (typed.ok) {
      return;
    }
    expect(typed.stage).toBe('model_validation');
    expect(typed.issues[0]?.code).toBe('transition_probability_total');
    expect(typed.issues[0]?.path).toBe('$.model.states[id=start].transitions');
  });

  it('preserves existing evaluation-option failure semantics', () => {
    const model = baseDefinitionModel();
    const options = { solver: { tolerance: 0 } };

    const typed = evaluateDefinitionModel(model, options);
    const external = evaluateExternalModelInput(externalDocumentFor(model), options);

    expect(typed).toEqual(external);
    expect(typed.ok).toBe(false);
    if (typed.ok) {
      return;
    }
    expect(typed.stage).toBe('evaluation_options');
    expect(typed.issues[0]?.code).toBe('invalid_tolerance');
  });

  it('feeds the existing ForwardResultHandoff schemaVersion 1 without a new handoff type', () => {
    const result = evaluateDefinitionModel(baseDefinitionModel(), {
      reachabilityTargets: ['success']
    });
    const handoff = toForwardResultHandoff(result);

    expect(handoff.schemaVersion).toBe(1);
    expect(handoff.kind).toBe('forward_evaluation_handoff');
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }
    expect(handoff.modelKind).toBe('base');
    expect(handoff.expectedReward.expectedReward).toBeCloseTo(80);
    expect(handoff.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(120);
    expect(handoff.reachability?.probabilityFromStart).toBeCloseTo(0.4);
  });

  it('connects fixed-policy decision materialization end-to-end to ForwardEvaluationResult and handoff', () => {
    type ResourceState = { remaining: number };
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 2 },
      stateKey: (state) => `remaining:${state.remaining}`,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['consume'],
      outcomes: (state) => {
        if (state.remaining === 2) {
          return [
            {
              probability: 0.5,
              nextState: { remaining: 1 },
              reward: 1,
              elapsedTimeSeconds: 10
            },
            {
              probability: 0.5,
              nextState: { remaining: 0 },
              reward: 0,
              elapsedTimeSeconds: 10
            }
          ];
        }
        return [
          {
            probability: 1,
            nextState: { remaining: 0 },
            reward: 2,
            elapsedTimeSeconds: 10
          }
        ];
      }
    };
    const policy = { selectAction: () => 'consume' };

    const direct = evaluateFiniteDecisionPolicy(process, policy);
    const materialized = materializeFiniteDecisionPolicy(process, policy);

    expect(direct.ok).toBe(true);
    expect(materialized.ok).toBe(true);
    if (!direct.ok || !materialized.ok) {
      return;
    }

    const forward = evaluateDefinitionModel(materialized.model, {
      reachabilityTargets: ['remaining:0']
    });

    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.modelKind !== 'base') {
      return;
    }

    expect(forward.expectedReward.expectedReward).toBeCloseTo(direct.expectedReward);
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      direct.expectedElapsedTimeSeconds
    );
    expect(forward.expectedReward.expectedReward).toBeCloseTo(1.5);
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(15);
    expect(forward.rewardRate.rewardPerHour).toBeCloseTo(360);
    expect(forward.reachability?.probabilityFromStart).toBeCloseTo(1);
    expect(forward.contribution.transitionContributionsByState['remaining:2']).toHaveLength(2);

    const handoff = toForwardResultHandoff(forward);
    expect(handoff.schemaVersion).toBe(1);
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }
    expect(handoff.expectedReward.expectedReward).toBeCloseTo(direct.expectedReward);
    expect(handoff.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      direct.expectedElapsedTimeSeconds
    );
  });
});
