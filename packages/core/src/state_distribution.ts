import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type FiniteHorizonStateDistributionRequest = {
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  horizon: number;
};

export type FiniteHorizonStateDistributionOptions = {
  probabilityTolerance?: number;
  maxHorizon?: number;
};

export type StateDistributionFailureCode =
  | 'invalid_options'
  | 'invalid_model'
  | 'invalid_initial_distribution'
  | 'unknown_initial_state'
  | 'duplicate_initial_state'
  | 'invalid_initial_probability'
  | 'initial_probability_total'
  | 'invalid_horizon'
  | 'horizon_exceeds_limit'
  | 'mass_conservation_violation'
  | 'non_finite_analytical_result';

export type StateDistributionFailure = {
  code: StateDistributionFailureCode;
  message: string;
  path?: string;
  stateId?: StateId;
  step?: number;
  actualTotal?: number;
  tolerance?: number;
};

export type FiniteHorizonStateDistributionDiagnostics = {
  solverMethod: 'sparse_iterative_probability_mass';
  simulationUsed: false;
  numericRepresentation: 'javascript_number_float64';
  normalizationApplied: false;
  trajectoryConvention: 'includes_step_0_through_horizon';
  expectedVisitCountConvention: 'sum_probability_mass_from_step_0_through_horizon';
  terminalSemantics: 'implicit_self_retention';
  probabilityTolerance: number;
  maxHorizon: number;
  horizon: number;
  stepsEvaluated: number;
  massChecks: number;
  maxMassDeviation: number;
};

export type FiniteHorizonStateDistributionSuccess = {
  ok: true;
  horizon: number;
  trajectory: Array<{
    step: number;
    distribution: Array<{
      stateId: StateId;
      probability: number;
    }>;
    totalProbability: number;
  }>;
  finalDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  expectedVisitCounts: Array<{
    stateId: StateId;
    expectedVisitCount: number;
  }>;
  diagnostics: FiniteHorizonStateDistributionDiagnostics;
};

export type FiniteHorizonStateDistributionFailure = {
  ok: false;
  failure: StateDistributionFailure;
  validation?: ModelValidationResult;
};

export type FiniteHorizonStateDistributionResult =
  | FiniteHorizonStateDistributionSuccess
  | FiniteHorizonStateDistributionFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_MAX_HORIZON = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  maxHorizon: number;
};

type EvaluatedEdge = {
  from: StateId;
  to: StateId;
  probability: number;
};

function compareStateIds(left: StateId, right: StateId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: StateDistributionFailureCode,
  message: string,
  details: Omit<StateDistributionFailure, 'code' | 'message'> = {}
): FiniteHorizonStateDistributionFailure {
  return {
    ok: false,
    failure: { code, message, ...details }
  };
}

function resolveOptions(
  options: FiniteHorizonStateDistributionOptions
): ResolvedOptions | FiniteHorizonStateDistributionFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure(
      'invalid_options',
      'probabilityTolerance must be a finite positive number',
      { path: 'options.probabilityTolerance' }
    );
  }

  const maxHorizon = options.maxHorizon ?? DEFAULT_MAX_HORIZON;
  if (!Number.isInteger(maxHorizon) || maxHorizon < 0) {
    return failure(
      'invalid_options',
      'maxHorizon must be a non-negative integer',
      { path: 'options.maxHorizon' }
    );
  }

  return { probabilityTolerance, maxHorizon };
}

function isFailure(
  value: ResolvedOptions | FiniteHorizonStateDistributionFailure
): value is FiniteHorizonStateDistributionFailure {
  return 'ok' in value && value.ok === false;
}

function toDenseDistribution(
  stateIds: StateId[],
  massByState: Map<StateId, number>
): FiniteHorizonStateDistributionSuccess['finalDistribution'] {
  return stateIds.map((stateId) => ({
    stateId,
    probability: massByState.get(stateId) ?? 0
  }));
}

function totalMass(stateIds: StateId[], massByState: Map<StateId, number>): number {
  let total = 0;
  for (const stateId of stateIds) {
    total += massByState.get(stateId) ?? 0;
  }
  return total;
}

function checkedMassTotal(
  stateIds: StateId[],
  massByState: Map<StateId, number>,
  step: number,
  tolerance: number
): { ok: true; total: number; deviation: number } | FiniteHorizonStateDistributionFailure {
  for (const stateId of stateIds) {
    const probability = massByState.get(stateId) ?? 0;
    if (!Number.isFinite(probability)) {
      return failure(
        'non_finite_analytical_result',
        `State probability became non-finite at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step }
      );
    }
    if (probability < 0) {
      return failure(
        'mass_conservation_violation',
        `State probability became negative at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step, tolerance }
      );
    }
  }

  const total = totalMass(stateIds, massByState);
  if (!Number.isFinite(total)) {
    return failure(
      'non_finite_analytical_result',
      `Probability mass total became non-finite at step ${step}: ${String(total)}`,
      { step }
    );
  }

  const deviation = Math.abs(total - 1);
  if (deviation > tolerance) {
    return failure(
      'mass_conservation_violation',
      `Probability mass at step ${step} sums to ${total}, outside tolerance ${tolerance}`,
      { step, actualTotal: total, tolerance }
    );
  }

  return { ok: true, total, deviation };
}

function buildEvaluatedEdges(model: DefinitionModel): Map<StateId, EvaluatedEdge[]> {
  const byState = new Map<StateId, EvaluatedEdge[]>();
  for (const state of model.states) {
    byState.set(state.id, []);
  }

  const edges = model.transitions
    .map((transition): EvaluatedEdge => ({
      from: transition.from,
      to: transition.to,
      probability: evaluateProbabilitySpec(transition.probability)
    }))
    .sort((left, right) => {
      const fromOrder = compareStateIds(left.from, right.from);
      if (fromOrder !== 0) return fromOrder;
      const toOrder = compareStateIds(left.to, right.to);
      if (toOrder !== 0) return toOrder;
      return left.probability - right.probability;
    });

  for (const edge of edges) {
    byState.get(edge.from)?.push(edge);
  }
  return byState;
}

function validateInitialDistribution(
  request: FiniteHorizonStateDistributionRequest,
  stateIds: StateId[],
  tolerance: number
): Map<StateId, number> | FiniteHorizonStateDistributionFailure {
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
  for (const stateId of stateIds) {
    massByState.set(stateId, 0);
  }

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

function isInitialDistributionFailure(
  value: Map<StateId, number> | FiniteHorizonStateDistributionFailure
): value is FiniteHorizonStateDistributionFailure {
  return 'ok' in value && value.ok === false;
}

function addMass(
  target: Map<StateId, number>,
  stateId: StateId,
  increment: number,
  step: number
): FiniteHorizonStateDistributionFailure | undefined {
  if (!Number.isFinite(increment)) {
    return failure(
      'non_finite_analytical_result',
      `Probability-mass increment became non-finite at step ${step}: ${stateId}=${String(increment)}`,
      { stateId, step }
    );
  }

  const next = (target.get(stateId) ?? 0) + increment;
  if (!Number.isFinite(next)) {
    return failure(
      'non_finite_analytical_result',
      `Accumulated probability mass became non-finite at step ${step}: ${stateId}=${String(next)}`,
      { stateId, step }
    );
  }
  target.set(stateId, next);
  return undefined;
}

export function propagateFiniteHorizonStateDistribution(
  model: DefinitionModel,
  request: FiniteHorizonStateDistributionRequest,
  options: FiniteHorizonStateDistributionOptions = {}
): FiniteHorizonStateDistributionResult {
  const resolved = resolveOptions(options);
  if (isFailure(resolved)) {
    return resolved;
  }

  if (!Number.isInteger(request.horizon) || request.horizon < 0) {
    return failure(
      'invalid_horizon',
      'horizon must be a non-negative integer',
      { path: 'request.horizon' }
    );
  }
  if (request.horizon > resolved.maxHorizon) {
    return failure(
      'horizon_exceeds_limit',
      `horizon ${request.horizon} exceeds maxHorizon ${resolved.maxHorizon}`,
      { path: 'request.horizon' }
    );
  }

  const validation = validateDefinitionModel(model, resolved.probabilityTolerance);
  if (!validation.valid) {
    const first = validation.errors[0];
    return {
      ok: false,
      failure: {
        code: 'invalid_model',
        message: first === undefined
          ? 'DefinitionModel failed validation'
          : `DefinitionModel failed validation: ${first.message}`,
        ...(first === undefined ? {} : { path: `model.${first.path}` })
      },
      validation
    };
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStateIds);
  const currentOrFailure = validateInitialDistribution(
    request,
    stateIds,
    resolved.probabilityTolerance
  );
  if (isInitialDistributionFailure(currentOrFailure)) {
    return currentOrFailure;
  }

  let current = currentOrFailure;
  const edgesByState = buildEvaluatedEdges(model);
  const terminalStateIds = new Set(
    model.states.filter((state) => isTerminalState(state)).map((state) => state.id)
  );
  const expectedVisitCountByState = new Map<StateId, number>();
  for (const stateId of stateIds) {
    expectedVisitCountByState.set(stateId, current.get(stateId) ?? 0);
  }

  const trajectory: FiniteHorizonStateDistributionSuccess['trajectory'] = [];
  let maxMassDeviation = 0;
  let massChecks = 0;

  const initialCheck = checkedMassTotal(
    stateIds,
    current,
    0,
    resolved.probabilityTolerance
  );
  if (!initialCheck.ok) {
    return initialCheck;
  }
  maxMassDeviation = initialCheck.deviation;
  massChecks += 1;
  trajectory.push({
    step: 0,
    distribution: toDenseDistribution(stateIds, current),
    totalProbability: initialCheck.total
  });

  for (let step = 1; step <= request.horizon; step += 1) {
    const next = new Map<StateId, number>();
    for (const stateId of stateIds) {
      next.set(stateId, 0);
    }

    for (const stateId of stateIds) {
      const stateMass = current.get(stateId) ?? 0;
      if (stateMass === 0) {
        continue;
      }

      if (terminalStateIds.has(stateId)) {
        const error = addMass(next, stateId, stateMass, step);
        if (error !== undefined) return error;
        continue;
      }

      for (const edge of edgesByState.get(stateId) ?? []) {
        if (edge.probability === 0) {
          continue;
        }
        const error = addMass(next, edge.to, stateMass * edge.probability, step);
        if (error !== undefined) return error;
      }
    }

    const check = checkedMassTotal(
      stateIds,
      next,
      step,
      resolved.probabilityTolerance
    );
    if (!check.ok) {
      return check;
    }
    maxMassDeviation = Math.max(maxMassDeviation, check.deviation);
    massChecks += 1;

    for (const stateId of stateIds) {
      const nextVisitCount =
        (expectedVisitCountByState.get(stateId) ?? 0) + (next.get(stateId) ?? 0);
      if (!Number.isFinite(nextVisitCount)) {
        return failure(
          'non_finite_analytical_result',
          `Expected visit count became non-finite at step ${step}: ${stateId}=${String(nextVisitCount)}`,
          { stateId, step }
        );
      }
      expectedVisitCountByState.set(stateId, nextVisitCount);
    }

    current = next;
    trajectory.push({
      step,
      distribution: toDenseDistribution(stateIds, current),
      totalProbability: check.total
    });
  }

  const finalDistribution = toDenseDistribution(stateIds, current);
  const expectedVisitCounts = stateIds.map((stateId) => ({
    stateId,
    expectedVisitCount: expectedVisitCountByState.get(stateId) ?? 0
  }));

  return {
    ok: true,
    horizon: request.horizon,
    trajectory,
    finalDistribution,
    expectedVisitCounts,
    diagnostics: {
      solverMethod: 'sparse_iterative_probability_mass',
      simulationUsed: false,
      numericRepresentation: 'javascript_number_float64',
      normalizationApplied: false,
      trajectoryConvention: 'includes_step_0_through_horizon',
      expectedVisitCountConvention: 'sum_probability_mass_from_step_0_through_horizon',
      terminalSemantics: 'implicit_self_retention',
      probabilityTolerance: resolved.probabilityTolerance,
      maxHorizon: resolved.maxHorizon,
      horizon: request.horizon,
      stepsEvaluated: request.horizon,
      massChecks,
      maxMassDeviation
    }
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

export function stateDistributionResultToJson(
  result: FiniteHorizonStateDistributionResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize state-distribution result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
