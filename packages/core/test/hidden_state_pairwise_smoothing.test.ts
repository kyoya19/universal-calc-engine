import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry
} from '../src/hidden_state_observation';
import { smoothFiniteHiddenStateObservationSequence } from '../src/hidden_state_smoothing';
import {
  FiniteHiddenStatePairwiseSmoothingResult,
  FiniteHiddenStatePairwiseSmoothingSuccess,
  finiteHiddenStatePairwiseSmoothingResultToJson,
  smoothFiniteHiddenStatePairwiseTransitions
} from '../src/hidden_state_pairwise_smoothing';

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
  result: FiniteHiddenStatePairwiseSmoothingResult
): FiniteHiddenStatePairwiseSmoothingSuccess {
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

function pairKey(from: StateId, to: StateId): string {
  return `${from}\u0000${to}`;
}

type PairwiseOracle = {
  steps: Array<Map<string, number>>;
  counts: Map<string, number>;
};

function completePathPairwiseOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): PairwiseOracle | null {
  const states = m.states.map((state) => state.id);
  const pairMassByStep = Array.from(
    { length: Math.max(0, req.observations.length - 1) },
    () => new Map<string, number>()
  );
  const countMass = new Map<string, number>();
  for (const from of states) {
    for (const to of states) countMass.set(pairKey(from, to), 0);
  }
  let total = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === req.observations.length) {
      const firstState = path[0];
      const firstObservation = req.observations[0];
      if (firstState === undefined || firstObservation === undefined) return;
      let probability = initialProbability(req, firstState) * emission(req, firstState, firstObservation);
      for (let step = 1; step < path.length; step += 1) {
        const from = path[step - 1];
        const to = path[step];
        const observation = req.observations[step];
        if (from === undefined || to === undefined || observation === undefined) return;
        probability *= transition(m, from, to);
        probability *= emission(req, to, observation);
      }
      total += probability;
      for (let step = 0; step < path.length - 1; step += 1) {
        const from = path[step];
        const to = path[step + 1];
        if (from === undefined || to === undefined) continue;
        const key = pairKey(from, to);
        const byStep = pairMassByStep[step];
        if (byStep === undefined) continue;
        byStep.set(key, (byStep.get(key) ?? 0) + probability);
        countMass.set(key, (countMass.get(key) ?? 0) + probability);
      }
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };

  visit([]);
  if (total === 0) return null;
  return {
    steps: pairMassByStep.map(
      (map) => new Map([...map.entries()].map(([key, mass]) => [key, mass / total] as const))
    ),
    counts: new Map([...countMass.entries()].map(([key, mass]) => [key, mass / total] as const))
  };
}

function rawJointForwardBackwardPairwiseOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): PairwiseOracle | null {
  const states = m.states.map((state) => state.id);
  const firstObservation = req.observations[0];
  if (firstObservation === undefined) return null;
  const forward: Array<Map<StateId, number>> = [];
  const first = new Map<StateId, number>();
  for (const stateId of states) {
    first.set(stateId, initialProbability(req, stateId) * emission(req, stateId, firstObservation));
  }
  forward.push(first);
  for (let step = 1; step < req.observations.length; step += 1) {
    const observation = req.observations[step];
    if (observation === undefined) return null;
    const row = new Map<StateId, number>();
    for (const to of states) {
      let predicted = 0;
      for (const from of states) {
        predicted += (forward[step - 1]?.get(from) ?? 0) * transition(m, from, to);
      }
      row.set(to, predicted * emission(req, to, observation));
    }
    forward.push(row);
  }

  const final = forward[forward.length - 1];
  if (final === undefined) return null;
  const total = states.reduce((sum, stateId) => sum + (final.get(stateId) ?? 0), 0);
  if (total === 0) return null;

  const backward: Array<Map<StateId, number>> = new Array(req.observations.length);
  backward[req.observations.length - 1] = new Map(states.map((stateId) => [stateId, 1] as const));
  for (let step = req.observations.length - 2; step >= 0; step -= 1) {
    const observation = req.observations[step + 1];
    const next = backward[step + 1];
    if (observation === undefined || next === undefined) return null;
    const row = new Map<StateId, number>();
    for (const from of states) {
      let value = 0;
      for (const to of states) {
        value += transition(m, from, to) * emission(req, to, observation) * (next.get(to) ?? 0);
      }
      row.set(from, value);
    }
    backward[step] = row;
  }

  const steps: Array<Map<string, number>> = [];
  const counts = new Map<string, number>();
  for (const from of states) for (const to of states) counts.set(pairKey(from, to), 0);
  for (let step = 0; step < req.observations.length - 1; step += 1) {
    const observation = req.observations[step + 1];
    const alpha = forward[step];
    const betaNext = backward[step + 1];
    if (observation === undefined || alpha === undefined || betaNext === undefined) return null;
    const pairMass = new Map<string, number>();
    let pairTotal = 0;
    for (const from of states) {
      for (const to of states) {
        const value = (alpha.get(from) ?? 0)
          * transition(m, from, to)
          * emission(req, to, observation)
          * (betaNext.get(to) ?? 0);
        pairMass.set(pairKey(from, to), value);
        pairTotal += value;
      }
    }
    if (pairTotal === 0) return null;
    const normalized = new Map<string, number>();
    for (const [key, value] of pairMass) {
      const probability = value / pairTotal;
      normalized.set(key, probability);
      counts.set(key, (counts.get(key) ?? 0) + probability);
    }
    steps.push(normalized);
  }
  return { steps, counts };
}

function resultPairProbability(
  result: FiniteHiddenStatePairwiseSmoothingSuccess,
  step: number,
  from: StateId,
  to: StateId
): number {
  return result.steps[step]?.pairwiseDistribution?.find(
    (entry) => entry.fromStateId === from && entry.toStateId === to
  )?.probability ?? 0;
}

function resultExpectedCount(
  result: FiniteHiddenStatePairwiseSmoothingSuccess,
  from: StateId,
  to: StateId
): number {
  return result.expectedTransitionCounts?.find(
    (entry) => entry.fromStateId === from && entry.toStateId === to
  )?.expectedCount ?? 0;
}

function expectOracleAgreement(result: FiniteHiddenStatePairwiseSmoothingSuccess, oracle: PairwiseOracle): void {
  const stateIds = model().states.map((state) => state.id);
  for (let step = 0; step < oracle.steps.length; step += 1) {
    for (const from of stateIds) {
      for (const to of stateIds) {
        expect(resultPairProbability(result, step, from, to)).toBeCloseTo(
          oracle.steps[step]?.get(pairKey(from, to)) ?? 0,
          12
        );
      }
    }
  }
  for (const from of stateIds) {
    for (const to of stateIds) {
      expect(resultExpectedCount(result, from, to)).toBeCloseTo(
        oracle.counts.get(pairKey(from, to)) ?? 0,
        12
      );
    }
  }
}

describe('Candidate R finite hidden-state pairwise smoothing', () => {
  it('agrees with complete hidden-path enumeration for pairwise marginals and expected counts', () => {
    const req = request();
    const oracle = completePathPairwiseOracle(model(), req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), req));
    expect(result.possible).toBe(true);
    expectOracleAgreement(result, oracle!);
  });

  it('agrees with an independent raw-joint forward/backward pairwise oracle', () => {
    const req = request(['blue', 'red', 'blue']);
    const oracle = rawJointForwardBackwardPairwiseOracle(model(), req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), req));
    expectOracleAgreement(result, oracle!);
  });

  it('has Candidate H row and column marginals at every transition index', () => {
    const req = request();
    const pairwise = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), req));
    const smooth = smoothFiniteHiddenStateObservationSequence(model(), req);
    if (!smooth.ok || !smooth.possible) throw new Error('Expected possible Candidate H result');
    for (let step = 0; step < pairwise.steps.length; step += 1) {
      const distribution = pairwise.steps[step]?.pairwiseDistribution;
      expect(distribution).not.toBeNull();
      for (const stateId of ['a', 'b']) {
        const row = distribution?.filter((entry) => entry.fromStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0) ?? 0;
        const column = distribution?.filter((entry) => entry.toStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0) ?? 0;
        const expectedRow = smooth.steps[step]?.smoothedDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
        const expectedColumn = smooth.steps[step + 1]?.smoothedDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
        expect(row).toBeCloseTo(expectedRow, 12);
        expect(column).toBeCloseTo(expectedColumn, 12);
      }
    }
  });

  it('expected transition counts equal the sum of pairwise posterior steps and total transition count', () => {
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), request()));
    expect(result.expectedTransitionCounts).not.toBeNull();
    let total = 0;
    for (const count of result.expectedTransitionCounts ?? []) {
      const summed = result.steps.reduce(
        (sum, step) => sum + (step.pairwiseDistribution?.find(
          (entry) => entry.fromStateId === count.fromStateId && entry.toStateId === count.toStateId
        )?.probability ?? 0),
        0
      );
      expect(count.expectedCount).toBeCloseTo(summed, 12);
      total += count.expectedCount;
    }
    expect(total).toBeCloseTo(2, 12);
  });

  it('reduces a single observation to no pairwise steps and all-zero expected counts', () => {
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), request(['red'])));
    expect(result.possible).toBe(true);
    expect(result.steps).toEqual([]);
    expect(result.expectedTransitionCounts?.every((entry) => entry.expectedCount === 0)).toBe(true);
  });

  it('returns point-mass transition posteriors for a perfectly revealing deterministic path', () => {
    const m: DefinitionModel = {
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
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(m, req));
    expect(resultPairProbability(result, 0, 'a', 'b')).toBe(1);
    expect(resultPairProbability(result, 1, 'b', 'b')).toBe(1);
    expect(resultExpectedCount(result, 'a', 'b')).toBe(1);
    expect(resultExpectedCount(result, 'b', 'b')).toBe(1);
  });

  it('preserves mathematically impossible sequence semantics without fabricating pairwise posteriors', () => {
    const m: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['yes', 'no'],
      kernel: [
        { stateId: 'only', symbol: 'yes', probability: 1 },
        { stateId: 'only', symbol: 'no', probability: 0 }
      ],
      observations: ['no', 'yes']
    };
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(m, req));
    expect(result.possible).toBe(false);
    expect(result.expectedTransitionCounts).toBeNull();
    expect(result.steps.every((step) => step.pairwiseDistribution === null)).toBe(true);
    expect(result.logLikelihood).toBeNull();
    expect(result.diagnostics.impossibleAtStep).toBe(0);
  });

  it('retains pairwise smoothing when direct sequence probability underflows', () => {
    const m: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['tiny', 'other'],
      kernel: [
        { stateId: 'only', symbol: 'tiny', probability: 1e-50 },
        { stateId: 'only', symbol: 'other', probability: 1 - 1e-50 }
      ],
      observations: Array.from({ length: 10 }, () => 'tiny')
    };
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(m, req));
    expect(result.possible).toBe(true);
    expect(result.sequenceProbability).toBeNull();
    expect(result.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(result.steps.every((step) => step.pairwiseDistribution?.[0]?.probability === 1)).toBe(true);
    expect(resultExpectedCount(result, 'only', 'only')).toBeCloseTo(9, 12);
  });

  it('is invariant to state, transition, initial-distribution, alphabet and kernel entry order', () => {
    const req = request();
    const baseline = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), req));
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
    const permuted = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(permutedModel, permutedReq));
    expect(permuted.steps).toEqual(baseline.steps);
    expect(permuted.expectedTransitionCounts).toEqual(baseline.expectedTransitionCounts);
  });

  it('is invariant to equivalent parallel-transition split/merge', () => {
    const split: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.3 },
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.3 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const baseline = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), request()));
    const actual = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(split, request()));
    expect(actual.steps).toEqual(baseline.steps);
    expect(actual.expectedTransitionCounts).toEqual(baseline.expectedTransitionCounts);
  });

  it('inherits Candidate C terminal implicit self-retention semantics', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['x'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 1 },
        { stateId: 'b', symbol: 'x', probability: 1 }
      ],
      observations: ['x', 'x', 'x', 'x']
    };
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(m, req));
    expect(resultExpectedCount(result, 'a', 'b')).toBeCloseTo(1, 12);
    expect(resultExpectedCount(result, 'b', 'b')).toBeCloseTo(2, 12);
  });

  it('propagates Candidate C validation failure semantics', () => {
    const req = request();
    req.alphabet = ['red', 'red'];
    const result = smoothFiniteHiddenStatePairwiseTransitions(model(), req);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('Expected failure');
    expect(result.failure.code).toBe('duplicate_observation_symbol');
  });

  it('serializes deterministically', () => {
    const result = smoothFiniteHiddenStatePairwiseTransitions(model(), request());
    expect(finiteHiddenStatePairwiseSmoothingResultToJson(result)).toBe(JSON.stringify(result));
  });

  it('rejects forged non-finite analytical values during serialization', () => {
    const result = requireSuccess(smoothFiniteHiddenStatePairwiseTransitions(model(), request()));
    const forged = structuredClone(result);
    if (forged.expectedTransitionCounts === null || forged.expectedTransitionCounts[0] === undefined) {
      throw new Error('Expected finite transition counts');
    }
    forged.expectedTransitionCounts[0].expectedCount = Number.POSITIVE_INFINITY;
    expect(() => finiteHiddenStatePairwiseSmoothingResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
