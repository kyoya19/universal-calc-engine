import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry
} from '../src/hidden_state_observation';
import {
  finiteHiddenStateInitialDistributionReestimationResultToJson,
  reestimateFiniteHiddenStateInitialDistributionOneStep
} from '../src/hidden_state_initial_distribution_reestimation';

type Result = ReturnType<typeof reestimateFiniteHiddenStateInitialDistributionOneStep>;
type Success = Extract<Result, { ok: true }>;

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

function requireSuccess(result: Result): Success {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(req: FiniteHiddenStateObservationRequest, stateId: StateId): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emission(req: FiniteHiddenStateObservationRequest, stateId: StateId, symbol: string): number {
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
  posteriorInitial: Map<StateId, number>;
};

function completeHiddenPathOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): EnumerationOracle | null {
  const states = m.states.map((state) => state.id);
  const initialMass = new Map(states.map((stateId) => [stateId, 0]));
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
      initialMass.set(path[0]!, (initialMass.get(path[0]!) ?? 0) + mass);
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };

  visit([]);
  if (total === 0) return null;
  return {
    probability: total,
    logLikelihood: Math.log(total),
    posteriorInitial: new Map(
      states.map((stateId) => [stateId, (initialMass.get(stateId) ?? 0) / total])
    )
  };
}

function distributionProbability(
  distribution: Array<{ stateId: StateId; probability: number }> | null,
  stateId: StateId
): number {
  return distribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function asUpdatedRequest(req: FiniteHiddenStateObservationRequest, result: Success): FiniteHiddenStateObservationRequest {
  if (!result.possible || result.updatedInitialDistribution === null) {
    throw new Error('Expected possible Candidate U result');
  }
  return {
    initialDistribution: result.updatedInitialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    kernel: req.kernel.map((entry) => ({ ...entry })),
    observations: [...req.observations]
  };
}

function simplexObjective(posteriorA: number, probabilityA: number): number {
  const posteriorB = 1 - posteriorA;
  const probabilityB = 1 - probabilityA;
  let value = 0;
  if (posteriorA > 0) {
    if (probabilityA <= 0) return Number.NEGATIVE_INFINITY;
    value += posteriorA * Math.log(probabilityA);
  }
  if (posteriorB > 0) {
    if (probabilityB <= 0) return Number.NEGATIVE_INFINITY;
    value += posteriorB * Math.log(probabilityB);
  }
  return value;
}

function expectDistributionsClose(left: Success, right: Success): void {
  expect(left.possible).toBe(right.possible);
  if (!left.possible || !right.possible) return;
  for (const stateId of ['a', 'b']) {
    expect(distributionProbability(left.updatedInitialDistribution, stateId)).toBeCloseTo(
      distributionProbability(right.updatedInitialDistribution, stateId),
      12
    );
  }
  expect(left.originalLogLikelihood).toBeCloseTo(right.originalLogLikelihood!, 12);
  expect(left.updatedLogLikelihood).toBeCloseTo(right.updatedLogLikelihood!, 12);
}

describe('Candidate U finite hidden-state initial-distribution re-estimation', () => {
  it('matches complete hidden-path posterior initial-state probabilities and independent likelihoods', () => {
    const req = request(['red', 'blue', 'red', 'red']);
    const currentOracle = completeHiddenPathOracle(model(), req)!;
    const result = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(model(), req));
    expect(result.possible).toBe(true);
    expect(result.uniqueByExpectedCounts).toBe(true);

    for (const [stateId, probability] of currentOracle.posteriorInitial) {
      expect(distributionProbability(result.posteriorInitialStateProbabilities, stateId)).toBeCloseTo(probability, 12);
      expect(distributionProbability(result.updatedInitialDistribution, stateId)).toBeCloseTo(probability, 12);
    }

    const updatedOracle = completeHiddenPathOracle(model(), asUpdatedRequest(req, result))!;
    expect(result.originalLogLikelihood).toBeCloseTo(currentOracle.logLikelihood, 12);
    expect(result.updatedLogLikelihood).toBeCloseTo(updatedOracle.logLikelihood, 12);
    expect(result.likelihoodDelta).toBeCloseTo(updatedOracle.logLikelihood - currentOracle.logLikelihood, 12);
    expect(updatedOracle.logLikelihood).toBeGreaterThanOrEqual(currentOracle.logLikelihood - 1e-12);
  });

  it('attains the independent finite-simplex expected-complete-data objective optimum', () => {
    const req = request(['red', 'blue', 'red', 'blue']);
    const oracle = completeHiddenPathOracle(model(), req)!;
    const result = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(model(), req));
    const posteriorA = oracle.posteriorInitial.get('a')!;
    const updatedA = distributionProbability(result.updatedInitialDistribution, 'a');
    const actualObjective = simplexObjective(posteriorA, updatedA);
    let bestGrid = Number.NEGATIVE_INFINITY;
    for (let index = 0; index <= 1000; index += 1) {
      bestGrid = Math.max(bestGrid, simplexObjective(posteriorA, index / 1000));
    }
    expect(updatedA).toBeCloseTo(posteriorA, 12);
    expect(actualObjective).toBeGreaterThanOrEqual(bestGrid - 1e-12);
  });

  it('uses zero posterior initial mass as zero updated mass and handles point-mass reductions', () => {
    const revealing: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.4 }, { stateId: 'b', probability: 0.6 }],
      alphabet: ['A', 'B'],
      kernel: [
        { stateId: 'a', symbol: 'A', probability: 1 },
        { stateId: 'a', symbol: 'B', probability: 0 },
        { stateId: 'b', symbol: 'A', probability: 0 },
        { stateId: 'b', symbol: 'B', probability: 1 }
      ],
      observations: ['A']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(revealing, req));
    expect(distributionProbability(result.updatedInitialDistribution, 'a')).toBe(1);
    expect(distributionProbability(result.updatedInitialDistribution, 'b')).toBe(0);

    const one: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const oneReq: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['x'],
      kernel: [{ stateId: 'only', symbol: 'x', probability: 1 }],
      observations: ['x', 'x']
    };
    const oneResult = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(one, oneReq));
    expect(oneResult.updatedInitialDistribution).toEqual([{ stateId: 'only', probability: 1 }]);
  });

  it('preserves impossible-evidence honesty and separates direct probability underflow', () => {
    const one: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const impossible: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['yes', 'no'],
      kernel: [
        { stateId: 'only', symbol: 'yes', probability: 1 },
        { stateId: 'only', symbol: 'no', probability: 0 }
      ],
      observations: ['no']
    };
    const impossibleResult = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(one, impossible));
    expect(impossibleResult.possible).toBe(false);
    expect(impossibleResult.posteriorInitialStateProbabilities).toBeNull();
    expect(impossibleResult.updatedInitialDistribution).toBeNull();
    expect(impossibleResult.uniqueByExpectedCounts).toBeNull();

    const underflow: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['tiny', 'other'],
      kernel: [
        { stateId: 'only', symbol: 'tiny', probability: 1e-50 },
        { stateId: 'only', symbol: 'other', probability: 1 - 1e-50 }
      ],
      observations: Array.from({ length: 10 }, () => 'tiny')
    };
    const underflowResult = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(one, underflow));
    expect(underflowResult.possible).toBe(true);
    expect(underflowResult.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(underflowResult.originalLogLikelihood).not.toBeNull();
    expect(underflowResult.updatedLogLikelihood).not.toBeNull();
  });

  it('is invariant to equivalent ordering, symbol renaming and parallel-transition split representation', () => {
    const req = request();
    const baseline = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(model(), req));
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
    expectDistributionsClose(
      requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(permutedModel, permutedReq)),
      baseline
    );

    const rename = (symbol: string): string => symbol === 'red' ? 'R' : 'B';
    const renamedReq: FiniteHiddenStateObservationRequest = {
      initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
      alphabet: req.alphabet.map(rename),
      kernel: req.kernel.map((entry) => ({ ...entry, symbol: rename(entry.symbol) })),
      observations: req.observations.map(rename)
    };
    expectDistributionsClose(
      requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(model(), renamedReq)),
      baseline
    );

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
    expectDistributionsClose(
      requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(split, req)),
      baseline
    );
  });

  it('rejects invalid tolerance and provides checked deterministic serialization', () => {
    const invalid = reestimateFiniteHiddenStateInitialDistributionOneStep(model(), request(), {
      likelihoodTolerance: Number.NaN
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) throw new Error('Expected invalid tolerance failure');
    expect(invalid.failure.code).toBe('invalid_reestimation_tolerance');

    const result = requireSuccess(reestimateFiniteHiddenStateInitialDistributionOneStep(model(), request()));
    const first = finiteHiddenStateInitialDistributionReestimationResultToJson(result);
    const second = finiteHiddenStateInitialDistributionReestimationResultToJson(result);
    expect(second).toBe(first);
    expect(JSON.parse(first).possible).toBe(true);

    const forged = { ...result, likelihoodDelta: Number.NaN };
    expect(() => finiteHiddenStateInitialDistributionReestimationResultToJson(forged as never)).toThrow(
      /non-finite numeric value/
    );
  });
});
