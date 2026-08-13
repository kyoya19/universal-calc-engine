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
import {
  HiddenStateSmoothingDistribution,
  smoothFiniteHiddenStateObservationSequence
} from './hidden_state_smoothing';

export type FiniteHiddenStatePairwiseSmoothingRequest = FiniteHiddenStateObservationRequest;
export type FiniteHiddenStatePairwiseSmoothingOptions = FiniteHiddenStateObservationOptions;

export type HiddenStatePairwiseSmoothingEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type HiddenStatePairwiseSmoothingStep = {
  step: number;
  fromObservation: string;
  toObservation: string;
  pairwiseDistribution: HiddenStatePairwiseSmoothingEntry[] | null;
};

export type HiddenStateExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteHiddenStatePairwiseSmoothingDiagnostics = {
  method: 'scaled_forward_log_backward_pairwise_smoothing_known_observation_kernel';
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
  sequenceProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  candidateCFilteringReused: true;
  candidateHSmoothingConsistencyChecked: true;
  pairwiseTransitionSmoothingComputed: true;
  expectedTransitionCountsComputed: true;
  parameterLearningUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  parameterPosteriorComputed: false;
  globalModelIdentificationClaimed: false;
};

export type PairwiseSmoothingFailureCode =
  | 'pairwise_mass_conservation_violation'
  | 'pairwise_marginal_consistency_violation'
  | 'expected_transition_count_conservation_violation'
  | 'non_finite_analytical_result'
  | 'internal_structural_inconsistency';

export type PairwiseSmoothingFailure = {
  code: PairwiseSmoothingFailureCode;
  message: string;
  step?: number;
  fromStateId?: StateId;
  toStateId?: StateId;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteHiddenStatePairwiseSmoothingFailure = {
  ok: false;
  failure: PairwiseSmoothingFailure;
};

export type FiniteHiddenStatePairwiseSmoothingSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  steps: HiddenStatePairwiseSmoothingStep[];
  expectedTransitionCounts: HiddenStateExpectedTransitionCount[] | null;
  logLikelihood: number | null;
  sequenceProbability: number | null;
  diagnostics: FiniteHiddenStatePairwiseSmoothingDiagnostics;
};

export type FiniteHiddenStatePairwiseSmoothingResult =
  | FiniteHiddenStatePairwiseSmoothingSuccess
  | FiniteHiddenStateObservationFailure
  | FiniteHiddenStatePairwiseSmoothingFailure;

type TransitionEdge = {
  to: StateId;
  probability: number;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: PairwiseSmoothingFailureCode,
  message: string,
  details: Omit<PairwiseSmoothingFailure, 'code' | 'message'> = {}
): FiniteHiddenStatePairwiseSmoothingFailure {
  return { ok: false, failure: { code, message, ...details } };
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
  request: FiniteHiddenStatePairwiseSmoothingRequest,
  stateIds: StateId[]
): Map<StateId, Map<string, number>> {
  const kernel = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) kernel.set(stateId, new Map<string, number>());
  for (const entry of request.kernel) {
    kernel.get(entry.stateId)?.set(entry.symbol, entry.probability);
  }
  return kernel;
}

function transitionProbability(
  transitions: Map<StateId, TransitionEdge[]>,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return transitions.get(fromStateId)?.find((edge) => edge.to === toStateId)?.probability ?? 0;
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

function diagnosticsFromFiltering(
  filtering: Extract<ReturnType<typeof filterFiniteHiddenStateObservationSequence>, { ok: true }>,
  transitionCount: number
): FiniteHiddenStatePairwiseSmoothingDiagnostics {
  const pairwiseConsistencyTolerance = filtering.diagnostics.probabilityTolerance * 20;
  return {
    method: 'scaled_forward_log_backward_pairwise_smoothing_known_observation_kernel',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    timeConvention: 'emit_at_step_0_then_transition_and_emit',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: filtering.diagnostics.probabilityTolerance,
    pairwiseConsistencyTolerance,
    expectedCountTolerance: pairwiseConsistencyTolerance * Math.max(1, transitionCount),
    maxObservations: filtering.diagnostics.maxObservations,
    observationsRequested: filtering.diagnostics.observationsRequested,
    observationsProcessed: filtering.diagnostics.observationsProcessed,
    sequenceProbabilityUnderflowed: filtering.diagnostics.sequenceProbabilityUnderflowed,
    impossibleAtStep: filtering.diagnostics.impossibleAtStep,
    candidateCFilteringReused: true,
    candidateHSmoothingConsistencyChecked: true,
    pairwiseTransitionSmoothingComputed: true,
    expectedTransitionCountsComputed: true,
    parameterLearningUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    parameterPosteriorComputed: false,
    globalModelIdentificationClaimed: false
  };
}

function buildLogBackwardMessages(
  request: FiniteHiddenStatePairwiseSmoothingRequest,
  stateIds: StateId[],
  transitions: Map<StateId, TransitionEdge[]>,
  kernel: Map<StateId, Map<string, number>>
): Array<Map<StateId, number>> | FiniteHiddenStatePairwiseSmoothingFailure {
  const finalStep = request.observations.length - 1;
  const messages: Array<Map<StateId, number>> = new Array(request.observations.length);
  const final = new Map<StateId, number>();
  for (const stateId of stateIds) final.set(stateId, 0);
  messages[finalStep] = final;

  for (let step = finalStep - 1; step >= 0; step -= 1) {
    const nextObservation = request.observations[step + 1];
    const next = messages[step + 1];
    if (nextObservation === undefined || next === undefined) {
      return failure('internal_structural_inconsistency', 'Missing future observation or backward message', {
        step: step + 1
      });
    }

    const current = new Map<StateId, number>();
    for (const fromStateId of stateIds) {
      let logValue = Number.NEGATIVE_INFINITY;
      for (const edge of transitions.get(fromStateId) ?? []) {
        if (edge.probability === 0) continue;
        const emissionProbability = kernel.get(edge.to)?.get(nextObservation) ?? 0;
        if (emissionProbability === 0) continue;
        const future = next.get(edge.to) ?? Number.NEGATIVE_INFINITY;
        if (future === Number.NEGATIVE_INFINITY) continue;
        const term = logProbability(edge.probability) + logProbability(emissionProbability) + future;
        if (!Number.isFinite(term)) {
          return failure('non_finite_analytical_result', 'Backward pairwise log message became non-finite', {
            step,
            fromStateId,
            toStateId: edge.to
          });
        }
        logValue = logAdd(logValue, term);
      }
      current.set(fromStateId, logValue);
    }
    messages[step] = current;
  }

  return messages;
}

function normalizePairwiseLogWeights(
  stateIds: StateId[],
  logWeights: Map<StateId, Map<StateId, number>>,
  step: number,
  tolerance: number
): HiddenStatePairwiseSmoothingEntry[] | FiniteHiddenStatePairwiseSmoothingFailure {
  let logTotal = Number.NEGATIVE_INFINITY;
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) {
      const value = logWeights.get(fromStateId)?.get(toStateId) ?? Number.NEGATIVE_INFINITY;
      if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
        return failure('non_finite_analytical_result', 'Pairwise hidden-state log weight became invalid', {
          step,
          fromStateId,
          toStateId
        });
      }
      logTotal = logAdd(logTotal, value);
    }
  }

  if (!Number.isFinite(logTotal)) {
    return failure('pairwise_mass_conservation_violation', 'Pairwise mass is zero for a mathematically possible sequence', {
      step,
      tolerance
    });
  }

  const raw: HiddenStatePairwiseSmoothingEntry[] = [];
  let total = 0;
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) {
      const logWeight = logWeights.get(fromStateId)?.get(toStateId) ?? Number.NEGATIVE_INFINITY;
      const probability = logWeight === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logWeight - logTotal);
      if (!Number.isFinite(probability) || probability < 0) {
        return failure('non_finite_analytical_result', 'Pairwise posterior probability became invalid', {
          step,
          fromStateId,
          toStateId,
          actual: probability
        });
      }
      raw.push({ fromStateId, toStateId, probability });
      total += probability;
    }
  }

  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure('pairwise_mass_conservation_violation', 'Pairwise posterior probabilities do not sum to one', {
      step,
      actual: total,
      expected: 1,
      tolerance
    });
  }

  return raw.map((entry) => ({
    fromStateId: entry.fromStateId,
    toStateId: entry.toStateId,
    probability: entry.probability / total
  }));
}

function distributionByState(
  distribution: HiddenStateSmoothingDistribution
): Map<StateId, number> {
  return new Map(distribution.map((entry) => [entry.stateId, entry.probability] as const));
}

function verifyMarginals(
  stateIds: StateId[],
  pairwise: HiddenStatePairwiseSmoothingEntry[],
  fromSmoothed: HiddenStateSmoothingDistribution,
  toSmoothed: HiddenStateSmoothingDistribution,
  step: number,
  tolerance: number
): FiniteHiddenStatePairwiseSmoothingFailure | undefined {
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

  const expectedFrom = distributionByState(fromSmoothed);
  const expectedTo = distributionByState(toSmoothed);
  for (const stateId of stateIds) {
    const actualRow = row.get(stateId) ?? 0;
    const expectedRow = expectedFrom.get(stateId) ?? 0;
    if (Math.abs(actualRow - expectedRow) > tolerance) {
      return failure('pairwise_marginal_consistency_violation', 'Pairwise row marginal disagrees with Candidate H smoothing', {
        step,
        fromStateId: stateId,
        actual: actualRow,
        expected: expectedRow,
        tolerance
      });
    }
    const actualColumn = column.get(stateId) ?? 0;
    const expectedColumn = expectedTo.get(stateId) ?? 0;
    if (Math.abs(actualColumn - expectedColumn) > tolerance) {
      return failure('pairwise_marginal_consistency_violation', 'Pairwise column marginal disagrees with Candidate H smoothing', {
        step,
        toStateId: stateId,
        actual: actualColumn,
        expected: expectedColumn,
        tolerance
      });
    }
  }
  return undefined;
}

function zeroExpectedCounts(stateIds: StateId[]): HiddenStateExpectedTransitionCount[] {
  const counts: HiddenStateExpectedTransitionCount[] = [];
  for (const fromStateId of stateIds) {
    for (const toStateId of stateIds) {
      counts.push({ fromStateId, toStateId, expectedCount: 0 });
    }
  }
  return counts;
}

export function smoothFiniteHiddenStatePairwiseTransitions(
  model: DefinitionModel,
  request: FiniteHiddenStatePairwiseSmoothingRequest,
  options: FiniteHiddenStatePairwiseSmoothingOptions = {}
): FiniteHiddenStatePairwiseSmoothingResult {
  const filtering = filterFiniteHiddenStateObservationSequence(model, request, options);
  if (!filtering.ok) return filtering;

  const transitionCount = Math.max(0, request.observations.length - 1);
  const diagnostics = diagnosticsFromFiltering(filtering, transitionCount);
  const smoothing = smoothFiniteHiddenStateObservationSequence(model, request, options);
  if (!smoothing.ok) return smoothing;
  if (smoothing.possible !== filtering.possible) {
    return failure('internal_structural_inconsistency', 'Candidate C and Candidate H disagree on observation-sequence possibility');
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  if (!filtering.possible) {
    return {
      ok: true,
      possible: false,
      observations: [...request.observations],
      steps: Array.from({ length: transitionCount }, (_, step) => ({
        step,
        fromObservation: request.observations[step] ?? '',
        toObservation: request.observations[step + 1] ?? '',
        pairwiseDistribution: null
      })),
      expectedTransitionCounts: null,
      logLikelihood: null,
      sequenceProbability: filtering.sequenceProbability,
      diagnostics
    };
  }

  if (!smoothing.possible) {
    return failure('internal_structural_inconsistency', 'Candidate H unexpectedly marked a possible Candidate C sequence impossible');
  }

  const transitions = buildTransitionRows(model, stateIds);
  const kernel = buildKernel(request, stateIds);
  const backwardMessages = buildLogBackwardMessages(request, stateIds, transitions, kernel);
  if (!Array.isArray(backwardMessages)) return backwardMessages;

  const steps: HiddenStatePairwiseSmoothingStep[] = [];
  const expectedTransitionCounts = zeroExpectedCounts(stateIds);
  const countByPair = new Map<string, number>();
  for (const count of expectedTransitionCounts) {
    countByPair.set(`${count.fromStateId}\u0000${count.toStateId}`, 0);
  }

  for (let step = 0; step < transitionCount; step += 1) {
    const filteringStep = filtering.steps[step];
    const nextObservation = request.observations[step + 1];
    const betaNext = backwardMessages[step + 1];
    const smoothingFrom = smoothing.steps[step]?.smoothedDistribution;
    const smoothingTo = smoothing.steps[step + 1]?.smoothedDistribution;
    if (
      filteringStep === undefined ||
      filteringStep.filteredDistribution === null ||
      nextObservation === undefined ||
      betaNext === undefined ||
      smoothingFrom === undefined || smoothingFrom === null ||
      smoothingTo === undefined || smoothingTo === null
    ) {
      return failure('internal_structural_inconsistency', 'Missing filtering, smoothing or backward state for pairwise step', { step });
    }

    const filteredByState = new Map(
      filteringStep.filteredDistribution.map((entry) => [entry.stateId, entry.probability] as const)
    );
    const logWeights = new Map<StateId, Map<StateId, number>>();
    for (const fromStateId of stateIds) {
      const row = new Map<StateId, number>();
      const filteredProbability = filteredByState.get(fromStateId) ?? 0;
      for (const toStateId of stateIds) {
        const transition = transitionProbability(transitions, fromStateId, toStateId);
        const emission = kernel.get(toStateId)?.get(nextObservation) ?? 0;
        const future = betaNext.get(toStateId) ?? Number.NEGATIVE_INFINITY;
        const logWeight =
          filteredProbability === 0 || transition === 0 || emission === 0 || future === Number.NEGATIVE_INFINITY
            ? Number.NEGATIVE_INFINITY
            : Math.log(filteredProbability) + Math.log(transition) + Math.log(emission) + future;
        if (Number.isNaN(logWeight) || logWeight === Number.POSITIVE_INFINITY) {
          return failure('non_finite_analytical_result', 'Pairwise log weight became invalid', {
            step,
            fromStateId,
            toStateId
          });
        }
        row.set(toStateId, logWeight);
      }
      logWeights.set(fromStateId, row);
    }

    const pairwise = normalizePairwiseLogWeights(
      stateIds,
      logWeights,
      step,
      diagnostics.pairwiseConsistencyTolerance
    );
    if (!Array.isArray(pairwise)) return pairwise;

    const marginalFailure = verifyMarginals(
      stateIds,
      pairwise,
      smoothingFrom,
      smoothingTo,
      step,
      diagnostics.pairwiseConsistencyTolerance
    );
    if (marginalFailure !== undefined) return marginalFailure;

    for (const entry of pairwise) {
      const key = `${entry.fromStateId}\u0000${entry.toStateId}`;
      countByPair.set(key, (countByPair.get(key) ?? 0) + entry.probability);
    }

    steps.push({
      step,
      fromObservation: filteringStep.observation,
      toObservation: nextObservation,
      pairwiseDistribution: pairwise
    });
  }

  for (const count of expectedTransitionCounts) {
    count.expectedCount = countByPair.get(`${count.fromStateId}\u0000${count.toStateId}`) ?? 0;
    if (!Number.isFinite(count.expectedCount) || count.expectedCount < 0) {
      return failure('non_finite_analytical_result', 'Expected transition count became invalid', {
        fromStateId: count.fromStateId,
        toStateId: count.toStateId,
        actual: count.expectedCount
      });
    }
  }

  const expectedCountTotal = expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  if (Math.abs(expectedCountTotal - transitionCount) > diagnostics.expectedCountTolerance) {
    return failure('expected_transition_count_conservation_violation', 'Expected transition counts do not sum to the number of transition indices', {
      actual: expectedCountTotal,
      expected: transitionCount,
      tolerance: diagnostics.expectedCountTolerance
    });
  }

  return {
    ok: true,
    possible: true,
    observations: [...request.observations],
    steps,
    expectedTransitionCounts,
    logLikelihood: filtering.logLikelihood,
    sequenceProbability: filtering.sequenceProbability,
    diagnostics
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

export function finiteHiddenStatePairwiseSmoothingResultToJson(
  result: FiniteHiddenStatePairwiseSmoothingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state pairwise smoothing result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
