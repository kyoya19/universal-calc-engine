import { describe, expect, it } from 'vitest';
import { evaluateDefinitionModel } from '../src/forward_evaluation';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteHorizonStateDistributionResult,
  FiniteHorizonStateDistributionSuccess,
  propagateFiniteHorizonStateDistribution,
  stateDistributionResultToJson
} from '../src/state_distribution';

type Distribution = Record<StateId, number>;

function requireSuccess(
  result: FiniteHorizonStateDistributionResult
): FiniteHorizonStateDistributionSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error(`${result.failure.code}: ${result.failure.message}`);
  }
  return result;
}

function distributionRecord(
  entries: Array<{ stateId: StateId; probability: number }>
): Distribution {
  return Object.fromEntries(entries.map((entry) => [entry.stateId, entry.probability]));
}

function expectedVisitRecord(
  entries: Array<{ stateId: StateId; expectedVisitCount: number }>
): Distribution {
  return Object.fromEntries(
    entries.map((entry) => [entry.stateId, entry.expectedVisitCount])
  );
}

function scalarProbability(value: DefinitionModel['transitions'][number]['probability']): number {
  return typeof value === 'number' ? value : value.value;
}

function sortedStateIds(model: DefinitionModel): StateId[] {
  return model.states
    .map((state) => state.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

function denseMatrixOracle(
  model: DefinitionModel,
  initialDistribution: Array<{ stateId: StateId; probability: number }>,
  horizon: number
): { trajectory: Distribution[]; expectedVisitCounts: Distribution } {
  const stateIds = sortedStateIds(model);
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const matrix = stateIds.map(() => stateIds.map(() => 0));

  for (const state of model.states) {
    const from = indexByState.get(state.id);
    if (from === undefined) throw new Error('oracle state index missing');
    if (state.terminal === true) {
      matrix[from]![from] = 1;
      continue;
    }
    for (const transition of model.transitions.filter((edge) => edge.from === state.id)) {
      const to = indexByState.get(transition.to);
      if (to === undefined) throw new Error('oracle transition target missing');
      matrix[from]![to] = matrix[from]![to]! + scalarProbability(transition.probability);
    }
  }

  let vector = stateIds.map(
    (stateId) => initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0
  );
  const trajectory: Distribution[] = [Object.fromEntries(stateIds.map((id, i) => [id, vector[i]!]))];
  const visits = [...vector];

  for (let step = 1; step <= horizon; step += 1) {
    const next = stateIds.map(() => 0);
    for (let from = 0; from < stateIds.length; from += 1) {
      for (let to = 0; to < stateIds.length; to += 1) {
        next[to] = next[to]! + vector[from]! * matrix[from]![to]!;
      }
    }
    vector = next;
    for (let index = 0; index < visits.length; index += 1) {
      visits[index] = visits[index]! + vector[index]!;
    }
    trajectory.push(Object.fromEntries(stateIds.map((id, i) => [id, vector[i]!])));
  }

  return {
    trajectory,
    expectedVisitCounts: Object.fromEntries(stateIds.map((id, i) => [id, visits[i]!]))
  };
}

type EnumeratedPath = { stateId: StateId; probability: number };

function pathEnumerationOracle(
  model: DefinitionModel,
  initialDistribution: Array<{ stateId: StateId; probability: number }>,
  horizon: number
): { trajectory: Distribution[]; expectedVisitCounts: Distribution } {
  const stateIds = sortedStateIds(model);
  const terminal = new Set(
    model.states.filter((state) => state.terminal === true).map((state) => state.id)
  );
  let paths: EnumeratedPath[] = initialDistribution.map((entry) => ({ ...entry }));
  const trajectory: Distribution[] = [];
  const visits = Object.fromEntries(stateIds.map((stateId) => [stateId, 0])) as Distribution;

  for (let step = 0; step <= horizon; step += 1) {
    const distribution = Object.fromEntries(stateIds.map((stateId) => [stateId, 0])) as Distribution;
    for (const path of paths) {
      distribution[path.stateId] = (distribution[path.stateId] ?? 0) + path.probability;
    }
    for (const stateId of stateIds) {
      visits[stateId] = (visits[stateId] ?? 0) + (distribution[stateId] ?? 0);
    }
    trajectory.push(distribution);

    if (step === horizon) break;
    const nextPaths: EnumeratedPath[] = [];
    for (const path of paths) {
      if (terminal.has(path.stateId)) {
        nextPaths.push(path);
        continue;
      }
      for (const transition of model.transitions.filter((edge) => edge.from === path.stateId)) {
        nextPaths.push({
          stateId: transition.to,
          probability: path.probability * scalarProbability(transition.probability)
        });
      }
    }
    paths = nextPaths;
  }

  return { trajectory, expectedVisitCounts: visits };
}

function expectDistributionClose(actual: Distribution, expected: Distribution): void {
  expect(Object.keys(actual)).toEqual(Object.keys(expected));
  for (const [stateId, expectedProbability] of Object.entries(expected)) {
    expect(actual[stateId]).toBeCloseTo(expectedProbability, 12);
  }
}

const branchingModel: DefinitionModel = {
  startState: 'a',
  states: [
    { id: 'a' },
    { id: 'b', terminal: true },
    { id: 'c', terminal: true }
  ],
  transitions: [
    { from: 'a', to: 'b', probability: 0.5 },
    { from: 'a', to: 'c', probability: 0.5 }
  ]
};

describe('Candidate A finite-horizon state-distribution foundation', () => {
  it('matches an independently constructed dense transition-matrix oracle', () => {
    const initialDistribution = [
      { stateId: 'a', probability: 0.4 },
      { stateId: 'b', probability: 0.6 }
    ];
    const actual = requireSuccess(
      propagateFiniteHorizonStateDistribution(branchingModel, {
        initialDistribution,
        horizon: 3
      })
    );
    const oracle = denseMatrixOracle(branchingModel, initialDistribution, 3);

    expect(actual.trajectory).toHaveLength(4);
    actual.trajectory.forEach((step, index) => {
      expectDistributionClose(distributionRecord(step.distribution), oracle.trajectory[index]!);
      expect(step.totalProbability).toBeCloseTo(1, 12);
    });
    expectDistributionClose(
      expectedVisitRecord(actual.expectedVisitCounts),
      oracle.expectedVisitCounts
    );
    expect(actual.diagnostics.simulationUsed).toBe(false);
    expect(actual.diagnostics.normalizationApplied).toBe(false);
  });

  it('matches complete finite path enumeration on a recurrent graph with absorbing leakage', () => {
    const model: DefinitionModel = {
      startState: 'loop',
      states: [{ id: 'loop' }, { id: 'absorbed', terminal: true }],
      transitions: [
        { from: 'loop', to: 'loop', probability: 0.5 },
        { from: 'loop', to: 'absorbed', probability: 0.5 }
      ]
    };
    const initialDistribution = [{ stateId: 'loop', probability: 1 }];
    const actual = requireSuccess(
      propagateFiniteHorizonStateDistribution(model, { initialDistribution, horizon: 3 })
    );
    const oracle = pathEnumerationOracle(model, initialDistribution, 3);

    actual.trajectory.forEach((step, index) => {
      expectDistributionClose(distributionRecord(step.distribution), oracle.trajectory[index]!);
    });
    expectDistributionClose(
      expectedVisitRecord(actual.expectedVisitCounts),
      oracle.expectedVisitCounts
    );
    expect(distributionRecord(actual.finalDistribution)).toEqual({ absorbed: 0.875, loop: 0.125 });
    expect(expectedVisitRecord(actual.expectedVisitCounts)).toEqual({
      absorbed: 2.125,
      loop: 1.875
    });
  });

  it('defines horizon zero and expected visit counts inclusively from t=0 through H', () => {
    const result = requireSuccess(
      propagateFiniteHorizonStateDistribution(branchingModel, {
        initialDistribution: [
          { stateId: 'a', probability: 0.25 },
          { stateId: 'b', probability: 0.75 }
        ],
        horizon: 0
      })
    );

    expect(result.trajectory).toHaveLength(1);
    expect(result.trajectory[0]?.step).toBe(0);
    expect(distributionRecord(result.finalDistribution)).toEqual({ a: 0.25, b: 0.75, c: 0 });
    expect(expectedVisitRecord(result.expectedVisitCounts)).toEqual({ a: 0.25, b: 0.75, c: 0 });
    expect(result.diagnostics.expectedVisitCountConvention).toBe(
      'sum_probability_mass_from_step_0_through_horizon'
    );
  });

  it('preserves existing single-start forward semantics as the delta-distribution special case', () => {
    const model: DefinitionModel = {
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
          probability: 0.6,
          reward: 2,
          elapsedTime: { value: 1, unit: 'seconds' }
        },
        {
          from: 'start',
          to: 'failure',
          probability: 0.4,
          elapsedTime: { value: 1, unit: 'seconds' }
        }
      ]
    };

    const distribution = requireSuccess(
      propagateFiniteHorizonStateDistribution(model, {
        initialDistribution: [{ stateId: model.startState, probability: 1 }],
        horizon: 1
      })
    );
    const forward = evaluateDefinitionModel(model, { reachabilityTargets: ['success'] });

    expect(forward.ok).toBe(true);
    if (!forward.ok) return;
    expect(forward.expectedReward.expectedReward).toBeCloseTo(1.2, 12);
    expect(forward.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(1, 12);
    expect(forward.reachability?.probabilityFromStart).toBeCloseTo(0.6, 12);
    expect(distributionRecord(distribution.finalDistribution).success).toBeCloseTo(
      forward.reachability?.probabilityFromStart ?? NaN,
      12
    );
  });

  it('is invariant to state and transition enumeration order on a finite recurrent graph', () => {
    const first: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };
    const reordered: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'b' }, { id: 'a' }],
      transitions: [
        { from: 'b', to: 'a', probability: 1 },
        { from: 'a', to: 'b', probability: 1 }
      ]
    };
    const request = {
      initialDistribution: [
        { stateId: 'b', probability: 0.75 },
        { stateId: 'a', probability: 0.25 }
      ],
      horizon: 3
    };

    const left = requireSuccess(propagateFiniteHorizonStateDistribution(first, request));
    const right = requireSuccess(propagateFiniteHorizonStateDistribution(reordered, request));

    expect(left.finalDistribution).toEqual(right.finalDistribution);
    expect(left.trajectory).toEqual(right.trajectory);
    expect(left.expectedVisitCounts).toEqual(right.expectedVisitCounts);
    expect(distributionRecord(left.finalDistribution)).toEqual({ a: 0.75, b: 0.25 });
  });

  it('preserves observable distributions for equivalent split transition encodings', () => {
    const compact: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }, { id: 'c', terminal: true }],
      transitions: [
        { from: 'a', to: 'b', probability: 0.6 },
        { from: 'a', to: 'c', probability: 0.4 }
      ]
    };
    const split: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'c', terminal: true }, { id: 'a' }, { id: 'b', terminal: true }],
      transitions: [
        { from: 'a', to: 'c', probability: 0.1 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'a', to: 'c', probability: 0.3 },
        { from: 'a', to: 'b', probability: 0.4 }
      ]
    };
    const request = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon: 2
    };

    const compactResult = requireSuccess(
      propagateFiniteHorizonStateDistribution(compact, request)
    );
    const splitResult = requireSuccess(
      propagateFiniteHorizonStateDistribution(split, request)
    );

    expectDistributionClose(
      distributionRecord(splitResult.finalDistribution),
      distributionRecord(compactResult.finalDistribution)
    );
    expectDistributionClose(
      expectedVisitRecord(splitResult.expectedVisitCounts),
      expectedVisitRecord(compactResult.expectedVisitCounts)
    );
  });

  it('keeps unreachable states at zero and zero-probability edges observationally inert', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [
        { id: 'a' },
        { id: 'b', terminal: true },
        { id: 'unreachable', terminal: true }
      ],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'a', to: 'unreachable', probability: 0 }
      ]
    };
    const result = requireSuccess(
      propagateFiniteHorizonStateDistribution(model, {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        horizon: 4
      })
    );

    for (const step of result.trajectory) {
      expect(distributionRecord(step.distribution).unreachable).toBe(0);
    }
    expect(expectedVisitRecord(result.expectedVisitCounts).unreachable).toBe(0);
  });

  it('treats terminal states as self-retaining even when the model contains ignored outgoing edges', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'terminal', terminal: true }],
      transitions: [
        { from: 'a', to: 'terminal', probability: 1 },
        { from: 'terminal', to: 'a', probability: 1 }
      ]
    };
    const result = requireSuccess(
      propagateFiniteHorizonStateDistribution(model, {
        initialDistribution: [{ stateId: 'terminal', probability: 1 }],
        horizon: 3
      })
    );

    expect(distributionRecord(result.finalDistribution)).toEqual({ a: 0, terminal: 1 });
    expect(expectedVisitRecord(result.expectedVisitCounts)).toEqual({ a: 0, terminal: 4 });
    expect(result.diagnostics.terminalSemantics).toBe('implicit_self_retention');
  });

  it('rejects invalid initial distributions, horizons, options, and model probabilities explicitly', () => {
    const cases: Array<{
      result: FiniteHorizonStateDistributionResult;
      code: string;
    }> = [
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [{ stateId: 'unknown', probability: 1 }],
          horizon: 1
        }),
        code: 'unknown_initial_state'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [
            { stateId: 'a', probability: 0.5 },
            { stateId: 'a', probability: 0.5 }
          ],
          horizon: 1
        }),
        code: 'duplicate_initial_state'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [
            { stateId: 'a', probability: -0.1 },
            { stateId: 'b', probability: 1 }
          ],
          horizon: 1
        }),
        code: 'invalid_initial_probability'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [{ stateId: 'a', probability: Number.NaN }],
          horizon: 1
        }),
        code: 'invalid_initial_probability'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [{ stateId: 'a', probability: 0.9 }],
          horizon: 1
        }),
        code: 'initial_probability_total'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [{ stateId: 'a', probability: 1 }],
          horizon: -1
        }),
        code: 'invalid_horizon'
      },
      {
        result: propagateFiniteHorizonStateDistribution(branchingModel, {
          initialDistribution: [{ stateId: 'a', probability: 1 }],
          horizon: 1.5
        }),
        code: 'invalid_horizon'
      },
      {
        result: propagateFiniteHorizonStateDistribution(
          branchingModel,
          { initialDistribution: [{ stateId: 'a', probability: 1 }], horizon: 2 },
          { maxHorizon: 1 }
        ),
        code: 'horizon_exceeds_limit'
      },
      {
        result: propagateFiniteHorizonStateDistribution(
          branchingModel,
          { initialDistribution: [{ stateId: 'a', probability: 1 }], horizon: 1 },
          { probabilityTolerance: 0 }
        ),
        code: 'invalid_options'
      },
      {
        result: propagateFiniteHorizonStateDistribution(
          {
            ...branchingModel,
            transitions: [
              { from: 'a', to: 'b', probability: 0.8 },
              { from: 'a', to: 'c', probability: 0.8 }
            ]
          },
          { initialDistribution: [{ stateId: 'a', probability: 1 }], horizon: 1 }
        ),
        code: 'invalid_model'
      }
    ];

    for (const testCase of cases) {
      expect(testCase.result.ok).toBe(false);
      if (!testCase.result.ok) {
        expect(testCase.result.failure.code).toBe(testCase.code);
      }
    }
  });

  it('does not silently normalize accepted input mass within tolerance', () => {
    const result = requireSuccess(
      propagateFiniteHorizonStateDistribution(branchingModel, {
        initialDistribution: [
          { stateId: 'a', probability: 0.5000000002 },
          { stateId: 'b', probability: 0.5 }
        ],
        horizon: 0
      })
    );

    expect(result.trajectory[0]?.totalProbability).toBeCloseTo(1.0000000002, 14);
    expect(result.diagnostics.normalizationApplied).toBe(false);
  });

  it('detects finite-horizon probability-mass drift beyond the documented tolerance', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.50000000025 },
        { from: 'a', to: 'a', probability: 0.50000000025 }
      ]
    };
    const result = propagateFiniteHorizonStateDistribution(model, {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon: 4
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe('mass_conservation_violation');
      expect(result.failure.step).toBeGreaterThan(0);
      expect(result.failure.actualTotal).toBeGreaterThan(1);
    }
  });

  it('serializes deterministic finite results and rejects forged non-finite handoff values', () => {
    const result = requireSuccess(
      propagateFiniteHorizonStateDistribution(branchingModel, {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        horizon: 1
      })
    );
    const first = stateDistributionResultToJson(result);
    const second = stateDistributionResultToJson(result);
    expect(first).toBe(second);
    expect(JSON.parse(first).finalDistribution).toEqual(result.finalDistribution);

    const forged: FiniteHorizonStateDistributionResult = {
      ...result,
      finalDistribution: [{ stateId: 'a', probability: Number.POSITIVE_INFINITY }]
    };
    expect(() => stateDistributionResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
