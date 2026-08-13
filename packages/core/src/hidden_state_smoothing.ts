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

export type FiniteHiddenStateSmoothingRequest = FiniteHiddenStateObservationRequest;
export type FiniteHiddenStateSmoothingOptions = FiniteHiddenStateObservationOptions;

export type HiddenStateSmoothingDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type HiddenStateSmoothingStep = {
  step: number;
  observation: string;
  smoothedDistribution: HiddenStateSmoothingDistribution | null;
};

export type FiniteHiddenStateSmoothingDiagnostics = {
  method: 'scaled_forward_log_backward_smoothing_known_observation_kernel';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  posteriorNormalizationApplied: true;
  timeConvention: 'emit_at_step_0_then_transition_and_emit';
  terminalSemantics: 'implicit_self_retention';
  probabilityTolerance: number;
  maxObservations: number;
  observationsRequested: number;
  observationsProcessed: number;
  sequenceProbabilityUnderflowed: boolean;
  impossibleAtStep: number | null;
  candidateCFilteringReused: true;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  pairwiseTransitionSmoothingComputed: false;
  parameterPosteriorComputed: false;
  globalModelIdentificationClaimed: false;
};

export type FiniteHiddenStateSmoothingSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  steps: HiddenStateSmoothingStep[];
  finalSmoothedDistribution: HiddenStateSmoothingDistribution | null;
  logLikelihood: number | null;
  sequenceProbability: number | null;
  diagnostics: FiniteHiddenStateSmoothingDiagnostics;
};

export type FiniteHiddenStateSmoothingResult =
  | FiniteHiddenStateSmoothingSuccess
  | FiniteHiddenStateObservationFailure;

type TransitionEdge = {
  to: StateId;
  probability: number;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: 'mass_conservation_violation' | 'non_finite_analytical_result',
  message: string,
  details: Omit<FiniteHiddenStateObservationFailure['failure'], 'code' | 'message'> = {}
): FiniteHiddenStateObservationFailure {
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
  request: FiniteHiddenStateSmoothingRequest,
  stateIds: StateId[]
): Map<StateId, Map<string, number>> {
  const kernel = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) kernel.set(stateId, new Map<string, number>());
  for (const entry of request.kernel) {
    kernel.get(entry.stateId)?.set(entry.symbol, entry.probability);
  }
  return kernel;
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
  filtering: Extract<ReturnType<typeof filterFiniteHiddenStateObservationSequence>, { ok: true }>
): FiniteHiddenStateSmoothingDiagnostics {
  return {
    method: 'scaled_forward_log_backward_smoothing_known_observation_kernel',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    timeConvention: 'emit_at_step_0_then_transition_and_emit',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: filtering.diagnostics.probabilityTolerance,
    maxObservations: filtering.diagnostics.maxObservations,
    observationsRequested: filtering.diagnostics.observationsRequested,
    observationsProcessed: filtering.diagnostics.observationsProcessed,
    sequenceProbabilityUnderflowed: filtering.diagnostics.sequenceProbabilityUnderflowed,
    impossibleAtStep: filtering.diagnostics.impossibleAtStep,
    candidateCFilteringReused: true,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    pairwiseTransitionSmoothingComputed: false,
    parameterPosteriorComputed: false,
    globalModelIdentificationClaimed: false
  };
}

function normalizeLogWeights(
  stateIds: StateId[],
  logWeightByState: Map<StateId, number>,
  step: number,
  tolerance: number
): HiddenStateSmoothingDistribution | FiniteHiddenStateObservationFailure {
  let logTotal = Number.NEGATIVE_INFINITY;
  for (const stateId of stateIds) {
    const value = logWeightByState.get(stateId) ?? Number.NEGATIVE_INFINITY;
    if (Number.isNaN(value) || value === Number.POSITIVE_INFINITY) {
      return failure(
        'non_finite_analytical_result',
        `Smoothed hidden-state log weight became invalid at step ${step}`,
        { stateId, step }
      );
    }
    logTotal = logAdd(logTotal, value);
  }
  if (!Number.isFinite(logTotal)) {
    return failure(
      'mass_conservation_violation',
      `Smoothed hidden-state mass is zero at step ${step} for a mathematically possible sequence`,
      { step, tolerance }
    );
  }

  const raw = stateIds.map((stateId) => {
    const logWeight = logWeightByState.get(stateId) ?? Number.NEGATIVE_INFINITY;
    const probability = logWeight === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logWeight - logTotal);
    return { stateId, probability };
  });
  let total = 0;
  for (const entry of raw) {
    if (!Number.isFinite(entry.probability) || entry.probability < 0) {
      return failure(
        'non_finite_analytical_result',
        `Smoothed hidden-state probability became invalid at step ${step}`,
        { stateId: entry.stateId, step }
      );
    }
    total += entry.probability;
  }
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance * 10) {
    return failure(
      'mass_conservation_violation',
      `Smoothed hidden-state probabilities sum to ${String(total)} at step ${step}`,
      { step, actualTotal: total, tolerance }
    );
  }

  return raw.map((entry) => ({
    stateId: entry.stateId,
    probability: entry.probability / total
  }));
}

export function smoothFiniteHiddenStateObservationSequence(
  model: DefinitionModel,
  request: FiniteHiddenStateSmoothingRequest,
  options: FiniteHiddenStateSmoothingOptions = {}
): FiniteHiddenStateSmoothingResult {
  const filtering = filterFiniteHiddenStateObservationSequence(model, request, options);
  if (!filtering.ok) return filtering;

  const diagnostics = diagnosticsFromFiltering(filtering);
  if (!filtering.possible) {
    return {
      ok: true,
      possible: false,
      observations: [...request.observations],
      steps: request.observations.map((observation, step) => ({
        step,
        observation,
        smoothedDistribution: null
      })),
      finalSmoothedDistribution: null,
      logLikelihood: null,
      sequenceProbability: filtering.sequenceProbability,
      diagnostics
    };
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const transitions = buildTransitionRows(model, stateIds);
  const kernel = buildKernel(request, stateIds);
  const finalStep = request.observations.length - 1;
  const logBetaByStep: Array<Map<StateId, number>> = new Array(request.observations.length);

  const finalBeta = new Map<StateId, number>();
  for (const stateId of stateIds) finalBeta.set(stateId, 0);
  logBetaByStep[finalStep] = finalBeta;

  for (let step = finalStep - 1; step >= 0; step -= 1) {
    const nextObservation = request.observations[step + 1];
    if (nextObservation === undefined) {
      return failure('non_finite_analytical_result', `Missing future observation at step ${step + 1}`, {
        step: step + 1
      });
    }
    const nextBeta = logBetaByStep[step + 1];
    if (nextBeta === undefined) {
      return failure('non_finite_analytical_result', `Missing backward message at step ${step + 1}`, {
        step: step + 1
      });
    }
    const current = new Map<StateId, number>();
    for (const stateId of stateIds) {
      let logValue = Number.NEGATIVE_INFINITY;
      for (const edge of transitions.get(stateId) ?? []) {
        if (edge.probability === 0) continue;
        const emissionProbability = kernel.get(edge.to)?.get(nextObservation) ?? 0;
        if (emissionProbability === 0) continue;
        const future = nextBeta.get(edge.to) ?? Number.NEGATIVE_INFINITY;
        if (future === Number.NEGATIVE_INFINITY) continue;
        const term = logProbability(edge.probability) + logProbability(emissionProbability) + future;
        if (!Number.isFinite(term)) {
          return failure(
            'non_finite_analytical_result',
            `Backward hidden-state log message became non-finite at step ${step}`,
            { stateId, symbol: nextObservation, step }
          );
        }
        logValue = logAdd(logValue, term);
      }
      current.set(stateId, logValue);
    }
    logBetaByStep[step] = current;
  }

  const steps: HiddenStateSmoothingStep[] = [];
  for (let step = 0; step <= finalStep; step += 1) {
    const filteringStep = filtering.steps[step];
    const beta = logBetaByStep[step];
    if (filteringStep === undefined || filteringStep.filteredDistribution === null || beta === undefined) {
      return failure('non_finite_analytical_result', `Missing finite filtering/backward state at step ${step}`, {
        step
      });
    }
    const filteredByState = new Map(
      filteringStep.filteredDistribution.map((entry) => [entry.stateId, entry.probability] as const)
    );
    const logWeights = new Map<StateId, number>();
    for (const stateId of stateIds) {
      const alpha = filteredByState.get(stateId) ?? 0;
      const backward = beta.get(stateId) ?? Number.NEGATIVE_INFINITY;
      const logWeight = alpha === 0 || backward === Number.NEGATIVE_INFINITY
        ? Number.NEGATIVE_INFINITY
        : Math.log(alpha) + backward;
      if (Number.isNaN(logWeight) || logWeight === Number.POSITIVE_INFINITY) {
        return failure('non_finite_analytical_result', `Smoothed log weight became invalid at step ${step}`, {
          stateId,
          step
        });
      }
      logWeights.set(stateId, logWeight);
    }
    const smoothed = normalizeLogWeights(
      stateIds,
      logWeights,
      step,
      filtering.diagnostics.probabilityTolerance
    );
    if ('ok' in smoothed && smoothed.ok === false) return smoothed;
    steps.push({
      step,
      observation: filteringStep.observation,
      smoothedDistribution: smoothed
    });
  }

  const finalSmoothedDistribution = steps[finalStep]?.smoothedDistribution ?? null;
  if (finalSmoothedDistribution === null) {
    return failure('non_finite_analytical_result', 'Final smoothed distribution is missing', {
      step: finalStep
    });
  }

  return {
    ok: true,
    possible: true,
    observations: [...request.observations],
    steps,
    finalSmoothedDistribution,
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

export function finiteHiddenStateSmoothingResultToJson(
  result: FiniteHiddenStateSmoothingResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state smoothing result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
