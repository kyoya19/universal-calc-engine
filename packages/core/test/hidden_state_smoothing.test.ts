import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from '../src/hidden_state_observation';
import {
  FiniteHiddenStateSmoothingResult,
  FiniteHiddenStateSmoothingSuccess,
  finiteHiddenStateSmoothingResultToJson,
  smoothFiniteHiddenStateObservationSequence
} from '../src/hidden_state_smoothing';

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

function requireSuccess(result: FiniteHiddenStateSmoothingResult): FiniteHiddenStateSmoothingSuccess {
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

function pathEnumerationSmoothingOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): Array<Map<StateId, number>> | null {
  const states = m.states.map((state) => state.id);
  const massByStep = req.observations.map(() => new Map<StateId, number>());
  for (const map of massByStep) for (const stateId of states) map.set(stateId, 0);
  let total = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === req.observations.length) {
      let probability = initialProbability(req, path[0]!);
      probability *= emission(req, path[0]!, req.observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        probability *= transition(m, path[step - 1]!, path[step]!);
        probability *= emission(req, path[step]!, req.observations[step]!);
      }
      total += probability;
      for (let step = 0; step < path.length; step += 1) {
        const stateId = path[step]!;
        const map = massByStep[step]!;
        map.set(stateId, (map.get(stateId) ?? 0) + probability);
      }
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  if (total === 0) return null;
  return massByStep.map((map) => new Map(states.map((stateId) => [stateId, (map.get(stateId) ?? 0) / total])));
}

function denseRawForwardBackwardOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateObservationRequest
): Array<Map<StateId, number>> | null {
  const states = m.states.map((state) => state.id);
  const forward: Array<Map<StateId, number>> = [];
  const first = new Map<StateId, number>();
  for (const stateId of states) {
    first.set(stateId, initialProbability(req, stateId) * emission(req, stateId, req.observations[0]!));
  }
  forward.push(first);
  for (let step = 1; step < req.observations.length; step += 1) {
    const row = new Map<StateId, number>();
    for (const to of states) {
      let predicted = 0;
      for (const from of states) predicted += (forward[step - 1]!.get(from) ?? 0) * transition(m, from, to);
      row.set(to, predicted * emission(req, to, req.observations[step]!));
    }
    forward.push(row);
  }
  const total = states.reduce((sum, stateId) => sum + (forward.at(-1)?.get(stateId) ?? 0), 0);
  if (total === 0) return null;

  const backward: Array<Map<StateId, number>> = new Array(req.observations.length);
  backward[req.observations.length - 1] = new Map(states.map((stateId) => [stateId, 1]));
  for (let step = req.observations.length - 2; step >= 0; step -= 1) {
    const row = new Map<StateId, number>();
    for (const from of states) {
      let value = 0;
      for (const to of states) {
        value += transition(m, from, to)
          * emission(req, to, req.observations[step + 1]!)
          * (backward[step + 1]!.get(to) ?? 0);
      }
      row.set(from, value);
    }
    backward[step] = row;
  }
  return forward.map((row, step) => {
    const joint = new Map<StateId, number>();
    let jointTotal = 0;
    for (const stateId of states) {
      const value = (row.get(stateId) ?? 0) * (backward[step]!.get(stateId) ?? 0);
      joint.set(stateId, value);
      jointTotal += value;
    }
    return new Map(states.map((stateId) => [stateId, (joint.get(stateId) ?? 0) / jointTotal]));
  });
}

function resultProbability(result: FiniteHiddenStateSmoothingSuccess, step: number, stateId: StateId): number {
  return result.steps[step]?.smoothedDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function expectOracleAgreement(
  result: FiniteHiddenStateSmoothingSuccess,
  oracle: Array<Map<StateId, number>>
): void {
  for (let step = 0; step < oracle.length; step += 1) {
    for (const [stateId, probability] of oracle[step]!) {
      expect(resultProbability(result, step, stateId)).toBeCloseTo(probability, 12);
    }
  }
}

describe('Candidate H finite hidden-state smoothing', () => {
  it('agrees with complete hidden-path enumeration', () => {
    const req = request();
    const oracle = pathEnumerationSmoothingOracle(model(), req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    expect(result.possible).toBe(true);
    expectOracleAgreement(result, oracle!);
  });

  it('agrees with an independent dense raw-joint forward/backward oracle', () => {
    const req = request(['blue', 'red', 'blue']);
    const oracle = denseRawForwardBackwardOracle(model(), req);
    expect(oracle).not.toBeNull();
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    expectOracleAgreement(result, oracle!);
  });

  it('reduces at the final step to Candidate C final filtering', () => {
    const req = request();
    const smooth = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    const filtered = filterFiniteHiddenStateObservationSequence(model(), req);
    expect(filtered.ok).toBe(true);
    if (!filtered.ok || !filtered.possible) throw new Error('Expected possible Candidate C result');
    for (const entry of filtered.finalFilteredDistribution!) {
      const actual = smooth.finalSmoothedDistribution?.find((candidate) => candidate.stateId === entry.stateId)?.probability;
      expect(actual).toBeDefined();
      expect(actual!).toBeCloseTo(entry.probability, 12);
    }
    expect(smooth.logLikelihood).toBe(filtered.logLikelihood);
    expect(smooth.sequenceProbability).toBe(filtered.sequenceProbability);
  });

  it('allows informative future evidence to revise an earlier filtered marginal', () => {
    const req = request(['red', 'blue']);
    const smooth = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    const filtered = filterFiniteHiddenStateObservationSequence(model(), req);
    if (!filtered.ok || !filtered.possible) throw new Error('Expected possible Candidate C result');
    const filteredA = filtered.steps[0]?.filteredDistribution?.find((entry) => entry.stateId === 'a')?.probability ?? 0;
    expect(Math.abs(resultProbability(smooth, 0, 'a') - filteredA)).toBeGreaterThan(1e-6);
  });

  it('does not revise an earlier filter when future emission evidence is state-independent', () => {
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }],
      alphabet: ['red', 'blue', 'common'],
      kernel: [
        { stateId: 'a', symbol: 'red', probability: 0.7 },
        { stateId: 'a', symbol: 'blue', probability: 0.1 },
        { stateId: 'a', symbol: 'common', probability: 0.2 },
        { stateId: 'b', symbol: 'red', probability: 0.1 },
        { stateId: 'b', symbol: 'blue', probability: 0.7 },
        { stateId: 'b', symbol: 'common', probability: 0.2 }
      ],
      observations: ['red', 'common']
    };
    const smooth = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    const filtered = filterFiniteHiddenStateObservationSequence(model(), req);
    if (!filtered.ok || !filtered.possible) throw new Error('Expected possible Candidate C result');
    for (const stateId of ['a', 'b']) {
      const expected = filtered.steps[0]!.filteredDistribution!.find((entry) => entry.stateId === stateId)!.probability;
      expect(resultProbability(smooth, 0, stateId)).toBeCloseTo(expected, 12);
    }
  });

  it('returns point-mass marginals for perfectly revealing possible observations', () => {
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['A', 'B'],
      kernel: [
        { stateId: 'a', symbol: 'A', probability: 1 },
        { stateId: 'a', symbol: 'B', probability: 0 },
        { stateId: 'b', symbol: 'A', probability: 0 },
        { stateId: 'b', symbol: 'B', probability: 1 }
      ],
      observations: ['A', 'B']
    };
    const smooth = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    expect(resultProbability(smooth, 0, 'a')).toBe(1);
    expect(resultProbability(smooth, 1, 'b')).toBe(1);
  });

  it('preserves mathematically impossible sequence semantics without fabricating marginals', () => {
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
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(m, req));
    expect(result.possible).toBe(false);
    expect(result.logLikelihood).toBeNull();
    expect(result.steps.every((step) => step.smoothedDistribution === null)).toBe(true);
    expect(result.diagnostics.impossibleAtStep).toBe(0);
  });

  it('retains finite smoothing when direct sequence probability underflows', () => {
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
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(m, req));
    expect(result.possible).toBe(true);
    expect(result.sequenceProbability).toBeNull();
    expect(result.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(result.logLikelihood).not.toBeNull();
    expect(result.steps.every((step) => step.smoothedDistribution?.[0]?.probability === 1)).toBe(true);
  });

  it('is invariant to model state order, initial order and kernel entry order', () => {
    const req = request();
    const baseline = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), req));
    const permutedModel: DefinitionModel = { ...model(), states: [...model().states].reverse(), transitions: [...model().transitions].reverse() };
    const permutedReq: FiniteHiddenStateObservationRequest = {
      ...req,
      initialDistribution: [...req.initialDistribution].reverse(),
      alphabet: [...req.alphabet].reverse(),
      kernel: [...req.kernel].reverse()
    };
    const permuted = requireSuccess(smoothFiniteHiddenStateObservationSequence(permutedModel, permutedReq));
    expect(permuted.steps).toEqual(baseline.steps);
    expect(permuted.finalSmoothedDistribution).toEqual(baseline.finalSmoothedDistribution);
  });

  it('inherits implicit terminal self-retention from Candidate C', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      alphabet: ['A', 'B'],
      kernel: [
        { stateId: 'a', symbol: 'A', probability: 1 }, { stateId: 'a', symbol: 'B', probability: 0 },
        { stateId: 'b', symbol: 'A', probability: 0 }, { stateId: 'b', symbol: 'B', probability: 1 }
      ],
      observations: ['A', 'B', 'B']
    };
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(m, req));
    expect(resultProbability(result, 0, 'a')).toBe(1);
    expect(resultProbability(result, 1, 'b')).toBe(1);
    expect(resultProbability(result, 2, 'b')).toBe(1);
  });

  it('preserves Candidate C validation failures', () => {
    const req = request();
    req.kernel[0] = { ...req.kernel[0]!, probability: 2 };
    const smooth = smoothFiniteHiddenStateObservationSequence(model(), req);
    const filtered = filterFiniteHiddenStateObservationSequence(model(), req);
    expect(smooth).toEqual(filtered);
  });

  it('serializes deterministically with explicit non-Viterbi diagnostics', () => {
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), request()));
    expect(result.diagnostics.viterbiComputed).toBe(false);
    expect(result.diagnostics.mapTrajectoryComputed).toBe(false);
    expect(result.diagnostics.pairwiseTransitionSmoothingComputed).toBe(false);
    expect(finiteHiddenStateSmoothingResultToJson(result)).toBe(JSON.stringify(result));
  });

  it('rejects non-finite values during checked serialization', () => {
    const result = requireSuccess(smoothFiniteHiddenStateObservationSequence(model(), request()));
    const corrupted = structuredClone(result);
    corrupted.steps[0]!.smoothedDistribution![0]!.probability = Number.NaN;
    expect(() => finiteHiddenStateSmoothingResultToJson(corrupted)).toThrow(/non-finite numeric value/);
  });
});
