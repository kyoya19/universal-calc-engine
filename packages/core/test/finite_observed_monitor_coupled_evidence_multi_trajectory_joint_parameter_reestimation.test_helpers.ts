import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';

export type KernelEntry = { stateId: StateId; symbol: string; probability: number };

type PathAtom = {
  hiddenStates: StateId[];
  monitorStates: string[];
  mass: number;
};

export type RecordOracle = {
  possible: boolean;
  eventProbability: number;
  logEventProbability: number | null;
  initial: Map<StateId, number>;
  transitions: Map<string, number>;
  emissions: Map<StateId, Map<string, number>>;
};

export type BatchOracle = {
  possible: boolean;
  records: RecordOracle[];
  initialCounts: Map<StateId, number>;
  transitions: Map<string, number>;
  emissions: Map<StateId, Map<string, number>>;
  occupancies: Map<StateId, number>;
  currentTotalLogLikelihood: number | null;
  updatedInitial: Map<StateId, number> | null;
  updatedRows: Map<StateId, Map<StateId, number>> | null;
  updatedKernel: Map<StateId, Map<string, number>> | null;
  updatedModel: DefinitionModel | null;
  updatedTotalLogLikelihood: number | null;
};

export function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

export function stateIds(model: DefinitionModel): StateId[] {
  return model.states.map((state) => state.id).sort();
}

export function twoStateModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.72 },
      { from: 'a', to: 'b', probability: 0.28 },
      { from: 'b', to: 'a', probability: 0.31 },
      { from: 'b', to: 'b', probability: 0.69 }
    ]
  };
}

export function parallelModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.4 },
      { from: 'a', to: 'a', probability: 0.32 },
      { from: 'a', to: 'b', probability: 0.28 },
      { from: 'b', to: 'a', probability: 0.31 },
      { from: 'b', to: 'b', probability: 0.69 }
    ]
  };
}

export function terminalModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'z', terminal: true }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.45 },
      { from: 'a', to: 'z', probability: 0.55 }
    ]
  };
}

export function initialDistribution() {
  return [
    { stateId: 'a', probability: 0.61 },
    { stateId: 'b', probability: 0.39 }
  ];
}

export function standardKernel(): KernelEntry[] {
  return [
    { stateId: 'a', symbol: 'x', probability: 0.82 },
    { stateId: 'a', symbol: 'y', probability: 0.18 },
    { stateId: 'b', symbol: 'x', probability: 0.27 },
    { stateId: 'b', symbol: 'y', probability: 0.73 }
  ];
}

export function aggregateTransitionProbability(model: DefinitionModel, fromStateId: StateId, toStateId: StateId): number {
  const state = model.states.find((candidate) => candidate.id === fromStateId);
  if (state !== undefined && isTerminalState(state)) return fromStateId === toStateId ? 1 : 0;
  return model.transitions
    .filter((transition) => transition.from === fromStateId && transition.to === toStateId)
    .reduce((sum, transition) => sum + evaluateProbabilitySpec(transition.probability), 0);
}

export function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const pairs = new Map<string, [StateId, StateId]>();
  for (const state of model.states) {
    if (isTerminalState(state)) pairs.set(pairKey(state.id, state.id), [state.id, state.id]);
  }
  for (const transition of model.transitions) {
    if (evaluateProbabilitySpec(transition.probability) > 0) pairs.set(pairKey(transition.from, transition.to), [transition.from, transition.to]);
  }
  return [...pairs.values()].sort((left, right) => pairKey(...left).localeCompare(pairKey(...right)));
}

export function cartesianPairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const states = stateIds(model);
  return states.flatMap((from) => states.map((to) => [from, to] as [StateId, StateId]));
}

function initialMonitor(record: FiniteObservedMonitorCoupledEvidenceReestimationRecord, stateId: StateId): string {
  const found = record.initialMonitorStateByHiddenState.find((entry) => entry.stateId === stateId);
  if (found === undefined) throw new Error(`missing initial monitor state ${stateId}`);
  return found.monitorStateId;
}

function initialExternal(record: FiniteObservedMonitorCoupledEvidenceReestimationRecord, stateId: StateId): number {
  return record.initialEvidenceLikelihoods.find((entry) => entry.stateId === stateId)?.likelihood ?? 0;
}

function monitorNext(
  record: FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  step: number,
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  const found = record.monitorTransitionByStep[step - 1]?.find(
    (entry) => entry.monitorStateId === monitorStateId && entry.fromStateId === fromStateId && entry.toStateId === toStateId
  );
  if (found === undefined) throw new Error(`missing monitor transition ${step}/${monitorStateId}/${fromStateId}/${toStateId}`);
  return found.nextMonitorStateId;
}

function externalTransition(
  record: FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  step: number,
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return record.monitorCoupledTransitionEvidenceLikelihoodsByStep[step - 1]?.find(
    (entry) => entry.monitorStateId === monitorStateId && entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.likelihood ?? 0;
}

function kernelProbability(kernel: KernelEntry[], stateId: StateId, symbol: string): number {
  return kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function outgoingConcrete(model: DefinitionModel, stateId: StateId): Array<{ toStateId: StateId; probability: number }> {
  const state = model.states.find((candidate) => candidate.id === stateId);
  if (state === undefined) throw new Error(`unknown state ${stateId}`);
  if (isTerminalState(state)) return [{ toStateId: stateId, probability: 1 }];
  return model.transitions
    .filter((transition) => transition.from === stateId)
    .map((transition) => ({ toStateId: transition.to, probability: evaluateProbabilitySpec(transition.probability) }));
}

export function oneStateMonitorRecord(
  model: DefinitionModel,
  observations: string[],
  options: {
    recordId?: string;
    initialLikelihoods?: Record<StateId, number>;
    stepLikelihoods?: Array<Record<string, number>>;
    targetMonitorStates?: string[];
  } = {}
): FiniteObservedMonitorCoupledEvidenceReestimationRecord {
  const horizon = observations.length - 1;
  const monitorPairs = effectivePairs(model);
  const evidencePairs = cartesianPairs(model);
  const initialLikelihoods = options.initialLikelihoods ?? Object.fromEntries(stateIds(model).map((stateId) => [stateId, 1]));
  const stepLikelihoods: Array<Record<string, number>> = options.stepLikelihoods ?? Array.from({ length: horizon }, () => ({}));
  return {
    ...(options.recordId === undefined ? {} : { recordId: options.recordId }),
    horizon,
    observations: [...observations],
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: stateIds(model).map((stateId) => ({ stateId, monitorStateId: 'q' })),
    monitorTransitionByStep: Array.from({ length: horizon }, () =>
      monitorPairs.map(([fromStateId, toStateId]) => ({ monitorStateId: 'q', fromStateId, toStateId, nextMonitorStateId: 'q' }))
    ),
    initialEvidenceLikelihoods: stateIds(model).map((stateId) => ({ stateId, likelihood: initialLikelihoods[stateId] ?? 1 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: stepLikelihoods.map((values) =>
      evidencePairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: 'q',
        fromStateId,
        toStateId,
        likelihood: values[pairKey(fromStateId, toStateId)] ?? 1
      }))
    ),
    ...(options.targetMonitorStates === undefined ? {} : { targetMonitorStates: [...options.targetMonitorStates] })
  };
}

export function standardRequest(
  records?: FiniteObservedMonitorCoupledEvidenceReestimationRecord[]
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest {
  const model = twoStateModel();
  const layer = (values: Record<string, number>) => ({ ...values });
  const evidenceRecords = records ?? [
    oneStateMonitorRecord(model, ['x', 'y', 'x'], {
      recordId: 'r1',
      initialLikelihoods: { a: 0.91, b: 0.24 },
      stepLikelihoods: [
        layer({ [pairKey('a', 'a')]: 0.83, [pairKey('a', 'b')]: 0.42, [pairKey('b', 'a')]: 0.71, [pairKey('b', 'b')]: 0.31 }),
        layer({ [pairKey('a', 'a')]: 0.46, [pairKey('a', 'b')]: 0.88, [pairKey('b', 'a')]: 0.37, [pairKey('b', 'b')]: 0.79 })
      ]
    }),
    oneStateMonitorRecord(model, ['y', 'x'], {
      recordId: 'r2',
      initialLikelihoods: { a: 0.28, b: 0.86 },
      stepLikelihoods: [
        layer({ [pairKey('a', 'a')]: 0.35, [pairKey('a', 'b')]: 0.92, [pairKey('b', 'a')]: 0.63, [pairKey('b', 'b')]: 0.74 })
      ]
    })
  ];
  return {
    initialDistribution: initialDistribution(),
    alphabet: ['x', 'y'],
    kernel: standardKernel(),
    evidenceRecords
  };
}

export function completeRecordOracle(
  model: DefinitionModel,
  initial: Array<{ stateId: StateId; probability: number }>,
  kernel: KernelEntry[],
  alphabet: string[],
  record: FiniteObservedMonitorCoupledEvidenceReestimationRecord
): RecordOracle {
  const states = stateIds(model);
  const target = new Set(record.targetMonitorStates ?? record.monitorStates);
  const atoms: PathAtom[] = [];

  const visit = (hiddenStates: StateId[], monitorStates: string[], mass: number): void => {
    const step = hiddenStates.length - 1;
    if (step === record.horizon) {
      if (target.has(monitorStates[monitorStates.length - 1]!)) atoms.push({ hiddenStates, monitorStates, mass });
      return;
    }
    const from = hiddenStates[hiddenStates.length - 1]!;
    const q = monitorStates[monitorStates.length - 1]!;
    const symbol = record.observations[step + 1]!;
    for (const edge of outgoingConcrete(model, from)) {
      if (edge.probability <= 0) continue;
      const b = kernelProbability(kernel, edge.toStateId, symbol);
      const c = externalTransition(record, step + 1, q, from, edge.toStateId);
      if (b <= 0 || c <= 0) continue;
      const nextQ = monitorNext(record, step + 1, q, from, edge.toStateId);
      visit([...hiddenStates, edge.toStateId], [...monitorStates, nextQ], mass * edge.probability * b * c);
    }
  };

  const initialSymbol = record.observations[0]!;
  for (const stateId of states) {
    const mu = initial.find((entry) => entry.stateId === stateId)?.probability ?? 0;
    const b = kernelProbability(kernel, stateId, initialSymbol);
    const l = initialExternal(record, stateId);
    if (mu <= 0 || b <= 0 || l <= 0) continue;
    visit([stateId], [initialMonitor(record, stateId)], mu * b * l);
  }

  const eventProbability = atoms.reduce((sum, atom) => sum + atom.mass, 0);
  const initialPosterior = new Map<StateId, number>(states.map((stateId) => [stateId, 0]));
  const transitions = new Map<string, number>();
  const emissions = new Map<StateId, Map<string, number>>(
    states.map((stateId) => [stateId, new Map(alphabet.map((symbol) => [symbol, 0]))])
  );
  if (eventProbability === 0) {
    return { possible: false, eventProbability: 0, logEventProbability: null, initial: initialPosterior, transitions, emissions };
  }

  for (const atom of atoms) {
    const posterior = atom.mass / eventProbability;
    const x0 = atom.hiddenStates[0]!;
    initialPosterior.set(x0, (initialPosterior.get(x0) ?? 0) + posterior);
    for (let t = 0; t < atom.hiddenStates.length; t += 1) {
      const stateId = atom.hiddenStates[t]!;
      const symbol = record.observations[t]!;
      const row = emissions.get(stateId)!;
      row.set(symbol, (row.get(symbol) ?? 0) + posterior);
      if (t === 0) continue;
      const from = atom.hiddenStates[t - 1]!;
      const source = model.states.find((state) => state.id === from);
      if (source !== undefined && isTerminalState(source)) continue;
      const to = stateId;
      const key = pairKey(from, to);
      transitions.set(key, (transitions.get(key) ?? 0) + posterior);
    }
  }

  return {
    possible: true,
    eventProbability,
    logEventProbability: Math.log(eventProbability),
    initial: initialPosterior,
    transitions,
    emissions
  };
}

export function updatedRowsFromCounts(
  model: DefinitionModel,
  transitions: Map<string, number>,
  countTolerance = 1e-12
): Map<StateId, Map<StateId, number>> {
  const rows = new Map<StateId, Map<StateId, number>>();
  for (const stateId of stateIds(model)) {
    const state = model.states.find((candidate) => candidate.id === stateId)!;
    if (isTerminalState(state)) {
      rows.set(stateId, new Map([[stateId, 1]]));
      continue;
    }
    const destinations = [...new Set(model.transitions.filter((entry) => entry.from === stateId).map((entry) => entry.to))].sort();
    const departure = destinations.reduce((sum, to) => sum + (transitions.get(pairKey(stateId, to)) ?? 0), 0);
    if (departure <= countTolerance) {
      rows.set(stateId, new Map(destinations.map((to) => [to, aggregateTransitionProbability(model, stateId, to)] as const)));
    } else {
      rows.set(stateId, new Map(destinations.map((to) => [to, (transitions.get(pairKey(stateId, to)) ?? 0) / departure] as const)));
    }
  }
  return rows;
}

export function updatedKernelFromCounts(
  states: StateId[],
  alphabet: string[],
  currentKernel: KernelEntry[],
  emissions: Map<StateId, Map<string, number>>,
  countTolerance = 1e-12
): Map<StateId, Map<string, number>> {
  const rows = new Map<StateId, Map<string, number>>();
  for (const stateId of states) {
    const counts = emissions.get(stateId)!;
    const occupancy = alphabet.reduce((sum, symbol) => sum + (counts.get(symbol) ?? 0), 0);
    if (occupancy <= countTolerance) {
      rows.set(stateId, new Map(alphabet.map((symbol) => [symbol, kernelProbability(currentKernel, stateId, symbol)] as const)));
    } else {
      rows.set(stateId, new Map(alphabet.map((symbol) => [symbol, (counts.get(symbol) ?? 0) / occupancy] as const)));
    }
  }
  return rows;
}

export function modelWithAggregateRows(
  model: DefinitionModel,
  rows: Map<StateId, Map<StateId, number>>
): DefinitionModel {
  return {
    ...model,
    states: model.states.map((state) => ({ ...state })),
    transitions: model.transitions.map((transition) => {
      const source = model.states.find((state) => state.id === transition.from)!;
      if (isTerminalState(source)) return { ...transition };
      const currentAggregate = aggregateTransitionProbability(model, transition.from, transition.to);
      const targetAggregate = rows.get(transition.from)?.get(transition.to) ?? 0;
      const currentEdge = evaluateProbabilitySpec(transition.probability);
      const value = currentAggregate === 0 ? 0 : targetAggregate * (currentEdge / currentAggregate);
      return {
        ...transition,
        probability: typeof transition.probability === 'number' ? value : { type: 'constant' as const, value }
      };
    })
  };
}

export function kernelEntriesFromRows(
  states: StateId[],
  alphabet: string[],
  rows: Map<StateId, Map<string, number>>
): KernelEntry[] {
  return states.flatMap((stateId) => alphabet.map((symbol) => ({ stateId, symbol, probability: rows.get(stateId)?.get(symbol) ?? 0 })));
}

export function completeBatchOracle(
  model: DefinitionModel,
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest
): BatchOracle {
  const states = stateIds(model);
  const alphabet = [...request.alphabet].sort();
  const initialCounts = new Map<StateId, number>(states.map((stateId) => [stateId, 0]));
  const transitions = new Map<string, number>();
  const emissions = new Map<StateId, Map<string, number>>(
    states.map((stateId) => [stateId, new Map(alphabet.map((symbol) => [symbol, 0]))])
  );
  const occupancies = new Map<StateId, number>(states.map((stateId) => [stateId, 0]));
  const records: RecordOracle[] = [];
  let currentTotalLogLikelihood = 0;

  for (const record of request.evidenceRecords) {
    const oracle = completeRecordOracle(model, request.initialDistribution, request.kernel, alphabet, record);
    records.push(oracle);
    if (!oracle.possible || oracle.logEventProbability === null) {
      return {
        possible: false,
        records,
        initialCounts,
        transitions,
        emissions,
        occupancies,
        currentTotalLogLikelihood: null,
        updatedInitial: null,
        updatedRows: null,
        updatedKernel: null,
        updatedModel: null,
        updatedTotalLogLikelihood: null
      };
    }
    currentTotalLogLikelihood += oracle.logEventProbability;
    for (const stateId of states) {
      initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (oracle.initial.get(stateId) ?? 0));
      for (const symbol of alphabet) {
        const value = oracle.emissions.get(stateId)?.get(symbol) ?? 0;
        const row = emissions.get(stateId)!;
        row.set(symbol, (row.get(symbol) ?? 0) + value);
        occupancies.set(stateId, (occupancies.get(stateId) ?? 0) + value);
      }
    }
    for (const [key, value] of oracle.transitions) transitions.set(key, (transitions.get(key) ?? 0) + value);
  }

  const updatedInitial = new Map(states.map((stateId) => [stateId, (initialCounts.get(stateId) ?? 0) / request.evidenceRecords.length] as const));
  const updatedRows = updatedRowsFromCounts(model, transitions, request.countTolerance ?? 1e-12);
  const updatedKernel = updatedKernelFromCounts(states, alphabet, request.kernel, emissions, request.countTolerance ?? 1e-12);
  const updatedModel = modelWithAggregateRows(model, updatedRows);
  const updatedInitialEntries = states.map((stateId) => ({ stateId, probability: updatedInitial.get(stateId) ?? 0 }));
  const updatedKernelEntries = kernelEntriesFromRows(states, alphabet, updatedKernel);
  let updatedTotalLogLikelihood = 0;
  for (const record of request.evidenceRecords) {
    const oracle = completeRecordOracle(updatedModel, updatedInitialEntries, updatedKernelEntries, alphabet, record);
    if (!oracle.possible || oracle.logEventProbability === null) throw new Error('oracle update made a possible record impossible');
    updatedTotalLogLikelihood += oracle.logEventProbability;
  }

  return {
    possible: true,
    records,
    initialCounts,
    transitions,
    emissions,
    occupancies,
    currentTotalLogLikelihood,
    updatedInitial,
    updatedRows,
    updatedKernel,
    updatedModel,
    updatedTotalLogLikelihood
  };
}

export function resultInitialProbability(
  result: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  stateId: StateId
): number {
  return result.updatedInitialDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? Number.NaN;
}

export function resultTransitionProbability(
  result: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  stateId: StateId,
  toStateId: StateId
): number {
  return result.transitionRows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? Number.NaN;
}

export function resultKernelProbability(
  result: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess,
  stateId: StateId,
  symbol: string
): number {
  return result.observationKernelRows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.symbol === symbol)?.probability ?? Number.NaN;
}
