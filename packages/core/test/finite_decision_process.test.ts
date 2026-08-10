import { describe, expect, it } from 'vitest';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy,
  optimizeFiniteDecisionExpectedReward
} from '../src/finite_decision_process';

type ResourceState = { remaining: number };

function resourceKey(state: ResourceState): string {
  return `remaining:${state.remaining}`;
}

describe('finite decision process P0', () => {
  it('evaluates a deterministic fixed policy with Bellman expectation and elapsed time', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 2 },
      stateKey: resourceKey,
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

    const result = evaluateFiniteDecisionPolicy(process, {
      selectAction: () => 'consume'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.objective).toBe('expected_total_reward');
    expect(result.expectedReward).toBeCloseTo(1.5);
    expect(result.expectedElapsedTimeSeconds).toBeCloseTo(15);
    expect(result.expectedRewardByState['remaining:1']).toBeCloseTo(2);
    expect(result.policyActionByState).toEqual({
      'remaining:1': 'consume',
      'remaining:2': 'consume'
    });
    expect(result.diagnostics.solverMethod).toBe('memoized_acyclic_policy_evaluation');
    expect(result.diagnostics.simulationUsed).toBe(false);
    expect(result.diagnostics.numericRepresentation).toBe('javascript_number_float64');
  });

  it('uses Bellman optimality and can choose different actions by state', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 2 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['take', 'wait'],
      outcomes: (state, actionId) => {
        if (actionId === 'take') {
          return [
            {
              probability: 1,
              nextState: { remaining: 0 },
              reward: state.remaining === 2 ? 3 : 5
            }
          ];
        }
        return [
          {
            probability: 1,
            nextState: { remaining: state.remaining - 1 },
            reward: state.remaining === 1 ? 1 : 0
          }
        ];
      }
    };

    const result = optimizeFiniteDecisionExpectedReward(process);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.optimalExpectedReward).toBeCloseTo(5);
    expect(result.actionValuesByState['remaining:2']).toEqual({ take: 3, wait: 5 });
    expect(result.actionValuesByState['remaining:1']).toEqual({ take: 5, wait: 1 });
    expect(result.bestActionIdsByState['remaining:2']).toEqual(['wait']);
    expect(result.bestActionIdsByState['remaining:1']).toEqual(['take']);
    expect(result.diagnostics.solverMethod).toBe('memoized_acyclic_bellman_optimality');
  });

  it('preserves all best actions when action values tie', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['left', 'right'],
      outcomes: (_state, actionId) => [
        {
          probability: 1,
          nextState: { remaining: 0 },
          reward: actionId === 'left' ? 2 : 2
        }
      ]
    };

    const result = optimizeFiniteDecisionExpectedReward(process);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.bestActionIdsByState['remaining:1']).toEqual(['left', 'right']);
    expect(result.actionValuesByState['remaining:1']).toEqual({ left: 2, right: 2 });
  });

  it('validates outcome probability totals per state/action', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['invalid'],
      outcomes: () => [
        { probability: 0.4, nextState: { remaining: 0 }, reward: 1 },
        { probability: 0.4, nextState: { remaining: 0 }, reward: 0 }
      ]
    };

    const result = optimizeFiniteDecisionExpectedReward(process);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('outcome_probability_total');
    expect(result.failure.stateKey).toBe('remaining:1');
    expect(result.failure.actionId).toBe('invalid');
  });

  it('treats terminal states as value zero without requesting actions or outcomes', () => {
    let actionCalls = 0;
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 0 },
      stateKey: resourceKey,
      isTerminal: () => true,
      actions: () => {
        actionCalls += 1;
        throw new Error('terminal actions must not be requested');
      },
      outcomes: () => {
        outcomeCalls += 1;
        throw new Error('terminal outcomes must not be requested');
      }
    };

    const result = optimizeFiniteDecisionExpectedReward(process);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.optimalExpectedReward).toBe(0);
    expect(actionCalls).toBe(0);
    expect(outcomeCalls).toBe(0);
    expect(result.diagnostics.visitedStateCount).toBe(1);
    expect(result.diagnostics.evaluatedStateActionPairCount).toBe(0);
  });

  it('memoizes a shared downstream state during fixed-policy evaluation', () => {
    const outcomeCallsByState: Record<string, number> = {};
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 2 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['consume'],
      outcomes: (state) => {
        const key = resourceKey(state);
        outcomeCallsByState[key] = (outcomeCallsByState[key] ?? 0) + 1;
        if (state.remaining === 2) {
          return [
            { probability: 0.5, nextState: { remaining: 1 } },
            { probability: 0.5, nextState: { remaining: 1 } }
          ];
        }
        return [{ probability: 1, nextState: { remaining: 0 }, reward: 2 }];
      }
    };

    const result = evaluateFiniteDecisionPolicy(process, {
      selectAction: () => 'consume'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.expectedReward).toBeCloseTo(2);
    expect(outcomeCallsByState['remaining:1']).toBe(1);
    expect(result.diagnostics.memoHitCount).toBeGreaterThanOrEqual(1);
  });

  it('rejects cyclic decision processes in the P0 acyclic solver', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: () => false,
      actions: () => ['loop'],
      outcomes: (state) => [{ probability: 1, nextState: state }]
    };

    const result = optimizeFiniteDecisionExpectedReward(process);

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('cycle_detected');
    expect(result.failure.stateKey).toBe('remaining:1');
  });

  it('returns an explicit failure when the reachable-state resource limit is exceeded', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 2 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['consume'],
      outcomes: (state) => [
        { probability: 1, nextState: { remaining: state.remaining - 1 } }
      ]
    };

    const result = optimizeFiniteDecisionExpectedReward(process, { maxStates: 1 });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('max_states_exceeded');
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('returns an explicit failure when the state/action-pair resource limit is exceeded', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['first', 'second'],
      outcomes: () => [{ probability: 1, nextState: { remaining: 0 }, reward: 1 }]
    };

    const result = optimizeFiniteDecisionExpectedReward(process, {
      maxStateActionPairs: 1
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.failure.code).toBe('max_state_action_pairs_exceeded');
  });

  it('supports state-dependent sampling-without-replacement style outcomes', () => {
    type DrawState = { high: number; low: number; drawsRemaining: number };
    const process: FiniteDecisionProcess<DrawState> = {
      startState: { high: 1, low: 2, drawsRemaining: 1 },
      stateKey: (state) => `${state.high}:${state.low}:${state.drawsRemaining}`,
      isTerminal: (state) => state.drawsRemaining === 0,
      actions: () => ['draw'],
      outcomes: (state) => {
        const total = state.high + state.low;
        return [
          {
            probability: state.high / total,
            nextState: {
              high: state.high - 1,
              low: state.low,
              drawsRemaining: state.drawsRemaining - 1
            },
            reward: 10
          },
          {
            probability: state.low / total,
            nextState: {
              high: state.high,
              low: state.low - 1,
              drawsRemaining: state.drawsRemaining - 1
            },
            reward: 1
          }
        ];
      }
    };

    const result = evaluateFiniteDecisionPolicy(process, {
      selectAction: () => 'draw'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.expectedReward).toBeCloseTo(4);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });
});
