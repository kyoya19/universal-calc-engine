import { describe, expect, it } from 'vitest';
import { evaluateAcyclicDirectDefinitionModel } from '../src/acyclic_direct_forward_evaluation';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import {
  evaluateDefinitionModelWithSolver,
  ForwardSolverRequest
} from '../src/forward_solver_dispatcher';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';
import { DefinitionModel } from '../src/model';

function acyclicModel(): DefinitionModel {
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

function invalidModel(): DefinitionModel {
  return {
    startState: 'start',
    states: [{ id: 'start' }, { id: 'done', terminal: true }],
    transitions: [{ from: 'start', to: 'done', probability: 0.5 }]
  };
}

describe('typed forward solver dispatcher', () => {
  it('delegates explicit iterative requests exactly to evaluateDefinitionModel', () => {
    const model = acyclicModel();
    const options = {
      reachabilityTargets: ['success'],
      solver: { maxIterations: 100, tolerance: 1e-12 }
    };
    const dispatched = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'iterative',
      options
    });
    const directCall = evaluateDefinitionModel(model, options);

    expect(dispatched.solverMethod).toBe('iterative');
    expect(dispatched.result).toEqual(directCall);
  });

  it('delegates explicit acyclic_direct requests exactly to the direct forward adapter', () => {
    const model = acyclicModel();
    const options = { reachabilityTargets: ['success'] };
    const dispatched = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'acyclic_direct',
      options
    });
    const directCall = evaluateAcyclicDirectDefinitionModel(model, options);

    expect(dispatched.solverMethod).toBe('acyclic_direct');
    expect(dispatched.result).toEqual(directCall);
  });

  it('keeps iterative and direct method identity and diagnostics distinct while matching forward outputs', () => {
    const model = acyclicModel();
    const iterative = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'iterative',
      options: { reachabilityTargets: ['success'] }
    });
    const direct = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'acyclic_direct',
      options: { reachabilityTargets: ['success'] }
    });

    expect(iterative.solverMethod).toBe('iterative');
    expect(direct.solverMethod).toBe('acyclic_direct');
    expect(iterative.result.ok).toBe(true);
    expect(direct.result.ok).toBe(true);
    if (
      !iterative.result.ok ||
      iterative.result.modelKind !== 'base' ||
      !direct.result.ok
    ) {
      return;
    }

    expect(direct.result.expectedReward).toEqual(iterative.result.expectedReward);
    expect(direct.result.expectedElapsedTime).toEqual(iterative.result.expectedElapsedTime);
    expect(direct.result.rewardRate).toEqual(iterative.result.rewardRate);
    expect(direct.result.contribution).toEqual(iterative.result.contribution);
    expect(direct.result.reachability).toEqual(iterative.result.reachability);

    expect(iterative.result.diagnostics.expectedReward.converged).toBe(true);
    expect(direct.result.diagnostics.solverMethod).toBe(
      'topological_reverse_dynamic_programming'
    );
    expect('iterations' in direct.result.diagnostics).toBe(false);
    expect('converged' in direct.result.diagnostics).toBe(false);
  });

  it('does not fall back from explicit acyclic_direct to iteration when a cycle is detected', () => {
    const cycle: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };

    const direct = evaluateDefinitionModelWithSolver(cycle, {
      solverMethod: 'acyclic_direct'
    });
    const iterative = evaluateDefinitionModelWithSolver(cycle, {
      solverMethod: 'iterative',
      options: { solver: { maxIterations: 10, tolerance: 1e-12 } }
    });

    expect(direct.solverMethod).toBe('acyclic_direct');
    expect(direct.result.ok).toBe(false);
    if (!direct.result.ok) {
      expect(direct.result.failure.code).toBe('cycle_detected');
    }

    expect(iterative.solverMethod).toBe('iterative');
    expect(iterative.result.ok).toBe(true);
  });

  it('preserves each underlying invalid-model failure shape', () => {
    const model = invalidModel();
    const iterative = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'iterative'
    });
    const direct = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'acyclic_direct'
    });

    expect(iterative.result).toEqual(evaluateDefinitionModel(model));
    expect(direct.result).toEqual(evaluateAcyclicDirectDefinitionModel(model));

    expect(iterative.result.ok).toBe(false);
    if (!iterative.result.ok) {
      expect(iterative.result.stage).toBe('model_validation');
    }

    expect(direct.result.ok).toBe(false);
    if (!direct.result.ok) {
      expect(direct.result.failure.code).toBe('model_validation_failed');
    }
  });

  it('preserves each underlying unknown-reachability-target failure shape', () => {
    const model = acyclicModel();
    const iterative = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'iterative',
      options: { reachabilityTargets: ['missing'] }
    });
    const direct = evaluateDefinitionModelWithSolver(model, {
      solverMethod: 'acyclic_direct',
      options: { reachabilityTargets: ['missing'] }
    });

    expect(iterative.result.ok).toBe(false);
    if (!iterative.result.ok) {
      expect(iterative.result.stage).toBe('evaluation_options');
      expect(iterative.result.issues[0]?.code).toBe('unknown_reachability_target');
    }

    expect(direct.result.ok).toBe(false);
    if (!direct.result.ok) {
      expect(direct.result.failure.code).toBe('unknown_reachability_target');
    }
  });

  it('keeps solverMethod mandatory in the typed request contract', () => {
    const requests: ForwardSolverRequest[] = [
      { solverMethod: 'iterative' },
      { solverMethod: 'acyclic_direct' }
    ];

    expect(requests.map((request) => request.solverMethod)).toEqual([
      'iterative',
      'acyclic_direct'
    ]);
  });

  it('connects decision materialization to both explicit solver methods with output parity', () => {
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

    const iterative = evaluateDefinitionModelWithSolver(materialized.model, {
      solverMethod: 'iterative',
      options: { reachabilityTargets: ['remaining:0'] }
    });
    const direct = evaluateDefinitionModelWithSolver(materialized.model, {
      solverMethod: 'acyclic_direct',
      options: { reachabilityTargets: ['remaining:0'] }
    });

    expect(iterative.result.ok).toBe(true);
    expect(direct.result.ok).toBe(true);
    if (
      !iterative.result.ok ||
      iterative.result.modelKind !== 'base' ||
      !direct.result.ok
    ) {
      return;
    }

    expect(direct.result.expectedReward).toEqual(iterative.result.expectedReward);
    expect(direct.result.expectedElapsedTime).toEqual(iterative.result.expectedElapsedTime);
    expect(direct.result.rewardRate).toEqual(iterative.result.rewardRate);
    expect(direct.result.contribution).toEqual(iterative.result.contribution);
    expect(direct.result.reachability).toEqual(iterative.result.reachability);
    expect(direct.result.expectedReward.expectedReward).toBeCloseTo(p0.expectedReward);
    expect(direct.result.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      p0.expectedElapsedTimeSeconds
    );
  });
});
