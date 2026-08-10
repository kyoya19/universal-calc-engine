import {
  ExternalModelDocument,
  prepareExternalModelDocument
} from './external_input';
import {
  DefinitionModel,
  EvaluatedModel,
  StateId,
  evaluateModel,
  expandModel
} from './model';
import {
  ObservationDataset,
  ObservationValidationResult,
  TransitionCountObservation,
  validateObservationDataset
} from './observations';
import { ParameterId, ParameterValues } from './parameterized_scalars';

export type ReverseLikelihoodKind = 'transition_multinomial_complete_categories';
export type ReverseEstimateKind = 'maximum_likelihood_over_discrete_candidates';

export type NumericRangeConstraint = {
  type: 'range';
  min?: number;
  max?: number;
};

export type DiscreteParameterEstimationRequest = {
  document: ExternalModelDocument;
  observations: ObservationDataset;
  unknownParameter: ParameterId;
  candidateValues: number[];
  constraint?: NumericRangeConstraint;
};

export type ReverseEstimationStage =
  | 'request'
  | 'observation_validation'
  | 'likelihood_data';

export type ReverseEstimationIssue = {
  stage: ReverseEstimationStage;
  code: string;
  path: string;
  message: string;
};

export type CandidateRejectionIssue = {
  code: string;
  message: string;
};

export type TransitionLikelihoodCategory = {
  to: StateId;
  count: number;
  probability: number;
};

export type TransitionLikelihoodTerm = {
  from: StateId;
  totalCount: number;
  categories: TransitionLikelihoodCategory[];
  zeroLikelihood: boolean;
  logLikelihood: number | null;
};

export type ScoredParameterCandidate = {
  candidateValue: number;
  status: 'scored';
  zeroLikelihood: boolean;
  logLikelihood: number | null;
  relativeLikelihoodToBest: number;
  terms: TransitionLikelihoodTerm[];
};

export type RejectedParameterCandidate = {
  candidateValue: number;
  status: 'rejected';
  issues: CandidateRejectionIssue[];
};

export type ParameterCandidateResult =
  | ScoredParameterCandidate
  | RejectedParameterCandidate;

export type DiscreteParameterEstimate = {
  estimateKind: ReverseEstimateKind;
  likelihoodKind: ReverseLikelihoodKind;
  unknownParameter: ParameterId;
  parameterLabel?: string;
  parameterUnit?: string;
  candidateCount: number;
  scoredCandidateCount: number;
  rejectedCandidateCount: number;
  usedObservationIds: string[];
  ignoredObservationIds: string[];
  bestCandidateValues: number[];
  estimatedValue: number | null;
  maximumLogLikelihood: number | null;
  allScoredCandidatesZeroLikelihood: boolean;
  candidates: ParameterCandidateResult[];
};

export type DiscreteParameterEstimationResult =
  | {
      ok: true;
      estimation: DiscreteParameterEstimate;
    }
  | {
      ok: false;
      stage: ReverseEstimationStage;
      issues: ReverseEstimationIssue[];
      observationValidation?: ObservationValidationResult;
    };

type TransitionCountGroup = {
  from: StateId;
  countsByTo: Map<StateId, number>;
};

const TIE_TOLERANCE = 1e-12;

function hasOwn(record: ParameterValues | undefined, key: string): boolean {
  return record !== undefined && Object.prototype.hasOwnProperty.call(record, key);
}

function requestFailure(
  code: string,
  path: string,
  message: string
): DiscreteParameterEstimationResult {
  return {
    ok: false,
    stage: 'request',
    issues: [{ stage: 'request', code, path, message }]
  };
}

function likelihoodDataFailure(
  code: string,
  path: string,
  message: string
): DiscreteParameterEstimationResult {
  return {
    ok: false,
    stage: 'likelihood_data',
    issues: [{ stage: 'likelihood_data', code, path, message }]
  };
}

function structuralObservationModel(document: ExternalModelDocument): DefinitionModel {
  return {
    startState: document.model.startState,
    states: document.model.states.map((state) => ({
      ...state,
      ...(state.properties !== undefined ? { properties: { ...state.properties } } : {})
    })),
    transitions: document.model.transitions.map((transition) => ({
      from: transition.from,
      to: transition.to,
      probability: 1
    }))
  };
}

function validateRequest(
  request: DiscreteParameterEstimationRequest
): DiscreteParameterEstimationResult | undefined {
  const parameter = request.document.model.parameters.find(
    (entry) => entry.id === request.unknownParameter
  );
  if (parameter === undefined) {
    return requestFailure(
      'unknown_estimation_parameter',
      'unknownParameter',
      `Unknown estimation parameter: ${request.unknownParameter}`
    );
  }

  if (hasOwn(request.document.parameterValues, request.unknownParameter)) {
    return requestFailure(
      'unknown_parameter_already_supplied',
      `document.parameterValues.${request.unknownParameter}`,
      `The estimated parameter ${request.unknownParameter} must not also be supplied as a fixed parameter value`
    );
  }

  if (request.candidateValues.length === 0) {
    return requestFailure(
      'empty_candidate_set',
      'candidateValues',
      'At least one candidate value is required'
    );
  }

  const seenCandidates = new Set<number>();
  for (let index = 0; index < request.candidateValues.length; index += 1) {
    const candidate = request.candidateValues[index];
    if (candidate === undefined || !Number.isFinite(candidate)) {
      return requestFailure(
        'invalid_candidate_value',
        `candidateValues[${index}]`,
        'Candidate values must be finite numbers'
      );
    }
    if (seenCandidates.has(candidate)) {
      return requestFailure(
        'duplicate_candidate_value',
        `candidateValues[${index}]`,
        `Duplicate candidate value: ${candidate}`
      );
    }
    seenCandidates.add(candidate);
  }

  if (request.constraint !== undefined) {
    const { min, max } = request.constraint;
    if (min !== undefined && !Number.isFinite(min)) {
      return requestFailure(
        'invalid_constraint_min',
        'constraint.min',
        'Constraint min must be finite when provided'
      );
    }
    if (max !== undefined && !Number.isFinite(max)) {
      return requestFailure(
        'invalid_constraint_max',
        'constraint.max',
        'Constraint max must be finite when provided'
      );
    }
    if (min !== undefined && max !== undefined && min > max) {
      return requestFailure(
        'invalid_constraint_range',
        'constraint',
        'Constraint min must not exceed max'
      );
    }
  }

  return undefined;
}

function aggregateTransitionCounts(
  observations: ObservationDataset
): {
  groups: TransitionCountGroup[];
  usedObservationIds: string[];
  ignoredObservationIds: string[];
} {
  const groupsByFrom = new Map<StateId, Map<StateId, number>>();
  const usedObservationIds: string[] = [];
  const ignoredObservationIds: string[] = [];

  for (const observation of observations.observations) {
    if (observation.type !== 'transition_count') {
      ignoredObservationIds.push(observation.id);
      continue;
    }

    usedObservationIds.push(observation.id);
    let countsByTo = groupsByFrom.get(observation.from);
    if (countsByTo === undefined) {
      countsByTo = new Map<StateId, number>();
      groupsByFrom.set(observation.from, countsByTo);
    }
    countsByTo.set(
      observation.to,
      (countsByTo.get(observation.to) ?? 0) + observation.count
    );
  }

  return {
    groups: [...groupsByFrom.entries()].map(([from, countsByTo]) => ({
      from,
      countsByTo
    })),
    usedObservationIds,
    ignoredObservationIds
  };
}

function validateCompleteTransitionCategories(
  document: ExternalModelDocument,
  groups: TransitionCountGroup[]
): DiscreteParameterEstimationResult | undefined {
  if (groups.length === 0) {
    return likelihoodDataFailure(
      'missing_transition_count_observations',
      'observations',
      'The current reverse likelihood requires at least one transition_count observation'
    );
  }

  const destinationsByFrom = new Map<StateId, Set<StateId>>();
  for (const transition of document.model.transitions) {
    let destinations = destinationsByFrom.get(transition.from);
    if (destinations === undefined) {
      destinations = new Set<StateId>();
      destinationsByFrom.set(transition.from, destinations);
    }
    destinations.add(transition.to);
  }

  for (const group of groups) {
    const destinations = destinationsByFrom.get(group.from) ?? new Set<StateId>();
    for (const destination of destinations) {
      if (!group.countsByTo.has(destination)) {
        return likelihoodDataFailure(
          'incomplete_transition_count_categories',
          `observations.${group.from}`,
          `A transition_count observation, including an explicit zero count, is required for every outgoing destination from ${group.from}; missing ${destination}`
        );
      }
    }
  }

  return undefined;
}

function candidateWithinConstraint(
  candidate: number,
  constraint: NumericRangeConstraint | undefined
): boolean {
  if (constraint === undefined) {
    return true;
  }
  if (constraint.min !== undefined && candidate < constraint.min) {
    return false;
  }
  if (constraint.max !== undefined && candidate > constraint.max) {
    return false;
  }
  return true;
}

function documentWithCandidate(
  document: ExternalModelDocument,
  unknownParameter: ParameterId,
  candidateValue: number
): ExternalModelDocument {
  const parameterValues: ParameterValues = {
    ...(document.parameterValues ?? {}),
    [unknownParameter]: candidateValue
  };

  if (document.modelKind === 'base') {
    return {
      ...document,
      parameterValues
    };
  }

  return {
    ...document,
    parameterValues
  };
}

function logFactorial(value: number): number {
  let result = 0;
  for (let current = 2; current <= value; current += 1) {
    result += Math.log(current);
  }
  return result;
}

function probabilityByDestination(
  evaluated: EvaluatedModel,
  from: StateId
): Map<StateId, number> {
  const probabilities = new Map<StateId, number>();
  for (const transition of evaluated.transitionsByState.get(from) ?? []) {
    probabilities.set(
      transition.to,
      (probabilities.get(transition.to) ?? 0) + transition.probability
    );
  }
  return probabilities;
}

function scoreGroup(
  evaluated: EvaluatedModel,
  group: TransitionCountGroup
): TransitionLikelihoodTerm {
  const probabilities = probabilityByDestination(evaluated, group.from);
  const categories: TransitionLikelihoodCategory[] = [];
  let totalCount = 0;
  let logCoefficient = 0;
  let weightedLogProbability = 0;
  let zeroLikelihood = false;

  for (const [to, count] of group.countsByTo) {
    const probability = probabilities.get(to) ?? 0;
    totalCount += count;
    logCoefficient -= logFactorial(count);
    if (count > 0) {
      if (probability <= 0) {
        zeroLikelihood = true;
      } else {
        weightedLogProbability += count * Math.log(probability);
      }
    }
    categories.push({ to, count, probability });
  }

  logCoefficient += logFactorial(totalCount);
  categories.sort((left, right) => left.to.localeCompare(right.to));

  return {
    from: group.from,
    totalCount,
    categories,
    zeroLikelihood,
    logLikelihood: zeroLikelihood ? null : logCoefficient + weightedLogProbability
  };
}

function scoreCandidate(
  request: DiscreteParameterEstimationRequest,
  candidateValue: number,
  groups: TransitionCountGroup[]
): ParameterCandidateResult {
  if (!candidateWithinConstraint(candidateValue, request.constraint)) {
    return {
      candidateValue,
      status: 'rejected',
      issues: [
        {
          code: 'candidate_outside_constraint',
          message: `Candidate ${candidateValue} is outside the declared range constraint`
        }
      ]
    };
  }

  const prepared = prepareExternalModelDocument(
    documentWithCandidate(request.document, request.unknownParameter, candidateValue)
  );
  if (!prepared.ok) {
    return {
      candidateValue,
      status: 'rejected',
      issues: prepared.issues.map((issue) => ({
        code: issue.code,
        message: issue.message
      }))
    };
  }

  const evaluated = evaluateModel(expandModel(prepared.resolvedModel));
  const terms = groups.map((group) => scoreGroup(evaluated, group));
  const zeroLikelihood = terms.some((term) => term.zeroLikelihood);
  const logLikelihood = zeroLikelihood
    ? null
    : terms.reduce((sum, term) => sum + (term.logLikelihood ?? 0), 0);

  return {
    candidateValue,
    status: 'scored',
    zeroLikelihood,
    logLikelihood,
    relativeLikelihoodToBest: 0,
    terms
  };
}

function finalizeLikelihoods(candidates: ParameterCandidateResult[]): {
  candidates: ParameterCandidateResult[];
  bestCandidateValues: number[];
  estimatedValue: number | null;
  maximumLogLikelihood: number | null;
  allScoredCandidatesZeroLikelihood: boolean;
} {
  const scored = candidates.filter(
    (candidate): candidate is ScoredParameterCandidate => candidate.status === 'scored'
  );
  const finite = scored.filter(
    (candidate): candidate is ScoredParameterCandidate & { logLikelihood: number } =>
      candidate.logLikelihood !== null
  );

  if (finite.length === 0) {
    return {
      candidates,
      bestCandidateValues: [],
      estimatedValue: null,
      maximumLogLikelihood: null,
      allScoredCandidatesZeroLikelihood: scored.length > 0
    };
  }

  const maximumLogLikelihood = Math.max(...finite.map((candidate) => candidate.logLikelihood));
  const bestCandidateValues = finite
    .filter(
      (candidate) =>
        Math.abs(candidate.logLikelihood - maximumLogLikelihood) <= TIE_TOLERANCE
    )
    .map((candidate) => candidate.candidateValue);

  for (const candidate of scored) {
    candidate.relativeLikelihoodToBest =
      candidate.logLikelihood === null
        ? 0
        : Math.exp(candidate.logLikelihood - maximumLogLikelihood);
  }

  return {
    candidates,
    bestCandidateValues,
    estimatedValue: bestCandidateValues.length === 1 ? bestCandidateValues[0] ?? null : null,
    maximumLogLikelihood,
    allScoredCandidatesZeroLikelihood: false
  };
}

export function estimateDiscreteParameterFromTransitions(
  request: DiscreteParameterEstimationRequest
): DiscreteParameterEstimationResult {
  const invalidRequest = validateRequest(request);
  if (invalidRequest !== undefined) {
    return invalidRequest;
  }

  const observationValidation = validateObservationDataset(
    request.observations,
    structuralObservationModel(request.document)
  );
  if (!observationValidation.valid) {
    return {
      ok: false,
      stage: 'observation_validation',
      observationValidation,
      issues: observationValidation.issues.map((issue) => ({
        stage: 'observation_validation',
        code: issue.code,
        path: issue.path,
        message: issue.message
      }))
    };
  }

  const { groups, usedObservationIds, ignoredObservationIds } =
    aggregateTransitionCounts(request.observations);
  const incomplete = validateCompleteTransitionCategories(request.document, groups);
  if (incomplete !== undefined) {
    return incomplete;
  }

  const candidates = request.candidateValues.map((candidateValue) =>
    scoreCandidate(request, candidateValue, groups)
  );
  const scoredCandidateCount = candidates.filter(
    (candidate) => candidate.status === 'scored'
  ).length;
  if (scoredCandidateCount === 0) {
    return likelihoodDataFailure(
      'no_scored_candidates',
      'candidateValues',
      'No candidate could be scored after applying constraints and model validation'
    );
  }

  const finalized = finalizeLikelihoods(candidates);
  const parameter = request.document.model.parameters.find(
    (entry) => entry.id === request.unknownParameter
  );

  return {
    ok: true,
    estimation: {
      estimateKind: 'maximum_likelihood_over_discrete_candidates',
      likelihoodKind: 'transition_multinomial_complete_categories',
      unknownParameter: request.unknownParameter,
      ...(parameter?.label !== undefined ? { parameterLabel: parameter.label } : {}),
      ...(parameter?.unit !== undefined ? { parameterUnit: parameter.unit } : {}),
      candidateCount: candidates.length,
      scoredCandidateCount,
      rejectedCandidateCount: candidates.length - scoredCandidateCount,
      usedObservationIds,
      ignoredObservationIds,
      bestCandidateValues: finalized.bestCandidateValues,
      estimatedValue: finalized.estimatedValue,
      maximumLogLikelihood: finalized.maximumLogLikelihood,
      allScoredCandidatesZeroLikelihood: finalized.allScoredCandidatesZeroLikelihood,
      candidates: finalized.candidates
    }
  };
}

export function discreteParameterEstimationResultToJson(
  result: DiscreteParameterEstimationResult
): string {
  return JSON.stringify(result);
}
