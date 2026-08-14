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
  method: 'log_domain_forward_backward_hard_set_valued_observation_conditioning';
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
  | 'internal_coarsened_observation_structural_inconsistency'
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

function resolveCandidateYOptions(
  options: FiniteHiddenStateCoarsenedObservationConditioningOptions,
  baseProbabilityTolerance: number,
  baseMaxObservations: number,
  transitionCount: number
): ResolvedCandidateYOptions | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const pairwiseConsistencyTolerance =
    options.pairwiseConsistencyTolerance ?? baseProbabilityTolerance * 20;
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
    probabilityTolerance: baseProbabilityTolerance,
    pairwiseConsistencyTolerance,
    expectedCountTolerance,
    maxObservations: baseMaxObservations
  };
}

function validateAndCanonicalizeEvidenceSets(
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest
): string[][] | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const knownSymbols = new Set(request.alphabet);
  const canonical: string[][] = [];
  for (let step = 0; step < request.observationEvidenceSets.length; step += 1) {
    const evidenceSet = request.observationEvidenceSets[step];
    if (!Array.isArray(evidenceSet)) {
      return failure(
        'invalid_observation_evidence_set_entry',
        `observationEvidenceSets[${step}] must be an array`,
        { path: `request.observationEvidenceSets[${step}]`, step }
      );
    }
    const seen = new Set<string>();
    const current: string[] = [];
    for (let index = 0; index < evidenceSet.length; index += 1) {
      const symbol = evidenceSet[index];
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
      current.push(symbol);
    }
    current.sort(compareStrings);
    canonical.push(current);
  }
  return canonical;
}

function buildTransitionRows(
  model: DefinitionModel,
  stateIds: StateId[]
): Map<StateId, TransitionEdge[]> {
  const rows = new Map<StateId, TransitionEdge[]>();
  for (const stateId of stateIds) rows.set(stateId, []);

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

function buildInitialDistribution(
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

function logAdd(left: number, right: number): number {
  if (left === Number.NEGATIVE_INFINITY) return right;
  if (right === Number.NEGATIVE_INFINITY) return left;
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return high + Math.log1p(Math.exp(low - high));
}

function logProbability(probability: number): number {
  return probability === 0 ? Number.NEGATIVE_INFINITY : Math.log(probability);
}

function logTotal(stateIds: StateId[], logMass: Map<StateId, number>): number {
  let total = Number.NEGATIVE_INFINITY;
  for (const stateId of stateIds) {
    total = logAdd(total, logMass.get(stateId) ?? Number.NEGATIVE_INFINITY);
  }
  return total;
}

function denseDistribution(
  stateIds: StateId[],
  massByState: Map<StateId, number>
): HiddenStateCoarsenedObservationDistribution {
  return stateIds.map((stateId) => ({
    stateId,
    probability: massByState.get(stateId) ?? 0
  }));
}

function normalizeLogDistribution(
  stateIds: StateId[],
  logMass: Map<StateId, number>,
  totalLogMass: number,
  step: number,
  tolerance: number,
  kind: 'filtering' | 'smoothing'
):
  | HiddenStateCoarsenedObservationDistribution
  | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  if (!Number.isFinite(totalLogMass)) {
    return failure(
      kind === 'filtering'
        ? 'coarsened_filtering_mass_conservation_violation'
        : 'coarsened_smoothing_mass_conservation_violation',
      `Coarsened ${kind} mass is zero for evidence treated as possible`,
      { step, tolerance }
    );
  }

  const raw: HiddenStateCoarsenedObservationDistribution = [];
  let total = 0;
  for (const stateId of stateIds) {
    const value = logMass.get(stateId) ?? Number.NEGATIVE_INFINITY;
    if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        `Coarsened ${kind} log mass became invalid`,
        { step, stateId }
      );
    }
    const probability =
      value === Number.NEGATIVE_INFINITY ? 0 : Math.exp(value - totalLogMass);
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        `Coarsened ${kind} probability became invalid`,
        { step, stateId, actual: probability }
      );
    }
    raw.push({ stateId, probability });
    total += probability;
  }

  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure(
      kind === 'filtering'
        ? 'coarsened_filtering_mass_conservation_violation'
        : 'coarsened_smoothing_mass_conservation_violation',
      `Coarsened ${kind} probabilities do not sum to one`,
      { step, actual: total, expected: 1, tolerance }
    );
  }

  return raw.map((entry) => ({
    stateId: entry.stateId,
    probability: entry.probability / total
  }));
}

function predictiveFromFiltered(
  stateIds: StateId[],
  filtered: HiddenStateCoarsenedObservationDistribution,
  transitions: Map<StateId, TransitionEdge[]>
): Map<StateId, number> {
  const predictive = new Map<StateId, number>();
  for (const stateId of stateIds) predictive.set(stateId, 0);
  const filteredByState = new Map(
    filtered.map((entry) => [entry.stateId, entry.probability] as const)
  );
  for (const fromStateId of stateIds) {
    const source = filteredByState.get(fromStateId) ?? 0;
    if (source === 0) continue;
    for (const edge of transitions.get(fromStateId) ?? []) {
      predictive.set(edge.to, (predictive.get(edge.to) ?? 0) + source * edge.probability);
    }
  }
  return predictive;
}

function checkPredictive(
  stateIds: StateId[],
  predictive: Map<StateId, number>,
  step: number,
  tolerance: number
): FiniteHiddenStateCoarsenedObservationConditioningFailure | undefined {
  let total = 0;
  for (const stateId of stateIds) {
    const probability = predictive.get(stateId) ?? 0;
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        'Coarsened predictive probability became invalid',
        { step, stateId, actual: probability }
      );
    }
    total += probability;
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

function directProbabilityFromLog(logValue: number, tolerance: number): number | null {
  const probability = Math.exp(logValue);
  if (probability === 0 && Number.isFinite(logValue)) return null;
  if (probability > 1 && probability <= 1 + tolerance) return 1;
  return probability;
}

function makeDiagnostics(
  resolved: ResolvedCandidateYOptions,
  requested: number,
  processed: number,
  underflowed: boolean,
  impossibleAtStep: number | null
): FiniteHiddenStateCoarsenedObservationConditioningDiagnostics {
  return {
    method: 'log_domain_forward_backward_hard_set_valued_observation_conditioning',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    timeConvention: 'emit_at_step_0_then_transition_and_emit',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: resolved.probabilityTolerance,
    pairwiseConsistencyTolerance: resolved.pairwiseConsistencyTolerance,
    expectedCountTolerance: resolved.expectedCountTolerance,
    maxObservations: resolved.maxObservations,
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

function buildBackwardMessages(
  canonicalEvidenceSets: string[][],
  stateIds: StateId[],
  transitions: Map<StateId, TransitionEdge[]>,
  kernel: Map<StateId, Map<string, number>>
):
  | Array<Map<StateId, number>>
  | FiniteHiddenStateCoarsenedObservationConditioningFailure {
  const finalStep = canonicalEvidenceSets.length - 1;
  const messages: Array<Map<StateId, number>> = new Array(canonicalEvidenceSets.length);
  const final = new Map<StateId, number>();
  for (const stateId of stateIds) final.set(stateId, 0);
  messages[finalStep] = final;

  for (let step = finalStep - 1; step >= 0; step -= 1) {
    const nextSet = canonicalEvidenceSets[step + 1];
    const nextMessage = messages[step + 1];
    if (nextSet === undefined || nextMessage === undefined) {
      return failure(
        'internal_coarsened_observation_structural_inconsistency',
        'Missing future evidence set or backward message',
        { step: step + 1 }
      );
    }
    const current = new Map<StateId, number>();
    for (const fromStateId of stateIds) {
      let value = Number.NEGATIVE_INFINITY;
      for (const edge of transitions.get(fromStateId) ?? []) {
        if (edge.probability === 0) continue;
        const factor = evidenceFactor(edge.to, nextSet, kernel);
        const future = nextMessage.get(edge.to) ?? Number.NEGATIVE_INFINITY;
        if (factor === 0 || future === Number.NEGATIVE_INFINITY) continue;
        const term = logProbability(edge.probability) + logProbability(factor) + future;
        if (Number.isNaN(term) || term === Number.POSITIVE_INFINITY) {
          return failure(
            'non_finite_coarsened_observation_conditioning_result',
            'Backward coarsened-observation log message became invalid',
            { step, fromStateId, toStateId: edge.to }
          );
        }
        value = logAdd(value, term);
      }
      current.set(fromStateId, value);
    }
    messages[step] = current;
  }
  return messages;
}

function zeroExpectedCounts(
  stateIds: StateId[]
): HiddenStateCoarsenedObservationExpectedTransitionCount[] {
  const counts: HiddenStateCoarsenedObservationExpectedTransitionCount[] = [];
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) {
      counts.push({ fromStateId, toStateId, expectedCount: 0 });
    }
  }
  return counts;
}

function distributionMap(
  distribution: HiddenStateCoarsenedObservationDistribution
): Map<StateId, number> {
  return new Map(distribution.map((entry) => [entry.stateId, entry.probability] as const));
}

export function conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
  model: DefinitionModel,
  request: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  options: FiniteHiddenStateCoarsenedObservationConditioningOptions = {}
): FiniteHiddenStateCoarsenedObservationConditioningResult {
  const containerFailure = validateEvidenceContainer(request);
  if (containerFailure !== undefined) return containerFailure;

  const validationRequest = makeValidationRequest(request);
  const baseValidation = filterFiniteHiddenStateObservationSequence(
    model,
    validationRequest,
    options
  );
  if (!baseValidation.ok) return baseValidation;

  const canonicalEvidenceSets = validateAndCanonicalizeEvidenceSets(request);
  if (!Array.isArray(canonicalEvidenceSets)) return canonicalEvidenceSets;

  const transitionCount = Math.max(0, canonicalEvidenceSets.length - 1);
  const resolved = resolveCandidateYOptions(
    options,
    baseValidation.diagnostics.probabilityTolerance,
    baseValidation.diagnostics.maxObservations,
    transitionCount
  );
  if ('ok' in resolved) return resolved;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const transitions = buildTransitionRows(model, stateIds);
  const kernel = buildKernel(request, stateIds);
  const initial = buildInitialDistribution(request, stateIds);
  const forwardMessages: Array<Map<StateId, number>> = [];
  const filteringSteps: HiddenStateCoarsenedObservationFilteringStep[] = [];
  let previousFiltered: HiddenStateCoarsenedObservationDistribution | undefined;
  let previousLogEvidence = 0;

  for (let step = 0; step < canonicalEvidenceSets.length; step += 1) {
    const evidenceSet = canonicalEvidenceSets[step];
    if (evidenceSet === undefined) {
      return failure(
        'internal_coarsened_observation_structural_inconsistency',
        'Missing observation evidence set after validation',
        { step }
      );
    }

    const predictive =
      step === 0
        ? new Map(initial)
        : previousFiltered === undefined
          ? new Map<StateId, number>()
          : predictiveFromFiltered(stateIds, previousFiltered, transitions);
    const predictiveFailure = checkPredictive(
      stateIds,
      predictive,
      step,
      resolved.probabilityTolerance * 10
    );
    if (predictiveFailure !== undefined) return predictiveFailure;

    const current = new Map<StateId, number>();
    for (const stateId of stateIds) {
      const factor = evidenceFactor(stateId, evidenceSet, kernel);
      if (!Number.isFinite(factor) || factor < 0 || factor > 1 + resolved.probabilityTolerance) {
        return failure(
          'non_finite_coarsened_observation_conditioning_result',
          'Kernel-derived coarsened observation evidence factor became invalid',
          { step, stateId, actual: factor }
        );
      }
      if (factor === 0) {
        current.set(stateId, Number.NEGATIVE_INFINITY);
        continue;
      }

      if (step === 0) {
        const initialProbability = initial.get(stateId) ?? 0;
        current.set(
          stateId,
          initialProbability === 0
            ? Number.NEGATIVE_INFINITY
            : logProbability(initialProbability) + logProbability(factor)
        );
        continue;
      }

      const previous = forwardMessages[step - 1];
      if (previous === undefined) {
        return failure(
          'internal_coarsened_observation_structural_inconsistency',
          'Missing previous forward message',
          { step }
        );
      }
      let incoming = Number.NEGATIVE_INFINITY;
      for (const fromStateId of stateIds) {
        const previousMass = previous.get(fromStateId) ?? Number.NEGATIVE_INFINITY;
        if (previousMass === Number.NEGATIVE_INFINITY) continue;
        const transition =
          transitions.get(fromStateId)?.find((edge) => edge.to === stateId)?.probability ?? 0;
        if (transition === 0) continue;
        incoming = logAdd(incoming, previousMass + logProbability(transition));
      }
      current.set(
        stateId,
        incoming === Number.NEGATIVE_INFINITY
          ? Number.NEGATIVE_INFINITY
          : incoming + logProbability(factor)
      );
    }

    const currentLogEvidence = logTotal(stateIds, current);
    if (currentLogEvidence === Number.NEGATIVE_INFINITY) {
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
        observationEvidenceSets: canonicalEvidenceSets.map((entry) => [...entry]),
        filteringSteps,
        smoothingSteps: null,
        pairwiseSteps: null,
        expectedTransitionCounts: null,
        logLikelihood: null,
        combinedEvidenceProbability: 0,
        diagnostics: makeDiagnostics(
          resolved,
          canonicalEvidenceSets.length,
          step + 1,
          false,
          step
        )
      };
    }
    if (!Number.isFinite(currentLogEvidence)) {
      return failure(
        'non_finite_coarsened_observation_conditioning_result',
        'Coarsened prefix log likelihood became invalid',
        { step, actual: currentLogEvidence }
      );
    }

    const filtered = normalizeLogDistribution(
      stateIds,
      current,
      currentLogEvidence,
      step,
      resolved.probabilityTolerance * 10,
      'filtering'
    );
    if (!Array.isArray(filtered)) return filtered;

    const incrementalLogEvidence = currentLogEvidence - previousLogEvidence;
    const evidenceProbability = directProbabilityFromLog(
      incrementalLogEvidence,
      resolved.probabilityTolerance
    );
    if (
      evidenceProbability !== null &&
      (!Number.isFinite(evidenceProbability) ||
        evidenceProbability < 0 ||
        evidenceProbability > 1 + resolved.probabilityTolerance * 10)
    ) {
      return failure(
        'coarsened_filtering_mass_conservation_violation',
        'Coarsened step evidence probability became invalid',
        { step, actual: evidenceProbability, tolerance: resolved.probabilityTolerance * 10 }
      );
    }

    filteringSteps.push({
      step,
      allowedObservationSymbols: [...evidenceSet],
      predictiveDistribution: denseDistribution(stateIds, predictive),
      evidenceProbability:
        evidenceProbability === null ? null : Math.min(1, evidenceProbability),
      prefixLogLikelihood: currentLogEvidence,
      filteredDistribution: filtered
    });
    forwardMessages.push(current);
    previousFiltered = filtered;
    previousLogEvidence = currentLogEvidence;
  }

  const completeLogEvidence = previousLogEvidence;
  const directCombinedProbability = directProbabilityFromLog(
    completeLogEvidence,
    resolved.probabilityTolerance
  );
  if (
    directCombinedProbability !== null &&
    (!Number.isFinite(directCombinedProbability) ||
      directCombinedProbability < 0 ||
      directCombinedProbability > 1 + resolved.probabilityTolerance * 10)
  ) {
    return failure(
      'coarsened_filtering_mass_conservation_violation',
      'Combined coarsened observation evidence probability became invalid',
      { actual: directCombinedProbability, tolerance: resolved.probabilityTolerance * 10 }
    );
  }
  const underflowed = directCombinedProbability === null;

  const backwardMessages = buildBackwardMessages(
    canonicalEvidenceSets,
    stateIds,
    transitions,
    kernel
  );
  if (!Array.isArray(backwardMessages)) return backwardMessages;

  const smoothingSteps: HiddenStateCoarsenedObservationSmoothingStep[] = [];
  for (let step = 0; step < canonicalEvidenceSets.length; step += 1) {
    const forward = forwardMessages[step];
    const backward = backwardMessages[step];
    const evidenceSet = canonicalEvidenceSets[step];
    if (forward === undefined || backward === undefined || evidenceSet === undefined) {
      return failure(
        'internal_coarsened_observation_structural_inconsistency',
        'Missing state for coarsened smoothing',
        { step }
      );
    }
    const logWeights = new Map<StateId, number>();
    for (const stateId of stateIds) {
      const left = forward.get(stateId) ?? Number.NEGATIVE_INFINITY;
      const right = backward.get(stateId) ?? Number.NEGATIVE_INFINITY;
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
      allowedObservationSymbols: [...evidenceSet],
      smoothedDistribution: smoothed
    });
  }

  const pairwiseSteps: HiddenStateCoarsenedObservationPairwiseStep[] = [];
  const expectedTransitionCounts = zeroExpectedCounts(stateIds);
  const countByPair = new Map<string, number>();
  for (const entry of expectedTransitionCounts) {
    countByPair.set(`${entry.fromStateId}\u0000${entry.toStateId}`, 0);
  }

  for (let step = 0; step < transitionCount; step += 1) {
    const forward = forwardMessages[step];
    const backwardNext = backwardMessages[step + 1];
    const currentSet = canonicalEvidenceSets[step];
    const nextSet = canonicalEvidenceSets[step + 1];
    const fromSmoothing = smoothingSteps[step]?.smoothedDistribution;
    const toSmoothing = smoothingSteps[step + 1]?.smoothedDistribution;
    if (
      forward === undefined ||
      backwardNext === undefined ||
      currentSet === undefined ||
      nextSet === undefined ||
      fromSmoothing === undefined ||
      toSmoothing === undefined
    ) {
      return failure(
        'internal_coarsened_observation_structural_inconsistency',
        'Missing state for coarsened pairwise smoothing',
        { step }
      );
    }

    const raw: HiddenStateCoarsenedObservationPairwiseEntry[] = [];
    let pairwiseTotal = 0;
    for (const fromStateId of stateIds) {
      const prefix = forward.get(fromStateId) ?? Number.NEGATIVE_INFINITY;
      for (const toStateId of stateIds) {
        const transition =
          transitions.get(fromStateId)?.find((edge) => edge.to === toStateId)?.probability ?? 0;
        const factor = evidenceFactor(toStateId, nextSet, kernel);
        const future = backwardNext.get(toStateId) ?? Number.NEGATIVE_INFINITY;
        const logWeight =
          prefix === Number.NEGATIVE_INFINITY ||
          transition === 0 ||
          factor === 0 ||
          future === Number.NEGATIVE_INFINITY
            ? Number.NEGATIVE_INFINITY
            : prefix + logProbability(transition) + logProbability(factor) + future;
        if (Number.isNaN(logWeight) || logWeight === Number.POSITIVE_INFINITY) {
          return failure(
            'non_finite_coarsened_observation_conditioning_result',
            'Coarsened pairwise log weight became invalid',
            { step, fromStateId, toStateId }
          );
        }
        const probability =
          logWeight === Number.NEGATIVE_INFINITY
            ? 0
            : Math.exp(logWeight - completeLogEvidence);
        if (!Number.isFinite(probability) || probability < 0) {
          return failure(
            'non_finite_coarsened_observation_conditioning_result',
            'Coarsened pairwise posterior probability became invalid',
            { step, fromStateId, toStateId, actual: probability }
          );
        }
        raw.push({ fromStateId, toStateId, probability });
        pairwiseTotal += probability;
      }
    }

    if (
      !Number.isFinite(pairwiseTotal) ||
      pairwiseTotal <= 0 ||
      Math.abs(pairwiseTotal - 1) > resolved.pairwiseConsistencyTolerance
    ) {
      return failure(
        'coarsened_pairwise_mass_conservation_violation',
        'Coarsened pairwise posterior probabilities do not sum to one',
        {
          step,
          actual: pairwiseTotal,
          expected: 1,
          tolerance: resolved.pairwiseConsistencyTolerance
        }
      );
    }
    const pairwise = raw.map((entry) => ({
      fromStateId: entry.fromStateId,
      toStateId: entry.toStateId,
      probability: entry.probability / pairwiseTotal
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

    for (const entry of pairwise) {
      const key = `${entry.fromStateId}\u0000${entry.toStateId}`;
      countByPair.set(key, (countByPair.get(key) ?? 0) + entry.probability);
    }
    pairwiseSteps.push({
      step,
      fromAllowedObservationSymbols: [...currentSet],
      toAllowedObservationSymbols: [...nextSet],
      pairwiseDistribution: pairwise
    });
  }

  for (const entry of expectedTransitionCounts) {
    entry.expectedCount = countByPair.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0;
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
  const expectedCountTotal = expectedTransitionCounts.reduce(
    (sum, entry) => sum + entry.expectedCount,
    0
  );
  if (Math.abs(expectedCountTotal - transitionCount) > resolved.expectedCountTolerance) {
    return failure(
      'coarsened_expected_transition_count_conservation_violation',
      'Coarsened expected transition counts do not sum to the number of transition indices',
      {
        actual: expectedCountTotal,
        expected: transitionCount,
        tolerance: resolved.expectedCountTolerance
      }
    );
  }

  return {
    ok: true,
    possible: true,
    observationEvidenceSets: canonicalEvidenceSets.map((entry) => [...entry]),
    filteringSteps,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    logLikelihood: completeLogEvidence,
    combinedEvidenceProbability:
      directCombinedProbability === null ? null : Math.min(1, directCombinedProbability),
    diagnostics: makeDiagnostics(
      resolved,
      canonicalEvidenceSets.length,
      canonicalEvidenceSets.length,
      underflowed,
      null
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
