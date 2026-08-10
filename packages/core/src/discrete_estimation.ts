import {
  ExternalModelDocument,
  PreparedExternalModel,
  prepareExternalModelDocument
} from './external_input';
import { DefinitionModel, EvaluatedModel, StateId, evaluateModel, expandModel } from './model';
import {
  ObservationDataset,
  ObservationRecord,
  validateObservationDataset
} from './observations';
import { ParameterId, ParameterValues } from './parameterized_scalars';

export type DiscreteEstimationMethod =
  'conditional_transition_log_likelihood_without_multinomial_constant';

export type EstimationConstraint =
  | {
      type: 'minimum';
      value: number;
      inclusive?: boolean;
    }
  | {
      type: 'maximum';
      value: number;
      inclusive?: boolean;
    };

export type DiscreteParameterEstimationRequest = {
  parameterId: ParameterId;
  candidates: number[];
  constraints?: EstimationConstraint[];
};

export type EstimationIssue = {
  code: string;
  path: string;
  message: string;
};

export type EstimationFailureStage =
  | 'request'
  | 'observation_validation'
  | 'observation_likelihood_contract'
  | 'candidate_evaluation';

export type ExcludedCandidate = {
  value: number;
  failedConstraints: EstimationConstraint[];
};

export type RejectedCandidate = {
  value: number;
  stage: 'parameter_resolution' | 'model_validation';
  issues: EstimationIssue[];
};

export type StateLikelihoodScore = {
  state: StateId;
  observedDepartures: number;
  logLikelihoodScore: number | null;
  impossible: boolean;
};

export type CandidateLikelihoodResult = {
  value: number;
  possible: boolean;
  logLikelihoodScore: number | null;
  relativeLikelihoodToBest: number;
  rank: number | null;
  stateScores: StateLikelihoodScore[];
};

export type DiscreteParameterEstimationSuccess = {
  ok: true;
  method: DiscreteEstimationMethod;
  parameterId: ParameterId;
  candidates: CandidateLikelihoodResult[];
  excludedCandidates: ExcludedCandidate[];
  rejectedCandidates: RejectedCandidate[];
  bestCandidateValues: number[];
  estimatedValue: number | null;
  usedObservationIds: string[];
  priorUsed: false;
  posteriorComputed: false;
  scoreInterpretation: 'candidate_ranking_likelihood_score';
};

export type DiscreteParameterEstimationFailure = {
  ok: false;
  stage: EstimationFailureStage;
  issues: EstimationIssue[];
};

export type DiscreteParameterEstimationResult =
  | DiscreteParameterEstimationSuccess
  | DiscreteParameterEstimationFailure;

type LikelihoodObservationGroup = {
  state: StateId;
  stateCount: number;
  transitionCountsByTo: Map<StateId, number>;
  observationIds: string[];
};

type PreparedCandidate = {
  value: number;
  prepared: PreparedExternalModel;
};

const METHOD: DiscreteEstimationMethod =
  'conditional_transition_log_likelihood_without_multinomial_constant';

function requestFailure(code: string, path: string, message: string): DiscreteParameterEstimationFailure {
  return {
    ok: false,
    stage: 'request',
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

function validateRequest(
  document: ExternalModelDocument,
  request: DiscreteParameterEstimationRequest
): DiscreteParameterEstimationFailure | undefined {
  if (request.parameterId.trim().length === 0) {
    return requestFailure('empty_parameter_id', 'request.parameterId', 'parameterId must not be empty');
  }

  if (!document.model.parameters.some((parameter) => parameter.id === request.parameterId)) {
    return requestFailure(
      'unknown_estimation_parameter',
      'request.parameterId',
      `Unknown estimation parameter: ${request.parameterId}`
    );
  }

  if (request.candidates.length === 0) {
    return requestFailure(
      'empty_candidate_set',
      'request.candidates',
      'At least one candidate value is required'
    );
  }

  const seen = new Set<number>();
  for (let index = 0; index < request.candidates.length; index += 1) {
    const value = request.candidates[index];
    if (value === undefined || !Number.isFinite(value)) {
      return requestFailure(
        'invalid_candidate_value',
        `request.candidates[${index}]`,
        'Candidate values must be finite numbers'
      );
    }
    if (seen.has(value)) {
      return requestFailure(
        'duplicate_candidate_value',
        `request.candidates[${index}]`,
        `Duplicate candidate value: ${value}`
      );
    }
    seen.add(value);
  }

  for (let index = 0; index < (request.constraints?.length ?? 0); index += 1) {
    const constraint = request.constraints?.[index];
    if (constraint === undefined || !Number.isFinite(constraint.value)) {
      return requestFailure(
        'invalid_constraint_value',
        `request.constraints[${index}].value`,
        'Constraint values must be finite numbers'
      );
    }
  }

  return undefined;
}

function withCandidateValue(
  document: ExternalModelDocument,
  parameterId: ParameterId,
  candidateValue: number
): ExternalModelDocument {
  const parameterValues: ParameterValues = {
    ...(document.parameterValues ?? {}),
    [parameterId]: candidateValue
  };

  if (document.modelKind === 'base') {
    return { ...document, parameterValues };
  }
  return { ...document, parameterValues };
}

function toEstimationIssues(
  issues: Array<{ code: string; path: string; message: string }>
): EstimationIssue[] {
  return issues.map((issue) => ({
    code: issue.code,
    path: issue.path,
    message: issue.message
  }));
}

function prepareCandidates(
  document: ExternalModelDocument,
  request: DiscreteParameterEstimationRequest
): {
  prepared: PreparedCandidate[];
  excluded: ExcludedCandidate[];
  rejected: RejectedCandidate[];
} {
  const prepared: PreparedCandidate[] = [];
  const excluded: ExcludedCandidate[] = [];
  const rejected: RejectedCandidate[] = [];

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

    const stage = result.stage === 'model_validation' ? 'model_validation' : 'parameter_resolution';
    rejected.push({
      value,
      stage,
      issues: toEstimationIssues(result.issues)
    });
  }

  return { prepared, excluded, rejected };
}

function observationContractFailure(issues: EstimationIssue[]): DiscreteParameterEstimationFailure {
  return {
    ok: false,
    stage: 'observation_likelihood_contract',
    issues
  };
}

function buildLikelihoodObservationGroups(
  dataset: ObservationDataset
):
  | { ok: true; groups: LikelihoodObservationGroup[]; usedObservationIds: string[] }
  | DiscreteParameterEstimationFailure {
  const issues: EstimationIssue[] = [];
  const stateCountByState = new Map<StateId, { count: number; id: string }>();
  const transitionCountsByState = new Map<StateId, Map<StateId, number>>();
  const transitionIdsByState = new Map<StateId, string[]>();

  for (let index = 0; index < dataset.observations.length; index += 1) {
    const observation = dataset.observations[index] as ObservationRecord;
    const path = `observations[${index}]`;

    if (observation.type === 'scalar') {
      issues.push({
        code: 'unsupported_scalar_observation_for_transition_likelihood',
        path,
        message: 'The minimal transition likelihood estimator only consumes state_count and transition_count observations'
      });
      continue;
    }

    if (observation.type === 'state_count') {
      if (stateCountByState.has(observation.state)) {
        issues.push({
          code: 'duplicate_state_count_for_likelihood',
          path: `${path}.state`,
          message: `Only one state_count observation is allowed per likelihood source state: ${observation.state}`
        });
      } else {
        stateCountByState.set(observation.state, { count: observation.count, id: observation.id });
      }
      continue;
    }

    const byTo = transitionCountsByState.get(observation.from) ?? new Map<StateId, number>();
    byTo.set(observation.to, (byTo.get(observation.to) ?? 0) + observation.count);
    transitionCountsByState.set(observation.from, byTo);
    const ids = transitionIdsByState.get(observation.from) ?? [];
    ids.push(observation.id);
    transitionIdsByState.set(observation.from, ids);
  }

  for (const state of transitionCountsByState.keys()) {
    if (!stateCountByState.has(state)) {
      issues.push({
        code: 'missing_state_count_for_transition_likelihood',
        path: 'observations',
        message: `A state_count observation is required for transition likelihood source state: ${state}`
      });
    }
  }

  for (const [state, stateCount] of stateCountByState) {
    const transitionCounts = transitionCountsByState.get(state);
    if (transitionCounts === undefined) {
      issues.push({
        code: 'missing_transition_counts_for_state_count',
        path: 'observations',
        message: `state_count ${stateCount.id} has no transition_count observations for state ${state}`
      });
      continue;
    }
    const observedDepartures = [...transitionCounts.values()].reduce((sum, count) => sum + count, 0);
    if (observedDepartures !== stateCount.count) {
      issues.push({
        code: 'incomplete_transition_counts',
        path: 'observations',
        message: `Transition counts from ${state} sum to ${observedDepartures}, but state_count is ${stateCount.count}`
      });
    }
  }

  if (stateCountByState.size === 0) {
    issues.push({
      code: 'missing_state_count_observations',
      path: 'observations',
      message: 'At least one state_count plus matching transition_count observations is required'
    });
  }

  if (issues.length > 0) {
    return observationContractFailure(issues);
  }

  const groups: LikelihoodObservationGroup[] = [];
  const usedObservationIds: string[] = [];
  for (const [state, stateCount] of stateCountByState) {
    const transitionCountsByTo = transitionCountsByState.get(state);
    if (transitionCountsByTo === undefined) {
      continue;
    }
    const observationIds = [stateCount.id, ...(transitionIdsByState.get(state) ?? [])];
    usedObservationIds.push(...observationIds);
    groups.push({
      state,
      stateCount: stateCount.count,
      transitionCountsByTo,
      observationIds
    });
  }

  return { ok: true, groups, usedObservationIds };
}

function pairKey(from: StateId, to: StateId): string {
  return JSON.stringify([from, to]);
}

function probabilityByTransitionPair(model: EvaluatedModel): Map<string, number> {
  const probabilities = new Map<string, number>();
  for (const transition of model.transitions) {
    const key = pairKey(transition.from, transition.to);
    probabilities.set(key, (probabilities.get(key) ?? 0) + transition.probability);
  }
  return probabilities;
}

function scoreCandidate(
  candidate: PreparedCandidate,
  groups: LikelihoodObservationGroup[]
): CandidateLikelihoodResult {
  const model: DefinitionModel = candidate.prepared.resolvedModel;
  const evaluated = evaluateModel(expandModel(model));
  const probabilities = probabilityByTransitionPair(evaluated);
  const stateScores: StateLikelihoodScore[] = [];
  let total = 0;
  let possible = true;

  for (const group of groups) {
    let stateTotal = 0;
    let statePossible = true;

    for (const [to, count] of group.transitionCountsByTo) {
      if (count === 0) {
        continue;
      }
      const probability = probabilities.get(pairKey(group.state, to)) ?? 0;
      if (!(probability > 0)) {
        statePossible = false;
        possible = false;
        break;
      }
      stateTotal += count * Math.log(probability);
    }

    stateScores.push({
      state: group.state,
      observedDepartures: group.stateCount,
      logLikelihoodScore: statePossible ? stateTotal : null,
      impossible: !statePossible
    });

    if (statePossible) {
      total += stateTotal;
    }
  }

  return {
    value: candidate.value,
    possible,
    logLikelihoodScore: possible ? total : null,
    relativeLikelihoodToBest: 0,
    rank: null,
    stateScores
  };
}

function rankCandidateScores(candidates: CandidateLikelihoodResult[]): void {
  const possible = candidates.filter(
    (candidate): candidate is CandidateLikelihoodResult & { logLikelihoodScore: number } =>
      candidate.possible && candidate.logLikelihoodScore !== null
  );
  if (possible.length === 0) {
    return;
  }

  possible.sort((left, right) => right.logLikelihoodScore - left.logLikelihoodScore);
  const best = possible[0]?.logLikelihoodScore;
  if (best === undefined) {
    return;
  }

  possible.forEach((candidate, index) => {
    candidate.rank = index + 1;
    candidate.relativeLikelihoodToBest = Math.exp(candidate.logLikelihoodScore - best);
  });
}

function bestCandidateValues(candidates: CandidateLikelihoodResult[]): number[] {
  const possible = candidates.filter(
    (candidate): candidate is CandidateLikelihoodResult & { logLikelihoodScore: number } =>
      candidate.possible && candidate.logLikelihoodScore !== null
  );
  if (possible.length === 0) {
    return [];
  }
  const best = Math.max(...possible.map((candidate) => candidate.logLikelihoodScore));
  const tolerance = 1e-12;
  return possible
    .filter((candidate) => Math.abs(candidate.logLikelihoodScore - best) <= tolerance)
    .map((candidate) => candidate.value);
}

export function estimateDiscreteParameterCandidates(
  document: ExternalModelDocument,
  observations: ObservationDataset,
  request: DiscreteParameterEstimationRequest
): DiscreteParameterEstimationResult {
  const invalidRequest = validateRequest(document, request);
  if (invalidRequest !== undefined) {
    return invalidRequest;
  }

  const preparedCandidates = prepareCandidates(document, request);
  if (preparedCandidates.prepared.length === 0) {
    return {
      ok: false,
      stage: 'candidate_evaluation',
      issues: [
        {
          code: 'no_evaluable_candidates',
          path: 'request.candidates',
          message: 'No candidate remained both constraint-eligible and model-valid'
        }
      ]
    };
  }

  const referenceModel = preparedCandidates.prepared[0]?.prepared.resolvedModel;
  if (referenceModel === undefined) {
    return {
      ok: false,
      stage: 'candidate_evaluation',
      issues: [{ code: 'missing_reference_model', path: '$', message: 'No reference model was available' }]
    };
  }

  const observationValidation = validateObservationDataset(observations, referenceModel);
  if (!observationValidation.valid) {
    return {
      ok: false,
      stage: 'observation_validation',
      issues: toEstimationIssues(observationValidation.issues)
    };
  }

  const grouped = buildLikelihoodObservationGroups(observations);
  if (!grouped.ok) {
    return grouped;
  }

  const candidateResults = preparedCandidates.prepared.map((candidate) =>
    scoreCandidate(candidate, grouped.groups)
  );
  rankCandidateScores(candidateResults);
  const bestValues = bestCandidateValues(candidateResults);

  return {
    ok: true,
    method: METHOD,
    parameterId: request.parameterId,
    candidates: candidateResults,
    excludedCandidates: preparedCandidates.excluded,
    rejectedCandidates: preparedCandidates.rejected,
    bestCandidateValues: bestValues,
    estimatedValue: bestValues.length === 1 ? bestValues[0] ?? null : null,
    usedObservationIds: [...grouped.usedObservationIds],
    priorUsed: false,
    posteriorComputed: false,
    scoreInterpretation: 'candidate_ranking_likelihood_score'
  };
}

export function discreteParameterEstimationResultToJson(
  result: DiscreteParameterEstimationResult
): string {
  return JSON.stringify(result);
}
