import { describe, expect, it } from 'vitest';
import { evaluateAcyclicDirectDefinitionModel } from '../src/acyclic_direct_forward_evaluation';
import { solveAcyclicDefinitionModel } from '../src/acyclic_direct_solver';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';
import { DefinitionModel } from '../src/model';

function sameTargetModel(): DefinitionModel {
  return {
    startState: 'start',
    states: [{ id: 'start' }, { id: 'done', terminal: true }],
    transitions: [
      {
        from: 'start',
        to: 'done',
        probability: 0.5,
        reward: 1,
        elapsedTime: { value: 2, unit: 'seconds' }
      },
      {
        from: 'start',
        to: 'done',
        probability: 0.5,
        reward: 3,
        elapsedTime: { value: 4, unit: 'seconds' }
      }
    ]
  };
}

function expectForwardParity(
  direct: ReturnType<typeof evaluateAcyclicDirectDefinitionModel>,
  iterative: ReturnType<typeof evaluateDefinitionModel>
): void {
  expect(direct.ok).toBe(true);
  expect(iterative.ok).toBe(true);
  if (!direct.ok || !iterative.ok || iterative.modelKind !== 'base') {
    return;
  }

  expect(direct.expectedReward).toEqual(iterative.expectedReward);
  expect(direct.expectedElapsedTime).toEqual(iterative.expectedElapsedTime);
  expect(direct.rewardRate).toEqual(iterative.rewardRate);
  expect(direct.contribution).toEqual(iterative.contribution);
  expect(direct.reachability).toEqual(iterative.reachability);
}

describe('acyclic direct forward evaluation', () => {
  it('adapts direct solver results through existing forward output, rate, contribution, and reachability semantics', () => {
    const model = sameTargetModel();
    const options = { reachabilityTargets: ['done'] };
    const directSolver = solveAcyclicDefinitionModel(model, options);
    const forward = evaluateAcyclicDirectDefinitionModel(model, options);

    expect(directSolver.ok).toBe(true);
    expect(forward.ok).toBe(true);
    if (!directSolver.ok || !forward.ok || directSolver.reachability === undefined) {
      return;
    }

    expect(forward.expectedReward.expectedReward).toBeCloseTo(2);
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(3);
    expect(forward.rewardRate.rewardPerHour).toBeCloseTo(2400);
    expect(forward.reachability?.probabilityFromStart).toBeCloseTo(1);
    expect(forward.contribution.transitionContributionsByState.start).toHaveLength(2);
    expect(forward.expectedReward.expectedReward).toBeCloseTo(
      directSolver.expectedReward.expectedRewardByState.get(model.startState) ?? 0
    );
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      directSolver.expectedElapsedTime.expectedElapsedTimeSecondsByState.get(model.startState) ?? 0
    );
    expect(forward.reachability?.probabilityFromStart).toBeCloseTo(
      directSolver.reachability.reachabilityProbabilityByState.get(model.startState) ?? 0
    );
    expect(forward.diagnostics).toEqual(directSolver.diagnostics);
    expect('iterations' in forward.diagnostics).toBe(false);
    expect('converged' in forward.diagnostics).toBe(false);
  });

  it('matches the existing iterative forward facade for acyclic output semantics', () => {
    const model = sameTargetModel();
    const options = { reachabilityTargets: ['done'] };

    expectForwardParity(
      evaluateAcyclicDirectDefinitionModel(model, options),
      evaluateDefinitionModel(model, options)
    );
  });

  it('preserves the zero-probability dependency boundary while retaining zero-weight contribution rows', () => {
    const model: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'start',
          probability: 0,
          reward: 999,
          elapsedTime: { value: 999, unit: 'seconds' }
        },
        {
          from: 'start',
          to: 'done',
          probability: 1,
          reward: 5,
          elapsedTime: { value: 2, unit: 'seconds' }
        }
      ]
    };
    const options = { reachabilityTargets: ['done'] };
    const direct = evaluateAcyclicDirectDefinitionModel(model, options);
    const iterative = evaluateDefinitionModel(model, options);

    expectForwardParity(direct, iterative);
    expect(direct.ok).toBe(true);
    if (!direct.ok) {
      return;
    }
    expect(direct.diagnostics.effectiveTransitionCount).toBe(1);
    expect(direct.contribution.transitionContributionsByState.start).toHaveLength(2);
    expect(direct.contribution.transitionContributionsByState.start?.[0]?.contribution).toBe(0);
  });

  it('preserves structured direct-solver failures without translating them into convergence failures', () => {
    const cycle: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };
    const invalid: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 0.5 }]
    };

    const cycleResult = evaluateAcyclicDirectDefinitionModel(cycle);
    const invalidResult = evaluateAcyclicDirectDefinitionModel(invalid);
    const unknownTargetResult = evaluateAcyclicDirectDefinitionModel(sameTargetModel(), {
      reachabilityTargets: ['missing']
    });

    expect(cycleResult.ok).toBe(false);
    expect(invalidResult.ok).toBe(false);
    expect(unknownTargetResult.ok).toBe(false);
    if (cycleResult.ok || invalidResult.ok || unknownTargetResult.ok) {
      return;
    }
    expect(cycleResult.failure.code).toBe('cycle_detected');
    expect(invalidResult.failure.code).toBe('model_validation_failed');
    expect(unknownTargetResult.failure.code).toBe('unknown_reachability_target');
  });

  it('keeps terminal outgoing-transition semantics aligned with the iterative forward facade', () => {
    const model: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        { from: 'start', to: 'done', probability: 1, reward: 5 },
        { from: 'done', to: 'done', probability: 1, reward: 999 }
      ]
    };
    const options = { reachabilityTargets: ['done'] };

    expectForwardParity(
      evaluateAcyclicDirectDefinitionModel(model, options),
      evaluateDefinitionModel(model, options)
    );
  });

  it('connects fixed-policy decision materialization to direct forward outputs and matches P0 plus iterative Kiyotan', () => {
    const process: FiniteDecisionProcess<number> = {
      startState: 2,
      stateKey: (state) => `remaining:${state}`,
      isTerminal: (state) => state === 0,
      actions: () => ['consume'],
      outcomes: (state) =>
        state === 2
          ? [
              {
                probability: 0.5,
                nextState: 1,
                reward: 1,
                elapsedTimeSeconds: 10
              },
              {
                probability: 0.5,
                nextState: 0,
                reward: 0,
                elapsedTimeSeconds: 10
              }
            ]
          : [
              {
                probability: 1,
                nextState: 0,
                reward: 2,
                elapsedTimeSeconds: 10
              }
            ]
    };
    const policy = { selectAction: () => 'consume' };
    const p0 = evaluateFiniteDecisionPolicy(process, policy);
    const materialized = materializeFiniteDecisionPolicy(process, policy);

    expect(p0.ok).toBe(true);
    expect(materialized.ok).toBe(true);
    if (!p0.ok || !materialized.ok) {
      return;
    }

    const options = { reachabilityTargets: ['remaining:0'] };
    const direct = evaluateAcyclicDirectDefinitionModel(materialized.model, options);
    const iterative = evaluateDefinitionModel(materialized.model, options);

    expectForwardParity(direct, iterative);
    expect(direct.ok).toBe(true);
    if (!direct.ok) {
      return;
    }
    expect(direct.expectedReward.expectedReward).toBeCloseTo(p0.expectedReward);
    expect(direct.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      p0.expectedElapsedTimeSeconds
    );
    expect(direct.expectedReward.expectedReward).toBeCloseTo(1.5);
    expect(direct.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(15);
    expect(direct.rewardRate.rewardPerHour).toBeCloseTo(360);
    expect(direct.reachability?.probabilityFromStart).toBeCloseTo(1);
  });
});
