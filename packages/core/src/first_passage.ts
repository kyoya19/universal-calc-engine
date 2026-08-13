import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type FiniteFirstPassageRequest = {
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
  targetStates: StateId[];
  horizon: number;
};

export type FiniteFirstPassageOptions = {
  probabilityTolerance?: number;
  maxHorizon?: number;
};

export type FiniteFirstPassageFailureCode =
  | 'invalid_options'
  | 'invalid_model'
  | 'invalid_initial_distribution'
  | 'unknown_initial_state'
  | 'duplicate_initial_state'
  | 'invalid_initial_probability'
  | 'initial_probability_total'
  | 'invalid_target_states'
  | 'empty_target_states'
  | 'unknown_target_state'
  | 'duplicate_target_state'
  | 'invalid_horizon'
  | 'horizon_exceeds_limit'
  | 'mass_conservation_violation'
  | 'non_finite_analytical_result';

export type FiniteFirstPassageFailure = {
  code: FiniteFirstPassageFailureCode;
  message: string;
  path?: string;
  stateId?: StateId;
  step?: number;
  actualTotal?: number;
  tolerance?: number;
};

export type FiniteFirstPassageStep = {
  step: number;
  firstHitProbability: number;
  cumulativeHitProbability: number;
  notYetHitProbability: number;
  firstHitByTarget: Array<{
    stateId: StateId;
    probability: number;
  }>;
};

export type FiniteFirstPassageDiagnostics = {
  method: 'sparse_survivor_boundary_flux';
  simulationUsed: false;
  numericRepresentation: 'javascript_number_float64';
  inputNormalizationApplied: false;
  firstPassageConvention: 'first_entry_includes_step_0';
  terminalSemantics: 'implicit_self_retention_for_non_target_terminals';
  targetSemantics: 'first_entry_stops_target_mass_without_mutating_source_model';
  probabilityTolerance: number;
  maxHorizon: number;
  horizon: number;
  stepsReported: number;
  transitionStepsEvaluated: number;
  massChecks: number;
  maxMassDeviation: number;
  infiniteHorizonClaimed: false;
};

export type FiniteFirstPassageSuccess = {
  ok: true;
  horizon: number;
  targetStates: StateId[];
  steps: FiniteFirstPassageStep[];
  hitProbabilityByHorizon: number;
  notHitProbabilityByHorizon: number;
  firstHitByTargetTotals: Array<{
    stateId: StateId;
    probability: number;
  }>;
  diagnostics: FiniteFirstPassageDiagnostics;
};

export type FiniteFirstPassageFailureResult = {
  ok: false;
  failure: FiniteFirstPassageFailure;
  validation?: ModelValidationResult;
};

export type FiniteFirstPassageResult =
  | FiniteFirstPassageSuccess
  | FiniteFirstPassageFailureResult;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_MAX_HORIZON = 10_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  maxHorizon: number;
};

type TransitionEdge = {
  to: StateId;
  probability: number;
};

function compareStateIds(left: StateId, right: StateId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: FiniteFirstPassageFailureCode,
  message: string,
  details: Omit<FiniteFirstPassageFailure, 'code' | 'message'> = {}
): FiniteFirstPassageFailureResult {
  return {
    ok: false,
    failure: { code, message, ...details }
  };
}

function resolveOptions(
  options: FiniteFirstPassageOptions
): ResolvedOptions | FiniteFirstPassageFailureResult {
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

function isFailureResult(
  value:
    | ResolvedOptions
    | Map<StateId, number>
    | Set<StateId>
    | FiniteFirstPassageFailureResult
): value is FiniteFirstPassageFailureResult {
  return 'ok' in value && value.ok === false;
}

function validateInitialDistribution(
  request: FiniteFirstPassageRequest,
  stateIds: StateId[],
  tolerance: number
): Map<StateId, number> | FiniteFirstPassageFailureResult {
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

function validateTargetStates(
  request: FiniteFirstPassageRequest,
  stateIds: StateId[]
): Set<StateId> | FiniteFirstPassageFailureResult {
  if (!Array.isArray(request.targetStates)) {
    return failure(
      'invalid_target_states',
      'targetStates must be an array',
      { path: 'request.targetStates' }
    );
  }
  if (request.targetStates.length === 0) {
    return failure(
      'empty_target_states',
      'targetStates must contain at least one state',
      { path: 'request.targetStates' }
    );
  }

  const knownStates = new Set(stateIds);
  const targets = new Set<StateId>();
  for (let index = 0; index < request.targetStates.length; index += 1) {
    const stateId = request.targetStates[index];
    if (typeof stateId !== 'string' || stateId.trim().length === 0) {
      return failure(
        'invalid_target_states',
        `targetStates[${index}] must be a non-empty string`,
        { path: `request.targetStates[${index}]` }
      );
    }
    if (!knownStates.has(stateId)) {
      return failure(
        'unknown_target_state',
        `Unknown target state: ${stateId}`,
        { path: `request.targetStates[${index}]`, stateId }
      );
    }
    if (targets.has(stateId)) {
      return failure(
        'duplicate_target_state',
        `Duplicate target state: ${stateId}`,
        { path: `request.targetStates[${index}]`, stateId }
      );
    }
    targets.add(stateId);
  }

  return targets;
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
        .sort((left, right) => compareStateIds(left.to, right.to))
    );
  }

  return rows;
}

function addMass(
  target: Map<StateId, number>,
  stateId: StateId,
  increment: number,
  step: number
): FiniteFirstPassageFailureResult | undefined {
  if (!Number.isFinite(increment)) {
    return failure(
      'non_finite_analytical_result',
      `Probability-mass increment became non-finite at step ${step}: ${stateId}=${String(increment)}`,
      { stateId, step }
    );
  }
  if (increment < 0) {
    return failure(
      'mass_conservation_violation',
      `Probability-mass increment became negative at step ${step}: ${stateId}=${String(increment)}`,
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

function sumMass(stateIds: StateId[], massByState: Map<StateId, number>): number {
  let total = 0;
  for (const stateId of stateIds) total += massByState.get(stateId) ?? 0;
  return total;
}

function checkedStepMass(
  stateIds: StateId[],
  survivorMassByState: Map<StateId, number>,
  targetStateIds: StateId[],
  firstHitByTarget: Map<StateId, number>,
  firstHitProbability: number,
  cumulativeHitProbability: number,
  step: number,
  tolerance: number
):
  | { ok: true; notYetHitProbability: number; deviation: number }
  | FiniteFirstPassageFailureResult {
  for (const stateId of stateIds) {
    const probability = survivorMassByState.get(stateId) ?? 0;
    if (!Number.isFinite(probability)) {
      return failure(
        'non_finite_analytical_result',
        `Survivor probability became non-finite at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step }
      );
    }
    if (probability < 0) {
      return failure(
        'mass_conservation_violation',
        `Survivor probability became negative at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step, tolerance }
      );
    }
  }

  for (const stateId of targetStateIds) {
    const probability = firstHitByTarget.get(stateId) ?? 0;
    if (!Number.isFinite(probability)) {
      return failure(
        'non_finite_analytical_result',
        `First-hit probability became non-finite at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step }
      );
    }
    if (probability < 0) {
      return failure(
        'mass_conservation_violation',
        `First-hit probability became negative at step ${step}: ${stateId}=${String(probability)}`,
        { stateId, step, tolerance }
      );
    }
  }

  if (!Number.isFinite(firstHitProbability) || !Number.isFinite(cumulativeHitProbability)) {
    return failure(
      'non_finite_analytical_result',
      `First-passage aggregate became non-finite at step ${step}`,
      { step }
    );
  }
  if (firstHitProbability < 0 || cumulativeHitProbability < 0) {
    return failure(
      'mass_conservation_violation',
      `First-passage aggregate became negative at step ${step}`,
      { step, tolerance }
    );
  }
  if (firstHitProbability > 1 + tolerance || cumulativeHitProbability > 1 + tolerance) {
    return failure(
      'mass_conservation_violation',
      `First-passage probability exceeded one at step ${step}`,
      { step, actualTotal: cumulativeHitProbability, tolerance }
    );
  }

  const notYetHitProbability = sumMass(stateIds, survivorMassByState);
  if (!Number.isFinite(notYetHitProbability)) {
    return failure(
      'non_finite_analytical_result',
      `Not-yet-hit probability became non-finite at step ${step}`,
      { step }
    );
  }

  const total = cumulativeHitProbability + notYetHitProbability;
  if (!Number.isFinite(total)) {
    return failure(
      'non_finite_analytical_result',
      `First-hit plus survivor mass became non-finite at step ${step}`,
      { step }
    );
  }
  const deviation = Math.abs(total - 1);
  if (deviation > tolerance) {
    return failure(
      'mass_conservation_violation',
      `Cumulative first-hit plus survivor mass at step ${step} sums to ${total}, outside tolerance ${tolerance}`,
      { step, actualTotal: total, tolerance }
    );
  }

  return { ok: true, notYetHitProbability, deviation };
}

function targetMassRows(
  targetStateIds: StateId[],
  massByTarget: Map<StateId, number>
): Array<{ stateId: StateId; probability: number }> {
  return targetStateIds.map((stateId) => ({
    stateId,
    probability: massByTarget.get(stateId) ?? 0
  }));
}

export function analyzeFiniteHorizonFirstPassage(
  model: DefinitionModel,
  request: FiniteFirstPassageRequest,
  options: FiniteFirstPassageOptions = {}
): FiniteFirstPassageResult {
  const resolved = resolveOptions(options);
  if (isFailureResult(resolved)) return resolved;

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
  const initialOrFailure = validateInitialDistribution(
    request,
    stateIds,
    resolved.probabilityTolerance
  );
  if (isFailureResult(initialOrFailure)) return initialOrFailure;

  const targetsOrFailure = validateTargetStates(request, stateIds);
  if (isFailureResult(targetsOrFailure)) return targetsOrFailure;
  const targetSet = targetsOrFailure;
  const targetStateIds = [...targetSet].sort(compareStateIds);

  const rows = buildTransitionRows(model, stateIds);
  let survivorMass = new Map<StateId, number>();
  const firstHitByTargetTotals = new Map<StateId, number>();
  for (const stateId of stateIds) {
    survivorMass.set(stateId, targetSet.has(stateId) ? 0 : initialOrFailure.get(stateId) ?? 0);
  }
  for (const stateId of targetStateIds) firstHitByTargetTotals.set(stateId, 0);

  const steps: FiniteFirstPassageStep[] = [];
  let cumulativeHitProbability = 0;
  let maxMassDeviation = 0;
  let massChecks = 0;

  for (let step = 0; step <= request.horizon; step += 1) {
    const firstHitByTarget = new Map<StateId, number>();
    for (const stateId of targetStateIds) firstHitByTarget.set(stateId, 0);

    if (step === 0) {
      for (const stateId of targetStateIds) {
        const probability = initialOrFailure.get(stateId) ?? 0;
        firstHitByTarget.set(stateId, probability);
      }
    } else {
      const nextSurvivor = new Map<StateId, number>();
      for (const stateId of stateIds) nextSurvivor.set(stateId, 0);

      for (const fromStateId of stateIds) {
        if (targetSet.has(fromStateId)) continue;
        const sourceMass = survivorMass.get(fromStateId) ?? 0;
        if (sourceMass === 0) continue;

        for (const edge of rows.get(fromStateId) ?? []) {
          if (edge.probability === 0) continue;
          const increment = sourceMass * edge.probability;
          if (targetSet.has(edge.to)) {
            const error = addMass(firstHitByTarget, edge.to, increment, step);
            if (error !== undefined) return error;
          } else {
            const error = addMass(nextSurvivor, edge.to, increment, step);
            if (error !== undefined) return error;
          }
        }
      }

      survivorMass = nextSurvivor;
    }

    const firstHitProbability = sumMass(targetStateIds, firstHitByTarget);
    cumulativeHitProbability += firstHitProbability;
    for (const stateId of targetStateIds) {
      const nextTotal =
        (firstHitByTargetTotals.get(stateId) ?? 0) + (firstHitByTarget.get(stateId) ?? 0);
      if (!Number.isFinite(nextTotal)) {
        return failure(
          'non_finite_analytical_result',
          `Target first-hit total became non-finite at step ${step}: ${stateId}`,
          { stateId, step }
        );
      }
      firstHitByTargetTotals.set(stateId, nextTotal);
    }

    const check = checkedStepMass(
      stateIds,
      survivorMass,
      targetStateIds,
      firstHitByTarget,
      firstHitProbability,
      cumulativeHitProbability,
      step,
      resolved.probabilityTolerance
    );
    if (!check.ok) return check;
    maxMassDeviation = Math.max(maxMassDeviation, check.deviation);
    massChecks += 1;

    steps.push({
      step,
      firstHitProbability,
      cumulativeHitProbability,
      notYetHitProbability: check.notYetHitProbability,
      firstHitByTarget: targetMassRows(targetStateIds, firstHitByTarget)
    });
  }

  const finalStep = steps[steps.length - 1];
  if (finalStep === undefined) {
    return failure('non_finite_analytical_result', 'No first-passage step was produced');
  }

  return {
    ok: true,
    horizon: request.horizon,
    targetStates: targetStateIds,
    steps,
    hitProbabilityByHorizon: finalStep.cumulativeHitProbability,
    notHitProbabilityByHorizon: finalStep.notYetHitProbability,
    firstHitByTargetTotals: targetMassRows(targetStateIds, firstHitByTargetTotals),
    diagnostics: {
      method: 'sparse_survivor_boundary_flux',
      simulationUsed: false,
      numericRepresentation: 'javascript_number_float64',
      inputNormalizationApplied: false,
      firstPassageConvention: 'first_entry_includes_step_0',
      terminalSemantics: 'implicit_self_retention_for_non_target_terminals',
      targetSemantics: 'first_entry_stops_target_mass_without_mutating_source_model',
      probabilityTolerance: resolved.probabilityTolerance,
      maxHorizon: resolved.maxHorizon,
      horizon: request.horizon,
      stepsReported: request.horizon + 1,
      transitionStepsEvaluated: request.horizon,
      massChecks,
      maxMassDeviation,
      infiniteHorizonClaimed: false
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

export function finiteFirstPassageResultToJson(result: FiniteFirstPassageResult): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize first-passage result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
