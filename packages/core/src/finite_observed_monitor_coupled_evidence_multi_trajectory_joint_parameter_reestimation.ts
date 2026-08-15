import {
  DefinitionModel,
  ProbabilitySpec,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions,
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  MonitorCoupledCalibratedEvidenceLikelihoodEntry,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from './finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  DeterministicTrajectoryMonitorInitialEntry,
  DeterministicTrajectoryMonitorTransitionEntry
} from './finite_deterministic_trajectory_monitor_calibrated_evidence';
import { CalibratedEvidenceLikelihoodEntry } from './hidden_state_calibrated_evidence_likelihood_conditioning';

export type FiniteObservedMonitorCoupledEvidenceReestimationRecord = {
  recordId?: string;
  horizon: number;
  observations: string[];
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  monitorCoupledTransitionEvidenceLikelihoodsByStep: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
  targetMonitorStates?: string[];
};

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest = {
  initialDistribution: FiniteHiddenStateObservationRequest['initialDistribution'];
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
  evidenceRecords: FiniteObservedMonitorCoupledEvidenceReestimationRecord[];
  probabilityTolerance?: number;
  countTolerance?: number;
  likelihoodTolerance?: number;
  maxEvidenceRecords?: number;
  maxObservations?: number;
  maxMonitorStates?: number;
  maxAugmentedStates?: number;
  maxMonitorCoupledEvidenceEntries?: number;
};

export type FiniteObservedMonitorCoupledEvidenceStateProbability = {
  stateId: StateId;
  probability: number;
};

export type FiniteObservedMonitorCoupledEvidenceStateExpectedCount = {
  stateId: StateId;
  expectedCount: number;
};

export type FiniteObservedMonitorCoupledEvidenceTransitionProbability = {
  toStateId: StateId;
  probability: number;
};

export type FiniteObservedMonitorCoupledEvidenceTransitionExpectedCount = {
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteObservedMonitorCoupledEvidenceObservationProbability = {
  symbol: string;
  probability: number;
};

export type FiniteObservedMonitorCoupledEvidenceObservationExpectedCount = {
  symbol: string;
  expectedCount: number;
};

export type FiniteObservedMonitorCoupledEvidenceTransitionRowStatus =
  | 'updated_positive_expected_departure'
  | 'retained_zero_expected_departure'
  | 'structural_terminal_self_retention';

export type FiniteObservedMonitorCoupledEvidenceObservationRowStatus =
  | 'updated_positive_expected_occupancy'
  | 'retained_zero_expected_occupancy';

export type FiniteObservedMonitorCoupledEvidenceTransitionRow = {
  stateId: StateId;
  terminal: boolean;
  expectedDepartureMass: number;
  expectedCounts: FiniteObservedMonitorCoupledEvidenceTransitionExpectedCount[];
  currentRow: FiniteObservedMonitorCoupledEvidenceTransitionProbability[];
  updatedRow: FiniteObservedMonitorCoupledEvidenceTransitionProbability[];
  status: FiniteObservedMonitorCoupledEvidenceTransitionRowStatus;
  uniqueByExpectedCounts: boolean;
};

export type FiniteObservedMonitorCoupledEvidenceObservationRow = {
  stateId: StateId;
  expectedOccupancy: number;
  expectedCounts: FiniteObservedMonitorCoupledEvidenceObservationExpectedCount[];
  currentRow: FiniteObservedMonitorCoupledEvidenceObservationProbability[];
  updatedRow: FiniteObservedMonitorCoupledEvidenceObservationProbability[];
  status: FiniteObservedMonitorCoupledEvidenceObservationRowStatus;
  uniqueByExpectedCounts: boolean;
};

export type FiniteObservedMonitorCoupledEvidenceRecordEStep = {
  recordIndex: number;
  recordId?: string;
  possible: boolean;
  observations: string[];
  targetMonitorStates: string[];
  eventProbability: number | null;
  logEventProbability: number | null;
  eventProbabilityUnderflowed: boolean;
  posteriorInitialStateProbabilities: FiniteObservedMonitorCoupledEvidenceStateProbability[] | null;
  expectedTransitionCounts: Array<{
    fromStateId: StateId;
    toStateId: StateId;
    expectedCount: number;
  }> | null;
  expectedEmissionCounts: Array<{
    stateId: StateId;
    symbol: string;
    expectedCount: number;
  }> | null;
};

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationDiagnostics = {
  method: 'one_step_joint_initial_transition_observation_m_step_from_common_current_model_observed_and_monitor_coupled_evidence_e_steps';
  numericRepresentation: 'javascript_number_float64_with_candidate_ae_log_event_mass';
  simulationUsed: false;
  approximationUsed: false;
  multipleIndependentTrajectoriesUsed: true;
  evidenceRecordCount: number;
  realizedCategoricalObservationsUsed: true;
  separateExternalCalibratedEvidenceUsed: true;
  allRecordEStepsUseSameCurrentModel: true;
  allRecordEStepsFrozenBeforeMstep: true;
  sequentialParameterBlockUpdatesUsed: false;
  sequentialRecordUpdatesUsed: false;
  trajectoryConcatenationUsed: false;
  sufficientStatisticsAggregatedBeforeMstep: true;
  jointSimultaneousApplication: true;
  initialDistributionUpdated: boolean;
  transitionModelUpdated: boolean;
  observationKernelUpdated: boolean;
  calibratedEvidenceKernelUpdated: false;
  monitorTransitionUpdated: false;
  transitionTopologyChanged: false;
  observationAlphabetUpdated: false;
  terminalRowsLearned: false;
  terminalImplicitSelfRetentionExcludedFromLearnedTransitionCounts: true;
  zeroDepartureRowsRetainCurrentRow: true;
  zeroOccupancyRowsRetainCurrentRow: true;
  parallelTransitionWithinPairRatioPreserved: true;
  iterativeBaumWelchUsed: false;
  hardEmUsed: false;
  mapOrKBestSubstitutionUsed: false;
  weightedRecordsUsed: false;
  onlineOrStreamingEmUsed: false;
  bayesianPriorUsed: false;
  externalEvidenceMutationUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  maxEvidenceRecords: number;
  anyCurrentEventProbabilityUnderflowed: boolean;
  anyUpdatedEventProbabilityUnderflowed: boolean;
};

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailureCode =
  | 'empty_evidence_record_collection'
  | 'empty_observation_sequence'
  | 'observation_horizon_mismatch'
  | 'invalid_record_identifier'
  | 'duplicate_record_identifier'
  | 'invalid_reestimation_tolerance'
  | 'candidate_c_observation_failure'
  | 'candidate_ae_record_failure'
  | 'common_e_step_inconsistency'
  | 'aggregate_sufficient_statistics_inconsistency'
  | 'expected_count_topology_inconsistency'
  | 'expected_emission_count_inconsistency'
  | 'updated_initial_distribution_mass_violation'
  | 'updated_transition_row_mass_violation'
  | 'updated_observation_kernel_row_mass_violation'
  | 'updated_event_became_impossible'
  | 'likelihood_monotonicity_violation'
  | 'candidate_ai_resource_limit_exceeded'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure = {
  ok: false;
  failure: {
    code: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailureCode;
    message: string;
    recordIndex?: number;
    recordId?: string;
    stateId?: StateId;
    toStateId?: StateId;
    symbol?: string;
    step?: number;
    actual?: number;
    expected?: number;
    tolerance?: number;
    sourceFailureCode?: string;
  };
};

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess = {
  ok: true;
  possible: boolean;
  evidenceRecordCount: number;
  impossibleRecordIndex: number | null;
  impossibleRecordId: string | null;
  observationAlphabet: string[];
  currentInitialDistribution: FiniteObservedMonitorCoupledEvidenceStateProbability[];
  recordESteps: FiniteObservedMonitorCoupledEvidenceRecordEStep[];
  aggregatedPosteriorInitialCounts: FiniteObservedMonitorCoupledEvidenceStateExpectedCount[] | null;
  updatedInitialDistribution: FiniteObservedMonitorCoupledEvidenceStateProbability[] | null;
  transitionRows: FiniteObservedMonitorCoupledEvidenceTransitionRow[] | null;
  observationKernelRows: FiniteObservedMonitorCoupledEvidenceObservationRow[] | null;
  currentTotalLogLikelihood: number | null;
  updatedTotalLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationDiagnostics;
};

export type FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResult =
  | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationSuccess
  | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure;

type AggregateTransitionRow = Map<StateId, number>;
type ObservationKernelRows = Map<StateId, Map<string, number>>;

type ResolvedTolerances = {
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  maxEvidenceRecords: number;
};

const DEFAULT_PROBABILITY_TOLERANCE = 1e-12;
const DEFAULT_COUNT_TOLERANCE = 1e-12;
const DEFAULT_LIKELIHOOD_TOLERANCE = 1e-10;
const DEFAULT_MAX_EVIDENCE_RECORDS = 10_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function countKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function failure(
  code: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailureCode,
  message: string,
  details: Omit<FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure['failure'], 'code' | 'message'> = {}
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'probabilityTolerance' | 'countTolerance' | 'likelihoodTolerance'
): number | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, { actual: resolved });
  }
  return resolved;
}

function resolveRequest(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest
): ResolvedTolerances | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  const probabilityTolerance = resolvePositiveFinite(request.probabilityTolerance, DEFAULT_PROBABILITY_TOLERANCE, 'probabilityTolerance');
  if (typeof probabilityTolerance !== 'number') return probabilityTolerance;
  const countTolerance = resolvePositiveFinite(request.countTolerance, DEFAULT_COUNT_TOLERANCE, 'countTolerance');
  if (typeof countTolerance !== 'number') return countTolerance;
  const likelihoodTolerance = resolvePositiveFinite(request.likelihoodTolerance, DEFAULT_LIKELIHOOD_TOLERANCE, 'likelihoodTolerance');
  if (typeof likelihoodTolerance !== 'number') return likelihoodTolerance;
  const maxEvidenceRecords = request.maxEvidenceRecords ?? DEFAULT_MAX_EVIDENCE_RECORDS;
  if (!Number.isSafeInteger(maxEvidenceRecords) || maxEvidenceRecords <= 0) {
    return failure('candidate_ai_resource_limit_exceeded', 'maxEvidenceRecords must be a positive safe integer', { actual: maxEvidenceRecords });
  }
  return { probabilityTolerance, countTolerance, likelihoodTolerance, maxEvidenceRecords };
}

function validateRecordIdentifiers(
  records: FiniteObservedMonitorCoupledEvidenceReestimationRecord[]
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure | null {
  const seen = new Set<string>();
  for (let recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
    const recordId = records[recordIndex]?.recordId;
    if (recordId === undefined) continue;
    if (typeof recordId !== 'string' || recordId.length === 0) {
      return failure('invalid_record_identifier', 'recordId must be a non-empty string when supplied', { recordIndex });
    }
    if (seen.has(recordId)) {
      return failure('duplicate_record_identifier', 'recordId values must be unique when supplied', { recordIndex, recordId });
    }
    seen.add(recordId);
  }
  return null;
}

function probabilitySpecWithValue(spec: ProbabilitySpec, value: number): ProbabilitySpec {
  return typeof spec === 'number' ? value : { type: 'constant', value };
}

function currentInitialDistribution(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  stateIds: StateId[]
): FiniteObservedMonitorCoupledEvidenceStateProbability[] {
  const byState = new Map(request.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const));
  return stateIds.map((stateId) => ({ stateId, probability: byState.get(stateId) ?? 0 }));
}

function aggregateCurrentRows(model: DefinitionModel, stateIds: StateId[]): Map<StateId, AggregateTransitionRow> {
  const rows = new Map<StateId, AggregateTransitionRow>();
  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    if (state !== undefined && isTerminalState(state)) {
      rows.set(stateId, new Map([[stateId, 1]]));
      continue;
    }
    const row = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      row.set(transition.to, (row.get(transition.to) ?? 0) + probability);
    }
    rows.set(stateId, row);
  }
  return rows;
}

function transitionRowEntries(row: AggregateTransitionRow): FiniteObservedMonitorCoupledEvidenceTransitionProbability[] {
  return [...row.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([toStateId, probability]) => ({ toStateId, probability }));
}

function currentKernelRows(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  stateIds: StateId[],
  symbols: string[]
): ObservationKernelRows {
  const rows: ObservationKernelRows = new Map();
  for (const stateId of stateIds) rows.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
  for (const entry of request.kernel) rows.get(entry.stateId)?.set(entry.symbol, entry.probability);
  return rows;
}

function observationRowEntries(
  row: Map<string, number>,
  symbols: string[]
): FiniteObservedMonitorCoupledEvidenceObservationProbability[] {
  return symbols.map((symbol) => ({ symbol, probability: row.get(symbol) ?? 0 }));
}

function candidateAeOptions(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  probabilityTolerance: number
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions {
  return {
    probabilityTolerance,
    ...(request.maxObservations === undefined ? {} : { maxObservations: request.maxObservations }),
    ...(request.maxMonitorStates === undefined ? {} : { maxMonitorStates: request.maxMonitorStates }),
    ...(request.maxAugmentedStates === undefined ? {} : { maxAugmentedStates: request.maxAugmentedStates }),
    ...(request.maxMonitorCoupledEvidenceEntries === undefined
      ? {}
      : { maxMonitorCoupledEvidenceEntries: request.maxMonitorCoupledEvidenceEntries })
  };
}

function candidateCRequest(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  observations: string[],
  initialDistribution = request.initialDistribution,
  kernel = request.kernel
): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel: kernel.map((entry) => ({ ...entry })),
    observations: [...observations]
  };
}

function kernelProbability(
  kernelRows: ObservationKernelRows,
  stateId: StateId,
  symbol: string
): number | undefined {
  return kernelRows.get(stateId)?.get(symbol);
}

function combinedCandidateAeRequest(
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  record: FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  kernelRows: ObservationKernelRows,
  initialDistribution: FiniteHiddenStateObservationRequest['initialDistribution']
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest & { targetMonitorStates: string[] } |
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  if (record.observations.length === 0) {
    return failure('empty_observation_sequence', 'Candidate AI records require a finite non-empty realized observation sequence');
  }
  if (record.observations.length !== record.horizon + 1) {
    return failure('observation_horizon_mismatch', 'Candidate AI observations must contain exactly horizon + 1 symbols', {
      actual: record.observations.length,
      expected: record.horizon + 1
    });
  }
  const initialSymbol = record.observations[0]!;
  const initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[] = [];
  for (const entry of record.initialEvidenceLikelihoods) {
    const emission = kernelProbability(kernelRows, entry.stateId, initialSymbol);
    if (emission === undefined) {
      return failure('internal_reestimation_inconsistency', 'Validated observation kernel omitted state/symbol probability while constructing Candidate AI joint factor', {
        stateId: entry.stateId,
        symbol: initialSymbol
      });
    }
    const likelihood = entry.likelihood * emission;
    if (!Number.isFinite(likelihood) || likelihood < 0 || likelihood > 1) {
      return failure('non_finite_reestimation_result', 'Combined initial observation/external evidence factor became invalid', {
        stateId: entry.stateId,
        symbol: initialSymbol,
        actual: likelihood
      });
    }
    initialEvidenceLikelihoods.push({ stateId: entry.stateId, likelihood });
  }

  const transitionEvidence: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][] = [];
  for (let layerIndex = 0; layerIndex < record.monitorCoupledTransitionEvidenceLikelihoodsByStep.length; layerIndex += 1) {
    const symbol = record.observations[layerIndex + 1];
    if (symbol === undefined) {
      return failure('observation_horizon_mismatch', 'Candidate AI transition evidence references a missing realized observation', {
        step: layerIndex + 1
      });
    }
    const layer: MonitorCoupledCalibratedEvidenceLikelihoodEntry[] = [];
    for (const entry of record.monitorCoupledTransitionEvidenceLikelihoodsByStep[layerIndex] ?? []) {
      const emission = kernelProbability(kernelRows, entry.toStateId, symbol);
      if (emission === undefined) {
        return failure('internal_reestimation_inconsistency', 'Validated observation kernel omitted destination-state emission probability', {
          stateId: entry.toStateId,
          symbol,
          step: layerIndex + 1
        });
      }
      const likelihood = entry.likelihood * emission;
      if (!Number.isFinite(likelihood) || likelihood < 0 || likelihood > 1) {
        return failure('non_finite_reestimation_result', 'Combined transition observation/external evidence factor became invalid', {
          stateId: entry.toStateId,
          symbol,
          step: layerIndex + 1,
          actual: likelihood
        });
      }
      layer.push({ ...entry, likelihood });
    }
    transitionEvidence.push(layer);
  }

  return {
    initialDistribution: initialDistribution.map((entry) => ({ ...entry })),
    horizon: record.horizon,
    monitorStates: [...record.monitorStates],
    initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState.map((entry) => ({ ...entry })),
    monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => layer.map((entry) => ({ ...entry }))),
    initialEvidenceLikelihoods,
    monitorCoupledTransitionEvidenceLikelihoodsByStep: transitionEvidence,
    targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)]
  };
}

function checkedPosteriorDistribution(
  stateIds: StateId[],
  distribution: Array<{ stateId: StateId; probability: number }>,
  tolerance: number,
  recordIndex: number,
  recordId: string | undefined,
  step: number
): Map<StateId, number> | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  const map = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  for (const entry of distribution) {
    if (!map.has(entry.stateId) || !Number.isFinite(entry.probability) || entry.probability < 0) {
      return failure('common_e_step_inconsistency', 'Candidate AE smoothing contained an invalid hidden-state probability', {
        recordIndex,
        ...(recordId === undefined ? {} : { recordId }),
        stateId: entry.stateId,
        step,
        actual: entry.probability
      });
    }
    map.set(entry.stateId, (map.get(entry.stateId) ?? 0) + entry.probability);
  }
  const total = [...map.values()].reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure('common_e_step_inconsistency', 'Candidate AE smoothing distribution did not sum to one', {
      recordIndex,
      ...(recordId === undefined ? {} : { recordId }),
      step,
      actual: total,
      expected: 1,
      tolerance
    });
  }
  return new Map(stateIds.map((stateId) => [stateId, (map.get(stateId) ?? 0) / total] as const));
}

function buildUpdatedModel(
  model: DefinitionModel,
  updatedRows: Map<StateId, AggregateTransitionRow>,
  currentRows: Map<StateId, AggregateTransitionRow>
): DefinitionModel | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  const transitions: DefinitionModel['transitions'] = [];
  for (const transition of model.transitions) {
    const state = model.states.find((candidate) => candidate.id === transition.from);
    if (state !== undefined && isTerminalState(state)) {
      transitions.push({ ...transition });
      continue;
    }
    const currentAggregate = currentRows.get(transition.from)?.get(transition.to);
    const updatedAggregate = updatedRows.get(transition.from)?.get(transition.to);
    if (currentAggregate === undefined || updatedAggregate === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing aggregate transition row while applying Candidate AI update', {
        stateId: transition.from,
        toStateId: transition.to
      });
    }
    const currentEdge = evaluateProbabilitySpec(transition.probability);
    let updatedEdge = 0;
    if (currentAggregate > 0) {
      updatedEdge = updatedAggregate * (currentEdge / currentAggregate);
    } else if (updatedAggregate !== 0) {
      return failure('expected_count_topology_inconsistency', 'Cannot assign positive updated mass through zero-current aggregate support', {
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedAggregate,
        expected: 0
      });
    }
    if (!Number.isFinite(updatedEdge) || updatedEdge < 0) {
      return failure('non_finite_reestimation_result', 'Updated transition edge probability became invalid', {
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedEdge
      });
    }
    transitions.push({ ...transition, probability: probabilitySpecWithValue(transition.probability, updatedEdge) });
  }
  return {
    ...model,
    states: model.states.map((state) => ({
      ...state,
      ...(state.properties === undefined ? {} : { properties: { ...state.properties } })
    })),
    transitions
  };
}

function updatedKernelEntries(
  stateIds: StateId[],
  symbols: string[],
  rows: ObservationKernelRows
): HiddenObservationKernelEntry[] | FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure {
  const result: HiddenObservationKernelEntry[] = [];
  for (const stateId of stateIds) {
    const row = rows.get(stateId);
    if (row === undefined) return failure('internal_reestimation_inconsistency', 'Missing updated observation-kernel row', { stateId });
    for (const symbol of symbols) {
      const probability = row.get(symbol);
      if (probability === undefined || !Number.isFinite(probability) || probability < 0) {
        return failure('non_finite_reestimation_result', 'Updated observation-kernel probability became invalid', {
          stateId,
          symbol,
          ...(probability === undefined ? {} : { actual: probability })
        });
      }
      result.push({ stateId, symbol, probability });
    }
  }
  return result;
}

function diagnostics(
  recordCount: number,
  resolved: ResolvedTolerances,
  currentUnderflowed: boolean,
  updatedUnderflowed: boolean,
  updated: boolean
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationDiagnostics {
  return {
    method: 'one_step_joint_initial_transition_observation_m_step_from_common_current_model_observed_and_monitor_coupled_evidence_e_steps',
    numericRepresentation: 'javascript_number_float64_with_candidate_ae_log_event_mass',
    simulationUsed: false,
    approximationUsed: false,
    multipleIndependentTrajectoriesUsed: true,
    evidenceRecordCount: recordCount,
    realizedCategoricalObservationsUsed: true,
    separateExternalCalibratedEvidenceUsed: true,
    allRecordEStepsUseSameCurrentModel: true,
    allRecordEStepsFrozenBeforeMstep: true,
    sequentialParameterBlockUpdatesUsed: false,
    sequentialRecordUpdatesUsed: false,
    trajectoryConcatenationUsed: false,
    sufficientStatisticsAggregatedBeforeMstep: true,
    jointSimultaneousApplication: true,
    initialDistributionUpdated: updated,
    transitionModelUpdated: updated,
    observationKernelUpdated: updated,
    calibratedEvidenceKernelUpdated: false,
    monitorTransitionUpdated: false,
    transitionTopologyChanged: false,
    observationAlphabetUpdated: false,
    terminalRowsLearned: false,
    terminalImplicitSelfRetentionExcludedFromLearnedTransitionCounts: true,
    zeroDepartureRowsRetainCurrentRow: true,
    zeroOccupancyRowsRetainCurrentRow: true,
    parallelTransitionWithinPairRatioPreserved: true,
    iterativeBaumWelchUsed: false,
    hardEmUsed: false,
    mapOrKBestSubstitutionUsed: false,
    weightedRecordsUsed: false,
    onlineOrStreamingEmUsed: false,
    bayesianPriorUsed: false,
    externalEvidenceMutationUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance: resolved.probabilityTolerance,
    countTolerance: resolved.countTolerance,
    likelihoodTolerance: resolved.likelihoodTolerance,
    maxEvidenceRecords: resolved.maxEvidenceRecords,
    anyCurrentEventProbabilityUnderflowed: currentUnderflowed,
    anyUpdatedEventProbabilityUnderflowed: updatedUnderflowed
  };
}

export function reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(
  model: DefinitionModel,
  request: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResult {
  if (!Array.isArray(request.evidenceRecords) || request.evidenceRecords.length === 0) {
    return failure('empty_evidence_record_collection', 'Candidate AI requires at least one independent observed/evidence record');
  }
  const resolved = resolveRequest(request);
  if ('failure' in resolved) return resolved;
  if (request.evidenceRecords.length > resolved.maxEvidenceRecords) {
    return failure('candidate_ai_resource_limit_exceeded', 'Candidate AI evidence record count exceeds maxEvidenceRecords', {
      actual: request.evidenceRecords.length,
      expected: resolved.maxEvidenceRecords
    });
  }
  const identifierFailure = validateRecordIdentifiers(request.evidenceRecords);
  if (identifierFailure !== null) return identifierFailure;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const symbols = [...request.alphabet].sort(compareStrings);
  const currentInitial = currentInitialDistribution(request, stateIds);
  const currentRows = aggregateCurrentRows(model, stateIds);
  const terminalStates = new Set(model.states.filter((state) => isTerminalState(state)).map((state) => state.id));
  const initialCounts = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  const transitionCounts = new Map<string, number>();
  const emissionCounts: ObservationKernelRows = new Map();
  const occupancies = new Map<StateId, number>();
  for (const stateId of stateIds) {
    emissionCounts.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
    occupancies.set(stateId, 0);
  }

  const recordESteps: FiniteObservedMonitorCoupledEvidenceRecordEStep[] = [];
  let currentTotalLogLikelihood = 0;
  let currentUnderflowed = false;
  let impossibleRecordIndex: number | null = null;
  let impossibleRecordId: string | null = null;
  const aeOptions = candidateAeOptions(request, resolved.probabilityTolerance);

  let currentKernel: ObservationKernelRows | null = null;

  for (let recordIndex = 0; recordIndex < request.evidenceRecords.length; recordIndex += 1) {
    const record = request.evidenceRecords[recordIndex];
    if (record === undefined) {
      return failure('internal_reestimation_inconsistency', 'Candidate AI evidence record disappeared during iteration', { recordIndex });
    }
    if (record.observations.length === 0) {
      return failure('empty_observation_sequence', 'Candidate AI records require a finite non-empty realized observation sequence', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    if (record.observations.length !== record.horizon + 1) {
      return failure('observation_horizon_mismatch', 'Candidate AI observations must contain exactly horizon + 1 symbols', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        actual: record.observations.length,
        expected: record.horizon + 1
      });
    }

    const cValidation = filterFiniteHiddenStateObservationSequence(
      model,
      candidateCRequest(request, record.observations),
      {
        probabilityTolerance: resolved.probabilityTolerance,
        ...(request.maxObservations === undefined ? {} : { maxObservations: request.maxObservations })
      }
    );
    if (!cValidation.ok) {
      return failure('candidate_c_observation_failure', 'Candidate C rejected Candidate AI realized-observation semantics', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: cValidation.failure.code
      });
    }
    if (currentKernel === null) currentKernel = currentKernelRows(request, stateIds, symbols);

    const aeRequest = combinedCandidateAeRequest(request, record, currentKernel, request.initialDistribution);
    if ('failure' in aeRequest) {
      return {
        ...aeRequest,
        failure: {
          ...aeRequest.failure,
          recordIndex,
          ...(record.recordId === undefined ? {} : { recordId: record.recordId })
        }
      };
    }
    const ae = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      aeRequest,
      aeOptions
    );
    if (!ae.ok) {
      return failure('candidate_ae_record_failure', 'Candidate AE rejected Candidate AI combined observed/external evidence record', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: ae.failure.code
      });
    }

    const possible = ae.possible;
    const eventProbability = ae.jointEventProbability;
    const logEventProbability = ae.logJointEventProbability;
    const underflowed = possible && eventProbability === null && logEventProbability !== null;
    currentUnderflowed ||= underflowed;

    if (!possible) {
      if (impossibleRecordIndex === null) {
        impossibleRecordIndex = recordIndex;
        impossibleRecordId = record.recordId ?? null;
      }
      recordESteps.push({
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        possible: false,
        observations: [...record.observations],
        targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)],
        eventProbability,
        logEventProbability,
        eventProbabilityUnderflowed: false,
        posteriorInitialStateProbabilities: null,
        expectedTransitionCounts: null,
        expectedEmissionCounts: null
      });
      continue;
    }

    if (
      logEventProbability === null ||
      !Number.isFinite(logEventProbability) ||
      ae.smoothingSteps === null ||
      ae.expectedTransitionCounts === null ||
      ae.smoothingSteps.length !== record.observations.length
    ) {
      return failure('common_e_step_inconsistency', 'Candidate AE omitted complete finite posterior statistics for a possible Candidate AI record', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }

    currentTotalLogLikelihood += logEventProbability;
    const perRecordEmissionCounts: Array<{ stateId: StateId; symbol: string; expectedCount: number }> = [];
    const perRecordEmissionMap: ObservationKernelRows = new Map();
    for (const stateId of stateIds) perRecordEmissionMap.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));

    let checkedInitial: Map<StateId, number> | null = null;
    for (let stepIndex = 0; stepIndex < ae.smoothingSteps.length; stepIndex += 1) {
      const smoothingStep = ae.smoothingSteps[stepIndex];
      const symbol = record.observations[stepIndex];
      if (smoothingStep === undefined || symbol === undefined || smoothingStep.step !== stepIndex) {
        return failure('common_e_step_inconsistency', 'Candidate AE smoothing step alignment disagrees with Candidate AI realized observations', {
          recordIndex,
          ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
          step: stepIndex
        });
      }
      if (!symbols.includes(symbol)) {
        return failure('expected_emission_count_inconsistency', 'Candidate AI smoothing references an observation outside the fixed alphabet', {
          recordIndex,
          ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
          step: stepIndex,
          symbol
        });
      }
      const checked = checkedPosteriorDistribution(
        stateIds,
        smoothingStep.hiddenStateDistribution,
        resolved.probabilityTolerance * 20,
        recordIndex,
        record.recordId,
        stepIndex
      );
      if ('failure' in checked) return checked;
      if (stepIndex === 0) checkedInitial = checked;
      for (const stateId of stateIds) {
        const value = checked.get(stateId) ?? 0;
        const aggregateRow = emissionCounts.get(stateId);
        const recordRow = perRecordEmissionMap.get(stateId);
        if (aggregateRow === undefined || recordRow === undefined) {
          return failure('internal_reestimation_inconsistency', 'Missing Candidate AI emission-count row', { stateId });
        }
        aggregateRow.set(symbol, (aggregateRow.get(symbol) ?? 0) + value);
        recordRow.set(symbol, (recordRow.get(symbol) ?? 0) + value);
        occupancies.set(stateId, (occupancies.get(stateId) ?? 0) + value);
      }
    }
    if (checkedInitial === null) {
      return failure('common_e_step_inconsistency', 'Candidate AE omitted Candidate AI gamma_0', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    for (const stateId of stateIds) initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (checkedInitial.get(stateId) ?? 0));

    for (const stateId of stateIds) {
      const row = perRecordEmissionMap.get(stateId)!;
      for (const symbol of symbols) {
        perRecordEmissionCounts.push({ stateId, symbol, expectedCount: row.get(symbol) ?? 0 });
      }
    }

    for (const entry of ae.expectedTransitionCounts) {
      if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < -resolved.countTolerance) {
        return failure('common_e_step_inconsistency', 'Candidate AE expected transition count became invalid', {
          recordIndex,
          ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
          stateId: entry.fromStateId,
          toStateId: entry.toStateId,
          actual: entry.expectedCount
        });
      }
      if (terminalStates.has(entry.fromStateId)) continue;
      const currentRow = currentRows.get(entry.fromStateId);
      if (currentRow === undefined || !currentRow.has(entry.toStateId)) {
        if (entry.expectedCount > resolved.countTolerance) {
          return failure('expected_count_topology_inconsistency', 'Candidate AE produced positive expected count outside fixed transition topology', {
            recordIndex,
            ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
            stateId: entry.fromStateId,
            toStateId: entry.toStateId,
            actual: entry.expectedCount,
            expected: 0
          });
        }
        continue;
      }
      const key = countKey(entry.fromStateId, entry.toStateId);
      transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + Math.max(0, entry.expectedCount));
    }

    recordESteps.push({
      recordIndex,
      ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
      possible: true,
      observations: [...record.observations],
      targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)],
      eventProbability,
      logEventProbability,
      eventProbabilityUnderflowed: underflowed,
      posteriorInitialStateProbabilities: stateIds.map((stateId) => ({ stateId, probability: checkedInitial!.get(stateId) ?? 0 })),
      expectedTransitionCounts: ae.expectedTransitionCounts.map((entry) => ({ ...entry })),
      expectedEmissionCounts: perRecordEmissionCounts
    });
  }

  if (currentKernel === null) {
    return failure('internal_reestimation_inconsistency', 'Candidate AI did not establish the current observation kernel');
  }

  if (impossibleRecordIndex !== null) {
    return {
      ok: true,
      possible: false,
      evidenceRecordCount: request.evidenceRecords.length,
      impossibleRecordIndex,
      impossibleRecordId,
      observationAlphabet: symbols,
      currentInitialDistribution: currentInitial,
      recordESteps,
      aggregatedPosteriorInitialCounts: null,
      updatedInitialDistribution: null,
      transitionRows: null,
      observationKernelRows: null,
      currentTotalLogLikelihood: null,
      updatedTotalLogLikelihood: null,
      likelihoodDelta: null,
      diagnostics: diagnostics(request.evidenceRecords.length, resolved, currentUnderflowed, false, false)
    };
  }

  if (!Number.isFinite(currentTotalLogLikelihood)) {
    return failure('non_finite_reestimation_result', 'Current total Candidate AI event log likelihood became non-finite', {
      actual: currentTotalLogLikelihood
    });
  }

  const aggregatedPosteriorInitialCounts = stateIds.map((stateId) => ({
    stateId,
    expectedCount: initialCounts.get(stateId) ?? 0
  }));
  const updatedInitial = aggregatedPosteriorInitialCounts.map((entry) => ({
    stateId: entry.stateId,
    probability: entry.expectedCount / request.evidenceRecords.length
  }));
  const initialTotal = updatedInitial.reduce((sum, entry) => sum + entry.probability, 0);
  if (!Number.isFinite(initialTotal) || Math.abs(initialTotal - 1) > resolved.probabilityTolerance) {
    return failure('updated_initial_distribution_mass_violation', 'Updated Candidate AI initial distribution does not sum to one', {
      actual: initialTotal,
      expected: 1,
      tolerance: resolved.probabilityTolerance
    });
  }

  const updatedTransitionRows = new Map<StateId, AggregateTransitionRow>();
  const transitionRows: FiniteObservedMonitorCoupledEvidenceTransitionRow[] = [];
  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    const terminal = state !== undefined && isTerminalState(state);
    const currentRow = currentRows.get(stateId) ?? new Map<StateId, number>();
    const allowed = new Set(currentRow.keys());
    const expectedCounts = stateIds.map((toStateId) => ({
      toStateId,
      expectedCount: transitionCounts.get(countKey(stateId, toStateId)) ?? 0
    }));
    for (const entry of expectedCounts) {
      if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) {
        return failure('non_finite_reestimation_result', 'Aggregated Candidate AI expected transition count became invalid', {
          stateId,
          toStateId: entry.toStateId,
          actual: entry.expectedCount
        });
      }
      if (!terminal && !allowed.has(entry.toStateId) && entry.expectedCount > resolved.countTolerance) {
        return failure('expected_count_topology_inconsistency', 'Aggregated Candidate AI expected transition count assigns mass outside fixed topology', {
          stateId,
          toStateId: entry.toStateId,
          actual: entry.expectedCount,
          expected: 0,
          tolerance: resolved.countTolerance
        });
      }
    }
    const departure = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (terminal) {
      const row = new Map<StateId, number>([[stateId, 1]]);
      updatedTransitionRows.set(stateId, row);
      transitionRows.push({
        stateId,
        terminal: true,
        expectedDepartureMass: departure,
        expectedCounts,
        currentRow: transitionRowEntries(currentRow),
        updatedRow: transitionRowEntries(row),
        status: 'structural_terminal_self_retention',
        uniqueByExpectedCounts: false
      });
      continue;
    }
    if (departure <= resolved.countTolerance) {
      const retained = new Map(currentRow);
      updatedTransitionRows.set(stateId, retained);
      transitionRows.push({
        stateId,
        terminal: false,
        expectedDepartureMass: departure,
        expectedCounts,
        currentRow: transitionRowEntries(currentRow),
        updatedRow: transitionRowEntries(retained),
        status: 'retained_zero_expected_departure',
        uniqueByExpectedCounts: false
      });
      continue;
    }
    const updated = new Map<StateId, number>();
    for (const toStateId of [...currentRow.keys()].sort(compareStrings)) {
      updated.set(toStateId, (transitionCounts.get(countKey(stateId, toStateId)) ?? 0) / departure);
    }
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > resolved.probabilityTolerance) {
      return failure('updated_transition_row_mass_violation', 'Updated Candidate AI transition row does not sum to one', {
        stateId,
        actual: total,
        expected: 1,
        tolerance: resolved.probabilityTolerance
      });
    }
    updatedTransitionRows.set(stateId, updated);
    transitionRows.push({
      stateId,
      terminal: false,
      expectedDepartureMass: departure,
      expectedCounts,
      currentRow: transitionRowEntries(currentRow),
      updatedRow: transitionRowEntries(updated),
      status: 'updated_positive_expected_departure',
      uniqueByExpectedCounts: true
    });
  }

  const updatedKernelRows: ObservationKernelRows = new Map();
  const observationRows: FiniteObservedMonitorCoupledEvidenceObservationRow[] = [];
  for (const stateId of stateIds) {
    const counts = emissionCounts.get(stateId);
    const currentRow = currentKernel.get(stateId);
    const occupancy = occupancies.get(stateId) ?? 0;
    if (counts === undefined || currentRow === undefined || !Number.isFinite(occupancy) || occupancy < 0) {
      return failure('non_finite_reestimation_result', 'Aggregated Candidate AI expected observation occupancy became invalid', {
        stateId,
        actual: occupancy
      });
    }
    const expectedCounts = symbols.map((symbol) => ({ symbol, expectedCount: counts.get(symbol) ?? 0 }));
    const countTotal = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (!Number.isFinite(countTotal) || Math.abs(countTotal - occupancy) > resolved.countTolerance * Math.max(1, request.evidenceRecords.length)) {
      return failure('expected_emission_count_inconsistency', 'Aggregated Candidate AI expected emission counts do not sum to expected occupancy', {
        stateId,
        actual: countTotal,
        expected: occupancy,
        tolerance: resolved.countTolerance * Math.max(1, request.evidenceRecords.length)
      });
    }
    if (occupancy <= resolved.countTolerance) {
      const retained = new Map(currentRow);
      updatedKernelRows.set(stateId, retained);
      observationRows.push({
        stateId,
        expectedOccupancy: occupancy,
        expectedCounts,
        currentRow: observationRowEntries(currentRow, symbols),
        updatedRow: observationRowEntries(retained, symbols),
        status: 'retained_zero_expected_occupancy',
        uniqueByExpectedCounts: false
      });
      continue;
    }
    const updated = new Map<string, number>();
    for (const symbol of symbols) updated.set(symbol, (counts.get(symbol) ?? 0) / occupancy);
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > resolved.probabilityTolerance) {
      return failure('updated_observation_kernel_row_mass_violation', 'Updated Candidate AI observation-kernel row does not sum to one', {
        stateId,
        actual: total,
        expected: 1,
        tolerance: resolved.probabilityTolerance
      });
    }
    updatedKernelRows.set(stateId, updated);
    observationRows.push({
      stateId,
      expectedOccupancy: occupancy,
      expectedCounts,
      currentRow: observationRowEntries(currentRow, symbols),
      updatedRow: observationRowEntries(updated, symbols),
      status: 'updated_positive_expected_occupancy',
      uniqueByExpectedCounts: true
    });
  }

  const updatedModel = buildUpdatedModel(model, updatedTransitionRows, currentRows);
  if ('failure' in updatedModel) return updatedModel;
  const updatedKernel = updatedKernelEntries(stateIds, symbols, updatedKernelRows);
  if ('failure' in updatedKernel) return updatedKernel;

  let updatedTotalLogLikelihood = 0;
  let updatedUnderflowed = false;
  for (let recordIndex = 0; recordIndex < request.evidenceRecords.length; recordIndex += 1) {
    const record = request.evidenceRecords[recordIndex];
    if (record === undefined) return failure('internal_reestimation_inconsistency', 'Missing Candidate AI record during updated likelihood evaluation', { recordIndex });

    const updatedCValidation = filterFiniteHiddenStateObservationSequence(
      updatedModel,
      candidateCRequest(request, record.observations, updatedInitial, updatedKernel),
      {
        probabilityTolerance: resolved.probabilityTolerance,
        ...(request.maxObservations === undefined ? {} : { maxObservations: request.maxObservations })
      }
    );
    if (!updatedCValidation.ok) {
      return failure('internal_reestimation_inconsistency', `Candidate AI updated model/kernel failed Candidate C validation: ${updatedCValidation.failure.code}`, {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: updatedCValidation.failure.code
      });
    }

    const updatedAeRequest = combinedCandidateAeRequest(request, record, updatedKernelRows, updatedInitial);
    if ('failure' in updatedAeRequest) return updatedAeRequest;
    const updatedAe = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      updatedModel,
      updatedAeRequest,
      aeOptions
    );
    if (!updatedAe.ok) {
      return failure('internal_reestimation_inconsistency', `Candidate AI updated model failed Candidate AE validation: ${updatedAe.failure.code}`, {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: updatedAe.failure.code
      });
    }
    if (!updatedAe.possible || updatedAe.logJointEventProbability === null || !Number.isFinite(updatedAe.logJointEventProbability)) {
      return failure('updated_event_became_impossible', 'Candidate AI one-step simultaneous update made a previously possible record impossible', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    updatedTotalLogLikelihood += updatedAe.logJointEventProbability;
    updatedUnderflowed ||= updatedAe.jointEventProbability === null;
  }

  const likelihoodDelta = updatedTotalLogLikelihood - currentTotalLogLikelihood;
  if (!Number.isFinite(updatedTotalLogLikelihood) || !Number.isFinite(likelihoodDelta)) {
    return failure('non_finite_reestimation_result', 'Candidate AI likelihood comparison became non-finite', {
      actual: likelihoodDelta
    });
  }
  if (likelihoodDelta < -resolved.likelihoodTolerance) {
    return failure('likelihood_monotonicity_violation', 'Candidate AI one-step simultaneous joint re-estimation decreased total realized-event log likelihood beyond tolerance', {
      actual: likelihoodDelta,
      expected: 0,
      tolerance: resolved.likelihoodTolerance
    });
  }

  return {
    ok: true,
    possible: true,
    evidenceRecordCount: request.evidenceRecords.length,
    impossibleRecordIndex: null,
    impossibleRecordId: null,
    observationAlphabet: symbols,
    currentInitialDistribution: currentInitial,
    recordESteps,
    aggregatedPosteriorInitialCounts,
    updatedInitialDistribution: updatedInitial,
    transitionRows,
    observationKernelRows: observationRows,
    currentTotalLogLikelihood,
    updatedTotalLogLikelihood,
    likelihoodDelta,
    diagnostics: diagnostics(request.evidenceRecords.length, resolved, currentUnderflowed, updatedUnderflowed, true)
  };
}

function assertFiniteDeep(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite number at ${path}`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteDeep(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) assertFiniteDeep(entry, `${path}.${key}`);
}

export function finiteHiddenStateObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResultToJson(
  result: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationResult
): string {
  assertFiniteDeep(result, 'result');
  return JSON.stringify(result);
}
