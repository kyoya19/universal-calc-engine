import { describe, expect, it } from 'vitest';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy,
  optimizeFiniteDecisionExpectedReward
} from '../src/finite_decision_process';

function linearProcess(terminalDepth: number): FiniteDecisionProcess<number> {
  return {
    startState: 0,
    stateKey: (state) => `depth:${state}`,
    isTerminal: (state) => state === terminalDepth,
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
}

describe('finite decision process stack safety', () => {
  it('evaluates a 20,000-depth fixed policy without using the JavaScript call stack', () => {
    const depth = 20_000;
    const result = evaluateFiniteDecisionPolicy(
      linearProcess(depth),
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

    expect(result.expectedReward).toBe(depth);
    expect(result.expectedElapsedTimeSeconds).toBe(depth * 2);
    expect(result.expectedRewardByState['depth:0']).toBe(depth);
    expect(result.expectedRewardByState[`depth:${depth}`]).toBe(0);
    expect(result.diagnostics.solverMethod).toBe('memoized_acyclic_policy_evaluation');
    expect(result.diagnostics.maxDepthObserved).toBe(depth);
    expect(result.diagnostics.visitedStateCount).toBe(depth + 1);
    expect(result.diagnostics.evaluatedStateActionPairCount).toBe(depth);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('optimizes a 20,000-depth decision chain without using the JavaScript call stack', () => {
    const depth = 20_000;
    const result = optimizeFiniteDecisionExpectedReward(linearProcess(depth), {
      maxDepth: depth,
      maxStates: depth + 1,
      maxStateActionPairs: depth
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.optimalExpectedReward).toBe(depth);
    expect(result.expectedRewardByState['depth:0']).toBe(depth);
    expect(result.bestActionIdsByState['depth:0']).toEqual(['advance']);
    expect(result.diagnostics.solverMethod).toBe('memoized_acyclic_bellman_optimality');
    expect(result.diagnostics.maxDepthObserved).toBe(depth);
    expect(result.diagnostics.visitedStateCount).toBe(depth + 1);
    expect(result.diagnostics.evaluatedStateActionPairCount).toBe(depth);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('keeps maxDepth as an explicit analytical boundary after removing recursion', () => {
    const result = optimizeFiniteDecisionExpectedReward(linearProcess(10_001), {
      maxDepth: 10_000,
      maxStates: 20_000,
      maxStateActionPairs: 20_000
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.failure.code).toBe('max_depth_exceeded');
    expect(result.failure.stateKey).toBe('depth:10001');
    expect(result.failure.depth).toBe(10_001);
    expect(result.diagnostics.maxDepthObserved).toBe(10_001);
    expect(result.diagnostics.simulationUsed).toBe(false);
  });

  it('detects a deep back-edge cycle with the explicit traversal stack', () => {
    const cycleAt = 6_000;
    const process: FiniteDecisionProcess<number> = {
      startState: 0,
      stateKey: (state) => `state:${state}`,
      isTerminal: () => false,
      actions: () => ['advance'],
      outcomes: (state) => [
        {
          probability: 1,
          nextState: state === cycleAt ? 3_000 : state + 1
        }
      ]
    };

    const result = optimizeFiniteDecisionExpectedReward(process, {
      maxDepth: 7_000,
      maxStates: 7_000,
      maxStateActionPairs: 7_000
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.failure.code).toBe('cycle_detected');
    expect(result.failure.stateKey).toBe('state:3000');
    expect(result.failure.depth).toBe(6_001);
  });

  it('preserves shared-state memoization while using explicit traversal frames', () => {
    const outcomeCallsByState: Record<string, number> = {};
    const process: FiniteDecisionProcess<number> = {
      startState: -1,
      stateKey: (state) => `state:${state}`,
      isTerminal: (state) => state === 1_000,
      actions: () => ['advance'],
      outcomes: (state) => {
        const key = `state:${state}`;
        outcomeCallsByState[key] = (outcomeCallsByState[key] ?? 0) + 1;
        if (state === -1) {
          return [
            { probability: 0.5, nextState: 0 },
            { probability: 0.5, nextState: 0 }
          ];
        }
        return [{ probability: 1, nextState: state + 1, reward: 1 }];
      }
    };

    const result = evaluateFiniteDecisionPolicy(
      process,
      { selectAction: () => 'advance' },
      { maxDepth: 2_000, maxStates: 2_000, maxStateActionPairs: 2_000 }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.expectedReward).toBe(1_000);
    expect(outcomeCallsByState['state:0']).toBe(1);
    expect(result.diagnostics.memoHitCount).toBeGreaterThanOrEqual(1);
  });
});
