import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import { FiniteHiddenStateObservationRequest } from '../src/hidden_state_observation';
import {
  finiteHiddenStateJointParameterReestimationResultToJson,
  reestimateFiniteHiddenStateParametersJointOneStep
} from '../src/hidden_state_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateTransitionsOneStep } from '../src/hidden_state_transition_reestimation';
import { reestimateFiniteHiddenStateObservationKernelOneStep } from '../src/hidden_state_observation_kernel_reestimation';
import { reestimateFiniteHiddenStateInitialDistributionOneStep } from '../src/hidden_state_initial_distribution_reestimation';

type Result = ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStep>;
type Success = Extract<Result, { ok: true }>;

type Oracle = {
  logLikelihood: number;
  gamma: Array<Map<StateId, number>>;
  transitions: Map<string, number>;
  emissions: Map<string, number>;
};

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.82 },
      { from: 'a', to: 'b', probability: 0.18 },
      { from: 'b', to: 'a', probability: 0.27 },
      { from: 'b', to: 'b', probability: 0.73 }
    ]
  };
}

function request(observations: string[] = ['red', 'blue', 'red', 'blue']): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.63 },
      { stateId: 'b', probability: 0.37 }
    ],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: 0.88 },
      { stateId: 'a', symbol: 'blue', probability: 0.12 },
      { stateId: 'b', symbol: 'red', probability: 0.21 },
      { stateId: 'b', symbol: 'blue', probability: 0.79 }
    ],
    observations
  };
}

function requireSuccess(result: Result): Success {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function init(req: FiniteHiddenStateObservationRequest, stateId: StateId): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emit(req: FiniteHiddenStateObservationRequest, stateId: StateId, symbol: string): number {
  return req.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function trans(m: DefinitionModel, from: StateId, to: StateId): number {
  const source = m.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function pairKey(from: StateId, to: StateId): string {
  return `${from}\u0000${to}`;
}

function emissionKey(stateId: StateId, symbol: string): string {
  return `${stateId}\u0000${symbol}`;
}

function completePathOracle(m: DefinitionModel, req: FiniteHiddenStateObservationRequest): Oracle | null {
  const states = m.states.map((state) => state.id);
  const paths: Array<{ path: StateId[]; mass: number }> = [];
  let total = 0;
  const visit = (path: StateId[]): void => {
    if (path.length === req.observations.length) {
      let mass = init(req, path[0]!)*emit(req, path[0]!, req.observations[0]!);
      for (let t = 1; t < path.length; t += 1) {
        mass *= trans(m, path[t - 1]!, path[t]!)*emit(req, path[t]!, req.observations[t]!);
      }
      if (mass > 0) paths.push({ path, mass });
      total += mass;
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  if (total === 0) return null;
  const gamma = Array.from({ length: req.observations.length }, () => new Map(states.map((stateId) => [stateId, 0])));
  const transitions = new Map<string, number>();
  const emissions = new Map<string, number>();
  for (const { path, mass } of paths) {
    const posterior = mass/total;
    for (let t = 0; t < path.length; t += 1) {
      const stateId = path[t]!;
      gamma[t]!.set(stateId, (gamma[t]!.get(stateId) ?? 0) + posterior);
      emissions.set(emissionKey(stateId, req.observations[t]!), (emissions.get(emissionKey(stateId, req.observations[t]!)) ?? 0) + posterior);
      if (t > 0) {
        const key = pairKey(path[t - 1]!, stateId);
        transitions.set(key, (transitions.get(key) ?? 0) + posterior);
      }
    }
  }
  return { logLikelihood: Math.log(total), gamma, transitions, emissions };
}

function oracleUpdated(m: DefinitionModel, req: FiniteHiddenStateObservationRequest, oracle: Oracle): { model: DefinitionModel; request: FiniteHiddenStateObservationRequest } {
  const states = m.states.map((state) => state.id);
  const updatedInitial = states.map((stateId) => ({ stateId, probability: oracle.gamma[0]!.get(stateId) ?? 0 }));
  const aggregates = new Map<string, number>();
  for (const stateId of states) {
    const state = m.states.find((entry) => entry.id === stateId)!;
    if (isTerminalState(state)) continue;
    const targets = [...new Set(m.transitions.filter((entry) => entry.from === stateId).map((entry) => entry.to))];
    const departure = states.reduce((sum, to) => sum + (oracle.transitions.get(pairKey(stateId, to)) ?? 0), 0);
    for (const to of targets) {
      aggregates.set(pairKey(stateId, to), departure <= 1e-12 ? trans(m, stateId, to) : (oracle.transitions.get(pairKey(stateId, to)) ?? 0)/departure);
    }
  }
  const updatedTransitions = m.transitions.map((entry) => {
    const state = m.states.find((candidate) => candidate.id === entry.from)!;
    if (isTerminalState(state)) return { ...entry };
    const currentAggregate = trans(m, entry.from, entry.to);
    const targetAggregate = aggregates.get(pairKey(entry.from, entry.to)) ?? 0;
    const currentEdge = evaluateProbabilitySpec(entry.probability);
    const value = currentAggregate === 0 ? 0 : targetAggregate*(currentEdge/currentAggregate);
    return { ...entry, probability: typeof entry.probability === 'number' ? value : { type: 'constant' as const, value } };
  });
  const updatedKernel = [] as FiniteHiddenStateObservationRequest['kernel'];
  for (const stateId of states) {
    const occupancy = req.alphabet.reduce((sum, symbol) => sum + (oracle.emissions.get(emissionKey(stateId, symbol)) ?? 0), 0);
    for (const symbol of req.alphabet) {
      const current = emit(req, stateId, symbol);
      const probability = occupancy <= 1e-12 ? current : (oracle.emissions.get(emissionKey(stateId, symbol)) ?? 0)/occupancy;
      updatedKernel.push({ stateId, symbol, probability });
    }
  }
  return {
    model: { ...m, states: m.states.map((state) => ({ ...state })), transitions: updatedTransitions },
    request: { initialDistribution: updatedInitial, alphabet: [...req.alphabet], kernel: updatedKernel, observations: [...req.observations] }
  };
}

function rowProbability(rows: Success['transitionRows'], stateId: StateId, toStateId: StateId): number {
  return rows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? 0;
}

function kernelProbability(rows: Success['observationKernelRows'], stateId: StateId, symbol: string): number {
  return rows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.symbol === symbol)?.probability ?? 0;
}

function initialProbability(distribution: Success['updatedInitialDistribution'], stateId: StateId): number {
  return distribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function modelFromTransitionResult(m: DefinitionModel, result: Extract<ReturnType<typeof reestimateFiniteHiddenStateTransitionsOneStep>, { ok: true }>): DefinitionModel {
  if (!result.possible || result.rows === null) throw new Error('Expected possible S result');
  const aggregate = new Map<string, number>();
  for (const row of result.rows) for (const entry of row.updatedRow) aggregate.set(pairKey(row.stateId, entry.toStateId), entry.probability);
  return {
    ...m,
    transitions: m.transitions.map((entry) => {
      const state = m.states.find((candidate) => candidate.id === entry.from)!;
      if (isTerminalState(state)) return { ...entry };
      const currentAggregate = trans(m, entry.from, entry.to);
      const updatedAggregate = aggregate.get(pairKey(entry.from, entry.to)) ?? 0;
      const currentEdge = evaluateProbabilitySpec(entry.probability);
      const value = currentAggregate === 0 ? 0 : updatedAggregate*(currentEdge/currentAggregate);
      return { ...entry, probability: typeof entry.probability === 'number' ? value : { type: 'constant' as const, value } };
    })
  };
}

function requestFromKernelResult(req: FiniteHiddenStateObservationRequest, result: Extract<ReturnType<typeof reestimateFiniteHiddenStateObservationKernelOneStep>, { ok: true }>): FiniteHiddenStateObservationRequest {
  if (!result.possible || result.rows === null) throw new Error('Expected possible T result');
  return {
    initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    kernel: result.rows.flatMap((row) => row.updatedRow.map((entry) => ({ stateId: row.stateId, symbol: entry.symbol, probability: entry.probability }))),
    observations: [...req.observations]
  };
}

describe('Candidate V finite hidden-state joint parameter re-estimation', () => {
  it('matches independent complete-path sufficient statistics, joint update and likelihood', () => {
    const req = request(['red', 'blue', 'red', 'blue', 'red']);
    const currentOracle = completePathOracle(model(), req)!;
    const expectedUpdated = oracleUpdated(model(), req, currentOracle);
    const updatedOracle = completePathOracle(expectedUpdated.model, expectedUpdated.request)!;
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), req));
    expect(result.possible).toBe(true);
    for (const stateId of ['a', 'b']) {
      expect(initialProbability(result.updatedInitialDistribution, stateId)).toBeCloseTo(currentOracle.gamma[0]!.get(stateId)!, 11);
      for (const to of ['a', 'b']) expect(rowProbability(result.transitionRows, stateId, to)).toBeCloseTo(trans(expectedUpdated.model, stateId, to), 11);
      for (const symbol of req.alphabet) expect(kernelProbability(result.observationKernelRows, stateId, symbol)).toBeCloseTo(emit(expectedUpdated.request, stateId, symbol), 11);
    }
    expect(result.originalLogLikelihood).toBeCloseTo(currentOracle.logLikelihood, 11);
    expect(result.updatedLogLikelihood).toBeCloseTo(updatedOracle.logLikelihood, 11);
    expect(result.likelihoodDelta).toBeCloseTo(updatedOracle.logLikelihood - currentOracle.logLikelihood, 11);
    expect(updatedOracle.logLikelihood).toBeGreaterThanOrEqual(currentOracle.logLikelihood - 1e-11);
    expect(result.diagnostics.commonCurrentModelEStepUsed).toBe(true);
    expect(result.diagnostics.sequentialBlockReestimationUsed).toBe(false);
    expect(result.diagnostics.intermediateUpdatedModelEStepUsed).toBe(false);
  });

  it('distinguishes common-E-step joint update from sequential S then T then U re-estimation', () => {
    const req = request(['red', 'blue', 'blue', 'red', 'blue']);
    const joint = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), req));
    expect(joint.possible).toBe(true);
    const s = reestimateFiniteHiddenStateTransitionsOneStep(model(), req);
    expect(s.ok).toBe(true);
    if (!s.ok) throw new Error(s.failure.message);
    const sModel = modelFromTransitionResult(model(), s);
    const t = reestimateFiniteHiddenStateObservationKernelOneStep(sModel, req);
    expect(t.ok).toBe(true);
    if (!t.ok) throw new Error(t.failure.message);
    const stRequest = requestFromKernelResult(req, t);
    const u = reestimateFiniteHiddenStateInitialDistributionOneStep(sModel, stRequest);
    expect(u.ok).toBe(true);
    if (!u.ok || !u.possible || u.updatedInitialDistribution === null) throw new Error('Expected possible U result');
    const sequentialA = u.updatedInitialDistribution.find((entry) => entry.stateId === 'a')!.probability;
    const jointA = initialProbability(joint.updatedInitialDistribution, 'a');
    const sequentialKernel = stRequest.kernel.find((entry) => entry.stateId === 'a' && entry.symbol === 'red')!.probability;
    const jointKernel = kernelProbability(joint.observationKernelRows, 'a', 'red');
    expect(Math.max(Math.abs(sequentialA - jointA), Math.abs(sequentialKernel - jointKernel))).toBeGreaterThan(1e-7);
  });

  it('retains zero-departure and zero-occupancy rows while using gamma0 directly', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.7 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.2 }, { from: 'b', to: 'b', probability: 0.8 },
        { from: 'c', to: 'c', probability: 1 }
      ]
    };
    const req: FiniteHiddenStateObservationRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }, { stateId: 'c', probability: 0 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.9 }, { stateId: 'a', symbol: 'y', probability: 0.1 },
        { stateId: 'b', symbol: 'x', probability: 0.2 }, { stateId: 'b', symbol: 'y', probability: 0.8 },
        { stateId: 'c', symbol: 'x', probability: 0.4 }, { stateId: 'c', symbol: 'y', probability: 0.6 }
      ], observations: ['x', 'y', 'x']
    };
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(m, req));
    expect(initialProbability(result.updatedInitialDistribution, 'c')).toBe(0);
    const transitionC = result.transitionRows!.find((row) => row.stateId === 'c')!;
    const kernelC = result.observationKernelRows!.find((row) => row.stateId === 'c')!;
    expect(transitionC.status).toBe('retained_zero_expected_departure');
    expect(transitionC.updatedRow).toEqual(transitionC.currentRow);
    expect(kernelC.status).toBe('retained_zero_expected_occupancy');
    expect(kernelC.updatedRow).toEqual(kernelC.currentRow);

    const single = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), request(['red'])));
    expect(single.diagnostics.commonEStepSource).toBe('candidate_h_single_observation_single_call');
    expect(single.transitionRows!.every((row) => row.status === 'retained_zero_expected_departure')).toBe(true);
  });

  it('is invariant to ordering, symbol renaming and parallel-transition representation', () => {
    const baseline = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), request()));
    const m = model();
    const req = request();
    const permuted = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep({ ...m, states: [...m.states].reverse(), transitions: [...m.transitions].reverse() }, { ...req, initialDistribution: [...req.initialDistribution].reverse(), alphabet: [...req.alphabet].reverse(), kernel: [...req.kernel].reverse() }));
    expect(initialProbability(permuted.updatedInitialDistribution, 'a')).toBeCloseTo(initialProbability(baseline.updatedInitialDistribution, 'a'), 11);
    expect(rowProbability(permuted.transitionRows, 'a', 'b')).toBeCloseTo(rowProbability(baseline.transitionRows, 'a', 'b'), 11);
    expect(kernelProbability(permuted.observationKernelRows, 'a', 'red')).toBeCloseTo(kernelProbability(baseline.observationKernelRows, 'a', 'red'), 11);

    const rename = (symbol: string): string => symbol === 'red' ? 'R' : 'B';
    const renamedReq: FiniteHiddenStateObservationRequest = { initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })), alphabet: req.alphabet.map(rename), kernel: req.kernel.map((entry) => ({ ...entry, symbol: rename(entry.symbol) })), observations: req.observations.map(rename) };
    const renamed = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(m, renamedReq));
    expect(initialProbability(renamed.updatedInitialDistribution, 'a')).toBeCloseTo(initialProbability(baseline.updatedInitialDistribution, 'a'), 11);

    const split: DefinitionModel = { ...m, transitions: [
      { from: 'a', to: 'a', probability: 0.32 }, { from: 'a', to: 'a', probability: 0.5 }, { from: 'a', to: 'b', probability: 0.18 },
      { from: 'b', to: 'a', probability: 0.1 }, { from: 'b', to: 'a', probability: 0.17 }, { from: 'b', to: 'b', probability: 0.73 }
    ] };
    const splitResult = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(split, req));
    expect(rowProbability(splitResult.transitionRows, 'a', 'b')).toBeCloseTo(rowProbability(baseline.transitionRows, 'a', 'b'), 11);
  });

  it('preserves impossible-evidence honesty and separates direct probability underflow', () => {
    const one: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const impossible: FiniteHiddenStateObservationRequest = { initialDistribution: [{ stateId: 'only', probability: 1 }], alphabet: ['yes', 'no'], kernel: [{ stateId: 'only', symbol: 'yes', probability: 1 }, { stateId: 'only', symbol: 'no', probability: 0 }], observations: ['no'] };
    const impossibleResult = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(one, impossible));
    expect(impossibleResult.possible).toBe(false);
    expect(impossibleResult.updatedInitialDistribution).toBeNull();
    expect(impossibleResult.transitionRows).toBeNull();
    expect(impossibleResult.observationKernelRows).toBeNull();

    const underflow: FiniteHiddenStateObservationRequest = { initialDistribution: [{ stateId: 'only', probability: 1 }], alphabet: ['tiny', 'other'], kernel: [{ stateId: 'only', symbol: 'tiny', probability: 1e-50 }, { stateId: 'only', symbol: 'other', probability: 1 - 1e-50 }], observations: Array.from({ length: 10 }, () => 'tiny') };
    const underflowResult = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(one, underflow));
    expect(underflowResult.possible).toBe(true);
    expect(underflowResult.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(underflowResult.originalLogLikelihood).not.toBeNull();
  });

  it('rejects invalid tolerances and provides checked deterministic serialization', () => {
    const invalid = reestimateFiniteHiddenStateParametersJointOneStep(model(), request(), { countTolerance: Number.NaN });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) throw new Error('Expected invalid tolerance failure');
    expect(invalid.failure.code).toBe('invalid_reestimation_tolerance');
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), request()));
    const first = finiteHiddenStateJointParameterReestimationResultToJson(result);
    expect(finiteHiddenStateJointParameterReestimationResultToJson(result)).toBe(first);
    const forged = { ...result, likelihoodDelta: Number.NaN };
    expect(() => finiteHiddenStateJointParameterReestimationResultToJson(forged as never)).toThrow(/non-finite/);
  });
});
