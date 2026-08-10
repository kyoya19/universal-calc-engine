import { describe, expect, it } from 'vitest';
import { solveAcyclicDefinitionModel } from '../src/acyclic_direct_solver';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime,
  solveExpectedReward,
  solveReachabilityProbability
} from '../src/model';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';

function expectNumberMapClose(
  actual: Map<string, number>,
  expected: Map<string, number>
): void {
  expect(actual.size).toBe(expected.size);
  for (const [stateId, expectedValue] of expected) {
    expect(actual.get(stateId)).toBeCloseTo(expectedValue);
  }
}

function sharedDagModel(): DefinitionModel {
  return {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'left' },
      { id: 'right' },
      { id: 'shared' },
      { id: 'done', terminal: true }
    ],
    transitions: [
      {
        from: 'start',
        to: 'left',
        probability: 0.5,
        reward: 1,
        elapsedTime: { value: 2, unit: 'seconds' }
      },
      {
        from: 'start',
        to: 'right',
        probability: 0.5,
        reward: 3,
        elapsedTime: { value: 4, unit: 'seconds' }
      },
      {
        from: 'left',
        to: 'shared',
        probability: 1,
        reward: 2,
        elapsedTime: { value: 5, unit: 'seconds' }
      },
      {
        from: 'right',
        to: 'shared',
        probability: 1,
        reward: 4,
        elapsedTime: { value: 6, unit: 'seconds' }
      },
      {
        from: 'shared',
        to: 'done',
        probability: 1,
        reward: 10,
        elapsedTime: { value: 7, unit: 'seconds' }
      }
    ]
  };
}

describe('acyclic direct DefinitionModel solver', () => {
  it('matches existing iterative reward, elapsed-time, and reachability solvers on a shared-state DAG', () => {
    const model = sharedDagModel();
    const direct = solveAcyclicDefinitionModel(model, {
      reachabilityTargets: ['done']
    });
    const evaluated = evaluateModel(expandModel(model));
    const reward = solveExpectedReward(evaluated);
    const elapsed = solveExpectedElapsedTime(evaluated);
    const reachability = solveReachabilityProbability(evaluated, ['done']);

    expect(direct.ok).toBe(true);
    if (!direct.ok || direct.reachability === undefined) {
      return;
    }

    expectNumberMapClose(direct.expectedReward.expectedRewardByState, reward.expectedRewardByState);
    expectNumberMapClose(
      direct.expectedElapsedTime.expectedElapsedTimeSecondsByState,
      elapsed.expectedElapsedTimeSecondsByState
    );
    expectNumberMapClose(
      direct.reachability.reachabilityProbabilityByState,
      reachability.reachabilityProbabilityByState
    );
    expect(direct.expectedReward.expectedRewardByState.get('start')).toBeCloseTo(15);
    expect(
      direct.expectedElapsedTime.expectedElapsedTimeSecondsByState.get('start')
    ).toBeCloseTo(15.5);
    expect(direct.reachability.reachabilityProbabilityByState.get('start')).toBeCloseTo(1);
    expect(direct.diagnostics.stateCount).toBe(5);
    expect(direct.diagnostics.topologicalStateCount).toBe(5);
    expect(direct.diagnostics.effectiveTransitionCount).toBe(5);
    expect(direct.diagnostics.dynamicProgrammingPasses).toBe(1);
    expect(direct.diagnostics.simulationUsed).toBe(false);
  });

  it('preserves same-target multiple transitions as separate Bellman terms', () => {
    const model: DefinitionModel = {
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

    const result = solveAcyclicDefinitionModel(model, {
      reachabilityTargets: ['done']
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.reachability === undefined) {
      return;
    }
    expect(result.expectedReward.expectedRewardByState.get('start')).toBeCloseTo(2);
    expect(
      result.expectedElapsedTime.expectedElapsedTimeSecondsByState.get('start')
    ).toBeCloseTo(3);
    expect(result.reachability.reachabilityProbabilityByState.get('start')).toBeCloseTo(1);
    expect(result.diagnostics.effectiveTransitionCount).toBe(2);
  });

  it('returns a structured cycle failure without falling back to iteration', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };

    const result = solveAcyclicDefinitionModel(model);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('cycle_detected');
    expect(result.failure.stateIds?.sort()).toEqual(['a', 'b']);
    expect(result.diagnostics.topologicalStateCount).toBe(0);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('ignores terminal outgoing transitions in the dependency graph exactly as existing solvers do', () => {
    const model: DefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        { from: 'start', to: 'done', probability: 1, reward: 5 },
        { from: 'done', to: 'done', probability: 1, reward: 999 }
      ]
    };

    const result = solveAcyclicDefinitionModel(model, {
      reachabilityTargets: ['done']
    });
    const evaluated = evaluateModel(expandModel(model));
    const iterative = solveExpectedReward(evaluated);

    expect(result.ok).toBe(true);
    if (!result.ok || result.reachability === undefined) {
      return;
    }
    expect(result.validation.warnings.some((issue) => issue.code === 'terminal_state_has_transitions')).toBe(true);
    expect(result.expectedReward.expectedRewardByState.get('start')).toBeCloseTo(5);
    expect(result.expectedReward.expectedRewardByState.get('done')).toBe(0);
    expectNumberMapClose(result.expectedReward.expectedRewardByState, iterative.expectedRewardByState);
    expect(result.diagnostics.effectiveTransitionCount).toBe(1);
  });

  it('rejects an unknown reachability target with a structured failure', () => {
    const result = solveAcyclicDefinitionModel(sharedDagModel(), {
      reachabilityTargets: ['missing']
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('unknown_reachability_target');
    expect(result.failure.targetStateId).toBe('missing');
  });

  it('solves a 20,000-depth acyclic chain without recursive traversal', () => {
    const depth = 20_000;
    const states: DefinitionModel['states'] = [];
    const transitions: DefinitionModel['transitions'] = [];

    for (let index = 0; index <= depth; index += 1) {
      states.push({ id: `depth:${index}`, ...(index === depth ? { terminal: true } : {}) });
      if (index < depth) {
        transitions.push({
          from: `depth:${index}`,
          to: `depth:${index + 1}`,
          probability: 1,
          reward: 1,
          elapsedTime: { value: 2, unit: 'seconds' }
        });
      }
    }

    const result = solveAcyclicDefinitionModel(
      { startState: 'depth:0', states, transitions },
      { reachabilityTargets: [`depth:${depth}`] }
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.reachability === undefined) {
      return;
    }
    expect(result.expectedReward.expectedRewardByState.get('depth:0')).toBe(depth);
    expect(
      result.expectedElapsedTime.expectedElapsedTimeSecondsByState.get('depth:0')
    ).toBe(depth * 2);
    expect(result.reachability.reachabilityProbabilityByState.get('depth:0')).toBe(1);
    expect(result.diagnostics.stateCount).toBe(depth + 1);
    expect(result.diagnostics.topologicalStateCount).toBe(depth + 1);
    expect(result.diagnostics.effectiveTransitionCount).toBe(depth);
  });

  it('matches fixed-policy P0 and existing Kiyotan after decision materialization', () => {
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

    const direct = solveAcyclicDefinitionModel(materialized.model, {
      reachabilityTargets: ['remaining:0']
    });
    const evaluated = evaluateModel(expandModel(materialized.model));
    const iterativeReward = solveExpectedReward(evaluated);
    const iterativeElapsed = solveExpectedElapsedTime(evaluated);

    expect(direct.ok).toBe(true);
    if (!direct.ok || direct.reachability === undefined) {
      return;
    }

    expect(direct.expectedReward.expectedRewardByState.get(materialized.model.startState)).toBeCloseTo(
      p0.expectedReward
    );
    expect(
      direct.expectedElapsedTime.expectedElapsedTimeSecondsByState.get(
        materialized.model.startState
      )
    ).toBeCloseTo(p0.expectedElapsedTimeSeconds);
    expectNumberMapClose(
      direct.expectedReward.expectedRewardByState,
      iterativeReward.expectedRewardByState
    );
    expectNumberMapClose(
      direct.expectedElapsedTime.expectedElapsedTimeSecondsByState,
      iterativeElapsed.expectedElapsedTimeSecondsByState
    );
    expect(direct.reachability.reachabilityProbabilityByState.get(materialized.model.startState)).toBeCloseTo(1);
    expect(direct.expectedReward.expectedRewardByState.get(materialized.model.startState)).toBeCloseTo(1.5);
    expect(
      direct.expectedElapsedTime.expectedElapsedTimeSecondsByState.get(
        materialized.model.startState
      )
    ).toBeCloseTo(15);
  });
});
