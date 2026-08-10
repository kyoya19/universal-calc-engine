import {
  CompositeEvidenceIndependenceAssumption,
  CompositeLikelihoodEstimationMethod,
  CompositeLikelihoodEstimationRequest,
  CompositeLikelihoodFailureStage,
  CompositeRejectedCandidate,
  estimateCompositeParameterCandidates
} from './composite_likelihood_estimation';
import {
  DiscreteEstimationMethod,
  EstimationConstraint,
  EstimationIssue,
  ExcludedCandidate
} from './discrete_estimation';
import { ExternalModelDocument } from './external_input';
import {
  ExcludedParameterCandidates,
  MultiParameterGridIdentifiability,
  MultiParameterGridSearchMethod,
  ParameterAssignment,
  ParameterCandidateDimension
} from './multi_parameter_grid_estimation';
import { ObservationDataset } from './observations';
import { ParameterId, ParameterValues } from './parameterized_scalars';
import {
  ScalarGaussianCandidateDiagnostics,
  ScalarGaussianEstimationMethod,
  ScalarGaussianLikelihoodBinding,
  ScalarGaussianObservationScore
} from './scalar_gaussian_estimation';
import { SolverDiagnosticsOptions } from './solver_diagnostics';
import type { StateLikelihoodScore } from './discrete_estimation';

export type MultiParameterCompositeGridEstimationRequest = {
  parameters: ParameterCandidateDimension[];
  maxCombinations: number;
  transitionObservationIds: string[];
  scalarLikelihoods: ScalarGaussianLikelihoodBinding[];
  independenceAssumption: CompositeEvidenceIndependenceAssumption;
  solver?: SolverDiagnosticsOptions;
};

export type MultiParameterCompositeGridAssignmentResult = {
  assignment: ParameterAssignment;
  possible: boolean;
  transitionLogLikelihoodScore: number | null;
  scalarGaussianLogLikelihoodScore: number;
  totalLogLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
  transitionStateScores: StateLikelihoodScore[];
  scalarObservationScores: ScalarGaussianObservationScore[];
  scalarDiagnostics: ScalarGaussianCandidateDiagnostics;
};

export type RejectedCompositeParameterAssignment = {
  assignment: ParameterAssignment;
  stage: 'request' | 'candidate_evaluation';
  compositeStage: CompositeLikelihoodFailureStage | 'candidate_result';
  componentStage?: string;
  issues: EstimationIssue[];
  rejectedComponents?: CompositeRejectedCandidate['components'];
};

export type MultiParameterCompositeGridEstimationSuccess = {
  ok: true;
  searchMethod: MultiParameterGridSearchMethod;
  compositeMethod: CompositeLikelihoodEstimationMethod;
  transitionMethod: DiscreteEstimationMethod;
  scalarMethod: ScalarGaussianEstimationMethod;
  parameterIds: ParameterId[];
  rawCombinationCount: number;
  eligibleCombinationCount: number;
  maxCombinations: number;
  assignments: MultiParameterCompositeGridAssignmentResult[];
  rejectedAssignments: RejectedCompositeParameterAssignment[];
  excludedCandidatesByParameter: ExcludedParameterCandidates[];
  bestAssignments: ParameterAssignment[];
  estimatedAssignment: ParameterAssignment | null;
  identifiability: MultiParameterGridIdentifiability;
  usedObservationIds: {
    transition: string[];
    scalar: string[];
    all: string[];
  };
  independenceAssumption: CompositeEvidenceIndependenceAssumption;
  transitionMultinomialConstantOmitted: true;
  priorUsed: false;
  posteriorComputed: false;
  scoreInterpretation:
    'finite_grid_sum_of_component_log_likelihood_scores_up_to_transition_candidate_independent_constant';
};

export type MultiParameterCompositeGridFailureStage =
  | 'request'
  | 'composite_contract'
  | 'candidate_evaluation';

export type MultiParameterCompositeGridEstimationFailure = {
  ok: false;
  stage: MultiParameterCompositeGridFailureStage;
  compositeStage?: CompositeLikelihoodFailureStage;
  componentStage?: string;
  issues: EstimationIssue[];
};

export type MultiParameterCompositeGridEstimationResult =
  | MultiParameterCompositeGridEstimationSuccess
  | MultiParameterCompositeGridEstimationFailure;

type EligibleDimension = {
  parameterId: ParameterId;
  candidates: number[];
};

const SEARCH_METHOD: MultiParameterGridSearchMethod = 'finite_cartesian_parameter_grid';

function failure(
  stage: MultiParameterCompositeGridFailureStage,
  code: string,
  path: string,
  message: string,
  compositeStage?: CompositeLikelihoodFailureStage,
  componentStage?: string
): MultiParameterCompositeGridEstimationFailure {
  return {
    ok: false,
    stage,
    ...(compositeStage !== undefined ? { compositeStage } : {}),
    ...(componentStage !== undefined ? { componentStage } : {}),
    issues: [{ code, path, message }]
  };
}

function constraintIncludes(value: number, constraint: EstimationConstraint): boolean {
  const inclusive = constraint.inclusive ?? true;
  if (constraint.type === 'minimum') {
    return inclusive ? value >= constraint.value : value > constraint.value;
  }
  return inclusive ? value <= constraint.value : value < constraint.value;
}

function safeProduct(lengths: number[]): number | undefined {
  let product = 1;
  for (const length of lengths) {
    if (length !== 0 && product > Number.MAX_SAFE_INTEGER / length) {
      return undefined;
    }
    product *= length;
  }
  return product;
}

function validateGridRequest(
  document: ExternalModelDocument,
  request: MultiParameterCompositeGridEstimationRequest
): MultiParameterCompositeGridEstimationFailure | undefined {
  if (request.parameters.length < 2) {
    return failure(
      'request',
      'insufficient_unknown_parameters',
      'request.parameters',
      'Multi-parameter composite grid estimation requires at least two parameter dimensions'
    );
  }
  if (
    !Number.isInteger(request.maxCombinations) ||
    request.maxCombinations <= 0 ||
    request.maxCombinations > Number.MAX_SAFE_INTEGER
  ) {
    return failure(
      'request',
      'invalid_max_combinations',
      'request.maxCombinations',
      'maxCombinations must be a positive safe integer'
    );
  }

  const declared = new Set(document.model.parameters.map((parameter) => parameter.id));
  const seenParameterIds = new Set<ParameterId>();
  for (let parameterIndex = 0; parameterIndex < request.parameters.length; parameterIndex += 1) {
    const dimension = request.parameters[parameterIndex];
    if (dimension === undefined || dimension.parameterId.trim().length === 0) {
      return failure(
        'request',
        'empty_parameter_id',
        `request.parameters[${parameterIndex}].parameterId`,
        'parameterId must not be empty'
      );
    }
    if (!declared.has(dimension.parameterId)) {
      return failure(
        'request',
        'unknown_estimation_parameter',
        `request.parameters[${parameterIndex}].parameterId`,
        `Unknown estimation parameter: ${dimension.parameterId}`
      );
    }
    if (seenParameterIds.has(dimension.parameterId)) {
      return failure(
        'request',
        'duplicate_estimation_parameter',
        `request.parameters[${parameterIndex}].parameterId`,
        `Duplicate estimation parameter: ${dimension.parameterId}`
      );
    }
    seenParameterIds.add(dimension.parameterId);

    if (dimension.candidates.length === 0) {
      return failure(
        'request',
        'empty_candidate_set',
        `request.parameters[${parameterIndex}].candidates`,
        `At least one candidate is required for ${dimension.parameterId}`
      );
    }
    const seenValues = new Set<number>();
    for (let candidateIndex = 0; candidateIndex < dimension.candidates.length; candidateIndex += 1) {
      const value = dimension.candidates[candidateIndex];
      if (value === undefined || !Number.isFinite(value)) {
        return failure(
          'request',
          'invalid_candidate_value',
          `request.parameters[${parameterIndex}].candidates[${candidateIndex}]`,
          'Candidate values must be finite numbers'
        );
      }
      if (seenValues.has(value)) {
        return failure(
          'request',
          'duplicate_candidate_value',
          `request.parameters[${parameterIndex}].candidates[${candidateIndex}]`,
          `Duplicate candidate value for ${dimension.parameterId}: ${value}`
        );
      }
      seenValues.add(value);
    }
    for (let constraintIndex = 0; constraintIndex < (dimension.constraints?.length ?? 0); constraintIndex += 1) {
      const constraint = dimension.constraints?.[constraintIndex];
      if (constraint === undefined || !Number.isFinite(constraint.value)) {
        return failure(
          'request',
          'invalid_constraint_value',
          `request.parameters[${parameterIndex}].constraints[${constraintIndex}].value`,
          'Constraint values must be finite numbers'
        );
      }
    }
  }

  if (safeProduct(request.parameters.map((dimension) => dimension.candidates.length)) === undefined) {
    return failure(
      'request',
      'combination_count_overflow',
      'request.parameters',
      'Raw Cartesian candidate count exceeds the safe integer range'
    );
  }
  return undefined;
}

function eligibleDimensions(request: MultiParameterCompositeGridEstimationRequest): {
  dimensions: EligibleDimension[];
  excluded: ExcludedParameterCandidates[];
} {
  const dimensions: EligibleDimension[] = [];
  const excluded: ExcludedParameterCandidates[] = [];
  for (const dimension of request.parameters) {
    const eligible: number[] = [];
    const rejected: ExcludedCandidate[] = [];
    for (const value of dimension.candidates) {
      const failedConstraints = (dimension.constraints ?? []).filter(
        (constraint) => !constraintIncludes(value, constraint)
      );
      if (failedConstraints.length === 0) {
        eligible.push(value);
      } else {
        rejected.push({
          value,
          failedConstraints: failedConstraints.map((constraint) => ({ ...constraint }))
        });
      }
    }
    dimensions.push({ parameterId: dimension.parameterId, candidates: eligible });
    excluded.push({ parameterId: dimension.parameterId, excludedCandidates: rejected });
  }
  return { dimensions, excluded };
}

function buildAssignments(dimensions: EligibleDimension[]): ParameterAssignment[] {
  let assignments: ParameterAssignment[] = [{}];
  for (const dimension of dimensions) {
    const next: ParameterAssignment[] = [];
    for (const assignment of assignments) {
      for (const value of dimension.candidates) {
        next.push({ ...assignment, [dimension.parameterId]: value });
      }
    }
    assignments = next;
  }
  return assignments;
}

function documentWithAssignment(
  document: ExternalModelDocument,
  assignment: ParameterAssignment
): ExternalModelDocument {
  const parameterValues: ParameterValues = {
    ...(document.parameterValues ?? {}),
    ...assignment
  };
  return { ...document, parameterValues } as ExternalModelDocument;
}

function compositeRequestForAssignment(
  anchorParameterId: string,
  anchorValue: number,
  request: MultiParameterCompositeGridEstimationRequest
): CompositeLikelihoodEstimationRequest {
  return {
    parameterId: anchorParameterId,
    candidates: [anchorValue],
    transitionObservationIds: [...request.transitionObservationIds],
    scalarLikelihoods: request.scalarLikelihoods.map((binding) => ({
      observationId: binding.observationId,
      predictor: { ...binding.predictor },
      errorModel: { ...binding.errorModel }
    })),
    independenceAssumption: request.independenceAssumption,
    ...(request.solver !== undefined ? { solver: { ...request.solver } } : {})
  };
}

function assignmentSpecificCompositeFailure(
  stage: CompositeLikelihoodFailureStage,
  componentStage: string | undefined
): boolean {
  if (stage === 'candidate_evaluation') {
    return true;
  }
  return (
    (stage === 'transition_component' || stage === 'scalar_component') &&
    componentStage === 'candidate_evaluation'
  );
}

function rankAssignments(assignments: MultiParameterCompositeGridAssignmentResult[]): void {
  const possible = assignments.filter(
    (
      assignment
    ): assignment is MultiParameterCompositeGridAssignmentResult & {
      totalLogLikelihoodScore: number;
    } => assignment.possible && assignment.totalLogLikelihoodScore !== null
  );
  possible.sort((left, right) => right.totalLogLikelihoodScore - left.totalLogLikelihoodScore);
  const best = possible[0]?.totalLogLikelihoodScore;
  if (best === undefined) {
    return;
  }
  possible.forEach((assignment, index) => {
    assignment.rank = index + 1;
    assignment.relativeLikelihoodToBest = Math.exp(assignment.totalLogLikelihoodScore - best);
  });
  assignments.sort((left, right) => {
    if (left.rank === null && right.rank === null) {
      return 0;
    }
    if (left.rank === null) {
      return 1;
    }
    if (right.rank === null) {
      return -1;
    }
    return left.rank - right.rank;
  });
}

function bestAssignments(
  assignments: MultiParameterCompositeGridAssignmentResult[]
): ParameterAssignment[] {
  const possible = assignments.filter(
    (
      assignment
    ): assignment is MultiParameterCompositeGridAssignmentResult & {
      totalLogLikelihoodScore: number;
    } => assignment.possible && assignment.totalLogLikelihoodScore !== null
  );
  const best = possible[0]?.totalLogLikelihoodScore;
  if (best === undefined) {
    return [];
  }
  const tolerance = 1e-12;
  return possible
    .filter((assignment) => Math.abs(assignment.totalLogLikelihoodScore - best) <= tolerance)
    .map((assignment) => ({ ...assignment.assignment }));
}

export function estimateMultiParameterCompositeGrid(
  document: ExternalModelDocument,
  observations: ObservationDataset,
  request: MultiParameterCompositeGridEstimationRequest
): MultiParameterCompositeGridEstimationResult {
  const invalidRequest = validateGridRequest(document, request);
  if (invalidRequest !== undefined) {
    return invalidRequest;
  }

  const rawCombinationCount = safeProduct(
    request.parameters.map((dimension) => dimension.candidates.length)
  );
  if (rawCombinationCount === undefined) {
    return failure('request', 'combination_count_overflow', 'request.parameters', 'Raw candidate count overflowed');
  }

  const eligible = eligibleDimensions(request);
  if (eligible.dimensions.some((dimension) => dimension.candidates.length === 0)) {
    return failure(
      'candidate_evaluation',
      'empty_eligible_candidate_dimension',
      'request.parameters',
      'At least one parameter has no candidate remaining after constraints'
    );
  }
  const eligibleCombinationCount = safeProduct(
    eligible.dimensions.map((dimension) => dimension.candidates.length)
  );
  if (eligibleCombinationCount === undefined) {
    return failure(
      'request',
      'combination_count_overflow',
      'request.parameters',
      'Eligible Cartesian candidate count exceeds the safe integer range'
    );
  }
  if (eligibleCombinationCount > request.maxCombinations) {
    return failure(
      'request',
      'candidate_grid_limit_exceeded',
      'request.maxCombinations',
      `Eligible Cartesian candidate count ${eligibleCombinationCount} exceeds maxCombinations ${request.maxCombinations}`
    );
  }

  const assignments = buildAssignments(eligible.dimensions);
  const anchor = eligible.dimensions[0];
  if (anchor === undefined) {
    return failure('request', 'missing_anchor_parameter', 'request.parameters', 'No parameter dimension was available');
  }

  const results: MultiParameterCompositeGridAssignmentResult[] = [];
  const rejectedAssignments: RejectedCompositeParameterAssignment[] = [];
  let methods:
    | {
        compositeMethod: CompositeLikelihoodEstimationMethod;
        transitionMethod: DiscreteEstimationMethod;
        scalarMethod: ScalarGaussianEstimationMethod;
      }
    | undefined;
  let usedObservationIds:
    | { transition: string[]; scalar: string[]; all: string[] }
    | undefined;

  for (const assignment of assignments) {
    const anchorValue = assignment[anchor.parameterId];
    if (anchorValue === undefined) {
      return failure(
        'candidate_evaluation',
        'missing_anchor_value',
        'assignment',
        'Generated assignment is missing anchor parameter'
      );
    }

    const single = estimateCompositeParameterCandidates(
      documentWithAssignment(document, assignment),
      observations,
      compositeRequestForAssignment(anchor.parameterId, anchorValue, request)
    );

    if (!single.ok) {
      if (assignmentSpecificCompositeFailure(single.stage, single.componentStage)) {
        rejectedAssignments.push({
          assignment: { ...assignment },
          stage: 'candidate_evaluation',
          compositeStage: single.stage,
          ...(single.componentStage !== undefined ? { componentStage: single.componentStage } : {}),
          issues: single.issues.map((issue) => ({ ...issue }))
        });
        continue;
      }
      return {
        ok: false,
        stage: single.stage === 'request' ? 'request' : 'composite_contract',
        compositeStage: single.stage,
        ...(single.componentStage !== undefined ? { componentStage: single.componentStage } : {}),
        issues: single.issues.map((issue) => ({ ...issue }))
      };
    }

    methods ??= {
      compositeMethod: single.method,
      transitionMethod: single.transitionMethod,
      scalarMethod: single.scalarMethod
    };
    usedObservationIds ??= {
      transition: [...single.usedObservationIds.transition],
      scalar: [...single.usedObservationIds.scalar],
      all: [...single.usedObservationIds.all]
    };

    const candidate = single.candidates[0];
    if (candidate === undefined) {
      const rejected = single.rejectedCandidates[0];
      rejectedAssignments.push({
        assignment: { ...assignment },
        stage: 'candidate_evaluation',
        compositeStage: 'candidate_result',
        issues:
          rejected?.components.flatMap((component) => component.issues.map((issue) => ({ ...issue }))) ?? [
            {
              code: 'missing_assignment_score',
              path: 'assignment',
              message: 'Composite scorer did not return the generated assignment candidate'
            }
          ],
        ...(rejected !== undefined
          ? {
              rejectedComponents: rejected.components.map((component) => ({
                component: component.component,
                stage: component.stage,
                issues: component.issues.map((issue) => ({ ...issue }))
              }))
            }
          : {})
      });
      continue;
    }

    results.push({
      assignment: { ...assignment },
      possible: candidate.possible,
      transitionLogLikelihoodScore: candidate.transitionLogLikelihoodScore,
      scalarGaussianLogLikelihoodScore: candidate.scalarGaussianLogLikelihoodScore,
      totalLogLikelihoodScore: candidate.totalLogLikelihoodScore,
      relativeLikelihoodToBest: 0,
      rank: null,
      transitionStateScores: candidate.transitionStateScores.map((score) => ({ ...score })),
      scalarObservationScores: candidate.scalarObservationScores.map((score) => ({ ...score })),
      scalarDiagnostics: {
        ...(candidate.scalarDiagnostics.expectedElapsedTime !== undefined
          ? { expectedElapsedTime: { ...candidate.scalarDiagnostics.expectedElapsedTime } }
          : {}),
        ...(candidate.scalarDiagnostics.rewardAxes !== undefined
          ? {
              rewardAxes: Object.fromEntries(
                Object.entries(candidate.scalarDiagnostics.rewardAxes).map(([axisId, diagnostics]) => [
                  axisId,
                  { ...diagnostics }
                ])
              )
            }
          : {})
      }
    });
  }

  if (results.length === 0 || methods === undefined || usedObservationIds === undefined) {
    return failure(
      'candidate_evaluation',
      'no_evaluable_assignments',
      'request.parameters',
      'No generated parameter assignment produced a composite likelihood result'
    );
  }

  rankAssignments(results);
  const best = bestAssignments(results);
  const identifiability: MultiParameterGridIdentifiability =
    best.length === 0
      ? 'no_possible_assignment'
      : best.length === 1
        ? 'unique_best_assignment'
        : 'tied_best_assignments';

  return {
    ok: true,
    searchMethod: SEARCH_METHOD,
    compositeMethod: methods.compositeMethod,
    transitionMethod: methods.transitionMethod,
    scalarMethod: methods.scalarMethod,
    parameterIds: eligible.dimensions.map((dimension) => dimension.parameterId),
    rawCombinationCount,
    eligibleCombinationCount,
    maxCombinations: request.maxCombinations,
    assignments: results,
    rejectedAssignments,
    excludedCandidatesByParameter: eligible.excluded,
    bestAssignments: best,
    estimatedAssignment: best.length === 1 ? { ...best[0]! } : null,
    identifiability,
    usedObservationIds,
    independenceAssumption: request.independenceAssumption,
    transitionMultinomialConstantOmitted: true,
    priorUsed: false,
    posteriorComputed: false,
    scoreInterpretation:
      'finite_grid_sum_of_component_log_likelihood_scores_up_to_transition_candidate_independent_constant'
  };
}

export function multiParameterCompositeGridEstimationResultToJson(
  result: MultiParameterCompositeGridEstimationResult
): string {
  return JSON.stringify(result);
}
