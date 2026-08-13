import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHiddenStateObservationFailure,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteFirstPassageFailureResult,
  analyzeFiniteHorizonFirstPassage
} from './first_passage';

export type SameTrajectoryJointCandidateValue = string | number | boolean | null;

export type SameTrajectoryFirstPassageCondition =
  | { kind: 'exact_hit_at_step'; step: number }
  | { kind: 'not_hit_by_observation_horizon' };

export type FiniteSameTrajectoryJointCandidate = {
  candidateId: string;
  model: DefinitionModel;
  initialDistribution: Array<{ stateId: StateId; probability: number }>;
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
  targetStates: StateId[];
  value?: SameTrajectoryJointCandidateValue;
};

export type FiniteSameTrajectoryJointInferenceRequest = {
  candidates: FiniteSameTrajectoryJointCandidate[];
  observations: string[];
  passageCondition: SameTrajectoryFirstPassageCondition;
};

export type FiniteSameTrajectoryJointInferenceOptions = {
  probabilityTolerance?: number;
  comparisonTolerance?: number;
  maxCandidates?: number;
  maxObservations?: number;
};

export type SameTrajectoryJointInferenceFailureCode =
  | 'invalid_options'
  | 'invalid_candidate_family'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_candidate_value'
  | 'invalid_observation_sequence'
  | 'observation_sequence_exceeds_limit'
  | 'invalid_passage_condition'
  | 'candidate_validation_failed'
  | 'non_finite_analytical_result';

export type SameTrajectoryJointInferenceFailure = {
  code: SameTrajectoryJointInferenceFailureCode;
  message: string;
  path?: string;
  candidateId?: string;
  step?: number;
  hiddenObservationFailure?: FiniteHiddenStateObservationFailure;
  firstPassageFailure?: FiniteFirstPassageFailureResult;
};

export type SameTrajectoryJointCandidateLikelihood = {
  candidateId: string;
  value?: SameTrajectoryJointCandidateValue;
  possible: boolean;
  jointLogLikelihood: number | null;
  jointProbability: number | null;
  jointProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  logLikelihoodDeltaFromBest: number | null;
  maximumLikelihood: boolean;
};

export type SameTrajectoryJointCandidateSelection = {
  candidateId: string;
  value?: SameTrajectoryJointCandidateValue;
};

export type SameTrajectoryJointInferenceClassification =
  | 'unique_maximum_likelihood'
  | 'tied_maximum_likelihood'
  | 'all_candidates_impossible';

export type FiniteSameTrajectoryJointInferenceDiagnostics = {
  method: 'scaled_same_trajectory_hidden_observation_first_passage_joint_forward';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  rankingBasis: 'finite_joint_log_likelihood';
  timeConvention: 'emit_at_step_0_then_transition_and_emit';
  firstPassageConvention: 'first_entry_includes_step_0';
  targetSemantics: 'same_trajectory_joint_constraint_without_mutating_source_model';
  terminalSemantics: 'implicit_self_retention';
  sameTrajectoryJointLikelihoodComputed: true;
  marginalIndependenceAssumed: false;
  naiveMarginalProductUsed: false;
  posteriorNormalizationApplied: false;
  candidatePriorUsed: false;
  candidatePosteriorComputed: false;
  globalModelIdentificationClaimed: false;
  candidateOrderAffectsSelection: false;
  probabilityTolerance: number;
  comparisonTolerance: number;
  maxCandidates: number;
  maxObservations: number;
  candidateCount: number;
  observationCount: number;
  observationHorizon: number;
  possibleCandidateCount: number;
  impossibleCandidateCount: number;
};

export type FiniteSameTrajectoryJointInferenceSuccess = {
  ok: true;
  observations: string[];
  passageCondition: SameTrajectoryFirstPassageCondition;
  classification: SameTrajectoryJointInferenceClassification;
  evaluations: SameTrajectoryJointCandidateLikelihood[];
  bestLogLikelihood: number | null;
  selectedCandidateIds: string[];
  selectedCandidates: SameTrajectoryJointCandidateSelection[];
  diagnostics: FiniteSameTrajectoryJointInferenceDiagnostics;
};

export type FiniteSameTrajectoryJointInferenceFailure = {
  ok: false;
  failure: SameTrajectoryJointInferenceFailure;
};

export type FiniteSameTrajectoryJointInferenceResult =
  | FiniteSameTrajectoryJointInferenceSuccess
  | FiniteSameTrajectoryJointInferenceFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_COMPARISON_TOLERANCE = 1e-12;
const DEFAULT_MAX_CANDIDATES = 1_000;
const DEFAULT_MAX_OBSERVATIONS = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  comparisonTolerance: number;
  maxCandidates: number;
  maxObservations: number;
};

type TransitionEdge = { to: StateId; probability: number };

type PreliminaryEvaluation = Omit<
  SameTrajectoryJointCandidateLikelihood,
  'logLikelihoodDeltaFromBest' | 'maximumLikelihood'
>;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: SameTrajectoryJointInferenceFailureCode,
  message: string,
  details: Omit<SameTrajectoryJointInferenceFailure, 'code' | 'message'> = {}
): FiniteSameTrajectoryJointInferenceFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveOptions(
  options: FiniteSameTrajectoryJointInferenceOptions
): ResolvedOptions | FiniteSameTrajectoryJointInferenceFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure('invalid_options', 'probabilityTolerance must be a finite positive number', {
      path: 'options.probabilityTolerance'
    });
  }
  const comparisonTolerance = options.comparisonTolerance ?? DEFAULT_COMPARISON_TOLERANCE;
  if (!Number.isFinite(comparisonTolerance) || comparisonTolerance < 0) {
    return failure('invalid_options', 'comparisonTolerance must be a finite non-negative number', {
      path: 'options.comparisonTolerance'
    });
  }
  const maxCandidates = options.maxCandidates ?? DEFAULT_MAX_CANDIDATES;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) {
    return failure('invalid_options', 'maxCandidates must be a positive integer', {
      path: 'options.maxCandidates'
    });
  }
  const maxObservations = options.maxObservations ?? DEFAULT_MAX_OBSERVATIONS;
  if (!Number.isInteger(maxObservations) || maxObservations < 1) {
    return failure('invalid_options', 'maxObservations must be a positive integer', {
      path: 'options.maxObservations'
    });
  }
  return { probabilityTolerance, comparisonTolerance, maxCandidates, maxObservations };
}

function isResolvedFailure(
  value: ResolvedOptions | FiniteSameTrajectoryJointInferenceFailure
): value is FiniteSameTrajectoryJointInferenceFailure {
  return 'ok' in value && value.ok === false;
}

function isJsonScalar(value: unknown): value is SameTrajectoryJointCandidateValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

function validateRequest(
  request: FiniteSameTrajectoryJointInferenceRequest,
  options: ResolvedOptions
): FiniteSameTrajectoryJointInferenceFailure | undefined {
  if (!Array.isArray(request.candidates) || request.candidates.length === 0) {
    return failure('invalid_candidate_family', 'candidates must be a non-empty array', {
      path: 'request.candidates'
    });
  }
  if (request.candidates.length > options.maxCandidates) {
    return failure(
      'candidate_count_exceeds_limit',
      `candidate count ${request.candidates.length} exceeds maxCandidates ${options.maxCandidates}`,
      { path: 'request.candidates' }
    );
  }

  const seen = new Set<string>();
  for (let index = 0; index < request.candidates.length; index += 1) {
    const candidate = request.candidates[index];
    if (candidate === undefined || typeof candidate.candidateId !== 'string' || candidate.candidateId.trim().length === 0) {
      return failure('invalid_candidate_family', `candidates[${index}].candidateId must be a non-empty string`, {
        path: `request.candidates[${index}].candidateId`
      });
    }
    if (seen.has(candidate.candidateId)) {
      return failure('duplicate_candidate_id', `Duplicate candidateId: ${candidate.candidateId}`, {
        path: `request.candidates[${index}].candidateId`,
        candidateId: candidate.candidateId
      });
    }
    seen.add(candidate.candidateId);
    if ('value' in candidate && candidate.value !== undefined && !isJsonScalar(candidate.value)) {
      return failure('invalid_candidate_value', `Candidate ${candidate.candidateId} value must be a finite JSON scalar`, {
        path: `request.candidates[${index}].value`,
        candidateId: candidate.candidateId
      });
    }
  }

  if (!Array.isArray(request.observations) || request.observations.length === 0) {
    return failure('invalid_observation_sequence', 'observations must be a non-empty array', {
      path: 'request.observations'
    });
  }
  if (request.observations.length > options.maxObservations) {
    return failure(
      'observation_sequence_exceeds_limit',
      `observation count ${request.observations.length} exceeds maxObservations ${options.maxObservations}`,
      { path: 'request.observations' }
    );
  }

  const condition = request.passageCondition;
  if (condition === null || typeof condition !== 'object' || !('kind' in condition)) {
    return failure('invalid_passage_condition', 'passageCondition must be an object with a supported kind', {
      path: 'request.passageCondition'
    });
  }
  const horizon = request.observations.length - 1;
  if (condition.kind === 'exact_hit_at_step') {
    if (!Number.isInteger(condition.step) || condition.step < 0 || condition.step > horizon) {
      return failure(
        'invalid_passage_condition',
        `exact_hit_at_step.step must be an integer from 0 through observation horizon ${horizon}`,
        { path: 'request.passageCondition.step' }
      );
    }
    return undefined;
  }
  if (condition.kind === 'not_hit_by_observation_horizon') return undefined;
  return failure('invalid_passage_condition', 'Unsupported passageCondition kind', {
    path: 'request.passageCondition.kind'
  });
}

function buildTransitionRows(
  model: DefinitionModel,
  stateIds: StateId[]
): Map<StateId, TransitionEdge[]> {
  const rows = new Map<StateId, TransitionEdge[]>();
  for (const stateId of stateIds) {
    const state = model.states.find((entry) => entry.id === stateId);
    if (state !== undefined && isTerminalState(state)) {
      rows.set(stateId, [{ to: stateId, probability: 1 }]);
      continue;
    }
    const aggregate = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
    }
    rows.set(
      stateId,
      [...aggregate.entries()]
        .map(([to, probability]) => ({ to, probability }))
        .sort((left, right) => compareStrings(left.to, right.to))
    );
  }
  return rows;
}

function initialMap(candidate: FiniteSameTrajectoryJointCandidate, stateIds: StateId[]): Map<StateId, number> {
  const result = new Map<StateId, number>();
  for (const stateId of stateIds) result.set(stateId, 0);
  for (const entry of candidate.initialDistribution) result.set(entry.stateId, entry.probability);
  return result;
}

function kernelMap(candidate: FiniteSameTrajectoryJointCandidate): Map<StateId, Map<string, number>> {
  const result = new Map<StateId, Map<string, number>>();
  for (const entry of candidate.kernel) {
    let row = result.get(entry.stateId);
    if (row === undefined) {
      row = new Map<string, number>();
      result.set(entry.stateId, row);
    }
    row.set(entry.symbol, entry.probability);
  }
  return result;
}

function passageAllowsState(
  targetSet: Set<StateId>,
  condition: SameTrajectoryFirstPassageCondition,
  step: number
): (stateId: StateId) => boolean {
  if (condition.kind === 'not_hit_by_observation_horizon') {
    return (stateId) => !targetSet.has(stateId);
  }
  if (step < condition.step) return (stateId) => !targetSet.has(stateId);
  if (step === condition.step) return (stateId) => targetSet.has(stateId);
  return () => true;
}

function predict(
  stateIds: StateId[],
  posterior: Map<StateId, number>,
  rows: Map<StateId, TransitionEdge[]>
): Map<StateId, number> | FiniteSameTrajectoryJointInferenceFailure {
  const predicted = new Map<StateId, number>();
  for (const stateId of stateIds) predicted.set(stateId, 0);
  for (const from of stateIds) {
    const sourceMass = posterior.get(from) ?? 0;
    if (sourceMass === 0) continue;
    for (const edge of rows.get(from) ?? []) {
      const increment = sourceMass * edge.probability;
      if (!Number.isFinite(increment) || increment < 0) {
        return failure('non_finite_analytical_result', `Transition mass became invalid from ${from} to ${edge.to}`);
      }
      const next = (predicted.get(edge.to) ?? 0) + increment;
      if (!Number.isFinite(next) || next < 0) {
        return failure('non_finite_analytical_result', `Predicted mass became invalid for ${edge.to}`);
      }
      predicted.set(edge.to, next);
    }
  }
  return predicted;
}

function isPredictionFailure(
  value: Map<StateId, number> | FiniteSameTrajectoryJointInferenceFailure
): value is FiniteSameTrajectoryJointInferenceFailure {
  return 'ok' in value && value.ok === false;
}

function evaluateCandidate(
  candidate: FiniteSameTrajectoryJointCandidate,
  request: FiniteSameTrajectoryJointInferenceRequest,
  options: ResolvedOptions
): PreliminaryEvaluation | FiniteSameTrajectoryJointInferenceFailure {
  const hiddenValidation = filterFiniteHiddenStateObservationSequence(
    candidate.model,
    {
      initialDistribution: candidate.initialDistribution,
      alphabet: candidate.alphabet,
      kernel: candidate.kernel,
      observations: request.observations
    },
    {
      probabilityTolerance: options.probabilityTolerance,
      maxObservations: options.maxObservations
    }
  );
  if (!hiddenValidation.ok) {
    return failure(
      'candidate_validation_failed',
      `Candidate ${candidate.candidateId} failed hidden-observation validation: ${hiddenValidation.failure.message}`,
      { candidateId: candidate.candidateId, hiddenObservationFailure: hiddenValidation }
    );
  }

  const horizon = request.observations.length - 1;
  const passageValidation = analyzeFiniteHorizonFirstPassage(
    candidate.model,
    {
      initialDistribution: candidate.initialDistribution,
      targetStates: candidate.targetStates,
      horizon
    },
    { probabilityTolerance: options.probabilityTolerance, maxHorizon: horizon }
  );
  if (!passageValidation.ok) {
    return failure(
      'candidate_validation_failed',
      `Candidate ${candidate.candidateId} failed first-passage validation: ${passageValidation.failure.message}`,
      { candidateId: candidate.candidateId, firstPassageFailure: passageValidation }
    );
  }

  const stateIds = candidate.model.states.map((state) => state.id).sort(compareStrings);
  const targets = new Set(candidate.targetStates);
  const emissions = kernelMap(candidate);
  const rows = buildTransitionRows(candidate.model, stateIds);
  let posterior = initialMap(candidate, stateIds);
  let jointLogLikelihood = 0;

  for (let step = 0; step < request.observations.length; step += 1) {
    const observation = request.observations[step];
    if (observation === undefined) {
      return failure('invalid_observation_sequence', `Missing observation at step ${step}`, {
        path: `request.observations[${step}]`, step
      });
    }
    const predictive = step === 0 ? new Map(posterior) : predict(stateIds, posterior, rows);
    if (isPredictionFailure(predictive)) return predictive;
    const allowed = passageAllowsState(targets, request.passageCondition, step);
    const weighted = new Map<StateId, number>();
    let scale = 0;
    for (const stateId of stateIds) {
      const predictiveMass = predictive.get(stateId) ?? 0;
      const emissionProbability = emissions.get(stateId)?.get(observation) ?? 0;
      const value = allowed(stateId) ? predictiveMass * emissionProbability : 0;
      if (!Number.isFinite(value) || value < 0) {
        return failure(
          'non_finite_analytical_result',
          `Joint constrained mass became invalid for candidate ${candidate.candidateId} at step ${step}`,
          { candidateId: candidate.candidateId, step }
        );
      }
      weighted.set(stateId, value);
      scale += value;
    }
    if (!Number.isFinite(scale) || scale < 0 || scale > 1 + options.probabilityTolerance) {
      return failure(
        'non_finite_analytical_result',
        `Joint evidence scale became invalid for candidate ${candidate.candidateId} at step ${step}: ${String(scale)}`,
        { candidateId: candidate.candidateId, step }
      );
    }
    if (scale === 0) {
      return {
        candidateId: candidate.candidateId,
        ...(candidate.value !== undefined ? { value: candidate.value } : {}),
        possible: false,
        jointLogLikelihood: null,
        jointProbability: null,
        jointProbabilityUnderflowed: false,
        impossibleAtStep: step
      };
    }
    jointLogLikelihood += Math.log(scale);
    if (!Number.isFinite(jointLogLikelihood)) {
      return failure(
        'non_finite_analytical_result',
        `Joint log likelihood became non-finite for candidate ${candidate.candidateId} at step ${step}`,
        { candidateId: candidate.candidateId, step }
      );
    }
    const nextPosterior = new Map<StateId, number>();
    let posteriorTotal = 0;
    for (const stateId of stateIds) {
      const value = (weighted.get(stateId) ?? 0) / scale;
      if (!Number.isFinite(value) || value < 0) {
        return failure(
          'non_finite_analytical_result',
          `Normalized constrained mass became invalid for candidate ${candidate.candidateId} at step ${step}`,
          { candidateId: candidate.candidateId, step }
        );
      }
      nextPosterior.set(stateId, value);
      posteriorTotal += value;
    }
    if (!Number.isFinite(posteriorTotal) || Math.abs(posteriorTotal - 1) > options.probabilityTolerance) {
      return failure(
        'non_finite_analytical_result',
        `Normalized constrained mass failed conservation for candidate ${candidate.candidateId} at step ${step}: ${String(posteriorTotal)}`,
        { candidateId: candidate.candidateId, step }
      );
    }
    posterior = nextPosterior;
  }

  const jointProbability = Math.exp(jointLogLikelihood);
  if (!Number.isFinite(jointProbability) || jointProbability < 0) {
    return failure(
      'non_finite_analytical_result',
      `Joint probability became invalid for candidate ${candidate.candidateId}`,
      { candidateId: candidate.candidateId }
    );
  }
  return {
    candidateId: candidate.candidateId,
    ...(candidate.value !== undefined ? { value: candidate.value } : {}),
    possible: true,
    jointLogLikelihood,
    jointProbability,
    jointProbabilityUnderflowed: jointProbability === 0,
    impossibleAtStep: null
  };
}

function isEvaluationFailure(
  value: PreliminaryEvaluation | FiniteSameTrajectoryJointInferenceFailure
): value is FiniteSameTrajectoryJointInferenceFailure {
  return 'ok' in value && value.ok === false;
}

export function inferFiniteSameTrajectoryHiddenFirstPassageCandidates(
  request: FiniteSameTrajectoryJointInferenceRequest,
  options: FiniteSameTrajectoryJointInferenceOptions = {}
): FiniteSameTrajectoryJointInferenceResult {
  const resolved = resolveOptions(options);
  if (isResolvedFailure(resolved)) return resolved;
  const invalid = validateRequest(request, resolved);
  if (invalid !== undefined) return invalid;

  const candidates = [...request.candidates].sort((left, right) =>
    compareStrings(left.candidateId, right.candidateId)
  );
  const preliminary: PreliminaryEvaluation[] = [];
  for (const candidate of candidates) {
    const evaluated = evaluateCandidate(candidate, request, resolved);
    if (isEvaluationFailure(evaluated)) return evaluated;
    preliminary.push(evaluated);
  }

  const possible = preliminary.filter(
    (entry): entry is PreliminaryEvaluation & { jointLogLikelihood: number } =>
      entry.possible && entry.jointLogLikelihood !== null
  );
  let bestLogLikelihood: number | null = null;
  if (possible.length > 0) {
    bestLogLikelihood = Math.max(...possible.map((entry) => entry.jointLogLikelihood));
    if (!Number.isFinite(bestLogLikelihood)) {
      return failure('non_finite_analytical_result', 'Best joint log likelihood became non-finite');
    }
  }

  const evaluations: SameTrajectoryJointCandidateLikelihood[] = [];
  for (const entry of preliminary) {
    if (!entry.possible || entry.jointLogLikelihood === null || bestLogLikelihood === null) {
      evaluations.push({ ...entry, logLikelihoodDeltaFromBest: null, maximumLikelihood: false });
      continue;
    }
    const delta = entry.jointLogLikelihood - bestLogLikelihood;
    if (!Number.isFinite(delta)) {
      return failure(
        'non_finite_analytical_result',
        `Candidate log-likelihood delta became non-finite for ${entry.candidateId}`,
        { candidateId: entry.candidateId }
      );
    }
    evaluations.push({
      ...entry,
      logLikelihoodDeltaFromBest: delta,
      maximumLikelihood: Math.abs(delta) <= resolved.comparisonTolerance
    });
  }

  const selected = evaluations.filter((entry) => entry.maximumLikelihood);
  const classification: SameTrajectoryJointInferenceClassification =
    possible.length === 0
      ? 'all_candidates_impossible'
      : selected.length === 1
        ? 'unique_maximum_likelihood'
        : 'tied_maximum_likelihood';
  const horizon = request.observations.length - 1;

  return {
    ok: true,
    observations: [...request.observations],
    passageCondition: { ...request.passageCondition },
    classification,
    evaluations,
    bestLogLikelihood,
    selectedCandidateIds: selected.map((entry) => entry.candidateId),
    selectedCandidates: selected.map((entry) => ({
      candidateId: entry.candidateId,
      ...(entry.value !== undefined ? { value: entry.value } : {})
    })),
    diagnostics: {
      method: 'scaled_same_trajectory_hidden_observation_first_passage_joint_forward',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      inputNormalizationApplied: false,
      rankingBasis: 'finite_joint_log_likelihood',
      timeConvention: 'emit_at_step_0_then_transition_and_emit',
      firstPassageConvention: 'first_entry_includes_step_0',
      targetSemantics: 'same_trajectory_joint_constraint_without_mutating_source_model',
      terminalSemantics: 'implicit_self_retention',
      sameTrajectoryJointLikelihoodComputed: true,
      marginalIndependenceAssumed: false,
      naiveMarginalProductUsed: false,
      posteriorNormalizationApplied: false,
      candidatePriorUsed: false,
      candidatePosteriorComputed: false,
      globalModelIdentificationClaimed: false,
      candidateOrderAffectsSelection: false,
      probabilityTolerance: resolved.probabilityTolerance,
      comparisonTolerance: resolved.comparisonTolerance,
      maxCandidates: resolved.maxCandidates,
      maxObservations: resolved.maxObservations,
      candidateCount: candidates.length,
      observationCount: request.observations.length,
      observationHorizon: horizon,
      possibleCandidateCount: possible.length,
      impossibleCandidateCount: candidates.length - possible.length
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

export function finiteSameTrajectoryHiddenFirstPassageInferenceResultToJson(
  result: FiniteSameTrajectoryJointInferenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite same-trajectory joint inference result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
