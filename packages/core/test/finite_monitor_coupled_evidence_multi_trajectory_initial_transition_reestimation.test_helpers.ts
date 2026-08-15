import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest,
  FiniteMonitorCoupledEvidenceReestimationRecord
} from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';

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
};

export type BatchOracle = {
  possible: boolean;
  records: RecordOracle[];
  initialCounts: Map<StateId, number>;
  transitions: Map<string, number>;
  currentTotalLogLikelihood: number | null;
  updatedInitial: Map<StateId, number> | null;
  updatedRows: Map<StateId, Map<StateId, number>> | null;
  updatedModel: DefinitionModel | null;
  updatedTotalLogLikelihood: number | null;
};

export function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

export function stateIds(model: DefinitionModel): StateId[] {
  return model.states.map((state) => state.id).sort();
}

export function initialProbability(
  request: Pick<FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest, 'initialDistribution'>,
  stateId: StateId
): number {
  return request.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

export function aggregateTransitionProbability(model: DefinitionModel, fromStateId: StateId, toStateId: StateId): number {
  const state = model.states.find((candidate) => candidate.id === fromStateId);
  if (state !== undefined && isTerminalState(state)) return fromStateId === toStateId ? 1 : 0;
  return model.transitions
    .filter((transition) => transition.from === fromStateId && transition.to === toStateId)
    .reduce((sum, transition) => sum + evaluateProbabilitySpec(transition.probability), 0);
}

function initialEvidence(record: FiniteMonitorCoupledEvidenceReestimationRecord, stateId: StateId): number {
  return record.initialEvidenceLikelihoods.find((entry) => entry.stateId === stateId)?.likelihood ?? 0;
}

function initialMonitor(record: FiniteMonitorCoupledEvidenceReestimationRecord, stateId: StateId): string {
  const found = record.initialMonitorStateByHiddenState.find((entry) => entry.stateId === stateId);
  if (found === undefined) throw new Error(`missing initial monitor state for ${stateId}`);
  return found.monitorStateId;
}

function monitorNext(
  record: FiniteMonitorCoupledEvidenceReestimationRecord,
  step: number,
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  const found = record.monitorTransitionByStep[step - 1]?.find(
    (entry) =>
      entry.monitorStateId === monitorStateId &&
      entry.fromStateId === fromStateId &&
      entry.toStateId === toStateId
  );
  if (found === undefined) throw new Error(`missing monitor transition at step ${step}: ${monitorStateId}/${fromStateId}/${toStateId}`);
  return found.nextMonitorStateId;
}

function coupledEvidence(
  record: FiniteMonitorCoupledEvidenceReestimationRecord,
  step: number,
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): number {
  const found = record.monitorCoupledTransitionEvidenceLikelihoodsByStep[step - 1]?.find(
    (entry) =>
      entry.monitorStateId === monitorStateId &&
      entry.fromStateId === fromStateId &&
      entry.toStateId === toStateId
  );
  if (found === undefined) throw new Error(`missing coupled evidence at step ${step}: ${monitorStateId}/${fromStateId}/${toStateId}`);
  return found.likelihood;
}

function outgoingConcrete(model: DefinitionModel, stateId: StateId): Array<{ toStateId: StateId; probability: number }> {
  const state = model.states.find((candidate) => candidate.id === stateId);
  if (state === undefined) throw new Error(`unknown state ${stateId}`);
  if (isTerminalState(state)) return [{ toStateId: stateId, probability: 1 }];
  return model.transitions
    .filter((transition) => transition.from === stateId)
    .map((transition) => ({ toStateId: transition.to, probability: evaluateProbabilitySpec(transition.probability) }));
}

export function completeRecordOracle(
  model: DefinitionModel,
  initialDistribution: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest['initialDistribution'],
  record: FiniteMonitorCoupledEvidenceReestimationRecord
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
    const fromStateId = hiddenStates[hiddenStates.length - 1]!;
    const q = monitorStates[monitorStates.length - 1]!;
    for (const edge of outgoingConcrete(model, fromStateId)) {
      if (edge.probability <= 0) continue;
      const likelihood = coupledEvidence(record, step + 1, q, fromStateId, edge.toStateId);
      if (likelihood <= 0) continue;
      const nextQ = monitorNext(record, step + 1, q, fromStateId, edge.toStateId);
      visit([...hiddenStates, edge.toStateId], [...monitorStates, nextQ], mass * edge.probability * likelihood);
    }
  };

  for (const stateId of states) {
    const mu = initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
    const l0 = initialEvidence(record, stateId);
    if (mu <= 0 || l0 <= 0) continue;
    visit([stateId], [initialMonitor(record, stateId)], mu * l0);
  }

  const eventProbability = atoms.reduce((sum, atom) => sum + atom.mass, 0);
  const initial = new Map<StateId, number>(states.map((stateId) => [stateId, 0]));
  const transitions = new Map<string, number>();
  if (eventProbability === 0) {
    return { possible: false, eventProbability: 0, logEventProbability: null, initial, transitions };
  }

  for (const atom of atoms) {
    const posterior = atom.mass / eventProbability;
    initial.set(atom.hiddenStates[0]!, (initial.get(atom.hiddenStates[0]!) ?? 0) + posterior);
    for (let t = 1; t < atom.hiddenStates.length; t += 1) {
      const from = atom.hiddenStates[t - 1]!;
      const to = atom.hiddenStates[t]!;
      const source = model.states.find((state) => state.id === from);
      if (source !== undefined && isTerminalState(source)) continue;
      const key = pairKey(from, to);
      transitions.set(key, (transitions.get(key) ?? 0) + posterior);
    }
  }

  return {
    possible: true,
    eventProbability,
    logEventProbability: Math.log(eventProbability),
    initial,
    transitions
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
        probability:
          typeof transition.probability === 'number'
            ? value
            : { type: 'constant' as const, value }
      };
    })
  };
}

export function completeBatchOracle(
  model: DefinitionModel,
  request: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest
): BatchOracle {
  const states = stateIds(model);
  const initialCounts = new Map<StateId, number>(states.map((stateId) => [stateId, 0]));
  const transitions = new Map<string, number>();
  const records: RecordOracle[] = [];
  let currentTotalLogLikelihood = 0;

  for (const record of request.evidenceRecords) {
    const oracle = completeRecordOracle(model, request.initialDistribution, record);
    records.push(oracle);
    if (!oracle.possible || oracle.logEventProbability === null) {
      return {
        possible: false,
        records,
        initialCounts,
        transitions,
        currentTotalLogLikelihood: null,
        updatedInitial: null,
        updatedRows: null,
        updatedModel: null,
        updatedTotalLogLikelihood: null
      };
    }
    currentTotalLogLikelihood += oracle.logEventProbability;
    for (const stateId of states) initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (oracle.initial.get(stateId) ?? 0));
    for (const [key, value] of oracle.transitions) transitions.set(key, (transitions.get(key) ?? 0) + value);
  }

  const updatedInitial = new Map(states.map((stateId) => [stateId, (initialCounts.get(stateId) ?? 0) / request.evidenceRecords.length] as const));
  const updatedRows = updatedRowsFromCounts(model, transitions, request.countTolerance ?? 1e-12);
  const updatedModel = modelWithAggregateRows(model, updatedRows);
  const updatedDistribution = states.map((stateId) => ({ stateId, probability: updatedInitial.get(stateId) ?? 0 }));
  let updatedTotalLogLikelihood = 0;
  for (const record of request.evidenceRecords) {
    const oracle = completeRecordOracle(updatedModel, updatedDistribution, record);
    if (!oracle.possible || oracle.logEventProbability === null) throw new Error('oracle update made a previously possible record impossible');
    updatedTotalLogLikelihood += oracle.logEventProbability;
  }

  return {
    possible: true,
    records,
    initialCounts,
    transitions,
    currentTotalLogLikelihood,
    updatedInitial,
    updatedRows,
    updatedModel,
    updatedTotalLogLikelihood
  };
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

export function initialDistribution() {
  return [
    { stateId: 'a', probability: 0.61 },
    { stateId: 'b', probability: 0.39 }
  ];
}

export function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const keys = new Map<string, [StateId, StateId]>();
  for (const state of model.states) {
    if (isTerminalState(state)) keys.set(pairKey(state.id, state.id), [state.id, state.id]);
  }
  for (const transition of model.transitions) keys.set(pairKey(transition.from, transition.to), [transition.from, transition.to]);
  return [...keys.values()].sort((left, right) => pairKey(...left).localeCompare(pairKey(...right)));
}

function candidateAeTablePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const states = stateIds(model);
  return states.flatMap((fromStateId) => states.map((toStateId) => [fromStateId, toStateId] as [StateId, StateId]));
}

export function oneStateMonitorRecord(
  model: DefinitionModel,
  options: {
    recordId?: string;
    initialLikelihoods: Record<StateId, number>;
    stepLikelihoods: Array<Record<string, number>>;
    targetMonitorStates?: string[];
  }
): FiniteMonitorCoupledEvidenceReestimationRecord {
  const pairs = candidateAeTablePairs(model);
  const record: FiniteMonitorCoupledEvidenceReestimationRecord = {
    ...(options.recordId === undefined ? {} : { recordId: options.recordId }),
    horizon: options.stepLikelihoods.length,
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: stateIds(model).map((stateId) => ({ stateId, monitorStateId: 'q' })),
    monitorTransitionByStep: options.stepLikelihoods.map(() =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: 'q',
        fromStateId,
        toStateId,
        nextMonitorStateId: 'q'
      }))
    ),
    initialEvidenceLikelihoods: stateIds(model).map((stateId) => ({ stateId, likelihood: options.initialLikelihoods[stateId] ?? 0 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: options.stepLikelihoods.map((layer) =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: 'q',
        fromStateId,
        toStateId,
        likelihood: layer[pairKey(fromStateId, toStateId)] ?? 0
      }))
    ),
    ...(options.targetMonitorStates === undefined ? {} : { targetMonitorStates: [...options.targetMonitorStates] })
  };
  return record;
}

export function standardHmmRecord(
  model: DefinitionModel,
  observations: string[],
  kernel: Array<{ stateId: StateId; symbol: string; probability: number }>,
  recordId?: string
): FiniteMonitorCoupledEvidenceReestimationRecord {
  const likelihood = (stateId: StateId, symbol: string) =>
    kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
  return oneStateMonitorRecord(model, {
    ...(recordId === undefined ? {} : { recordId }),
    initialLikelihoods: Object.fromEntries(stateIds(model).map((stateId) => [stateId, likelihood(stateId, observations[0]!)])),
    stepLikelihoods: observations.slice(1).map((symbol) =>
      Object.fromEntries(effectivePairs(model).map(([from, to]) => [pairKey(from, to), likelihood(to, symbol)]))
    )
  });
}

export function resultInitialProbability(
  result: { updatedInitialDistribution: Array<{ stateId: StateId; probability: number }> | null },
  stateId: StateId
): number {
  return result.updatedInitialDistribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

export function resultTransitionProbability(
  result: { transitionRows: Array<{ stateId: StateId; updatedRow: Array<{ toStateId: StateId; probability: number }> }> | null },
  stateId: StateId,
  toStateId: StateId
): number {
  return result.transitionRows?.find((row) => row.stateId === stateId)?.updatedRow.find((entry) => entry.toStateId === toStateId)?.probability ?? 0;
}
