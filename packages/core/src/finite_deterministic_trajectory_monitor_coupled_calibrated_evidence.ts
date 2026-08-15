import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import { CalibratedEvidenceLikelihoodEntry } from './hidden_state_calibrated_evidence_likelihood_conditioning';
import {
  DeterministicTrajectoryMonitorConditionedExpectedTransitionCount,
  DeterministicTrajectoryMonitorConditionedJointAtom,
  DeterministicTrajectoryMonitorConditionedPairwiseStep,
  DeterministicTrajectoryMonitorConditionedSmoothingStep,
  DeterministicTrajectoryMonitorInitialEntry,
  DeterministicTrajectoryMonitorJointFinalAtom,
  DeterministicTrajectoryMonitorJointHiddenMonitorAtom,
  DeterministicTrajectoryMonitorStateAtom,
  DeterministicTrajectoryMonitorTransitionEntry
} from './finite_deterministic_trajectory_monitor_calibrated_evidence';
import {
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceOptions,
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence
} from './finite_deterministic_trajectory_monitor_transition_calibrated_evidence';

export type MonitorCoupledCalibratedEvidenceLikelihoodEntry = {
  monitorStateId: string;
  fromStateId: StateId;
  toStateId: StateId;
  likelihood: number;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
  initialDistribution: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest['initialDistribution'];
  horizon: number;
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  monitorCoupledTransitionEvidenceLikelihoodsByStep: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest & {
    targetMonitorStates: string[];
  };

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions =
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceOptions & {
    maxMonitorCoupledEvidenceEntries?: number;
  };

export type DeterministicTrajectoryMonitorCoupledEvidencePrefixStep = {
  step: number;
  prefixEvidenceProbability: number | null;
  prefixLogEvidenceProbability: number | null;
  prefixEvidenceProbabilityUnderflowed: boolean;
  jointHiddenMonitorDistribution: DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] | null;
  monitorDistribution: DeterministicTrajectoryMonitorStateAtom[] | null;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceDiagnostics = {
  method: 'sparse_log_augmented_hidden_monitor_coupled_calibrated_evidence_dynamic_programming';
  numericRepresentation: 'javascript_number_float64_with_log_mass';
  simulationUsed: false;
  approximationUsed: false;
  monitorDeterministic: true;
  monitorStateDomain: 'finite_unique_string_identifiers';
  evidenceSemantics: 'absolute_calibrated_initial_state_and_monitor_coupled_adjacent_hidden_pair_likelihood';
  evidenceFactorization: 'initial_state_local_then_monitor_coupled_adjacent_hidden_pair_local_by_time';
  earlierHistoryVisibleOnlyThroughFiniteMonitor: true;
  absoluteEvidenceScalePreserved: true;
  inputNormalizationApplied: false;
  terminalSemantics: 'implicit_self_retention_with_monitor_coupled_pair_evidence_and_monitor_update';
  parallelTransitionSemantics: 'evidence_and_monitor_observe_hidden_state_pair_not_parallel_edge_identity';
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  maxMonitorStates: number;
  maxAugmentedStates: number;
  maxMonitorCoupledEvidenceEntries: number;
  evidenceStepsRequested: number;
  evidenceStepsProcessed: number;
  monitorCoupledEvidenceStepsRequested: number;
  impossibleAtStep: number | null;
  evidenceProbabilityUnderflowed: boolean;
  candidateADCommonValidationReused: true;
  existingQualifiedRequestTypesModified: false;
  parameterLearningUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  causalInterventionUsed: false;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningDiagnostics =
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceDiagnostics & {
    conditioningMethod: 'exact_terminal_monitor_set_monitor_coupled_calibrated_log_forward_backward';
    jointEventProbabilityUnderflowed: boolean;
    evidenceOnlyPossible: boolean;
    monitorEventOnlyPossible: boolean;
  };

export type DeterministicTrajectoryMonitorCoupledEvidenceFailureCode =
  | 'invalid_candidate_ae_request'
  | 'missing_initial_monitor_coupled_calibrated_evidence_state'
  | 'unknown_initial_monitor_coupled_calibrated_evidence_state'
  | 'duplicate_initial_monitor_coupled_calibrated_evidence_state'
  | 'invalid_initial_monitor_coupled_calibrated_evidence_likelihood'
  | 'monitor_coupled_calibrated_evidence_horizon_mismatch'
  | 'invalid_monitor_coupled_calibrated_evidence_layer'
  | 'missing_monitor_coupled_calibrated_evidence_entry'
  | 'unknown_monitor_coupled_calibrated_evidence_monitor_state'
  | 'unknown_monitor_coupled_calibrated_evidence_source_state'
  | 'unknown_monitor_coupled_calibrated_evidence_destination_state'
  | 'duplicate_monitor_coupled_calibrated_evidence_entry'
  | 'invalid_monitor_coupled_calibrated_evidence_likelihood'
  | 'invalid_candidate_ae_monitor_definition'
  | 'candidate_ae_resource_limit_exceeded'
  | 'candidate_ae_smoothing_mass_conservation_violation'
  | 'candidate_ae_pairwise_mass_conservation_violation'
  | 'candidate_ae_pairwise_marginal_consistency_violation'
  | 'candidate_ae_expected_transition_count_conservation_violation'
  | 'internal_candidate_ae_structural_inconsistency'
  | 'non_finite_candidate_ae_result';

export type DeterministicTrajectoryMonitorCoupledEvidenceFailure = {
  code: DeterministicTrajectoryMonitorCoupledEvidenceFailureCode;
  message: string;
  path?: string | undefined;
  step?: number | undefined;
  stateId?: StateId | undefined;
  fromStateId?: StateId | undefined;
  toStateId?: StateId | undefined;
  monitorStateId?: string | undefined;
  nextMonitorStateId?: string | undefined;
  actual?: number | undefined;
  expected?: number | undefined;
  tolerance?: number | undefined;
  sourceFailureCode?: string | undefined;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure = {
  ok: false;
  failure: DeterministicTrajectoryMonitorCoupledEvidenceFailure;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceSuccess = {
  ok: true;
  possible: boolean;
  horizon: number;
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  monitorCoupledTransitionEvidenceLikelihoodsByStep: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
  trajectory: DeterministicTrajectoryMonitorCoupledEvidencePrefixStep[];
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  finalEvidenceConditionedMonitorDistribution: DeterministicTrajectoryMonitorStateAtom[] | null;
  jointEvidenceMonitorDistribution: DeterministicTrajectoryMonitorJointFinalAtom[] | null;
  diagnostics: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceDiagnostics;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResult =
  | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceSuccess
  | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure;

export type DeterministicTrajectoryMonitorCoupledEvidenceImpossibility =
  | 'evidence'
  | 'monitor_event'
  | 'joint'
  | null;

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningSuccess = {
  ok: true;
  possible: boolean;
  evidencePossible: boolean;
  monitorEventPossible: boolean;
  jointPossible: boolean;
  impossibility: DeterministicTrajectoryMonitorCoupledEvidenceImpossibility;
  horizon: number;
  targetMonitorStates: string[];
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  unconditionalTargetProbability: number | null;
  unconditionalTargetLogProbability: number | null;
  jointEventProbability: number | null;
  logJointEventProbability: number | null;
  targetConditionalProbabilityGivenEvidence: number | null;
  logTargetConditionalProbabilityGivenEvidence: number | null;
  smoothingSteps: DeterministicTrajectoryMonitorConditionedSmoothingStep[] | null;
  pairwiseSteps: DeterministicTrajectoryMonitorConditionedPairwiseStep[] | null;
  expectedTransitionCounts: DeterministicTrajectoryMonitorConditionedExpectedTransitionCount[] | null;
  diagnostics: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningDiagnostics;
};

export type FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResult =
  | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningSuccess
  | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure;

type EffectiveEdge = { from: StateId; to: StateId; probability: number };
type AugmentedLogState = Map<StateId, Map<string, number>>;

type ResolvedOptions = {
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  maxMonitorStates: number;
  maxAugmentedStates: number;
  maxMonitorCoupledEvidenceEntries: number;
};

type Prepared = {
  stateIds: StateId[];
  monitorStates: string[];
  effectiveEdgesByState: Map<StateId, EffectiveEdge[]>;
  effectivePairs: EffectiveEdge[];
  initialDistribution: Map<StateId, number>;
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  initialMonitorMap: Map<StateId, string>;
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  monitorTransitionMaps: Array<Map<string, string>>;
  initialEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  initialEvidenceMap: Map<StateId, number>;
  monitorCoupledTransitionEvidenceLikelihoodsByStep: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
  monitorCoupledEvidenceMaps: Array<Map<string, number>>;
  resolved: ResolvedOptions;
};

type ForwardInternal = {
  alphas: AugmentedLogState[];
  trajectory: DeterministicTrajectoryMonitorCoupledEvidencePrefixStep[];
  evidenceLogProbability: number | null;
  impossibleAtStep: number | null;
};

const DEFAULT_MAX_MONITOR_COUPLED_EVIDENCE_ENTRIES = 2_000_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function monitorTransitionKey(
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  return `${monitorStateId}\u0000${fromStateId}\u0000${toStateId}`;
}

function failure(
  code: DeterministicTrajectoryMonitorCoupledEvidenceFailureCode,
  message: string,
  details: Omit<DeterministicTrajectoryMonitorCoupledEvidenceFailure, 'code' | 'message'> = {}
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function mapAdFailure(source: { failure: { code: string; message: string } }): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  const sourceFailureCode = source.failure.code;
  if (sourceFailureCode === 'missing_initial_transition_calibrated_evidence_state') {
    return failure('missing_initial_monitor_coupled_calibrated_evidence_state', source.failure.message, { sourceFailureCode });
  }
  if (sourceFailureCode === 'unknown_initial_transition_calibrated_evidence_state') {
    return failure('unknown_initial_monitor_coupled_calibrated_evidence_state', source.failure.message, { sourceFailureCode });
  }
  if (sourceFailureCode === 'duplicate_initial_transition_calibrated_evidence_state') {
    return failure('duplicate_initial_monitor_coupled_calibrated_evidence_state', source.failure.message, { sourceFailureCode });
  }
  if (sourceFailureCode === 'invalid_initial_transition_calibrated_evidence_likelihood') {
    return failure('invalid_initial_monitor_coupled_calibrated_evidence_likelihood', source.failure.message, { sourceFailureCode });
  }
  if (sourceFailureCode === 'invalid_candidate_ad_monitor_definition') {
    return failure('invalid_candidate_ae_monitor_definition', source.failure.message, { sourceFailureCode });
  }
  if (sourceFailureCode === 'candidate_ad_resource_limit_exceeded') {
    return failure('candidate_ae_resource_limit_exceeded', source.failure.message, { sourceFailureCode });
  }
  return failure('invalid_candidate_ae_request', source.failure.message, { sourceFailureCode });
}

function logAddExp(left: number, right: number): number {
  if (left === Number.NEGATIVE_INFINITY) return right;
  if (right === Number.NEGATIVE_INFINITY) return left;
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return high + Math.log1p(Math.exp(low - high));
}

function logSum(values: Iterable<number>): number {
  let total = Number.NEGATIVE_INFINITY;
  for (const value of values) total = logAddExp(total, value);
  return total;
}

function directProbability(logProbability: number): number | null {
  const direct = Math.exp(logProbability);
  return direct === 0 ? null : direct;
}

function probabilityView(logProbability: number): {
  probability: number | null;
  logProbability: number;
  probabilityUnderflowed: boolean;
} {
  const probability = directProbability(logProbability);
  return { probability, logProbability, probabilityUnderflowed: probability === null };
}

function buildEffectiveEdges(model: DefinitionModel): {
  byState: Map<StateId, EffectiveEdge[]>;
  pairs: EffectiveEdge[];
} {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminal = new Set(
    model.states.filter((state) => isTerminalState(state)).map((state) => state.id)
  );
  const byState = new Map<StateId, EffectiveEdge[]>();
  const pairs = new Map<string, EffectiveEdge>();
  for (const stateId of stateIds) {
    if (terminal.has(stateId)) {
      const edge = { from: stateId, to: stateId, probability: 1 };
      byState.set(stateId, [edge]);
      pairs.set(pairKey(stateId, stateId), edge);
      continue;
    }
    const aggregate = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      if (probability <= 0) continue;
      aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
    }
    const edges = [...aggregate.entries()]
      .map(([to, probability]) => ({ from: stateId, to, probability }))
      .sort((left, right) => compareStrings(left.to, right.to));
    byState.set(stateId, edges);
    for (const edge of edges) pairs.set(pairKey(edge.from, edge.to), edge);
  }
  return {
    byState,
    pairs: [...pairs.values()].sort((left, right) => {
      const sourceOrder = compareStrings(left.from, right.from);
      return sourceOrder !== 0 ? sourceOrder : compareStrings(left.to, right.to);
    })
  };
}

function canonicalizeCoupledEvidence(
  rows: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][],
  horizon: number,
  stateIds: StateId[],
  monitorStates: string[]
): {
  ok: true;
  rows: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][];
  maps: Array<Map<string, number>>;
} | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  if (!Array.isArray(rows) || rows.length !== horizon) {
    return failure(
      'monitor_coupled_calibrated_evidence_horizon_mismatch',
      `monitorCoupledTransitionEvidenceLikelihoodsByStep must contain exactly horizon=${horizon} layers`,
      {
        path: 'request.monitorCoupledTransitionEvidenceLikelihoodsByStep',
        actual: Array.isArray(rows) ? rows.length : -1,
        expected: horizon
      }
    );
  }
  const knownHidden = new Set(stateIds);
  const knownMonitor = new Set(monitorStates);
  const canonicalRows: MonitorCoupledCalibratedEvidenceLikelihoodEntry[][] = [];
  const maps: Array<Map<string, number>> = [];

  for (let step = 0; step < horizon; step += 1) {
    const row = rows[step];
    if (!Array.isArray(row)) {
      return failure(
        'invalid_monitor_coupled_calibrated_evidence_layer',
        `monitorCoupledTransitionEvidenceLikelihoodsByStep[${step}] must be an array`,
        { step: step + 1 }
      );
    }
    const map = new Map<string, number>();
    for (const entry of row) {
      if (
        entry === undefined ||
        typeof entry.monitorStateId !== 'string' ||
        typeof entry.fromStateId !== 'string' ||
        typeof entry.toStateId !== 'string'
      ) {
        return failure(
          'invalid_monitor_coupled_calibrated_evidence_layer',
          `Invalid monitor-coupled evidence entry at step ${step + 1}`,
          { step: step + 1 }
        );
      }
      if (!knownMonitor.has(entry.monitorStateId)) {
        return failure(
          'unknown_monitor_coupled_calibrated_evidence_monitor_state',
          `Unknown monitor-coupled evidence monitor state: ${entry.monitorStateId}`,
          { step: step + 1, monitorStateId: entry.monitorStateId }
        );
      }
      if (!knownHidden.has(entry.fromStateId)) {
        return failure(
          'unknown_monitor_coupled_calibrated_evidence_source_state',
          `Unknown monitor-coupled evidence source state: ${entry.fromStateId}`,
          { step: step + 1, fromStateId: entry.fromStateId }
        );
      }
      if (!knownHidden.has(entry.toStateId)) {
        return failure(
          'unknown_monitor_coupled_calibrated_evidence_destination_state',
          `Unknown monitor-coupled evidence destination state: ${entry.toStateId}`,
          { step: step + 1, toStateId: entry.toStateId }
        );
      }
      if (!Number.isFinite(entry.likelihood) || entry.likelihood < 0 || entry.likelihood > 1) {
        return failure(
          'invalid_monitor_coupled_calibrated_evidence_likelihood',
          'Monitor-coupled calibrated evidence likelihood must be finite and in [0,1]',
          {
            step: step + 1,
            monitorStateId: entry.monitorStateId,
            fromStateId: entry.fromStateId,
            toStateId: entry.toStateId,
            actual: entry.likelihood
          }
        );
      }
      const key = monitorTransitionKey(
        entry.monitorStateId,
        entry.fromStateId,
        entry.toStateId
      );
      if (map.has(key)) {
        return failure(
          'duplicate_monitor_coupled_calibrated_evidence_entry',
          'Duplicate monitor-coupled calibrated evidence entry',
          {
            step: step + 1,
            monitorStateId: entry.monitorStateId,
            fromStateId: entry.fromStateId,
            toStateId: entry.toStateId
          }
        );
      }
      map.set(key, entry.likelihood);
    }

    for (const monitorStateId of monitorStates) {
      for (const fromStateId of stateIds) {
        for (const toStateId of stateIds) {
          if (!map.has(monitorTransitionKey(monitorStateId, fromStateId, toStateId))) {
            return failure(
              'missing_monitor_coupled_calibrated_evidence_entry',
              'Missing monitor-coupled calibrated evidence entry',
              { step: step + 1, monitorStateId, fromStateId, toStateId }
            );
          }
        }
      }
    }

    canonicalRows.push(
      monitorStates.flatMap((monitorStateId) =>
        stateIds.flatMap((fromStateId) =>
          stateIds.map((toStateId) => ({
            monitorStateId,
            fromStateId,
            toStateId,
            likelihood: map.get(
              monitorTransitionKey(monitorStateId, fromStateId, toStateId)
            )!
          }))
        )
      )
    );
    maps.push(map);
  }

  return { ok: true, rows: canonicalRows, maps };
}

function prepare(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  options: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions
): { ok: true; prepared: Prepared } | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  if (request === null || typeof request !== 'object') {
    return failure('invalid_candidate_ae_request', 'request must be an object', { path: 'request' });
  }
  if (!Number.isSafeInteger(request.horizon) || request.horizon < 0) {
    return failure('invalid_candidate_ae_request', 'horizon must be a non-negative safe integer', {
      path: 'request.horizon'
    });
  }
  if (!model || !Array.isArray(model.states)) {
    return failure('invalid_candidate_ae_request', 'model must contain a finite states array', {
      path: 'model.states'
    });
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const dummyTransitionEvidence = Array.from({ length: request.horizon }, () =>
    stateIds.flatMap((fromStateId) =>
      stateIds.map((toStateId) => ({ fromStateId, toStateId, likelihood: 1 }))
    )
  );
  const {
    maxMonitorCoupledEvidenceEntries: _ignoredMaxMonitorCoupledEvidenceEntries,
    ...adOptions
  } = options;
  const common = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(
    model,
    {
      initialDistribution: request.initialDistribution,
      horizon: request.horizon,
      monitorStates: request.monitorStates,
      initialMonitorStateByHiddenState: request.initialMonitorStateByHiddenState,
      monitorTransitionByStep: request.monitorTransitionByStep,
      initialEvidenceLikelihoods: request.initialEvidenceLikelihoods,
      transitionEvidenceLikelihoodsByStep: dummyTransitionEvidence
    },
    adOptions
  );
  if (!common.ok) return mapAdFailure(common);

  const monitorStates = common.monitorStates;
  const maxMonitorCoupledEvidenceEntries =
    options.maxMonitorCoupledEvidenceEntries ??
    DEFAULT_MAX_MONITOR_COUPLED_EVIDENCE_ENTRIES;
  if (
    !Number.isInteger(maxMonitorCoupledEvidenceEntries) ||
    maxMonitorCoupledEvidenceEntries <= 0
  ) {
    return failure(
      'candidate_ae_resource_limit_exceeded',
      'maxMonitorCoupledEvidenceEntries must be a positive integer'
    );
  }
  const requestedCoupledEntries =
    request.horizon * monitorStates.length * stateIds.length * stateIds.length;
  if (requestedCoupledEntries > maxMonitorCoupledEvidenceEntries) {
    return failure(
      'candidate_ae_resource_limit_exceeded',
      'Candidate AE monitor-coupled evidence resource guard exceeded',
      { actual: requestedCoupledEntries, expected: maxMonitorCoupledEvidenceEntries }
    );
  }

  const coupled = canonicalizeCoupledEvidence(
    request.monitorCoupledTransitionEvidenceLikelihoodsByStep,
    request.horizon,
    stateIds,
    monitorStates
  );
  if (!coupled.ok) return coupled;

  const initialDistribution = new Map<StateId, number>(
    stateIds.map((stateId) => [stateId, 0])
  );
  for (const entry of request.initialDistribution) {
    initialDistribution.set(entry.stateId, entry.probability);
  }
  const initialMonitorMap = new Map<StateId, string>(
    common.initialMonitorStateByHiddenState.map((entry) => [
      entry.stateId,
      entry.monitorStateId
    ])
  );
  const monitorTransitionMaps = common.monitorTransitionByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          monitorTransitionKey(
            entry.monitorStateId,
            entry.fromStateId,
            entry.toStateId
          ),
          entry.nextMonitorStateId
        ])
      )
  );
  const initialEvidenceMap = new Map<StateId, number>(
    common.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood])
  );
  const effective = buildEffectiveEdges(model);

  return {
    ok: true,
    prepared: {
      stateIds,
      monitorStates,
      effectiveEdgesByState: effective.byState,
      effectivePairs: effective.pairs,
      initialDistribution,
      initialMonitorStateByHiddenState: common.initialMonitorStateByHiddenState,
      initialMonitorMap,
      monitorTransitionByStep: common.monitorTransitionByStep,
      monitorTransitionMaps,
      initialEvidenceLikelihoods: common.initialEvidenceLikelihoods,
      initialEvidenceMap,
      monitorCoupledTransitionEvidenceLikelihoodsByStep: coupled.rows,
      monitorCoupledEvidenceMaps: coupled.maps,
      resolved: {
        probabilityTolerance: common.diagnostics.probabilityTolerance,
        pairwiseConsistencyTolerance: common.diagnostics.pairwiseConsistencyTolerance,
        expectedCountTolerance: common.diagnostics.expectedCountTolerance,
        maxObservations: common.diagnostics.maxObservations,
        maxMonitorStates: common.diagnostics.maxMonitorStates,
        maxAugmentedStates: common.diagnostics.maxAugmentedStates,
        maxMonitorCoupledEvidenceEntries
      }
    }
  };
}

function emptyAugmented(prepared: Prepared): AugmentedLogState {
  return new Map(
    prepared.stateIds.map((stateId) => [stateId, new Map<string, number>()])
  );
}

function totalLogMass(prepared: Prepared, support: AugmentedLogState): number {
  const values: number[] = [];
  for (const stateId of prepared.stateIds) {
    for (const logMass of support.get(stateId)?.values() ?? []) values.push(logMass);
  }
  return logSum(values);
}

function conditionalJoint(
  prepared: Prepared,
  support: AugmentedLogState,
  logNormalizer: number
): DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] {
  const result: DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] = [];
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of prepared.monitorStates) {
      const logMass = support.get(stateId)?.get(monitorStateId);
      if (logMass !== undefined) {
        result.push({
          stateId,
          monitorStateId,
          ...probabilityView(logMass - logNormalizer)
        });
      }
    }
  }
  return result;
}

function conditionalMonitor(
  prepared: Prepared,
  support: AugmentedLogState,
  logNormalizer: number
): DeterministicTrajectoryMonitorStateAtom[] {
  return prepared.monitorStates.flatMap((monitorStateId) => {
    let total = Number.NEGATIVE_INFINITY;
    for (const stateId of prepared.stateIds) {
      total = logAddExp(
        total,
        support.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY
      );
    }
    return total === Number.NEGATIVE_INFINITY
      ? []
      : [{ monitorStateId, ...probabilityView(total - logNormalizer) }];
  });
}

function runForward(
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  prepared: Prepared,
  evidenceEnabled = true
): { ok: true; forward: ForwardInternal } | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  const alphas: AugmentedLogState[] = [];
  const trajectory: DeterministicTrajectoryMonitorCoupledEvidencePrefixStep[] = [];
  let current = emptyAugmented(prepared);

  for (const stateId of prepared.stateIds) {
    const probability = prepared.initialDistribution.get(stateId) ?? 0;
    const likelihood = evidenceEnabled
      ? prepared.initialEvidenceMap.get(stateId) ?? 0
      : 1;
    if (probability > 0 && likelihood > 0) {
      current
        .get(stateId)!
        .set(
          prepared.initialMonitorMap.get(stateId)!,
          Math.log(probability) + Math.log(likelihood)
        );
    }
  }
  alphas.push(current);
  let logEvidence = totalLogMass(prepared, current);

  if (evidenceEnabled) {
    if (logEvidence === Number.NEGATIVE_INFINITY) {
      trajectory.push({
        step: 0,
        prefixEvidenceProbability: 0,
        prefixLogEvidenceProbability: null,
        prefixEvidenceProbabilityUnderflowed: false,
        jointHiddenMonitorDistribution: null,
        monitorDistribution: null
      });
      return {
        ok: true,
        forward: {
          alphas,
          trajectory,
          evidenceLogProbability: null,
          impossibleAtStep: 0
        }
      };
    }
    const view = probabilityView(logEvidence);
    trajectory.push({
      step: 0,
      prefixEvidenceProbability: view.probability,
      prefixLogEvidenceProbability: logEvidence,
      prefixEvidenceProbabilityUnderflowed: view.probabilityUnderflowed,
      jointHiddenMonitorDistribution: conditionalJoint(prepared, current, logEvidence),
      monitorDistribution: conditionalMonitor(prepared, current, logEvidence)
    });
  }

  for (let step = 0; step < request.horizon; step += 1) {
    const next = emptyAugmented(prepared);
    const monitorTransitions = prepared.monitorTransitionMaps[step]!;
    const coupledEvidence = prepared.monitorCoupledEvidenceMaps[step]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, alphaLog] of
        current.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = evidenceEnabled
            ? coupledEvidence.get(
                monitorTransitionKey(monitorStateId, edge.from, edge.to)
              ) ?? 0
            : 1;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = monitorTransitions.get(
            monitorTransitionKey(monitorStateId, edge.from, edge.to)
          );
          if (nextMonitorStateId === undefined) {
            return failure(
              'internal_candidate_ae_structural_inconsistency',
              'Missing deterministic monitor transition during Candidate AE forward propagation',
              {
                step: step + 1,
                monitorStateId,
                fromStateId: edge.from,
                toStateId: edge.to
              }
            );
          }
          const target = next.get(edge.to)!;
          const logMass =
            alphaLog + Math.log(edge.probability) + Math.log(likelihood);
          target.set(
            nextMonitorStateId,
            logAddExp(
              target.get(nextMonitorStateId) ?? Number.NEGATIVE_INFINITY,
              logMass
            )
          );
        }
      }
    }
    current = next;
    alphas.push(current);
    logEvidence = totalLogMass(prepared, current);

    if (evidenceEnabled) {
      if (logEvidence === Number.NEGATIVE_INFINITY) {
        trajectory.push({
          step: step + 1,
          prefixEvidenceProbability: 0,
          prefixLogEvidenceProbability: null,
          prefixEvidenceProbabilityUnderflowed: false,
          jointHiddenMonitorDistribution: null,
          monitorDistribution: null
        });
        return {
          ok: true,
          forward: {
            alphas,
            trajectory,
            evidenceLogProbability: null,
            impossibleAtStep: step + 1
          }
        };
      }
      const view = probabilityView(logEvidence);
      trajectory.push({
        step: step + 1,
        prefixEvidenceProbability: view.probability,
        prefixLogEvidenceProbability: logEvidence,
        prefixEvidenceProbabilityUnderflowed: view.probabilityUnderflowed,
        jointHiddenMonitorDistribution: conditionalJoint(prepared, current, logEvidence),
        monitorDistribution: conditionalMonitor(prepared, current, logEvidence)
      });
    }
  }

  return {
    ok: true,
    forward: {
      alphas,
      trajectory,
      evidenceLogProbability:
        logEvidence === Number.NEGATIVE_INFINITY ? null : logEvidence,
      impossibleAtStep:
        logEvidence === Number.NEGATIVE_INFINITY ? request.horizon : null
    }
  };
}

function makeDiagnostics(
  prepared: Prepared,
  forward: ForwardInternal
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceDiagnostics {
  return {
    method:
      'sparse_log_augmented_hidden_monitor_coupled_calibrated_evidence_dynamic_programming',
    numericRepresentation: 'javascript_number_float64_with_log_mass',
    simulationUsed: false,
    approximationUsed: false,
    monitorDeterministic: true,
    monitorStateDomain: 'finite_unique_string_identifiers',
    evidenceSemantics:
      'absolute_calibrated_initial_state_and_monitor_coupled_adjacent_hidden_pair_likelihood',
    evidenceFactorization:
      'initial_state_local_then_monitor_coupled_adjacent_hidden_pair_local_by_time',
    earlierHistoryVisibleOnlyThroughFiniteMonitor: true,
    absoluteEvidenceScalePreserved: true,
    inputNormalizationApplied: false,
    terminalSemantics:
      'implicit_self_retention_with_monitor_coupled_pair_evidence_and_monitor_update',
    parallelTransitionSemantics:
      'evidence_and_monitor_observe_hidden_state_pair_not_parallel_edge_identity',
    probabilityTolerance: prepared.resolved.probabilityTolerance,
    pairwiseConsistencyTolerance: prepared.resolved.pairwiseConsistencyTolerance,
    expectedCountTolerance: prepared.resolved.expectedCountTolerance,
    maxObservations: prepared.resolved.maxObservations,
    maxMonitorStates: prepared.resolved.maxMonitorStates,
    maxAugmentedStates: prepared.resolved.maxAugmentedStates,
    maxMonitorCoupledEvidenceEntries:
      prepared.resolved.maxMonitorCoupledEvidenceEntries,
    evidenceStepsRequested:
      prepared.monitorCoupledTransitionEvidenceLikelihoodsByStep.length + 1,
    evidenceStepsProcessed:
      forward.impossibleAtStep === null
        ? prepared.monitorCoupledTransitionEvidenceLikelihoodsByStep.length + 1
        : forward.impossibleAtStep + 1,
    monitorCoupledEvidenceStepsRequested:
      prepared.monitorCoupledTransitionEvidenceLikelihoodsByStep.length,
    impossibleAtStep: forward.impossibleAtStep,
    evidenceProbabilityUnderflowed:
      forward.evidenceLogProbability !== null &&
      directProbability(forward.evidenceLogProbability) === null,
    candidateADCommonValidationReused: true,
    existingQualifiedRequestTypesModified: false,
    parameterLearningUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    causalInterventionUsed: false
  };
}

function finalJointMonitor(
  prepared: Prepared,
  forward: ForwardInternal
): DeterministicTrajectoryMonitorJointFinalAtom[] {
  const logEvidence = forward.evidenceLogProbability!;
  const final = forward.alphas[forward.alphas.length - 1]!;
  return prepared.monitorStates.flatMap((monitorStateId) => {
    let logJointProbability = Number.NEGATIVE_INFINITY;
    for (const stateId of prepared.stateIds) {
      logJointProbability = logAddExp(
        logJointProbability,
        final.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY
      );
    }
    if (logJointProbability === Number.NEGATIVE_INFINITY) return [];
    const jointProbability = directProbability(logJointProbability);
    const logConditionalProbability = logJointProbability - logEvidence;
    const conditionalProbability = directProbability(logConditionalProbability);
    return [
      {
        monitorStateId,
        jointProbability,
        logJointProbability,
        jointProbabilityUnderflowed: jointProbability === null,
        conditionalProbability,
        logConditionalProbability,
        conditionalProbabilityUnderflowed: conditionalProbability === null
      }
    ];
  });
}

export function analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  options: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = {}
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResult {
  const preparedResult = prepare(model, request, options);
  if (!preparedResult.ok) return preparedResult;
  const prepared = preparedResult.prepared;
  const forwardResult = runForward(request, prepared);
  if (!forwardResult.ok) return forwardResult;
  const forward = forwardResult.forward;
  const diagnostics = makeDiagnostics(prepared, forward);

  if (forward.evidenceLogProbability === null) {
    return {
      ok: true,
      possible: false,
      horizon: request.horizon,
      monitorStates: prepared.monitorStates,
      initialMonitorStateByHiddenState: prepared.initialMonitorStateByHiddenState,
      monitorTransitionByStep: prepared.monitorTransitionByStep,
      initialEvidenceLikelihoods: prepared.initialEvidenceLikelihoods,
      monitorCoupledTransitionEvidenceLikelihoodsByStep:
        prepared.monitorCoupledTransitionEvidenceLikelihoodsByStep,
      trajectory: forward.trajectory,
      evidenceProbability: 0,
      logEvidenceProbability: null,
      finalEvidenceConditionedMonitorDistribution: null,
      jointEvidenceMonitorDistribution: null,
      diagnostics
    };
  }

  const joint = finalJointMonitor(prepared, forward);
  return {
    ok: true,
    possible: true,
    horizon: request.horizon,
    monitorStates: prepared.monitorStates,
    initialMonitorStateByHiddenState: prepared.initialMonitorStateByHiddenState,
    monitorTransitionByStep: prepared.monitorTransitionByStep,
    initialEvidenceLikelihoods: prepared.initialEvidenceLikelihoods,
    monitorCoupledTransitionEvidenceLikelihoodsByStep:
      prepared.monitorCoupledTransitionEvidenceLikelihoodsByStep,
    trajectory: forward.trajectory,
    evidenceProbability: directProbability(forward.evidenceLogProbability),
    logEvidenceProbability: forward.evidenceLogProbability,
    finalEvidenceConditionedMonitorDistribution: joint.map((atom) => ({
      monitorStateId: atom.monitorStateId,
      probability: atom.conditionalProbability,
      logProbability: atom.logConditionalProbability,
      probabilityUnderflowed: atom.conditionalProbabilityUnderflowed
    })),
    jointEvidenceMonitorDistribution: joint,
    diagnostics
  };
}

function canonicalizeTarget(
  targetMonitorStates: string[],
  monitorStates: string[]
): {
  ok: true;
  states: string[];
  set: Set<string>;
} | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  if (!Array.isArray(targetMonitorStates)) {
    return failure('invalid_candidate_ae_request', 'targetMonitorStates must be an array', {
      path: 'request.targetMonitorStates'
    });
  }
  const known = new Set(monitorStates);
  const seen = new Set<string>();
  for (const monitorStateId of targetMonitorStates) {
    if (!known.has(monitorStateId)) {
      return failure(
        'invalid_candidate_ae_monitor_definition',
        `Unknown target monitor state: ${monitorStateId}`,
        { monitorStateId }
      );
    }
    if (seen.has(monitorStateId)) {
      return failure(
        'invalid_candidate_ae_monitor_definition',
        `Duplicate target monitor state: ${monitorStateId}`,
        { monitorStateId }
      );
    }
    seen.add(monitorStateId);
  }
  const states = [...seen].sort(compareStrings);
  return { ok: true, states, set: new Set(states) };
}

function finalTargetLogMass(
  prepared: Prepared,
  forward: ForwardInternal,
  target: Set<string>
): number {
  const final = forward.alphas[forward.alphas.length - 1]!;
  let total = Number.NEGATIVE_INFINITY;
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of target) {
      total = logAddExp(
        total,
        final.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY
      );
    }
  }
  return total;
}

function runBackward(
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  target: Set<string>
): {
  ok: true;
  betas: AugmentedLogState[];
} | FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure {
  const betas: AugmentedLogState[] = Array.from(
    { length: request.horizon + 1 },
    () => emptyAugmented(prepared)
  );
  const final = emptyAugmented(prepared);
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of prepared.monitorStates) {
      if (target.has(monitorStateId)) final.get(stateId)!.set(monitorStateId, 0);
    }
  }
  betas[request.horizon] = final;

  for (let step = request.horizon - 1; step >= 0; step -= 1) {
    const current = emptyAugmented(prepared);
    const monitorTransitions = prepared.monitorTransitionMaps[step]!;
    const coupledEvidence = prepared.monitorCoupledEvidenceMaps[step]!;
    for (const fromStateId of prepared.stateIds) {
      for (const monitorStateId of prepared.monitorStates) {
        let total = Number.NEGATIVE_INFINITY;
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood =
            coupledEvidence.get(
              monitorTransitionKey(monitorStateId, edge.from, edge.to)
            ) ?? 0;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = monitorTransitions.get(
            monitorTransitionKey(monitorStateId, edge.from, edge.to)
          );
          if (nextMonitorStateId === undefined) {
            return failure(
              'internal_candidate_ae_structural_inconsistency',
              'Missing deterministic monitor transition during Candidate AE backward propagation',
              {
                step: step + 1,
                monitorStateId,
                fromStateId: edge.from,
                toStateId: edge.to
              }
            );
          }
          const future = betas[step + 1]!
            .get(edge.to)
            ?.get(nextMonitorStateId);
          if (future === undefined) continue;
          total = logAddExp(
            total,
            Math.log(edge.probability) + Math.log(likelihood) + future
          );
        }
        if (total !== Number.NEGATIVE_INFINITY) {
          current.get(fromStateId)!.set(monitorStateId, total);
        }
      }
    }
    betas[step] = current;
  }

  return { ok: true, betas };
}

function checkedMass(
  values: number[],
  tolerance: number,
  code: DeterministicTrajectoryMonitorCoupledEvidenceFailureCode,
  message: string,
  step: number
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceFailure | undefined {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(code, message, {
      step,
      actual: total,
      expected: 1,
      tolerance
    });
  }
  return undefined;
}

function impossibleConditioning(
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  forward: ForwardInternal,
  targetStates: string[],
  monitorEvent: {
    possible: boolean;
    probability: number | null;
    logProbability: number | null;
  },
  impossibility: DeterministicTrajectoryMonitorCoupledEvidenceImpossibility
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningSuccess {
  const evidencePossible = forward.evidenceLogProbability !== null;
  return {
    ok: true,
    possible: false,
    evidencePossible,
    monitorEventPossible: monitorEvent.possible,
    jointPossible: false,
    impossibility,
    horizon: request.horizon,
    targetMonitorStates: targetStates,
    evidenceProbability: evidencePossible
      ? directProbability(forward.evidenceLogProbability!)
      : 0,
    logEvidenceProbability: forward.evidenceLogProbability,
    unconditionalTargetProbability: monitorEvent.probability,
    unconditionalTargetLogProbability: monitorEvent.logProbability,
    jointEventProbability: 0,
    logJointEventProbability: null,
    targetConditionalProbabilityGivenEvidence: evidencePossible ? 0 : null,
    logTargetConditionalProbabilityGivenEvidence: null,
    smoothingSteps: null,
    pairwiseSteps: null,
    expectedTransitionCounts: null,
    diagnostics: {
      ...makeDiagnostics(prepared, forward),
      conditioningMethod:
        'exact_terminal_monitor_set_monitor_coupled_calibrated_log_forward_backward',
      jointEventProbabilityUnderflowed: false,
      evidenceOnlyPossible: evidencePossible,
      monitorEventOnlyPossible: monitorEvent.possible
    }
  };
}

export function conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningRequest,
  options: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceOptions = {}
): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResult {
  const preparedResult = prepare(model, request, options);
  if (!preparedResult.ok) return preparedResult;
  const prepared = preparedResult.prepared;
  const targetResult = canonicalizeTarget(
    request.targetMonitorStates,
    prepared.monitorStates
  );
  if (!targetResult.ok) return targetResult;

  const forwardResult = runForward(request, prepared);
  if (!forwardResult.ok) return forwardResult;
  const forward = forwardResult.forward;

  const unconditionalResult = runForward(request, prepared, false);
  if (!unconditionalResult.ok) return unconditionalResult;
  const unconditionalLog = finalTargetLogMass(
    prepared,
    unconditionalResult.forward,
    targetResult.set
  );
  const monitorEvent =
    unconditionalLog === Number.NEGATIVE_INFINITY
      ? { possible: false, probability: 0, logProbability: null }
      : {
          possible: true,
          probability: directProbability(unconditionalLog),
          logProbability: unconditionalLog
        };

  if (forward.evidenceLogProbability === null) {
    return impossibleConditioning(
      request,
      prepared,
      forward,
      targetResult.states,
      monitorEvent,
      'evidence'
    );
  }
  if (!monitorEvent.possible) {
    return impossibleConditioning(
      request,
      prepared,
      forward,
      targetResult.states,
      monitorEvent,
      'monitor_event'
    );
  }

  const jointLog = finalTargetLogMass(prepared, forward, targetResult.set);
  if (jointLog === Number.NEGATIVE_INFINITY) {
    return impossibleConditioning(
      request,
      prepared,
      forward,
      targetResult.states,
      monitorEvent,
      'joint'
    );
  }
  if (!Number.isFinite(jointLog)) {
    return failure(
      'non_finite_candidate_ae_result',
      'Candidate AE combined monitor/evidence log probability is invalid',
      { actual: jointLog }
    );
  }

  const backwardResult = runBackward(request, prepared, targetResult.set);
  if (!backwardResult.ok) return backwardResult;
  const betas = backwardResult.betas;

  const smoothingSteps: DeterministicTrajectoryMonitorConditionedSmoothingStep[] = [];
  for (let step = 0; step <= request.horizon; step += 1) {
    const jointHiddenMonitorDistribution: DeterministicTrajectoryMonitorConditionedJointAtom[] = [];
    const hidden = new Map<StateId, number>(
      prepared.stateIds.map((stateId) => [stateId, 0])
    );
    const monitor = new Map<string, number>(
      prepared.monitorStates.map((monitorStateId) => [monitorStateId, 0])
    );

    for (const stateId of prepared.stateIds) {
      for (const monitorStateId of prepared.monitorStates) {
        const alpha = forward.alphas[step]!
          .get(stateId)
          ?.get(monitorStateId);
        const beta = betas[step]!.get(stateId)?.get(monitorStateId);
        const probability =
          alpha === undefined || beta === undefined
            ? 0
            : Math.exp(alpha + beta - jointLog);
        if (!Number.isFinite(probability) || probability < 0) {
          return failure(
            'non_finite_candidate_ae_result',
            'Candidate AE combined smoothing probability is invalid',
            { step, stateId, monitorStateId, actual: probability }
          );
        }
        jointHiddenMonitorDistribution.push({
          stateId,
          monitorStateId,
          probability
        });
        hidden.set(stateId, (hidden.get(stateId) ?? 0) + probability);
        monitor.set(
          monitorStateId,
          (monitor.get(monitorStateId) ?? 0) + probability
        );
      }
    }

    const smoothingFailure = checkedMass(
      jointHiddenMonitorDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'candidate_ae_smoothing_mass_conservation_violation',
      `Candidate AE hidden/monitor smoothing mass does not sum to one at step ${step}`,
      step
    );
    if (smoothingFailure !== undefined) return smoothingFailure;

    smoothingSteps.push({
      step,
      jointHiddenMonitorDistribution,
      hiddenStateDistribution: prepared.stateIds.map((stateId) => ({
        stateId,
        probability: hidden.get(stateId) ?? 0
      })),
      monitorStateDistribution: prepared.monitorStates.map((monitorStateId) => ({
        monitorStateId,
        probability: monitor.get(monitorStateId) ?? 0
      }))
    });
  }

  const pairwiseSteps: DeterministicTrajectoryMonitorConditionedPairwiseStep[] = [];
  const expectedCounts = new Map<string, number>(
    prepared.effectivePairs.map((edge) => [pairKey(edge.from, edge.to), 0])
  );

  for (let step = 0; step < request.horizon; step += 1) {
    const numeratorByPair = new Map<string, number>();
    const monitorTransitions = prepared.monitorTransitionMaps[step]!;
    const coupledEvidence = prepared.monitorCoupledEvidenceMaps[step]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, alphaLog] of
        forward.alphas[step]!.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood =
            coupledEvidence.get(
              monitorTransitionKey(monitorStateId, edge.from, edge.to)
            ) ?? 0;
          if (likelihood <= 0 || edge.probability <= 0) continue;
          const nextMonitorStateId = monitorTransitions.get(
            monitorTransitionKey(monitorStateId, edge.from, edge.to)
          );
          if (nextMonitorStateId === undefined) {
            return failure(
              'internal_candidate_ae_structural_inconsistency',
              'Missing monitor transition during Candidate AE pairwise conditioning',
              {
                step: step + 1,
                monitorStateId,
                fromStateId: edge.from,
                toStateId: edge.to
              }
            );
          }
          const beta = betas[step + 1]!
            .get(edge.to)
            ?.get(nextMonitorStateId);
          if (beta === undefined) continue;
          const key = pairKey(edge.from, edge.to);
          numeratorByPair.set(
            key,
            logAddExp(
              numeratorByPair.get(key) ?? Number.NEGATIVE_INFINITY,
              alphaLog +
                Math.log(edge.probability) +
                Math.log(likelihood) +
                beta
            )
          );
        }
      }
    }

    const pairwiseDistribution = prepared.effectivePairs.map((edge) => {
      const numerator =
        numeratorByPair.get(pairKey(edge.from, edge.to)) ??
        Number.NEGATIVE_INFINITY;
      return {
        fromStateId: edge.from,
        toStateId: edge.to,
        probability:
          numerator === Number.NEGATIVE_INFINITY
            ? 0
            : Math.exp(numerator - jointLog)
      };
    });

    const pairFailure = checkedMass(
      pairwiseDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'candidate_ae_pairwise_mass_conservation_violation',
      `Candidate AE hidden-state pairwise mass does not sum to one at step ${step}`,
      step
    );
    if (pairFailure !== undefined) return pairFailure;

    for (const stateId of prepared.stateIds) {
      const rowMass = pairwiseDistribution
        .filter((entry) => entry.fromStateId === stateId)
        .reduce((sum, entry) => sum + entry.probability, 0);
      const columnMass = pairwiseDistribution
        .filter((entry) => entry.toStateId === stateId)
        .reduce((sum, entry) => sum + entry.probability, 0);
      const expectedRow = smoothingSteps[step]!.hiddenStateDistribution.find(
        (entry) => entry.stateId === stateId
      )!.probability;
      const expectedColumn = smoothingSteps[
        step + 1
      ]!.hiddenStateDistribution.find(
        (entry) => entry.stateId === stateId
      )!.probability;
      if (
        Math.abs(rowMass - expectedRow) >
          prepared.resolved.pairwiseConsistencyTolerance ||
        Math.abs(columnMass - expectedColumn) >
          prepared.resolved.pairwiseConsistencyTolerance
      ) {
        return failure(
          'candidate_ae_pairwise_marginal_consistency_violation',
          'Candidate AE hidden pairwise marginal mismatch',
          {
            step,
            stateId,
            tolerance: prepared.resolved.pairwiseConsistencyTolerance
          }
        );
      }
    }

    for (const entry of pairwiseDistribution) {
      const key = pairKey(entry.fromStateId, entry.toStateId);
      expectedCounts.set(
        key,
        (expectedCounts.get(key) ?? 0) + entry.probability
      );
    }
    pairwiseSteps.push({ step, pairwiseDistribution });
  }

  const expectedTransitionCounts = prepared.effectivePairs.map((edge) => ({
    fromStateId: edge.from,
    toStateId: edge.to,
    expectedCount: expectedCounts.get(pairKey(edge.from, edge.to)) ?? 0
  }));
  const totalExpectedCount = expectedTransitionCounts.reduce(
    (sum, entry) => sum + entry.expectedCount,
    0
  );
  if (
    Math.abs(totalExpectedCount - request.horizon) >
    prepared.resolved.expectedCountTolerance
  ) {
    return failure(
      'candidate_ae_expected_transition_count_conservation_violation',
      'Candidate AE expected hidden transition counts do not sum to horizon',
      {
        actual: totalExpectedCount,
        expected: request.horizon,
        tolerance: prepared.resolved.expectedCountTolerance
      }
    );
  }

  const evidenceLog = forward.evidenceLogProbability;
  const conditionalLog = jointLog - evidenceLog;
  const jointEventProbability = directProbability(jointLog);
  return {
    ok: true,
    possible: true,
    evidencePossible: true,
    monitorEventPossible: true,
    jointPossible: true,
    impossibility: null,
    horizon: request.horizon,
    targetMonitorStates: targetResult.states,
    evidenceProbability: directProbability(evidenceLog),
    logEvidenceProbability: evidenceLog,
    unconditionalTargetProbability: monitorEvent.probability,
    unconditionalTargetLogProbability: monitorEvent.logProbability,
    jointEventProbability,
    logJointEventProbability: jointLog,
    targetConditionalProbabilityGivenEvidence: directProbability(conditionalLog),
    logTargetConditionalProbabilityGivenEvidence: conditionalLog,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    diagnostics: {
      ...makeDiagnostics(prepared, forward),
      conditioningMethod:
        'exact_terminal_monitor_set_monitor_coupled_calibrated_log_forward_backward',
      jointEventProbabilityUnderflowed: jointEventProbability === null,
      evidenceOnlyPossible: true,
      monitorEventOnlyPossible: true
    }
  };
}

type NonFiniteNumberLocation = { path: string; value: number };

function findNonFiniteNumber(
  value: unknown,
  path = '$'
): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : { path, value };
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findNonFiniteNumber(value[index], `${path}[${index}]`);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const found = findNonFiniteNumber(nested, `${path}.${key}`);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResultToJson(
  result: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AE analysis result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}

export function finiteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResultToJson(
  result: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize Candidate AE conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
