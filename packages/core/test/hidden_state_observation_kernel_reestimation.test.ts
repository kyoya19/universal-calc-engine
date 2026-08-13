import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry
} from '../src/hidden_state_observation';
import { smoothFiniteHiddenStateObservationSequence } from '../src/hidden_state_smoothing';
import {
  FiniteHiddenStateObservationKernelReestimationResult,
  FiniteHiddenStateObservationKernelReestimationSuccess,
  ObservationKernelReestimationRow,
  finiteHiddenStateObservationKernelReestimationResultToJson,
  reestimateFiniteHiddenStateObservationKernelOneStep
} from '../src/hidden_state_observation_kernel_reestimation';

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

function request(observations: string[] = ['red', 'blue', 'red']): FiniteHiddenStateObservationRequest {
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
  result: FiniteHiddenStateObservationKernelReestimationResult
): FiniteHiddenStateObservationKernelReestimationSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(req: FiniteHiddenStateObservationRequest, stateId: StateId): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emission(
  req: FiniteHiddenStateObservationRequest,
  stateId: StateId,
  symbol: string
): number {
  return req.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function transition(m: DefinitionModel, from: StateId, to: StateId): number {
  const source = m.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

type EnumerationOracle = {
  probability: number;
  logLikelihood: number;
  marginals: Array<Map<StateId, number>>;
  counts: Map<StateId, Map<string, number>>;
  occupancy: Map<StateId, number>;
};

function completeHiddenPathOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): EnumerationOracle | null {
  const states = m.states.map((state) => state.id);
  const symbols = [...req.alphabet];
  const marginalMass = req.observations.map(() => new Map(states.map((stateId) => [stateId, 0])));
  const countMass = new Map<StateId, Map<string, number>>(
    states.map((stateId) => [stateId, new Map(symbols.map((symbol) => [symbol, 0]))])
  );
  let total = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === req.observations.length) {
      let mass = initialProbability(req, path[0]!);
      mass *= emission(req, path[0]!, req.observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        mass *= transition(m, path[step - 1]!, path[step]!);
        mass *= emission(req, path[step]!, req.observations[step]!);
      }
      total += mass;
      for (let step = 0; step < path.length; step += 1) {
        const stateId = path[step]!;
        const symbol = req.observations[step]!;
        const marginal = marginalMass[step]!;
        marginal.set(stateId, (marginal.get(stateId) ?? 0) + mass);
        const row = countMass.get(stateId)!;
        row.set(symbol, (row.get(symbol) ?? 0) + mass);
      }
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  if (total === 0) return null;

  const marginals = marginalMass.map(
    (row) => new Map(states.map((stateId) => [stateId, (row.get(stateId) ?? 0) / total]))
  );
  const counts = new Map<StateId, Map<string, number>>();
  const occupancy = new Map<StateId, number>();
  for (const stateId of states) {
    const raw = countMass.get(stateId)!;
    const normalized = new Map(symbols.map((symbol) => [symbol, (raw.get(symbol) ?? 0) / total]));
    counts.set(stateId, normalized);
    occupancy.set(stateId, [...normalized.values()].reduce((sum, value) => sum + value, 0));
  }
  return { probability: total, logLikelihood: Math.log(total), marginals, counts, occupancy };
}

function row(result: FiniteHiddenStateObservationKernelReestimationSuccess, stateId: StateId): ObservationKernelReestimationRow {
  const found = result.rows?.find((candidate) => candidate.stateId === stateId);
  if (found === undefined) throw new Error(`Missing row ${stateId}`);
  return found;
}

function rowProbability(rowValue: ObservationKernelReestimationRow, symbol: string): number {
  return rowValue.updatedRow.find((entry) => entry.symbol === symbol)?.probability ?? 0;
}

function resultAsUpdatedRequest(
  req: FiniteHiddenStateObservationRequest,
  result: FiniteHiddenStateObservationKernelReestimationSuccess
): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    observations: [...req.observations],
    kernel: result.rows!.flatMap((stateRow) =>
      stateRow.updatedRow.map((entry) => ({
        stateId: stateRow.stateId,
        symbol: entry.symbol,
        probability: entry.probability
      }))
    )
  };
}

function expectedObjective(counts: Map<string, number>, probabilities: Map<string, number>): number {
  let total = 0;
  for (const [symbol, count] of counts) {
    if (count === 0) continue;
    const probability = probabilities.get(symbol) ?? 0;
    if (probability <= 0) return Number.NEGATIVE_INFINITY;
    total += count * Math.log(probability);
  }
  return total;
}

function expectRowsClose(
  left: FiniteHiddenStateObservationKernelReestimationSuccess,
  right: FiniteHiddenStateObservationKernelReestimationSuccess
): void {
  expect(left.rows?.map((entry) => entry.stateId)).toEqual(right.rows?.map((entry) => entry.stateId));
  for (const leftRow of left.rows ?? []) {
    const rightRow = row(right, leftRow.stateId);
    expect(rightRow.status).toBe(leftRow.status);
    expect(rightRow.uniqueByExpectedCounts).toBe(leftRow.uniqueByExpectedCounts);
    expect(rightRow.expectedOccupancy).toBeCloseTo(leftRow.expectedOccupancy, 12);
    for (const entry of leftRow.expectedCounts) {
      const expected = rightRow.expectedCounts.find((candidate) => candidate.symbol === entry.symbol)?.expectedCount;
      expect(expected).toBeDefined();
      expect(expected!).toBeCloseTo(entry.expectedCount, 12);
    }
    for (const entry of leftRow.updatedRow) {
      expect(rowProbability(rightRow, entry.symbol)).toBeCloseTo(entry.probability, 12);
    }
  }
}

describe('Candidate T finite hidden-state observation-kernel re-estimation', () => {
  it('matches complete hidden-path posterior emission counts and independent M-step rows', () => {
    const req = request();
    const oracle = completeHiddenPathOracle(model(), req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), req));
    expect(result.possible).toBe(true);

    for (let step = 0; step < oracle!.marginals.length; step += 1) {
      const smoothing = smoothFiniteHiddenStateObservationSequence(model(), req);
      if (!smoothing.ok || !smoothing.possible) throw new Error('Expected possible Candidate H result');
      for (const [stateId, probability] of oracle!.marginals[step]!) {
        const actual = smoothing.steps[step]!.smoothedDistribution!
          .find((entry) => entry.stateId === stateId)!.probability;
        expect(actual).toBeCloseTo(probability, 12);
      }
    }

    for (const stateId of model().states.map((state) => state.id)) {
      const actualRow = row(result, stateId);
      const oracleCounts = oracle!.counts.get(stateId)!;
      const oracleOccupancy = oracle!.occupancy.get(stateId)!;
      expect(actualRow.expectedOccupancy).toBeCloseTo(oracleOccupancy, 12);
      for (const [symbol, expectedCount] of oracleCounts) {
        const actualCount = actualRow.expectedCounts.find((entry) => entry.symbol === symbol)!.expectedCount;
        expect(actualCount).toBeCloseTo(expectedCount, 12);
        expect(rowProbability(actualRow, symbol)).toBeCloseTo(expectedCount / oracleOccupancy, 12);
      }
    }
  });

  it('matches an independent complete-path current/updated likelihood oracle and does not decrease likelihood', () => {
    const req = request(['red', 'blue', 'blue', 'red']);
    const currentOracle = completeHiddenPathOracle(model(), req)!;
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), req));
    const updatedReq = resultAsUpdatedRequest(req, result);
    const updatedOracle = completeHiddenPathOracle(model(), updatedReq)!;

    expect(result.originalLogLikelihood).toBeCloseTo(currentOracle.logLikelihood, 12);
    expect(result.updatedLogLikelihood).toBeCloseTo(updatedOracle.logLikelihood, 12);
    expect(result.likelihoodDelta).toBeCloseTo(
      updatedOracle.logLikelihood - currentOracle.logLikelihood,
      12
    );
    expect(updatedOracle.logLikelihood).toBeGreaterThanOrEqual(currentOracle.logLikelihood - 1e-12);
  });

  it('attains the independent categorical-simplex expected-complete-data row objective optimum', () => {
    const req = request(['red', 'blue', 'red', 'red']);
    const oracle = completeHiddenPathOracle(model(), req)!;
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), req));

    for (const stateId of ['a', 'b']) {
      const counts = oracle.counts.get(stateId)!;
      const actualRow = row(result, stateId);
      const actualProbabilities = new Map(actualRow.updatedRow.map((entry) => [entry.symbol, entry.probability]));
      const actualObjective = expectedObjective(counts, actualProbabilities);
      let bestGrid = Number.NEGATIVE_INFINITY;
      for (let index = 0; index <= 1000; index += 1) {
        const red = index / 1000;
        const candidate = new Map<string, number>([['red', red], ['blue', 1 - red]]);
        bestGrid = Math.max(bestGrid, expectedObjective(counts, candidate));
      }
      expect(actualObjective).toBeGreaterThanOrEqual(bestGrid - 1e-12);
    }
  });

  it('reduces to empirical per-state observation frequencies for a deterministically known hidden path', () => {
    const deterministic: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.6 },
        { stateId: 'a', symbol: 'y', probability: 0.4 },
        { stateId: 'b', symbol: 'x', probability: 0.3 },
        { stateId: 'b', symbol: 'y', probability: 0.7 }
      ],
      observations: ['x', 'y', 'y']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(deterministic, req));
    expect(rowProbability(row(result, 'a'), 'x')).toBe(1);
    expect(rowProbability(row(result, 'a'), 'y')).toBe(0);
    expect(rowProbability(row(result, 'b'), 'x')).toBe(0);
    expect(rowProbability(row(result, 'b'), 'y')).toBe(1);
  });

  it('reduces in a one-state hidden model to empirical observation-symbol frequencies', () => {
    const one: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only', terminal: true }],
      transitions: []
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'only', symbol: 'x', probability: 0.6 },
        { stateId: 'only', symbol: 'y', probability: 0.4 }
      ],
      observations: ['x', 'x', 'y']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(one, req));
    expect(rowProbability(row(result, 'only'), 'x')).toBeCloseTo(2 / 3, 12);
    expect(rowProbability(row(result, 'only'), 'y')).toBeCloseTo(1 / 3, 12);
  });

  it('retains a zero-occupancy state row and reports no-information/non-unique semantics', () => {
    const unreachable: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 'a', symbol: 'red', probability: 0.7 },
        { stateId: 'a', symbol: 'blue', probability: 0.3 },
        { stateId: 'b', symbol: 'red', probability: 0.25 },
        { stateId: 'b', symbol: 'blue', probability: 0.75 }
      ],
      observations: ['red', 'red']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(unreachable, req));
    const b = row(result, 'b');
    expect(b.expectedOccupancy).toBe(0);
    expect(b.status).toBe('retained_zero_expected_occupancy');
    expect(b.uniqueByExpectedCounts).toBe(false);
    expect(b.updatedRow).toEqual(b.currentRow);
    expect(b.updatedRow).toEqual([
      { symbol: 'blue', probability: 0.75 },
      { symbol: 'red', probability: 0.25 }
    ]);
  });

  it('retains fully revealing categorical rows when evidence is consistent', () => {
    const deterministic: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['A', 'B'],
      kernel: [
        { stateId: 'a', symbol: 'A', probability: 1 },
        { stateId: 'a', symbol: 'B', probability: 0 },
        { stateId: 'b', symbol: 'A', probability: 0 },
        { stateId: 'b', symbol: 'B', probability: 1 }
      ],
      observations: ['A', 'B', 'B']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(deterministic, req));
    expect(row(result, 'a').updatedRow).toEqual(row(result, 'a').currentRow);
    expect(row(result, 'b').updatedRow).toEqual(row(result, 'b').currentRow);
  });

  it('preserves impossible observation semantics without fabricating a kernel estimate', () => {
    const one: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only', terminal: true }],
      transitions: []
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['yes', 'no'],
      kernel: [
        { stateId: 'only', symbol: 'yes', probability: 1 },
        { stateId: 'only', symbol: 'no', probability: 0 }
      ],
      observations: ['no']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(one, req));
    expect(result.possible).toBe(false);
    expect(result.rows).toBeNull();
    expect(result.originalLogLikelihood).toBeNull();
    expect(result.updatedLogLikelihood).toBeNull();
  });

  it('separates direct-probability underflow from mathematical impossibility', () => {
    const one: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only', terminal: true }],
      transitions: []
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['tiny', 'other'],
      kernel: [
        { stateId: 'only', symbol: 'tiny', probability: 1e-50 },
        { stateId: 'only', symbol: 'other', probability: 1 - 1e-50 }
      ],
      observations: Array.from({ length: 10 }, () => 'tiny')
    };
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(one, req));
    expect(result.possible).toBe(true);
    expect(result.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(result.originalLogLikelihood).not.toBeNull();
    expect(result.updatedLogLikelihood).toBeCloseTo(0, 12);
    expect(rowProbability(row(result, 'only'), 'tiny')).toBe(1);
  });

  it('is invariant to state, transition, initial, alphabet and kernel entry ordering', () => {
    const req = request();
    const baseline = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), req));
    const permutedModel: DefinitionModel = {
      ...model(),
      states: [...model().states].reverse(),
      transitions: [...model().transitions].reverse()
    };
    const permutedReq: FiniteHiddenStateObservationRequest = {
      ...req,
      initialDistribution: [...req.initialDistribution].reverse(),
      alphabet: [...req.alphabet].reverse(),
      kernel: [...req.kernel].reverse()
    };
    const permuted = requireSuccess(
      reestimateFiniteHiddenStateObservationKernelOneStep(permutedModel, permutedReq)
    );
    expectRowsClose(permuted, baseline);
    expect(permuted.originalLogLikelihood).toBeCloseTo(baseline.originalLogLikelihood!, 12);
    expect(permuted.updatedLogLikelihood).toBeCloseTo(baseline.updatedLogLikelihood!, 12);
  });

  it('is invariant under bijective observation-symbol renaming', () => {
    const req = request();
    const baseline = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), req));
    const rename = (symbol: string): string => symbol === 'red' ? 'R' : 'B';
    const renamed: FiniteHiddenStateObservationRequest = {
      initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
      alphabet: req.alphabet.map(rename),
      kernel: req.kernel.map((entry) => ({ ...entry, symbol: rename(entry.symbol) })),
      observations: req.observations.map(rename)
    };
    const transformed = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), renamed));
    for (const stateId of ['a', 'b']) {
      expect(rowProbability(row(transformed, stateId), 'R')).toBeCloseTo(
        rowProbability(row(baseline, stateId), 'red'),
        12
      );
      expect(rowProbability(row(transformed, stateId), 'B')).toBeCloseTo(
        rowProbability(row(baseline, stateId), 'blue'),
        12
      );
    }
  });

  it('is invariant to equivalent parallel-transition split/merge representations', () => {
    const merged = model();
    const split: DefinitionModel = {
      ...merged,
      transitions: [
        { from: 'a', to: 'a', probability: 0.3 },
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.1 },
        { from: 'b', to: 'a', probability: 0.2 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const left = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(merged, request()));
    const right = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(split, request()));
    expectRowsClose(left, right);
  });

  it('rejects invalid re-estimation tolerances explicitly', () => {
    const zero = reestimateFiniteHiddenStateObservationKernelOneStep(model(), request(), { countTolerance: 0 });
    expect(zero.ok).toBe(false);
    if (zero.ok) throw new Error('Expected invalid count tolerance failure');
    expect(zero.failure.code).toBe('invalid_reestimation_tolerance');

    const nan = reestimateFiniteHiddenStateObservationKernelOneStep(model(), request(), {
      likelihoodTolerance: Number.NaN
    });
    expect(nan.ok).toBe(false);
    if (nan.ok) throw new Error('Expected invalid likelihood tolerance failure');
    expect(nan.failure.code).toBe('invalid_reestimation_tolerance');
  });

  it('serializes deterministically and rejects forged non-finite analytical values', () => {
    const result = requireSuccess(reestimateFiniteHiddenStateObservationKernelOneStep(model(), request()));
    const first = finiteHiddenStateObservationKernelReestimationResultToJson(result);
    const second = finiteHiddenStateObservationKernelReestimationResultToJson(result);
    expect(second).toBe(first);
    expect(JSON.parse(first).possible).toBe(true);

    const forged: FiniteHiddenStateObservationKernelReestimationResult = {
      ...result,
      likelihoodDelta: Number.NaN
    };
    expect(() => finiteHiddenStateObservationKernelReestimationResultToJson(forged)).toThrow(
      /non-finite numeric value/
    );
  });
});
