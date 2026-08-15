import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  AdditiveInitialValueEntry,
  AdditiveTransitionValueEntry,
  FiniteAdditiveTrajectoryFunctionalOptions,
  FiniteAdditiveTrajectoryFunctionalRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution
} from './finite_additive_trajectory_functional';
import { CalibratedEvidenceLikelihoodEntry } from './hidden_state_calibrated_evidence_likelihood_conditioning';

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest =
  FiniteAdditiveTrajectoryFunctionalRequest & {
    evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
  };

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningRequest =
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest & {
    targetValueTicks: number;
  };

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceOptions =
  FiniteAdditiveTrajectoryFunctionalOptions;

export type AdditiveCalibratedEvidenceProbabilityAtom = {
  valueTicks: number;
  probability: number | null;
  logProbability: number;
  probabilityUnderflowed: boolean;
};

export type AdditiveCalibratedEvidenceJointStateValueAtom =
  AdditiveCalibratedEvidenceProbabilityAtom & { stateId: StateId };

export type AdditiveCalibratedEvidencePrefixStep = {
  step: number;
  calibratedEvidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[];
  prefixEvidenceProbability: number | null;
  prefixLogEvidenceProbability: number;
  prefixEvidenceProbabilityUnderflowed: boolean;
  jointStateValueDistribution: AdditiveCalibratedEvidenceJointStateValueAtom[];
  valueDistribution: AdditiveCalibratedEvidenceProbabilityAtom[];
};

export type AdditiveCalibratedEvidenceJointAggregateAtom = {
  valueTicks: number;
  jointProbability: number | null;
  logJointProbability: number;
  jointProbabilityUnderflowed: boolean;
  conditionalProbability: number | null;
  logConditionalProbability: number;
  conditionalProbabilityUnderflowed: boolean;
};

export type AdditiveCalibratedEvidenceConditionedStateDistribution = Array<{
  stateId: StateId;
  probability: number;
}>;

export type AdditiveCalibratedEvidenceConditionedSmoothingStep = {
  step: number;
  smoothedDistribution: AdditiveCalibratedEvidenceConditionedStateDistribution;
};

export type AdditiveCalibratedEvidenceConditionedPairwiseEntry = {
  fromStateId: StateId;
  toStateId: StateId;
  probability: number;
};

export type AdditiveCalibratedEvidenceConditionedPairwiseStep = {
  step: number;
  pairwiseDistribution: AdditiveCalibratedEvidenceConditionedPairwiseEntry[];
};

export type AdditiveCalibratedEvidenceConditionedExpectedTransitionCount = {
  fromStateId: StateId;
  toStateId: StateId;
  expectedCount: number;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceDiagnostics = {
  method: 'sparse_log_augmented_state_value_calibrated_evidence_dynamic_programming';
  numericRepresentation: 'javascript_number_float64_with_log_mass';
  simulationUsed: false;
  approximationUsed: false;
  valueDomain: 'signed_javascript_safe_integer_ticks';
  supportIdentity: 'exact_integer_equality';
  evidenceSemantics: 'absolute_calibrated_local_likelihood';
  evidenceFactorization: 'state_local_conditionally_independent_by_time';
  absoluteEvidenceScalePreserved: true;
  inputNormalizationApplied: false;
  terminalSemantics: 'implicit_self_retention_with_explicit_increment';
  parallelTransitionSemantics: 'same_state_pair_shared_increment';
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxHorizon: number;
  maxSupportSize: number;
  evidenceStepsRequested: number;
  evidenceStepsProcessed: number;
  impossibleAtStep: number | null;
  evidenceProbabilityUnderflowed: boolean;
  supportAtomUnderflowCount: number;
  candidateAAValidationReused: true;
  existingQualifiedRequestTypesModified: false;
  parameterLearningUsed: false;
  viterbiComputed: false;
  mapTrajectoryComputed: false;
  causalInterventionUsed: false;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningDiagnostics =
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceDiagnostics & {
    conditioningMethod: 'exact_joint_evidence_aggregate_log_forward_backward';
    jointEventProbabilityUnderflowed: boolean;
    aggregateOnlyPossible: boolean;
    evidenceOnlyPossible: boolean;
  };

export type AdditiveCalibratedEvidenceJointFailureCode =
  | 'invalid_additive_calibrated_evidence_joint_request'
  | 'invalid_additive_calibrated_evidence_horizon'
  | 'additive_calibrated_evidence_length_mismatch'
  | 'invalid_additive_calibrated_evidence_likelihood_row'
  | 'missing_additive_calibrated_evidence_likelihood_state'
  | 'unknown_additive_calibrated_evidence_likelihood_state'
  | 'duplicate_additive_calibrated_evidence_likelihood_state'
  | 'invalid_additive_calibrated_evidence_likelihood'
  | 'invalid_additive_calibrated_evidence_tick_value'
  | 'unsafe_additive_calibrated_evidence_cumulative_tick_value'
  | 'invalid_additive_calibrated_evidence_target_tick_value'
  | 'additive_calibrated_evidence_support_limit_exceeded'
  | 'additive_calibrated_evidence_forward_mass_conservation_violation'
  | 'additive_calibrated_evidence_conditioning_smoothing_mass_conservation_violation'
  | 'additive_calibrated_evidence_conditioning_pairwise_mass_conservation_violation'
  | 'additive_calibrated_evidence_conditioning_pairwise_marginal_consistency_violation'
  | 'additive_calibrated_evidence_expected_transition_count_conservation_violation'
  | 'internal_additive_calibrated_evidence_joint_structural_inconsistency'
  | 'non_finite_additive_calibrated_evidence_joint_result';

export type AdditiveCalibratedEvidenceJointFailure = {
  code: AdditiveCalibratedEvidenceJointFailureCode;
  message: string;
  path?: string | undefined;
  step?: number | undefined;
  stateId?: StateId | undefined;
  fromStateId?: StateId | undefined;
  toStateId?: StateId | undefined;
  valueTicks?: number | undefined;
  actual?: number | undefined;
  expected?: number | undefined;
  tolerance?: number | undefined;
  sourceFailureCode?: string | undefined;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure = {
  ok: false;
  failure: AdditiveCalibratedEvidenceJointFailure;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceSuccess = {
  ok: true;
  possible: boolean;
  horizon: number;
  initialValueByState: AdditiveInitialValueEntry[];
  transitionValueByStep: AdditiveTransitionValueEntry[][];
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][];
  trajectory: AdditiveCalibratedEvidencePrefixStep[];
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  finalEvidenceConditionedAggregateDistribution: AdditiveCalibratedEvidenceProbabilityAtom[] | null;
  jointEvidenceAggregateDistribution: AdditiveCalibratedEvidenceJointAggregateAtom[] | null;
  diagnostics: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceDiagnostics;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult =
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceSuccess
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure;

export type AdditiveCalibratedEvidenceImpossibility = 'evidence' | 'aggregate' | 'joint' | null;

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningSuccess = {
  ok: true;
  possible: boolean;
  evidencePossible: boolean;
  aggregatePossible: boolean;
  jointPossible: boolean;
  impossibility: AdditiveCalibratedEvidenceImpossibility;
  horizon: number;
  targetValueTicks: number;
  evidenceProbability: number | null;
  logEvidenceProbability: number | null;
  unconditionalTargetProbability: number | null;
  unconditionalTargetLogProbability: number | null;
  jointEventProbability: number | null;
  logJointEventProbability: number | null;
  targetConditionalProbabilityGivenEvidence: number | null;
  logTargetConditionalProbabilityGivenEvidence: number | null;
  smoothingSteps: AdditiveCalibratedEvidenceConditionedSmoothingStep[] | null;
  pairwiseSteps: AdditiveCalibratedEvidenceConditionedPairwiseStep[] | null;
  expectedTransitionCounts: AdditiveCalibratedEvidenceConditionedExpectedTransitionCount[] | null;
  diagnostics: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningDiagnostics;
};

export type FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult =
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningSuccess
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure;

type EffectiveEdge = { from: StateId; to: StateId; probability: number };
type LogSupport = Map<number, number>;
type LogStateSupport = Map<StateId, LogSupport>;

type ResolvedOptions = {
  probabilityTolerance: number;
  pairwiseConsistencyTolerance: number;
  expectedCountTolerance: number;
  maxHorizon: number;
  maxSupportSize: number;
};

type Prepared = {
  stateIds: StateId[];
  effectiveEdgesByState: Map<StateId, EffectiveEdge[]>;
  effectivePairs: EffectiveEdge[];
  initialValues: AdditiveInitialValueEntry[];
  initialValueByState: Map<StateId, number>;
  transitionRows: AdditiveTransitionValueEntry[][];
  transitionValuesByStep: Array<Map<string, number>>;
  evidenceRows: CalibratedEvidenceLikelihoodEntry[][];
  evidenceMaps: Array<Map<StateId, number>>;
  initialDistribution: Map<StateId, number>;
  resolved: ResolvedOptions;
  unconditionalAggregate: Array<{
    valueTicks: number;
    probability: number | null;
    logProbability: number;
    probabilityUnderflowed: boolean;
  }>;
};

type PreparedResult =
  | { ok: true; prepared: Prepared }
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure;

type ForwardInternal = {
  alphas: LogStateSupport[];
  trajectory: AdditiveCalibratedEvidencePrefixStep[];
  evidenceLogProbability: number | null;
  impossibleAtStep: number | null;
  supportAtomUnderflowCount: number;
};

type ForwardResult =
  | { ok: true; forward: ForwardInternal }
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure;

type SafeAddResult =
  | { ok: true; value: number }
  | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_MAX_HORIZON = 10_000;
const DEFAULT_MAX_SUPPORT_SIZE = 100_000;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pairKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function failure(
  code: AdditiveCalibratedEvidenceJointFailureCode,
  message: string,
  details: Omit<AdditiveCalibratedEvidenceJointFailure, 'code' | 'message'> = {}
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure {
  return { ok: false, failure: { code, message, ...details } };
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

function directProbability(logProbability: number): number | null {
  const direct = Math.exp(logProbability);
  return direct === 0 ? null : direct;
}

function probabilityView(logProbability: number): Pick<AdditiveCalibratedEvidenceProbabilityAtom, 'probability' | 'logProbability' | 'probabilityUnderflowed'> {
  const probability = directProbability(logProbability);
  return { probability, logProbability, probabilityUnderflowed: probability === null };
}

function checkedSafeAdd(
  left: number,
  right: number,
  step: number,
  fromStateId: StateId,
  toStateId: StateId
): SafeAddResult {
  const value = left + right;
  if (!Number.isSafeInteger(value)) {
    return failure(
      'unsafe_additive_calibrated_evidence_cumulative_tick_value',
      `Cumulative tick value is outside exact JavaScript safe-integer range at step ${step}`,
      { step, fromStateId, toStateId, valueTicks: value }
    );
  }
  return { ok: true, value };
}

function mapAaFailure(source: { failure: { code: string; message: string } }): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure {
  const sourceCode = source.failure.code;
  let code: AdditiveCalibratedEvidenceJointFailureCode = 'invalid_additive_calibrated_evidence_joint_request';
  if (sourceCode.includes('support_limit')) code = 'additive_calibrated_evidence_support_limit_exceeded';
  else if (sourceCode.includes('unsafe_additive_cumulative')) code = 'unsafe_additive_calibrated_evidence_cumulative_tick_value';
  else if (sourceCode.includes('horizon')) code = 'invalid_additive_calibrated_evidence_horizon';
  else if (sourceCode.includes('tick')) code = 'invalid_additive_calibrated_evidence_tick_value';
  return failure(code, source.failure.message, { sourceFailureCode: sourceCode });
}

function resolveOptions(
  options: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceOptions,
  horizon: number
): { ok: true; resolved: ResolvedOptions } | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  const pairwiseConsistencyTolerance = options.pairwiseConsistencyTolerance ?? probabilityTolerance * 20;
  const expectedCountTolerance = options.expectedCountTolerance ?? pairwiseConsistencyTolerance * Math.max(1, horizon);
  const maxHorizon = options.maxHorizon ?? DEFAULT_MAX_HORIZON;
  const maxSupportSize = options.maxSupportSize ?? DEFAULT_MAX_SUPPORT_SIZE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure('invalid_additive_calibrated_evidence_joint_request', 'probabilityTolerance must be finite and positive', { path: 'options.probabilityTolerance' });
  }
  if (!Number.isFinite(pairwiseConsistencyTolerance) || pairwiseConsistencyTolerance <= 0) {
    return failure('invalid_additive_calibrated_evidence_joint_request', 'pairwiseConsistencyTolerance must be finite and positive', { path: 'options.pairwiseConsistencyTolerance' });
  }
  if (!Number.isFinite(expectedCountTolerance) || expectedCountTolerance <= 0) {
    return failure('invalid_additive_calibrated_evidence_joint_request', 'expectedCountTolerance must be finite and positive', { path: 'options.expectedCountTolerance' });
  }
  if (!Number.isInteger(maxHorizon) || maxHorizon < 0) {
    return failure('invalid_additive_calibrated_evidence_horizon', 'maxHorizon must be a non-negative integer', { path: 'options.maxHorizon' });
  }
  if (!Number.isInteger(maxSupportSize) || maxSupportSize <= 0) {
    return failure('additive_calibrated_evidence_support_limit_exceeded', 'maxSupportSize must be a positive integer', { path: 'options.maxSupportSize' });
  }
  return {
    ok: true,
    resolved: { probabilityTolerance, pairwiseConsistencyTolerance, expectedCountTolerance, maxHorizon, maxSupportSize }
  };
}

function buildEffectiveEdges(model: DefinitionModel): {
  byState: Map<StateId, EffectiveEdge[]>;
  pairs: EffectiveEdge[];
} {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const terminal = new Set(model.states.filter((state) => isTerminalState(state)).map((state) => state.id));
  const byState = new Map<StateId, EffectiveEdge[]>();
  const pairs = new Map<string, EffectiveEdge>();
  for (const stateId of stateIds) {
    if (terminal.has(stateId)) {
      const edge = { from: stateId, to: stateId, probability: 1 };
      byState.set(stateId, [edge]);
      pairs.set(pairKey(stateId, stateId), edge);
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
    for (const edge of edges) pairs.set(pairKey(edge.from, edge.to), edge);
  }
  return {
    byState,
    pairs: [...pairs.values()].sort((left, right) => {
      const order = compareStrings(left.from, right.from);
      return order !== 0 ? order : compareStrings(left.to, right.to);
    })
  };
}

function canonicalizeEvidenceRows(
  evidenceLikelihoods: CalibratedEvidenceLikelihoodEntry[][],
  stateIds: StateId[],
  horizon: number
): { ok: true; rows: CalibratedEvidenceLikelihoodEntry[][]; maps: Array<Map<StateId, number>> } | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure {
  if (!Array.isArray(evidenceLikelihoods) || evidenceLikelihoods.length !== horizon + 1) {
    return failure(
      'additive_calibrated_evidence_length_mismatch',
      `evidenceLikelihoods must contain exactly horizon+1=${horizon + 1} rows`,
      { path: 'request.evidenceLikelihoods', actual: Array.isArray(evidenceLikelihoods) ? evidenceLikelihoods.length : -1, expected: horizon + 1 }
    );
  }
  const known = new Set(stateIds);
  const rows: CalibratedEvidenceLikelihoodEntry[][] = [];
  const maps: Array<Map<StateId, number>> = [];
  for (let step = 0; step < evidenceLikelihoods.length; step += 1) {
    const row = evidenceLikelihoods[step];
    if (!Array.isArray(row)) {
      return failure('invalid_additive_calibrated_evidence_likelihood_row', `evidenceLikelihoods[${step}] must be an array`, { step });
    }
    const seen = new Set<StateId>();
    const byState = new Map<StateId, number>();
    for (let index = 0; index < row.length; index += 1) {
      const entry = row[index];
      if (entry === undefined || typeof entry.stateId !== 'string') {
        return failure('invalid_additive_calibrated_evidence_likelihood_row', `evidenceLikelihoods[${step}][${index}] requires string stateId`, { step });
      }
      if (!known.has(entry.stateId)) {
        return failure('unknown_additive_calibrated_evidence_likelihood_state', `Unknown evidence state: ${entry.stateId}`, { step, stateId: entry.stateId });
      }
      if (seen.has(entry.stateId)) {
        return failure('duplicate_additive_calibrated_evidence_likelihood_state', `Duplicate evidence state: ${entry.stateId}`, { step, stateId: entry.stateId });
      }
      if (!Number.isFinite(entry.likelihood) || entry.likelihood < 0 || entry.likelihood > 1) {
        return failure('invalid_additive_calibrated_evidence_likelihood', 'Calibrated evidence likelihood must be an absolute probability in [0,1]', { step, stateId: entry.stateId, actual: entry.likelihood });
      }
      seen.add(entry.stateId);
      byState.set(entry.stateId, entry.likelihood);
    }
    for (const stateId of stateIds) {
      if (!seen.has(stateId)) {
        return failure('missing_additive_calibrated_evidence_likelihood_state', `Missing evidence state: ${stateId}`, { step, stateId });
      }
    }
    rows.push(stateIds.map((stateId) => ({ stateId, likelihood: byState.get(stateId)! })));
    maps.push(byState);
  }
  return { ok: true, rows, maps };
}

function prepare(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  options: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceOptions
): PreparedResult {
  if (request === null || typeof request !== 'object') {
    return failure('invalid_additive_calibrated_evidence_joint_request', 'request must be an object', { path: 'request' });
  }
  if (!Number.isSafeInteger(request.horizon) || request.horizon < 0) {
    return failure('invalid_additive_calibrated_evidence_horizon', 'horizon must be a non-negative safe integer', { path: 'request.horizon' });
  }
  const resolvedResult = resolveOptions(options, request.horizon);
  if (!resolvedResult.ok) return resolvedResult;
  const resolved = resolvedResult.resolved;
  if (request.horizon > resolved.maxHorizon) {
    return failure('invalid_additive_calibrated_evidence_horizon', `horizon ${request.horizon} exceeds maxHorizon ${resolved.maxHorizon}`);
  }
  const aaRequest: FiniteAdditiveTrajectoryFunctionalRequest = {
    initialDistribution: request.initialDistribution,
    horizon: request.horizon,
    initialValueByState: request.initialValueByState,
    transitionValueByStep: request.transitionValueByStep
  };
  const aa = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, aaRequest, options);
  if (!aa.ok) return mapAaFailure(aa);
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const evidenceResult = canonicalizeEvidenceRows(request.evidenceLikelihoods, stateIds, request.horizon);
  if (!evidenceResult.ok) return evidenceResult;
  const effective = buildEffectiveEdges(model);
  const initialDistribution = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  for (const entry of request.initialDistribution) initialDistribution.set(entry.stateId, entry.probability);
  return {
    ok: true,
    prepared: {
      stateIds,
      effectiveEdgesByState: effective.byState,
      effectivePairs: effective.pairs,
      initialValues: aa.initialValueByState,
      initialValueByState: new Map(aa.initialValueByState.map((entry) => [entry.stateId, entry.valueTicks] as const)),
      transitionRows: aa.transitionValueByStep,
      transitionValuesByStep: aa.transitionValueByStep.map((row) => new Map(
        row.map((entry) => [pairKey(entry.fromStateId, entry.toStateId), entry.valueTicks] as const)
      )),
      evidenceRows: evidenceResult.rows,
      evidenceMaps: evidenceResult.maps,
      initialDistribution,
      resolved,
      unconditionalAggregate: aa.finalAggregateDistribution
    }
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
  const values: number[] = [];
  for (const stateId of stateIds) {
    for (const logMass of support.get(stateId)?.values() ?? []) values.push(logMass);
  }
  return logSum(values);
}

function conditionalJointDistribution(
  stateIds: StateId[], support: LogStateSupport, logNormalizer: number
): AdditiveCalibratedEvidenceJointStateValueAtom[] {
  const result: AdditiveCalibratedEvidenceJointStateValueAtom[] = [];
  for (const stateId of stateIds) {
    const entries = [...(support.get(stateId)?.entries() ?? [])].sort(([left], [right]) => left - right);
    for (const [valueTicks, logMass] of entries) {
      result.push({ stateId, valueTicks, ...probabilityView(logMass - logNormalizer) });
    }
  }
  return result;
}

function conditionalValueDistribution(
  stateIds: StateId[], support: LogStateSupport, logNormalizer: number
): AdditiveCalibratedEvidenceProbabilityAtom[] {
  const byValue = new Map<number, number>();
  for (const stateId of stateIds) {
    for (const [valueTicks, logMass] of support.get(stateId)?.entries() ?? []) {
      byValue.set(valueTicks, logAddExp(byValue.get(valueTicks) ?? Number.NEGATIVE_INFINITY, logMass));
    }
  }
  return [...byValue.entries()]
    .sort(([left], [right]) => left - right)
    .map(([valueTicks, logMass]) => ({ valueTicks, ...probabilityView(logMass - logNormalizer) }));
}

function runForward(
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  prepared: Prepared
): ForwardResult {
  const alphas: LogStateSupport[] = [];
  const trajectory: AdditiveCalibratedEvidencePrefixStep[] = [];
  let supportAtomUnderflowCount = 0;
  let previousLogEvidence = 0;
  const initial = new Map<StateId, LogSupport>();
  const row0 = prepared.evidenceMaps[0]!;
  for (const stateId of prepared.stateIds) {
    const values = new Map<number, number>();
    const probability = prepared.initialDistribution.get(stateId) ?? 0;
    const likelihood = row0.get(stateId) ?? 0;
    if (probability > 0 && likelihood > 0) {
      values.set(prepared.initialValueByState.get(stateId)!, Math.log(probability) + Math.log(likelihood));
    }
    initial.set(stateId, values);
  }
  alphas.push(initial);

  for (let step = 0; step <= request.horizon; step += 1) {
    const current = alphas[step]!;
    const size = supportSize(prepared.stateIds, current);
    if (size > prepared.resolved.maxSupportSize) {
      return failure('additive_calibrated_evidence_support_limit_exceeded', `Joint state/value support exceeds maxSupportSize at step ${step}`, {
        step, actual: size, expected: prepared.resolved.maxSupportSize
      });
    }
    const logEvidence = totalLogMass(prepared.stateIds, current);
    if (logEvidence === Number.NEGATIVE_INFINITY) {
      return {
        ok: true,
        forward: { alphas, trajectory, evidenceLogProbability: null, impossibleAtStep: step, supportAtomUnderflowCount }
      };
    }
    if (!Number.isFinite(logEvidence) || logEvidence > prepared.resolved.probabilityTolerance * 20) {
      return failure('additive_calibrated_evidence_forward_mass_conservation_violation', 'Evidence prefix mass is invalid', { step, actual: logEvidence });
    }
    if (step > 0 && logEvidence > previousLogEvidence + prepared.resolved.probabilityTolerance * 20) {
      return failure('additive_calibrated_evidence_forward_mass_conservation_violation', 'Evidence prefix probability increased after adding evidence', { step });
    }
    const joint = conditionalJointDistribution(prepared.stateIds, current, logEvidence);
    const values = conditionalValueDistribution(prepared.stateIds, current, logEvidence);
    supportAtomUnderflowCount += joint.filter((atom) => atom.probabilityUnderflowed).length;
    supportAtomUnderflowCount += values.filter((atom) => atom.probabilityUnderflowed).length;
    const prefixEvidenceProbability = directProbability(logEvidence);
    trajectory.push({
      step,
      calibratedEvidenceLikelihoods: prepared.evidenceRows[step]!.map((entry) => ({ ...entry })),
      prefixEvidenceProbability,
      prefixLogEvidenceProbability: logEvidence,
      prefixEvidenceProbabilityUnderflowed: prefixEvidenceProbability === null,
      jointStateValueDistribution: joint,
      valueDistribution: values
    });
    previousLogEvidence = logEvidence;
    if (step === request.horizon) break;

    const next = new Map<StateId, LogSupport>(prepared.stateIds.map((stateId) => [stateId, new Map<number, number>()]));
    const transitionValues = prepared.transitionValuesByStep[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [valueTicks, logMass] of current.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = nextEvidence.get(edge.to) ?? 0;
          if (likelihood === 0) continue;
          const increment = transitionValues.get(pairKey(edge.from, edge.to));
          if (increment === undefined) {
            return failure('internal_additive_calibrated_evidence_joint_structural_inconsistency', 'Missing transition value', { step: step + 1 });
          }
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (!nextValue.ok) return nextValue;
          addLogMass(next.get(edge.to)!, nextValue.value, logMass + Math.log(edge.probability) + Math.log(likelihood));
        }
      }
    }
    alphas.push(next);
  }
  return {
    ok: true,
    forward: { alphas, trajectory, evidenceLogProbability: previousLogEvidence, impossibleAtStep: null, supportAtomUnderflowCount }
  };
}

function makeDiagnostics(
  prepared: Prepared,
  forward: ForwardInternal
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceDiagnostics {
  return {
    method: 'sparse_log_augmented_state_value_calibrated_evidence_dynamic_programming',
    numericRepresentation: 'javascript_number_float64_with_log_mass',
    simulationUsed: false,
    approximationUsed: false,
    valueDomain: 'signed_javascript_safe_integer_ticks',
    supportIdentity: 'exact_integer_equality',
    evidenceSemantics: 'absolute_calibrated_local_likelihood',
    evidenceFactorization: 'state_local_conditionally_independent_by_time',
    absoluteEvidenceScalePreserved: true,
    inputNormalizationApplied: false,
    terminalSemantics: 'implicit_self_retention_with_explicit_increment',
    parallelTransitionSemantics: 'same_state_pair_shared_increment',
    probabilityTolerance: prepared.resolved.probabilityTolerance,
    pairwiseConsistencyTolerance: prepared.resolved.pairwiseConsistencyTolerance,
    expectedCountTolerance: prepared.resolved.expectedCountTolerance,
    maxHorizon: prepared.resolved.maxHorizon,
    maxSupportSize: prepared.resolved.maxSupportSize,
    evidenceStepsRequested: prepared.evidenceRows.length,
    evidenceStepsProcessed: forward.impossibleAtStep === null ? prepared.evidenceRows.length : forward.impossibleAtStep + 1,
    impossibleAtStep: forward.impossibleAtStep,
    evidenceProbabilityUnderflowed: forward.evidenceLogProbability !== null && directProbability(forward.evidenceLogProbability) === null,
    supportAtomUnderflowCount: forward.supportAtomUnderflowCount,
    candidateAAValidationReused: true,
    existingQualifiedRequestTypesModified: false,
    parameterLearningUsed: false,
    viterbiComputed: false,
    mapTrajectoryComputed: false,
    causalInterventionUsed: false
  };
}

function finalJointAggregate(prepared: Prepared, forward: ForwardInternal): AdditiveCalibratedEvidenceJointAggregateAtom[] {
  const logEvidence = forward.evidenceLogProbability!;
  const final = forward.alphas[forward.alphas.length - 1]!;
  const byValue = new Map<number, number>();
  for (const stateId of prepared.stateIds) {
    for (const [valueTicks, logMass] of final.get(stateId)?.entries() ?? []) {
      byValue.set(valueTicks, logAddExp(byValue.get(valueTicks) ?? Number.NEGATIVE_INFINITY, logMass));
    }
  }
  return [...byValue.entries()].sort(([left], [right]) => left - right).map(([valueTicks, logJointProbability]) => {
    const jointProbability = directProbability(logJointProbability);
    const logConditionalProbability = logJointProbability - logEvidence;
    const conditionalProbability = directProbability(logConditionalProbability);
    return {
      valueTicks,
      jointProbability,
      logJointProbability,
      jointProbabilityUnderflowed: jointProbability === null,
      conditionalProbability,
      logConditionalProbability,
      conditionalProbabilityUnderflowed: conditionalProbability === null
    };
  });
}

export function analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  options: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceOptions = {}
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult {
  const preparedResult = prepare(model, request, options);
  if (!preparedResult.ok) return preparedResult;
  const prepared = preparedResult.prepared;
  const forwardResult = runForward(request, prepared);
  if (!forwardResult.ok) return forwardResult;
  const forward = forwardResult.forward;
  const diagnostics = makeDiagnostics(prepared, forward);
  if (forward.evidenceLogProbability === null) {
    return {
      ok: true, possible: false, horizon: request.horizon,
      initialValueByState: prepared.initialValues, transitionValueByStep: prepared.transitionRows,
      evidenceLikelihoods: prepared.evidenceRows, trajectory: forward.trajectory,
      evidenceProbability: 0, logEvidenceProbability: null,
      finalEvidenceConditionedAggregateDistribution: null, jointEvidenceAggregateDistribution: null,
      diagnostics
    };
  }
  const joint = finalJointAggregate(prepared, forward);
  return {
    ok: true, possible: true, horizon: request.horizon,
    initialValueByState: prepared.initialValues, transitionValueByStep: prepared.transitionRows,
    evidenceLikelihoods: prepared.evidenceRows, trajectory: forward.trajectory,
    evidenceProbability: directProbability(forward.evidenceLogProbability),
    logEvidenceProbability: forward.evidenceLogProbability,
    finalEvidenceConditionedAggregateDistribution: joint.map((atom) => ({
      valueTicks: atom.valueTicks,
      probability: atom.conditionalProbability,
      logProbability: atom.logConditionalProbability,
      probabilityUnderflowed: atom.conditionalProbabilityUnderflowed
    })),
    jointEvidenceAggregateDistribution: joint,
    diagnostics
  };
}

function targetUnconditional(prepared: Prepared, targetValueTicks: number): {
  possible: boolean;
  probability: number | null;
  logProbability: number | null;
} {
  const atom = prepared.unconditionalAggregate.find((entry) => entry.valueTicks === targetValueTicks);
  return atom === undefined
    ? { possible: false, probability: 0, logProbability: null }
    : { possible: true, probability: atom.probability, logProbability: atom.logProbability };
}

function targetJointLogMass(prepared: Prepared, forward: ForwardInternal, targetValueTicks: number): number {
  const final = forward.alphas[forward.alphas.length - 1]!;
  let total = Number.NEGATIVE_INFINITY;
  for (const stateId of prepared.stateIds) {
    total = logAddExp(total, final.get(stateId)?.get(targetValueTicks) ?? Number.NEGATIVE_INFINITY);
  }
  return total;
}

function runBackward(
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  forward: ForwardInternal
): { ok: true; betas: LogStateSupport[] } | FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure {
  const betas: LogStateSupport[] = Array.from(
    { length: request.horizon + 1 },
    () => new Map<StateId, LogSupport>()
  );
  const final = new Map<StateId, LogSupport>();
  for (const stateId of prepared.stateIds) {
    const values = new Map<number, number>();
    for (const valueTicks of forward.alphas[request.horizon]!.get(stateId)?.keys() ?? []) {
      if (valueTicks === request.targetValueTicks) values.set(valueTicks, 0);
    }
    final.set(stateId, values);
  }
  betas[request.horizon] = final;
  for (let step = request.horizon - 1; step >= 0; step -= 1) {
    const current = new Map<StateId, LogSupport>();
    const transitionValues = prepared.transitionValuesByStep[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      const values = new Map<number, number>();
      for (const valueTicks of forward.alphas[step]!.get(fromStateId)?.keys() ?? []) {
        let total = Number.NEGATIVE_INFINITY;
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = nextEvidence.get(edge.to) ?? 0;
          if (likelihood === 0) continue;
          const increment = transitionValues.get(pairKey(edge.from, edge.to));
          if (increment === undefined) {
            return failure('internal_additive_calibrated_evidence_joint_structural_inconsistency', 'Missing backward transition value', { step: step + 1 });
          }
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (!nextValue.ok) return nextValue;
          const future = betas[step + 1]!.get(edge.to)?.get(nextValue.value);
          if (future === undefined) continue;
          total = logAddExp(total, Math.log(edge.probability) + Math.log(likelihood) + future);
        }
        if (total !== Number.NEGATIVE_INFINITY) values.set(valueTicks, total);
      }
      current.set(fromStateId, values);
    }
    betas[step] = current;
  }
  return { ok: true, betas };
}

function checkedMass(
  values: number[], tolerance: number, code: AdditiveCalibratedEvidenceJointFailureCode, message: string, step: number
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceFailure | undefined {
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(code, message, { step, actual: total, expected: 1, tolerance });
  }
  return undefined;
}

function impossibleConditioningResult(
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningRequest,
  prepared: Prepared,
  forward: ForwardInternal,
  aggregate: { possible: boolean; probability: number | null; logProbability: number | null },
  impossibility: AdditiveCalibratedEvidenceImpossibility
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningSuccess {
  const evidencePossible = forward.evidenceLogProbability !== null;
  return {
    ok: true,
    possible: false,
    evidencePossible,
    aggregatePossible: aggregate.possible,
    jointPossible: false,
    impossibility,
    horizon: request.horizon,
    targetValueTicks: request.targetValueTicks,
    evidenceProbability: evidencePossible ? directProbability(forward.evidenceLogProbability!) : 0,
    logEvidenceProbability: forward.evidenceLogProbability,
    unconditionalTargetProbability: aggregate.probability,
    unconditionalTargetLogProbability: aggregate.logProbability,
    jointEventProbability: 0,
    logJointEventProbability: null,
    targetConditionalProbabilityGivenEvidence: evidencePossible ? 0 : null,
    logTargetConditionalProbabilityGivenEvidence: null,
    smoothingSteps: null,
    pairwiseSteps: null,
    expectedTransitionCounts: null,
    diagnostics: {
      ...makeDiagnostics(prepared, forward),
      conditioningMethod: 'exact_joint_evidence_aggregate_log_forward_backward',
      jointEventProbabilityUnderflowed: false,
      aggregateOnlyPossible: aggregate.possible,
      evidenceOnlyPossible: evidencePossible
    }
  };
}

export function conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(
  model: DefinitionModel,
  request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningRequest,
  options: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceOptions = {}
): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult {
  if (!Number.isSafeInteger(request.targetValueTicks)) {
    return failure('invalid_additive_calibrated_evidence_target_tick_value', 'targetValueTicks must be a JavaScript safe integer', {
      path: 'request.targetValueTicks', valueTicks: request.targetValueTicks
    });
  }
  const preparedResult = prepare(model, request, options);
  if (!preparedResult.ok) return preparedResult;
  const prepared = preparedResult.prepared;
  const forwardResult = runForward(request, prepared);
  if (!forwardResult.ok) return forwardResult;
  const forward = forwardResult.forward;
  const aggregate = targetUnconditional(prepared, request.targetValueTicks);
  if (forward.evidenceLogProbability === null) return impossibleConditioningResult(request, prepared, forward, aggregate, 'evidence');
  if (!aggregate.possible) return impossibleConditioningResult(request, prepared, forward, aggregate, 'aggregate');
  const jointLog = targetJointLogMass(prepared, forward, request.targetValueTicks);
  if (jointLog === Number.NEGATIVE_INFINITY) return impossibleConditioningResult(request, prepared, forward, aggregate, 'joint');
  if (!Number.isFinite(jointLog)) {
    return failure('non_finite_additive_calibrated_evidence_joint_result', 'Joint evidence/aggregate log probability is invalid', { actual: jointLog });
  }
  const backwardResult = runBackward(request, prepared, forward);
  if (!backwardResult.ok) return backwardResult;
  const betas = backwardResult.betas;
  const smoothingSteps: AdditiveCalibratedEvidenceConditionedSmoothingStep[] = [];
  for (let step = 0; step <= request.horizon; step += 1) {
    const distribution = prepared.stateIds.map((stateId) => {
      let numerator = Number.NEGATIVE_INFINITY;
      for (const [valueTicks, alphaLog] of forward.alphas[step]!.get(stateId)?.entries() ?? []) {
        const betaLog = betas[step]!.get(stateId)?.get(valueTicks);
        if (betaLog !== undefined) numerator = logAddExp(numerator, alphaLog + betaLog);
      }
      return { stateId, probability: numerator === Number.NEGATIVE_INFINITY ? 0 : Math.exp(numerator - jointLog) };
    });
    const massFailure = checkedMass(
      distribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'additive_calibrated_evidence_conditioning_smoothing_mass_conservation_violation',
      `Combined-event smoothing mass does not sum to one at step ${step}`,
      step
    );
    if (massFailure !== undefined) return massFailure;
    smoothingSteps.push({ step, smoothedDistribution: distribution });
  }

  const pairwiseSteps: AdditiveCalibratedEvidenceConditionedPairwiseStep[] = [];
  const expectedCounts = new Map<string, number>();
  for (const edge of prepared.effectivePairs) expectedCounts.set(pairKey(edge.from, edge.to), 0);
  for (let step = 0; step < request.horizon; step += 1) {
    const numeratorByPair = new Map<string, number>();
    const transitionValues = prepared.transitionValuesByStep[step]!;
    const nextEvidence = prepared.evidenceMaps[step + 1]!;
    for (const fromStateId of prepared.stateIds) {
      for (const [valueTicks, alphaLog] of forward.alphas[step]!.get(fromStateId)?.entries() ?? []) {
        for (const edge of prepared.effectiveEdgesByState.get(fromStateId) ?? []) {
          const likelihood = nextEvidence.get(edge.to) ?? 0;
          if (likelihood === 0) continue;
          const increment = transitionValues.get(pairKey(edge.from, edge.to))!;
          const nextValue = checkedSafeAdd(valueTicks, increment, step + 1, edge.from, edge.to);
          if (!nextValue.ok) return nextValue;
          const betaLog = betas[step + 1]!.get(edge.to)?.get(nextValue.value);
          if (betaLog === undefined) continue;
          const key = pairKey(edge.from, edge.to);
          numeratorByPair.set(
            key,
            logAddExp(
              numeratorByPair.get(key) ?? Number.NEGATIVE_INFINITY,
              alphaLog + Math.log(edge.probability) + Math.log(likelihood) + betaLog
            )
          );
        }
      }
    }
    const pairwiseDistribution = prepared.effectivePairs.map((edge) => {
      const numerator = numeratorByPair.get(pairKey(edge.from, edge.to)) ?? Number.NEGATIVE_INFINITY;
      return {
        fromStateId: edge.from,
        toStateId: edge.to,
        probability: numerator === Number.NEGATIVE_INFINITY ? 0 : Math.exp(numerator - jointLog)
      };
    });
    const pairMassFailure = checkedMass(
      pairwiseDistribution.map((entry) => entry.probability),
      prepared.resolved.pairwiseConsistencyTolerance,
      'additive_calibrated_evidence_conditioning_pairwise_mass_conservation_violation',
      `Combined-event pairwise mass does not sum to one at step ${step}`,
      step
    );
    if (pairMassFailure !== undefined) return pairMassFailure;
    for (const stateId of prepared.stateIds) {
      const rowMass = pairwiseDistribution.filter((entry) => entry.fromStateId === stateId).reduce((sum, entry) => sum + entry.probability, 0);
      const columnMass = pairwiseDistribution.filter((entry) => entry.toStateId === stateId).reduce((sum, entry) => sum + entry.probability, 0);
      const expectedRow = smoothingSteps[step]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
      const expectedColumn = smoothingSteps[step + 1]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
      if (
        Math.abs(rowMass - expectedRow) > prepared.resolved.pairwiseConsistencyTolerance ||
        Math.abs(columnMass - expectedColumn) > prepared.resolved.pairwiseConsistencyTolerance
      ) {
        return failure('additive_calibrated_evidence_conditioning_pairwise_marginal_consistency_violation', 'Combined-event pairwise marginal mismatch', {
          step, stateId, tolerance: prepared.resolved.pairwiseConsistencyTolerance
        });
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
    return failure('additive_calibrated_evidence_expected_transition_count_conservation_violation', 'Combined-event expected transition counts do not sum to horizon', {
      actual: totalExpectedCount, expected: request.horizon, tolerance: prepared.resolved.expectedCountTolerance
    });
  }

  const evidenceLog = forward.evidenceLogProbability;
  const conditionalLog = jointLog - evidenceLog;
  const jointEventProbability = directProbability(jointLog);
  return {
    ok: true,
    possible: true,
    evidencePossible: true,
    aggregatePossible: true,
    jointPossible: true,
    impossibility: null,
    horizon: request.horizon,
    targetValueTicks: request.targetValueTicks,
    evidenceProbability: directProbability(evidenceLog),
    logEvidenceProbability: evidenceLog,
    unconditionalTargetProbability: aggregate.probability,
    unconditionalTargetLogProbability: aggregate.logProbability,
    jointEventProbability,
    logJointEventProbability: jointLog,
    targetConditionalProbabilityGivenEvidence: directProbability(conditionalLog),
    logTargetConditionalProbabilityGivenEvidence: conditionalLog,
    smoothingSteps,
    pairwiseSteps,
    expectedTransitionCounts,
    diagnostics: {
      ...makeDiagnostics(prepared, forward),
      conditioningMethod: 'exact_joint_evidence_aggregate_log_forward_backward',
      jointEventProbabilityUnderflowed: jointEventProbability === null,
      aggregateOnlyPossible: true,
      evidenceOnlyPossible: true
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

export function finiteAdditiveTrajectoryFunctionalCalibratedEvidenceResultToJson(
  result: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AB analysis result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}

export function finiteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResultToJson(
  result: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceConditioningResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(`Cannot serialize Candidate AB conditioning result with non-finite numeric value ${String(found.value)} at ${found.path}`);
  }
  return JSON.stringify(result);
}
