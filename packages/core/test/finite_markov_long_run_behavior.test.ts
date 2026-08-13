import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteMarkovLongRunBehaviorResult,
  FiniteMarkovLongRunBehaviorSuccess,
  analyzeFiniteMarkovLongRunBehavior,
  finiteMarkovLongRunBehaviorResultToJson
} from '../src/finite_markov_long_run_behavior';

type Distribution = Record<StateId, number>;

function requireSuccess(result: FiniteMarkovLongRunBehaviorResult): FiniteMarkovLongRunBehaviorSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function record(entries: Array<{ stateId: StateId; probability: number }>): Distribution {
  return Object.fromEntries(entries.map((entry) => [entry.stateId, entry.probability]));
}

function expectDistributionClose(actual: Distribution, expected: Distribution, digits = 12): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [stateId, probability] of Object.entries(expected)) {
    expect(actual[stateId]).toBeCloseTo(probability, digits);
  }
}

function canonicalStateIds(model: DefinitionModel): StateId[] {
  return model.states
    .map((state) => state.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function independentMatrix(model: DefinitionModel): { stateIds: StateId[]; matrix: number[][] } {
  const stateIds = canonicalStateIds(model);
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const matrix = stateIds.map(() => stateIds.map(() => 0));
  for (const state of model.states) {
    const from = indexByState.get(state.id)!;
    if (isTerminalState(state)) {
      matrix[from]![from] = 1;
      continue;
    }
    for (const transition of model.transitions.filter((edge) => edge.from === state.id)) {
      const to = indexByState.get(transition.to)!;
      matrix[from]![to] =
        matrix[from]![to]! + evaluateProbabilitySpec(transition.probability);
    }
  }
  return { stateIds, matrix };
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

/**
 * Qualification-only graph oracle. It deliberately does not use SCC/Tarjan or
 * the production depth-difference period recurrence. Reachability is obtained
 * by finite transitive closure and periods by enumerating elementary cycles.
 */
function exhaustiveStructuralOracle(model: DefinitionModel): Array<{
  stateIds: StateId[];
  closed: boolean;
  period: number | null;
}> {
  const { stateIds, matrix } = independentMatrix(model);
  const size = stateIds.length;
  const reachable = Array.from({ length: size }, (_, from) =>
    Array.from({ length: size }, (_, to) => from === to || matrix[from]![to]! > 0)
  );
  for (let through = 0; through < size; through += 1) {
    for (let from = 0; from < size; from += 1) {
      for (let to = 0; to < size; to += 1) {
        reachable[from]![to] =
          reachable[from]![to]! || (reachable[from]![through]! && reachable[through]![to]!);
      }
    }
  }

  const assigned = new Set<number>();
  const components: number[][] = [];
  for (let seed = 0; seed < size; seed += 1) {
    if (assigned.has(seed)) continue;
    const component = Array.from({ length: size }, (_, index) => index).filter(
      (candidate) => reachable[seed]![candidate]! && reachable[candidate]![seed]!
    );
    for (const member of component) assigned.add(member);
    components.push(component);
  }

  return components
    .map((component) => {
      const members = new Set(component);
      const closed = component.every((from) =>
        matrix[from]!.every((probability, to) => probability <= 0 || members.has(to))
      );
      if (!closed) {
        return {
          stateIds: component.map((index) => stateIds[index]!).sort(),
          closed,
          period: null
        };
      }

      const cycleLengths: number[] = [];
      for (const start of component) {
        const visit = (current: number, path: number[]): void => {
          for (const next of component) {
            if (matrix[current]![next]! <= 0) continue;
            if (next === start) {
              cycleLengths.push(path.length);
              continue;
            }
            if (path.includes(next) || path.length >= component.length) continue;
            visit(next, [...path, next]);
          }
        };
        visit(start, [start]);
      }
      const period = cycleLengths.reduce((value, length) => gcd(value, length), 0);
      if (period <= 0) throw new Error('oracle found a closed component without a cycle');
      return {
        stateIds: component.map((index) => stateIds[index]!).sort(),
        closed,
        period
      };
    })
    .sort((left, right) => left.stateIds.join('\u0000').localeCompare(right.stateIds.join('\u0000')));
}

function closedFormTwoStateStationary(
  pAB: number,
  pBA: number
): { a: number; b: number } {
  const denominator = pAB + pBA;
  return { a: pBA / denominator, b: pAB / denominator };
}

const aperiodicTwoState: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.8 },
    { from: 'a', to: 'b', probability: 0.2 },
    { from: 'b', to: 'a', probability: 0.4 },
    { from: 'b', to: 'b', probability: 0.6 }
  ]
};

const deterministicTwoCycle: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'b', probability: 1 },
    { from: 'b', to: 'a', probability: 1 }
  ]
};

const twoAbsorbingClasses: DefinitionModel = {
  startState: 's',
  states: [{ id: 's' }, { id: 'a', terminal: true }, { id: 'b', terminal: true }],
  transitions: [
    { from: 's', to: 'a', probability: 0.25 },
    { from: 's', to: 'b', probability: 0.75 }
  ]
};

describe('Candidate J finite Markov long-run behavior foundation', () => {
  it('reduces a one-state absorbing chain to point-mass stationary and Cesaro occupancy', () => {
    const model: DefinitionModel = {
      startState: 'absorbed',
      states: [{ id: 'absorbed', terminal: true }],
      transitions: []
    };
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(model, {
        initialDistribution: [{ stateId: 'absorbed', probability: 1 }]
      })
    );

    expect(result.communicatingClasses).toEqual([
      { stateIds: ['absorbed'], classification: 'closed_recurrent' }
    ]);
    expect(result.transientStateIds).toEqual([]);
    expect(result.recurrentClasses[0]?.period).toBe(1);
    expect(record(result.recurrentClasses[0]!.stationaryDistribution)).toEqual({ absorbed: 1 });
    expect(result.recurrentClasses[0]?.entryProbability).toBe(1);
    expect(result.globalStationaryDistribution.unique).toBe(true);
    expect(record(result.globalStationaryDistribution.distribution!)).toEqual({ absorbed: 1 });
    expect(record(result.cesaroLongRunOccupancy)).toEqual({ absorbed: 1 });
  });

  it('matches an independent closed-form stationary oracle on an irreducible aperiodic chain', () => {
    const oracle = closedFormTwoStateStationary(0.2, 0.4);
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(aperiodicTwoState, {
        initialDistribution: [
          { stateId: 'a', probability: 0.1 },
          { stateId: 'b', probability: 0.9 }
        ]
      })
    );

    expect(result.recurrentClasses).toHaveLength(1);
    expect(result.recurrentClasses[0]?.period).toBe(1);
    expectDistributionClose(record(result.recurrentClasses[0]!.stationaryDistribution), oracle);
    expectDistributionClose(record(result.cesaroLongRunOccupancy), oracle);
    expect(result.recurrentClasses[0]?.entryProbability).toBeCloseTo(1, 12);
    expect(result.globalStationaryDistribution.unique).toBe(true);
  });

  it('classifies the deterministic two-cycle as period 2 and does not claim an ordinary pointwise limit', () => {
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(deterministicTwoCycle, {
        initialDistribution: [{ stateId: 'a', probability: 1 }]
      })
    );
    const oracle = exhaustiveStructuralOracle(deterministicTwoCycle);

    expect(oracle).toEqual([{ stateIds: ['a', 'b'], closed: true, period: 2 }]);
    expect(result.recurrentClasses[0]?.period).toBe(oracle[0]?.period);
    expect(record(result.recurrentClasses[0]!.stationaryDistribution)).toEqual({ a: 0.5, b: 0.5 });
    expect(record(result.cesaroLongRunOccupancy)).toEqual({ a: 0.5, b: 0.5 });
    expect(result.diagnostics.periodicRecurrentClassCount).toBe(1);
    expect(result.diagnostics.ordinaryPointwiseLimitComputed).toBe(false);
  });

  it('preserves multiple absorbing recurrent classes and initial-dependent entry masses', () => {
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(twoAbsorbingClasses, {
        initialDistribution: [{ stateId: 's', probability: 1 }]
      })
    );
    const oracle = exhaustiveStructuralOracle(twoAbsorbingClasses);

    expect(oracle).toEqual([
      { stateIds: ['a'], closed: true, period: 1 },
      { stateIds: ['b'], closed: true, period: 1 },
      { stateIds: ['s'], closed: false, period: null }
    ]);
    expect(result.transientStateIds).toEqual(['s']);
    expect(result.globalStationaryDistribution.unique).toBe(false);
    expect(result.globalStationaryDistribution.distribution).toBeNull();
    expect(result.recurrentClasses.map((entry) => entry.entryProbability)).toEqual([0.25, 0.75]);
    expectDistributionClose(record(result.cesaroLongRunOccupancy), { a: 0.25, b: 0.75, s: 0 });
  });

  it('solves geometric transient leakage to recurrent classes without finite-horizon truncation', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: [
        { from: 's', to: 's', probability: 0.5 },
        { from: 's', to: 'a', probability: 0.25 },
        { from: 's', to: 'b', probability: 0.25 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }]
      })
    );

    // Closed form: sum_{n>=0} 0.5^n * 0.25 = 0.5 for each absorbing class.
    expect(result.recurrentClasses.map((entry) => entry.entryProbability)).toEqual([0.5, 0.5]);
    expectDistributionClose(record(result.cesaroLongRunOccupancy), { a: 0.5, b: 0.5, s: 0 });
  });

  it('is linear in the caller-supplied initial distribution for class entry and Cesaro occupancy', () => {
    const mixed = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(twoAbsorbingClasses, {
        initialDistribution: [
          { stateId: 's', probability: 0.4 },
          { stateId: 'a', probability: 0.6 }
        ]
      })
    );
    // 0.4 * [0.25,0.75] + 0.6 * [1,0] = [0.7,0.3].
    expect(mixed.recurrentClasses.map((entry) => entry.entryProbability)).toEqual([0.7, 0.3]);
    expectDistributionClose(record(mixed.cesaroLongRunOccupancy), { a: 0.7, b: 0.3, s: 0 });
  });

  it('retains unreachable recurrent classes in stationary structure without inventing initial mass', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(model, {
        initialDistribution: [{ stateId: 'a', probability: 1 }]
      })
    );

    expect(result.globalStationaryDistribution.unique).toBe(false);
    expect(result.globalStationaryDistribution.basis).toHaveLength(2);
    expect(result.recurrentClasses.map((entry) => entry.entryProbability)).toEqual([1, 0]);
    expect(record(result.cesaroLongRunOccupancy)).toEqual({ a: 1, b: 0 });
  });

  it('preserves Candidate A terminal self-retention even when a terminal state has outgoing definitions', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(model, {
        initialDistribution: [{ stateId: 'a', probability: 1 }]
      })
    );

    expect(result.recurrentClasses.map((entry) => entry.stateIds)).toEqual([['a'], ['b']]);
    expect(result.recurrentClasses.map((entry) => entry.entryProbability)).toEqual([1, 0]);
    expect(record(result.cesaroLongRunOccupancy)).toEqual({ a: 1, b: 0 });
    expect(result.diagnostics.terminalSemantics).toBe('implicit_self_retention');
  });

  it('is invariant to state, transition, and initial-distribution entry order', () => {
    const reordered: DefinitionModel = {
      startState: 'b',
      states: [{ id: 'b' }, { id: 'a' }],
      transitions: [
        { from: 'b', to: 'b', probability: 0.6 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'a', to: 'a', probability: 0.8 }
      ]
    };
    const first = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(aperiodicTwoState, {
        initialDistribution: [
          { stateId: 'a', probability: 0.3 },
          { stateId: 'b', probability: 0.7 }
        ]
      })
    );
    const second = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(reordered, {
        initialDistribution: [
          { stateId: 'b', probability: 0.7 },
          { stateId: 'a', probability: 0.3 }
        ]
      })
    );

    expect(second).toEqual(first);
  });

  it('is invariant to equivalent parallel-transition splitting and explicit zero-probability edges', () => {
    const split: DefinitionModel = {
      startState: 's',
      states: [
        { id: 's' },
        { id: 'a', terminal: true },
        { id: 'b', terminal: true },
        { id: 'unused', terminal: true }
      ],
      transitions: [
        { from: 's', to: 'a', probability: 0.1 },
        { from: 's', to: 'a', probability: 0.15 },
        { from: 's', to: 'b', probability: 0.75 },
        { from: 's', to: 'unused', probability: 0 }
      ]
    };
    const merged: DefinitionModel = {
      startState: 's',
      states: [
        { id: 's' },
        { id: 'a', terminal: true },
        { id: 'b', terminal: true },
        { id: 'unused', terminal: true }
      ],
      transitions: [
        { from: 's', to: 'a', probability: 0.25 },
        { from: 's', to: 'b', probability: 0.75 }
      ]
    };
    const request = { initialDistribution: [{ stateId: 's', probability: 1 }] };
    const first = requireSuccess(analyzeFiniteMarkovLongRunBehavior(split, request));
    const second = requireSuccess(analyzeFiniteMarkovLongRunBehavior(merged, request));

    expect(first).toEqual(second);
    expect(first.diagnostics.graphEdgeConvention).toBe('strictly_positive_transition_probability');
  });

  it('reports reducibility and periodicity as analytical success rather than failure', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'a' }, { id: 'b' }, { id: 'c', terminal: true }],
      transitions: [
        { from: 's', to: 'a', probability: 0.5 },
        { from: 's', to: 'c', probability: 0.5 },
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }]
      })
    );

    expect(result.recurrentClasses.map((entry) => ({ states: entry.stateIds, period: entry.period }))).toEqual([
      { states: ['a', 'b'], period: 2 },
      { states: ['c'], period: 1 }
    ]);
    expect(result.globalStationaryDistribution.unique).toBe(false);
    expectDistributionClose(record(result.cesaroLongRunOccupancy), {
      a: 0.25,
      b: 0.25,
      c: 0.5,
      s: 0
    });
  });

  it('returns explicit failures for invalid model, initial distribution, and options', () => {
    const invalidModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }],
      transitions: [{ from: 'a', to: 'a', probability: 0.9 }]
    };
    const modelFailure = analyzeFiniteMarkovLongRunBehavior(invalidModel, {
      initialDistribution: [{ stateId: 'a', probability: 1 }]
    });
    expect(modelFailure.ok).toBe(false);
    if (!modelFailure.ok) expect(modelFailure.failure.code).toBe('invalid_model');

    const duplicate = analyzeFiniteMarkovLongRunBehavior(aperiodicTwoState, {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'a', probability: 0.5 }
      ]
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.failure.code).toBe('duplicate_initial_state');

    const invalidOption = analyzeFiniteMarkovLongRunBehavior(
      aperiodicTwoState,
      { initialDistribution: [{ stateId: 'a', probability: 1 }] },
      { linearSolveTolerance: Number.NaN }
    );
    expect(invalidOption.ok).toBe(false);
    if (!invalidOption.ok) expect(invalidOption.failure.code).toBe('invalid_options');
  });

  it('uses checked deterministic JSON serialization and rejects forged non-finite results', () => {
    const result = requireSuccess(
      analyzeFiniteMarkovLongRunBehavior(deterministicTwoCycle, {
        initialDistribution: [{ stateId: 'a', probability: 1 }]
      })
    );
    expect(finiteMarkovLongRunBehaviorResultToJson(result)).toBe(JSON.stringify(result));

    const forged = structuredClone(result);
    forged.cesaroLongRunOccupancy[0]!.probability = Number.POSITIVE_INFINITY;
    expect(() => finiteMarkovLongRunBehaviorResultToJson(forged)).toThrow(/non-finite/);
  });
});
