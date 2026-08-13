import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import { HiddenObservationKernelEntry } from '../src/hidden_state_observation';
import {
  FiniteHiddenStateTransitionReestimationRequest,
  FiniteHiddenStateTransitionReestimationResult,
  FiniteHiddenStateTransitionReestimationSuccess,
  finiteHiddenStateTransitionReestimationResultToJson,
  reestimateFiniteHiddenStateTransitionsOneStep
} from '../src/hidden_state_transition_reestimation';

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.8 },
      { from: 'a', to: 'b', probability: 0.2 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function kernel(): HiddenObservationKernelEntry[] {
  return [
    { stateId: 'a', symbol: 'red', probability: 0.9 },
    { stateId: 'a', symbol: 'blue', probability: 0.1 },
    { stateId: 'b', symbol: 'red', probability: 0.2 },
    { stateId: 'b', symbol: 'blue', probability: 0.8 }
  ];
}

function request(observations: string[] = ['red', 'blue', 'red', 'blue']): FiniteHiddenStateTransitionReestimationRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    alphabet: ['red', 'blue'],
    kernel: kernel(),
    observations
  };
}

function requireSuccess(
  result: FiniteHiddenStateTransitionReestimationResult
): FiniteHiddenStateTransitionReestimationSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(
  req: FiniteHiddenStateTransitionReestimationRequest,
  stateId: StateId
): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emission(
  req: FiniteHiddenStateTransitionReestimationRequest,
  stateId: StateId,
  symbol: string
): number {
  return req.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function transitionProbability(m: DefinitionModel, from: StateId, to: StateId): number {
  const source = m.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function pairKey(from: StateId, to: StateId): string {
  return `${from}\u0000${to}`;
}

type PathOracle = {
  likelihood: number;
  counts: Map<string, number>;
};

function completePathOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateTransitionReestimationRequest
): PathOracle | null {
  const states = m.states.map((state) => state.id);
  const countMass = new Map<string, number>();
  for (const from of states) for (const to of states) countMass.set(pairKey(from, to), 0);
  let total = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === req.observations.length) {
      const firstState = path[0];
      const firstObservation = req.observations[0];
      if (firstState === undefined || firstObservation === undefined) return;
      let mass = initialProbability(req, firstState) * emission(req, firstState, firstObservation);
      for (let step = 1; step < path.length; step += 1) {
        const from = path[step - 1];
        const to = path[step];
        const observation = req.observations[step];
        if (from === undefined || to === undefined || observation === undefined) return;
        mass *= transitionProbability(m, from, to);
        mass *= emission(req, to, observation);
      }
      total += mass;
      for (let step = 0; step < path.length - 1; step += 1) {
        const from = path[step];
        const to = path[step + 1];
        if (from === undefined || to === undefined) continue;
        const key = pairKey(from, to);
        countMass.set(key, (countMass.get(key) ?? 0) + mass);
      }
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };

  visit([]);
  if (total === 0) return null;
  return {
    likelihood: total,
    counts: new Map([...countMass.entries()].map(([key, mass]) => [key, mass / total] as const))
  };
}

function resultExpectedCount(
  result: FiniteHiddenStateTransitionReestimationSuccess,
  from: StateId,
  to: StateId
): number {
  return result.rows?.find((row) => row.stateId === from)?.expectedCounts.find((entry) => entry.toStateId === to)?.expectedCount ?? 0;
}

function resultUpdatedProbability(
  result: FiniteHiddenStateTransitionReestimationSuccess,
  from: StateId,
  to: StateId
): number {
  return result.rows?.find((row) => row.stateId === from)?.updatedRow.find((entry) => entry.toStateId === to)?.probability ?? 0;
}

function expectedCompleteDataRowObjective(counts: number[], probabilities: number[]): number {
  let total = 0;
  for (let index = 0; index < counts.length; index += 1) {
    const count = counts[index] ?? 0;
    const probability = probabilities[index] ?? 0;
    if (count === 0) continue;
    if (probability <= 0) return Number.NEGATIVE_INFINITY;
    total += count * Math.log(probability);
  }
  return total;
}

function revealingRequest(observations: string[]): FiniteHiddenStateTransitionReestimationRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 1 },
      { stateId: 'b', probability: 0 },
      { stateId: 'c', probability: 0 }
    ],
    alphabet: ['A', 'B', 'C'],
    kernel: [
      { stateId: 'a', symbol: 'A', probability: 1 },
      { stateId: 'a', symbol: 'B', probability: 0 },
      { stateId: 'a', symbol: 'C', probability: 0 },
      { stateId: 'b', symbol: 'A', probability: 0 },
      { stateId: 'b', symbol: 'B', probability: 1 },
      { stateId: 'b', symbol: 'C', probability: 0 },
      { stateId: 'c', symbol: 'A', probability: 0 },
      { stateId: 'c', symbol: 'B', probability: 0 },
      { stateId: 'c', symbol: 'C', probability: 1 }
    ],
    observations
  };
}

function revealingModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.4 },
      { from: 'a', to: 'b', probability: 0.4 },
      { from: 'a', to: 'c', probability: 0.2 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.4 },
      { from: 'b', to: 'c', probability: 0.3 },
      { from: 'c', to: 'a', probability: 0.2 },
      { from: 'c', to: 'b', probability: 0.3 },
      { from: 'c', to: 'c', probability: 0.5 }
    ]
  };
}

describe('Candidate S finite hidden-state transition re-estimation', () => {
  it('matches a complete hidden-path posterior-count oracle on ambiguous evidence', () => {
    const m = model();
    const req = request();
    const oracle = completePathOracle(m, req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    expect(result.possible).toBe(true);
    if (oracle === null) throw new Error('oracle unexpectedly impossible');

    for (const from of ['a', 'b']) {
      let departure = 0;
      for (const to of ['a', 'b']) {
        const expectedCount = oracle.counts.get(pairKey(from, to)) ?? 0;
        departure += expectedCount;
        expect(resultExpectedCount(result, from, to)).toBeCloseTo(expectedCount, 12);
      }
      for (const to of ['a', 'b']) {
        const expectedCount = oracle.counts.get(pairKey(from, to)) ?? 0;
        expect(resultUpdatedProbability(result, from, to)).toBeCloseTo(expectedCount / departure, 12);
      }
    }
  });

  it('reduces to empirical transition frequencies when the hidden trajectory is fully revealed', () => {
    const m = revealingModel();
    const req = revealingRequest(['A', 'A', 'B', 'A', 'A', 'B']);
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    expect(result.possible).toBe(true);
    expect(resultUpdatedProbability(result, 'a', 'a')).toBeCloseTo(0.5, 12);
    expect(resultUpdatedProbability(result, 'a', 'b')).toBeCloseTo(0.5, 12);
    expect(resultUpdatedProbability(result, 'a', 'c')).toBeCloseTo(0, 12);
    expect(resultUpdatedProbability(result, 'b', 'a')).toBeCloseTo(1, 12);
    expect(resultUpdatedProbability(result, 'b', 'b')).toBeCloseTo(0, 12);
    expect(resultUpdatedProbability(result, 'b', 'c')).toBeCloseTo(0, 12);
  });

  it('retains a zero-departure row and reports that expected counts do not uniquely identify it', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'a', probability: 0.25 },
        { from: 'b', to: 'b', probability: 0.75 }
      ]
    };
    const req: FiniteHiddenStateTransitionReestimationRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 'b', probability: 0 }
      ],
      alphabet: ['x'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 1 },
        { stateId: 'b', symbol: 'x', probability: 1 }
      ],
      observations: ['x', 'x', 'x']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    const row = result.rows?.find((entry) => entry.stateId === 'b');
    expect(row?.status).toBe('retained_zero_expected_departure');
    expect(row?.uniqueByExpectedCounts).toBe(false);
    expect(row?.updatedRow).toEqual(row?.currentRow);
  });

  it('preserves terminal implicit self-retention as structural rather than learned', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 't', probability: 0.5 },
        { from: 't', to: 'a', probability: 1 }
      ]
    };
    const req: FiniteHiddenStateTransitionReestimationRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 't', probability: 0 }
      ],
      alphabet: ['A', 'T'],
      kernel: [
        { stateId: 'a', symbol: 'A', probability: 1 },
        { stateId: 'a', symbol: 'T', probability: 0 },
        { stateId: 't', symbol: 'A', probability: 0 },
        { stateId: 't', symbol: 'T', probability: 1 }
      ],
      observations: ['A', 'T', 'T', 'T']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    const terminal = result.rows?.find((row) => row.stateId === 't');
    expect(terminal?.status).toBe('structural_terminal_self_retention');
    expect(terminal?.updatedRow).toEqual([{ toStateId: 't', probability: 1 }]);
    expect(terminal?.uniqueByExpectedCounts).toBe(false);
  });

  it('satisfies the independent row-simplex expected-complete-data objective on a closed-form fixture', () => {
    const m = revealingModel();
    const req = revealingRequest(['A', 'A', 'A', 'A', 'B']);
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    const counts = [
      resultExpectedCount(result, 'a', 'a'),
      resultExpectedCount(result, 'a', 'b'),
      resultExpectedCount(result, 'a', 'c')
    ];
    const production = [
      resultUpdatedProbability(result, 'a', 'a'),
      resultUpdatedProbability(result, 'a', 'b'),
      resultUpdatedProbability(result, 'a', 'c')
    ];
    const productionObjective = expectedCompleteDataRowObjective(counts, production);
    for (let aUnits = 0; aUnits <= 4; aUnits += 1) {
      for (let bUnits = 0; bUnits <= 4 - aUnits; bUnits += 1) {
        const cUnits = 4 - aUnits - bUnits;
        const candidate = [aUnits / 4, bUnits / 4, cUnits / 4];
        expect(productionObjective + 1e-12).toBeGreaterThanOrEqual(
          expectedCompleteDataRowObjective(counts, candidate)
        );
      }
    }
  });

  it('does not decrease the realized observation log likelihood beyond tolerance', () => {
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(model(), request()));
    expect(result.originalLogLikelihood).not.toBeNull();
    expect(result.updatedLogLikelihood).not.toBeNull();
    expect(result.likelihoodDelta).not.toBeNull();
    expect(result.likelihoodDelta ?? -1).toBeGreaterThanOrEqual(-result.diagnostics.likelihoodTolerance);
  });

  it('returns possible=false without fabricating an updated model for impossible evidence', () => {
    const req = request(['missing']);
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(model(), req));
    expect(result.possible).toBe(false);
    expect(result.rows).toBeNull();
    expect(result.updatedLogLikelihood).toBeNull();
    expect(result.likelihoodDelta).toBeNull();
  });

  it('keeps mathematically possible evidence available when direct sequence probability underflows', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }],
      transitions: [{ from: 'a', to: 'a', probability: 1 }]
    };
    const req: FiniteHiddenStateTransitionReestimationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      alphabet: ['rare', 'common'],
      kernel: [
        { stateId: 'a', symbol: 'rare', probability: 1e-4 },
        { stateId: 'a', symbol: 'common', probability: 1 - 1e-4 }
      ],
      observations: Array.from({ length: 220 }, () => 'rare')
    };
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req, { maxObservations: 300 }));
    expect(result.possible).toBe(true);
    expect(resultUpdatedProbability(result, 'a', 'a')).toBe(1);
    expect(result.originalLogLikelihood).not.toBeNull();
  });

  it('reduces a one-state self-loop to probability one', () => {
    const m: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only' }],
      transitions: [{ from: 'only', to: 'only', probability: { type: 'constant', value: 1 } }]
    };
    const req: FiniteHiddenStateTransitionReestimationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['x'],
      kernel: [{ stateId: 'only', symbol: 'x', probability: 1 }],
      observations: ['x', 'x', 'x']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    expect(resultUpdatedProbability(result, 'only', 'only')).toBe(1);
    expect(result.rows?.[0]?.status).toBe('updated_positive_expected_departure');
  });

  it('is invariant to state, transition, initial-distribution and kernel entry order', () => {
    const baseline = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(model(), request()));
    const permutedModel: DefinitionModel = {
      ...model(),
      states: [...model().states].reverse(),
      transitions: [...model().transitions].reverse()
    };
    const req = request();
    const permutedRequest: FiniteHiddenStateTransitionReestimationRequest = {
      ...req,
      initialDistribution: [...req.initialDistribution].reverse(),
      kernel: [...req.kernel].reverse()
    };
    const permuted = requireSuccess(
      reestimateFiniteHiddenStateTransitionsOneStep(permutedModel, permutedRequest)
    );
    expect(permuted.rows).toEqual(baseline.rows);
    expect(permuted.originalLogLikelihood).toBeCloseTo(baseline.originalLogLikelihood ?? 0, 12);
    expect(permuted.updatedLogLikelihood).toBeCloseTo(baseline.updatedLogLikelihood ?? 0, 12);
  });

  it('is invariant to equivalent parallel-transition split/merge representation', () => {
    const merged = model();
    const split: DefinitionModel = {
      ...model(),
      transitions: [
        { from: 'a', to: 'a', probability: 0.3 },
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.1 },
        { from: 'b', to: 'a', probability: 0.2 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const left = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(merged, request()));
    const right = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(split, request()));
    expect(right.rows).toEqual(left.rows);
    expect(right.updatedLogLikelihood).toBeCloseTo(left.updatedLogLikelihood ?? 0, 12);
  });

  it('retains explicit zero-probability allowed edges without creating topology', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'a', to: 'b', probability: 0 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const req: FiniteHiddenStateTransitionReestimationRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 'b', probability: 0 }
      ],
      alphabet: ['x'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 1 },
        { stateId: 'b', symbol: 'x', probability: 1 }
      ],
      observations: ['x', 'x', 'x']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(m, req));
    expect(resultUpdatedProbability(result, 'a', 'b')).toBe(0);
  });

  it('rejects invalid re-estimation tolerances', () => {
    const count = reestimateFiniteHiddenStateTransitionsOneStep(model(), request(), { countTolerance: 0 });
    expect(count.ok).toBe(false);
    if (!count.ok) expect(count.failure.code).toBe('invalid_reestimation_tolerance');

    const likelihood = reestimateFiniteHiddenStateTransitionsOneStep(model(), request(), {
      likelihoodTolerance: Number.NaN
    });
    expect(likelihood.ok).toBe(false);
    if (!likelihood.ok) expect(likelihood.failure.code).toBe('invalid_reestimation_tolerance');
  });

  it('provides deterministic checked serialization and rejects forged non-finite values', () => {
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(model(), request()));
    const first = finiteHiddenStateTransitionReestimationResultToJson(result);
    const second = finiteHiddenStateTransitionReestimationResultToJson(result);
    expect(second).toBe(first);
    const forged = structuredClone(result);
    if (forged.rows !== null && forged.rows[0] !== undefined) {
      forged.rows[0].expectedDepartureMass = Number.NaN;
    }
    expect(() => finiteHiddenStateTransitionReestimationResultToJson(forged)).toThrow(/non-finite numeric value/);
  });

  it('reports that only one transition M-step is performed', () => {
    const result = requireSuccess(reestimateFiniteHiddenStateTransitionsOneStep(model(), request()));
    expect(result.diagnostics.candidateRExpectedCountsReused).toBe(true);
    expect(result.diagnostics.observationKernelUpdated).toBe(false);
    expect(result.diagnostics.initialDistributionUpdated).toBe(false);
    expect(result.diagnostics.transitionTopologyChanged).toBe(false);
    expect(result.diagnostics.terminalRowsLearned).toBe(false);
    expect(result.diagnostics.iterativeBaumWelchUsed).toBe(false);
    expect(result.diagnostics.bayesianPriorUsed).toBe(false);
  });
});
