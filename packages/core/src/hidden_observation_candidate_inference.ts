import { DefinitionModel, StateId } from './model';
import {
  FiniteHiddenStateObservationOptions,
  HiddenObservationKernelEntry,
  HiddenStateObservationFailure,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';

export type HiddenObservationCandidateValue = string | number | boolean | null;

export type FiniteHiddenObservationCandidate = {
  candidateId: string;
  model: DefinitionModel;
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
  value?: HiddenObservationCandidateValue;
};

export type FiniteHiddenObservationCandidateInferenceRequest = {
  candidates: FiniteHiddenObservationCandidate[];
  observations: string[];
};

export type FiniteHiddenObservationCandidateInferenceOptions =
  FiniteHiddenStateObservationOptions & {
    comparisonTolerance?: number;
    maxCandidates?: number;
  };

export type HiddenObservationCandidateInferenceFailureCode =
  | 'invalid_options'
  | 'invalid_candidate_family'
  | 'duplicate_candidate_id'
  | 'candidate_count_exceeds_limit'
  | 'invalid_candidate_value'
  | 'invalid_observation_sequence'
  | 'candidate_evaluation_failed'
  | 'non_finite_analytical_result';

export type HiddenObservationCandidateInferenceFailure = {
  code: HiddenObservationCandidateInferenceFailureCode;
  message: string;
  path?: string;
  candidateId?: string;
  candidateFailure?: HiddenStateObservationFailure;
};

export type HiddenObservationCandidateLikelihood = {
  candidateId: string;
  value?: HiddenObservationCandidateValue;
  possible: boolean;
  logLikelihood: number | null;
  sequenceProbability: number | null;
  sequenceProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  logLikelihoodDeltaFromBest: number | null;
  maximumLikelihood: boolean;
};

export type HiddenObservationCandidateSelection = {
  candidateId: string;
  value?: HiddenObservationCandidateValue;
};

export type HiddenObservationCandidateInferenceClassification =
  | 'unique_maximum_likelihood'
  | 'tied_maximum_likelihood'
  | 'all_candidates_impossible';

export type FiniteHiddenObservationCandidateInferenceDiagnostics = {
  method: 'finite_candidate_hidden_observation_log_likelihood_comparison';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  rankingBasis: 'finite_log_likelihood';
  comparisonTolerance: number;
  probabilityTolerance: number;
  maxCandidates: number;
  maxObservations: number;
  candidateCount: number;
  possibleCandidateCount: number;
  impossibleCandidateCount: number;
  posteriorNormalizationApplied: false;
  candidatePriorUsed: false;
  candidatePosteriorComputed: false;
  globalModelIdentificationClaimed: false;
  candidateOrderAffectsSelection: false;
};

export type FiniteHiddenObservationCandidateInferenceSuccess = {
  ok: true;
  observations: string[];
  classification: HiddenObservationCandidateInferenceClassification;
  evaluations: HiddenObservationCandidateLikelihood[];
  bestLogLikelihood: number | null;
  selectedCandidateIds: string[];
  selectedCandidates: HiddenObservationCandidateSelection[];
  diagnostics: FiniteHiddenObservationCandidateInferenceDiagnostics;
};

export type FiniteHiddenObservationCandidateInferenceFailure = {
  ok: false;
  failure: HiddenObservationCandidateInferenceFailure;
};

export type FiniteHiddenObservationCandidateInferenceResult =
  | FiniteHiddenObservationCandidateInferenceSuccess
  | FiniteHiddenObservationCandidateInferenceFailure;

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

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: HiddenObservationCandidateInferenceFailureCode,
  message: string,
  details: Omit<HiddenObservationCandidateInferenceFailure, 'code' | 'message'> = {}
): FiniteHiddenObservationCandidateInferenceFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveOptions(
  options: FiniteHiddenObservationCandidateInferenceOptions
): ResolvedOptions | FiniteHiddenObservationCandidateInferenceFailure {
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

  return {
    probabilityTolerance,
    comparisonTolerance,
    maxCandidates,
    maxObservations
  };
}

function isFailure(
  value: ResolvedOptions | FiniteHiddenObservationCandidateInferenceFailure
): value is FiniteHiddenObservationCandidateInferenceFailure {
  return 'ok' in value && value.ok === false;
}

function validateRequest(
  request: FiniteHiddenObservationCandidateInferenceRequest,
  options: ResolvedOptions
): FiniteHiddenObservationCandidateInferenceFailure | undefined {
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
  if (!Array.isArray(request.observations) || request.observations.length === 0) {
    return failure('invalid_observation_sequence', 'observations must be a non-empty array', {
      path: 'request.observations'
    });
  }
  if (request.observations.length > options.maxObservations) {
    return failure(
      'invalid_observation_sequence',
      `Observation sequence length ${request.observations.length} exceeds maxObservations ${options.maxObservations}`,
      { path: 'request.observations' }
    );
  }
  for (let index = 0; index < request.observations.length; index += 1) {
    if (typeof request.observations[index] !== 'string') {
      return failure(
        'invalid_observation_sequence',
        `observations[${index}] must be a string`,
        { path: `request.observations[${index}]` }
      );
    }
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

export function inferFiniteHiddenObservationCandidates(
  request: FiniteHiddenObservationCandidateInferenceRequest,
  options: FiniteHiddenObservationCandidateInferenceOptions = {}
): FiniteHiddenObservationCandidateInferenceResult {
  const resolved = resolveOptions(options);
  if (isFailure(resolved)) return resolved;
  const invalidRequest = validateRequest(request, resolved);
  if (invalidRequest !== undefined) return invalidRequest;

  const candidates = [...request.candidates].sort((left, right) =>
    compareStrings(left.candidateId, right.candidateId)
  );

  const preliminary: Array<Omit<HiddenObservationCandidateLikelihood, 'logLikelihoodDeltaFromBest' | 'maximumLikelihood'>> = [];
  for (const candidate of candidates) {
    const result = filterFiniteHiddenStateObservationSequence(
      candidate.model,
      {
        initialDistribution: candidate.initialDistribution,
        alphabet: candidate.alphabet,
        kernel: candidate.kernel,
        observations: request.observations
      },
      {
        probabilityTolerance: resolved.probabilityTolerance,
        maxObservations: resolved.maxObservations
      }
    );

    if (!result.ok) {
      return failure(
        'candidate_evaluation_failed',
        `Candidate ${candidate.candidateId} failed hidden-observation evaluation: ${result.failure.message}`,
        {
          path: 'request.candidates',
          candidateId: candidate.candidateId,
          candidateFailure: result.failure
        }
      );
    }

    if (result.possible && (result.logLikelihood === null || !Number.isFinite(result.logLikelihood))) {
      return failure(
        'non_finite_analytical_result',
        `Candidate ${candidate.candidateId} produced an invalid possible-sequence log likelihood`,
        { candidateId: candidate.candidateId }
      );
    }

    preliminary.push({
      candidateId: candidate.candidateId,
      ...(candidate.value !== undefined ? { value: candidate.value } : {}),
      possible: result.possible,
      logLikelihood: result.logLikelihood,
      sequenceProbability: result.sequenceProbability,
      sequenceProbabilityUnderflowed: result.diagnostics.sequenceProbabilityUnderflowed,
      impossibleAtStep: result.diagnostics.impossibleAtStep
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

  const evaluations: HiddenObservationCandidateLikelihood[] = preliminary.map((evaluation) => {
    if (!evaluation.possible || evaluation.logLikelihood === null || bestLogLikelihood === null) {
      return {
        ...evaluation,
        logLikelihoodDeltaFromBest: null,
        maximumLikelihood: false
      };
    }
    const delta = evaluation.logLikelihood - bestLogLikelihood;
    if (!Number.isFinite(delta)) {
      throw new Error('Candidate log-likelihood delta became non-finite');
    }
    return {
      ...evaluation,
      logLikelihoodDeltaFromBest: delta,
      maximumLikelihood: Math.abs(delta) <= resolved.comparisonTolerance
    };
  });

  const selected = evaluations.filter((evaluation) => evaluation.maximumLikelihood);
  const classification: HiddenObservationCandidateInferenceClassification =
    possible.length === 0
      ? 'all_candidates_impossible'
      : selected.length === 1
        ? 'unique_maximum_likelihood'
        : 'tied_maximum_likelihood';

  return {
    ok: true,
    observations: [...request.observations],
    classification,
    evaluations,
    bestLogLikelihood,
    selectedCandidateIds: selected.map((evaluation) => evaluation.candidateId),
    selectedCandidates: selected.map((evaluation) => ({
      candidateId: evaluation.candidateId,
      ...(evaluation.value !== undefined ? { value: evaluation.value } : {})
    })),
    diagnostics: {
      method: 'finite_candidate_hidden_observation_log_likelihood_comparison',
      numericRepresentation: 'javascript_number_float64',
      simulationUsed: false,
      rankingBasis: 'finite_log_likelihood',
      comparisonTolerance: resolved.comparisonTolerance,
      probabilityTolerance: resolved.probabilityTolerance,
      maxCandidates: resolved.maxCandidates,
      maxObservations: resolved.maxObservations,
      candidateCount: candidates.length,
      possibleCandidateCount: possible.length,
      impossibleCandidateCount: candidates.length - possible.length,
      posteriorNormalizationApplied: false,
      candidatePriorUsed: false,
      candidatePosteriorComputed: false,
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

export function finiteHiddenObservationCandidateInferenceResultToJson(
  result: FiniteHiddenObservationCandidateInferenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-observation candidate-inference result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
