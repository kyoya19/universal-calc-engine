import { DefinitionModel, StateId } from './model';
import {
  FiniteHiddenStateObservationFailure,
  FiniteHiddenStateObservationRequest,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteHiddenStateSmoothingOptions,
  smoothFiniteHiddenStateObservationSequence
} from './hidden_state_smoothing';

type InitialDistributionReestimationOptions = FiniteHiddenStateSmoothingOptions & {
  likelihoodTolerance?: number;
};

type InitialDistributionProbability = {
  stateId: StateId;
  probability: number;
};

type InitialDistributionReestimationDiagnostics = {
  method: 'one_step_em_initial_distribution_m_step_from_candidate_h_posterior_initial_state';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  candidateHPosteriorInitialStateMarginalReused: true;
  initialDistributionUpdatedFromPosteriorInitialStateProbabilities: boolean;
  transitionModelUpdated: false;
  observationKernelUpdated: false;
  observationAlphabetUpdated: false;
  iterativeBaumWelchUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  likelihoodTolerance: number;
  sequenceProbabilityUnderflowed: boolean;
};

type InitialDistributionReestimationFailureCode =
  | 'invalid_reestimation_tolerance'
  | 'expected_initial_state_count_inconsistency'
  | 'updated_initial_distribution_mass_violation'
  | 'likelihood_monotonicity_violation'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

type InitialDistributionReestimationFailure = {
  ok: false;
  failure: {
    code: InitialDistributionReestimationFailureCode;
    message: string;
    stateId?: StateId;
    actual?: number;
    expected?: number;
    tolerance?: number;
  };
};

type InitialDistributionReestimationSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  currentInitialDistribution: InitialDistributionProbability[];
  posteriorInitialStateProbabilities: InitialDistributionProbability[] | null;
  updatedInitialDistribution: InitialDistributionProbability[] | null;
  uniqueByExpectedCounts: true | null;
  originalLogLikelihood: number | null;
  updatedLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: InitialDistributionReestimationDiagnostics;
};

type FiniteHiddenStateInitialDistributionReestimationResult =
  | InitialDistributionReestimationSuccess
  | FiniteHiddenStateObservationFailure
  | InitialDistributionReestimationFailure;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: InitialDistributionReestimationFailureCode,
  message: string,
  details: Omit<InitialDistributionReestimationFailure['failure'], 'code' | 'message'> = {}
): InitialDistributionReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number
): number | InitialDistributionReestimationFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', 'likelihoodTolerance must be a finite positive number', {
      actual: resolved
    });
  }
  return resolved;
}

function diagnostics(
  probabilityTolerance: number,
  likelihoodTolerance: number,
  sequenceProbabilityUnderflowed: boolean,
  updated: boolean
): InitialDistributionReestimationDiagnostics {
  return {
    method: 'one_step_em_initial_distribution_m_step_from_candidate_h_posterior_initial_state',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    candidateHPosteriorInitialStateMarginalReused: true,
    initialDistributionUpdatedFromPosteriorInitialStateProbabilities: updated,
    transitionModelUpdated: false,
    observationKernelUpdated: false,
    observationAlphabetUpdated: false,
    iterativeBaumWelchUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance,
    likelihoodTolerance,
    sequenceProbabilityUnderflowed
  };
}

export function reestimateFiniteHiddenStateInitialDistributionOneStep(
  model: DefinitionModel,
  request: FiniteHiddenStateObservationRequest,
  options: InitialDistributionReestimationOptions = {}
): FiniteHiddenStateInitialDistributionReestimationResult {
  const smoothing = smoothFiniteHiddenStateObservationSequence(model, request, options);
  if (!smoothing.ok) return smoothing;

  const probabilityTolerance = smoothing.diagnostics.probabilityTolerance;
  const likelihoodToleranceResolved = resolvePositiveFinite(
    options.likelihoodTolerance,
    Math.max(1e-12, probabilityTolerance * 100)
  );
  if (typeof likelihoodToleranceResolved !== 'number') return likelihoodToleranceResolved;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const currentByState = new Map(
    request.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const)
  );
  const currentInitialDistribution = stateIds.map((stateId) => ({
    stateId,
    probability: currentByState.get(stateId) ?? 0
  }));

  if (!smoothing.possible) {
    return {
      ok: true,
      possible: false,
      observations: [...request.observations],
      currentInitialDistribution,
      posteriorInitialStateProbabilities: null,
      updatedInitialDistribution: null,
      uniqueByExpectedCounts: null,
      originalLogLikelihood: null,
      updatedLogLikelihood: null,
      likelihoodDelta: null,
      diagnostics: diagnostics(
        probabilityTolerance,
        likelihoodToleranceResolved,
        smoothing.diagnostics.sequenceProbabilityUnderflowed,
        false
      )
    };
  }

  if (smoothing.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'Candidate H did not provide finite log likelihood for a possible observation sequence'
    );
  }
  const firstStep = smoothing.steps[0];
  if (firstStep === undefined || firstStep.smoothedDistribution === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'Candidate H did not provide the posterior initial-state marginal for possible evidence'
    );
  }

  const posteriorByState = new Map<StateId, number>();
  for (const entry of firstStep.smoothedDistribution) {
    if (!stateIds.includes(entry.stateId)) {
      return failure(
        'expected_initial_state_count_inconsistency',
        'Candidate H returned an unknown hidden state in the posterior initial-state marginal',
        { stateId: entry.stateId }
      );
    }
    if (
      !Number.isFinite(entry.probability) ||
      entry.probability < 0 ||
      entry.probability > 1 + probabilityTolerance
    ) {
      return failure(
        'non_finite_reestimation_result',
        'Posterior initial-state probability became invalid',
        { stateId: entry.stateId, actual: entry.probability }
      );
    }
    posteriorByState.set(entry.stateId, entry.probability);
  }

  const posteriorInitialStateProbabilities = stateIds.map((stateId) => ({
    stateId,
    probability: posteriorByState.get(stateId) ?? 0
  }));
  const posteriorMass = posteriorInitialStateProbabilities.reduce(
    (sum, entry) => sum + entry.probability,
    0
  );
  if (!Number.isFinite(posteriorMass) || Math.abs(posteriorMass - 1) > probabilityTolerance) {
    return failure(
      'expected_initial_state_count_inconsistency',
      'Posterior initial-state probabilities do not sum to one',
      { actual: posteriorMass, expected: 1, tolerance: probabilityTolerance }
    );
  }

  const updatedInitialDistribution = posteriorInitialStateProbabilities.map((entry) => ({ ...entry }));
  const updatedMass = updatedInitialDistribution.reduce((sum, entry) => sum + entry.probability, 0);
  if (!Number.isFinite(updatedMass) || Math.abs(updatedMass - 1) > probabilityTolerance) {
    return failure(
      'updated_initial_distribution_mass_violation',
      'Updated initial distribution does not sum to one',
      { actual: updatedMass, expected: 1, tolerance: probabilityTolerance }
    );
  }

  const updatedRequest: FiniteHiddenStateObservationRequest = {
    initialDistribution: updatedInitialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel: request.kernel.map((entry) => ({ ...entry })),
    observations: [...request.observations]
  };
  const updatedFiltering = filterFiniteHiddenStateObservationSequence(model, updatedRequest, options);
  if (!updatedFiltering.ok) {
    return failure(
      'internal_reestimation_inconsistency',
      `Updated initial distribution failed Candidate C validation/filtering: ${updatedFiltering.failure.code}`
    );
  }
  if (!updatedFiltering.possible || updatedFiltering.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'One-step initial-distribution update made previously possible evidence impossible'
    );
  }

  const originalLogLikelihood = smoothing.logLikelihood;
  const updatedLogLikelihood = updatedFiltering.logLikelihood;
  const likelihoodDelta = updatedLogLikelihood - originalLogLikelihood;
  if (
    !Number.isFinite(originalLogLikelihood) ||
    !Number.isFinite(updatedLogLikelihood) ||
    !Number.isFinite(likelihoodDelta)
  ) {
    return failure('non_finite_reestimation_result', 'Observation log-likelihood comparison became non-finite');
  }
  if (likelihoodDelta < -likelihoodToleranceResolved) {
    return failure(
      'likelihood_monotonicity_violation',
      'One-step initial-distribution re-estimation decreased the realized observation log likelihood beyond tolerance',
      { actual: likelihoodDelta, expected: 0, tolerance: likelihoodToleranceResolved }
    );
  }

  return {
    ok: true,
    possible: true,
    observations: [...request.observations],
    currentInitialDistribution,
    posteriorInitialStateProbabilities,
    updatedInitialDistribution,
    uniqueByExpectedCounts: true,
    originalLogLikelihood,
    updatedLogLikelihood,
    likelihoodDelta,
    diagnostics: diagnostics(
      probabilityTolerance,
      likelihoodToleranceResolved,
      smoothing.diagnostics.sequenceProbabilityUnderflowed,
      true
    )
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

export function finiteHiddenStateInitialDistributionReestimationResultToJson(
  result: FiniteHiddenStateInitialDistributionReestimationResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state initial-distribution re-estimation result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
