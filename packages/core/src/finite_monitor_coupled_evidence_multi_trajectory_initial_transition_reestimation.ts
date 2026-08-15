import {
  DefinitionModel,
  ProbabilitySpec,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
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

export type FiniteMonitorCoupledEvidenceReestimationRecord = {
  recordId?: string;
  horizon: number;
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  monitorCoupledTransitionEvidenceLikelihoodsByStep: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
  targetMonitorStates?: string[];
};

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest = {
  initialDistribution: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest['initialDistribution'];
  evidenceRecords: FiniteMonitorCoupledEvidenceReestimationRecord[];
  probabilityTolerance?: number;
  countTolerance?: number;
  likelihoodTolerance?: number;
  maxEvidenceRecords?: number;
  maxObservations?: number;
  maxMonitorStates?: number;
  maxAugmentedStates?: number;
  maxMonitorCoupledEvidenceEntries?: number;
};

export type FiniteMonitorCoupledEvidenceStateProbability = {
  stateId: StateId;
  probability: number;
};

export type FiniteMonitorCoupledEvidenceStateExpectedCount = {
  stateId: StateId;
  expectedCount: number;
};

export type FiniteMonitorCoupledEvidenceTransitionProbability = {
  toStateId: StateId;
  probability: number;
};

export type FiniteMonitorCoupledEvidenceTransitionExpectedCount = {
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteMonitorCoupledEvidenceTransitionRowStatus =
  | 'updated_positive_expected_departure'
  | 'retained_zero_expected_departure'
  | 'structural_terminal_self_retention';

export type FiniteMonitorCoupledEvidenceTransitionRow = {
  stateId: StateId;
  terminal: boolean;
  expectedDepartureMass: number;
  expectedCounts: FiniteMonitorCoupledEvidenceTransitionExpectedCount[];
  currentRow: FiniteMonitorCoupledEvidenceTransitionProbability[];
  updatedRow: FiniteMonitorCoupledEvidenceTransitionProbability[];
  status: FiniteMonitorCoupledEvidenceTransitionRowStatus;
  uniqueByExpectedCounts: boolean;
};

export type FiniteMonitorCoupledEvidenceRecordEStep = {
  recordIndex: number;
  recordId?: string;
  possible: boolean;
  targetMonitorStates: string[];
  eventProbability: number | null;
  logEventProbability: number | null;
  eventProbabilityUnderflowed: boolean;
  posteriorInitialStateProbabilities: FiniteMonitorCoupledEvidenceStateProbability[] | null;
  expectedTransitionCounts: Array<{
    fromStateId: StateId;
    toStateId: StateId;
    expectedCount: number;
  }> | null;
};

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationDiagnostics = {
  method: 'one_step_joint_initial_transition_m_step_from_common_current_model_monitor_coupled_evidence_e_steps';
  numericRepresentation: 'javascript_number_float64_with_candidate_ae_log_event_mass';
  simulationUsed: false;
  approximationUsed: false;
  multipleIndependentTrajectoriesUsed: true;
  evidenceRecordCount: number;
  allRecordEStepsUseSameCurrentModel: true;
  allRecordEStepsFrozenBeforeMstep: true;
  sequentialRecordUpdatesUsed: false;
  trajectoryConcatenationUsed: false;
  sufficientStatisticsAggregatedBeforeMstep: true;
  jointSimultaneousApplication: true;
  initialDistributionUpdated: boolean;
  transitionModelUpdated: boolean;
  observationKernelUpdated: false;
  calibratedEvidenceKernelUpdated: false;
  monitorTransitionUpdated: false;
  transitionTopologyChanged: false;
  terminalRowsLearned: false;
  terminalImplicitSelfRetentionExcludedFromLearnedCounts: true;
  zeroDepartureRowsRetainCurrentRow: true;
  iterativeBaumWelchUsed: false;
  hardEmUsed: false;
  mapOrKBestSubstitutionUsed: false;
  weightedRecordsUsed: false;
  onlineOrStreamingEmUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  maxEvidenceRecords: number;
  anyCurrentEventProbabilityUnderflowed: boolean;
  anyUpdatedEventProbabilityUnderflowed: boolean;
};

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailureCode =
  | 'empty_evidence_record_collection'
  | 'invalid_record_identifier'
  | 'duplicate_record_identifier'
  | 'invalid_reestimation_tolerance'
  | 'candidate_ae_record_failure'
  | 'common_e_step_inconsistency'
  | 'aggregate_sufficient_statistics_inconsistency'
  | 'expected_count_topology_inconsistency'
  | 'updated_initial_distribution_mass_violation'
  | 'updated_transition_row_mass_violation'
  | 'updated_event_became_impossible'
  | 'likelihood_monotonicity_violation'
  | 'candidate_ah_resource_limit_exceeded'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure = {
  ok: false;
  failure: {
    code: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailureCode;
    message: string;
    recordIndex?: number;
    recordId?: string;
    stateId?: StateId;
    toStateId?: StateId;
    actual?: number;
    expected?: number;
    tolerance?: number;
    sourceFailureCode?: string;
  };
};

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationSuccess = {
  ok: true;
  possible: boolean;
  evidenceRecordCount: number;
  impossibleRecordIndex: number | null;
  impossibleRecordId: string | null;
  currentInitialDistribution: FiniteMonitorCoupledEvidenceStateProbability[];
  recordESteps: FiniteMonitorCoupledEvidenceRecordEStep[];
  aggregatedPosteriorInitialCounts: FiniteMonitorCoupledEvidenceStateExpectedCount[] | null;
  updatedInitialDistribution: FiniteMonitorCoupledEvidenceStateProbability[] | null;
  transitionRows: FiniteMonitorCoupledEvidenceTransitionRow[] | null;
  currentTotalLogLikelihood: number | null;
  updatedTotalLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationDiagnostics;
};

export type FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResult =
  | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationSuccess
  | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure;

type AggregateTransitionRow = Map<StateId, number>;

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
  code: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailureCode,
  message: string,
  details: Omit<FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure['failure'], 'code' | 'message'> = {}
): FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'probabilityTolerance' | 'countTolerance' | 'likelihoodTolerance'
): number | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, { actual: resolved });
  }
  return resolved;
}

function resolveRequest(
  request: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest
): ResolvedTolerances | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure {
  const probabilityTolerance = resolvePositiveFinite(request.probabilityTolerance, DEFAULT_PROBABILITY_TOLERANCE, 'probabilityTolerance');
  if (typeof probabilityTolerance !== 'number') return probabilityTolerance;
  const countTolerance = resolvePositiveFinite(request.countTolerance, DEFAULT_COUNT_TOLERANCE, 'countTolerance');
  if (typeof countTolerance !== 'number') return countTolerance;
  const likelihoodTolerance = resolvePositiveFinite(request.likelihoodTolerance, DEFAULT_LIKELIHOOD_TOLERANCE, 'likelihoodTolerance');
  if (typeof likelihoodTolerance !== 'number') return likelihoodTolerance;
  const maxEvidenceRecords = request.maxEvidenceRecords ?? DEFAULT_MAX_EVIDENCE_RECORDS;
  if (!Number.isSafeInteger(maxEvidenceRecords) || maxEvidenceRecords <= 0) {
    return failure('candidate_ah_resource_limit_exceeded', 'maxEvidenceRecords must be a positive safe integer', { actual: maxEvidenceRecords });
  }
  return { probabilityTolerance, countTolerance, likelihoodTolerance, maxEvidenceRecords };
}

function validateRecordIdentifiers(
  records: FiniteMonitorCoupledEvidenceReestimationRecord[]
): FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure | null {
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
  request: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest,
  stateIds: StateId[]
): FiniteMonitorCoupledEvidenceStateProbability[] {
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

function transitionRowEntries(row: AggregateTransitionRow): FiniteMonitorCoupledEvidenceTransitionProbability[] {
  return [...row.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([toStateId, probability]) => ({ toStateId, probability }));
}

function candidateAeOptions(
  request: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest,
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

function candidateAeRequest(
  initialDistribution: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest['initialDistribution'],
  record: FiniteMonitorCoupledEvidenceReestimationRecord
) {
  return {
    initialDistribution: initialDistribution.map((entry) => ({ ...entry })),
    horizon: record.horizon,
    monitorStates: [...record.monitorStates],
    initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState.map((entry) => ({ ...entry })),
    monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => layer.map((entry) => ({ ...entry }))),
    initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ ...entry })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) =>
      layer.map((entry) => ({ ...entry }))
    ),
    targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)]
  };
}

function checkedPosteriorInitial(
  stateIds: StateId[],
  distribution: Array<{ stateId: StateId; probability: number }>,
  tolerance: number,
  recordIndex: number,
  recordId: string | undefined
): Map<StateId, number> | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure {
  const map = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  for (const entry of distribution) {
    if (!map.has(entry.stateId) || !Number.isFinite(entry.probability) || entry.probability < 0) {
      return failure('common_e_step_inconsistency', 'Candidate AE posterior initial distribution contained an invalid state probability', {
        recordIndex,
        ...(recordId === undefined ? {} : { recordId }),
        stateId: entry.stateId,
        actual: entry.probability
      });
    }
    map.set(entry.stateId, (map.get(entry.stateId) ?? 0) + entry.probability);
  }
  const total = [...map.values()].reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure('common_e_step_inconsistency', 'Candidate AE posterior initial distribution did not sum to one', {
      recordIndex,
      ...(recordId === undefined ? {} : { recordId }),
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
): DefinitionModel | FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationFailure {
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
      return failure('internal_reestimation_inconsistency', 'Missing aggregate transition row while applying Candidate AH update', {
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

function diagnostics(
  recordCount: number,
  resolved: ResolvedTolerances,
  currentUnderflowed: boolean,
  updatedUnderflowed: boolean,
  updated: boolean
): FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationDiagnostics {
  return {
    method: 'one_step_joint_initial_transition_m_step_from_common_current_model_monitor_coupled_evidence_e_steps',
    numericRepresentation: 'javascript_number_float64_with_candidate_ae_log_event_mass',
    simulationUsed: false,
    approximationUsed: false,
    multipleIndependentTrajectoriesUsed: true,
    evidenceRecordCount: recordCount,
    allRecordEStepsUseSameCurrentModel: true,
    allRecordEStepsFrozenBeforeMstep: true,
    sequentialRecordUpdatesUsed: false,
    trajectoryConcatenationUsed: false,
    sufficientStatisticsAggregatedBeforeMstep: true,
    jointSimultaneousApplication: true,
    initialDistributionUpdated: updated,
    transitionModelUpdated: updated,
    observationKernelUpdated: false,
    calibratedEvidenceKernelUpdated: false,
    monitorTransitionUpdated: false,
    transitionTopologyChanged: false,
    terminalRowsLearned: false,
    terminalImplicitSelfRetentionExcludedFromLearnedCounts: true,
    zeroDepartureRowsRetainCurrentRow: true,
    iterativeBaumWelchUsed: false,
    hardEmUsed: false,
    mapOrKBestSubstitutionUsed: false,
    weightedRecordsUsed: false,
    onlineOrStreamingEmUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance: resolved.probabilityTolerance,
    countTolerance: resolved.countTolerance,
    likelihoodTolerance: resolved.likelihoodTolerance,
    maxEvidenceRecords: resolved.maxEvidenceRecords,
    anyCurrentEventProbabilityUnderflowed: currentUnderflowed,
    anyUpdatedEventProbabilityUnderflowed: updatedUnderflowed
  };
}

export function reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(
  model: DefinitionModel,
  request: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationRequest
): FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResult {
  if (!Array.isArray(request.evidenceRecords) || request.evidenceRecords.length === 0) {
    return failure('empty_evidence_record_collection', 'Candidate AH requires at least one independent evidence record');
  }
  const resolved = resolveRequest(request);
  if ('failure' in resolved) return resolved;
  if (request.evidenceRecords.length > resolved.maxEvidenceRecords) {
    return failure('candidate_ah_resource_limit_exceeded', 'Candidate AH evidence record count exceeds maxEvidenceRecords', {
      actual: request.evidenceRecords.length,
      expected: resolved.maxEvidenceRecords
    });
  }
  const identifierFailure = validateRecordIdentifiers(request.evidenceRecords);
  if (identifierFailure !== null) return identifierFailure;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminalStates = new Set(model.states.filter((state) => isTerminalState(state)).map((state) => state.id));
  const currentInitial = currentInitialDistribution(request, stateIds);
  const currentRows = aggregateCurrentRows(model, stateIds);
  const initialCounts = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  const transitionCounts = new Map<string, number>();
  const recordESteps: FiniteMonitorCoupledEvidenceRecordEStep[] = [];
  let currentTotalLogLikelihood = 0;
  let currentUnderflowed = false;
  let impossibleRecordIndex: number | null = null;
  let impossibleRecordId: string | null = null;
  const aeOptions = candidateAeOptions(request, resolved.probabilityTolerance);

  for (let recordIndex = 0; recordIndex < request.evidenceRecords.length; recordIndex += 1) {
    const record = request.evidenceRecords[recordIndex];
    if (record === undefined) {
      return failure('internal_reestimation_inconsistency', 'Candidate AH evidence record disappeared during iteration', { recordIndex });
    }
    const ae = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      model,
      candidateAeRequest(request.initialDistribution, record),
      aeOptions
    );
    if (!ae.ok) {
      return failure('candidate_ae_record_failure', 'Candidate AE rejected a Candidate AH evidence record', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: ae.failure.code
      });
    }
    const possible = ae.possible;
    const logEventProbability = ae.logJointEventProbability;
    const eventProbability = ae.jointEventProbability;
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
        targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)],
        eventProbability,
        logEventProbability,
        eventProbabilityUnderflowed: false,
        posteriorInitialStateProbabilities: null,
        expectedTransitionCounts: null
      });
      continue;
    }

    if (logEventProbability === null || !Number.isFinite(logEventProbability) || ae.smoothingSteps === null || ae.expectedTransitionCounts === null) {
      return failure('common_e_step_inconsistency', 'Candidate AE omitted finite posterior statistics for a mathematically possible record', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    currentTotalLogLikelihood += logEventProbability;
    const initialDistribution = ae.smoothingSteps[0]?.hiddenStateDistribution;
    if (initialDistribution === undefined) {
      return failure('common_e_step_inconsistency', 'Candidate AE omitted the step-zero smoothed hidden-state distribution', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    const checkedInitial = checkedPosteriorInitial(
      stateIds,
      initialDistribution,
      resolved.probabilityTolerance * 20,
      recordIndex,
      record.recordId
    );
    if ('failure' in checkedInitial) return checkedInitial;
    for (const stateId of stateIds) initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (checkedInitial.get(stateId) ?? 0));

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
          return failure('expected_count_topology_inconsistency', 'Candidate AE produced positive expected count outside the fixed transition topology', {
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
      targetMonitorStates: [...(record.targetMonitorStates ?? record.monitorStates)],
      eventProbability,
      logEventProbability,
      eventProbabilityUnderflowed: underflowed,
      posteriorInitialStateProbabilities: stateIds.map((stateId) => ({ stateId, probability: checkedInitial.get(stateId) ?? 0 })),
      expectedTransitionCounts: ae.expectedTransitionCounts.map((entry) => ({ ...entry }))
    });
  }

  if (impossibleRecordIndex !== null) {
    return {
      ok: true,
      possible: false,
      evidenceRecordCount: request.evidenceRecords.length,
      impossibleRecordIndex,
      impossibleRecordId,
      currentInitialDistribution: currentInitial,
      recordESteps,
      aggregatedPosteriorInitialCounts: null,
      updatedInitialDistribution: null,
      transitionRows: null,
      currentTotalLogLikelihood: null,
      updatedTotalLogLikelihood: null,
      likelihoodDelta: null,
      diagnostics: diagnostics(request.evidenceRecords.length, resolved, currentUnderflowed, false, false)
    };
  }

  if (!Number.isFinite(currentTotalLogLikelihood)) {
    return failure('non_finite_reestimation_result', 'Current total event log likelihood became non-finite', { actual: currentTotalLogLikelihood });
  }

  const initialCountTotal = [...initialCounts.values()].reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(initialCountTotal) || Math.abs(initialCountTotal - request.evidenceRecords.length) > resolved.probabilityTolerance * 20 * request.evidenceRecords.length) {
    return failure('aggregate_sufficient_statistics_inconsistency', 'Aggregated posterior initial counts do not sum to the evidence record count', {
      actual: initialCountTotal,
      expected: request.evidenceRecords.length,
      tolerance: resolved.probabilityTolerance * 20 * request.evidenceRecords.length
    });
  }

  const aggregatedPosteriorInitialCounts = stateIds.map((stateId) => ({ stateId, expectedCount: initialCounts.get(stateId) ?? 0 }));
  const updatedInitialDistribution = stateIds.map((stateId) => ({
    stateId,
    probability: (initialCounts.get(stateId) ?? 0) / request.evidenceRecords.length
  }));
  const updatedInitialTotal = updatedInitialDistribution.reduce((sum, entry) => sum + entry.probability, 0);
  if (!Number.isFinite(updatedInitialTotal) || Math.abs(updatedInitialTotal - 1) > resolved.probabilityTolerance * 20) {
    return failure('updated_initial_distribution_mass_violation', 'Updated initial distribution does not sum to one', {
      actual: updatedInitialTotal,
      expected: 1,
      tolerance: resolved.probabilityTolerance * 20
    });
  }

  const updatedRows = new Map<StateId, AggregateTransitionRow>();
  const transitionRows: FiniteMonitorCoupledEvidenceTransitionRow[] = [];
  for (const stateId of stateIds) {
    const currentRow = currentRows.get(stateId);
    if (currentRow === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing current transition row', { stateId });
    }
    if (terminalStates.has(stateId)) {
      const row = new Map([[stateId, 1]] as const);
      updatedRows.set(stateId, row);
      transitionRows.push({
        stateId,
        terminal: true,
        expectedDepartureMass: 0,
        expectedCounts: [{ toStateId: stateId, expectedCount: 0 }],
        currentRow: [{ toStateId: stateId, probability: 1 }],
        updatedRow: [{ toStateId: stateId, probability: 1 }],
        status: 'structural_terminal_self_retention',
        uniqueByExpectedCounts: true
      });
      continue;
    }
    const destinations = [...currentRow.keys()].sort(compareStrings);
    const expectedCounts = destinations.map((toStateId) => ({
      toStateId,
      expectedCount: transitionCounts.get(countKey(stateId, toStateId)) ?? 0
    }));
    const expectedDepartureMass = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (!Number.isFinite(expectedDepartureMass) || expectedDepartureMass < -resolved.countTolerance) {
      return failure('aggregate_sufficient_statistics_inconsistency', 'Aggregated expected departure mass became invalid', {
        stateId,
        actual: expectedDepartureMass
      });
    }
    let updatedRow: AggregateTransitionRow;
    let status: FiniteMonitorCoupledEvidenceTransitionRowStatus;
    if (expectedDepartureMass > resolved.countTolerance) {
      updatedRow = new Map(expectedCounts.map((entry) => [entry.toStateId, entry.expectedCount / expectedDepartureMass] as const));
      status = 'updated_positive_expected_departure';
    } else {
      updatedRow = new Map(currentRow);
      status = 'retained_zero_expected_departure';
    }
    const total = [...updatedRow.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > resolved.probabilityTolerance * 20) {
      return failure('updated_transition_row_mass_violation', 'Updated transition row does not sum to one', {
        stateId,
        actual: total,
        expected: 1,
        tolerance: resolved.probabilityTolerance * 20
      });
    }
    updatedRows.set(stateId, updatedRow);
    transitionRows.push({
      stateId,
      terminal: false,
      expectedDepartureMass,
      expectedCounts,
      currentRow: transitionRowEntries(currentRow),
      updatedRow: transitionRowEntries(updatedRow),
      status,
      uniqueByExpectedCounts: expectedDepartureMass > resolved.countTolerance
    });
  }

  const updatedModel = buildUpdatedModel(model, updatedRows, currentRows);
  if ('failure' in updatedModel) return updatedModel;

  let updatedTotalLogLikelihood = 0;
  let updatedUnderflowed = false;
  for (let recordIndex = 0; recordIndex < request.evidenceRecords.length; recordIndex += 1) {
    const record = request.evidenceRecords[recordIndex];
    if (record === undefined) return failure('internal_reestimation_inconsistency', 'Candidate AH evidence record disappeared during updated likelihood evaluation', { recordIndex });
    const updatedAe = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      updatedModel,
      candidateAeRequest(updatedInitialDistribution, record),
      aeOptions
    );
    if (!updatedAe.ok) {
      return failure('candidate_ae_record_failure', 'Candidate AE rejected a record during updated-likelihood recomputation', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId }),
        sourceFailureCode: updatedAe.failure.code
      });
    }
    if (!updatedAe.possible || updatedAe.logJointEventProbability === null || !Number.isFinite(updatedAe.logJointEventProbability)) {
      return failure('updated_event_became_impossible', 'A record that was possible under the current model became impossible after the simultaneous M-step', {
        recordIndex,
        ...(record.recordId === undefined ? {} : { recordId: record.recordId })
      });
    }
    updatedTotalLogLikelihood += updatedAe.logJointEventProbability;
    updatedUnderflowed ||= updatedAe.jointEventProbability === null;
  }

  if (!Number.isFinite(updatedTotalLogLikelihood)) {
    return failure('non_finite_reestimation_result', 'Updated total event log likelihood became non-finite', { actual: updatedTotalLogLikelihood });
  }
  const likelihoodDelta = updatedTotalLogLikelihood - currentTotalLogLikelihood;
  if (likelihoodDelta < -resolved.likelihoodTolerance) {
    return failure('likelihood_monotonicity_violation', 'Candidate AH simultaneous one-step update decreased total event log likelihood beyond tolerance', {
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
    currentInitialDistribution: currentInitial,
    recordESteps,
    aggregatedPosteriorInitialCounts,
    updatedInitialDistribution,
    transitionRows,
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

export function finiteHiddenStateMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResultToJson(
  result: FiniteMonitorCoupledEvidenceMultiTrajectoryInitialTransitionReestimationResult
): string {
  assertFiniteDeep(result, 'result');
  return JSON.stringify(result);
}
