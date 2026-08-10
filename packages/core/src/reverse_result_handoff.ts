import type { EstimationConstraint, EstimationIssue } from './discrete_estimation';
import type { ParameterAssignment } from './multi_parameter_grid_estimation';
import type {
  CheckedReverseEstimationKind,
  ExternalReverseMethodResult,
  ExternalReverseMethodSuccess,
  ReverseExternalInputIssue
} from './reverse_external_methods';
import type { ScalarGaussianCandidateDiagnostics } from './scalar_gaussian_estimation';

export type ReverseResultHandoffSchemaVersion = 1;

export type ReverseResultLimitationCode =
  | 'finite_candidate_space_only'
  | 'relative_likelihood_is_not_posterior_probability'
  | 'no_confidence_or_credible_interval_computed'
  | 'no_causal_attribution_computed'
  | 'transition_multinomial_constant_omitted'
  | 'scalar_units_require_exact_match_no_conversion'
  | 'finite_grid_identifiability_only';

export type ReverseResultWarningCode =
  | 'estimate_not_unique'
  | 'no_possible_candidate_or_assignment'
  | 'some_candidates_or_assignments_rejected'
  | 'some_candidates_excluded_by_constraints';

export type ReverseResultLimitation = {
  code: ReverseResultLimitationCode;
  message: string;
};

export type ReverseResultWarning = {
  code: ReverseResultWarningCode;
  message: string;
};

export type ReverseSingleParameterSelectionStatus =
  | 'unique_best_candidate'
  | 'tied_best_candidates'
  | 'no_best_candidate';

export type ReverseSingleParameterSelection = {
  parameterId: string;
  estimatedValue: number | null;
  bestCandidateValues: number[];
  status: ReverseSingleParameterSelectionStatus;
};

export type ReverseMultiParameterSelection = {
  parameterIds: string[];
  estimatedAssignment: ParameterAssignment | null;
  bestAssignments: ParameterAssignment[];
  identifiability:
    | 'unique_best_assignment'
    | 'tied_best_assignments'
    | 'no_possible_assignment';
};

export type ReverseSingleParameterConstraints = {
  parameterId: string;
  constraints: EstimationConstraint[];
};

export type ReverseMultiParameterConstraints = Array<{
  parameterId: string;
  constraints: EstimationConstraint[];
}>;

export type ReverseDiscreteCandidateRankingRow = {
  value: number;
  possible: boolean;
  logLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
};

export type ReverseScalarCandidateRankingRow = {
  value: number;
  logLikelihoodScore: number;
  relativeLikelihoodToBest: number;
  rank: number | null;
  diagnostics: ScalarGaussianCandidateDiagnostics;
};

export type ReverseCompositeCandidateRankingRow = {
  value: number;
  possible: boolean;
  transitionLogLikelihoodScore: number | null;
  scalarGaussianLogLikelihoodScore: number;
  totalLogLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
  scalarDiagnostics: ScalarGaussianCandidateDiagnostics;
};

export type ReverseGridAssignmentRankingRow = {
  assignment: ParameterAssignment;
  possible: boolean;
  logLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
};

export type ReverseResultMethods = {
  likelihoodMethod?: string;
  compositeMethod?: string;
  transitionMethod?: string;
  scalarMethod?: string;
  searchMethod?: string;
};

export type ReverseResultEvidence = {
  usedObservationIds: string[];
  blocks?: {
    transition: string[];
    scalar: string[];
  };
};

export type ReverseResultHandoffSuccess = {
  schemaVersion: ReverseResultHandoffSchemaVersion;
  kind: 'reverse_estimation_handoff';
  status: 'success';
  estimationKind: CheckedReverseEstimationKind;
  methods: ReverseResultMethods;
  selection: ReverseSingleParameterSelection | ReverseMultiParameterSelection;
  ranking:
    | ReverseDiscreteCandidateRankingRow[]
    | ReverseScalarCandidateRankingRow[]
    | ReverseCompositeCandidateRankingRow[]
    | ReverseGridAssignmentRankingRow[];
  evidence: ReverseResultEvidence;
  constraints: ReverseSingleParameterConstraints | ReverseMultiParameterConstraints;
  assumptions: string[];
  searchLimits?: {
    rawCombinationCount: number;
    eligibleCombinationCount: number;
    maxCombinations: number;
  };
  priorUsed: false;
  posteriorComputed: false;
  warnings: ReverseResultWarning[];
  limitations: ReverseResultLimitation[];
};

export type ReverseResultHandoffFailure = {
  schemaVersion: ReverseResultHandoffSchemaVersion;
  kind: 'reverse_estimation_handoff';
  status: 'failure';
  stage: 'json_syntax' | 'shape' | 'estimation';
  estimationKind?: CheckedReverseEstimationKind;
  estimationStage?: string;
  issues: Array<ReverseExternalInputIssue | EstimationIssue>;
};

export type ReverseResultHandoff = ReverseResultHandoffSuccess | ReverseResultHandoffFailure;

function copyConstraints(constraints: EstimationConstraint[] | undefined): EstimationConstraint[] {
  return (constraints ?? []).map((constraint) => ({ ...constraint }));
}

function copyAssignment(assignment: ParameterAssignment): ParameterAssignment {
  return { ...assignment };
}

function singleSelection(
  parameterId: string,
  estimatedValue: number | null,
  bestCandidateValues: number[]
): ReverseSingleParameterSelection {
  return {
    parameterId,
    estimatedValue,
    bestCandidateValues: [...bestCandidateValues],
    status:
      bestCandidateValues.length === 0
        ? 'no_best_candidate'
        : bestCandidateValues.length === 1
          ? 'unique_best_candidate'
          : 'tied_best_candidates'
  };
}

function commonLimitations(): ReverseResultLimitation[] {
  return [
    {
      code: 'finite_candidate_space_only',
      message: 'The result is conditional on the caller-supplied finite candidate space.'
    },
    {
      code: 'relative_likelihood_is_not_posterior_probability',
      message: 'relativeLikelihoodToBest is a likelihood ratio, not a posterior probability.'
    },
    {
      code: 'no_confidence_or_credible_interval_computed',
      message: 'No confidence interval or Bayesian credible interval was computed.'
    },
    {
      code: 'no_causal_attribution_computed',
      message: 'Parameter estimation and scenario ranking are not causal attribution.'
    }
  ];
}

function transitionConstantLimitation(): ReverseResultLimitation {
  return {
    code: 'transition_multinomial_constant_omitted',
    message:
      'Transition-count scores omit the candidate-independent multinomial constant; candidate ranking and relative likelihood remain comparable for the same evidence.'
  };
}

function scalarUnitLimitation(): ReverseResultLimitation {
  return {
    code: 'scalar_units_require_exact_match_no_conversion',
    message:
      'Scalar observation, predictor, and Gaussian error-model units must match exactly; no unit conversion is performed.'
  };
}

function warningsForSingle(
  bestCandidateValues: number[],
  rejectedCount: number,
  excludedCount: number
): ReverseResultWarning[] {
  const warnings: ReverseResultWarning[] = [];
  if (bestCandidateValues.length === 0) {
    warnings.push({
      code: 'no_possible_candidate_or_assignment',
      message: 'No candidate produced a best selectable estimate.'
    });
  } else if (bestCandidateValues.length > 1) {
    warnings.push({
      code: 'estimate_not_unique',
      message: 'Multiple candidates share the best score; no unique estimate is selected.'
    });
  }
  if (rejectedCount > 0) {
    warnings.push({
      code: 'some_candidates_or_assignments_rejected',
      message: `${rejectedCount} candidate(s) were rejected during evaluation.`
    });
  }
  if (excludedCount > 0) {
    warnings.push({
      code: 'some_candidates_excluded_by_constraints',
      message: `${excludedCount} candidate(s) were excluded by explicit constraints.`
    });
  }
  return warnings;
}

function summarizeDiscrete(
  success: Extract<ExternalReverseMethodSuccess, { estimationKind: 'discrete_parameter_candidates' }>
): ReverseResultHandoffSuccess {
  const estimation = success.estimation;
  return {
    schemaVersion: 1,
    kind: 'reverse_estimation_handoff',
    status: 'success',
    estimationKind: success.estimationKind,
    methods: { likelihoodMethod: estimation.method },
    selection: singleSelection(
      estimation.parameterId,
      estimation.estimatedValue,
      estimation.bestCandidateValues
    ),
    ranking: estimation.candidates.map((candidate) => ({
      value: candidate.value,
      possible: candidate.possible,
      logLikelihoodScore: candidate.logLikelihoodScore,
      relativeLikelihoodToBest: candidate.relativeLikelihoodToBest,
      rank: candidate.rank
    })),
    evidence: { usedObservationIds: [...estimation.usedObservationIds] },
    constraints: {
      parameterId: success.document.request.parameterId,
      constraints: copyConstraints(success.document.request.constraints)
    },
    assumptions: [],
    priorUsed: estimation.priorUsed,
    posteriorComputed: estimation.posteriorComputed,
    warnings: warningsForSingle(
      estimation.bestCandidateValues,
      estimation.rejectedCandidates.length,
      estimation.excludedCandidates.length
    ),
    limitations: [...commonLimitations(), transitionConstantLimitation()]
  };
}

function summarizeScalar(
  success: Extract<ExternalReverseMethodSuccess, { estimationKind: 'scalar_gaussian_parameter_candidates' }>
): ReverseResultHandoffSuccess {
  const estimation = success.estimation;
  return {
    schemaVersion: 1,
    kind: 'reverse_estimation_handoff',
    status: 'success',
    estimationKind: success.estimationKind,
    methods: { likelihoodMethod: estimation.method },
    selection: singleSelection(
      estimation.parameterId,
      estimation.estimatedValue,
      estimation.bestCandidateValues
    ),
    ranking: estimation.candidates.map((candidate) => ({
      value: candidate.value,
      logLikelihoodScore: candidate.logLikelihoodScore,
      relativeLikelihoodToBest: candidate.relativeLikelihoodToBest,
      rank: candidate.rank,
      diagnostics: { ...candidate.diagnostics }
    })),
    evidence: { usedObservationIds: [...estimation.usedObservationIds] },
    constraints: {
      parameterId: success.document.request.parameterId,
      constraints: copyConstraints(success.document.request.constraints)
    },
    assumptions: [estimation.independenceAssumption],
    priorUsed: estimation.priorUsed,
    posteriorComputed: estimation.posteriorComputed,
    warnings: warningsForSingle(
      estimation.bestCandidateValues,
      estimation.rejectedCandidates.length,
      estimation.excludedCandidates.length
    ),
    limitations: [...commonLimitations(), scalarUnitLimitation()]
  };
}

function summarizeComposite(
  success: Extract<ExternalReverseMethodSuccess, { estimationKind: 'composite_parameter_candidates' }>
): ReverseResultHandoffSuccess {
  const estimation = success.estimation;
  return {
    schemaVersion: 1,
    kind: 'reverse_estimation_handoff',
    status: 'success',
    estimationKind: success.estimationKind,
    methods: {
      compositeMethod: estimation.method,
      transitionMethod: estimation.transitionMethod,
      scalarMethod: estimation.scalarMethod
    },
    selection: singleSelection(
      estimation.parameterId,
      estimation.estimatedValue,
      estimation.bestCandidateValues
    ),
    ranking: estimation.candidates.map((candidate) => ({
      value: candidate.value,
      possible: candidate.possible,
      transitionLogLikelihoodScore: candidate.transitionLogLikelihoodScore,
      scalarGaussianLogLikelihoodScore: candidate.scalarGaussianLogLikelihoodScore,
      totalLogLikelihoodScore: candidate.totalLogLikelihoodScore,
      relativeLikelihoodToBest: candidate.relativeLikelihoodToBest,
      rank: candidate.rank,
      scalarDiagnostics: { ...candidate.scalarDiagnostics }
    })),
    evidence: {
      usedObservationIds: [...estimation.usedObservationIds.all],
      blocks: {
        transition: [...estimation.usedObservationIds.transition],
        scalar: [...estimation.usedObservationIds.scalar]
      }
    },
    constraints: {
      parameterId: success.document.request.parameterId,
      constraints: copyConstraints(success.document.request.constraints)
    },
    assumptions: [estimation.independenceAssumption],
    priorUsed: estimation.priorUsed,
    posteriorComputed: estimation.posteriorComputed,
    warnings: warningsForSingle(
      estimation.bestCandidateValues,
      estimation.rejectedCandidates.length,
      estimation.excludedCandidates.length
    ),
    limitations: [
      ...commonLimitations(),
      transitionConstantLimitation(),
      scalarUnitLimitation()
    ]
  };
}

function summarizeGrid(
  success: Extract<ExternalReverseMethodSuccess, { estimationKind: 'multi_parameter_transition_grid' }>
): ReverseResultHandoffSuccess {
  const estimation = success.estimation;
  const warnings: ReverseResultWarning[] = [];
  if (estimation.identifiability === 'tied_best_assignments') {
    warnings.push({
      code: 'estimate_not_unique',
      message: 'Multiple assignments share the best score; no unique assignment is selected.'
    });
  } else if (estimation.identifiability === 'no_possible_assignment') {
    warnings.push({
      code: 'no_possible_candidate_or_assignment',
      message: 'No possible assignment exists on the supplied eligible finite grid.'
    });
  }
  if (estimation.rejectedAssignments.length > 0) {
    warnings.push({
      code: 'some_candidates_or_assignments_rejected',
      message: `${estimation.rejectedAssignments.length} assignment(s) were rejected during evaluation.`
    });
  }
  const excludedCount = estimation.excludedCandidatesByParameter.reduce(
    (total, parameter) => total + parameter.excludedCandidates.length,
    0
  );
  if (excludedCount > 0) {
    warnings.push({
      code: 'some_candidates_excluded_by_constraints',
      message: `${excludedCount} parameter candidate(s) were excluded by explicit constraints.`
    });
  }

  return {
    schemaVersion: 1,
    kind: 'reverse_estimation_handoff',
    status: 'success',
    estimationKind: success.estimationKind,
    methods: {
      likelihoodMethod: estimation.likelihoodMethod,
      searchMethod: estimation.searchMethod
    },
    selection: {
      parameterIds: [...estimation.parameterIds],
      estimatedAssignment:
        estimation.estimatedAssignment === null
          ? null
          : copyAssignment(estimation.estimatedAssignment),
      bestAssignments: estimation.bestAssignments.map(copyAssignment),
      identifiability: estimation.identifiability
    },
    ranking: estimation.assignments.map((assignment) => ({
      assignment: copyAssignment(assignment.assignment),
      possible: assignment.possible,
      logLikelihoodScore: assignment.logLikelihoodScore,
      relativeLikelihoodToBest: assignment.relativeLikelihoodToBest,
      rank: assignment.rank
    })),
    evidence: { usedObservationIds: [...estimation.usedObservationIds] },
    constraints: success.document.request.parameters.map((parameter) => ({
      parameterId: parameter.parameterId,
      constraints: copyConstraints(parameter.constraints)
    })),
    assumptions: [],
    searchLimits: {
      rawCombinationCount: estimation.rawCombinationCount,
      eligibleCombinationCount: estimation.eligibleCombinationCount,
      maxCombinations: estimation.maxCombinations
    },
    priorUsed: estimation.priorUsed,
    posteriorComputed: estimation.posteriorComputed,
    warnings,
    limitations: [
      ...commonLimitations(),
      transitionConstantLimitation(),
      {
        code: 'finite_grid_identifiability_only',
        message:
          'Identifiability describes only the supplied finite grid and is not a global structural-identifiability result.'
      }
    ]
  };
}

function summarizeFailure(result: Exclude<ExternalReverseMethodResult, ExternalReverseMethodSuccess>): ReverseResultHandoffFailure {
  if (result.stage === 'estimation') {
    return {
      schemaVersion: 1,
      kind: 'reverse_estimation_handoff',
      status: 'failure',
      stage: result.stage,
      estimationKind: result.estimationKind,
      estimationStage: result.estimationStage,
      issues: result.issues.map((issue) => ({ ...issue }))
    };
  }
  return {
    schemaVersion: 1,
    kind: 'reverse_estimation_handoff',
    status: 'failure',
    stage: result.stage,
    issues: result.issues.map((issue) => ({ ...issue }))
  };
}

export function toReverseResultHandoff(result: ExternalReverseMethodResult): ReverseResultHandoff {
  if (!result.ok) {
    return summarizeFailure(result);
  }
  switch (result.estimationKind) {
    case 'discrete_parameter_candidates':
      return summarizeDiscrete(result);
    case 'scalar_gaussian_parameter_candidates':
      return summarizeScalar(result);
    case 'composite_parameter_candidates':
      return summarizeComposite(result);
    case 'multi_parameter_transition_grid':
      return summarizeGrid(result);
  }
}

export function reverseResultHandoffToJson(handoff: ReverseResultHandoff): string {
  return JSON.stringify(handoff);
}

function formatAssignment(assignment: ParameterAssignment | null): string {
  if (assignment === null) {
    return 'null';
  }
  return Object.entries(assignment)
    .map(([parameterId, value]) => `${parameterId}=${value}`)
    .join(', ');
}

export function formatReverseResultHandoffPlainText(handoff: ReverseResultHandoff): string {
  if (handoff.status === 'failure') {
    const lines = [
      'reverse estimation: failure',
      `stage: ${handoff.stage}`,
      ...(handoff.estimationKind !== undefined ? [`estimation kind: ${handoff.estimationKind}`] : []),
      ...(handoff.estimationStage !== undefined ? [`estimation stage: ${handoff.estimationStage}`] : []),
      `issues: ${handoff.issues.map((issue) => issue.code).join(', ')}`
    ];
    return lines.join('\n');
  }

  const selection = handoff.selection;
  const estimateText =
    'parameterId' in selection
      ? `${selection.parameterId}=${selection.estimatedValue === null ? 'null' : selection.estimatedValue}`
      : formatAssignment(selection.estimatedAssignment);
  const methodValues = Object.values(handoff.methods).filter(
    (value): value is string => value !== undefined
  );
  return [
    'reverse estimation: success',
    `estimation kind: ${handoff.estimationKind}`,
    `method/search: ${methodValues.join(' + ')}`,
    `estimate: ${estimateText}`,
    `used observations: ${handoff.evidence.usedObservationIds.join(', ')}`,
    `prior used: ${handoff.priorUsed}`,
    `posterior computed: ${handoff.posteriorComputed}`,
    `warnings: ${handoff.warnings.map((warning) => warning.code).join(', ') || 'none'}`,
    `limitations: ${handoff.limitations.map((limitation) => limitation.code).join(', ')}`
  ].join('\n');
}
