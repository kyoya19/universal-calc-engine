import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import { FiniteHiddenStateObservationRequest } from '../src/hidden_state_observation';
import {
  finiteHiddenStateMultiTrajectoryJointParameterReestimationResultToJson,
  reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep
} from '../src/hidden_state_multi_trajectory_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateParametersJointOneStep } from '../src/hidden_state_joint_parameter_reestimation';

type BatchRequest = Parameters<typeof reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep>[1];
type BatchResult = ReturnType<typeof reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep>;
type BatchSuccess = Extract<BatchResult, { ok: true }>;
type VResult = ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStep>;
type VSuccess = Extract<VResult, { ok: true }>;

type Oracle = {
  logLikelihood: number;
  gamma: Array<Map<StateId, number>>;
  transitions: Map<string, number>;
  emissions: Map<string, number>;
};

type BatchOracle = {
  logLikelihood: number;
  initialCounts: Map<StateId, number>;
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

function batchRequest(trajectories: string[][]): BatchRequest {
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
    trajectories
  };
}

function singleRequest(shared: BatchRequest, observations: string[]): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: shared.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...shared.alphabet],
    kernel: shared.kernel.map((entry) => ({ ...entry })),
    observations: [...observations]
  };
}

function requireBatchSuccess(result: BatchResult): BatchSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function requireVSuccess(result: VResult): VSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function init(req: FiniteHiddenStateObservationRequest, stateId: StateId): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emit(req: Pick<FiniteHiddenStateObservationRequest, 'kernel'>, stateId: StateId, symbol: string): number {
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
      let mass = init(req, path[0]!) * emit(req, path[0]!, req.observations[0]!);
      for (let t = 1; t < path.length; t += 1) {
        mass *= trans(m, path[t - 1]!, path[t]!) * emit(req, path[t]!, req.observations[t]!);
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
    const posterior = mass / total;
    for (let t = 0; t < path.length; t += 1) {
      const stateId = path[t]!;
      gamma[t]!.set(stateId, (gamma[t]!.get(stateId) ?? 0) + posterior);
      const eKey = emissionKey(stateId, req.observations[t]!);
      emissions.set(eKey, (emissions.get(eKey) ?? 0) + posterior);
      if (t > 0) {
        const key = pairKey(path[t - 1]!, stateId);
        transitions.set(key, (transitions.get(key) ?? 0) + posterior);
      }
    }
  }
  return { logLikelihood: Math.log(total), gamma, transitions, emissions };
}

function completeBatchOracle(m: DefinitionModel, req: BatchRequest): BatchOracle | null {
  const states = m.states.map((state) => state.id);
  const initialCounts = new Map(states.map((stateId) => [stateId, 0]));
  const transitions = new Map<string, number>();
  const emissions = new Map<string, number>();
  let logLikelihood = 0;
  for (const trajectory of req.trajectories) {
    const oracle = completePathOracle(m, singleRequest(req, trajectory));
    if (oracle === null) return null;
    logLikelihood += oracle.logLikelihood;
    for (const stateId of states) initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (oracle.gamma[0]!.get(stateId) ?? 0));
    for (const [key, value] of oracle.transitions) transitions.set(key, (transitions.get(key) ?? 0) + value);
    for (const [key, value] of oracle.emissions) emissions.set(key, (emissions.get(key) ?? 0) + value);
  }
  return { logLikelihood, initialCounts, transitions, emissions };
}

function oracleUpdated(m: DefinitionModel, req: BatchRequest, oracle: BatchOracle): { model: DefinitionModel; shared: BatchRequest } {
  const states = m.states.map((state) => state.id);
  const updatedInitial = states.map((stateId) => ({ stateId, probability: (oracle.initialCounts.get(stateId) ?? 0) / req.trajectories.length }));
  const aggregates = new Map<string, number>();
  for (const stateId of states) {
    const state = m.states.find((entry) => entry.id === stateId)!;
    if (isTerminalState(state)) continue;
    const targets = [...new Set(m.transitions.filter((entry) => entry.from === stateId).map((entry) => entry.to))];
    const departure = states.reduce((sum, to) => sum + (oracle.transitions.get(pairKey(stateId, to)) ?? 0), 0);
    for (const to of targets) aggregates.set(pairKey(stateId, to), departure <= 1e-12 ? trans(m, stateId, to) : (oracle.transitions.get(pairKey(stateId, to)) ?? 0) / departure);
  }
  const updatedTransitions = m.transitions.map((entry) => {
    const state = m.states.find((candidate) => candidate.id === entry.from)!;
    if (isTerminalState(state)) return { ...entry };
    const currentAggregate = trans(m, entry.from, entry.to);
    const targetAggregate = aggregates.get(pairKey(entry.from, entry.to)) ?? 0;
    const currentEdge = evaluateProbabilitySpec(entry.probability);
    const value = currentAggregate === 0 ? 0 : targetAggregate * (currentEdge / currentAggregate);
    return { ...entry, probability: typeof entry.probability === 'number' ? value : { type: 'constant' as const, value } };
  });
  const updatedKernel = [] as BatchRequest['kernel'];
  for (const stateId of states) {
    const occupancy = req.alphabet.reduce((sum, symbol) => sum + (oracle.emissions.get(emissionKey(stateId, symbol)) ?? 0), 0);
    for (const symbol of req.alphabet) {
      const current = emit(req, stateId, symbol);
      const probability = occupancy <= 1e-12 ? current : (oracle.emissions.get(emissionKey(stateId, symbol)) ?? 0) / occupancy;
      updatedKernel.push({ stateId, symbol, probability });
    }
  }
  return {
    model: { ...m, states: m.states.map((state) => ({ ...state })), transitions: updatedTransitions },
    shared: { initialDistribution: updatedInitial, alphabet: [...req.alphabet], kernel: updatedKernel, trajectories: req.trajectories.map((trajectory) => [...trajectory]) }
  };
}

function rowProbability(rows: BatchSuccess['transitionRows'], stateId: StateId, toStateId: StateId): number {
  return rows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? 0;
}

function kernelProbability(rows: BatchSuccess['observationKernelRows'], stateId: StateId, symbol: string): number {
  return rows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.symbol === symbol)?.probability ?? 0;
}

function initialProbability(distribution: BatchSuccess['updatedInitialDistribution'], stateId: StateId): number {
  return distribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function modelFromV(m: DefinitionModel, result: VSuccess): DefinitionModel {
  if (!result.possible || result.transitionRows === null) throw new Error('Expected possible V transition rows');
  const aggregate = new Map<string, number>();
  for (const row of result.transitionRows) for (const entry of row.updatedRow) aggregate.set(pairKey(row.stateId, entry.toStateId), entry.probability);
  return {
    ...m,
    transitions: m.transitions.map((entry) => {
      const state = m.states.find((candidate) => candidate.id === entry.from)!;
      if (isTerminalState(state)) return { ...entry };
      const currentAggregate = trans(m, entry.from, entry.to);
      const updatedAggregate = aggregate.get(pairKey(entry.from, entry.to)) ?? 0;
      const currentEdge = evaluateProbabilitySpec(entry.probability);
      const value = currentAggregate === 0 ? 0 : updatedAggregate * (currentEdge / currentAggregate);
      return { ...entry, probability: typeof entry.probability === 'number' ? value : { type: 'constant' as const, value } };
    })
  };
}

function sharedFromV(req: BatchRequest, result: VSuccess): BatchRequest {
  if (!result.possible || result.updatedInitialDistribution === null || result.observationKernelRows === null) throw new Error('Expected possible V parameter update');
  return {
    initialDistribution: result.updatedInitialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    kernel: result.observationKernelRows.flatMap((row) => row.updatedRow.map((entry) => ({ stateId: row.stateId, symbol: entry.symbol, probability: entry.probability }))),
    trajectories: req.trajectories.map((trajectory) => [...trajectory])
  };
}

describe('Candidate W finite hidden-state multi-trajectory joint parameter re-estimation', () => {
  it('matches independent complete-hidden-path batch sufficient statistics, joint update and total likelihood', () => {
    const req = batchRequest([
      ['red', 'blue', 'red', 'blue'],
      ['blue', 'blue', 'red'],
      ['red', 'red', 'blue', 'red', 'blue']
    ]);
    const currentOracle = completeBatchOracle(model(), req)!;
    const expectedUpdated = oracleUpdated(model(), req, currentOracle);
    const updatedOracle = completeBatchOracle(expectedUpdated.model, expectedUpdated.shared)!;
    const result = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), req));
    expect(result.possible).toBe(true);
    for (const stateId of ['a', 'b']) {
      expect(initialProbability(result.updatedInitialDistribution, stateId)).toBeCloseTo((currentOracle.initialCounts.get(stateId) ?? 0) / req.trajectories.length, 11);
      for (const to of ['a', 'b']) expect(rowProbability(result.transitionRows, stateId, to)).toBeCloseTo(trans(expectedUpdated.model, stateId, to), 11);
      for (const symbol of req.alphabet) expect(kernelProbability(result.observationKernelRows, stateId, symbol)).toBeCloseTo(emit(expectedUpdated.shared, stateId, symbol), 11);
    }
    expect(result.originalTotalLogLikelihood).toBeCloseTo(currentOracle.logLikelihood, 11);
    expect(result.updatedTotalLogLikelihood).toBeCloseTo(updatedOracle.logLikelihood, 11);
    expect(result.likelihoodDelta).toBeCloseTo(updatedOracle.logLikelihood - currentOracle.logLikelihood, 11);
    expect(updatedOracle.logLikelihood).toBeGreaterThanOrEqual(currentOracle.logLikelihood - 1e-11);
    expect(result.diagnostics.allTrajectoryEStepsUseSameCurrentModel).toBe(true);
    expect(result.diagnostics.perTrajectoryParameterUpdatesUsed).toBe(false);
    expect(result.diagnostics.sequentialCandidateVChainingUsed).toBe(false);
    expect(result.diagnostics.trajectoryConcatenationUsed).toBe(false);
  });

  it('reduces exactly to Candidate V when K=1', () => {
    const trajectory = ['red', 'blue', 'blue', 'red'];
    const req = batchRequest([trajectory]);
    const w = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), req));
    const v = requireVSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), singleRequest(req, trajectory)));
    expect(w.possible).toBe(true);
    expect(v.possible).toBe(true);
    for (const stateId of ['a', 'b']) {
      expect(initialProbability(w.updatedInitialDistribution, stateId)).toBeCloseTo(v.updatedInitialDistribution!.find((entry) => entry.stateId === stateId)!.probability, 12);
      for (const to of ['a', 'b']) expect(rowProbability(w.transitionRows, stateId, to)).toBeCloseTo(v.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.toStateId === to)!.probability, 12);
      for (const symbol of req.alphabet) expect(kernelProbability(w.observationKernelRows, stateId, symbol)).toBeCloseTo(v.observationKernelRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.symbol === symbol)!.probability, 12);
    }
    expect(w.originalTotalLogLikelihood).toBeCloseTo(v.originalLogLikelihood!, 12);
    expect(w.updatedTotalLogLikelihood).toBeCloseTo(v.updatedLogLikelihood!, 12);
  });

  it('distinguishes common-current batch update from sequential Candidate V chaining', () => {
    const req = batchRequest([
      ['red', 'red', 'red', 'blue', 'red'],
      ['blue', 'blue', 'blue', 'red', 'blue']
    ]);
    const batch = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), req));
    let sequentialModel = model();
    let sequentialShared = req;
    for (const trajectory of req.trajectories) {
      const v = requireVSuccess(reestimateFiniteHiddenStateParametersJointOneStep(sequentialModel, singleRequest(sequentialShared, trajectory)));
      sequentialModel = modelFromV(sequentialModel, v);
      sequentialShared = sharedFromV(sequentialShared, v);
    }
    const batchA = initialProbability(batch.updatedInitialDistribution, 'a');
    const sequentialA = sequentialShared.initialDistribution.find((entry) => entry.stateId === 'a')!.probability;
    const batchKernel = kernelProbability(batch.observationKernelRows, 'a', 'red');
    const sequentialKernel = emit(sequentialShared, 'a', 'red');
    expect(Math.max(Math.abs(batchA - sequentialA), Math.abs(batchKernel - sequentialKernel))).toBeGreaterThan(1e-5);
  });

  it('distinguishes independent trajectories from concatenation into one trajectory', () => {
    const req = batchRequest([
      ['red', 'red'],
      ['blue', 'blue']
    ]);
    const batch = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), req));
    const concatenated = requireVSuccess(reestimateFiniteHiddenStateParametersJointOneStep(model(), singleRequest(req, req.trajectories.flat())));
    expect(batch.possible).toBe(true);
    expect(concatenated.possible).toBe(true);
    const initialGap = Math.abs(initialProbability(batch.updatedInitialDistribution, 'a') - concatenated.updatedInitialDistribution!.find((entry) => entry.stateId === 'a')!.probability);
    const transitionGap = Math.abs(rowProbability(batch.transitionRows, 'a', 'b') - concatenated.transitionRows!.find((row) => row.stateId === 'a')!.updatedRow.find((entry) => entry.toStateId === 'b')!.probability);
    expect(Math.max(initialGap, transitionGap)).toBeGreaterThan(1e-5);
  });

  it('is invariant to trajectory order and equal replication', () => {
    const trajectories = [
      ['red', 'blue', 'red'],
      ['blue', 'red', 'blue', 'blue']
    ];
    const baseline = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), batchRequest(trajectories)));
    const reversed = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), batchRequest([...trajectories].reverse())));
    const replicated = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), batchRequest([...trajectories, ...trajectories])));
    for (const candidate of [reversed, replicated]) {
      expect(initialProbability(candidate.updatedInitialDistribution, 'a')).toBeCloseTo(initialProbability(baseline.updatedInitialDistribution, 'a'), 11);
      expect(rowProbability(candidate.transitionRows, 'a', 'b')).toBeCloseTo(rowProbability(baseline.transitionRows, 'a', 'b'), 11);
      expect(kernelProbability(candidate.observationKernelRows, 'a', 'red')).toBeCloseTo(kernelProbability(baseline.observationKernelRows, 'a', 'red'), 11);
    }
  });

  it('retains aggregate zero-information rows and averages gamma0 across trajectories', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.7 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.2 }, { from: 'b', to: 'b', probability: 0.8 },
        { from: 'c', to: 'c', probability: 1 }
      ]
    };
    const req: BatchRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }, { stateId: 'c', probability: 0 }],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.9 }, { stateId: 'a', symbol: 'y', probability: 0.1 },
        { stateId: 'b', symbol: 'x', probability: 0.2 }, { stateId: 'b', symbol: 'y', probability: 0.8 },
        { stateId: 'c', symbol: 'x', probability: 0.4 }, { stateId: 'c', symbol: 'y', probability: 0.6 }
      ],
      trajectories: [['x', 'y', 'x'], ['y', 'x']]
    };
    const result = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(m, req));
    expect(initialProbability(result.updatedInitialDistribution, 'c')).toBe(0);
    const transitionC = result.transitionRows!.find((row) => row.stateId === 'c')!;
    const kernelC = result.observationKernelRows!.find((row) => row.stateId === 'c')!;
    expect(transitionC.status).toBe('retained_zero_expected_departure');
    expect(transitionC.updatedRow).toEqual(transitionC.currentRow);
    expect(kernelC.status).toBe('retained_zero_expected_occupancy');
    expect(kernelC.updatedRow).toEqual(kernelC.currentRow);
    expect(result.aggregatedPosteriorInitialCounts!.reduce((sum, entry) => sum + entry.expectedCount, 0)).toBeCloseTo(2, 12);
  });

  it('preserves impossible-dataset honesty and rejects empty datasets or trajectories', () => {
    const one: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const req: BatchRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['yes', 'no'],
      kernel: [{ stateId: 'only', symbol: 'yes', probability: 1 }, { stateId: 'only', symbol: 'no', probability: 0 }],
      trajectories: [['yes'], ['no']]
    };
    const impossible = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(one, req));
    expect(impossible.possible).toBe(false);
    expect(impossible.impossibleTrajectoryIndex).toBe(1);
    expect(impossible.updatedInitialDistribution).toBeNull();
    expect(impossible.transitionRows).toBeNull();
    expect(impossible.observationKernelRows).toBeNull();

    const emptySet = reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), batchRequest([]));
    expect(emptySet.ok).toBe(false);
    if (emptySet.ok) throw new Error('Expected empty trajectory collection failure');
    expect(emptySet.failure.code).toBe('empty_trajectory_collection');
    const emptyTrajectory = reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model(), batchRequest([['red'], []]));
    expect(emptyTrajectory.ok).toBe(false);
    if (emptyTrajectory.ok) throw new Error('Expected empty trajectory failure');
    expect(emptyTrajectory.failure.code).toBe('empty_trajectory');
  });

  it('separates direct probability underflow and provides checked deterministic serialization', () => {
    const one: DefinitionModel = { startState: 'only', states: [{ id: 'only', terminal: true }], transitions: [] };
    const underflow: BatchRequest = {
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['tiny', 'other'],
      kernel: [{ stateId: 'only', symbol: 'tiny', probability: 1e-50 }, { stateId: 'only', symbol: 'other', probability: 1 - 1e-50 }],
      trajectories: [Array.from({ length: 10 }, () => 'tiny'), Array.from({ length: 9 }, () => 'tiny')]
    };
    const result = requireBatchSuccess(reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(one, underflow));
    expect(result.possible).toBe(true);
    expect(result.diagnostics.anySequenceProbabilityUnderflowed).toBe(true);
    expect(result.originalTotalLogLikelihood).not.toBeNull();
    const first = finiteHiddenStateMultiTrajectoryJointParameterReestimationResultToJson(result);
    expect(finiteHiddenStateMultiTrajectoryJointParameterReestimationResultToJson(result)).toBe(first);
    const forged = { ...result, likelihoodDelta: Number.NaN };
    expect(() => finiteHiddenStateMultiTrajectoryJointParameterReestimationResultToJson(forged as never)).toThrow(/non-finite/);
  });
});
