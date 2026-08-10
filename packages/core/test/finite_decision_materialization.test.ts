import { describe, expect, it } from 'vitest';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
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

function changingSingleStepProcess(
  outcomes: (call: number) => Array<{
    probability: number;
    nextState: string;
    reward?: number;
    elapsedTimeSeconds?: number;
  }>
): { process: FiniteDecisionProcess<string>; outcomeCalls: () => number } {
  let calls = 0;
  return {
    process: {
      startState: 'start',
      stateKey: (state) => state,
      isTerminal: (state) => state !== 'start',
      actions: () => ['finish'],
      outcomes: () => {
        calls += 1;
        return outcomes(calls);
      }
    },
    outcomeCalls: () => calls
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

  it('preserves expected reward and elapsed time through existing Kiyotan v1 and typed forward evaluation', () => {
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
    const forward = evaluateDefinitionModel(materialized.model);

    expect(reward).toBeCloseTo(direct.expectedReward);
    expect(elapsed).toBeCloseTo(direct.expectedElapsedTimeSeconds);
    expect(reward).toBeCloseTo(1.5);
    expect(elapsed).toBeCloseTo(15);
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.modelKind !== 'base') {
      return;
    }
    expect(forward.expectedReward.expectedReward).toBeCloseTo(direct.expectedReward);
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(
      direct.expectedElapsedTimeSeconds
    );
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

  it('uses the validated probability snapshot instead of invoking outcomes a second time', () => {
    const changing = changingSingleStepProcess((call) =>
      call === 1
        ? [
            { probability: 0.25, nextState: 'a', reward: 0 },
            { probability: 0.75, nextState: 'b', reward: 4 }
          ]
        : [
            { probability: 0.75, nextState: 'a', reward: 0 },
            { probability: 0.25, nextState: 'b', reward: 4 }
          ]
    );

    const result = materializeFiniteDecisionPolicy(changing.process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(changing.outcomeCalls()).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.transitions.map((transition) => transition.probability)).toEqual([
      0.25,
      0.75
    ]);

    const forward = evaluateDefinitionModel(result.model);
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.modelKind !== 'base') {
      return;
    }
    expect(forward.expectedReward.expectedReward).toBeCloseTo(3);
  });

  it('uses the validated reward snapshot instead of invoking outcomes a second time', () => {
    const changing = changingSingleStepProcess((call) => [
      { probability: 0.5, nextState: 'a', reward: call === 1 ? 1 : 10 },
      { probability: 0.5, nextState: 'b', reward: call === 1 ? 3 : 30 }
    ]);

    const result = materializeFiniteDecisionPolicy(changing.process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(changing.outcomeCalls()).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.transitions.map((transition) => transition.reward)).toEqual([1, 3]);

    const forward = evaluateDefinitionModel(result.model);
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.modelKind !== 'base') {
      return;
    }
    expect(forward.expectedReward.expectedReward).toBeCloseTo(2);
  });

  it('uses the validated elapsed-time snapshot instead of invoking outcomes a second time', () => {
    const changing = changingSingleStepProcess((call) => [
      {
        probability: 0.5,
        nextState: 'a',
        elapsedTimeSeconds: call === 1 ? 2 : 20
      },
      {
        probability: 0.5,
        nextState: 'b',
        elapsedTimeSeconds: call === 1 ? 4 : 40
      }
    ]);

    const result = materializeFiniteDecisionPolicy(changing.process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(changing.outcomeCalls()).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.transitions.map((transition) => transition.elapsedTime)).toEqual([
      { value: 2, unit: 'seconds' },
      { value: 4, unit: 'seconds' }
    ]);

    const forward = evaluateDefinitionModel(result.model);
    expect(forward.ok).toBe(true);
    if (!forward.ok || forward.modelKind !== 'base') {
      return;
    }
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(3);
  });

  it('preserves same-target outcome multiplicity from the one validated snapshot', () => {
    const changing = changingSingleStepProcess((call) =>
      call === 1
        ? [
            { probability: 0.5, nextState: 'done', reward: 1 },
            { probability: 0.5, nextState: 'done', reward: 3 }
          ]
        : [{ probability: 1, nextState: 'done', reward: 99 }]
    );

    const result = materializeFiniteDecisionPolicy(changing.process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(changing.outcomeCalls()).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.transitions).toHaveLength(2);
    expect(result.model.transitions.map((transition) => transition.to)).toEqual([
      'done',
      'done'
    ]);
    expect(result.model.transitions.map((transition) => transition.reward)).toEqual([1, 3]);
  });

  it('uses one reachable-graph snapshot even when a second callback invocation would change it', () => {
    const changing = changingSingleStepProcess((call) => [
      { probability: 1, nextState: call === 1 ? 'done' : 'other' }
    ]);

    const result = materializeFiniteDecisionPolicy(changing.process, {
      selectAction: () => 'finish'
    });

    expect(result.ok).toBe(true);
    expect(changing.outcomeCalls()).toBe(1);
    if (!result.ok) {
      return;
    }
    expect(result.model.states.map((state) => state.id).sort()).toEqual(['done', 'start']);
    expect(result.model.transitions).toHaveLength(1);
    expect(result.model.transitions[0]?.to).toBe('done');
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

  it('materializes a 20,000-depth finite chain without reintroducing call-stack recursion', () => {
    const depth = 20_000;
    let outcomeCalls = 0;
    const process: FiniteDecisionProcess<number> = {
      startState: 0,
      stateKey: (state) => `depth:${state}`,
      isTerminal: (state) => state === depth,
      actions: () => ['advance'],
      outcomes: (state) => {
        outcomeCalls += 1;
        return [
          {
            probability: 1,
            nextState: state + 1,
            reward: 1,
            elapsedTimeSeconds: 2
          }
        ];
      }
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
    expect(outcomeCalls).toBe(depth);
    if (!result.ok) {
      return;
    }
    expect(result.model.states).toHaveLength(depth + 1);
    expect(result.model.transitions).toHaveLength(depth);
    expect(result.model.startState).toBe('depth:0');
    expect(result.model.states[0]).toEqual({ id: `depth:${depth}`, terminal: true });
    expect(result.model.states[result.model.states.length - 1]).toEqual({ id: 'depth:0' });
    expect(result.diagnostics.maxDepthObserved).toBe(depth);
    expect(result.diagnostics.visitedStateCount).toBe(depth + 1);
    expect(result.diagnostics.evaluatedStateActionPairCount).toBe(depth);
  });
});
