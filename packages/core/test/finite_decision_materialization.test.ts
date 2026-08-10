import { describe, expect, it } from 'vitest';
import {
  FiniteDecisionProcess,
  evaluateFiniteDecisionPolicy
} from '../src/finite_decision_process';
import { materializeFiniteDecisionPolicy } from '../src/finite_decision_materialization';
import {
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime,
  solveExpectedReward
} from '../src/model';
import { validateDefinitionModel } from '../src/validation';

type ResourceState = { remaining: number };

function resourceKey(state: ResourceState): string {
  return `remaining:${state.remaining}`;
}

function resourceProcess(): FiniteDecisionProcess<ResourceState> {
  return {
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
}

describe('finite decision policy materialization', () => {
  it('materializes a caller-supplied fixed policy into a valid explicit DefinitionModel', () => {
    const process = resourceProcess();
    const policy = { selectAction: () => 'consume' };
    const result = materializeFiniteDecisionPolicy(process, policy);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.model.startState).toBe('remaining:2');
    expect(result.validation.valid).toBe(true);
    expect(validateDefinitionModel(result.model).valid).toBe(true);
    expect(result.policyActionByState).toEqual({
      'remaining:1': 'consume',
      'remaining:2': 'consume'
    });
    expect(result.model.states).toContainEqual({ id: 'remaining:0', terminal: true });
    expect(result.model.states).toContainEqual({ id: 'remaining:1' });
    expect(result.model.states).toContainEqual({ id: 'remaining:2' });
    expect(result.model.transitions).toEqual(
      expect.arrayContaining([
        {
          from: 'remaining:2',
          to: 'remaining:1',
          probability: 0.5,
          reward: 1,
          elapsedTime: { value: 10, unit: 'seconds' }
        },
        {
          from: 'remaining:2',
          to: 'remaining:0',
          probability: 0.5,
          reward: 0,
          elapsedTime: { value: 10, unit: 'seconds' }
        },
        {
          from: 'remaining:1',
          to: 'remaining:0',
          probability: 1,
          reward: 2,
          elapsedTime: { value: 10, unit: 'seconds' }
        }
      ])
    );
  });

  it('preserves expected reward and elapsed time through the existing Kiyotan v1 solvers', () => {
    const process = resourceProcess();
    const policy = { selectAction: () => 'consume' };
    const direct = evaluateFiniteDecisionPolicy(process, policy);
    const materialized = materializeFiniteDecisionPolicy(process, policy);

    expect(direct.ok).toBe(true);
    expect(materialized.ok).toBe(true);
    if (!direct.ok || !materialized.ok) {
      return;
    }

    const evaluated = evaluateModel(expandModel(materialized.model));
    const reward = solveExpectedReward(evaluated).expectedRewardByState.get(
      materialized.model.startState
    );
    const elapsed = solveExpectedElapsedTime(evaluated).expectedElapsedTimeSecondsByState.get(
      materialized.model.startState
    );

    expect(reward).toBeCloseTo(direct.expectedReward);
    expect(elapsed).toBeCloseTo(direct.expectedElapsedTimeSeconds);
    expect(reward).toBeCloseTo(1.5);
    expect(elapsed).toBeCloseTo(15);
  });

  it('keeps distinct outcomes to the same next state as distinct transitions', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0,
      actions: () => ['finish'],
      outcomes: () => [
        {
          probability: 0.5,
          nextState: { remaining: 0 },
          reward: 1,
          elapsedTimeSeconds: 2
        },
        {
          probability: 0.5,
          nextState: { remaining: 0 },
          reward: 3,
          elapsedTimeSeconds: 4
        }
      ]
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const rows = result.model.transitions.filter(
      (transition) => transition.from === 'remaining:1' && transition.to === 'remaining:0'
    );
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.reward)).toEqual([1, 3]);
    expect(rows.map((row) => row.elapsedTime)).toEqual([
      { value: 2, unit: 'seconds' },
      { value: 4, unit: 'seconds' }
    ]);
  });

  it('materializes only states reachable with nonzero probability under the fixed policy', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0 || state.remaining === 99,
      actions: () => ['finish'],
      outcomes: () => [
        { probability: 1, nextState: { remaining: 0 }, reward: 1 },
        { probability: 0, nextState: { remaining: 99 }, reward: 1_000 }
      ]
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.model.states.map((state) => state.id).sort()).toEqual([
      'remaining:0',
      'remaining:1'
    ]);
    expect(result.model.transitions).toHaveLength(1);
    expect(result.model.transitions[0]?.to).toBe('remaining:0');
  });

  it('returns the existing structured P0 failure when the policy selects an unavailable action', () => {
    const result = materializeFiniteDecisionPolicy(resourceProcess(), {
      selectAction: () => 'missing'
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe('decision_process_preflight');
    if (result.stage !== 'decision_process_preflight') {
      return;
    }
    expect(result.failure.code).toBe('policy_selected_unknown_action');
    expect(result.failure.stateKey).toBe('remaining:2');
  });

  it('rejects cycles through the existing P0 preflight instead of widening the P0 contract', () => {
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: () => false,
      actions: () => ['loop'],
      outcomes: (state) => [{ probability: 1, nextState: state }]
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'loop'
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe('decision_process_preflight');
    if (result.stage !== 'decision_process_preflight') {
      return;
    }
    expect(result.failure.code).toBe('cycle_detected');
  });

  it('detects a changed reachable graph between preflight and capture', () => {
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<ResourceState> = {
      startState: { remaining: 1 },
      stateKey: resourceKey,
      isTerminal: (state) => state.remaining === 0 || state.remaining === 2,
      actions: () => ['finish'],
      outcomes: () => {
        outcomeCalls += 1;
        return [
          {
            probability: 1,
            nextState: { remaining: outcomeCalls === 1 ? 0 : 2 }
          }
        ];
      }
    };

    const result = materializeFiniteDecisionPolicy(process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe('materialization');
    if (result.stage !== 'materialization') {
      return;
    }
    expect(result.failure.code).toBe('process_changed_during_materialization');
  });
});
