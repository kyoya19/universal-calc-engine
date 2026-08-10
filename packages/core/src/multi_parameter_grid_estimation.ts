import {
  DiscreteEstimationMethod,
  EstimationConstraint,
  EstimationIssue,
  ExcludedCandidate,
  estimateDiscreteParameterCandidates
} from './discrete_estimation';
import { ExternalModelDocument } from './external_input';
import { ObservationDataset } from './observations';
import { ParameterId, ParameterValues } from './parameterized_scalars';

export type MultiParameterGridSearchMethod = 'finite_cartesian_parameter_grid';

export type ParameterCandidateDimension = {
  parameterId: ParameterId;
  candidates: number[];
  constraints?: EstimationConstraint[];
};

export type MultiParameterGridEstimationRequest = {
  parameters: ParameterCandidateDimension[];
  maxCombinations: number;
};

export type ParameterAssignment = Record<ParameterId, number>;

export type ExcludedParameterCandidates = {
  parameterId: ParameterId;
  excludedCandidates: ExcludedCandidate[];
};

export type MultiParameterGridAssignmentResult = {
  assignment: ParameterAssignment;
  possible: boolean;
  logLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
};

export type RejectedParameterAssignment = {
  assignment: ParameterAssignment;
  stage: 'request' | 'candidate_evaluation';
  issues: EstimationIssue[];
};

export type MultiParameterGridIdentifiability =
  | 'unique_best_assignment'
  | 'tied_best_assignments'
  | 'no_possible_assignment';

export type MultiParameterGridEstimationSuccess = {
  ok: true;
  searchMethod: MultiParameterGridSearchMethod;
  likelihoodMethod: DiscreteEstimationMethod;
  parameterIds: ParameterId[];
  rawCombinationCount: number;
  eligibleCombinationCount: number;
  maxCombinations: number;
  assignments: MultiParameterGridAssignmentResult[];
  rejectedAssignments: RejectedParameterAssignment[];
  excludedCandidatesByParameter: ExcludedParameterCandidates[];
  bestAssignments: ParameterAssignment[];
  estimatedAssignment: ParameterAssignment | null;
  identifiability: MultiParameterGridIdentifiability;
  usedObservationIds: string[];
  priorUsed: false;
  posteriorComputed: false;
  scoreInterpretation: 'candidate_grid_transition_likelihood_score';
};

export type MultiParameterGridFailureStage =
  | 'request'
  | 'observation_validation'
  | 'observation_likelihood_contract'
  | 'candidate_evaluation';

export type MultiParameterGridEstimationFailure = {
  ok: false;
  stage: MultiParameterGridFailureStage;
  issues: EstimationIssue[];
};

export type MultiParameterGridEstimationResult =
  | MultiParameterGridEstimationSuccess
  | MultiParameterGridEstimationFailure;

type EligibleDimension = {
  parameterId: ParameterId;
  candidates: number[];
};

const SEARCH_METHOD: MultiParameterGridSearchMethod = 'finite_cartesian_parameter_grid';
const LIKELIHOOD_METHOD: DiscreteEstimationMethod =
  'conditional_transition_log_likelihood_without_multinomial_constant';

function failure(
  stage: MultiParameterGridFailureStage,
  code: string,
  path: string,
  message: string
): MultiParameterGridEstimationFailure {
  return { ok: false, stage, issues: [{ code, path, message }] };
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

function validateRequest(
  document: ExternalModelDocument,
  request: MultiParameterGridEstimationRequest
): MultiParameterGridEstimationFailure | undefined {
  if (request.parameters.length < 2) {
    return failure(
      'request',
      'insufficient_unknown_parameters',
      'request.parameters',
      'Multi-parameter grid estimation requires at least two parameter dimensions'
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

  const rawCombinationCount = safeProduct(
    request.parameters.map((dimension) => dimension.candidates.length)
  );
  if (rawCombinationCount === undefined) {
    return failure(
      'request',
      'combination_count_overflow',
      'request.parameters',
      'Raw Cartesian candidate count exceeds the safe integer range'
    );
  }
  return undefined;
}

function eligibleDimensions(request: MultiParameterGridEstimationRequest): {
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

function rankAssignments(assignments: MultiParameterGridAssignmentResult[]): void {
  const possible = assignments.filter(
    (assignment): assignment is MultiParameterGridAssignmentResult & { logLikelihoodScore: number } =>
      assignment.possible && assignment.logLikelihoodScore !== null
  );
  possible.sort((left, right) => right.logLikelihoodScore - left.logLikelihoodScore);
  const best = possible[0]?.logLikelihoodScore;
  if (best === undefined) {
    return;
  }
  possible.forEach((assignment, index) => {
    assignment.rank = index + 1;
    assignment.relativeLikelihoodToBest = Math.exp(assignment.logLikelihoodScore - best);
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

function bestAssignments(assignments: MultiParameterGridAssignmentResult[]): ParameterAssignment[] {
  const possible = assignments.filter(
    (assignment): assignment is MultiParameterGridAssignmentResult & { logLikelihoodScore: number } =>
      assignment.possible && assignment.logLikelihoodScore !== null
  );
  const best = possible[0]?.logLikelihoodScore;
  if (best === undefined) {
    return [];
  }
  const tolerance = 1e-12;
  return possible
    .filter((assignment) => Math.abs(assignment.logLikelihoodScore - best) <= tolerance)
    .map((assignment) => ({ ...assignment.assignment }));
}

export function estimateMultiParameterGrid(
  document: ExternalModelDocument,
  observations: ObservationDataset,
  request: MultiParameterGridEstimationRequest
): MultiParameterGridEstimationResult {
  const invalidRequest = validateRequest(document, request);
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

  const results: MultiParameterGridAssignmentResult[] = [];
  const rejectedAssignments: RejectedParameterAssignment[] = [];
  let usedObservationIds: string[] = [];

  for (const assignment of assignments) {
    const anchorValue = assignment[anchor.parameterId];
    if (anchorValue === undefined) {
      return failure('candidate_evaluation', 'missing_anchor_value', 'assignment', 'Generated assignment is missing anchor parameter');
    }

    const single = estimateDiscreteParameterCandidates(
      documentWithAssignment(document, assignment),
      observations,
      {
        parameterId: anchor.parameterId,
        candidates: [anchorValue]
      }
    );

    if (!single.ok) {
      if (
        single.stage === 'observation_validation' ||
        single.stage === 'observation_likelihood_contract'
      ) {
        return {
          ok: false,
          stage: single.stage,
          issues: single.issues.map((issue) => ({ ...issue }))
        };
      }
      rejectedAssignments.push({
        assignment: { ...assignment },
        stage: single.stage === 'request' ? 'request' : 'candidate_evaluation',
        issues: single.issues.map((issue) => ({ ...issue }))
      });
      continue;
    }

    if (usedObservationIds.length === 0) {
      usedObservationIds = [...single.usedObservationIds];
    }
    const candidate = single.candidates[0];
    if (candidate === undefined) {
      rejectedAssignments.push({
        assignment: { ...assignment },
        stage: 'candidate_evaluation',
        issues: [
          {
            code: 'missing_assignment_score',
            path: 'assignment',
            message: 'Single-parameter scorer did not return the generated assignment candidate'
          }
        ]
      });
      continue;
    }

    results.push({
      assignment: { ...assignment },
      possible: candidate.possible,
      logLikelihoodScore: candidate.logLikelihoodScore,
      relativeLikelihoodToBest: 0,
      rank: null
    });
  }

  if (results.length === 0) {
    return failure(
      'candidate_evaluation',
      'no_evaluable_assignments',
      'request.parameters',
      'No generated parameter assignment could be evaluated'
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
    likelihoodMethod: LIKELIHOOD_METHOD,
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
    priorUsed: false,
    posteriorComputed: false,
    scoreInterpretation: 'candidate_grid_transition_likelihood_score'
  };
}

export function multiParameterGridEstimationResultToJson(
  result: MultiParameterGridEstimationResult
): string {
  return JSON.stringify(result);
}
