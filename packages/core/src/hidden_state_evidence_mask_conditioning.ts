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

export type FiniteHiddenStateEvidenceMaskConditioningRequest =
  FiniteHiddenStateObservationRequest & {
    stateEvidenceMasks: StateId[][];
  };

export type FiniteHiddenStateEvidenceMaskConditioningOptions =
  FiniteHiddenStateObservationOptions & {
    pairwiseConsistencyTolerance?: number;
    expectedCountTolerance?: number;
  };

export type HiddenStateEvidenceMaskDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type HiddenStateEvidenceMaskFilteringStep = {
  step: number;
  observation: string;
  allowedStateIds: StateId[];
  predictiveDistribution: HiddenStateEvidenceMaskDistribution;
  evidenceProbability: number;
  prefixLogLikelihood: number | null;
  filteredDistribution: HiddenStateEvidenceMaskDistribution | null;
};

export type HiddenStateEvidenceMaskSmoothingStep = {
  step: number;
  observation: string;
  allowedStateIds: StateId[];
  smoothedDistribution: HiddenStateEvidenceMaskDistribution;
};

export type HiddenStateEvidenceMaskPairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type HiddenStateEvidenceMaskPairwiseStep = {
  step: number;
  fromObservation: string;
  toObservation: string;
  pairwiseDistribution: HiddenStateEvidenceMaskPairwiseEntry[];
};

export type HiddenStateEvidenceMaskExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteHiddenStateEvidenceMaskConditioningDiagnostics = {
  method: 'log_domain_forward_backward_binary_state_evidence_mask_conditioning';
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
  existingCandidateCHRRequestTypesModified: false;
  binaryStateEvidenceMasksUsed: true;
  softEvidenceUsed: false;
  coarsenedObservationEvidenceUsed: false;
  parameterLearningUsed: false;
  candidateVModified: false;
  candidateWModified: false;
  modelRewritten: false;
  causalInterventionUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  parameterPosteriorComputed: false;
  globalModelIdentificationClaimed: false;
};

export type EvidenceMaskConditioningFailureCode =
  | 'invalid_state_evidence_masks_container'
  | 'state_evidence_mask_length_mismatch'
  | 'invalid_state_evidence_mask_entry'
  | 'unknown_state_evidence_mask_state'
  | 'duplicate_state_evidence_mask_state'
  | 'invalid_candidate_x_tolerance'
  | 'masked_filtering_mass_conservation_violation'
  | 'masked_smoothing_mass_conservation_violation'
  | 'masked_pairwise_mass_conservation_violation'
  | 'masked_pairwise_marginal_consistency_violation'
  | 'masked_expected_transition_count_conservation_violation'
  | 'internal_mask_conditioning_structural_inconsistency'
  | 'non_finite_state_evidence_mask_conditioning_result';

export type EvidenceMaskConditioningFailure = {
  code: EvidenceMaskConditioningFailureCode;
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

export type FiniteHiddenStateEvidenceMaskConditioningFailure = {
  ok: false;
  failure: EvidenceMaskConditioningFailure;
};

export type FiniteHiddenStateEvidenceMaskConditioningSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  stateEvidenceMasks: StateId[][];
  filteringSteps: HiddenStateEvidenceMaskFilteringStep[];
  smoothingSteps: HiddenStateEvidenceMaskSmoothingStep[] | null;
  pairwiseSteps: HiddenStateEvidenceMaskPairwiseStep[] | null;
  expectedTransitionCounts: HiddenStateEvidenceMaskExpectedTransitionCount[] | null;
  logLikelihood: number | null;
  sequenceProbability: number | null;
  diagnostics: FiniteHiddenStateEvidenceMaskConditioningDiagnostics;
};

export type FiniteHiddenStateEvidenceMaskConditioningResult =
  | FiniteHiddenStateEvidenceMaskConditioningSuccess
  | FiniteHiddenStateEvidenceMaskConditioningFailure
  | FiniteHiddenStateObservationFailure;

type ResolvedCandidateXOptions = {
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
  code: EvidenceMaskConditioningFailureCode,
  message: string,
  details: Omit<EvidenceMaskConditioningFailure, 'code' | 'message'> = {}
): FiniteHiddenStateEvidenceMaskConditioningFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveCandidateXOptions(
  options: FiniteHiddenStateEvidenceMaskConditioningOptions,
  baseProbabilityTolerance: number,
  baseMaxObservations: number,
  transitionCount: number
): ResolvedCandidateXOptions | FiniteHiddenStateEvidenceMaskConditioningFailure {
  const pairwiseConsistencyTolerance =
    options.pairwiseConsistencyTolerance ?? baseProbabilityTolerance * 20;
  if (!Number.isFinite(pairwiseConsistencyTolerance) || pairwiseConsistencyTolerance <= 0) {
    return failure(
      'invalid_candidate_x_tolerance',
      'pairwiseConsistencyTolerance must be a finite positive number',
      { path: 'options.pairwiseConsistencyTolerance' }
    );
  }

  const expectedCountTolerance =
    options.expectedCountTolerance ?? pairwiseConsistencyTolerance * Math.max(1, transitionCount);
  if (!Number.isFinite(expectedCountTolerance) || expectedCountTolerance <= 0) {
    return failure(
      'invalid_candidate_x_tolerance',
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

function validateAndCanonicalizeMasks(
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  stateIds: StateId[]
): StateId[][] | FiniteHiddenStateEvidenceMaskConditioningFailure {
  if (!Array.isArray(request.stateEvidenceMasks)) {
    return failure(
      'invalid_state_evidence_masks_container',
      'stateEvidenceMasks must be an array',
      { path: 'request.stateEvidenceMasks' }
    );
  }
  if (request.stateEvidenceMasks.length !== request.observations.length) {
    return failure(
      'state_evidence_mask_length_mismatch',
      'stateEvidenceMasks length must equal observations length',
      {
        path: 'request.stateEvidenceMasks',
        actual: request.stateEvidenceMasks.length,
        expected: request.observations.length
      }
    );
  }

  const knownStates = new Set(stateIds);
  const canonical: StateId[][] = [];
  for (let step = 0; step < request.stateEvidenceMasks.length; step += 1) {
    const mask = request.stateEvidenceMasks[step];
    if (!Array.isArray(mask)) {
      return failure(
        'invalid_state_evidence_mask_entry',
        `stateEvidenceMasks[${step}] must be an array`,
        { path: `request.stateEvidenceMasks[${step}]`, step }
      );
    }
    const seen = new Set<StateId>();
    const current: StateId[] = [];
    for (let index = 0; index < mask.length; index += 1) {
      const stateId = mask[index];
      if (typeof stateId !== 'string') {
        return failure(
          'invalid_state_evidence_mask_entry',
          `stateEvidenceMasks[${step}][${index}] must be a state ID string`,
          { path: `request.stateEvidenceMasks[${step}][${index}]`, step }
        );
      }
      if (!knownStates.has(stateId)) {
        return failure(
          'unknown_state_evidence_mask_state',
          `Unknown state in stateEvidenceMasks[${step}]: ${stateId}`,
          { path: `request.stateEvidenceMasks[${step}][${index}]`, step, stateId }
        );
      }
      if (seen.has(stateId)) {
        return failure(
          'duplicate_state_evidence_mask_state',
          `Duplicate state in stateEvidenceMasks[${step}]: ${stateId}`,
          { path: `request.stateEvidenceMasks[${step}][${index}]`, step, stateId }
        );
      }
      seen.add(stateId);
      current.push(stateId);
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
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
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
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  stateIds: StateId[]
): Map<StateId, number> {
  const initial = new Map<StateId, number>();
  for (const stateId of stateIds) initial.set(stateId, 0);
  for (const entry of request.initialDistribution) initial.set(entry.stateId, entry.probability);
  return initial;
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
  for (const stateId of stateIds) total = logAdd(total, logMass.get(stateId) ?? Number.NEGATIVE_INFINITY);
  return total;
}

function denseDistribution(
  stateIds: StateId[],
  massByState: Map<StateId, number>
): HiddenStateEvidenceMaskDistribution {
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
): HiddenStateEvidenceMaskDistribution | FiniteHiddenStateEvidenceMaskConditioningFailure {
  if (!Number.isFinite(totalLogMass)) {
    return failure(
      kind === 'filtering'
        ? 'masked_filtering_mass_conservation_violation'
        : 'masked_smoothing_mass_conservation_violation',
      `Masked ${kind} mass is zero for evidence treated as possible`,
      { step, tolerance }
    );
  }

  const raw: HiddenStateEvidenceMaskDistribution = [];
  let total = 0;
  for (const stateId of stateIds) {
    const value = logMass.get(stateId) ?? Number.NEGATIVE_INFINITY;
    if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
      return failure(
        'non_finite_state_evidence_mask_conditioning_result',
        `Masked ${kind} log mass became invalid`,
        { step, stateId }
      );
    }
    const probability =
      value === Number.NEGATIVE_INFINITY ? 0 : Math.exp(value - totalLogMass);
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_state_evidence_mask_conditioning_result',
        `Masked ${kind} probability became invalid`,
        { step, stateId, actual: probability }
      );
    }
    raw.push({ stateId, probability });
    total += probability;
  }

  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure(
      kind === 'filtering'
        ? 'masked_filtering_mass_conservation_violation'
        : 'masked_smoothing_mass_conservation_violation',
      `Masked ${kind} probabilities do not sum to one`,
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
  filtered: HiddenStateEvidenceMaskDistribution,
  transitions: Map<StateId, TransitionEdge[]>
): Map<StateId, number> {
  const predictive = new Map<StateId, number>();
  for (const stateId of stateIds) predictive.set(stateId, 0);
  const filteredByState = new Map(filtered.map((entry) => [entry.stateId, entry.probability] as const));
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
): FiniteHiddenStateEvidenceMaskConditioningFailure | undefined {
  let total = 0;
  for (const stateId of stateIds) {
    const probability = predictive.get(stateId) ?? 0;
    if (!Number.isFinite(probability) || probability < 0) {
      return failure(
        'non_finite_state_evidence_mask_conditioning_result',
        'Masked predictive probability became invalid',
        { step, stateId, actual: probability }
      );
    }
    total += probability;
  }
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'masked_filtering_mass_conservation_violation',
      'Masked predictive probabilities do not sum to one',
      { step, actual: total, expected: 1, tolerance }
    );
  }
  return undefined;
}

function directProbabilityFromLog(logValue: number, tolerance: number): number {
  const probability = Math.exp(logValue);
  if (probability > 1 && probability <= 1 + tolerance) return 1;
  return probability;
}

function makeDiagnostics(
  resolved: ResolvedCandidateXOptions,
  requested: number,
  processed: number,
  underflowed: boolean,
  impossibleAtStep: number | null
): FiniteHiddenStateEvidenceMaskConditioningDiagnostics {
  return {
    method: 'log_domain_forward_backward_binary_state_evidence_mask_conditioning',
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
    existingCandidateCHRRequestTypesModified: false,
    binaryStateEvidenceMasksUsed: true,
    softEvidenceUsed: false,
    coarsenedObservationEvidenceUsed: false,
    parameterLearningUsed: false,
    candidateVModified: false,
    candidateWModified: false,
    modelRewritten: false,
    causalInterventionUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    parameterPosteriorComputed: false,
    globalModelIdentificationClaimed: false
  };
}

function buildBackwardMessages(
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  canonicalMasks: StateId[][],
  stateIds: StateId[],
  transitions: Map<StateId, TransitionEdge[]>,
  kernel: Map<StateId, Map<string, number>>
): Array<Map<StateId, number>> | FiniteHiddenStateEvidenceMaskConditioningFailure {
  const finalStep = request.observations.length - 1;
  const messages: Array<Map<StateId, number>> = new Array(request.observations.length);
  const final = new Map<StateId, number>();
  for (const stateId of stateIds) final.set(stateId, 0);
  messages[finalStep] = final;

  for (let step = finalStep - 1; step >= 0; step -= 1) {
    const nextObservation = request.observations[step + 1];
    const nextMask = canonicalMasks[step + 1];
    const nextMessage = messages[step + 1];
    if (nextObservation === undefined || nextMask === undefined || nextMessage === undefined) {
      return failure(
        'internal_mask_conditioning_structural_inconsistency',
        'Missing future observation, mask or backward message',
        { step: step + 1 }
      );
    }
    const allowed = new Set(nextMask);
    const current = new Map<StateId, number>();
    for (const fromStateId of stateIds) {
      let value = Number.NEGATIVE_INFINITY;
      for (const edge of transitions.get(fromStateId) ?? []) {
        if (!allowed.has(edge.to) || edge.probability === 0) continue;
        const emission = kernel.get(edge.to)?.get(nextObservation) ?? 0;
        const future = nextMessage.get(edge.to) ?? Number.NEGATIVE_INFINITY;
        if (emission === 0 || future === Number.NEGATIVE_INFINITY) continue;
        const term = logProbability(edge.probability) + logProbability(emission) + future;
        if (Number.isNaN(term) || term === Number.POSITIVE_INFINITY) {
          return failure(
            'non_finite_state_evidence_mask_conditioning_result',
            'Backward masked log message became invalid',
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

function zeroExpectedCounts(stateIds: StateId[]): HiddenStateEvidenceMaskExpectedTransitionCount[] {
  const counts: HiddenStateEvidenceMaskExpectedTransitionCount[] = [];
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) counts.push({ fromStateId, toStateId, expectedCount: 0 });
  }
  return counts;
}

function distributionMap(
  distribution: HiddenStateEvidenceMaskDistribution
): Map<StateId, number> {
  return new Map(distribution.map((entry) => [entry.stateId, entry.probability] as const));
}

export function conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
  model: DefinitionModel,
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  options: FiniteHiddenStateEvidenceMaskConditioningOptions = {}
): FiniteHiddenStateEvidenceMaskConditioningResult {
  const baseValidation = filterFiniteHiddenStateObservationSequence(model, request, options);
  if (!baseValidation.ok) return baseValidation;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const canonicalMasks = validateAndCanonicalizeMasks(request, stateIds);
  if (!Array.isArray(canonicalMasks)) return canonicalMasks;

  const transitionCount = Math.max(0, request.observations.length - 1);
  const resolved = resolveCandidateXOptions(
    options,
    baseValidation.diagnostics.probabilityTolerance,
    baseValidation.diagnostics.maxObservations,
    transitionCount
  );
  if ('ok' in resolved) return resolved;

  const transitions = buildTransitionRows(model, stateIds);
  const kernel = buildKernel(request, stateIds);
  const initial = buildInitialDistribution(request, stateIds);
  const forwardMessages: Array<Map<StateId, number>> = [];
  const filteringSteps: HiddenStateEvidenceMaskFilteringStep[] = [];
  let previousFiltered: HiddenStateEvidenceMaskDistribution | undefined;
  let previousLogEvidence = 0;

  for (let step = 0; step < request.observations.length; step += 1) {
    const observation = request.observations[step];
    const mask = canonicalMasks[step];
    if (observation === undefined || mask === undefined) {
      return failure(
        'internal_mask_conditioning_structural_inconsistency',
        'Missing observation or state-evidence mask after validation',
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

    const allowed = new Set(mask);
    const current = new Map<StateId, number>();
    for (const stateId of stateIds) {
      if (!allowed.has(stateId)) {
        current.set(stateId, Number.NEGATIVE_INFINITY);
        continue;
      }
      const emission = kernel.get(stateId)?.get(observation) ?? 0;
      if (emission === 0) {
        current.set(stateId, Number.NEGATIVE_INFINITY);
        continue;
      }

      if (step === 0) {
        const initialProbability = initial.get(stateId) ?? 0;
        current.set(
          stateId,
          initialProbability === 0
            ? Number.NEGATIVE_INFINITY
            : logProbability(initialProbability) + logProbability(emission)
        );
        continue;
      }

      const previous = forwardMessages[step - 1];
      if (previous === undefined) {
        return failure(
          'internal_mask_conditioning_structural_inconsistency',
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
          : incoming + logProbability(emission)
      );
    }

    const currentLogEvidence = logTotal(stateIds, current);
    if (currentLogEvidence === Number.NEGATIVE_INFINITY) {
      filteringSteps.push({
        step,
        observation,
        allowedStateIds: [...mask],
        predictiveDistribution: denseDistribution(stateIds, predictive),
        evidenceProbability: 0,
        prefixLogLikelihood: null,
        filteredDistribution: null
      });
      return {
        ok: true,
        possible: false,
        observations: [...request.observations],
        stateEvidenceMasks: canonicalMasks.map((entry) => [...entry]),
        filteringSteps,
        smoothingSteps: null,
        pairwiseSteps: null,
        expectedTransitionCounts: null,
        logLikelihood: null,
        sequenceProbability: 0,
        diagnostics: makeDiagnostics(
          resolved,
          request.observations.length,
          step + 1,
          false,
          step
        )
      };
    }
    if (!Number.isFinite(currentLogEvidence)) {
      return failure(
        'non_finite_state_evidence_mask_conditioning_result',
        'Masked prefix log likelihood became invalid',
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
    if (!Number.isFinite(evidenceProbability) || evidenceProbability < 0 || evidenceProbability > 1 + resolved.probabilityTolerance * 10) {
      return failure(
        'masked_filtering_mass_conservation_violation',
        'Masked step evidence probability became invalid',
        { step, actual: evidenceProbability, tolerance: resolved.probabilityTolerance * 10 }
      );
    }

    filteringSteps.push({
      step,
      observation,
      allowedStateIds: [...mask],
      predictiveDistribution: denseDistribution(stateIds, predictive),
      evidenceProbability: Math.min(1, evidenceProbability),
      prefixLogLikelihood: currentLogEvidence,
      filteredDistribution: filtered
    });
    forwardMessages.push(current);
    previousFiltered = filtered;
    previousLogEvidence = currentLogEvidence;
  }

  const completeLogEvidence = previousLogEvidence;
  const sequenceProbability = directProbabilityFromLog(
    completeLogEvidence,
    resolved.probabilityTolerance
  );
  if (!Number.isFinite(sequenceProbability) || sequenceProbability < 0 || sequenceProbability > 1 + resolved.probabilityTolerance * 10) {
    return failure(
      'masked_filtering_mass_conservation_violation',
      'Combined evidence probability became invalid',
      { actual: sequenceProbability, tolerance: resolved.probabilityTolerance * 10 }
    );
  }
  const underflowed = sequenceProbability === 0;

  const backwardMessages = buildBackwardMessages(
    request,
    canonicalMasks,
    stateIds,
    transitions,
    kernel
  );
  if (!Array.isArray(backwardMessages)) return backwardMessages;

  const smoothingSteps: HiddenStateEvidenceMaskSmoothingStep[] = [];
  for (let step = 0; step < request.observations.length; step += 1) {
    const forward = forwardMessages[step];
    const backward = backwardMessages[step];
    const observation = request.observations[step];
    const mask = canonicalMasks[step];
    if (forward === undefined || backward === undefined || observation === undefined || mask === undefined) {
      return failure(
        'internal_mask_conditioning_structural_inconsistency',
        'Missing state for masked smoothing',
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
      observation,
      allowedStateIds: [...mask],
      smoothedDistribution: smoothed
    });
  }

  const pairwiseSteps: HiddenStateEvidenceMaskPairwiseStep[] = [];
  const expectedTransitionCounts = zeroExpectedCounts(stateIds);
  const countByPair = new Map<string, number>();
  for (const entry of expectedTransitionCounts) {
    countByPair.set(`${entry.fromStateId}\u0000${entry.toStateId}`, 0);
  }

  for (let step = 0; step < transitionCount; step += 1) {
    const forward = forwardMessages[step];
    const backwardNext = backwardMessages[step + 1];
    const nextObservation = request.observations[step + 1];
    const nextMask = canonicalMasks[step + 1];
    const fromSmoothing = smoothingSteps[step]?.smoothedDistribution;
    const toSmoothing = smoothingSteps[step + 1]?.smoothedDistribution;
    if (
      forward === undefined ||
      backwardNext === undefined ||
      nextObservation === undefined ||
      nextMask === undefined ||
      fromSmoothing === undefined ||
      toSmoothing === undefined
    ) {
      return failure(
        'internal_mask_conditioning_structural_inconsistency',
        'Missing state for masked pairwise smoothing',
        { step }
      );
    }

    const allowedNext = new Set(nextMask);
    const raw: HiddenStateEvidenceMaskPairwiseEntry[] = [];
    let pairwiseTotal = 0;
    for (const fromStateId of stateIds) {
      const prefix = forward.get(fromStateId) ?? Number.NEGATIVE_INFINITY;
      for (const toStateId of stateIds) {
        const transition =
          transitions.get(fromStateId)?.find((edge) => edge.to === toStateId)?.probability ?? 0;
        const emission = kernel.get(toStateId)?.get(nextObservation) ?? 0;
        const future = backwardNext.get(toStateId) ?? Number.NEGATIVE_INFINITY;
        const logWeight =
          prefix === Number.NEGATIVE_INFINITY ||
          transition === 0 ||
          emission === 0 ||
          !allowedNext.has(toStateId) ||
          future === Number.NEGATIVE_INFINITY
            ? Number.NEGATIVE_INFINITY
            : prefix + logProbability(transition) + logProbability(emission) + future;
        if (Number.isNaN(logWeight) || logWeight === Number.POSITIVE_INFINITY) {
          return failure(
            'non_finite_state_evidence_mask_conditioning_result',
            'Masked pairwise log weight became invalid',
            { step, fromStateId, toStateId }
          );
        }
        const probability =
          logWeight === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logWeight - completeLogEvidence);
        if (!Number.isFinite(probability) || probability < 0) {
          return failure(
            'non_finite_state_evidence_mask_conditioning_result',
            'Masked pairwise posterior probability became invalid',
            { step, fromStateId, toStateId, actual: probability }
          );
        }
        raw.push({ fromStateId, toStateId, probability });
        pairwiseTotal += probability;
      }
    }

    if (!Number.isFinite(pairwiseTotal) || pairwiseTotal <= 0 || Math.abs(pairwiseTotal - 1) > resolved.pairwiseConsistencyTolerance) {
      return failure(
        'masked_pairwise_mass_conservation_violation',
        'Masked pairwise posterior probabilities do not sum to one',
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
          'masked_pairwise_marginal_consistency_violation',
          'Masked pairwise row marginal disagrees with Candidate X smoothing',
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
          'masked_pairwise_marginal_consistency_violation',
          'Masked pairwise column marginal disagrees with Candidate X smoothing',
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
      fromObservation: request.observations[step] ?? '',
      toObservation: nextObservation,
      pairwiseDistribution: pairwise
    });
  }

  for (const entry of expectedTransitionCounts) {
    entry.expectedCount = countByPair.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0;
    if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) {
      return failure(
        'non_finite_state_evidence_mask_conditioning_result',
        'Masked expected transition count became invalid',
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
      'masked_expected_transition_count_conservation_violation',
      'Masked expected transition counts do not sum to the number of transition indices',
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
    observations: [...request.observations],
    stateEvidenceMasks: canonicalMasks.map((entry) => [...entry]),
    filteringSteps,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    logLikelihood: completeLogEvidence,
    sequenceProbability: Math.min(1, sequenceProbability),
    diagnostics: makeDiagnostics(
      resolved,
      request.observations.length,
      request.observations.length,
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

export function finiteHiddenStateEvidenceMaskConditioningResultToJson(
  result: FiniteHiddenStateEvidenceMaskConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state evidence-mask conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
