import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteFirstPassageFailure,
  analyzeFiniteHorizonFirstPassage
} from './first_passage';

export type FirstPassageCandidateValue = string | number | boolean | null;

export type FiniteFirstPassageCandidate = {
  candidateId: string;
  model: DefinitionModel;
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  targetStates: StateId[];
  value?: FirstPassageCandidateValue;
};

export type FiniteFirstPassageCandidateObservation =
  | {
      kind: 'exact_hit_at_step';
      step: number;
    }
  | {
      kind: 'not_hit_by_horizon';
      horizon: number;
    };

export type FiniteFirstPassageCandidateInferenceRequest = {
  candidates: FiniteFirstPassageCandidate[];
  observation: FiniteFirstPassageCandidateObservation;
};

export type FiniteFirstPassageCandidateInferenceOptions = {
  probabilityTolerance?: number;
  comparisonTolerance?: number;
  maxCandidates?: number;
  maxHorizon?: number;
};

export type FirstPassageCandidateInferenceFailureCode =
  | 'invalid_options'
  | 'invalid_candidate_family'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_candidate_value'
  | 'invalid_observation'
  | 'candidate_evaluation_failed'
  | 'non_finite_analytical_result';

export type FirstPassageCandidateInferenceFailure = {
  code: FirstPassageCandidateInferenceFailureCode;
  message: string;
  path?: string;
  candidateId?: string;
  candidateFailure?: FiniteFirstPassageFailure;
};

export type FirstPassageCandidateLikelihood = {
  candidateId: string;
  value?: FirstPassageCandidateValue;
  possible: boolean;
  logLikelihood: number | null;
  eventProbability: number | null;
  eventProbabilityUnderflowed: boolean;
  logLikelihoodDeltaFromBest: number | null;
  maximumLikelihood: boolean;
};

export type FirstPassageCandidateSelection = {
  candidateId: string;
  value?: FirstPassageCandidateValue;
};

export type FirstPassageCandidateInferenceClassification =
  | 'unique_maximum_likelihood'
  | 'tied_maximum_likelihood'
  | 'all_candidates_impossible';

export type FiniteFirstPassageCandidateInferenceDiagnostics = {
  method: 'finite_candidate_first_passage_log_likelihood_comparison';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  rankingBasis: 'finite_log_likelihood';
  stableLikelihoodMethod: 'log_domain_killed_probability_mass';
  observationKind: FiniteFirstPassageCandidateObservation['kind'];
  observationStepOrHorizon: number;
  comparisonTolerance: number;
  probabilityTolerance: number;
  maxCandidates: number;
  maxHorizon: number;
  candidateCount: number;
  possibleCandidateCount: number;
  impossibleCandidateCount: number;
  posteriorNormalizationApplied: false;
  candidatePriorUsed: false;
  candidatePosteriorComputed: false;
  infiniteHorizonClaimed: false;
  globalModelIdentificationClaimed: false;
  candidateOrderAffectsSelection: false;
};

export type FiniteFirstPassageCandidateInferenceSuccess = {
  ok: true;
  observation: FiniteFirstPassageCandidateObservation;
  classification: FirstPassageCandidateInferenceClassification;
  evaluations: FirstPassageCandidateLikelihood[];
  bestLogLikelihood: number | null;
  selectedCandidateIds: string[];
  selectedCandidates: FirstPassageCandidateSelection[];
  diagnostics: FiniteFirstPassageCandidateInferenceDiagnostics;
};

export type FiniteFirstPassageCandidateInferenceFailure = {
  ok: false;
  failure: FirstPassageCandidateInferenceFailure;
};

export type FiniteFirstPassageCandidateInferenceResult =
  | FiniteFirstPassageCandidateInferenceSuccess
  | FiniteFirstPassageCandidateInferenceFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_COMPARISON_TOLERANCE = 1e-12;
const DEFAULT_MAX_CANDIDATES = 1_000;
const DEFAULT_MAX_HORIZON = 10_000;
const LOG_ZERO = Number.NEGATIVE_INFINITY;

type ResolvedOptions = {
  probabilityTolerance: number;
  comparisonTolerance: number;
  maxCandidates: number;
  maxHorizon: number;
};

type TransitionEdge = {
  to: StateId;
  probability: number;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: FirstPassageCandidateInferenceFailureCode,
  message: string,
  details: Omit<FirstPassageCandidateInferenceFailure, 'code' | 'message'> = {}
): FiniteFirstPassageCandidateInferenceFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveOptions(
  options: FiniteFirstPassageCandidateInferenceOptions
): ResolvedOptions | FiniteFirstPassageCandidateInferenceFailure {
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

  const maxHorizon = options.maxHorizon ?? DEFAULT_MAX_HORIZON;
  if (!Number.isInteger(maxHorizon) || maxHorizon < 0) {
    return failure('invalid_options', 'maxHorizon must be a non-negative integer', {
      path: 'options.maxHorizon'
    });
  }

  return {
    probabilityTolerance,
    comparisonTolerance,
    maxCandidates,
    maxHorizon
  };
}

function isFailure(
  value: ResolvedOptions | FiniteFirstPassageCandidateInferenceFailure
): value is FiniteFirstPassageCandidateInferenceFailure {
  return 'ok' in value && value.ok === false;
}

function observationHorizon(observation: FiniteFirstPassageCandidateObservation): number {
  return observation.kind === 'exact_hit_at_step' ? observation.step : observation.horizon;
}

function validateRequest(
  request: FiniteFirstPassageCandidateInferenceRequest,
  options: ResolvedOptions
): FiniteFirstPassageCandidateInferenceFailure | undefined {
  if (!Array.isArray(request.candidates) || request.candidates.length === 0) {
    return failure('invalid_candidate_family', 'candidates must be a non-empty array', {
      path: 'request.candidates'
    });
  }
  if (request.candidates.length > options.maxCandidates) {
    return failure(
      'candidate_count_exceeds_limit',
      `Candidate count ${request.candidates.length} exceeds maxCandidates ${options.maxCandidates}`,
      { path: 'request.candidates' }
    );
  }

  const observation = request.observation as Partial<FiniteFirstPassageCandidateObservation> | null;
  if (observation === null || typeof observation !== 'object') {
    return failure('invalid_observation', 'observation must be an object', {
      path: 'request.observation'
    });
  }
  if (observation.kind !== 'exact_hit_at_step' && observation.kind !== 'not_hit_by_horizon') {
    return failure(
      'invalid_observation',
      'observation.kind must be exact_hit_at_step or not_hit_by_horizon',
      { path: 'request.observation.kind' }
    );
  }

  const horizon =
    observation.kind === 'exact_hit_at_step'
      ? (observation as { step?: unknown }).step
      : (observation as { horizon?: unknown }).horizon;
  if (typeof horizon !== 'number' || !Number.isInteger(horizon) || horizon < 0) {
    return failure(
      'invalid_observation',
      observation.kind === 'exact_hit_at_step'
        ? 'observation.step must be a non-negative integer'
        : 'observation.horizon must be a non-negative integer',
      {
        path:
          observation.kind === 'exact_hit_at_step'
            ? 'request.observation.step'
            : 'request.observation.horizon'
      }
    );
  }
  if (horizon > options.maxHorizon) {
    return failure(
      'invalid_observation',
      `Observation horizon ${horizon} exceeds maxHorizon ${options.maxHorizon}`,
      { path: 'request.observation' }
    );
  }

  const seen = new Set<string>();
  for (let index = 0; index < request.candidates.length; index += 1) {
    const candidate = request.candidates[index];
    if (
      candidate === undefined ||
      typeof candidate.candidateId !== 'string' ||
      candidate.candidateId.trim().length === 0
    ) {
      return failure(
        'invalid_candidate_family',
        `candidates[${index}].candidateId must be a non-empty string`,
        { path: `request.candidates[${index}].candidateId` }
      );
    }
    if (seen.has(candidate.candidateId)) {
      return failure('duplicate_candidate_id', `Duplicate candidateId: ${candidate.candidateId}`, {
        path: `request.candidates[${index}].candidateId`,
        candidateId: candidate.candidateId
      });
    }
    seen.add(candidate.candidateId);

    if (typeof candidate.value === 'number' && !Number.isFinite(candidate.value)) {
      return failure('invalid_candidate_value', `Candidate value must be finite: ${String(candidate.value)}`, {
        path: `request.candidates[${index}].value`,
        candidateId: candidate.candidateId
      });
    }
    if (
      candidate.value !== undefined &&
      candidate.value !== null &&
      typeof candidate.value !== 'string' &&
      typeof candidate.value !== 'number' &&
      typeof candidate.value !== 'boolean'
    ) {
      return failure('invalid_candidate_value', 'Candidate value must be a JSON scalar', {
        path: `request.candidates[${index}].value`,
        candidateId: candidate.candidateId
      });
    }
  }

  return undefined;
}

function logAddExp(left: number, right: number): number {
  if (left === LOG_ZERO) return right;
  if (right === LOG_ZERO) return left;
  const maximum = Math.max(left, right);
  return maximum + Math.log(Math.exp(left - maximum) + Math.exp(right - maximum));
}

function logSumExp(values: Iterable<number>): number {
  let total = LOG_ZERO;
  for (const value of values) total = logAddExp(total, value);
  return total;
}

function buildTransitionRows(
  model: DefinitionModel,
  stateIds: StateId[]
): Map<StateId, TransitionEdge[]> {
  const rows = new Map<StateId, TransitionEdge[]>();
  for (const stateId of stateIds) rows.set(stateId, []);

  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
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

function stableFirstPassageEventLogLikelihood(
  candidate: FiniteFirstPassageCandidate,
  observation: FiniteFirstPassageCandidateObservation
): number | null {
  const stateIds = candidate.model.states
    .map((state) => state.id)
    .sort(compareStrings);
  const targets = new Set(candidate.targetStates);
  const initialByState = new Map<StateId, number>();
  for (const stateId of stateIds) initialByState.set(stateId, 0);
  for (const entry of candidate.initialDistribution) {
    initialByState.set(entry.stateId, entry.probability);
  }

  const initialTargetLogLikelihood = logSumExp(
    [...targets].map((stateId) => {
      const probability = initialByState.get(stateId) ?? 0;
      return probability > 0 ? Math.log(probability) : LOG_ZERO;
    })
  );

  if (observation.kind === 'exact_hit_at_step' && observation.step === 0) {
    return initialTargetLogLikelihood === LOG_ZERO ? null : initialTargetLogLikelihood;
  }

  let survivorLogMass = new Map<StateId, number>();
  for (const stateId of stateIds) {
    if (targets.has(stateId)) continue;
    const probability = initialByState.get(stateId) ?? 0;
    survivorLogMass.set(stateId, probability > 0 ? Math.log(probability) : LOG_ZERO);
  }

  if (observation.kind === 'not_hit_by_horizon' && observation.horizon === 0) {
    const logLikelihood = logSumExp(survivorLogMass.values());
    return logLikelihood === LOG_ZERO ? null : logLikelihood;
  }

  const rows = buildTransitionRows(candidate.model, stateIds);
  const horizon = observationHorizon(observation);
  for (let step = 1; step <= horizon; step += 1) {
    const nextSurvivorLogMass = new Map<StateId, number>();
    for (const stateId of stateIds) {
      if (!targets.has(stateId)) nextSurvivorLogMass.set(stateId, LOG_ZERO);
    }
    let firstHitLogLikelihood = LOG_ZERO;

    for (const from of stateIds) {
      if (targets.has(from)) continue;
      const fromLogMass = survivorLogMass.get(from) ?? LOG_ZERO;
      if (fromLogMass === LOG_ZERO) continue;

      for (const edge of rows.get(from) ?? []) {
        if (edge.probability <= 0) continue;
        const contribution = fromLogMass + Math.log(edge.probability);
        if (targets.has(edge.to)) {
          firstHitLogLikelihood = logAddExp(firstHitLogLikelihood, contribution);
        } else {
          nextSurvivorLogMass.set(
            edge.to,
            logAddExp(nextSurvivorLogMass.get(edge.to) ?? LOG_ZERO, contribution)
          );
        }
      }
    }

    if (observation.kind === 'exact_hit_at_step' && step === observation.step) {
      return firstHitLogLikelihood === LOG_ZERO ? null : firstHitLogLikelihood;
    }

    survivorLogMass = nextSurvivorLogMass;
  }

  if (observation.kind === 'not_hit_by_horizon') {
    const logLikelihood = logSumExp(survivorLogMass.values());
    return logLikelihood === LOG_ZERO ? null : logLikelihood;
  }

  return null;
}

export function inferFiniteFirstPassageCandidates(
  request: FiniteFirstPassageCandidateInferenceRequest,
  options: FiniteFirstPassageCandidateInferenceOptions = {}
): FiniteFirstPassageCandidateInferenceResult {
  const resolved = resolveOptions(options);
  if (isFailure(resolved)) return resolved;
  const invalidRequest = validateRequest(request, resolved);
  if (invalidRequest !== undefined) return invalidRequest;

  const candidates = [...request.candidates].sort((left, right) =>
    compareStrings(left.candidateId, right.candidateId)
  );
  const horizon = observationHorizon(request.observation);

  const preliminary: Array<
    Omit<FirstPassageCandidateLikelihood, 'logLikelihoodDeltaFromBest' | 'maximumLikelihood'>
  > = [];

  for (const candidate of candidates) {
    const forward = analyzeFiniteHorizonFirstPassage(
      candidate.model,
      {
        initialDistribution: candidate.initialDistribution,
        targetStates: candidate.targetStates,
        horizon
      },
      {
        probabilityTolerance: resolved.probabilityTolerance,
        maxHorizon: resolved.maxHorizon
      }
    );

    if (!forward.ok) {
      return failure(
        'candidate_evaluation_failed',
        `Candidate ${candidate.candidateId} failed first-passage evaluation: ${forward.failure.message}`,
        {
          path: 'request.candidates',
          candidateId: candidate.candidateId,
          candidateFailure: forward.failure
        }
      );
    }

    const logLikelihood = stableFirstPassageEventLogLikelihood(candidate, request.observation);
    if (logLikelihood !== null && !Number.isFinite(logLikelihood)) {
      return failure(
        'non_finite_analytical_result',
        `Candidate ${candidate.candidateId} produced a non-finite first-passage log likelihood`,
        { candidateId: candidate.candidateId }
      );
    }

    const possible = logLikelihood !== null;
    const eventProbability = possible ? Math.exp(logLikelihood) : null;
    if (eventProbability !== null && (!Number.isFinite(eventProbability) || eventProbability < 0)) {
      return failure(
        'non_finite_analytical_result',
        `Candidate ${candidate.candidateId} produced an invalid representable event probability`,
        { candidateId: candidate.candidateId }
      );
    }

    preliminary.push({
      candidateId: candidate.candidateId,
      ...(candidate.value !== undefined ? { value: candidate.value } : {}),
      possible,
      logLikelihood,
      eventProbability,
      eventProbabilityUnderflowed: possible && eventProbability === 0
    });
  }

  const possible = preliminary.filter(
    (evaluation): evaluation is typeof evaluation & { logLikelihood: number } =>
      evaluation.possible && evaluation.logLikelihood !== null
  );

  let bestLogLikelihood: number | null = null;
  if (possible.length > 0) {
    bestLogLikelihood = Math.max(...possible.map((evaluation) => evaluation.logLikelihood));
    if (!Number.isFinite(bestLogLikelihood)) {
      return failure('non_finite_analytical_result', 'Best candidate log likelihood became non-finite');
    }
  }

  const evaluations: FirstPassageCandidateLikelihood[] = preliminary.map((evaluation) => {
    if (!evaluation.possible || evaluation.logLikelihood === null || bestLogLikelihood === null) {
      return {
        ...evaluation,
        logLikelihoodDeltaFromBest: null,
        maximumLikelihood: false
      };
    }
    const delta = evaluation.logLikelihood - bestLogLikelihood;
    if (!Number.isFinite(delta)) {
      return {
        ...evaluation,
        logLikelihoodDeltaFromBest: null,
        maximumLikelihood: false
      };
    }
    return {
      ...evaluation,
      logLikelihoodDeltaFromBest: delta,
      maximumLikelihood: Math.abs(delta) <= resolved.comparisonTolerance
    };
  });

  if (
    evaluations.some(
      (evaluation) =>
        evaluation.possible && evaluation.logLikelihoodDeltaFromBest === null && bestLogLikelihood !== null
    )
  ) {
    return failure('non_finite_analytical_result', 'Candidate log-likelihood delta became non-finite');
  }

  const selected = evaluations.filter((evaluation) => evaluation.maximumLikelihood);
  const classification: FirstPassageCandidateInferenceClassification =
    possible.length === 0
      ? 'all_candidates_impossible'
      : selected.length === 1
        ? 'unique_maximum_likelihood'
        : 'tied_maximum_likelihood';

  return {
    ok: true,
    observation: { ...request.observation },
    classification,
    evaluations,
    bestLogLikelihood,
    selectedCandidateIds: selected.map((evaluation) => evaluation.candidateId),
    selectedCandidates: selected.map((evaluation) => ({
      candidateId: evaluation.candidateId,
      ...(evaluation.value !== undefined ? { value: evaluation.value } : {})
    })),
    diagnostics: {
      method: 'finite_candidate_first_passage_log_likelihood_comparison',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      rankingBasis: 'finite_log_likelihood',
      stableLikelihoodMethod: 'log_domain_killed_probability_mass',
      observationKind: request.observation.kind,
      observationStepOrHorizon: horizon,
      comparisonTolerance: resolved.comparisonTolerance,
      probabilityTolerance: resolved.probabilityTolerance,
      maxCandidates: resolved.maxCandidates,
      maxHorizon: resolved.maxHorizon,
      candidateCount: candidates.length,
      possibleCandidateCount: possible.length,
      impossibleCandidateCount: candidates.length - possible.length,
      posteriorNormalizationApplied: false,
      candidatePriorUsed: false,
      candidatePosteriorComputed: false,
      infiniteHorizonClaimed: false,
      globalModelIdentificationClaimed: false,
      candidateOrderAffectsSelection: false
    }
  };
}

type NonFiniteNumberLocation = {
  path: string;
  value: number;
};

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
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

export function finiteFirstPassageCandidateInferenceResultToJson(
  result: FiniteFirstPassageCandidateInferenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite first-passage candidate-inference result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
