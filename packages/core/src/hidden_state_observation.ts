import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type HiddenObservationKernelEntry = {
  stateId: StateId;
  symbol: string;
  probability: number;
};

export type FiniteHiddenStateObservationRequest = {
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  alphabet: string[];
  kernel: HiddenObservationKernelEntry[];
  observations: string[];
};

export type FiniteHiddenStateObservationOptions = {
  probabilityTolerance?: number;
  maxObservations?: number;
};

export type HiddenStateObservationFailureCode =
  | 'invalid_options'
  | 'invalid_model'
  | 'invalid_initial_distribution'
  | 'unknown_initial_state'
  | 'duplicate_initial_state'
  | 'invalid_initial_probability'
  | 'initial_probability_total'
  | 'invalid_alphabet'
  | 'duplicate_observation_symbol'
  | 'invalid_kernel'
  | 'unknown_kernel_state'
  | 'unknown_kernel_symbol'
  | 'duplicate_kernel_entry'
  | 'invalid_kernel_probability'
  | 'kernel_row_total'
  | 'invalid_observation_sequence'
  | 'unknown_observation_symbol'
  | 'observation_sequence_exceeds_limit'
  | 'mass_conservation_violation'
  | 'non_finite_analytical_result';

export type HiddenStateObservationFailure = {
  code: HiddenStateObservationFailureCode;
  message: string;
  path?: string;
  stateId?: StateId;
  symbol?: string;
  step?: number;
  actualTotal?: number;
  tolerance?: number;
};

type HiddenStateDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type HiddenStateObservationStep = {
  step: number;
  observation: string;
  predictiveDistribution: HiddenStateDistribution;
  evidenceProbability: number;
  filteredDistribution: HiddenStateDistribution | null;
};

export type FiniteHiddenStateObservationDiagnostics = {
  method: 'scaled_forward_filtering_known_observation_kernel';
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
  globalModelIdentificationClaimed: false;
  parameterPosteriorComputed: false;
};

export type FiniteHiddenStateObservationSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  steps: HiddenStateObservationStep[];
  finalFilteredDistribution: HiddenStateDistribution | null;
  logLikelihood: number | null;
  sequenceProbability: number | null;
  diagnostics: FiniteHiddenStateObservationDiagnostics;
};

export type FiniteHiddenStateObservationFailure = {
  ok: false;
  failure: HiddenStateObservationFailure;
  validation?: ModelValidationResult;
};

export type FiniteHiddenStateObservationResult =
  | FiniteHiddenStateObservationSuccess
  | FiniteHiddenStateObservationFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_MAX_OBSERVATIONS = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
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
  code: HiddenStateObservationFailureCode,
  message: string,
  details: Omit<HiddenStateObservationFailure, 'code' | 'message'> = {}
): FiniteHiddenStateObservationFailure {
  return {
    ok: false,
    failure: { code, message, ...details }
  };
}

function resolveOptions(
  options: FiniteHiddenStateObservationOptions
): ResolvedOptions | FiniteHiddenStateObservationFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure(
      'invalid_options',
      'probabilityTolerance must be a finite positive number',
      { path: 'options.probabilityTolerance' }
    );
  }

  const maxObservations = options.maxObservations ?? DEFAULT_MAX_OBSERVATIONS;
  if (!Number.isInteger(maxObservations) || maxObservations < 1) {
    return failure(
      'invalid_options',
      'maxObservations must be a positive integer',
      { path: 'options.maxObservations' }
    );
  }

  return { probabilityTolerance, maxObservations };
}

function isFailureResult(
  value: ResolvedOptions | Map<StateId, number> | Set<string> | Map<StateId, Map<string, number>> | FiniteHiddenStateObservationFailure
): value is FiniteHiddenStateObservationFailure {
  return 'ok' in value && value.ok === false;
}

function toDenseDistribution(
  stateIds: StateId[],
  massByState: Map<StateId, number>
): HiddenStateDistribution {
  return stateIds.map((stateId) => ({
    stateId,
    probability: massByState.get(stateId) ?? 0
  }));
}

function validateInitialDistribution(
  request: FiniteHiddenStateObservationRequest,
  stateIds: StateId[],
  tolerance: number
): Map<StateId, number> | FiniteHiddenStateObservationFailure {
  if (!Array.isArray(request.initialDistribution)) {
    return failure(
      'invalid_initial_distribution',
      'initialDistribution must be an array',
      { path: 'request.initialDistribution' }
    );
  }

  const knownStates = new Set(stateIds);
  const seen = new Set<StateId>();
  const massByState = new Map<StateId, number>();
  for (const stateId of stateIds) massByState.set(stateId, 0);

  let total = 0;
  for (let index = 0; index < request.initialDistribution.length; index += 1) {
    const entry = request.initialDistribution[index];
    if (entry === undefined || typeof entry.stateId !== 'string') {
      return failure(
        'invalid_initial_distribution',
        `initialDistribution[${index}].stateId must be a string`,
        { path: `request.initialDistribution[${index}].stateId` }
      );
    }
    if (!knownStates.has(entry.stateId)) {
      return failure(
        'unknown_initial_state',
        `Unknown state in initialDistribution: ${entry.stateId}`,
        { path: `request.initialDistribution[${index}].stateId`, stateId: entry.stateId }
      );
    }
    if (seen.has(entry.stateId)) {
      return failure(
        'duplicate_initial_state',
        `Duplicate state in initialDistribution: ${entry.stateId}`,
        { path: `request.initialDistribution[${index}].stateId`, stateId: entry.stateId }
      );
    }
    seen.add(entry.stateId);

    const probability = entry.probability;
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      return failure(
        'invalid_initial_probability',
        `Initial probability must be a finite number from 0 to 1: ${String(probability)}`,
        { path: `request.initialDistribution[${index}].probability`, stateId: entry.stateId }
      );
    }
    massByState.set(entry.stateId, probability);
    total += probability;
  }

  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'initial_probability_total',
      `Initial probabilities sum to ${String(total)}, outside tolerance ${tolerance}`,
      { path: 'request.initialDistribution', actualTotal: total, tolerance }
    );
  }

  return massByState;
}

function validateAlphabet(
  request: FiniteHiddenStateObservationRequest
): Set<string> | FiniteHiddenStateObservationFailure {
  if (!Array.isArray(request.alphabet) || request.alphabet.length === 0) {
    return failure(
      'invalid_alphabet',
      'alphabet must be a non-empty array',
      { path: 'request.alphabet' }
    );
  }

  const symbols = new Set<string>();
  for (let index = 0; index < request.alphabet.length; index += 1) {
    const symbol = request.alphabet[index];
    if (typeof symbol !== 'string' || symbol.trim().length === 0) {
      return failure(
        'invalid_alphabet',
        `alphabet[${index}] must be a non-empty string`,
        { path: `request.alphabet[${index}]` }
      );
    }
    if (symbols.has(symbol)) {
      return failure(
        'duplicate_observation_symbol',
        `Duplicate observation symbol: ${symbol}`,
        { path: `request.alphabet[${index}]`, symbol }
      );
    }
    symbols.add(symbol);
  }
  return symbols;
}

function validateKernel(
  request: FiniteHiddenStateObservationRequest,
  stateIds: StateId[],
  symbols: Set<string>,
  tolerance: number
): Map<StateId, Map<string, number>> | FiniteHiddenStateObservationFailure {
  if (!Array.isArray(request.kernel)) {
    return failure('invalid_kernel', 'kernel must be an array', { path: 'request.kernel' });
  }

  const knownStates = new Set(stateIds);
  const byState = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) byState.set(stateId, new Map<string, number>());
  const seen = new Set<string>();

  for (let index = 0; index < request.kernel.length; index += 1) {
    const entry = request.kernel[index];
    if (
      entry === undefined ||
      typeof entry.stateId !== 'string' ||
      typeof entry.symbol !== 'string'
    ) {
      return failure(
        'invalid_kernel',
        `kernel[${index}] requires string stateId and symbol`,
        { path: `request.kernel[${index}]` }
      );
    }
    if (!knownStates.has(entry.stateId)) {
      return failure(
        'unknown_kernel_state',
        `Unknown kernel state: ${entry.stateId}`,
        { path: `request.kernel[${index}].stateId`, stateId: entry.stateId }
      );
    }
    if (!symbols.has(entry.symbol)) {
      return failure(
        'unknown_kernel_symbol',
        `Unknown kernel symbol: ${entry.symbol}`,
        { path: `request.kernel[${index}].symbol`, symbol: entry.symbol }
      );
    }

    const key = JSON.stringify([entry.stateId, entry.symbol]);
    if (seen.has(key)) {
      return failure(
        'duplicate_kernel_entry',
        `Duplicate kernel entry for ${entry.stateId} / ${entry.symbol}`,
        {
          path: `request.kernel[${index}]`,
          stateId: entry.stateId,
          symbol: entry.symbol
        }
      );
    }
    seen.add(key);

    if (!Number.isFinite(entry.probability) || entry.probability < 0 || entry.probability > 1) {
      return failure(
        'invalid_kernel_probability',
        `Kernel probability must be a finite number from 0 to 1: ${String(entry.probability)}`,
        {
          path: `request.kernel[${index}].probability`,
          stateId: entry.stateId,
          symbol: entry.symbol
        }
      );
    }
    byState.get(entry.stateId)?.set(entry.symbol, entry.probability);
  }

  for (const stateId of stateIds) {
    const row = byState.get(stateId);
    let total = 0;
    for (const symbol of symbols) total += row?.get(symbol) ?? 0;
    if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
      return failure(
        'kernel_row_total',
        `Observation-kernel probabilities for state ${stateId} sum to ${String(total)}, outside tolerance ${tolerance}`,
        { path: 'request.kernel', stateId, actualTotal: total, tolerance }
      );
    }
  }

  return byState;
}

function validateObservationSequence(
  request: FiniteHiddenStateObservationRequest,
  symbols: Set<string>,
  maxObservations: number
): FiniteHiddenStateObservationFailure | undefined {
  if (!Array.isArray(request.observations) || request.observations.length === 0) {
    return failure(
      'invalid_observation_sequence',
      'observations must be a non-empty array',
      { path: 'request.observations' }
    );
  }
  if (request.observations.length > maxObservations) {
    return failure(
      'observation_sequence_exceeds_limit',
      `Observation sequence length ${request.observations.length} exceeds maxObservations ${maxObservations}`,
      { path: 'request.observations' }
    );
  }

  for (let index = 0; index < request.observations.length; index += 1) {
    const symbol = request.observations[index];
    if (typeof symbol !== 'string') {
      return failure(
        'invalid_observation_sequence',
        `observations[${index}] must be a string`,
        { path: `request.observations[${index}]`, step: index }
      );
    }
    if (!symbols.has(symbol)) {
      return failure(
        'unknown_observation_symbol',
        `Unknown observation symbol at step ${index}: ${symbol}`,
        { path: `request.observations[${index}]`, symbol, step: index }
      );
    }
  }
  return undefined;
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

function checkedDistribution(
  stateIds: StateId[],
  massByState: Map<StateId, number>,
  step: number,
  tolerance: number,
  label: string
): FiniteHiddenStateObservationFailure | undefined {
  let total = 0;
  for (const stateId of stateIds) {
    const probability = massByState.get(stateId) ?? 0;
    if (!Number.isFinite(probability)) {
      return failure(
        'non_finite_analytical_result',
        `${label} probability became non-finite at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step }
      );
    }
    if (probability < 0) {
      return failure(
        'mass_conservation_violation',
        `${label} probability became negative at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step, tolerance }
      );
    }
    total += probability;
  }

  if (!Number.isFinite(total)) {
    return failure(
      'non_finite_analytical_result',
      `${label} mass total became non-finite at step ${step}`,
      { step }
    );
  }
  if (Math.abs(total - 1) > tolerance) {
    return failure(
      'mass_conservation_violation',
      `${label} mass at step ${step} sums to ${String(total)}, outside tolerance ${tolerance}`,
      { step, actualTotal: total, tolerance }
    );
  }
  return undefined;
}

function predict(
  stateIds: StateId[],
  filtered: Map<StateId, number>,
  transitions: Map<StateId, TransitionEdge[]>
): Map<StateId, number> {
  const predicted = new Map<StateId, number>();
  for (const stateId of stateIds) predicted.set(stateId, 0);

  for (const from of stateIds) {
    const sourceMass = filtered.get(from) ?? 0;
    if (sourceMass === 0) continue;
    for (const edge of transitions.get(from) ?? []) {
      predicted.set(edge.to, (predicted.get(edge.to) ?? 0) + sourceMass * edge.probability);
    }
  }
  return predicted;
}

function successDiagnostics(
  options: ResolvedOptions,
  requested: number,
  processed: number,
  underflowed: boolean,
  impossibleAtStep: number | null
): FiniteHiddenStateObservationDiagnostics {
  return {
    method: 'scaled_forward_filtering_known_observation_kernel',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    posteriorNormalizationApplied: true,
    timeConvention: 'emit_at_step_0_then_transition_and_emit',
    terminalSemantics: 'implicit_self_retention',
    probabilityTolerance: options.probabilityTolerance,
    maxObservations: options.maxObservations,
    observationsRequested: requested,
    observationsProcessed: processed,
    sequenceProbabilityUnderflowed: underflowed,
    impossibleAtStep,
    globalModelIdentificationClaimed: false,
    parameterPosteriorComputed: false
  };
}

export function filterFiniteHiddenStateObservationSequence(
  model: DefinitionModel,
  request: FiniteHiddenStateObservationRequest,
  options: FiniteHiddenStateObservationOptions = {}
): FiniteHiddenStateObservationResult {
  const resolved = resolveOptions(options);
  if (isFailureResult(resolved)) return resolved;

  const validation = validateDefinitionModel(model, resolved.probabilityTolerance);
  if (!validation.valid) {
    return {
      ok: false,
      failure: {
        code: 'invalid_model',
        message: 'DefinitionModel failed validation',
        path: 'model'
      },
      validation
    };
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const initial = validateInitialDistribution(request, stateIds, resolved.probabilityTolerance);
  if (isFailureResult(initial)) return initial;

  const alphabet = validateAlphabet(request);
  if (isFailureResult(alphabet)) return alphabet;

  const kernel = validateKernel(
    request,
    stateIds,
    alphabet,
    resolved.probabilityTolerance
  );
  if (isFailureResult(kernel)) return kernel;

  const invalidSequence = validateObservationSequence(request, alphabet, resolved.maxObservations);
  if (invalidSequence !== undefined) return invalidSequence;

  const transitions = buildTransitionRows(model, stateIds);
  let filtered = initial;
  let logLikelihood = 0;
  const steps: HiddenStateObservationStep[] = [];

  for (let step = 0; step < request.observations.length; step += 1) {
    const observation = request.observations[step];
    if (observation === undefined) {
      return failure(
        'invalid_observation_sequence',
        `Missing observation at step ${step}`,
        { path: `request.observations[${step}]`, step }
      );
    }

    const predictive = step === 0 ? new Map(filtered) : predict(stateIds, filtered, transitions);
    const invalidPredictive = checkedDistribution(
      stateIds,
      predictive,
      step,
      resolved.probabilityTolerance,
      'Predictive'
    );
    if (invalidPredictive !== undefined) return invalidPredictive;

    const weighted = new Map<StateId, number>();
    let evidenceProbability = 0;
    for (const stateId of stateIds) {
      const predictiveProbability = predictive.get(stateId) ?? 0;
      const emissionProbability = kernel.get(stateId)?.get(observation) ?? 0;
      const weightedProbability = predictiveProbability * emissionProbability;
      if (!Number.isFinite(weightedProbability)) {
        return failure(
          'non_finite_analytical_result',
          `Weighted hidden-state probability became non-finite at step ${step}`,
          { stateId, symbol: observation, step }
        );
      }
      weighted.set(stateId, weightedProbability);
      evidenceProbability += weightedProbability;
    }

    if (!Number.isFinite(evidenceProbability) || evidenceProbability < 0) {
      return failure(
        'non_finite_analytical_result',
        `Observation evidence became invalid at step ${step}: ${String(evidenceProbability)}`,
        { symbol: observation, step }
      );
    }
    if (evidenceProbability > 1 + resolved.probabilityTolerance) {
      return failure(
        'mass_conservation_violation',
        `Observation evidence exceeds 1 at step ${step}: ${String(evidenceProbability)}`,
        {
          symbol: observation,
          step,
          actualTotal: evidenceProbability,
          tolerance: resolved.probabilityTolerance
        }
      );
    }

    if (evidenceProbability === 0) {
      steps.push({
        step,
        observation,
        predictiveDistribution: toDenseDistribution(stateIds, predictive),
        evidenceProbability: 0,
        filteredDistribution: null
      });
      return {
        ok: true,
        possible: false,
        observations: [...request.observations],
        steps,
        finalFilteredDistribution: null,
        logLikelihood: null,
        sequenceProbability: 0,
        diagnostics: successDiagnostics(
          resolved,
          request.observations.length,
          step + 1,
          false,
          step
        )
      };
    }

    const posterior = new Map<StateId, number>();
    for (const stateId of stateIds) {
      const probability = (weighted.get(stateId) ?? 0) / evidenceProbability;
      if (!Number.isFinite(probability)) {
        return failure(
          'non_finite_analytical_result',
          `Filtered hidden-state probability became non-finite at step ${step}`,
          { stateId, symbol: observation, step }
        );
      }
      posterior.set(stateId, probability);
    }

    const invalidPosterior = checkedDistribution(
      stateIds,
      posterior,
      step,
      resolved.probabilityTolerance,
      'Filtered'
    );
    if (invalidPosterior !== undefined) return invalidPosterior;

    logLikelihood += Math.log(evidenceProbability);
    if (!Number.isFinite(logLikelihood)) {
      return failure(
        'non_finite_analytical_result',
        `Observation-sequence log likelihood became non-finite at step ${step}`,
        { symbol: observation, step }
      );
    }

    steps.push({
      step,
      observation,
      predictiveDistribution: toDenseDistribution(stateIds, predictive),
      evidenceProbability,
      filteredDistribution: toDenseDistribution(stateIds, posterior)
    });
    filtered = posterior;
  }

  const rawSequenceProbability = Math.exp(logLikelihood);
  if (!Number.isFinite(rawSequenceProbability)) {
    return failure(
      'non_finite_analytical_result',
      `Sequence probability became non-finite: ${String(rawSequenceProbability)}`
    );
  }
  const sequenceProbabilityUnderflowed = rawSequenceProbability === 0;

  return {
    ok: true,
    possible: true,
    observations: [...request.observations],
    steps,
    finalFilteredDistribution: toDenseDistribution(stateIds, filtered),
    logLikelihood,
    sequenceProbability: sequenceProbabilityUnderflowed ? null : rawSequenceProbability,
    diagnostics: successDiagnostics(
      resolved,
      request.observations.length,
      request.observations.length,
      sequenceProbabilityUnderflowed,
      null
    )
  };
}

type NonFiniteNumberLocation = {
  path: string;
  value: number;
};

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : { path, value };
  }
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

export function finiteHiddenStateObservationResultToJson(
  result: FiniteHiddenStateObservationResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state observation result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
