import { describe, expect, it } from 'vitest';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';

type SnapshotState = { id: string };

function stateKey(state: SnapshotState): string {
  return state.id;
}

function transitionRowsTo(
  result: ReturnType<typeof materializeFiniteDecisionPolicy<SnapshotState>>,
  from: string
) {
  if (!result.ok) {
    return [];
  }
  return result.model.transitions.filter((transition) => transition.from === from);
}

describe('finite decision materialization validated callback snapshot', () => {
  it('uses the validated probability snapshot instead of calling outcomes again', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: (state) => state.id !== 'start',
      actions: () => ['choose'],
      outcomes: () => {
        outcomeCalls += 1;
        return outcomeCalls === 1
          ? [
              { probability: 0.25, nextState: { id: 'left' } },
              { probability: 0.75, nextState: { id: 'right' } }
            ]
          : [
              { probability: 0.75, nextState: { id: 'left' } },
              { probability: 0.25, nextState: { id: 'right' } }
            ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'choose'
    });

    expect(result.ok).toBe(true);
    expect(outcomeCalls).toBe(1);
    expect(transitionRowsTo(result, 'start').map((row) => row.probability)).toEqual([
      0.25,
      0.75
    ]);
  });

  it('uses the validated reward snapshot instead of a later callback value', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: (state) => state.id === 'done',
      actions: () => ['finish'],
      outcomes: () => {
        outcomeCalls += 1;
        return [
          {
            probability: 1,
            nextState: { id: 'done' },
            reward: outcomeCalls === 1 ? 3 : 300
          }
        ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(outcomeCalls).toBe(1);
    expect(transitionRowsTo(result, 'start')[0]?.reward).toBe(3);
  });

  it('uses the validated elapsed-time snapshot instead of a later callback value', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: (state) => state.id === 'done',
      actions: () => ['finish'],
      outcomes: () => {
        outcomeCalls += 1;
        return [
          {
            probability: 1,
            nextState: { id: 'done' },
            elapsedTimeSeconds: outcomeCalls === 1 ? 7 : 700
          }
        ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(outcomeCalls).toBe(1);
    expect(transitionRowsTo(result, 'start')[0]?.elapsedTime).toEqual({
      value: 7,
      unit: 'seconds'
    });
  });

  it('preserves same-target outcome multiplicity and exact captured contents', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: (state) => state.id === 'done',
      actions: () => ['finish'],
      outcomes: () => {
        outcomeCalls += 1;
        return outcomeCalls === 1
          ? [
              {
                probability: 0.5,
                nextState: { id: 'done' },
                reward: 1,
                elapsedTimeSeconds: 2
              },
              {
                probability: 0.5,
                nextState: { id: 'done' },
                reward: 3,
                elapsedTimeSeconds: 4
              }
            ]
          : [
              {
                probability: 0.5,
                nextState: { id: 'done' },
                reward: 2,
                elapsedTimeSeconds: 3
              },
              {
                probability: 0.5,
                nextState: { id: 'done' },
                reward: 2,
                elapsedTimeSeconds: 3
              }
            ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(outcomeCalls).toBe(1);
    const rows = transitionRowsTo(result, 'start');
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.to)).toEqual(['done', 'done']);
    expect(rows.map((row) => row.reward)).toEqual([1, 3]);
    expect(rows.map((row) => row.elapsedTime)).toEqual([
      { value: 2, unit: 'seconds' },
      { value: 4, unit: 'seconds' }
    ]);
  });

  it('does not perform a second capture even when a callback would change the reachable graph', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: (state) => state.id !== 'start',
      actions: () => ['finish'],
      outcomes: () => {
        outcomeCalls += 1;
        return [
          {
            probability: 1,
            nextState: { id: outcomeCalls === 1 ? 'first' : 'second' }
          }
        ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(outcomeCalls).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.states.map((state) => state.id).sort()).toEqual(['first', 'start']);
    expect(result.model.transitions).toEqual([
      { from: 'start', to: 'first', probability: 1 }
    ]);
  });

  it('keeps invalid-policy and cycle failures in the existing P0 preflight stage', () => {
    const invalidPolicyProcess: FiniteDecisionProcess<SnapshotState> = {
      startState: { id: 'start' },
      stateKey,
      isTerminal: () => false,
      actions: () => ['valid'],
      outcomes: (state) => [{ probability: 1, nextState: state }]
    };
    const invalidPolicy = materializeFiniteDecisionPolicy(invalidPolicyProcess, {
      selectAction: () => 'missing'
    });
    expect(invalidPolicy.ok).toBe(false);
    if (!invalidPolicy.ok) {
      expect(invalidPolicy.stage).toBe('decision_process_preflight');
      if (invalidPolicy.stage === 'decision_process_preflight') {
        expect(invalidPolicy.failure.code).toBe('policy_selected_unknown_action');
      }
    }

    const cycle = materializeFiniteDecisionPolicy(invalidPolicyProcess, {
      selectAction: () => 'valid'
    });
    expect(cycle.ok).toBe(false);
    if (!cycle.ok) {
      expect(cycle.stage).toBe('decision_process_preflight');
      if (cycle.stage === 'decision_process_preflight') {
        expect(cycle.failure.code).toBe('cycle_detected');
      }
    }
  });

  it('materializes a 20,000-depth acyclic chain without recursive traversal', () => {
    const depth = 20_000;
    const process: FiniteDecisionProcess<number> = {
      startState: 0,
      stateKey: (state) => `depth:${state}`,
      isTerminal: (state) => state === depth,
      actions: () => ['advance'],
      outcomes: (state) => [
        {
          probability: 1,
          nextState: state + 1,
          reward: 1,
          elapsedTimeSeconds: 2
        }
      ]
    };

    const result = materializeFiniteDecisionPolicy(
      process,
      { selectAction: () => 'advance' },
      {
        maxDepth: depth,
        maxStates: depth + 1,
        maxStateActionPairs: depth
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.model.states).toHaveLength(depth + 1);
    expect(result.model.transitions).toHaveLength(depth);
    expect(result.diagnostics.maxDepthObserved).toBe(depth);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('keeps end-to-end reward and elapsed time equal to fixed-policy evaluation', () => {
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

    const direct = evaluateFiniteDecisionPolicy(process, policy);
    const materialized = materializeFiniteDecisionPolicy(process, policy);

    expect(direct.ok).toBe(true);
    expect(materialized.ok).toBe(true);
    if (!direct.ok || !materialized.ok) {
      return;
    }

    const forward = evaluateDefinitionModel(materialized.model);
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
  });
});
