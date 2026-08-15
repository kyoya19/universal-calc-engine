import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  CalibratedEvidenceLikelihoodEntry,
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningOptions,
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods
} from './hidden_state_calibrated_evidence_likelihood_conditioning';

export type DeterministicTrajectoryMonitorInitialEntry = {
  stateId: StateId;
  monitorStateId: string;
};

export type DeterministicTrajectoryMonitorTransitionEntry = {
  monitorStateId: string;
  fromStateId: StateId;
  toStateId: StateId;
  nextMonitorStateId: string;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
  initialDistribution: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest['initialDistribution'];
  horizon: number;
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningRequest =
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest & {
    targetMonitorStates: string[];
  };

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceOptions =
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningOptions & {
    maxMonitorStates?: number;
    maxAugmentedStates?: number;
  };

export type DeterministicTrajectoryMonitorProbabilityView = {
  probability: number | null;
  logProbability: number;
  probabilityUnderflowed: boolean;
};

export type DeterministicTrajectoryMonitorJointHiddenMonitorAtom =
  DeterministicTrajectoryMonitorProbabilityView & {
    stateId: StateId;
    monitorStateId: string;
  };

export type DeterministicTrajectoryMonitorStateAtom =
  DeterministicTrajectoryMonitorProbabilityView & {
    monitorStateId: string;
  };

export type DeterministicTrajectoryMonitorPrefixStep = {
  step: number;
  calibratedEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  prefixEvidenceProbability: number | null;
  prefixLogEvidenceProbability: number | null;
  prefixEvidenceProbabilityUnderflowed: boolean;
  jointHiddenMonitorDistribution: DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] | null;
  monitorDistribution: DeterministicTrajectoryMonitorStateAtom[] | null;
};

export type DeterministicTrajectoryMonitorJointFinalAtom = {
  monitorStateId: string;
  jointProbability: number | null;
  logJointProbability: number;
  jointProbabilityUnderflowed: boolean;
  conditionalProbability: number | null;
  logConditionalProbability: number;
  conditionalProbabilityUnderflowed: boolean;
};

export type DeterministicTrajectoryMonitorConditionedJointAtom = {
  stateId: StateId;
  monitorStateId: string;
  probability: number;
};

export type DeterministicTrajectoryMonitorConditionedHiddenStateAtom = {
  stateId: StateId;
  probability: number;
};

export type DeterministicTrajectoryMonitorConditionedMonitorStateAtom = {
  monitorStateId: string;
  probability: number;
};

export type DeterministicTrajectoryMonitorConditionedSmoothingStep = {
  step: number;
  jointHiddenMonitorDistribution: DeterministicTrajectoryMonitorConditionedJointAtom[];
  hiddenStateDistribution: DeterministicTrajectoryMonitorConditionedHiddenStateAtom[];
  monitorStateDistribution: DeterministicTrajectoryMonitorConditionedMonitorStateAtom[];
};

export type DeterministicTrajectoryMonitorConditionedPairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type DeterministicTrajectoryMonitorConditionedPairwiseStep = {
  step: number;
  pairwiseDistribution: DeterministicTrajectoryMonitorConditionedPairwiseEntry[];
};

export type DeterministicTrajectoryMonitorConditionedExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceDiagnostics = {
  method: 'sparse_log_augmented_hidden_monitor_calibrated_evidence_dynamic_programming';
  numericRepresentation: 'javascript_number_float64_with_log_mass';
  simulationUsed: false;
  approximationUsed: false;
  monitorDeterministic: true;
  monitorStateDomain: 'finite_unique_string_identifiers';
  evidenceSemantics: 'absolute_calibrated_local_likelihood';
  evidenceFactorization: 'state_local_conditionally_independent_by_time';
  absoluteEvidenceScalePreserved: true;
  inputNormalizationApplied: false;
  terminalSemantics: 'implicit_self_retention_with_monitor_update_each_remaining_step';
  parallelTransitionSemantics: 'monitor_observes_hidden_state_pair_not_parallel_edge_identity';
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  maxMonitorStates: number;
  maxAugmentedStates: number;
  evidenceStepsRequested: number;
  evidenceStepsProcessed: number;
  impossibleAtStep: number | null;
  evidenceProbabilityUnderflowed: boolean;
  candidateZValidationReused: true;
  existingQualifiedRequestTypesModified: false;
  parameterLearningUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  causalInterventionUsed: false;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningDiagnostics =
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceDiagnostics & {
    conditioningMethod: 'exact_terminal_monitor_set_log_forward_backward';
    jointEventProbabilityUnderflowed: boolean;
    evidenceOnlyPossible: boolean;
    monitorEventOnlyPossible: boolean;
  };

export type DeterministicTrajectoryMonitorFailureCode =
  | 'invalid_deterministic_trajectory_monitor_request'
  | 'invalid_deterministic_trajectory_monitor_horizon'
  | 'deterministic_trajectory_monitor_evidence_length_mismatch'
  | 'deterministic_trajectory_monitor_transition_length_mismatch'
  | 'empty_deterministic_trajectory_monitor_state_space'
  | 'invalid_deterministic_trajectory_monitor_state'
  | 'duplicate_deterministic_trajectory_monitor_state'
  | 'missing_deterministic_trajectory_monitor_initial_hidden_state'
  | 'unknown_deterministic_trajectory_monitor_initial_hidden_state'
  | 'duplicate_deterministic_trajectory_monitor_initial_hidden_state'
  | 'unknown_deterministic_trajectory_monitor_initial_state'
  | 'missing_deterministic_trajectory_monitor_transition_entry'
  | 'unknown_deterministic_trajectory_monitor_transition_hidden_state'
  | 'unknown_deterministic_trajectory_monitor_transition_monitor_state'
  | 'duplicate_deterministic_trajectory_monitor_transition_entry'
  | 'unknown_deterministic_trajectory_monitor_transition_next_state'
  | 'unknown_deterministic_trajectory_monitor_target_state'
  | 'duplicate_deterministic_trajectory_monitor_target_state'
  | 'invalid_deterministic_trajectory_monitor_evidence_likelihood_row'
  | 'invalid_deterministic_trajectory_monitor_evidence_likelihood'
  | 'deterministic_trajectory_monitor_resource_limit_exceeded'
  | 'deterministic_trajectory_monitor_forward_mass_conservation_violation'
  | 'deterministic_trajectory_monitor_conditioning_smoothing_mass_conservation_violation'
  | 'deterministic_trajectory_monitor_conditioning_pairwise_mass_conservation_violation'
  | 'deterministic_trajectory_monitor_conditioning_pairwise_marginal_consistency_violation'
  | 'deterministic_trajectory_monitor_expected_transition_count_conservation_violation'
  | 'internal_deterministic_trajectory_monitor_structural_inconsistency'
  | 'non_finite_deterministic_trajectory_monitor_result';

export type DeterministicTrajectoryMonitorFailure = {
  code: DeterministicTrajectoryMonitorFailureCode;
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

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure = {
  ok: false;
  failure: DeterministicTrajectoryMonitorFailure;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceSuccess = {
  ok: true;
  possible: boolean;
  horizon: number;
  monitorStates: string[];
  initialMonitorStateByHiddenState: DeterministicTrajectoryMonitorInitialEntry[];
  monitorTransitionByStep: DeterministicTrajectoryMonitorTransitionEntry[][];
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
  trajectory: DeterministicTrajectoryMonitorPrefixStep[];
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  finalEvidenceConditionedMonitorDistribution: DeterministicTrajectoryMonitorStateAtom[] | null;
  jointEvidenceMonitorDistribution: DeterministicTrajectoryMonitorJointFinalAtom[] | null;
  diagnostics: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceDiagnostics;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult =
  | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceSuccess
  | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure;

export type DeterministicTrajectoryMonitorImpossibility =
  | 'evidence'
  | 'monitor_event'
  | 'joint'
  | null;

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningSuccess = {
  ok: true;
  possible: boolean;
  evidencePossible: boolean;
  monitorEventPossible: boolean;
  jointPossible: boolean;
  impossibility: DeterministicTrajectoryMonitorImpossibility;
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
  diagnostics: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningDiagnostics;
};

export type FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult =
  | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningSuccess
  | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure;

type EffectiveEdge = { from: StateId; to: StateId; probability: number };
type AugmentedLogState = Map<StateId, Map<string, number>>;

type ResolvedOptions = {
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  maxMonitorStates: number;
  maxAugmentedStates: number;
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
  evidenceRows: CalibratedEvidenceLikelihoodEntry[][];
  evidenceMaps: Array<Map<StateId, number>>;
  resolved: ResolvedOptions;
};

type ForwardInternal = {
  alphas: AugmentedLogState[];
  trajectory: DeterministicTrajectoryMonitorPrefixStep[];
  evidenceLogProbability: number | null;
  impossibleAtStep: number | null;
};

const DEFAULT_MAX_MONITOR_STATES = 10_000;
const DEFAULT_MAX_AUGMENTED_STATES = 100_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function monitorTransitionKey(monitorStateId: string, fromStateId: StateId, toStateId: StateId): string {
  return `${monitorStateId}\u0000${fromStateId}\u0000${toStateId}`;
}

function failure(
  code: DeterministicTrajectoryMonitorFailureCode,
  message: string,
  details: Omit<DeterministicTrajectoryMonitorFailure, 'code' | 'message'> = {}
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  return { ok: false, failure: { code, message, ...details } };
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

function probabilityView(logProbability: number): DeterministicTrajectoryMonitorProbabilityView {
  const probability = directProbability(logProbability);
  return { probability, logProbability, probabilityUnderflowed: probability === null };
}

function mapZFailure(source: { failure: { code: string; message: string } }): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  const sourceFailureCode = source.failure.code;
  let code: DeterministicTrajectoryMonitorFailureCode = 'invalid_deterministic_trajectory_monitor_request';
  if (sourceFailureCode.includes('likelihood_row') || sourceFailureCode.includes('likelihood_state')) {
    code = 'invalid_deterministic_trajectory_monitor_evidence_likelihood_row';
  } else if (sourceFailureCode.includes('likelihood')) {
    code = 'invalid_deterministic_trajectory_monitor_evidence_likelihood';
  }
  return failure(code, source.failure.message, { sourceFailureCode });
}

function buildEffectiveEdges(model: DefinitionModel): {
  byState: Map<StateId, EffectiveEdge[]>;
  pairs: EffectiveEdge[];
} {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminal = new Set(model.states.filter((state) => isTerminalState(state)).map((state) => state.id));
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
      const order = compareStrings(left.from, right.from);
      return order !== 0 ? order : compareStrings(left.to, right.to);
    })
  };
}

function canonicalizeMonitorStates(
  monitorStates: string[]
): { ok: true; states: string[] } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  if (!Array.isArray(monitorStates) || monitorStates.length === 0) {
    return failure('empty_deterministic_trajectory_monitor_state_space', 'monitorStates must be a non-empty array', { path: 'request.monitorStates' });
  }
  const seen = new Set<string>();
  for (let index = 0; index < monitorStates.length; index += 1) {
    const value = monitorStates[index];
    if (typeof value !== 'string' || value.length === 0) {
      return failure('invalid_deterministic_trajectory_monitor_state', `monitorStates[${index}] must be a non-empty string`, { path: `request.monitorStates[${index}]` });
    }
    if (seen.has(value)) {
      return failure('duplicate_deterministic_trajectory_monitor_state', `Duplicate monitor state: ${value}`, { monitorStateId: value });
    }
    seen.add(value);
  }
  return { ok: true, states: [...seen].sort(compareStrings) };
}

function canonicalizeInitialMonitor(
  entries: DeterministicTrajectoryMonitorInitialEntry[],
  stateIds: StateId[],
  monitorStates: string[]
): { ok: true; rows: DeterministicTrajectoryMonitorInitialEntry[]; map: Map<StateId, string> } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  if (!Array.isArray(entries)) {
    return failure('invalid_deterministic_trajectory_monitor_request', 'initialMonitorStateByHiddenState must be an array', { path: 'request.initialMonitorStateByHiddenState' });
  }
  const knownHidden = new Set(stateIds);
  const knownMonitor = new Set(monitorStates);
  const seen = new Set<StateId>();
  const map = new Map<StateId, string>();
  for (const entry of entries) {
    if (entry === undefined || typeof entry.stateId !== 'string' || typeof entry.monitorStateId !== 'string') {
      return failure('invalid_deterministic_trajectory_monitor_request', 'Each initial monitor entry requires stateId and monitorStateId');
    }
    if (!knownHidden.has(entry.stateId)) {
      return failure('unknown_deterministic_trajectory_monitor_initial_hidden_state', `Unknown initial hidden state: ${entry.stateId}`, { stateId: entry.stateId });
    }
    if (seen.has(entry.stateId)) {
      return failure('duplicate_deterministic_trajectory_monitor_initial_hidden_state', `Duplicate initial hidden state: ${entry.stateId}`, { stateId: entry.stateId });
    }
    if (!knownMonitor.has(entry.monitorStateId)) {
      return failure('unknown_deterministic_trajectory_monitor_initial_state', `Unknown initial monitor state: ${entry.monitorStateId}`, { stateId: entry.stateId, monitorStateId: entry.monitorStateId });
    }
    seen.add(entry.stateId);
    map.set(entry.stateId, entry.monitorStateId);
  }
  for (const stateId of stateIds) {
    if (!seen.has(stateId)) {
      return failure('missing_deterministic_trajectory_monitor_initial_hidden_state', `Missing initial monitor mapping for hidden state: ${stateId}`, { stateId });
    }
  }
  return {
    ok: true,
    rows: stateIds.map((stateId) => ({ stateId, monitorStateId: map.get(stateId)! })),
    map
  };
}

function canonicalizeMonitorTransitions(
  rows: DeterministicTrajectoryMonitorTransitionEntry[][],
  horizon: number,
  stateIds: StateId[],
  monitorStates: string[],
  effectivePairs: EffectiveEdge[]
): { ok: true; rows: DeterministicTrajectoryMonitorTransitionEntry[][]; maps: Array<Map<string, string>> } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  if (!Array.isArray(rows) || rows.length !== horizon) {
    return failure(
      'deterministic_trajectory_monitor_transition_length_mismatch',
      `monitorTransitionByStep must contain exactly horizon=${horizon} rows`,
      { path: 'request.monitorTransitionByStep', actual: Array.isArray(rows) ? rows.length : -1, expected: horizon }
    );
  }
  const knownHidden = new Set(stateIds);
  const knownMonitor = new Set(monitorStates);
  const effectivePairKeys = new Set(effectivePairs.map((edge) => pairKey(edge.from, edge.to)));
  const canonicalRows: DeterministicTrajectoryMonitorTransitionEntry[][] = [];
  const maps: Array<Map<string, string>> = [];
  for (let step = 0; step < horizon; step += 1) {
    const row = rows[step];
    if (!Array.isArray(row)) {
      return failure('deterministic_trajectory_monitor_transition_length_mismatch', `monitorTransitionByStep[${step}] must be an array`, { step: step + 1 });
    }
    const map = new Map<string, string>();
    for (const entry of row) {
      if (
        entry === undefined ||
        typeof entry.monitorStateId !== 'string' ||
        typeof entry.fromStateId !== 'string' ||
        typeof entry.toStateId !== 'string' ||
        typeof entry.nextMonitorStateId !== 'string'
      ) {
        return failure('invalid_deterministic_trajectory_monitor_request', `Invalid monitor transition entry at step ${step + 1}`, { step: step + 1 });
      }
      if (!knownHidden.has(entry.fromStateId) || !knownHidden.has(entry.toStateId)) {
        return failure('unknown_deterministic_trajectory_monitor_transition_hidden_state', 'Unknown hidden state in monitor transition', {
          step: step + 1, fromStateId: entry.fromStateId, toStateId: entry.toStateId
        });
      }
      if (!knownMonitor.has(entry.monitorStateId)) {
        return failure('unknown_deterministic_trajectory_monitor_transition_monitor_state', `Unknown monitor state: ${entry.monitorStateId}`, { step: step + 1, monitorStateId: entry.monitorStateId });
      }
      if (!knownMonitor.has(entry.nextMonitorStateId)) {
        return failure('unknown_deterministic_trajectory_monitor_transition_next_state', `Unknown next monitor state: ${entry.nextMonitorStateId}`, { step: step + 1, nextMonitorStateId: entry.nextMonitorStateId });
      }
      if (!effectivePairKeys.has(pairKey(entry.fromStateId, entry.toStateId))) {
        return failure('invalid_deterministic_trajectory_monitor_request', 'Monitor transition references a hidden-state pair that carries no effective model mass', {
          step: step + 1, fromStateId: entry.fromStateId, toStateId: entry.toStateId
        });
      }
      const key = monitorTransitionKey(entry.monitorStateId, entry.fromStateId, entry.toStateId);
      if (map.has(key)) {
        return failure('duplicate_deterministic_trajectory_monitor_transition_entry', 'Duplicate deterministic monitor transition entry', {
          step: step + 1, monitorStateId: entry.monitorStateId, fromStateId: entry.fromStateId, toStateId: entry.toStateId
        });
      }
      map.set(key, entry.nextMonitorStateId);
    }
    for (const monitorStateId of monitorStates) {
      for (const edge of effectivePairs) {
        const key = monitorTransitionKey(monitorStateId, edge.from, edge.to);
        if (!map.has(key)) {
          return failure('missing_deterministic_trajectory_monitor_transition_entry', 'Missing deterministic monitor transition entry', {
            step: step + 1, monitorStateId, fromStateId: edge.from, toStateId: edge.to
          });
        }
      }
    }
    const canonical = monitorStates.flatMap((monitorStateId) => effectivePairs.map((edge) => ({
      monitorStateId,
      fromStateId: edge.from,
      toStateId: edge.to,
      nextMonitorStateId: map.get(monitorTransitionKey(monitorStateId, edge.from, edge.to))!
    })));
    canonicalRows.push(canonical);
    maps.push(map);
  }
  return { ok: true, rows: canonicalRows, maps };
}

function prepare(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  options: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceOptions
): { ok: true; prepared: Prepared } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  if (request === null || typeof request !== 'object') {
    return failure('invalid_deterministic_trajectory_monitor_request', 'request must be an object', { path: 'request' });
  }
  if (!Number.isSafeInteger(request.horizon) || request.horizon < 0) {
    return failure('invalid_deterministic_trajectory_monitor_horizon', 'horizon must be a non-negative safe integer', { path: 'request.horizon' });
  }
  if (!Array.isArray(request.evidenceLikelihoods) || request.evidenceLikelihoods.length !== request.horizon + 1) {
    return failure(
      'deterministic_trajectory_monitor_evidence_length_mismatch',
      `evidenceLikelihoods must contain exactly horizon+1=${request.horizon + 1} rows`,
      { path: 'request.evidenceLikelihoods', actual: Array.isArray(request.evidenceLikelihoods) ? request.evidenceLikelihoods.length : -1, expected: request.horizon + 1 }
    );
  }
  const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(
    model,
    { initialDistribution: request.initialDistribution, evidenceLikelihoods: request.evidenceLikelihoods },
    options
  );
  if (!z.ok) return mapZFailure(z);
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const monitorResult = canonicalizeMonitorStates(request.monitorStates);
  if (!monitorResult.ok) return monitorResult;
  const monitorStates = monitorResult.states;
  const maxMonitorStates = options.maxMonitorStates ?? DEFAULT_MAX_MONITOR_STATES;
  const maxAugmentedStates = options.maxAugmentedStates ?? DEFAULT_MAX_AUGMENTED_STATES;
  if (!Number.isInteger(maxMonitorStates) || maxMonitorStates <= 0 || !Number.isInteger(maxAugmentedStates) || maxAugmentedStates <= 0) {
    return failure('deterministic_trajectory_monitor_resource_limit_exceeded', 'maxMonitorStates and maxAugmentedStates must be positive integers');
  }
  if (monitorStates.length > maxMonitorStates || monitorStates.length * stateIds.length > maxAugmentedStates) {
    return failure('deterministic_trajectory_monitor_resource_limit_exceeded', 'Deterministic monitor augmented-state resource guard exceeded', {
      actual: monitorStates.length * stateIds.length,
      expected: maxAugmentedStates
    });
  }
  const initialResult = canonicalizeInitialMonitor(request.initialMonitorStateByHiddenState, stateIds, monitorStates);
  if (!initialResult.ok) return initialResult;
  const effective = buildEffectiveEdges(model);
  const transitionResult = canonicalizeMonitorTransitions(
    request.monitorTransitionByStep,
    request.horizon,
    stateIds,
    monitorStates,
    effective.pairs
  );
  if (!transitionResult.ok) return transitionResult;
  const evidenceRows = z.evidenceLikelihoods.map((row) => row.map((entry) => ({ ...entry })));
  const evidenceMaps = evidenceRows.map((row) => new Map(row.map((entry) => [entry.stateId, entry.likelihood] as const)));
  const initialDistribution = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  for (const entry of request.initialDistribution) initialDistribution.set(entry.stateId, entry.probability);
  return {
    ok: true,
    prepared: {
      stateIds,
      monitorStates,
      effectiveEdgesByState: effective.byState,
      effectivePairs: effective.pairs,
      initialDistribution,
      initialMonitorStateByHiddenState: initialResult.rows,
      initialMonitorMap: initialResult.map,
      monitorTransitionByStep: transitionResult.rows,
      monitorTransitionMaps: transitionResult.maps,
      evidenceRows,
      evidenceMaps,
      resolved: {
        probabilityTolerance: z.diagnostics.probabilityTolerance,
        pairwiseConsistencyTolerance: z.diagnostics.pairwiseConsistencyTolerance,
        expectedCountTolerance: z.diagnostics.expectedCountTolerance,
        maxObservations: z.diagnostics.maxObservations,
        maxMonitorStates,
        maxAugmentedStates
      }
    }
  };
}

function emptyAugmented(prepared: Prepared): AugmentedLogState {
  return new Map(prepared.stateIds.map((stateId) => [stateId, new Map<string, number>()]));
}

function totalLogMass(prepared: Prepared, support: AugmentedLogState): number {
  const values: number[] = [];
  for (const stateId of prepared.stateIds) {
    for (const logMass of support.get(stateId)?.values() ?? []) values.push(logMass);
  }
  return logSum(values);
}

function conditionalJoint(prepared: Prepared, support: AugmentedLogState, logNormalizer: number): DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] {
  const result: DeterministicTrajectoryMonitorJointHiddenMonitorAtom[] = [];
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of prepared.monitorStates) {
      const logMass = support.get(stateId)?.get(monitorStateId);
      if (logMass !== undefined) result.push({ stateId, monitorStateId, ...probabilityView(logMass - logNormalizer) });
    }
  }
  return result;
}

function conditionalMonitor(prepared: Prepared, support: AugmentedLogState, logNormalizer: number): DeterministicTrajectoryMonitorStateAtom[] {
  return prepared.monitorStates.flatMap((monitorStateId) => {
    let total = Number.NEGATIVE_INFINITY;
    for (const stateId of prepared.stateIds) {
      total = logAddExp(total, support.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY);
    }
    return total === Number.NEGATIVE_INFINITY ? [] : [{ monitorStateId, ...probabilityView(total - logNormalizer) }];
  });
}

function runForward(
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  prepared: Prepared,
  evidenceEnabled = true
): { ok: true; forward: ForwardInternal } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  const alphas: AugmentedLogState[] = [];
  const trajectory: DeterministicTrajectoryMonitorPrefixStep[] = [];
  let current = emptyAugmented(prepared);
  const evidence0 = prepared.evidenceMaps[0]!;
  for (const stateId of prepared.stateIds) {
    const probability = prepared.initialDistribution.get(stateId) ?? 0;
    const likelihood = evidenceEnabled ? (evidence0.get(stateId) ?? 0) : 1;
    if (probability > 0 && likelihood > 0) {
      current.get(stateId)!.set(prepared.initialMonitorMap.get(stateId)!, Math.log(probability) + Math.log(likelihood));
    }
  }
  alphas.push(current);
  let logEvidence = totalLogMass(prepared, current);
  if (evidenceEnabled) {
    if (logEvidence === Number.NEGATIVE_INFINITY) {
      trajectory.push({
        step: 0,
        calibratedEvidenceLikelihoods: prepared.evidenceRows[0]!.map((entry) => ({ ...entry })),
        prefixEvidenceProbability: 0,
        prefixLogEvidenceProbability: null,
        prefixEvidenceProbabilityUnderflowed: false,
        jointHiddenMonitorDistribution: null,
        monitorDistribution: null
      });
      return { ok: true, forward: { alphas, trajectory, evidenceLogProbability: null, impossibleAtStep: 0 } };
    }
    const view = probabilityView(logEvidence);
    trajectory.push({
      step: 0,
      calibratedEvidenceLikelihoods: prepared.evidenceRows[0]!.map((entry) => ({ ...entry })),
      prefixEvidenceProbability: view.probability,
      prefixLogEvidenceProbability: logEvidence,
      prefixEvidenceProbabilityUnderflowed: view.probabilityUnderflowed,
      jointHiddenMonitorDistribution: conditionalJoint(prepared, current, logEvidence),
      monitorDistribution: conditionalMonitor(prepared, current, logEvidence)
    });
  }
  for (let step = 0; step < request.horizon; step += 1) {
    const next = emptyAugmented(prepared);
    const transitions = prepared.monitorTransitionMaps[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, alphaLog] of current.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = evidenceEnabled ? (nextEvidence.get(edge.to) ?? 0) : 1;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = transitions.get(monitorTransitionKey(monitorStateId, edge.from, edge.to));
          if (nextMonitorStateId === undefined) {
            return failure('internal_deterministic_trajectory_monitor_structural_inconsistency', 'Missing deterministic monitor transition during forward propagation', {
              step: step + 1, monitorStateId, fromStateId: edge.from, toStateId: edge.to
            });
          }
          const target = next.get(edge.to)!;
          const logMass = alphaLog + Math.log(edge.probability) + Math.log(likelihood);
          target.set(nextMonitorStateId, logAddExp(target.get(nextMonitorStateId) ?? Number.NEGATIVE_INFINITY, logMass));
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
          calibratedEvidenceLikelihoods: prepared.evidenceRows[step + 1]!.map((entry) => ({ ...entry })),
          prefixEvidenceProbability: 0,
          prefixLogEvidenceProbability: null,
          prefixEvidenceProbabilityUnderflowed: false,
          jointHiddenMonitorDistribution: null,
          monitorDistribution: null
        });
        return { ok: true, forward: { alphas, trajectory, evidenceLogProbability: null, impossibleAtStep: step + 1 } };
      }
      const view = probabilityView(logEvidence);
      trajectory.push({
        step: step + 1,
        calibratedEvidenceLikelihoods: prepared.evidenceRows[step + 1]!.map((entry) => ({ ...entry })),
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
      evidenceLogProbability: logEvidence === Number.NEGATIVE_INFINITY ? null : logEvidence,
      impossibleAtStep: logEvidence === Number.NEGATIVE_INFINITY ? request.horizon : null
    }
  };
}

function makeDiagnostics(prepared: Prepared, forward: ForwardInternal): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceDiagnostics {
  return {
    method: 'sparse_log_augmented_hidden_monitor_calibrated_evidence_dynamic_programming',
    numericRepresentation: 'javascript_number_float64_with_log_mass',
    simulationUsed: false,
    approximationUsed: false,
    monitorDeterministic: true,
    monitorStateDomain: 'finite_unique_string_identifiers',
    evidenceSemantics: 'absolute_calibrated_local_likelihood',
    evidenceFactorization: 'state_local_conditionally_independent_by_time',
    absoluteEvidenceScalePreserved: true,
    inputNormalizationApplied: false,
    terminalSemantics: 'implicit_self_retention_with_monitor_update_each_remaining_step',
    parallelTransitionSemantics: 'monitor_observes_hidden_state_pair_not_parallel_edge_identity',
    probabilityTolerance: prepared.resolved.probabilityTolerance,
    pairwiseConsistencyTolerance: prepared.resolved.pairwiseConsistencyTolerance,
    expectedCountTolerance: prepared.resolved.expectedCountTolerance,
    maxObservations: prepared.resolved.maxObservations,
    maxMonitorStates: prepared.resolved.maxMonitorStates,
    maxAugmentedStates: prepared.resolved.maxAugmentedStates,
    evidenceStepsRequested: prepared.evidenceRows.length,
    evidenceStepsProcessed: forward.impossibleAtStep === null ? prepared.evidenceRows.length : forward.impossibleAtStep + 1,
    impossibleAtStep: forward.impossibleAtStep,
    evidenceProbabilityUnderflowed: forward.evidenceLogProbability !== null && directProbability(forward.evidenceLogProbability) === null,
    candidateZValidationReused: true,
    existingQualifiedRequestTypesModified: false,
    parameterLearningUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    causalInterventionUsed: false
  };
}

function finalJointMonitor(prepared: Prepared, forward: ForwardInternal): DeterministicTrajectoryMonitorJointFinalAtom[] {
  const logEvidence = forward.evidenceLogProbability!;
  const final = forward.alphas[forward.alphas.length - 1]!;
  return prepared.monitorStates.flatMap((monitorStateId) => {
    let logJointProbability = Number.NEGATIVE_INFINITY;
    for (const stateId of prepared.stateIds) {
      logJointProbability = logAddExp(logJointProbability, final.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY);
    }
    if (logJointProbability === Number.NEGATIVE_INFINITY) return [];
    const jointProbability = directProbability(logJointProbability);
    const logConditionalProbability = logJointProbability - logEvidence;
    const conditionalProbability = directProbability(logConditionalProbability);
    return [{
      monitorStateId,
      jointProbability,
      logJointProbability,
      jointProbabilityUnderflowed: jointProbability === null,
      conditionalProbability,
      logConditionalProbability,
      conditionalProbabilityUnderflowed: conditionalProbability === null
    }];
  });
}

export function analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  options: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceOptions = {}
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult {
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
      evidenceLikelihoods: prepared.evidenceRows,
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
    evidenceLikelihoods: prepared.evidenceRows,
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
): { ok: true; states: string[]; set: Set<string> } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  if (!Array.isArray(targetMonitorStates)) {
    return failure('invalid_deterministic_trajectory_monitor_request', 'targetMonitorStates must be an array', { path: 'request.targetMonitorStates' });
  }
  const known = new Set(monitorStates);
  const seen = new Set<string>();
  for (const monitorStateId of targetMonitorStates) {
    if (!known.has(monitorStateId)) {
      return failure('unknown_deterministic_trajectory_monitor_target_state', `Unknown target monitor state: ${monitorStateId}`, { monitorStateId });
    }
    if (seen.has(monitorStateId)) {
      return failure('duplicate_deterministic_trajectory_monitor_target_state', `Duplicate target monitor state: ${monitorStateId}`, { monitorStateId });
    }
    seen.add(monitorStateId);
  }
  const states = [...seen].sort(compareStrings);
  return { ok: true, states, set: new Set(states) };
}

function finalTargetLogMass(prepared: Prepared, forward: ForwardInternal, target: Set<string>): number {
  const final = forward.alphas[forward.alphas.length - 1]!;
  let total = Number.NEGATIVE_INFINITY;
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of target) {
      total = logAddExp(total, final.get(stateId)?.get(monitorStateId) ?? Number.NEGATIVE_INFINITY);
    }
  }
  return total;
}

function runBackward(
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  target: Set<string>
): { ok: true; betas: AugmentedLogState[] } | FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure {
  const betas: AugmentedLogState[] = Array.from({ length: request.horizon + 1 }, () => emptyAugmented(prepared));
  const final = emptyAugmented(prepared);
  for (const stateId of prepared.stateIds) {
    for (const monitorStateId of prepared.monitorStates) {
      if (target.has(monitorStateId)) final.get(stateId)!.set(monitorStateId, 0);
    }
  }
  betas[request.horizon] = final;
  for (let step = request.horizon - 1; step >= 0; step -= 1) {
    const current = emptyAugmented(prepared);
    const transitions = prepared.monitorTransitionMaps[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      for (const monitorStateId of prepared.monitorStates) {
        let total = Number.NEGATIVE_INFINITY;
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = nextEvidence.get(edge.to) ?? 0;
          if (edge.probability <= 0 || likelihood <= 0) continue;
          const nextMonitorStateId = transitions.get(monitorTransitionKey(monitorStateId, edge.from, edge.to));
          if (nextMonitorStateId === undefined) {
            return failure('internal_deterministic_trajectory_monitor_structural_inconsistency', 'Missing deterministic monitor transition during backward propagation', {
              step: step + 1, monitorStateId, fromStateId: edge.from, toStateId: edge.to
            });
          }
          const future = betas[step + 1]!.get(edge.to)?.get(nextMonitorStateId);
          if (future === undefined) continue;
          total = logAddExp(total, Math.log(edge.probability) + Math.log(likelihood) + future);
        }
        if (total !== Number.NEGATIVE_INFINITY) current.get(fromStateId)!.set(monitorStateId, total);
      }
    }
    betas[step] = current;
  }
  return { ok: true, betas };
}

function checkedMass(
  values: number[],
  tolerance: number,
  code: DeterministicTrajectoryMonitorFailureCode,
  message: string,
  step: number
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceFailure | undefined {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(code, message, { step, actual: total, expected: 1, tolerance });
  }
  return undefined;
}

function impossibleConditioning(
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  forward: ForwardInternal,
  targetStates: string[],
  monitorEvent: { possible: boolean; probability: number | null; logProbability: number | null },
  impossibility: DeterministicTrajectoryMonitorImpossibility
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningSuccess {
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
    evidenceProbability: evidencePossible ? directProbability(forward.evidenceLogProbability!) : 0,
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
      conditioningMethod: 'exact_terminal_monitor_set_log_forward_backward',
      jointEventProbabilityUnderflowed: false,
      evidenceOnlyPossible: evidencePossible,
      monitorEventOnlyPossible: monitorEvent.possible
    }
  };
}

export function conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningRequest,
  options: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceOptions = {}
): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult {
  const preparedResult = prepare(model, request, options);
  if (!preparedResult.ok) return preparedResult;
  const prepared = preparedResult.prepared;
  const targetResult = canonicalizeTarget(request.targetMonitorStates, prepared.monitorStates);
  if (!targetResult.ok) return targetResult;
  const forwardResult = runForward(request, prepared);
  if (!forwardResult.ok) return forwardResult;
  const forward = forwardResult.forward;
  const unconditionalResult = runForward(request, prepared, false);
  if (!unconditionalResult.ok) return unconditionalResult;
  const unconditionalLog = finalTargetLogMass(prepared, unconditionalResult.forward, targetResult.set);
  const monitorEvent = unconditionalLog === Number.NEGATIVE_INFINITY
    ? { possible: false, probability: 0, logProbability: null }
    : { possible: true, probability: directProbability(unconditionalLog), logProbability: unconditionalLog };
  if (forward.evidenceLogProbability === null) {
    return impossibleConditioning(request, prepared, forward, targetResult.states, monitorEvent, 'evidence');
  }
  if (!monitorEvent.possible) {
    return impossibleConditioning(request, prepared, forward, targetResult.states, monitorEvent, 'monitor_event');
  }
  const jointLog = finalTargetLogMass(prepared, forward, targetResult.set);
  if (jointLog === Number.NEGATIVE_INFINITY) {
    return impossibleConditioning(request, prepared, forward, targetResult.states, monitorEvent, 'joint');
  }
  if (!Number.isFinite(jointLog)) {
    return failure('non_finite_deterministic_trajectory_monitor_result', 'Combined monitor/evidence log probability is invalid', { actual: jointLog });
  }
  const backwardResult = runBackward(request, prepared, targetResult.set);
  if (!backwardResult.ok) return backwardResult;
  const betas = backwardResult.betas;
  const smoothingSteps: DeterministicTrajectoryMonitorConditionedSmoothingStep[] = [];
  for (let step = 0; step <= request.horizon; step += 1) {
    const jointHiddenMonitorDistribution: DeterministicTrajectoryMonitorConditionedJointAtom[] = [];
    const hidden = new Map<StateId, number>(prepared.stateIds.map((stateId) => [stateId, 0]));
    const monitor = new Map<string, number>(prepared.monitorStates.map((monitorStateId) => [monitorStateId, 0]));
    for (const stateId of prepared.stateIds) {
      for (const monitorStateId of prepared.monitorStates) {
        const alpha = forward.alphas[step]!.get(stateId)?.get(monitorStateId);
        const beta = betas[step]!.get(stateId)?.get(monitorStateId);
        const probability = alpha === undefined || beta === undefined ? 0 : Math.exp(alpha + beta - jointLog);
        if (!Number.isFinite(probability) || probability < 0) {
          return failure('non_finite_deterministic_trajectory_monitor_result', 'Combined smoothing probability is invalid', { step, stateId, monitorStateId, actual: probability });
        }
        jointHiddenMonitorDistribution.push({ stateId, monitorStateId, probability });
        hidden.set(stateId, (hidden.get(stateId) ?? 0) + probability);
        monitor.set(monitorStateId, (monitor.get(monitorStateId) ?? 0) + probability);
      }
    }
    const smoothingFailure = checkedMass(
      jointHiddenMonitorDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'deterministic_trajectory_monitor_conditioning_smoothing_mass_conservation_violation',
      `Combined hidden/monitor smoothing mass does not sum to one at step ${step}`,
      step
    );
    if (smoothingFailure !== undefined) return smoothingFailure;
    smoothingSteps.push({
      step,
      jointHiddenMonitorDistribution,
      hiddenStateDistribution: prepared.stateIds.map((stateId) => ({ stateId, probability: hidden.get(stateId) ?? 0 })),
      monitorStateDistribution: prepared.monitorStates.map((monitorStateId) => ({ monitorStateId, probability: monitor.get(monitorStateId) ?? 0 }))
    });
  }

  const pairwiseSteps: DeterministicTrajectoryMonitorConditionedPairwiseStep[] = [];
  const expectedCounts = new Map<string, number>(prepared.effectivePairs.map((edge) => [pairKey(edge.from, edge.to), 0]));
  for (let step = 0; step < request.horizon; step += 1) {
    const numeratorByPair = new Map<string, number>();
    const transitions = prepared.monitorTransitionMaps[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [monitorStateId, alphaLog] of forward.alphas[step]!.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = nextEvidence.get(edge.to) ?? 0;
          if (likelihood <= 0 || edge.probability <= 0) continue;
          const nextMonitorStateId = transitions.get(monitorTransitionKey(monitorStateId, edge.from, edge.to));
          if (nextMonitorStateId === undefined) {
            return failure('internal_deterministic_trajectory_monitor_structural_inconsistency', 'Missing monitor transition during pairwise conditioning', { step: step + 1, monitorStateId, fromStateId: edge.from, toStateId: edge.to });
          }
          const beta = betas[step + 1]!.get(edge.to)?.get(nextMonitorStateId);
          if (beta === undefined) continue;
          const key = pairKey(edge.from, edge.to);
          numeratorByPair.set(key, logAddExp(
            numeratorByPair.get(key) ?? Number.NEGATIVE_INFINITY,
            alphaLog + Math.log(edge.probability) + Math.log(likelihood) + beta
          ));
        }
      }
    }
    const pairwiseDistribution = prepared.effectivePairs.map((edge) => {
      const numerator = numeratorByPair.get(pairKey(edge.from, edge.to)) ?? Number.NEGATIVE_INFINITY;
      return {
        fromStateId: edge.from,
        toStateId: edge.to,
        probability: numerator === Number.NEGATIVE_INFINITY ? 0 : Math.exp(numerator - jointLog)
      };
    });
    const pairFailure = checkedMass(
      pairwiseDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'deterministic_trajectory_monitor_conditioning_pairwise_mass_conservation_violation',
      `Combined-event hidden-state pairwise mass does not sum to one at step ${step}`,
      step
    );
    if (pairFailure !== undefined) return pairFailure;
    for (const stateId of prepared.stateIds) {
      const rowMass = pairwiseDistribution.filter((entry) => entry.fromStateId === stateId).reduce((sum, entry) => sum + entry.probability, 0);
      const columnMass = pairwiseDistribution.filter((entry) => entry.toStateId === stateId).reduce((sum, entry) => sum + entry.probability, 0);
      const expectedRow = smoothingSteps[step]!.hiddenStateDistribution.find((entry) => entry.stateId === stateId)!.probability;
      const expectedColumn = smoothingSteps[step + 1]!.hiddenStateDistribution.find((entry) => entry.stateId === stateId)!.probability;
      if (
        Math.abs(rowMass - expectedRow) > prepared.resolved.pairwiseConsistencyTolerance ||
        Math.abs(columnMass - expectedColumn) > prepared.resolved.pairwiseConsistencyTolerance
      ) {
        return failure('deterministic_trajectory_monitor_conditioning_pairwise_marginal_consistency_violation', 'Combined-event hidden pairwise marginal mismatch', {
          step, stateId, tolerance: prepared.resolved.pairwiseConsistencyTolerance
        });
      }
    }
    for (const entry of pairwiseDistribution) {
      const key = pairKey(entry.fromStateId, entry.toStateId);
      expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + entry.probability);
    }
    pairwiseSteps.push({ step, pairwiseDistribution });
  }
  const expectedTransitionCounts = prepared.effectivePairs.map((edge) => ({
    fromStateId: edge.from,
    toStateId: edge.to,
    expectedCount: expectedCounts.get(pairKey(edge.from, edge.to)) ?? 0
  }));
  const totalExpectedCount = expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  if (Math.abs(totalExpectedCount - request.horizon) > prepared.resolved.expectedCountTolerance) {
    return failure('deterministic_trajectory_monitor_expected_transition_count_conservation_violation', 'Combined-event expected hidden transition counts do not sum to horizon', {
      actual: totalExpectedCount, expected: request.horizon, tolerance: prepared.resolved.expectedCountTolerance
    });
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
      conditioningMethod: 'exact_terminal_monitor_set_log_forward_backward',
      jointEventProbabilityUnderflowed: jointEventProbability === null,
      evidenceOnlyPossible: true,
      monitorEventOnlyPossible: true
    }
  };
}

type NonFiniteNumberLocation = { path: string; value: number };

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? undefined : { path, value };
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

export function finiteDeterministicTrajectoryMonitorCalibratedEvidenceResultToJson(
  result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AC analysis result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}

export function finiteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResultToJson(
  result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AC conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}
