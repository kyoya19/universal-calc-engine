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
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';

export type FiniteHiddenStateCoarsenedObservationConditioningRequest = {
  initialDistribution: FiniteHiddenStateObservationRequest['initialDistribution'];
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
  observationEvidenceSets: string[][];
};

export type FiniteHiddenStateCoarsenedObservationConditioningOptions =
  FiniteHiddenStateObservationOptions & {
    pairwiseConsistencyTolerance?: number;
    expectedCountTolerance?: number;
  };

export type HiddenStateCoarsenedObservationDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type HiddenStateCoarsenedObservationFilteringStep = {
  step: number;
  allowedObservationSymbols: string[];
  predictiveDistribution: HiddenStateCoarsenedObservationDistribution;
  evidenceProbability: number | null;
  prefixLogLikelihood: number | null;
  filteredDistribution: HiddenStateCoarsenedObservationDistribution | null;
};

export type HiddenStateCoarsenedObservationSmoothingStep = {
  step: number;
  allowedObservationSymbols: string[];
  smoothedDistribution: HiddenStateCoarsenedObservationDistribution;
};

export type HiddenStateCoarsenedObservationPairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type HiddenStateCoarsenedObservationPairwiseStep = {
  step: number;
  fromAllowedObservationSymbols: string[];
  toAllowedObservationSymbols: string[];
  pairwiseDistribution: HiddenStateCoarsenedObservationPairwiseEntry[];
};

export type HiddenStateCoarsenedObservationExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteHiddenStateCoarsenedObservationConditioningDiagnostics = {
  method: 'scaled_forward_backward_hard_set_valued_observation_conditioning';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  posteriorNormalizationApplied: true;
  timeConvention: 'emit_at_step_0_then_transition_and_emit';
  terminalSemantics: 'implicit_self_retention';
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxObservations: number;
  observationsRequested: number;
  observationsProcessed: number;
  combinedEvidenceProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  candidateCValidationReused: true;
  existingCandidateCHRXRequestTypesModified: false;
  setValuedObservationEvidenceUsed: true;
  softEvidenceUsed: false;
  missingnessMechanismUsed: false;
  stateEvidenceMaskUsed: false;
  candidateXCompositionUsed: false;
  parameterLearningUsed: false;
  candidateSModified: false;
  candidateTModified: false;
  candidateUModified: false;
  candidateVModified: false;
  candidateWModified: false;
  modelRewritten: false;
  exactSymbolImputationComputed: false;
  causalInterventionUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  parameterPosteriorComputed: false;
  globalModelIdentificationClaimed: false;
};

export type CoarsenedObservationConditioningFailureCode =
  | 'invalid_observation_evidence_sets_container'
  | 'empty_observation_evidence_sequence'
  | 'invalid_observation_evidence_set_entry'
  | 'unknown_observation_evidence_symbol'
  | 'duplicate_observation_evidence_symbol'
  | 'invalid_candidate_y_tolerance'
  | 'coarsened_filtering_mass_conservation_violation'
  | 'coarsened_smoothing_mass_conservation_violation'
  | 'coarsened_pairwise_mass_conservation_violation'
  | 'coarsened_pairwise_marginal_consistency_violation'
  | 'coarsened_expected_transition_count_conservation_violation'
  | 'internal_coarsened_observation_conditioning_structural_inconsistency'
  | 'non_finite_coarsened_observation_conditioning_result';

export type CoarsenedObservationConditioningFailure = {
  code: CoarsenedObservationConditioningFailureCode;
  message: string;
  path?: string;
  step?: number;
  symbol?: string;
  stateId?: StateId;
  fromStateId?: StateId;
  toStateId?: StateId;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteHiddenStateCoarsenedObservationConditioningFailure = {
  ok: false;
  failure: CoarsenedObservationConditioningFailure;
};

export type FiniteHiddenStateCoarsenedObservationConditioningSuccess = {
  ok: true;
  possible: boolean;
  observationEvidenceSets: string[][];
  filteringSteps: HiddenStateCoarsenedObservationFilteringStep[];
  smoothingSteps: HiddenStateCoarsenedObservationSmoothingStep[] | null;
  pairwiseSteps: HiddenStateCoarsenedObservationPairwiseStep[] | null;
  expectedTransitionCounts: HiddenStateCoarsenedObservationExpectedTransitionCount[] | null;
  logLikelihood: number | null;
  combinedEvidenceProbability: number | null;
  diagnostics: FiniteHiddenStateCoarsenedObservationConditioningDiagnostics;
};

export type FiniteHiddenStateCoarsenedObservationConditioningResult =
  | FiniteHiddenStateCoarsenedObservationConditioningSuccess
  | FiniteHiddenStateCoarsenedObservationConditioningFailure
  | FiniteHiddenStateObservationFailure;

type ResolvedCandidateYOptions = {
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
  code: CoarsenedObservationConditioningFailureCode,
  message: string,
  details: Omit<CoarsenedObservationConditioningFailure, 'code' | 'message'> = {}
): FiniteHiddenStateCoarsenedObservationConditioningFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function validateEvidenceContainer(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest
): FiniteHiddenStateCoarsenedObservationConditioningFailure | undefined {
  if (!Array.isArray(request.observationEvidenceSets)) {
    return failure(
      'invalid_observation_evidence_sets_container',
      'observationEvidenceSets must be an array',
      { path: 'request.observationEvidenceSets' }
    );
  }
  if (request.observationEvidenceSets.length === 0) {
    return failure(
      'empty_observation_evidence_sequence',
      'observationEvidenceSets must contain at least one time step',
      { path: 'request.observationEvidenceSets' }
    );
  }
  return undefined;
}

function makeValidationRequest(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest
): FiniteHiddenStateObservationRequest {
  const validationSymbol =
    Array.isArray(request.alphabet) && typeof request.alphabet[0] === 'string'
      ? request.alphabet[0]
      : '';
  return {
    initialDistribution: request.initialDistribution,
    alphabet: request.alphabet,
    kernel: request.kernel,
    observations: Array.from(
      { length: request.observationEvidenceSets.length },
      () => validationSymbol
    )
  };
}

function resolveOptions(
  options: FiniteHiddenStateCoarsenedObservationConditioningOptions,
  probabilityTolerance: number,
  maxObservations: number,
  transitionCount: number
): ResolvedCandidateYOptions | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const pairwiseConsistencyTolerance =
    options.pairwiseConsistencyTolerance ?? probabilityTolerance * 20;
  if (!Number.isFinite(pairwiseConsistencyTolerance) || pairwiseConsistencyTolerance <= 0) {
    return failure(
      'invalid_candidate_y_tolerance',
      'pairwiseConsistencyTolerance must be a finite positive number',
      { path: 'options.pairwiseConsistencyTolerance' }
    );
  }
  const expectedCountTolerance =
    options.expectedCountTolerance ?? pairwiseConsistencyTolerance * Math.max(1, transitionCount);
  if (!Number.isFinite(expectedCountTolerance) || expectedCountTolerance <= 0) {
    return failure(
      'invalid_candidate_y_tolerance',
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

function canonicalizeEvidenceSets(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest
): string[][] | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const knownSymbols = new Set(request.alphabet);
  const canonical: string[][] = [];
  for (let step = 0; step < request.observationEvidenceSets.length; step += 1) {
    const entry = request.observationEvidenceSets[step];
    if (!Array.isArray(entry)) {
      return failure(
        'invalid_observation_evidence_set_entry',
        `observationEvidenceSets[${step}] must be an array`,
        { path: `request.observationEvidenceSets[${step}]`, step }
      );
    }
    const seen = new Set<string>();
    const symbols: string[] = [];
    for (let index = 0; index < entry.length; index += 1) {
      const symbol = entry[index];
      if (typeof symbol !== 'string') {
        return failure(
          'invalid_observation_evidence_set_entry',
          `observationEvidenceSets[${step}][${index}] must be a symbol string`,
          { path: `request.observationEvidenceSets[${step}][${index}]`, step }
        );
      }
      if (!knownSymbols.has(symbol)) {
        return failure(
          'unknown_observation_evidence_symbol',
          `Unknown symbol in observationEvidenceSets[${step}]: ${symbol}`,
          { path: `request.observationEvidenceSets[${step}][${index}]`, step, symbol }
        );
      }
      if (seen.has(symbol)) {
        return failure(
          'duplicate_observation_evidence_symbol',
          `Duplicate symbol in observationEvidenceSets[${step}]: ${symbol}`,
          { path: `request.observationEvidenceSets[${step}][${index}]`, step, symbol }
        );
      }
      seen.add(symbol);
      symbols.push(symbol);
    }
    symbols.sort(compareStrings);
    canonical.push(symbols);
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

function buildKernel(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  stateIds: StateId[]
): Map<StateId, Map<string, number>> {
  const kernel = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) kernel.set(stateId, new Map<string, number>());
  for (const entry of request.kernel) {
    kernel.get(entry.stateId)?.set(entry.symbol, entry.probability);
  }
  return kernel;
}

function buildInitial(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  stateIds: StateId[]
): Map<StateId, number> {
  const initial = new Map<StateId, number>();
  for (const stateId of stateIds) initial.set(stateId, 0);
  for (const entry of request.initialDistribution) initial.set(entry.stateId, entry.probability);
  return initial;
}

function evidenceFactor(
  stateId: StateId,
  symbols: string[],
  kernel: Map<StateId, Map<string, number>>
): number {
  let total = 0;
  for (const symbol of symbols) total += kernel.get(stateId)?.get(symbol) ?? 0;
  return total;
}

function denseDistribution(
  stateIds: StateId[],
  values: Map<StateId, number>
): HiddenStateCoarsenedObservationDistribution {
  return stateIds.map((stateId) => ({ stateId, probability: values.get(stateId) ?? 0 }));
}

function distributionMap(
  distribution: HiddenStateCoarsenedObservationDistribution
): Map<StateId, number> {
  return new Map(distribution.map((entry) => [entry.stateId, entry.probability] as const));
}

function totalDistribution(
  stateIds: StateId[],
  values: Map<StateId, number>
): number {
  let total = 0;
  for (const stateId of stateIds) total += values.get(stateId) ?? 0;
  return total;
}

function normalize(
  stateIds: StateId[],
  values: Map<StateId, number>,
  step: number,
  tolerance: number,
  kind: 'filtering' | 'smoothing'
): HiddenStateCoarsenedObservationDistribution | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const total = totalDistribution(stateIds, values);
  if (!Number.isFinite(total) || total <= 0) {
    return failure(
      kind === 'filtering'
        ? 'coarsened_filtering_mass_conservation_violation'
        : 'coarsened_smoothing_mass_conservation_violation',
      `Coarsened ${kind} mass must be finite and positive for possible evidence`,
      { step, actual: total, tolerance }
    );
  }
  const normalized: HiddenStateCoarsenedObservationDistribution = [];
  let normalizedTotal = 0;
  for (const stateId of stateIds) {
    const value = values.get(stateId) ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        `Coarsened ${kind} mass became invalid`,
        { step, stateId, actual: value }
      );
    }
    const probability = value / total;
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        `Coarsened ${kind} probability became invalid`,
        { step, stateId, actual: probability }
      );
    }
    normalized.push({ stateId, probability });
    normalizedTotal += probability;
  }
  if (Math.abs(normalizedTotal - 1) > tolerance) {
    return failure(
      kind === 'filtering'
        ? 'coarsened_filtering_mass_conservation_violation'
        : 'coarsened_smoothing_mass_conservation_violation',
      `Coarsened ${kind} probabilities do not sum to one`,
      { step, actual: normalizedTotal, expected: 1, tolerance }
    );
  }
  return normalized;
}

function checkDistribution(
  stateIds: StateId[],
  values: Map<StateId, number>,
  step: number,
  tolerance: number
): FiniteHiddenStateCoarsenedObservationConditioningFailure | undefined {
  const total = totalDistribution(stateIds, values);
  for (const stateId of stateIds) {
    const value = values.get(stateId) ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        'Coarsened predictive probability became invalid',
        { step, stateId, actual: value }
      );
    }
  }
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'coarsened_filtering_mass_conservation_violation',
      'Coarsened predictive probabilities do not sum to one',
      { step, actual: total, expected: 1, tolerance }
    );
  }
  return undefined;
}

function propagate(
  stateIds: StateId[],
  filtered: HiddenStateCoarsenedObservationDistribution,
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

function zeroExpectedCounts(
  stateIds: StateId[]
): HiddenStateCoarsenedObservationExpectedTransitionCount[] {
  const result: HiddenStateCoarsenedObservationExpectedTransitionCount[] = [];
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

function diagnostics(
  options: ResolvedCandidateYOptions,
  requested: number,
  processed: number,
  underflowed: boolean,
  impossibleAtStep: number | null
): FiniteHiddenStateCoarsenedObservationConditioningDiagnostics {
  return {
    method: 'scaled_forward_backward_hard_set_valued_observation_conditioning',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    timeConvention: 'emit_at_step_0_then_transition_and_emit',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: options.probabilityTolerance,
    pairwiseConsistencyTolerance: options.pairwiseConsistencyTolerance,
    expectedCountTolerance: options.expectedCountTolerance,
    maxObservations: options.maxObservations,
    observationsRequested: requested,
    observationsProcessed: processed,
    combinedEvidenceProbabilityUnderflowed: underflowed,
    impossibleAtStep,
    candidateCValidationReused: true,
    existingCandidateCHRXRequestTypesModified: false,
    setValuedObservationEvidenceUsed: true,
    softEvidenceUsed: false,
    missingnessMechanismUsed: false,
    stateEvidenceMaskUsed: false,
    candidateXCompositionUsed: false,
    parameterLearningUsed: false,
    candidateSModified: false,
    candidateTModified: false,
    candidateUModified: false,
    candidateVModified: false,
    candidateWModified: false,
    modelRewritten: false,
    exactSymbolImputationComputed: false,
    causalInterventionUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    parameterPosteriorComputed: false,
    globalModelIdentificationClaimed: false
  };
}

function buildScaledBackward(
  evidenceSets: string[][],
  stateIds: StateId[],
  transitions: Map<StateId, TransitionEdge[]>,
  kernel: Map<StateId, Map<string, number>>,
  scales: number[]
): Array<Map<StateId, number>> | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const messages: Array<Map<StateId, number>> = new Array(evidenceSets.length);
  const final = new Map<StateId, number>();
  for (const stateId of stateIds) final.set(stateId, 1);
  messages[evidenceSets.length - 1] = final;

  for (let step = evidenceSets.length - 2; step >= 0; step -= 1) {
    const nextSet = evidenceSets[step + 1];
    const nextMessage = messages[step + 1];
    const nextScale = scales[step + 1];
    if (nextSet === undefined || nextMessage === undefined || nextScale === undefined || nextScale <= 0) {
      return failure(
        'internal_coarsened_observation_conditioning_structural_inconsistency',
        'Missing future evidence, scale, or backward message',
        { step: step + 1 }
      );
    }
    const current = new Map<StateId, number>();
    for (const fromStateId of stateIds) {
      let value = 0;
      for (const edge of transitions.get(fromStateId) ?? []) {
        value +=
          edge.probability *
          evidenceFactor(edge.to, nextSet, kernel) *
          (nextMessage.get(edge.to) ?? 0);
      }
      value /= nextScale;
      if (!Number.isFinite(value) || value < 0) {
        return failure(
          'non_finite_coarsened_observation_conditioning_result',
          'Scaled backward message became invalid',
          { step, stateId: fromStateId, actual: value }
        );
      }
      current.set(fromStateId, value);
    }
    messages[step] = current;
  }
  return messages;
}

export function conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
  model: DefinitionModel,
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  options: FiniteHiddenStateCoarsenedObservationConditioningOptions = {}
): FiniteHiddenStateCoarsenedObservationConditioningResult {
  const containerFailure = validateEvidenceContainer(request);
  if (containerFailure !== undefined) return containerFailure;

  const baseValidation = filterFiniteHiddenStateObservationSequence(
    model,
    makeValidationRequest(request),
    options
  );
  if (!baseValidation.ok) return baseValidation;

  const evidenceSets = canonicalizeEvidenceSets(request);
  if (!Array.isArray(evidenceSets)) return evidenceSets;

  const transitionCount = Math.max(0, evidenceSets.length - 1);
  const resolved = resolveOptions(
    options,
    baseValidation.diagnostics.probabilityTolerance,
    baseValidation.diagnostics.maxObservations,
    transitionCount
  );
  if ('ok' in resolved) return resolved;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const transitions = buildTransitions(model, stateIds);
  const kernel = buildKernel(request, stateIds);
  const initial = buildInitial(request, stateIds);
  const filteringSteps: HiddenStateCoarsenedObservationFilteringStep[] = [];
  const scales: number[] = [];
  let previousFiltered: HiddenStateCoarsenedObservationDistribution | undefined;
  let logLikelihood = 0;

  for (let step = 0; step < evidenceSets.length; step += 1) {
    const evidenceSet = evidenceSets[step];
    if (evidenceSet === undefined) {
      return failure(
        'internal_coarsened_observation_conditioning_structural_inconsistency',
        'Missing canonical evidence set',
        { step }
      );
    }
    const predictive =
      step === 0
        ? new Map(initial)
        : previousFiltered === undefined
          ? new Map<StateId, number>()
          : propagate(stateIds, previousFiltered, transitions);
    const predictiveFailure = checkDistribution(
      stateIds,
      predictive,
      step,
      resolved.probabilityTolerance * 10
    );
    if (predictiveFailure !== undefined) return predictiveFailure;

    const weighted = new Map<StateId, number>();
    let scale = 0;
    for (const stateId of stateIds) {
      const factor = evidenceFactor(stateId, evidenceSet, kernel);
      if (!Number.isFinite(factor) || factor < 0 || factor > 1 + resolved.probabilityTolerance) {
        return failure(
          'non_finite_coarsened_observation_conditioning_result',
          'Kernel-derived coarsened observation evidence factor became invalid',
          { step, stateId, actual: factor }
        );
      }
      const value = (predictive.get(stateId) ?? 0) * factor;
      if (!Number.isFinite(value) || value < 0) {
        return failure(
          'non_finite_coarsened_observation_conditioning_result',
          'Coarsened filtering weighted mass became invalid',
          { step, stateId, actual: value }
        );
      }
      weighted.set(stateId, value);
      scale += value;
    }

    if (scale === 0) {
      filteringSteps.push({
        step,
        allowedObservationSymbols: [...evidenceSet],
        predictiveDistribution: denseDistribution(stateIds, predictive),
        evidenceProbability: 0,
        prefixLogLikelihood: null,
        filteredDistribution: null
      });
      return {
        ok: true,
        possible: false,
        observationEvidenceSets: evidenceSets.map((entry) => [...entry]),
        filteringSteps,
        smoothingSteps: null,
        pairwiseSteps: null,
        expectedTransitionCounts: null,
        logLikelihood: null,
        combinedEvidenceProbability: 0,
        diagnostics: diagnostics(resolved, evidenceSets.length, step + 1, false, step)
      };
    }
    if (!Number.isFinite(scale) || scale < 0 || scale > 1 + resolved.probabilityTolerance * 10) {
      return failure(
        'coarsened_filtering_mass_conservation_violation',
        'Coarsened evidence scale became invalid',
        { step, actual: scale, tolerance: resolved.probabilityTolerance * 10 }
      );
    }

    const filtered = normalize(
      stateIds,
      weighted,
      step,
      resolved.probabilityTolerance * 10,
      'filtering'
    );
    if (!Array.isArray(filtered)) return filtered;
    logLikelihood += Math.log(scale);
    if (!Number.isFinite(logLikelihood)) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        'Coarsened evidence log likelihood became invalid',
        { step, actual: logLikelihood }
      );
    }
    scales.push(scale);
    filteringSteps.push({
      step,
      allowedObservationSymbols: [...evidenceSet],
      predictiveDistribution: denseDistribution(stateIds, predictive),
      evidenceProbability: scale,
      prefixLogLikelihood: logLikelihood,
      filteredDistribution: filtered
    });
    previousFiltered = filtered;
  }

  const directProbability = directProbabilityFromLog(logLikelihood);
  if (
    directProbability !== null &&
    (!Number.isFinite(directProbability) || directProbability < 0 || directProbability > 1 + resolved.probabilityTolerance * 10)
  ) {
    return failure(
      'coarsened_filtering_mass_conservation_violation',
      'Combined coarsened observation evidence probability became invalid',
      { actual: directProbability, tolerance: resolved.probabilityTolerance * 10 }
    );
  }
  const underflowed = directProbability === null;

  const backward = buildScaledBackward(evidenceSets, stateIds, transitions, kernel, scales);
  if (!Array.isArray(backward)) return backward;

  const smoothingSteps: HiddenStateCoarsenedObservationSmoothingStep[] = [];
  for (let step = 0; step < evidenceSets.length; step += 1) {
    const filtered = filteringSteps[step]?.filteredDistribution;
    const beta = backward[step];
    const evidenceSet = evidenceSets[step];
    if (filtered === null || filtered === undefined || beta === undefined || evidenceSet === undefined) {
      return failure(
        'internal_coarsened_observation_conditioning_structural_inconsistency',
        'Missing filtering or backward state for smoothing',
        { step }
      );
    }
    const filteredMap = distributionMap(filtered);
    const weights = new Map<StateId, number>();
    for (const stateId of stateIds) {
      weights.set(stateId, (filteredMap.get(stateId) ?? 0) * (beta.get(stateId) ?? 0));
    }
    const smoothed = normalize(
      stateIds,
      weights,
      step,
      resolved.probabilityTolerance * 20,
      'smoothing'
    );
    if (!Array.isArray(smoothed)) return smoothed;
    smoothingSteps.push({
      step,
      allowedObservationSymbols: [...evidenceSet],
      smoothedDistribution: smoothed
    });
  }

  const pairwiseSteps: HiddenStateCoarsenedObservationPairwiseStep[] = [];
  const expectedTransitionCounts = zeroExpectedCounts(stateIds);
  const counts = new Map<string, number>();
  for (const entry of expectedTransitionCounts) {
    counts.set(`${entry.fromStateId}\u0000${entry.toStateId}`, 0);
  }

  for (let step = 0; step < transitionCount; step += 1) {
    const filtered = filteringSteps[step]?.filteredDistribution;
    const betaNext = backward[step + 1];
    const nextSet = evidenceSets[step + 1];
    const currentSet = evidenceSets[step];
    const nextScale = scales[step + 1];
    const fromSmoothing = smoothingSteps[step]?.smoothedDistribution;
    const toSmoothing = smoothingSteps[step + 1]?.smoothedDistribution;
    if (
      filtered === null ||
      filtered === undefined ||
      betaNext === undefined ||
      nextSet === undefined ||
      currentSet === undefined ||
      nextScale === undefined ||
      nextScale <= 0 ||
      fromSmoothing === undefined ||
      toSmoothing === undefined
    ) {
      return failure(
        'internal_coarsened_observation_conditioning_structural_inconsistency',
        'Missing state for pairwise conditioning',
        { step }
      );
    }
    const filteredMap = distributionMap(filtered);
    const raw: HiddenStateCoarsenedObservationPairwiseEntry[] = [];
    let rawTotal = 0;
    for (const fromStateId of stateIds) {
      for (const toStateId of stateIds) {
        const edge =
          transitions.get(fromStateId)?.find((candidate) => candidate.to === toStateId)?.probability ?? 0;
        const value =
          (filteredMap.get(fromStateId) ?? 0) *
          edge *
          evidenceFactor(toStateId, nextSet, kernel) *
          (betaNext.get(toStateId) ?? 0) /
          nextScale;
        if (!Number.isFinite(value) || value < 0) {
          return failure(
            'non_finite_coarsened_observation_conditioning_result',
            'Coarsened pairwise posterior mass became invalid',
            { step, fromStateId, toStateId, actual: value }
          );
        }
        raw.push({ fromStateId, toStateId, probability: value });
        rawTotal += value;
      }
    }
    if (!Number.isFinite(rawTotal) || rawTotal <= 0 || Math.abs(rawTotal - 1) > resolved.pairwiseConsistencyTolerance) {
      return failure(
        'coarsened_pairwise_mass_conservation_violation',
        'Coarsened pairwise posterior probabilities do not sum to one',
        {
          step,
          actual: rawTotal,
          expected: 1,
          tolerance: resolved.pairwiseConsistencyTolerance
        }
      );
    }
    const pairwise = raw.map((entry) => ({
      fromStateId: entry.fromStateId,
      toStateId: entry.toStateId,
      probability: entry.probability / rawTotal
    }));

    const row = new Map<StateId, number>();
    const column = new Map<StateId, number>();
    for (const stateId of stateIds) {
      row.set(stateId, 0);
      column.set(stateId, 0);
    }
    for (const entry of pairwise) {
      row.set(entry.fromStateId, (row.get(entry.fromStateId) ?? 0) + entry.probability);
      column.set(entry.toStateId, (column.get(entry.toStateId) ?? 0) + entry.probability);
      const key = `${entry.fromStateId}\u0000${entry.toStateId}`;
      counts.set(key, (counts.get(key) ?? 0) + entry.probability);
    }
    const expectedFrom = distributionMap(fromSmoothing);
    const expectedTo = distributionMap(toSmoothing);
    for (const stateId of stateIds) {
      const actualRow = row.get(stateId) ?? 0;
      const expectedRow = expectedFrom.get(stateId) ?? 0;
      if (Math.abs(actualRow - expectedRow) > resolved.pairwiseConsistencyTolerance) {
        return failure(
          'coarsened_pairwise_marginal_consistency_violation',
          'Coarsened pairwise row marginal disagrees with Candidate Y smoothing',
          {
            step,
            fromStateId: stateId,
            actual: actualRow,
            expected: expectedRow,
            tolerance: resolved.pairwiseConsistencyTolerance
          }
        );
      }
      const actualColumn = column.get(stateId) ?? 0;
      const expectedColumn = expectedTo.get(stateId) ?? 0;
      if (Math.abs(actualColumn - expectedColumn) > resolved.pairwiseConsistencyTolerance) {
        return failure(
          'coarsened_pairwise_marginal_consistency_violation',
          'Coarsened pairwise column marginal disagrees with Candidate Y smoothing',
          {
            step,
            toStateId: stateId,
            actual: actualColumn,
            expected: expectedColumn,
            tolerance: resolved.pairwiseConsistencyTolerance
          }
        );
      }
    }
    pairwiseSteps.push({
      step,
      fromAllowedObservationSymbols: [...currentSet],
      toAllowedObservationSymbols: [...nextSet],
      pairwiseDistribution: pairwise
    });
  }

  for (const entry of expectedTransitionCounts) {
    entry.expectedCount = counts.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0;
    if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        'Coarsened expected transition count became invalid',
        {
          fromStateId: entry.fromStateId,
          toStateId: entry.toStateId,
          actual: entry.expectedCount
        }
      );
    }
  }
  const countTotal = expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  if (Math.abs(countTotal - transitionCount) > resolved.expectedCountTolerance) {
    return failure(
      'coarsened_expected_transition_count_conservation_violation',
      'Coarsened expected transition counts do not sum to the number of transition indices',
      {
        actual: countTotal,
        expected: transitionCount,
        tolerance: resolved.expectedCountTolerance
      }
    );
  }

  return {
    ok: true,
    possible: true,
    observationEvidenceSets: evidenceSets.map((entry) => [...entry]),
    filteringSteps,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    logLikelihood,
    combinedEvidenceProbability: directProbability === null ? null : Math.min(1, directProbability),
    diagnostics: diagnostics(resolved, evidenceSets.length, evidenceSets.length, underflowed, null)
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

export function finiteHiddenStateCoarsenedObservationConditioningResultToJson(
  result: FiniteHiddenStateCoarsenedObservationConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state coarsened-observation conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
