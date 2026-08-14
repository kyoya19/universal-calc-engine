import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHorizonStateDistributionFailure,
  FiniteHorizonStateDistributionRequest,
  propagateFiniteHorizonStateDistribution
} from './state_distribution';

export type AdditiveInitialValueEntry = {
  stateId: StateId;
  valueTicks: number;
};

export type AdditiveTransitionValueEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  valueTicks: number;
};

export type FiniteAdditiveTrajectoryFunctionalRequest = {
  initialDistribution: FiniteHorizonStateDistributionRequest['initialDistribution'];
  horizon: number;
  initialValueByState: AdditiveInitialValueEntry[];
  transitionValueByStep: AdditiveTransitionValueEntry[][];
};

export type FiniteAdditiveTrajectoryFunctionalConditioningRequest =
  FiniteAdditiveTrajectoryFunctionalRequest & {
    targetValueTicks: number;
  };

export type FiniteAdditiveTrajectoryFunctionalOptions = {
  probabilityTolerance?: number;
  pairwiseConsistencyTolerance?: number;
  expectedCountTolerance?: number;
  maxHorizon?: number;
  maxSupportSize?: number;
};

export type AdditiveProbabilityAtom = {
  valueTicks: number;
  probability: number | null;
  logProbability: number;
  probabilityUnderflowed: boolean;
};

export type AdditiveJointStateValueAtom = AdditiveProbabilityAtom & {
  stateId: StateId;
};

export type AdditiveTrajectoryDistributionStep = {
  step: number;
  jointStateValueDistribution: AdditiveJointStateValueAtom[];
  valueDistribution: AdditiveProbabilityAtom[];
};

export type AdditiveConditionedStateDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type AdditiveConditionedSmoothingStep = {
  step: number;
  smoothedDistribution: AdditiveConditionedStateDistribution;
};

export type AdditiveConditionedPairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type AdditiveConditionedPairwiseStep = {
  step: number;
  pairwiseDistribution: AdditiveConditionedPairwiseEntry[];
};

export type AdditiveConditionedExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteAdditiveTrajectoryFunctionalDiagnostics = {
  method: 'sparse_log_state_value_dynamic_programming';
  numericRepresentation: 'javascript_number_float64_with_log_mass';
  simulationUsed: false;
  approximationUsed: false;
  valueDomain: 'signed_javascript_safe_integer_ticks';
  supportIdentity: 'exact_integer_equality';
  terminalSemantics: 'implicit_self_retention_with_explicit_increment';
  parallelTransitionSemantics: 'same_state_pair_shared_increment';
  probabilityNormalizationApplied: false;
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxHorizon: number;
  maxSupportSize: number;
  supportAtomUnderflowCount: number;
  massChecks: number;
  maxLogMassDeviation: number;
  existingCandidateACHRSTUVWXYZRequestTypesModified: false;
  parameterLearningUsed: false;
  candidateEvidenceCompositionUsed: false;
};

export type FiniteAdditiveTrajectoryFunctionalConditioningDiagnostics =
  FiniteAdditiveTrajectoryFunctionalDiagnostics & {
    conditioningMethod: 'exact_final_aggregate_value_log_forward_backward';
    fullEventSmoothingOnly: true;
    prefixFilteringComputed: false;
    eventProbabilityUnderflowed: boolean;
  };

export type AdditiveTrajectoryFunctionalFailureCode =
  | 'invalid_additive_trajectory_functional_request'
  | 'invalid_additive_trajectory_horizon'
  | 'invalid_additive_initial_value_by_state'
  | 'missing_additive_initial_state_value'
  | 'unknown_additive_initial_state'
  | 'duplicate_additive_initial_state'
  | 'invalid_additive_transition_value_by_step'
  | 'missing_additive_effective_state_pair_value'
  | 'unknown_additive_state_pair'
  | 'duplicate_additive_state_pair'
  | 'invalid_additive_tick_value'
  | 'unsafe_additive_cumulative_tick_value'
  | 'invalid_additive_target_tick_value'
  | 'invalid_additive_support_limit'
  | 'additive_support_limit_exceeded'
  | 'invalid_candidate_aa_tolerance'
  | 'additive_forward_mass_conservation_violation'
  | 'additive_conditioning_smoothing_mass_conservation_violation'
  | 'additive_conditioning_pairwise_mass_conservation_violation'
  | 'additive_conditioning_pairwise_marginal_consistency_violation'
  | 'additive_conditioning_expected_transition_count_conservation_violation'
  | 'internal_additive_trajectory_functional_structural_inconsistency'
  | 'non_finite_additive_trajectory_functional_result';

export type AdditiveTrajectoryFunctionalFailure = {
  code: AdditiveTrajectoryFunctionalFailureCode;
  message: string;
  path?: string;
  step?: number;
  stateId?: StateId;
  fromStateId?: StateId;
  toStateId?: StateId;
  valueTicks?: number;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteAdditiveTrajectoryFunctionalFailure = {
  ok: false;
  failure: AdditiveTrajectoryFunctionalFailure;
};

export type FiniteAdditiveTrajectoryFunctionalDistributionSuccess = {
  ok: true;
  possible: true;
  horizon: number;
  initialValueByState: AdditiveInitialValueEntry[];
  transitionValueByStep: AdditiveTransitionValueEntry[][];
  trajectory: AdditiveTrajectoryDistributionStep[];
  finalAggregateDistribution: AdditiveProbabilityAtom[];
  diagnostics: FiniteAdditiveTrajectoryFunctionalDiagnostics;
};

export type FiniteAdditiveTrajectoryFunctionalDistributionResult =
  | FiniteAdditiveTrajectoryFunctionalDistributionSuccess
  | FiniteAdditiveTrajectoryFunctionalFailure
  | FiniteHorizonStateDistributionFailure;

export type FiniteAdditiveTrajectoryFunctionalConditioningSuccess = {
  ok: true;
  possible: boolean;
  horizon: number;
  targetValueTicks: number;
  eventProbability: number | null;
  logEventProbability: number | null;
  smoothingSteps: AdditiveConditionedSmoothingStep[] | null;
  pairwiseSteps: AdditiveConditionedPairwiseStep[] | null;
  expectedTransitionCounts: AdditiveConditionedExpectedTransitionCount[] | null;
  diagnostics: FiniteAdditiveTrajectoryFunctionalConditioningDiagnostics;
};

export type FiniteAdditiveTrajectoryFunctionalConditioningResult =
  | FiniteAdditiveTrajectoryFunctionalConditioningSuccess
  | FiniteAdditiveTrajectoryFunctionalFailure
  | FiniteHorizonStateDistributionFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_MAX_HORIZON = 10_000;
const DEFAULT_MAX_SUPPORT_SIZE = 100_000;

type ResolvedOptions = {
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxHorizon: number;
  maxSupportSize: number;
};

type EffectiveEdge = {
  from: StateId;
  to: StateId;
  probability: number;
};

type LogSupport = Map<number, number>;
type LogStateSupport = Map<StateId, LogSupport>;

type PreparedFunctional = {
  stateIds: StateId[];
  effectiveEdgesByState: Map<StateId, EffectiveEdge[]>;
  effectivePairs: EffectiveEdge[];
  initialValues: AdditiveInitialValueEntry[];
  initialValueByState: Map<StateId, number>;
  transitionRows: AdditiveTransitionValueEntry[][];
  transitionValuesByStep: Array<Map<string, number>>;
  resolved: ResolvedOptions;
};

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function comparePairs(
  left: Pick<AdditiveTransitionValueEntry, 'fromStateId' | 'toStateId'>,
  right: Pick<AdditiveTransitionValueEntry, 'fromStateId' | 'toStateId'>
): number {
  const fromOrder = compareStrings(left.fromStateId, right.fromStateId);
  if (fromOrder !== 0) return fromOrder;
  return compareStrings(left.toStateId, right.toStateId);
}

function failure(
  code: AdditiveTrajectoryFunctionalFailureCode,
  message: string,
  details: Omit<AdditiveTrajectoryFunctionalFailure, 'code' | 'message'> = {}
): FiniteAdditiveTrajectoryFunctionalFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function isOwnFailure(
  value: ResolvedOptions | FiniteAdditiveTrajectoryFunctionalFailure
): value is FiniteAdditiveTrajectoryFunctionalFailure {
  return 'ok' in value && value.ok === false;
}

function resolveOptions(
  options: FiniteAdditiveTrajectoryFunctionalOptions,
  horizon: number
): ResolvedOptions | FiniteAdditiveTrajectoryFunctionalFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure('invalid_candidate_aa_tolerance', 'probabilityTolerance must be a finite positive number', {
      path: 'options.probabilityTolerance'
    });
  }
  const pairwiseConsistencyTolerance = options.pairwiseConsistencyTolerance ?? probabilityTolerance * 20;
  if (!Number.isFinite(pairwiseConsistencyTolerance) || pairwiseConsistencyTolerance <= 0) {
    return failure('invalid_candidate_aa_tolerance', 'pairwiseConsistencyTolerance must be a finite positive number', {
      path: 'options.pairwiseConsistencyTolerance'
    });
  }
  const expectedCountTolerance =
    options.expectedCountTolerance ?? pairwiseConsistencyTolerance * Math.max(1, horizon);
  if (!Number.isFinite(expectedCountTolerance) || expectedCountTolerance <= 0) {
    return failure('invalid_candidate_aa_tolerance', 'expectedCountTolerance must be a finite positive number', {
      path: 'options.expectedCountTolerance'
    });
  }
  const maxHorizon = options.maxHorizon ?? DEFAULT_MAX_HORIZON;
  if (!Number.isInteger(maxHorizon) || maxHorizon < 0) {
    return failure('invalid_candidate_aa_tolerance', 'maxHorizon must be a non-negative integer', {
      path: 'options.maxHorizon'
    });
  }
  const maxSupportSize = options.maxSupportSize ?? DEFAULT_MAX_SUPPORT_SIZE;
  if (!Number.isInteger(maxSupportSize) || maxSupportSize <= 0) {
    return failure('invalid_additive_support_limit', 'maxSupportSize must be a positive integer', {
      path: 'options.maxSupportSize'
    });
  }
  return {
    probabilityTolerance,
    pairwiseConsistencyTolerance,
    expectedCountTolerance,
    maxHorizon,
    maxSupportSize
  };
}

function logAddExp(left: number, right: number): number {
  if (left === Number.NEGATIVE_INFINITY) return right;
  if (right === Number.NEGATIVE_INFINITY) return left;
  const high = Math.max(left, right);
  const low = Math.min(left, right);
  return high + Math.log1p(Math.exp(low - high));
}

function logSum(values: Iterable<number>): number {
  let total = Number.NEGATIVE_INFINITY;
  for (const value of values) total = logAddExp(total, value);
  return total;
}

function probabilityView(logProbability: number): Pick<AdditiveProbabilityAtom, 'probability' | 'logProbability' | 'probabilityUnderflowed'> {
  const direct = Math.exp(logProbability);
  const probabilityUnderflowed = direct === 0;
  return {
    probability: probabilityUnderflowed ? null : direct,
    logProbability,
    probabilityUnderflowed
  };
}

function checkedSafeAdd(
  left: number,
  right: number,
  step: number,
  fromStateId?: StateId,
  toStateId?: StateId
): number | FiniteAdditiveTrajectoryFunctionalFailure {
  const value = left + right;
  if (!Number.isSafeInteger(value)) {
    return failure(
      'unsafe_additive_cumulative_tick_value',
      `Cumulative tick value is outside exact JavaScript safe-integer range at step ${step}: ${String(left)} + ${String(right)}`,
      { step, fromStateId, toStateId, valueTicks: value }
    );
  }
  return value;
}

function buildEffectiveEdges(model: DefinitionModel): {
  byState: Map<StateId, EffectiveEdge[]>;
  pairs: EffectiveEdge[];
} {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminal = new Set(model.states.filter((state) => isTerminalState(state)).map((state) => state.id));
  const byState = new Map<StateId, EffectiveEdge[]>();
  const pairProbability = new Map<string, EffectiveEdge>();

  for (const stateId of stateIds) {
    if (terminal.has(stateId)) {
      const edge = { from: stateId, to: stateId, probability: 1 };
      byState.set(stateId, [edge]);
      pairProbability.set(pairKey(stateId, stateId), edge);
      continue;
    }
    const aggregate = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      if (probability <= 0) continue;
      aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
    }
    const edges = [...aggregate.entries()]
      .map(([to, probability]) => ({ from: stateId, to, probability }))
      .sort((left, right) => compareStrings(left.to, right.to));
    byState.set(stateId, edges);
    for (const edge of edges) pairProbability.set(pairKey(edge.from, edge.to), edge);
  }

  const pairs = [...pairProbability.values()].sort(comparePairs);
  return { byState, pairs };
}

function canonicalizeInitialValues(
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  stateIds: StateId[]
): { entries: AdditiveInitialValueEntry[]; byState: Map<StateId, number> } | FiniteAdditiveTrajectoryFunctionalFailure {
  if (!Array.isArray(request.initialValueByState)) {
    return failure('invalid_additive_initial_value_by_state', 'initialValueByState must be an array', {
      path: 'request.initialValueByState'
    });
  }
  const knownStates = new Set(stateIds);
  const seen = new Set<StateId>();
  const byState = new Map<StateId, number>();
  for (let index = 0; index < request.initialValueByState.length; index += 1) {
    const entry = request.initialValueByState[index];
    if (entry === undefined || typeof entry.stateId !== 'string') {
      return failure('invalid_additive_initial_value_by_state', `initialValueByState[${index}].stateId must be a string`, {
        path: `request.initialValueByState[${index}].stateId`
      });
    }
    if (!knownStates.has(entry.stateId)) {
      return failure('unknown_additive_initial_state', `Unknown state in initialValueByState: ${entry.stateId}`, {
        path: `request.initialValueByState[${index}].stateId`, stateId: entry.stateId
      });
    }
    if (seen.has(entry.stateId)) {
      return failure('duplicate_additive_initial_state', `Duplicate state in initialValueByState: ${entry.stateId}`, {
        path: `request.initialValueByState[${index}].stateId`, stateId: entry.stateId
      });
    }
    if (!Number.isSafeInteger(entry.valueTicks)) {
      return failure('invalid_additive_tick_value', `Initial value must be a JavaScript safe integer: ${String(entry.valueTicks)}`, {
        path: `request.initialValueByState[${index}].valueTicks`, stateId: entry.stateId, valueTicks: entry.valueTicks
      });
    }
    seen.add(entry.stateId);
    byState.set(entry.stateId, entry.valueTicks);
  }
  for (const stateId of stateIds) {
    if (!seen.has(stateId)) {
      return failure('missing_additive_initial_state_value', `Missing initial additive value for state: ${stateId}`, {
        path: 'request.initialValueByState', stateId
      });
    }
  }
  const entries = stateIds.map((stateId) => ({ stateId, valueTicks: byState.get(stateId)! }));
  return { entries, byState };
}

function canonicalizeTransitionRows(
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  effectivePairs: EffectiveEdge[]
): { rows: AdditiveTransitionValueEntry[][]; maps: Array<Map<string, number>> } | FiniteAdditiveTrajectoryFunctionalFailure {
  if (!Array.isArray(request.transitionValueByStep) || request.transitionValueByStep.length !== request.horizon) {
    return failure(
      'invalid_additive_transition_value_by_step',
      `transitionValueByStep must contain exactly horizon=${request.horizon} rows`,
      { path: 'request.transitionValueByStep' }
    );
  }
  const validPairs = new Set(effectivePairs.map((edge) => pairKey(edge.from, edge.to)));
  const rows: AdditiveTransitionValueEntry[][] = [];
  const maps: Array<Map<string, number>> = [];

  for (let rowIndex = 0; rowIndex < request.transitionValueByStep.length; rowIndex += 1) {
    const row = request.transitionValueByStep[rowIndex];
    const step = rowIndex + 1;
    if (!Array.isArray(row)) {
      return failure('invalid_additive_transition_value_by_step', `transitionValueByStep[${rowIndex}] must be an array`, {
        path: `request.transitionValueByStep[${rowIndex}]`, step
      });
    }
    const seen = new Set<string>();
    const values = new Map<string, number>();
    for (let index = 0; index < row.length; index += 1) {
      const entry = row[index];
      if (entry === undefined || typeof entry.fromStateId !== 'string' || typeof entry.toStateId !== 'string') {
        return failure('invalid_additive_transition_value_by_step', `transitionValueByStep[${rowIndex}][${index}] must contain string state IDs`, {
          path: `request.transitionValueByStep[${rowIndex}][${index}]`, step
        });
      }
      const key = pairKey(entry.fromStateId, entry.toStateId);
      if (!validPairs.has(key)) {
        return failure('unknown_additive_state_pair', `State pair is not an effective positive-probability transition: ${entry.fromStateId}->${entry.toStateId}`, {
          path: `request.transitionValueByStep[${rowIndex}][${index}]`, step,
          fromStateId: entry.fromStateId, toStateId: entry.toStateId
        });
      }
      if (seen.has(key)) {
        return failure('duplicate_additive_state_pair', `Duplicate additive state pair at step ${step}: ${entry.fromStateId}->${entry.toStateId}`, {
          path: `request.transitionValueByStep[${rowIndex}][${index}]`, step,
          fromStateId: entry.fromStateId, toStateId: entry.toStateId
        });
      }
      if (!Number.isSafeInteger(entry.valueTicks)) {
        return failure('invalid_additive_tick_value', `Transition value must be a JavaScript safe integer: ${String(entry.valueTicks)}`, {
          path: `request.transitionValueByStep[${rowIndex}][${index}].valueTicks`, step,
          fromStateId: entry.fromStateId, toStateId: entry.toStateId, valueTicks: entry.valueTicks
        });
      }
      seen.add(key);
      values.set(key, entry.valueTicks);
    }
    for (const edge of effectivePairs) {
      const key = pairKey(edge.from, edge.to);
      if (!seen.has(key)) {
        return failure('missing_additive_effective_state_pair_value', `Missing additive value at step ${step}: ${edge.from}->${edge.to}`, {
          path: `request.transitionValueByStep[${rowIndex}]`, step,
          fromStateId: edge.from, toStateId: edge.to
        });
      }
    }
    const canonical = effectivePairs.map((edge) => ({
      fromStateId: edge.from,
      toStateId: edge.to,
      valueTicks: values.get(pairKey(edge.from, edge.to))!
    }));
    rows.push(canonical);
    maps.push(values);
  }
  return { rows, maps };
}

function prepareFunctional(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  options: FiniteAdditiveTrajectoryFunctionalOptions
): PreparedFunctional | FiniteAdditiveTrajectoryFunctionalFailure | FiniteHorizonStateDistributionFailure {
  if (request === null || typeof request !== 'object') {
    return failure('invalid_additive_trajectory_functional_request', 'request must be an object', { path: 'request' });
  }
  if (!Number.isSafeInteger(request.horizon) || request.horizon < 0) {
    return failure('invalid_additive_trajectory_horizon', 'horizon must be a non-negative safe integer', {
      path: 'request.horizon'
    });
  }
  const resolved = resolveOptions(options, request.horizon);
  if (isOwnFailure(resolved)) return resolved;
  if (request.horizon > resolved.maxHorizon) {
    return failure('invalid_additive_trajectory_horizon', `horizon ${request.horizon} exceeds maxHorizon ${resolved.maxHorizon}`, {
      path: 'request.horizon'
    });
  }

  const candidateAValidation = propagateFiniteHorizonStateDistribution(
    model,
    { initialDistribution: request.initialDistribution, horizon: request.horizon },
    { probabilityTolerance: resolved.probabilityTolerance, maxHorizon: resolved.maxHorizon }
  );
  if (!candidateAValidation.ok) return candidateAValidation;

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const initial = canonicalizeInitialValues(request, stateIds);
  if ('ok' in initial && initial.ok === false) return initial;
  const effective = buildEffectiveEdges(model);
  const transitions = canonicalizeTransitionRows(request, effective.pairs);
  if ('ok' in transitions && transitions.ok === false) return transitions;

  return {
    stateIds,
    effectiveEdgesByState: effective.byState,
    effectivePairs: effective.pairs,
    initialValues: initial.entries,
    initialValueByState: initial.byState,
    transitionRows: transitions.rows,
    transitionValuesByStep: transitions.maps,
    resolved
  };
}

function supportSize(stateIds: StateId[], support: LogStateSupport): number {
  let count = 0;
  for (const stateId of stateIds) count += support.get(stateId)?.size ?? 0;
  return count;
}

function addLogMass(target: LogSupport, valueTicks: number, logMass: number): void {
  target.set(valueTicks, logAddExp(target.get(valueTicks) ?? Number.NEGATIVE_INFINITY, logMass));
}

function totalLogMass(stateIds: StateId[], support: LogStateSupport): number {
  const logs: number[] = [];
  for (const stateId of stateIds) {
    for (const logMass of support.get(stateId)?.values() ?? []) logs.push(logMass);
  }
  return logSum(logs);
}

function toValueDistribution(stateIds: StateId[], support: LogStateSupport): AdditiveProbabilityAtom[] {
  const byValue = new Map<number, number>();
  for (const stateId of stateIds) {
    for (const [valueTicks, logMass] of support.get(stateId)?.entries() ?? []) {
      byValue.set(valueTicks, logAddExp(byValue.get(valueTicks) ?? Number.NEGATIVE_INFINITY, logMass));
    }
  }
  return [...byValue.entries()]
    .sort(([left], [right]) => left - right)
    .map(([valueTicks, logProbability]) => ({ valueTicks, ...probabilityView(logProbability) }));
}

function toJointDistribution(stateIds: StateId[], support: LogStateSupport): AdditiveJointStateValueAtom[] {
  const result: AdditiveJointStateValueAtom[] = [];
  for (const stateId of stateIds) {
    const entries = [...(support.get(stateId)?.entries() ?? [])].sort(([left], [right]) => left - right);
    for (const [valueTicks, logProbability] of entries) {
      result.push({ stateId, valueTicks, ...probabilityView(logProbability) });
    }
  }
  return result;
}

function countUnderflow(atoms: AdditiveProbabilityAtom[]): number {
  return atoms.reduce((count, atom) => count + (atom.probabilityUnderflowed ? 1 : 0), 0);
}

type ForwardInternal = {
  alphas: LogStateSupport[];
  trajectory: AdditiveTrajectoryDistributionStep[];
  supportAtomUnderflowCount: number;
  massChecks: number;
  maxLogMassDeviation: number;
};

function runForward(
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  prepared: PreparedFunctional
): ForwardInternal | FiniteAdditiveTrajectoryFunctionalFailure {
  const alphas: LogStateSupport[] = [];
  const trajectory: AdditiveTrajectoryDistributionStep[] = [];
  let supportAtomUnderflowCount = 0;
  let massChecks = 0;
  let maxLogMassDeviation = 0;

  const initial = new Map<StateId, LogSupport>();
  const probabilityByState = new Map(request.initialDistribution.map((entry) => [entry.stateId, entry.probability]));
  for (const stateId of prepared.stateIds) {
    const stateSupport = new Map<number, number>();
    const probability = probabilityByState.get(stateId) ?? 0;
    if (probability > 0) stateSupport.set(prepared.initialValueByState.get(stateId)!, Math.log(probability));
    initial.set(stateId, stateSupport);
  }
  alphas.push(initial);

  for (let step = 0; step <= request.horizon; step += 1) {
    const current = alphas[step]!;
    if (supportSize(prepared.stateIds, current) > prepared.resolved.maxSupportSize) {
      return failure('additive_support_limit_exceeded', `Joint state-value support exceeds maxSupportSize at step ${step}`, {
        step, actual: supportSize(prepared.stateIds, current), expected: prepared.resolved.maxSupportSize
      });
    }
    const logTotal = totalLogMass(prepared.stateIds, current);
    if (!Number.isFinite(logTotal)) {
      return failure('non_finite_additive_trajectory_functional_result', `Forward total log mass is non-finite at step ${step}`, { step });
    }
    const deviation = Math.abs(Math.expm1(logTotal));
    if (deviation > prepared.resolved.probabilityTolerance) {
      return failure('additive_forward_mass_conservation_violation', `Forward probability mass deviates from one at step ${step}`, {
        step, actual: Math.exp(logTotal), expected: 1, tolerance: prepared.resolved.probabilityTolerance
      });
    }
    massChecks += 1;
    maxLogMassDeviation = Math.max(maxLogMassDeviation, Math.abs(logTotal));
    const jointStateValueDistribution = toJointDistribution(prepared.stateIds, current);
    const valueDistribution = toValueDistribution(prepared.stateIds, current);
    supportAtomUnderflowCount += countUnderflow(valueDistribution);
    trajectory.push({ step, jointStateValueDistribution, valueDistribution });

    if (step === request.horizon) break;
    const next = new Map<StateId, LogSupport>();
    for (const stateId of prepared.stateIds) next.set(stateId, new Map<number, number>());
    const transitionValues = prepared.transitionValuesByStep[step]!;
    for (const fromStateId of prepared.stateIds) {
      const source = current.get(fromStateId)!;
      for (const [valueTicks, logMass] of source) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const increment = transitionValues.get(pairKey(edge.from, edge.to))!;
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (typeof nextValue !== 'number') return nextValue;
          addLogMass(next.get(edge.to)!, nextValue, logMass + Math.log(edge.probability));
        }
      }
    }
    alphas.push(next);
  }

  return { alphas, trajectory, supportAtomUnderflowCount, massChecks, maxLogMassDeviation };
}

function makeDiagnostics(
  prepared: PreparedFunctional,
  forward: ForwardInternal
): FiniteAdditiveTrajectoryFunctionalDiagnostics {
  return {
    method: 'sparse_log_state_value_dynamic_programming',
    numericRepresentation: 'javascript_number_float64_with_log_mass',
    simulationUsed: false,
    approximationUsed: false,
    valueDomain: 'signed_javascript_safe_integer_ticks',
    supportIdentity: 'exact_integer_equality',
    terminalSemantics: 'implicit_self_retention_with_explicit_increment',
    parallelTransitionSemantics: 'same_state_pair_shared_increment',
    probabilityNormalizationApplied: false,
    probabilityTolerance: prepared.resolved.probabilityTolerance,
    pairwiseConsistencyTolerance: prepared.resolved.pairwiseConsistencyTolerance,
    expectedCountTolerance: prepared.resolved.expectedCountTolerance,
    maxHorizon: prepared.resolved.maxHorizon,
    maxSupportSize: prepared.resolved.maxSupportSize,
    supportAtomUnderflowCount: forward.supportAtomUnderflowCount,
    massChecks: forward.massChecks,
    maxLogMassDeviation: forward.maxLogMassDeviation,
    existingCandidateACHRSTUVWXYZRequestTypesModified: false,
    parameterLearningUsed: false,
    candidateEvidenceCompositionUsed: false
  };
}

export function analyzeFiniteAdditiveTrajectoryFunctionalDistribution(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  options: FiniteAdditiveTrajectoryFunctionalOptions = {}
): FiniteAdditiveTrajectoryFunctionalDistributionResult {
  const prepared = prepareFunctional(model, request, options);
  if ('ok' in prepared && prepared.ok === false) return prepared;
  const forward = runForward(request, prepared);
  if ('ok' in forward && forward.ok === false) return forward;
  return {
    ok: true,
    possible: true,
    horizon: request.horizon,
    initialValueByState: prepared.initialValues,
    transitionValueByStep: prepared.transitionRows,
    trajectory: forward.trajectory,
    finalAggregateDistribution: forward.trajectory[forward.trajectory.length - 1]!.valueDistribution,
    diagnostics: makeDiagnostics(prepared, forward)
  };
}

function findTargetLogMass(finalSupport: LogStateSupport, stateIds: StateId[], targetValueTicks: number): number {
  let result = Number.NEGATIVE_INFINITY;
  for (const stateId of stateIds) {
    result = logAddExp(result, finalSupport.get(stateId)?.get(targetValueTicks) ?? Number.NEGATIVE_INFINITY);
  }
  return result;
}

function runBackward(
  request: FiniteAdditiveTrajectoryFunctionalConditioningRequest,
  prepared: PreparedFunctional,
  alphas: LogStateSupport[]
): LogStateSupport[] | FiniteAdditiveTrajectoryFunctionalFailure {
  const betas: LogStateSupport[] = Array.from({ length: request.horizon + 1 }, () => new Map<StateId, LogSupport>());
  const final = new Map<StateId, LogSupport>();
  for (const stateId of prepared.stateIds) {
    const values = new Map<number, number>();
    for (const valueTicks of alphas[request.horizon]!.get(stateId)?.keys() ?? []) {
      if (valueTicks === request.targetValueTicks) values.set(valueTicks, 0);
    }
    final.set(stateId, values);
  }
  betas[request.horizon] = final;

  for (let step = request.horizon - 1; step >= 0; step -= 1) {
    const currentBeta = new Map<StateId, LogSupport>();
    const transitionValues = prepared.transitionValuesByStep[step]!;
    for (const stateId of prepared.stateIds) {
      const values = new Map<number, number>();
      for (const valueTicks of alphas[step]!.get(stateId)?.keys() ?? []) {
        let logProbability = Number.NEGATIVE_INFINITY;
        for (const edge of prepared.effectiveEdgesByState.get(stateId) ?? []) {
          const increment = transitionValues.get(pairKey(edge.from, edge.to))!;
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (typeof nextValue !== 'number') return nextValue;
          const nextLog = betas[step + 1]!.get(edge.to)?.get(nextValue);
          if (nextLog === undefined) continue;
          logProbability = logAddExp(logProbability, Math.log(edge.probability) + nextLog);
        }
        if (logProbability !== Number.NEGATIVE_INFINITY) values.set(valueTicks, logProbability);
      }
      currentBeta.set(stateId, values);
    }
    betas[step] = currentBeta;
  }
  return betas;
}

function checkedDistributionMass(
  values: number[],
  tolerance: number,
  code: AdditiveTrajectoryFunctionalFailureCode,
  message: string,
  step: number
): FiniteAdditiveTrajectoryFunctionalFailure | undefined {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(code, message, { step, actual: total, expected: 1, tolerance });
  }
  return undefined;
}

export function conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalConditioningRequest,
  options: FiniteAdditiveTrajectoryFunctionalOptions = {}
): FiniteAdditiveTrajectoryFunctionalConditioningResult {
  if (!Number.isSafeInteger(request.targetValueTicks)) {
    return failure('invalid_additive_target_tick_value', 'targetValueTicks must be a JavaScript safe integer', {
      path: 'request.targetValueTicks', valueTicks: request.targetValueTicks
    });
  }
  const prepared = prepareFunctional(model, request, options);
  if ('ok' in prepared && prepared.ok === false) return prepared;
  const forward = runForward(request, prepared);
  if ('ok' in forward && forward.ok === false) return forward;
  const eventLog = findTargetLogMass(forward.alphas[request.horizon]!, prepared.stateIds, request.targetValueTicks);
  const baseDiagnostics = makeDiagnostics(prepared, forward);

  if (eventLog === Number.NEGATIVE_INFINITY) {
    return {
      ok: true,
      possible: false,
      horizon: request.horizon,
      targetValueTicks: request.targetValueTicks,
      eventProbability: 0,
      logEventProbability: null,
      smoothingSteps: null,
      pairwiseSteps: null,
      expectedTransitionCounts: null,
      diagnostics: {
        ...baseDiagnostics,
        conditioningMethod: 'exact_final_aggregate_value_log_forward_backward',
        fullEventSmoothingOnly: true,
        prefixFilteringComputed: false,
        eventProbabilityUnderflowed: false
      }
    };
  }

  const betas = runBackward(request, prepared, forward.alphas);
  if ('ok' in betas && betas.ok === false) return betas;
  const directEventProbability = Math.exp(eventLog);
  const eventProbabilityUnderflowed = directEventProbability === 0;

  const smoothingSteps: AdditiveConditionedSmoothingStep[] = [];
  for (let step = 0; step <= request.horizon; step += 1) {
    const distribution = prepared.stateIds.map((stateId) => {
      let numerator = Number.NEGATIVE_INFINITY;
      for (const [valueTicks, alphaLog] of forward.alphas[step]!.get(stateId)?.entries() ?? []) {
        const betaLog = betas[step]!.get(stateId)?.get(valueTicks);
        if (betaLog === undefined) continue;
        numerator = logAddExp(numerator, alphaLog + betaLog);
      }
      return {
        stateId,
        probability: numerator === Number.NEGATIVE_INFINITY ? 0 : Math.exp(numerator - eventLog)
      };
    });
    const massFailure = checkedDistributionMass(
      distribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'additive_conditioning_smoothing_mass_conservation_violation',
      `Conditioned smoothing mass does not sum to one at step ${step}`,
      step
    );
    if (massFailure !== undefined) return massFailure;
    smoothingSteps.push({ step, smoothedDistribution: distribution });
  }

  const pairwiseSteps: AdditiveConditionedPairwiseStep[] = [];
  const expectedCounts = new Map<string, number>();
  for (const edge of prepared.effectivePairs) expectedCounts.set(pairKey(edge.from, edge.to), 0);

  for (let step = 0; step < request.horizon; step += 1) {
    const numeratorByPair = new Map<string, number>();
    const transitionValues = prepared.transitionValuesByStep[step]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [valueTicks, alphaLog] of forward.alphas[step]!.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const increment = transitionValues.get(pairKey(edge.from, edge.to))!;
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (typeof nextValue !== 'number') return nextValue;
          const betaLog = betas[step + 1]!.get(edge.to)?.get(nextValue);
          if (betaLog === undefined) continue;
          const key = pairKey(edge.from, edge.to);
          numeratorByPair.set(
            key,
            logAddExp(numeratorByPair.get(key) ?? Number.NEGATIVE_INFINITY, alphaLog + Math.log(edge.probability) + betaLog)
          );
        }
      }
    }

    const pairwiseDistribution = prepared.effectivePairs.map((edge) => {
      const logNumerator = numeratorByPair.get(pairKey(edge.from, edge.to)) ?? Number.NEGATIVE_INFINITY;
      const probability = logNumerator === Number.NEGATIVE_INFINITY ? 0 : Math.exp(logNumerator - eventLog);
      return { fromStateId: edge.from, toStateId: edge.to, probability };
    });
    const pairMassFailure = checkedDistributionMass(
      pairwiseDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'additive_conditioning_pairwise_mass_conservation_violation',
      `Conditioned pairwise mass does not sum to one at step ${step}`,
      step
    );
    if (pairMassFailure !== undefined) return pairMassFailure;

    for (const stateId of prepared.stateIds) {
      const fromMarginal = pairwiseDistribution
        .filter((entry) => entry.fromStateId === stateId)
        .reduce((sum, entry) => sum + entry.probability, 0);
      const toMarginal = pairwiseDistribution
        .filter((entry) => entry.toStateId === stateId)
        .reduce((sum, entry) => sum + entry.probability, 0);
      const expectedFrom = smoothingSteps[step]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
      const expectedTo = smoothingSteps[step + 1]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
      if (Math.abs(fromMarginal - expectedFrom) > prepared.resolved.pairwiseConsistencyTolerance ||
          Math.abs(toMarginal - expectedTo) > prepared.resolved.pairwiseConsistencyTolerance) {
        return failure(
          'additive_conditioning_pairwise_marginal_consistency_violation',
          `Conditioned pairwise marginal mismatch for state ${stateId} at step ${step}`,
          { step, stateId, tolerance: prepared.resolved.pairwiseConsistencyTolerance }
        );
      }
    }

    for (const entry of pairwiseDistribution) {
      const key = pairKey(entry.fromStateId, entry.toStateId);
      expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + entry.probability);
    }
    pairwiseSteps.push({ step, pairwiseDistribution });
  }

  const expectedTransitionCounts = prepared.effectivePairs.map((edge) => ({
    fromStateId: edge.from,
    toStateId: edge.to,
    expectedCount: expectedCounts.get(pairKey(edge.from, edge.to)) ?? 0
  }));
  const totalExpectedCount = expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  if (Math.abs(totalExpectedCount - request.horizon) > prepared.resolved.expectedCountTolerance) {
    return failure(
      'additive_conditioning_expected_transition_count_conservation_violation',
      'Conditioned expected transition counts do not sum to the horizon',
      { actual: totalExpectedCount, expected: request.horizon, tolerance: prepared.resolved.expectedCountTolerance }
    );
  }

  return {
    ok: true,
    possible: true,
    horizon: request.horizon,
    targetValueTicks: request.targetValueTicks,
    eventProbability: eventProbabilityUnderflowed ? null : directEventProbability,
    logEventProbability: eventLog,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    diagnostics: {
      ...baseDiagnostics,
      conditioningMethod: 'exact_final_aggregate_value_log_forward_backward',
      fullEventSmoothingOnly: true,
      prefixFilteringComputed: false,
      eventProbabilityUnderflowed
    }
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

export function finiteAdditiveTrajectoryFunctionalDistributionResultToJson(
  result: FiniteAdditiveTrajectoryFunctionalDistributionResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AA distribution result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}

export function finiteAdditiveTrajectoryFunctionalConditioningResultToJson(
  result: FiniteAdditiveTrajectoryFunctionalConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AA conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}
