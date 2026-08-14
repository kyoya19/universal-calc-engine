import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHiddenStateObservationFailure,
  FiniteHiddenStateObservationOptions,
  FiniteHiddenStateObservationRequest,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';

export type CalibratedEvidenceLikelihoodEntry = {
  stateId: StateId;
  likelihood: number;
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
  initialDistribution: FiniteHiddenStateObservationRequest['initialDistribution'];
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningOptions =
  FiniteHiddenStateObservationOptions & {
    pairwiseConsistencyTolerance?: number;
    expectedCountTolerance?: number;
  };

export type HiddenStateCalibratedEvidenceDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type HiddenStateCalibratedEvidenceFilteringStep = {
  step: number;
  calibratedEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  predictiveDistribution: HiddenStateCalibratedEvidenceDistribution;
  conditionalEvidenceProbability: number | null;
  conditionalEvidenceProbabilityUnderflowed: boolean;
  prefixLogLikelihood: number | null;
  filteredDistribution: HiddenStateCalibratedEvidenceDistribution | null;
};

export type HiddenStateCalibratedEvidenceSmoothingStep = {
  step: number;
  calibratedEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  smoothedDistribution: HiddenStateCalibratedEvidenceDistribution;
};

export type HiddenStateCalibratedEvidencePairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type HiddenStateCalibratedEvidencePairwiseStep = {
  step: number;
  pairwiseDistribution: HiddenStateCalibratedEvidencePairwiseEntry[];
};

export type HiddenStateCalibratedEvidenceExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningDiagnostics = {
  method: 'log_forward_backward_calibrated_local_evidence_likelihood_conditioning';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  posteriorNormalizationApplied: true;
  absoluteEvidenceScalePreserved: true;
  calibratedEvidenceLikelihoodUsed: true;
  arbitrarySoftWeightUsed: false;
  timeConvention: 'local_evidence_at_step_0_then_transition_and_local_evidence';
  terminalSemantics: 'implicit_self_retention';
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  evidenceStepsRequested: number;
  evidenceStepsProcessed: number;
  combinedEvidenceProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  candidateCValidationReused: true;
  existingCandidateACHRSTUVWXYRequestTypesModified: false;
  parameterLearningUsed: false;
  modelRewritten: false;
  causalInterventionUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  parameterPosteriorComputed: false;
  globalModelIdentificationClaimed: false;
};

export type CalibratedEvidenceLikelihoodConditioningFailureCode =
  | 'invalid_calibrated_evidence_likelihoods_container'
  | 'empty_calibrated_evidence_likelihood_sequence'
  | 'invalid_calibrated_evidence_likelihood_row'
  | 'missing_calibrated_evidence_likelihood_state'
  | 'unknown_calibrated_evidence_likelihood_state'
  | 'duplicate_calibrated_evidence_likelihood_state'
  | 'invalid_calibrated_evidence_likelihood'
  | 'invalid_candidate_z_tolerance'
  | 'calibrated_evidence_filtering_mass_conservation_violation'
  | 'calibrated_evidence_smoothing_mass_conservation_violation'
  | 'calibrated_evidence_pairwise_mass_conservation_violation'
  | 'calibrated_evidence_pairwise_marginal_consistency_violation'
  | 'calibrated_evidence_expected_transition_count_conservation_violation'
  | 'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency'
  | 'non_finite_calibrated_evidence_likelihood_conditioning_result';

export type CalibratedEvidenceLikelihoodConditioningFailure = {
  code: CalibratedEvidenceLikelihoodConditioningFailureCode;
  message: string;
  path?: string;
  step?: number;
  stateId?: StateId;
  fromStateId?: StateId;
  toStateId?: StateId;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure = {
  ok: false;
  failure: CalibratedEvidenceLikelihoodConditioningFailure;
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningSuccess = {
  ok: true;
  possible: boolean;
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
  filteringSteps: HiddenStateCalibratedEvidenceFilteringStep[];
  smoothingSteps: HiddenStateCalibratedEvidenceSmoothingStep[] | null;
  pairwiseSteps: HiddenStateCalibratedEvidencePairwiseStep[] | null;
  expectedTransitionCounts: HiddenStateCalibratedEvidenceExpectedTransitionCount[] | null;
  logLikelihood: number | null;
  combinedEvidenceProbability: number | null;
  diagnostics: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningDiagnostics;
};

export type FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult =
  | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningSuccess
  | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure
  | FiniteHiddenStateObservationFailure;

type ResolvedCandidateZOptions = {
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
};

type TransitionEdge = {
  to: StateId;
  probability: number;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: CalibratedEvidenceLikelihoodConditioningFailureCode,
  message: string,
  details: Omit<CalibratedEvidenceLikelihoodConditioningFailure, 'code' | 'message'> = {}
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function validateEvidenceContainer(
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure | undefined {
  if (!Array.isArray(request.evidenceLikelihoods)) {
    return failure(
      'invalid_calibrated_evidence_likelihoods_container',
      'evidenceLikelihoods must be an array',
      { path: 'request.evidenceLikelihoods' }
    );
  }
  if (request.evidenceLikelihoods.length === 0) {
    return failure(
      'empty_calibrated_evidence_likelihood_sequence',
      'evidenceLikelihoods must contain at least one time step',
      { path: 'request.evidenceLikelihoods' }
    );
  }
  return undefined;
}

function makeValidationRequest(
  model: DefinitionModel,
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest
): FiniteHiddenStateObservationRequest {
  const symbol = '__candidate_z_validation__';
  return {
    initialDistribution: request.initialDistribution,
    alphabet: [symbol],
    kernel: model.states.map((state) => ({ stateId: state.id, symbol, probability: 1 })),
    observations: Array.from({ length: request.evidenceLikelihoods.length }, () => symbol)
  };
}

function resolveOptions(
  options: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningOptions,
  probabilityTolerance: number,
  maxObservations: number,
  transitionCount: number
): ResolvedCandidateZOptions | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure {
  const pairwiseConsistencyTolerance =
    options.pairwiseConsistencyTolerance ?? probabilityTolerance * 20;
  if (!Number.isFinite(pairwiseConsistencyTolerance) || pairwiseConsistencyTolerance <= 0) {
    return failure(
      'invalid_candidate_z_tolerance',
      'pairwiseConsistencyTolerance must be a finite positive number',
      { path: 'options.pairwiseConsistencyTolerance' }
    );
  }
  const expectedCountTolerance =
    options.expectedCountTolerance ?? pairwiseConsistencyTolerance * Math.max(1, transitionCount);
  if (!Number.isFinite(expectedCountTolerance) || expectedCountTolerance <= 0) {
    return failure(
      'invalid_candidate_z_tolerance',
      'expectedCountTolerance must be a finite positive number',
      { path: 'options.expectedCountTolerance' }
    );
  }
  return {
    probabilityTolerance,
    pairwiseConsistencyTolerance,
    expectedCountTolerance,
    maxObservations
  };
}

function canonicalizeLikelihoodRows(
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateIds: StateId[]
): CalibratedEvidenceLikelihoodEntry[][] | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure {
  const knownStates = new Set(stateIds);
  const canonical: CalibratedEvidenceLikelihoodEntry[][] = [];
  for (let step = 0; step < request.evidenceLikelihoods.length; step += 1) {
    const row = request.evidenceLikelihoods[step];
    if (!Array.isArray(row)) {
      return failure(
        'invalid_calibrated_evidence_likelihood_row',
        `evidenceLikelihoods[${step}] must be an array`,
        { path: `request.evidenceLikelihoods[${step}]`, step }
      );
    }
    const seen = new Set<StateId>();
    const byState = new Map<StateId, number>();
    for (let index = 0; index < row.length; index += 1) {
      const entry = row[index];
      if (entry === undefined || typeof entry.stateId !== 'string') {
        return failure(
          'invalid_calibrated_evidence_likelihood_row',
          `evidenceLikelihoods[${step}][${index}] requires string stateId`,
          { path: `request.evidenceLikelihoods[${step}][${index}].stateId`, step }
        );
      }
      if (!knownStates.has(entry.stateId)) {
        return failure(
          'unknown_calibrated_evidence_likelihood_state',
          `Unknown state in evidenceLikelihoods[${step}]: ${entry.stateId}`,
          { path: `request.evidenceLikelihoods[${step}][${index}].stateId`, step, stateId: entry.stateId }
        );
      }
      if (seen.has(entry.stateId)) {
        return failure(
          'duplicate_calibrated_evidence_likelihood_state',
          `Duplicate state in evidenceLikelihoods[${step}]: ${entry.stateId}`,
          { path: `request.evidenceLikelihoods[${step}][${index}].stateId`, step, stateId: entry.stateId }
        );
      }
      seen.add(entry.stateId);
      if (!Number.isFinite(entry.likelihood) || entry.likelihood < 0 || entry.likelihood > 1) {
        return failure(
          'invalid_calibrated_evidence_likelihood',
          `Calibrated evidence likelihood must be a finite number from 0 to 1: ${String(entry.likelihood)}`,
          { path: `request.evidenceLikelihoods[${step}][${index}].likelihood`, step, stateId: entry.stateId, actual: entry.likelihood }
        );
      }
      byState.set(entry.stateId, entry.likelihood);
    }
    for (const stateId of stateIds) {
      if (!seen.has(stateId)) {
        return failure(
          'missing_calibrated_evidence_likelihood_state',
          `Missing state in evidenceLikelihoods[${step}]: ${stateId}`,
          { path: `request.evidenceLikelihoods[${step}]`, step, stateId }
        );
      }
    }
    canonical.push(stateIds.map((stateId) => ({ stateId, likelihood: byState.get(stateId) ?? 0 })));
  }
  return canonical;
}

function buildTransitions(
  model: DefinitionModel,
  stateIds: StateId[]
): Map<StateId, TransitionEdge[]> {
  const rows = new Map<StateId, TransitionEdge[]>();
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

function buildInitial(
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateIds: StateId[]
): Map<StateId, number> {
  const result = new Map<StateId, number>();
  for (const stateId of stateIds) result.set(stateId, 0);
  for (const entry of request.initialDistribution) result.set(entry.stateId, entry.probability);
  return result;
}

function rowMap(row: CalibratedEvidenceLikelihoodEntry[]): Map<StateId, number> {
  return new Map(row.map((entry) => [entry.stateId, entry.likelihood] as const));
}

function distributionMap(
  distribution: HiddenStateCalibratedEvidenceDistribution
): Map<StateId, number> {
  return new Map(distribution.map((entry) => [entry.stateId, entry.probability] as const));
}

function denseDistribution(
  stateIds: StateId[],
  values: Map<StateId, number>
): HiddenStateCalibratedEvidenceDistribution {
  return stateIds.map((stateId) => ({ stateId, probability: values.get(stateId) ?? 0 }));
}

function propagate(
  stateIds: StateId[],
  filtered: HiddenStateCalibratedEvidenceDistribution,
  transitions: Map<StateId, TransitionEdge[]>
): Map<StateId, number> {
  const result = new Map<StateId, number>();
  for (const stateId of stateIds) result.set(stateId, 0);
  const source = distributionMap(filtered);
  for (const fromStateId of stateIds) {
    const sourceProbability = source.get(fromStateId) ?? 0;
    for (const edge of transitions.get(fromStateId) ?? []) {
      result.set(edge.to, (result.get(edge.to) ?? 0) + sourceProbability * edge.probability);
    }
  }
  return result;
}

function checkPredictive(
  stateIds: StateId[],
  values: Map<StateId, number>,
  step: number,
  tolerance: number
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure | undefined {
  let total = 0;
  for (const stateId of stateIds) {
    const value = values.get(stateId) ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      return failure(
        'non_finite_calibrated_evidence_likelihood_conditioning_result',
        'Candidate Z predictive probability became invalid',
        { step, stateId, actual: value }
      );
    }
    total += value;
  }
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'calibrated_evidence_filtering_mass_conservation_violation',
      'Candidate Z predictive probabilities do not sum to one',
      { step, actual: total, expected: 1, tolerance }
    );
  }
  return undefined;
}

function logProbability(value: number): number {
  return value === 0 ? Number.NEGATIVE_INFINITY : Math.log(value);
}

function logSumExp(values: number[]): number {
  let maximum = Number.NEGATIVE_INFINITY;
  for (const value of values) if (value > maximum) maximum = value;
  if (maximum === Number.NEGATIVE_INFINITY) return maximum;
  let sum = 0;
  for (const value of values) {
    if (value !== Number.NEGATIVE_INFINITY) sum += Math.exp(value - maximum);
  }
  return maximum + Math.log(sum);
}

function normalizeLogDistribution(
  stateIds: StateId[],
  logValues: Map<StateId, number>,
  logTotal: number,
  step: number,
  tolerance: number,
  kind: 'filtering' | 'smoothing'
): HiddenStateCalibratedEvidenceDistribution | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure {
  if (!Number.isFinite(logTotal)) {
    return failure(
      kind === 'filtering'
        ? 'calibrated_evidence_filtering_mass_conservation_violation'
        : 'calibrated_evidence_smoothing_mass_conservation_violation',
      `Candidate Z ${kind} log mass must be finite for possible evidence`,
      { step, actual: logTotal }
    );
  }
  const result: HiddenStateCalibratedEvidenceDistribution = [];
  let total = 0;
  for (const stateId of stateIds) {
    const logValue = logValues.get(stateId) ?? Number.NEGATIVE_INFINITY;
    const probability = logValue === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logValue - logTotal);
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_calibrated_evidence_likelihood_conditioning_result',
        `Candidate Z ${kind} probability became invalid`,
        { step, stateId, actual: probability }
      );
    }
    result.push({ stateId, probability });
    total += probability;
  }
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      kind === 'filtering'
        ? 'calibrated_evidence_filtering_mass_conservation_violation'
        : 'calibrated_evidence_smoothing_mass_conservation_violation',
      `Candidate Z ${kind} probabilities do not sum to one`,
      { step, actual: total, expected: 1, tolerance }
    );
  }
  return result;
}

function zeroExpectedCounts(
  stateIds: StateId[]
): HiddenStateCalibratedEvidenceExpectedTransitionCount[] {
  const result: HiddenStateCalibratedEvidenceExpectedTransitionCount[] = [];
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) {
      result.push({ fromStateId, toStateId, expectedCount: 0 });
    }
  }
  return result;
}

function directProbabilityFromLog(logLikelihood: number): number | null {
  const direct = Math.exp(logLikelihood);
  if (direct === 0 && Number.isFinite(logLikelihood)) return null;
  return direct;
}

function makeDiagnostics(
  options: ResolvedCandidateZOptions,
  requested: number,
  processed: number,
  underflowed: boolean,
  impossibleAtStep: number | null
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningDiagnostics {
  return {
    method: 'log_forward_backward_calibrated_local_evidence_likelihood_conditioning',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    absoluteEvidenceScalePreserved: true,
    calibratedEvidenceLikelihoodUsed: true,
    arbitrarySoftWeightUsed: false,
    timeConvention: 'local_evidence_at_step_0_then_transition_and_local_evidence',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: options.probabilityTolerance,
    pairwiseConsistencyTolerance: options.pairwiseConsistencyTolerance,
    expectedCountTolerance: options.expectedCountTolerance,
    maxObservations: options.maxObservations,
    evidenceStepsRequested: requested,
    evidenceStepsProcessed: processed,
    combinedEvidenceProbabilityUnderflowed: underflowed,
    impossibleAtStep,
    candidateCValidationReused: true,
    existingCandidateACHRSTUVWXYRequestTypesModified: false,
    parameterLearningUsed: false,
    modelRewritten: false,
    causalInterventionUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    parameterPosteriorComputed: false,
    globalModelIdentificationClaimed: false
  };
}

function buildLogBackward(
  rows: CalibratedEvidenceLikelihoodEntry[][],
  stateIds: StateId[],
  transitions: Map<StateId, TransitionEdge[]>
): Array<Map<StateId, number>> | FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningFailure {
  const messages: Array<Map<StateId, number>> = new Array(rows.length);
  const final = new Map<StateId, number>();
  for (const stateId of stateIds) final.set(stateId, 0);
  messages[rows.length - 1] = final;

  for (let step = rows.length - 2; step >= 0; step -= 1) {
    const nextRow = rows[step + 1];
    const nextMessage = messages[step + 1];
    if (nextRow === undefined || nextMessage === undefined) {
      return failure(
        'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
        'Missing future likelihood row or backward message',
        { step: step + 1 }
      );
    }
    const likelihoods = rowMap(nextRow);
    const current = new Map<StateId, number>();
    for (const fromStateId of stateIds) {
      const terms: number[] = [];
      for (const edge of transitions.get(fromStateId) ?? []) {
        const likelihood = likelihoods.get(edge.to) ?? 0;
        const future = nextMessage.get(edge.to) ?? Number.NEGATIVE_INFINITY;
        if (edge.probability === 0 || likelihood === 0 || future === Number.NEGATIVE_INFINITY) {
          terms.push(Number.NEGATIVE_INFINITY);
        } else {
          terms.push(logProbability(edge.probability) + logProbability(likelihood) + future);
        }
      }
      const value = logSumExp(terms);
      if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
        return failure(
          'non_finite_calibrated_evidence_likelihood_conditioning_result',
          'Candidate Z backward log message became invalid',
          { step, stateId: fromStateId, actual: value }
        );
      }
      current.set(fromStateId, value);
    }
    messages[step] = current;
  }
  return messages;
}

export function conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(
  model: DefinitionModel,
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  options: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningOptions = {}
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult {
  const containerFailure = validateEvidenceContainer(request);
  if (containerFailure !== undefined) return containerFailure;

  const baseValidation = filterFiniteHiddenStateObservationSequence(
    model,
    makeValidationRequest(model, request),
    options
  );
  if (!baseValidation.ok) return baseValidation;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const rows = canonicalizeLikelihoodRows(request, stateIds);
  if (!Array.isArray(rows)) return rows;

  const transitionCount = Math.max(0, rows.length - 1);
  const resolved = resolveOptions(
    options,
    baseValidation.diagnostics.probabilityTolerance,
    baseValidation.diagnostics.maxObservations,
    transitionCount
  );
  if ('ok' in resolved) return resolved;

  const transitions = buildTransitions(model, stateIds);
  const initial = buildInitial(request, stateIds);
  const filteringSteps: HiddenStateCalibratedEvidenceFilteringStep[] = [];
  const forwardMessages: Array<Map<StateId, number>> = [];
  const prefixLogLikelihoods: number[] = [];
  let previousFiltered: HiddenStateCalibratedEvidenceDistribution | undefined;

  for (let step = 0; step < rows.length; step += 1) {
    const row = rows[step];
    if (row === undefined) {
      return failure(
        'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
        'Missing canonical likelihood row',
        { step }
      );
    }
    const predictive =
      step === 0
        ? new Map(initial)
        : previousFiltered === undefined
          ? new Map<StateId, number>()
          : propagate(stateIds, previousFiltered, transitions);
    const predictiveFailure = checkPredictive(
      stateIds,
      predictive,
      step,
      resolved.probabilityTolerance * 10
    );
    if (predictiveFailure !== undefined) return predictiveFailure;

    const likelihoods = rowMap(row);
    const logAlpha = new Map<StateId, number>();
    if (step === 0) {
      for (const stateId of stateIds) {
        const initialProbability = initial.get(stateId) ?? 0;
        const likelihood = likelihoods.get(stateId) ?? 0;
        logAlpha.set(
          stateId,
          initialProbability === 0 || likelihood === 0
            ? Number.NEGATIVE_INFINITY
            : logProbability(initialProbability) + logProbability(likelihood)
        );
      }
    } else {
      const previous = forwardMessages[step - 1];
      if (previous === undefined) {
        return failure(
          'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
          'Missing previous forward message',
          { step }
        );
      }
      for (const toStateId of stateIds) {
        const likelihood = likelihoods.get(toStateId) ?? 0;
        if (likelihood === 0) {
          logAlpha.set(toStateId, Number.NEGATIVE_INFINITY);
          continue;
        }
        const terms: number[] = [];
        for (const fromStateId of stateIds) {
          const prior = previous.get(fromStateId) ?? Number.NEGATIVE_INFINITY;
          const transition =
            transitions.get(fromStateId)?.find((edge) => edge.to === toStateId)?.probability ?? 0;
          terms.push(
            prior === Number.NEGATIVE_INFINITY || transition === 0
              ? Number.NEGATIVE_INFINITY
              : prior + logProbability(transition)
          );
        }
        const predictedLogMass = logSumExp(terms);
        logAlpha.set(
          toStateId,
          predictedLogMass === Number.NEGATIVE_INFINITY
            ? Number.NEGATIVE_INFINITY
            : predictedLogMass + logProbability(likelihood)
        );
      }
    }

    const prefixLogLikelihood = logSumExp(
      stateIds.map((stateId) => logAlpha.get(stateId) ?? Number.NEGATIVE_INFINITY)
    );
    if (prefixLogLikelihood === Number.NEGATIVE_INFINITY) {
      filteringSteps.push({
        step,
        calibratedEvidenceLikelihoods: row.map((entry) => ({ ...entry })),
        predictiveDistribution: denseDistribution(stateIds, predictive),
        conditionalEvidenceProbability: 0,
        conditionalEvidenceProbabilityUnderflowed: false,
        prefixLogLikelihood: null,
        filteredDistribution: null
      });
      return {
        ok: true,
        possible: false,
        evidenceLikelihoods: rows.map((candidate) => candidate.map((entry) => ({ ...entry }))),
        filteringSteps,
        smoothingSteps: null,
        pairwiseSteps: null,
        expectedTransitionCounts: null,
        logLikelihood: null,
        combinedEvidenceProbability: 0,
        diagnostics: makeDiagnostics(resolved, rows.length, step + 1, false, step)
      };
    }
    if (!Number.isFinite(prefixLogLikelihood)) {
      return failure(
        'non_finite_calibrated_evidence_likelihood_conditioning_result',
        'Candidate Z prefix log likelihood became invalid',
        { step, actual: prefixLogLikelihood }
      );
    }

    const filtered = normalizeLogDistribution(
      stateIds,
      logAlpha,
      prefixLogLikelihood,
      step,
      resolved.probabilityTolerance * 20,
      'filtering'
    );
    if (!Array.isArray(filtered)) return filtered;

    const previousPrefixLogLikelihood = step === 0 ? 0 : prefixLogLikelihoods[step - 1];
    if (previousPrefixLogLikelihood === undefined) {
      return failure(
        'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
        'Missing previous prefix log likelihood',
        { step }
      );
    }
    const conditionalLogLikelihood = prefixLogLikelihood - previousPrefixLogLikelihood;
    if (!Number.isFinite(conditionalLogLikelihood) || conditionalLogLikelihood > resolved.probabilityTolerance * 10) {
      return failure(
        'calibrated_evidence_filtering_mass_conservation_violation',
        'Candidate Z conditional evidence log probability became invalid',
        { step, actual: conditionalLogLikelihood, tolerance: resolved.probabilityTolerance * 10 }
      );
    }
    const conditionalEvidenceProbability = directProbabilityFromLog(conditionalLogLikelihood);
    if (
      conditionalEvidenceProbability !== null &&
      (!Number.isFinite(conditionalEvidenceProbability) || conditionalEvidenceProbability < 0 || conditionalEvidenceProbability > 1 + resolved.probabilityTolerance * 10)
    ) {
      return failure(
        'calibrated_evidence_filtering_mass_conservation_violation',
        'Candidate Z conditional evidence probability became invalid',
        { step, actual: conditionalEvidenceProbability, tolerance: resolved.probabilityTolerance * 10 }
      );
    }

    forwardMessages.push(logAlpha);
    prefixLogLikelihoods.push(prefixLogLikelihood);
    filteringSteps.push({
      step,
      calibratedEvidenceLikelihoods: row.map((entry) => ({ ...entry })),
      predictiveDistribution: denseDistribution(stateIds, predictive),
      conditionalEvidenceProbability,
      conditionalEvidenceProbabilityUnderflowed: conditionalEvidenceProbability === null,
      prefixLogLikelihood,
      filteredDistribution: filtered
    });
    previousFiltered = filtered;
  }

  const completeLogEvidence = prefixLogLikelihoods[prefixLogLikelihoods.length - 1];
  if (completeLogEvidence === undefined || !Number.isFinite(completeLogEvidence)) {
    return failure(
      'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
      'Missing complete evidence log likelihood'
    );
  }
  const directProbability = directProbabilityFromLog(completeLogEvidence);
  const underflowed = directProbability === null;

  const backward = buildLogBackward(rows, stateIds, transitions);
  if (!Array.isArray(backward)) return backward;

  const smoothingSteps: HiddenStateCalibratedEvidenceSmoothingStep[] = [];
  for (let step = 0; step < rows.length; step += 1) {
    const forward = forwardMessages[step];
    const beta = backward[step];
    const row = rows[step];
    if (forward === undefined || beta === undefined || row === undefined) {
      return failure(
        'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
        'Missing forward/backward state for smoothing',
        { step }
      );
    }
    const logWeights = new Map<StateId, number>();
    for (const stateId of stateIds) {
      const left = forward.get(stateId) ?? Number.NEGATIVE_INFINITY;
      const right = beta.get(stateId) ?? Number.NEGATIVE_INFINITY;
      logWeights.set(
        stateId,
        left === Number.NEGATIVE_INFINITY || right === Number.NEGATIVE_INFINITY
          ? Number.NEGATIVE_INFINITY
          : left + right
      );
    }
    const smoothed = normalizeLogDistribution(
      stateIds,
      logWeights,
      completeLogEvidence,
      step,
      resolved.probabilityTolerance * 20,
      'smoothing'
    );
    if (!Array.isArray(smoothed)) return smoothed;
    smoothingSteps.push({
      step,
      calibratedEvidenceLikelihoods: row.map((entry) => ({ ...entry })),
      smoothedDistribution: smoothed
    });
  }

  const pairwiseSteps: HiddenStateCalibratedEvidencePairwiseStep[] = [];
  const expectedTransitionCounts = zeroExpectedCounts(stateIds);
  const counts = new Map<string, number>();
  for (const entry of expectedTransitionCounts) {
    counts.set(`${entry.fromStateId}\u0000${entry.toStateId}`, 0);
  }

  for (let step = 0; step < transitionCount; step += 1) {
    const forward = forwardMessages[step];
    const betaNext = backward[step + 1];
    const nextRow = rows[step + 1];
    const fromSmoothing = smoothingSteps[step]?.smoothedDistribution;
    const toSmoothing = smoothingSteps[step + 1]?.smoothedDistribution;
    if (
      forward === undefined ||
      betaNext === undefined ||
      nextRow === undefined ||
      fromSmoothing === undefined ||
      toSmoothing === undefined
    ) {
      return failure(
        'internal_calibrated_evidence_likelihood_conditioning_structural_inconsistency',
        'Missing state for Candidate Z pairwise conditioning',
        { step }
      );
    }
    const nextLikelihoods = rowMap(nextRow);
    const raw: HiddenStateCalibratedEvidencePairwiseEntry[] = [];
    let rawTotal = 0;
    for (const fromStateId of stateIds) {
      const prefix = forward.get(fromStateId) ?? Number.NEGATIVE_INFINITY;
      for (const toStateId of stateIds) {
        const transition =
          transitions.get(fromStateId)?.find((edge) => edge.to === toStateId)?.probability ?? 0;
        const likelihood = nextLikelihoods.get(toStateId) ?? 0;
        const future = betaNext.get(toStateId) ?? Number.NEGATIVE_INFINITY;
        const logWeight =
          prefix === Number.NEGATIVE_INFINITY ||
          transition === 0 ||
          likelihood === 0 ||
          future === Number.NEGATIVE_INFINITY
            ? Number.NEGATIVE_INFINITY
            : prefix + logProbability(transition) + logProbability(likelihood) + future;
        const probability =
          logWeight === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logWeight - completeLogEvidence);
        if (!Number.isFinite(probability) || probability < 0) {
          return failure(
            'non_finite_calibrated_evidence_likelihood_conditioning_result',
            'Candidate Z pairwise posterior probability became invalid',
            { step, fromStateId, toStateId, actual: probability }
          );
        }
        raw.push({ fromStateId, toStateId, probability });
        rawTotal += probability;
      }
    }
    if (!Number.isFinite(rawTotal) || rawTotal <= 0 || Math.abs(rawTotal - 1) > resolved.pairwiseConsistencyTolerance) {
      return failure(
        'calibrated_evidence_pairwise_mass_conservation_violation',
        'Candidate Z pairwise posterior probabilities do not sum to one',
        { step, actual: rawTotal, expected: 1, tolerance: resolved.pairwiseConsistencyTolerance }
      );
    }
    const pairwise = raw.map((entry) => ({
      fromStateId: entry.fromStateId,
      toStateId: entry.toStateId,
      probability: entry.probability / rawTotal
    }));

    const rowMarginal = new Map<StateId, number>();
    const columnMarginal = new Map<StateId, number>();
    for (const stateId of stateIds) {
      rowMarginal.set(stateId, 0);
      columnMarginal.set(stateId, 0);
    }
    for (const entry of pairwise) {
      rowMarginal.set(entry.fromStateId, (rowMarginal.get(entry.fromStateId) ?? 0) + entry.probability);
      columnMarginal.set(entry.toStateId, (columnMarginal.get(entry.toStateId) ?? 0) + entry.probability);
      const key = `${entry.fromStateId}\u0000${entry.toStateId}`;
      counts.set(key, (counts.get(key) ?? 0) + entry.probability);
    }
    const expectedFrom = distributionMap(fromSmoothing);
    const expectedTo = distributionMap(toSmoothing);
    for (const stateId of stateIds) {
      const actualRow = rowMarginal.get(stateId) ?? 0;
      const expectedRow = expectedFrom.get(stateId) ?? 0;
      if (Math.abs(actualRow - expectedRow) > resolved.pairwiseConsistencyTolerance) {
        return failure(
          'calibrated_evidence_pairwise_marginal_consistency_violation',
          'Candidate Z pairwise row marginal disagrees with smoothing',
          { step, fromStateId: stateId, actual: actualRow, expected: expectedRow, tolerance: resolved.pairwiseConsistencyTolerance }
        );
      }
      const actualColumn = columnMarginal.get(stateId) ?? 0;
      const expectedColumn = expectedTo.get(stateId) ?? 0;
      if (Math.abs(actualColumn - expectedColumn) > resolved.pairwiseConsistencyTolerance) {
        return failure(
          'calibrated_evidence_pairwise_marginal_consistency_violation',
          'Candidate Z pairwise column marginal disagrees with smoothing',
          { step, toStateId: stateId, actual: actualColumn, expected: expectedColumn, tolerance: resolved.pairwiseConsistencyTolerance }
        );
      }
    }
    pairwiseSteps.push({ step, pairwiseDistribution: pairwise });
  }

  for (const entry of expectedTransitionCounts) {
    entry.expectedCount = counts.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0;
    if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) {
      return failure(
        'non_finite_calibrated_evidence_likelihood_conditioning_result',
        'Candidate Z expected transition count became invalid',
        { fromStateId: entry.fromStateId, toStateId: entry.toStateId, actual: entry.expectedCount }
      );
    }
  }
  const countTotal = expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  if (Math.abs(countTotal - transitionCount) > resolved.expectedCountTolerance) {
    return failure(
      'calibrated_evidence_expected_transition_count_conservation_violation',
      'Candidate Z expected transition counts do not sum to the number of transition indices',
      { actual: countTotal, expected: transitionCount, tolerance: resolved.expectedCountTolerance }
    );
  }

  return {
    ok: true,
    possible: true,
    evidenceLikelihoods: rows.map((row) => row.map((entry) => ({ ...entry }))),
    filteringSteps,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    logLikelihood: completeLogEvidence,
    combinedEvidenceProbability:
      directProbability === null ? null : Math.min(1, directProbability),
    diagnostics: makeDiagnostics(resolved, rows.length, rows.length, underflowed, null)
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

export function finiteHiddenStateCalibratedEvidenceLikelihoodConditioningResultToJson(
  result: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state calibrated evidence-likelihood conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
