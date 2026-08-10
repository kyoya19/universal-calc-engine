import {
  DiscreteParameterEstimationRequest,
  EstimationConstraint,
  EstimationIssue,
  ExcludedCandidate
} from './discrete_estimation';
import {
  ExternalModelDocument,
  PreparedExternalModel,
  prepareExternalModelDocument
} from './external_input';
import { EvaluatedModel, evaluateModel, expandModel } from './model';
import {
  ObservationDataset,
  ScalarMetricObservation,
  validateObservationDataset
} from './observations';
import { ParameterValues } from './parameterized_scalars';
import {
  RewardAxesEvaluatedModel,
  evaluateRewardAxesModel,
  expandRewardAxesModel
} from './reward_axes';
import {
  SolverConvergenceDiagnostics,
  SolverDiagnosticsOptions,
  solveExpectedElapsedTimeWithDiagnostics,
  solveExpectedRewardAxesWithDiagnostics
} from './solver_diagnostics';

export type ScalarGaussianEstimationMethod =
  'conditionally_independent_gaussian_scalar_log_likelihood';

export type ScalarPredictionSpec =
  | {
      type: 'expected_elapsed_time_seconds';
    }
  | {
      type: 'reward_axis_expected_value';
      axisId: string;
    };

export type GaussianScalarErrorModel = {
  type: 'gaussian';
  standardDeviation: number;
  unit: string;
};

export type ScalarGaussianLikelihoodBinding = {
  observationId: string;
  predictor: ScalarPredictionSpec;
  errorModel: GaussianScalarErrorModel;
};

export type ScalarGaussianParameterEstimationRequest =
  DiscreteParameterEstimationRequest & {
    scalarLikelihoods: ScalarGaussianLikelihoodBinding[];
    solver?: SolverDiagnosticsOptions;
  };

export type ScalarGaussianObservationScore = {
  observationId: string;
  metric: string;
  observedValue: number;
  predictedValue: number;
  unit: string;
  standardDeviation: number;
  logLikelihoodDensity: number;
};

export type ScalarGaussianCandidateDiagnostics = {
  expectedElapsedTime?: SolverConvergenceDiagnostics;
  rewardAxes?: Record<string, SolverConvergenceDiagnostics>;
};

export type ScalarGaussianCandidateResult = {
  value: number;
  logLikelihoodScore: number;
  relativeLikelihoodToBest: number;
  rank: number | null;
  observationScores: ScalarGaussianObservationScore[];
  diagnostics: ScalarGaussianCandidateDiagnostics;
};

export type ScalarGaussianRejectedCandidate = {
  value: number;
  stage:
    | 'parameter_resolution'
    | 'model_validation'
    | 'prediction_non_convergence'
    | 'prediction';
  issues: EstimationIssue[];
};

export type ScalarGaussianEstimationFailureStage =
  | 'request'
  | 'observation_validation'
  | 'scalar_likelihood_contract'
  | 'candidate_evaluation';

export type ScalarGaussianParameterEstimationSuccess = {
  ok: true;
  method: ScalarGaussianEstimationMethod;
  parameterId: string;
  candidates: ScalarGaussianCandidateResult[];
  excludedCandidates: ExcludedCandidate[];
  rejectedCandidates: ScalarGaussianRejectedCandidate[];
  bestCandidateValues: number[];
  estimatedValue: number | null;
  usedObservationIds: string[];
  priorUsed: false;
  posteriorComputed: false;
  independenceAssumption: 'scalar_observations_conditionally_independent_given_candidate';
  scoreInterpretation: 'sum_of_gaussian_log_likelihood_densities';
};

export type ScalarGaussianParameterEstimationFailure = {
  ok: false;
  stage: ScalarGaussianEstimationFailureStage;
  issues: EstimationIssue[];
};

export type ScalarGaussianParameterEstimationResult =
  | ScalarGaussianParameterEstimationSuccess
  | ScalarGaussianParameterEstimationFailure;

type PreparedCandidate = {
  value: number;
  prepared: PreparedExternalModel;
};

type BoundScalarObservation = {
  observation: ScalarMetricObservation;
  binding: ScalarGaussianLikelihoodBinding;
  predictorUnit: string;
};

const METHOD: ScalarGaussianEstimationMethod =
  'conditionally_independent_gaussian_scalar_log_likelihood';

function failure(
  stage: ScalarGaussianEstimationFailureStage,
  code: string,
  path: string,
  message: string
): ScalarGaussianParameterEstimationFailure {
  return { ok: false, stage, issues: [{ code, path, message }] };
}

function constraintIncludes(value: number, constraint: EstimationConstraint): boolean {
  const inclusive = constraint.inclusive ?? true;
  if (constraint.type === 'minimum') {
    return inclusive ? value >= constraint.value : value > constraint.value;
  }
  return inclusive ? value <= constraint.value : value < constraint.value;
}

function validateRequest(
  document: ExternalModelDocument,
  request: ScalarGaussianParameterEstimationRequest
): ScalarGaussianParameterEstimationFailure | undefined {
  if (request.parameterId.trim().length === 0) {
    return failure('request', 'empty_parameter_id', 'request.parameterId', 'parameterId must not be empty');
  }
  if (!document.model.parameters.some((parameter) => parameter.id === request.parameterId)) {
    return failure(
      'request',
      'unknown_estimation_parameter',
      'request.parameterId',
      `Unknown estimation parameter: ${request.parameterId}`
    );
  }
  if (request.candidates.length === 0) {
    return failure('request', 'empty_candidate_set', 'request.candidates', 'At least one candidate value is required');
  }

  const seenCandidates = new Set<number>();
  for (let index = 0; index < request.candidates.length; index += 1) {
    const value = request.candidates[index];
    if (value === undefined || !Number.isFinite(value)) {
      return failure(
        'request',
        'invalid_candidate_value',
        `request.candidates[${index}]`,
        'Candidate values must be finite numbers'
      );
    }
    if (seenCandidates.has(value)) {
      return failure(
        'request',
        'duplicate_candidate_value',
        `request.candidates[${index}]`,
        `Duplicate candidate value: ${value}`
      );
    }
    seenCandidates.add(value);
  }

  for (let index = 0; index < (request.constraints?.length ?? 0); index += 1) {
    const constraint = request.constraints?.[index];
    if (constraint === undefined || !Number.isFinite(constraint.value)) {
      return failure(
        'request',
        'invalid_constraint_value',
        `request.constraints[${index}].value`,
        'Constraint values must be finite numbers'
      );
    }
  }

  if (request.scalarLikelihoods.length === 0) {
    return failure(
      'request',
      'empty_scalar_likelihood_set',
      'request.scalarLikelihoods',
      'At least one scalar likelihood binding is required'
    );
  }

  const seenObservationIds = new Set<string>();
  for (let index = 0; index < request.scalarLikelihoods.length; index += 1) {
    const binding = request.scalarLikelihoods[index];
    if (binding === undefined || binding.observationId.trim().length === 0) {
      return failure(
        'request',
        'empty_scalar_observation_id',
        `request.scalarLikelihoods[${index}].observationId`,
        'Scalar likelihood observationId must not be empty'
      );
    }
    if (seenObservationIds.has(binding.observationId)) {
      return failure(
        'request',
        'duplicate_scalar_observation_binding',
        `request.scalarLikelihoods[${index}].observationId`,
        `Duplicate scalar likelihood binding: ${binding.observationId}`
      );
    }
    seenObservationIds.add(binding.observationId);

    const sigma = binding.errorModel.standardDeviation;
    if (!Number.isFinite(sigma) || sigma <= 0) {
      return failure(
        'request',
        'invalid_gaussian_standard_deviation',
        `request.scalarLikelihoods[${index}].errorModel.standardDeviation`,
        'Gaussian standardDeviation must be a finite positive number'
      );
    }
    if (binding.errorModel.unit.trim().length === 0) {
      return failure(
        'request',
        'empty_gaussian_error_unit',
        `request.scalarLikelihoods[${index}].errorModel.unit`,
        'Gaussian error-model unit must not be empty'
      );
    }
    if (
      binding.predictor.type === 'reward_axis_expected_value' &&
      binding.predictor.axisId.trim().length === 0
    ) {
      return failure(
        'request',
        'empty_reward_axis_id',
        `request.scalarLikelihoods[${index}].predictor.axisId`,
        'Reward-axis predictor axisId must not be empty'
      );
    }
  }

  const maxIterations = request.solver?.maxIterations;
  if (maxIterations !== undefined && (!Number.isInteger(maxIterations) || maxIterations <= 0)) {
    return failure(
      'request',
      'invalid_max_iterations',
      'request.solver.maxIterations',
      'maxIterations must be a positive integer'
    );
  }
  const tolerance = request.solver?.tolerance;
  if (tolerance !== undefined && (!Number.isFinite(tolerance) || tolerance <= 0)) {
    return failure(
      'request',
      'invalid_tolerance',
      'request.solver.tolerance',
      'tolerance must be a finite positive number'
    );
  }

  return undefined;
}

function withCandidateValue(
  document: ExternalModelDocument,
  parameterId: string,
  candidateValue: number
): ExternalModelDocument {
  const parameterValues: ParameterValues = {
    ...(document.parameterValues ?? {}),
    [parameterId]: candidateValue
  };
  return { ...document, parameterValues } as ExternalModelDocument;
}

function toIssues(issues: Array<{ code: string; path: string; message: string }>): EstimationIssue[] {
  return issues.map((issue) => ({ ...issue }));
}

function prepareCandidates(
  document: ExternalModelDocument,
  request: ScalarGaussianParameterEstimationRequest
): {
  prepared: PreparedCandidate[];
  excluded: ExcludedCandidate[];
  rejected: ScalarGaussianRejectedCandidate[];
} {
  const prepared: PreparedCandidate[] = [];
  const excluded: ExcludedCandidate[] = [];
  const rejected: ScalarGaussianRejectedCandidate[] = [];

  for (const value of request.candidates) {
    const failedConstraints = (request.constraints ?? []).filter(
      (constraint) => !constraintIncludes(value, constraint)
    );
    if (failedConstraints.length > 0) {
      excluded.push({
        value,
        failedConstraints: failedConstraints.map((constraint) => ({ ...constraint }))
      });
      continue;
    }

    const result = prepareExternalModelDocument(
      withCandidateValue(document, request.parameterId, value)
    );
    if (result.ok) {
      prepared.push({ value, prepared: result });
      continue;
    }

    rejected.push({
      value,
      stage: result.stage === 'model_validation' ? 'model_validation' : 'parameter_resolution',
      issues: toIssues(result.issues)
    });
  }

  return { prepared, excluded, rejected };
}

function predictorUnit(
  document: ExternalModelDocument,
  predictor: ScalarPredictionSpec
): string | undefined {
  if (predictor.type === 'expected_elapsed_time_seconds') {
    return 'seconds';
  }
  if (document.modelKind !== 'reward_axes') {
    return undefined;
  }
  return document.model.rewardAxes.find((axis) => axis.id === predictor.axisId)?.unit;
}

function bindScalarObservations(
  document: ExternalModelDocument,
  dataset: ObservationDataset,
  request: ScalarGaussianParameterEstimationRequest
):
  | { ok: true; bindings: BoundScalarObservation[]; usedObservationIds: string[] }
  | ScalarGaussianParameterEstimationFailure {
  const issues: EstimationIssue[] = [];
  const scalarById = new Map<string, ScalarMetricObservation>();

  dataset.observations.forEach((observation, index) => {
    if (observation.type !== 'scalar') {
      issues.push({
        code: 'unsupported_non_scalar_observation_for_scalar_likelihood',
        path: `observations[${index}]`,
        message: 'Scalar Gaussian likelihood consumes scalar observations only'
      });
      return;
    }
    scalarById.set(observation.id, observation);
    if (observation.unit === undefined) {
      issues.push({
        code: 'missing_scalar_observation_unit',
        path: `observations[${index}].unit`,
        message: 'Scalar Gaussian likelihood requires an explicit observation unit'
      });
    }
  });

  const boundIds = new Set(request.scalarLikelihoods.map((binding) => binding.observationId));
  for (const observation of scalarById.values()) {
    if (!boundIds.has(observation.id)) {
      issues.push({
        code: 'unbound_scalar_observation',
        path: 'observations',
        message: `Scalar observation has no likelihood binding: ${observation.id}`
      });
    }
  }

  const bindings: BoundScalarObservation[] = [];
  request.scalarLikelihoods.forEach((binding, index) => {
    const observation = scalarById.get(binding.observationId);
    if (observation === undefined) {
      issues.push({
        code: 'unknown_scalar_observation_binding',
        path: `request.scalarLikelihoods[${index}].observationId`,
        message: `Unknown scalar observation: ${binding.observationId}`
      });
      return;
    }
    const unit = predictorUnit(document, binding.predictor);
    if (unit === undefined) {
      issues.push({
        code: 'unsupported_scalar_predictor_for_model',
        path: `request.scalarLikelihoods[${index}].predictor`,
        message:
          binding.predictor.type === 'reward_axis_expected_value'
            ? `Unknown or unavailable reward axis predictor: ${binding.predictor.axisId}`
            : 'Scalar predictor is not available for this model'
      });
      return;
    }
    if (observation.unit !== undefined && observation.unit !== unit) {
      issues.push({
        code: 'scalar_observation_predictor_unit_mismatch',
        path: `request.scalarLikelihoods[${index}].predictor`,
        message: `Observation unit ${observation.unit} does not match predictor unit ${unit}`
      });
    }
    if (binding.errorModel.unit !== unit) {
      issues.push({
        code: 'gaussian_error_predictor_unit_mismatch',
        path: `request.scalarLikelihoods[${index}].errorModel.unit`,
        message: `Gaussian error-model unit ${binding.errorModel.unit} does not match predictor unit ${unit}`
      });
    }
    bindings.push({ observation, binding, predictorUnit: unit });
  });

  if (issues.length > 0) {
    return { ok: false, stage: 'scalar_likelihood_contract', issues };
  }
  return {
    ok: true,
    bindings,
    usedObservationIds: bindings.map((entry) => entry.observation.id)
  };
}

function gaussianLogLikelihoodDensity(observed: number, predicted: number, sigma: number): number {
  const z = (observed - predicted) / sigma;
  return -Math.log(sigma * Math.sqrt(2 * Math.PI)) - 0.5 * z * z;
}

function evaluatedModelForCandidate(prepared: PreparedExternalModel): {
  evaluated: EvaluatedModel;
  rewardAxesEvaluated?: RewardAxesEvaluatedModel;
} {
  if (prepared.modelKind === 'base') {
    return { evaluated: evaluateModel(expandModel(prepared.resolvedModel)) };
  }
  const rewardAxesEvaluated = evaluateRewardAxesModel(
    expandRewardAxesModel(prepared.resolvedModel)
  );
  return { evaluated: rewardAxesEvaluated, rewardAxesEvaluated };
}

function evaluateCandidate(
  candidate: PreparedCandidate,
  bindings: BoundScalarObservation[],
  solver: SolverDiagnosticsOptions
): ScalarGaussianCandidateResult | ScalarGaussianRejectedCandidate {
  try {
    const { evaluated, rewardAxesEvaluated } = evaluatedModelForCandidate(candidate.prepared);
    const diagnostics: ScalarGaussianCandidateDiagnostics = {};
    let expectedElapsedTime: number | undefined;
    let rewardAxisResult: ReturnType<typeof solveExpectedRewardAxesWithDiagnostics> | undefined;

    if (bindings.some((entry) => entry.binding.predictor.type === 'expected_elapsed_time_seconds')) {
      const detailed = solveExpectedElapsedTimeWithDiagnostics(evaluated, solver);
      diagnostics.expectedElapsedTime = detailed.diagnostics;
      if (!detailed.diagnostics.converged) {
        return {
          value: candidate.value,
          stage: 'prediction_non_convergence',
          issues: [
            {
              code: 'elapsed_time_prediction_non_convergence',
              path: 'candidate',
              message: `Expected elapsed time did not converge for candidate ${candidate.value}`
            }
          ]
        };
      }
      expectedElapsedTime =
        detailed.result.expectedElapsedTimeSecondsByState.get(candidate.prepared.resolvedModel.startState) ?? 0;
    }

    const usedAxisIds = [
      ...new Set(
        bindings.flatMap((entry) =>
          entry.binding.predictor.type === 'reward_axis_expected_value'
            ? [entry.binding.predictor.axisId]
            : []
        )
      )
    ];
    if (usedAxisIds.length > 0) {
      if (rewardAxesEvaluated === undefined) {
        return {
          value: candidate.value,
          stage: 'prediction',
          issues: [
            {
              code: 'reward_axis_predictor_requires_reward_axes_model',
              path: 'candidate',
              message: 'Reward-axis scalar prediction requires a reward_axes model'
            }
          ]
        };
      }
      rewardAxisResult = solveExpectedRewardAxesWithDiagnostics(rewardAxesEvaluated, solver);
      diagnostics.rewardAxes = {};
      for (const axisId of usedAxisIds) {
        const axisDiagnostics = rewardAxisResult.diagnosticsByAxis[axisId];
        if (axisDiagnostics !== undefined) {
          diagnostics.rewardAxes[axisId] = axisDiagnostics;
        }
        if (axisDiagnostics === undefined || !axisDiagnostics.converged) {
          return {
            value: candidate.value,
            stage: 'prediction_non_convergence',
            issues: [
              {
                code: 'reward_axis_prediction_non_convergence',
                path: 'candidate',
                message: `Reward axis ${axisId} did not converge for candidate ${candidate.value}`
              }
            ]
          };
        }
      }
    }

    const observationScores: ScalarGaussianObservationScore[] = [];
    let total = 0;
    for (const entry of bindings) {
      const predictor = entry.binding.predictor;
      let predictedValue: number;
      if (predictor.type === 'expected_elapsed_time_seconds') {
        if (expectedElapsedTime === undefined) {
          throw new Error('Expected elapsed-time prediction was not evaluated');
        }
        predictedValue = expectedElapsedTime;
      } else {
        const byState = rewardAxisResult?.result.expectedRewardByAxisByState.get(predictor.axisId);
        const value = byState?.get(candidate.prepared.resolvedModel.startState);
        if (value === undefined) {
          throw new Error(`Missing reward-axis prediction: ${predictor.axisId}`);
        }
        predictedValue = value;
      }

      const logLikelihoodDensity = gaussianLogLikelihoodDensity(
        entry.observation.value,
        predictedValue,
        entry.binding.errorModel.standardDeviation
      );
      if (!Number.isFinite(logLikelihoodDensity)) {
        return {
          value: candidate.value,
          stage: 'prediction',
          issues: [
            {
              code: 'non_finite_gaussian_log_likelihood',
              path: 'candidate',
              message: `Gaussian log-likelihood was non-finite for candidate ${candidate.value}`
            }
          ]
        };
      }
      total += logLikelihoodDensity;
      observationScores.push({
        observationId: entry.observation.id,
        metric: entry.observation.metric,
        observedValue: entry.observation.value,
        predictedValue,
        unit: entry.predictorUnit,
        standardDeviation: entry.binding.errorModel.standardDeviation,
        logLikelihoodDensity
      });
    }

    return {
      value: candidate.value,
      logLikelihoodScore: total,
      relativeLikelihoodToBest: 0,
      rank: null,
      observationScores,
      diagnostics
    };
  } catch (error) {
    return {
      value: candidate.value,
      stage: 'prediction',
      issues: [
        {
          code: 'scalar_prediction_failed',
          path: 'candidate',
          message: error instanceof Error ? error.message : 'Scalar prediction failed'
        }
      ]
    };
  }
}

function rankCandidates(candidates: ScalarGaussianCandidateResult[]): void {
  candidates.sort((left, right) => right.logLikelihoodScore - left.logLikelihoodScore);
  const best = candidates[0]?.logLikelihoodScore;
  if (best === undefined) {
    return;
  }
  candidates.forEach((candidate, index) => {
    candidate.rank = index + 1;
    candidate.relativeLikelihoodToBest = Math.exp(candidate.logLikelihoodScore - best);
  });
}

function bestCandidateValues(candidates: ScalarGaussianCandidateResult[]): number[] {
  const best = candidates[0]?.logLikelihoodScore;
  if (best === undefined) {
    return [];
  }
  const tolerance = 1e-12;
  return candidates
    .filter((candidate) => Math.abs(candidate.logLikelihoodScore - best) <= tolerance)
    .map((candidate) => candidate.value);
}

export function estimateScalarGaussianParameterCandidates(
  document: ExternalModelDocument,
  observations: ObservationDataset,
  request: ScalarGaussianParameterEstimationRequest
): ScalarGaussianParameterEstimationResult {
  const requestFailure = validateRequest(document, request);
  if (requestFailure !== undefined) {
    return requestFailure;
  }

  const candidates = prepareCandidates(document, request);
  if (candidates.prepared.length === 0) {
    return failure(
      'candidate_evaluation',
      'no_evaluable_candidates',
      'request.candidates',
      'No candidate remained both constraint-eligible and model-valid'
    );
  }

  const referenceModel = candidates.prepared[0]?.prepared.resolvedModel;
  if (referenceModel === undefined) {
    return failure('candidate_evaluation', 'missing_reference_model', '$', 'No reference model was available');
  }
  const observationValidation = validateObservationDataset(observations, referenceModel);
  if (!observationValidation.valid) {
    return {
      ok: false,
      stage: 'observation_validation',
      issues: toIssues(observationValidation.issues)
    };
  }

  const bound = bindScalarObservations(document, observations, request);
  if (!bound.ok) {
    return bound;
  }

  const scored: ScalarGaussianCandidateResult[] = [];
  const rejected = [...candidates.rejected];
  for (const candidate of candidates.prepared) {
    const result = evaluateCandidate(candidate, bound.bindings, request.solver ?? {});
    if ('logLikelihoodScore' in result) {
      scored.push(result);
    } else {
      rejected.push(result);
    }
  }

  if (scored.length === 0) {
    return failure(
      'candidate_evaluation',
      'no_scorable_candidates',
      'request.candidates',
      'No candidate produced converged finite scalar predictions'
    );
  }

  rankCandidates(scored);
  const bestValues = bestCandidateValues(scored);
  return {
    ok: true,
    method: METHOD,
    parameterId: request.parameterId,
    candidates: scored,
    excludedCandidates: candidates.excluded,
    rejectedCandidates: rejected,
    bestCandidateValues: bestValues,
    estimatedValue: bestValues.length === 1 ? bestValues[0] ?? null : null,
    usedObservationIds: [...bound.usedObservationIds],
    priorUsed: false,
    posteriorComputed: false,
    independenceAssumption: 'scalar_observations_conditionally_independent_given_candidate',
    scoreInterpretation: 'sum_of_gaussian_log_likelihood_densities'
  };
}

export function scalarGaussianParameterEstimationResultToJson(
  result: ScalarGaussianParameterEstimationResult
): string {
  return JSON.stringify(result);
}
