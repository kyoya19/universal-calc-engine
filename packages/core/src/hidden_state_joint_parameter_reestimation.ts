import {
  DefinitionModel,
  ProbabilitySpec,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteHiddenStatePairwiseSmoothingOptions,
  smoothFiniteHiddenStatePairwiseTransitions
} from './hidden_state_pairwise_smoothing';
import { smoothFiniteHiddenStateObservationSequence } from './hidden_state_smoothing';

type JointParameterReestimationOptions = FiniteHiddenStatePairwiseSmoothingOptions & {
  countTolerance?: number;
  likelihoodTolerance?: number;
};

type StateProbability = { stateId: StateId; probability: number };
type TransitionProbability = { toStateId: StateId; probability: number };
type TransitionExpectedCount = { toStateId: StateId; expectedCount: number };
type ObservationProbability = { symbol: string; probability: number };
type ObservationExpectedCount = { symbol: string; expectedCount: number };

type TransitionRowStatus =
  | 'updated_positive_expected_departure'
  | 'retained_zero_expected_departure'
  | 'structural_terminal_self_retention';

type ObservationRowStatus =
  | 'updated_positive_expected_occupancy'
  | 'retained_zero_expected_occupancy';

type JointTransitionRow = {
  stateId: StateId;
  terminal: boolean;
  expectedDepartureMass: number;
  expectedCounts: TransitionExpectedCount[];
  currentRow: TransitionProbability[];
  updatedRow: TransitionProbability[];
  status: TransitionRowStatus;
  uniqueByExpectedCounts: boolean;
};

type JointObservationRow = {
  stateId: StateId;
  expectedOccupancy: number;
  expectedCounts: ObservationExpectedCount[];
  currentRow: ObservationProbability[];
  updatedRow: ObservationProbability[];
  status: ObservationRowStatus;
  uniqueByExpectedCounts: boolean;
};

type JointDiagnostics = {
  method: 'one_step_em_joint_m_step_from_one_common_current_model_e_step';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  commonCurrentModelEStepUsed: true;
  commonEStepSource: 'candidate_r_pairwise_single_call' | 'candidate_h_single_observation_single_call';
  sequentialBlockReestimationUsed: false;
  intermediateUpdatedModelEStepUsed: false;
  initialDistributionUpdated: boolean;
  transitionModelUpdated: boolean;
  observationKernelUpdated: boolean;
  transitionTopologyChanged: false;
  observationAlphabetUpdated: false;
  terminalRowsLearned: false;
  zeroDepartureRowsRetainCurrentRow: true;
  zeroOccupancyRowsRetainCurrentRow: true;
  iterativeBaumWelchUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  sequenceProbabilityUnderflowed: boolean;
};

type JointFailureCode =
  | 'invalid_reestimation_tolerance'
  | 'common_e_step_inconsistency'
  | 'expected_count_topology_inconsistency'
  | 'expected_emission_count_inconsistency'
  | 'updated_initial_distribution_mass_violation'
  | 'updated_transition_row_mass_violation'
  | 'updated_observation_kernel_row_mass_violation'
  | 'likelihood_monotonicity_violation'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

type JointFailure = {
  ok: false;
  failure: {
    code: JointFailureCode;
    message: string;
    stateId?: StateId;
    toStateId?: StateId;
    symbol?: string;
    step?: number;
    actual?: number;
    expected?: number;
    tolerance?: number;
  };
};

type JointSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  currentInitialDistribution: StateProbability[];
  posteriorInitialStateProbabilities: StateProbability[] | null;
  updatedInitialDistribution: StateProbability[] | null;
  transitionRows: JointTransitionRow[] | null;
  observationKernelRows: JointObservationRow[] | null;
  originalLogLikelihood: number | null;
  updatedLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: JointDiagnostics;
};

type JointResult = JointSuccess | JointFailure | { ok: false; failure: { code: string; message: string; [key: string]: unknown }; validation?: unknown };

type AggregateTransitionRow = Map<StateId, number>;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: JointFailureCode,
  message: string,
  details: Omit<JointFailure['failure'], 'code' | 'message'> = {}
): JointFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'countTolerance' | 'likelihoodTolerance'
): number | JointFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, { actual: resolved });
  }
  return resolved;
}

function probabilitySpecWithValue(spec: ProbabilitySpec, value: number): ProbabilitySpec {
  return typeof spec === 'number' ? value : { type: 'constant', value };
}

function currentInitialDistribution(request: FiniteHiddenStateObservationRequest, stateIds: StateId[]): StateProbability[] {
  const byState = new Map(request.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const));
  return stateIds.map((stateId) => ({ stateId, probability: byState.get(stateId) ?? 0 }));
}

function aggregateCurrentRows(model: DefinitionModel, stateIds: StateId[]): Map<StateId, AggregateTransitionRow> {
  const result = new Map<StateId, AggregateTransitionRow>();
  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    if (state !== undefined && isTerminalState(state)) {
      result.set(stateId, new Map([[stateId, 1]]));
      continue;
    }
    const row = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      row.set(transition.to, (row.get(transition.to) ?? 0) + probability);
    }
    result.set(stateId, row);
  }
  return result;
}

function transitionRowEntries(row: AggregateTransitionRow): TransitionProbability[] {
  return [...row.entries()].sort(([left], [right]) => compareStrings(left, right)).map(([toStateId, probability]) => ({ toStateId, probability }));
}

function currentKernelRows(request: FiniteHiddenStateObservationRequest, stateIds: StateId[], symbols: string[]): Map<StateId, Map<string, number>> {
  const result = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) result.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
  for (const entry of request.kernel) result.get(entry.stateId)?.set(entry.symbol, entry.probability);
  return result;
}

function observationRowEntries(row: Map<string, number>, symbols: string[]): ObservationProbability[] {
  return symbols.map((symbol) => ({ symbol, probability: row.get(symbol) ?? 0 }));
}

function countKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function checkedGamma(stateIds: StateId[], mass: Map<StateId, number>, step: number, tolerance: number): Map<StateId, number> | JointFailure {
  let total = 0;
  for (const stateId of stateIds) {
    const value = mass.get(stateId) ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      return failure('non_finite_reestimation_result', 'Common E-step posterior state probability became invalid', { stateId, step, actual: value });
    }
    total += value;
  }
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure('common_e_step_inconsistency', 'Common E-step posterior state probabilities do not sum to one', { step, actual: total, expected: 1, tolerance });
  }
  return new Map(stateIds.map((stateId) => [stateId, (mass.get(stateId) ?? 0) / total] as const));
}

function buildUpdatedModel(model: DefinitionModel, updatedRows: Map<StateId, AggregateTransitionRow>, currentRows: Map<StateId, AggregateTransitionRow>): DefinitionModel | JointFailure {
  const transitions: DefinitionModel['transitions'] = [];
  for (const transition of model.transitions) {
    const state = model.states.find((candidate) => candidate.id === transition.from);
    if (state !== undefined && isTerminalState(state)) {
      transitions.push({ ...transition });
      continue;
    }
    const currentAggregate = currentRows.get(transition.from)?.get(transition.to);
    const updatedAggregate = updatedRows.get(transition.from)?.get(transition.to);
    if (currentAggregate === undefined || updatedAggregate === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing aggregate transition row while applying joint update', { stateId: transition.from, toStateId: transition.to });
    }
    const currentEdge = evaluateProbabilitySpec(transition.probability);
    let updatedEdge = 0;
    if (currentAggregate > 0) updatedEdge = updatedAggregate * (currentEdge / currentAggregate);
    else if (updatedAggregate !== 0) return failure('expected_count_topology_inconsistency', 'Cannot assign positive updated mass through zero-current aggregate support', { stateId: transition.from, toStateId: transition.to, actual: updatedAggregate, expected: 0 });
    if (!Number.isFinite(updatedEdge) || updatedEdge < 0) return failure('non_finite_reestimation_result', 'Updated transition edge probability became invalid', { stateId: transition.from, toStateId: transition.to, actual: updatedEdge });
    transitions.push({ ...transition, probability: probabilitySpecWithValue(transition.probability, updatedEdge) });
  }
  return {
    ...model,
    states: model.states.map((state) => ({ ...state, ...(state.properties === undefined ? {} : { properties: { ...state.properties } }) })),
    transitions
  };
}

function buildUpdatedRequest(request: FiniteHiddenStateObservationRequest, updatedInitial: StateProbability[], stateIds: StateId[], symbols: string[], updatedKernelRows: Map<StateId, Map<string, number>>): FiniteHiddenStateObservationRequest | JointFailure {
  const kernel: HiddenObservationKernelEntry[] = [];
  for (const stateId of stateIds) {
    const row = updatedKernelRows.get(stateId);
    if (row === undefined) return failure('internal_reestimation_inconsistency', 'Missing updated observation-kernel row', { stateId });
    for (const symbol of symbols) {
      const probability = row.get(symbol);
      if (probability === undefined || !Number.isFinite(probability) || probability < 0) return failure('non_finite_reestimation_result', 'Updated observation-kernel probability became invalid', { stateId, symbol, actual: probability });
      kernel.push({ stateId, symbol, probability });
    }
  }
  return { initialDistribution: updatedInitial.map((entry) => ({ ...entry })), alphabet: [...request.alphabet], kernel, observations: [...request.observations] };
}

function diagnostics(source: JointDiagnostics['commonEStepSource'], probabilityTolerance: number, countTolerance: number, likelihoodTolerance: number, underflowed: boolean, updated: boolean): JointDiagnostics {
  return {
    method: 'one_step_em_joint_m_step_from_one_common_current_model_e_step',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    commonCurrentModelEStepUsed: true,
    commonEStepSource: source,
    sequentialBlockReestimationUsed: false,
    intermediateUpdatedModelEStepUsed: false,
    initialDistributionUpdated: updated,
    transitionModelUpdated: updated,
    observationKernelUpdated: updated,
    transitionTopologyChanged: false,
    observationAlphabetUpdated: false,
    terminalRowsLearned: false,
    zeroDepartureRowsRetainCurrentRow: true,
    zeroOccupancyRowsRetainCurrentRow: true,
    iterativeBaumWelchUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance,
    countTolerance,
    likelihoodTolerance,
    sequenceProbabilityUnderflowed: underflowed
  };
}

export function reestimateFiniteHiddenStateParametersJointOneStep(model: DefinitionModel, request: FiniteHiddenStateObservationRequest, options: JointParameterReestimationOptions = {}): JointResult {
  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const symbols = [...request.alphabet].sort(compareStrings);
  const transitionCount = Math.max(0, request.observations.length - 1);
  let possible: boolean;
  let originalLogLikelihood: number | null;
  let probabilityTolerance: number;
  let underflowed: boolean;
  let source: JointDiagnostics['commonEStepSource'];
  let gammas: Array<Map<StateId, number>> = [];
  let expectedTransitionCounts: Array<{ fromStateId: StateId; toStateId: StateId; expectedCount: number }> = [];

  if (transitionCount > 0) {
    const pairwise = smoothFiniteHiddenStatePairwiseTransitions(model, request, options);
    if (!pairwise.ok) return pairwise as JointResult;
    possible = pairwise.possible;
    originalLogLikelihood = pairwise.logLikelihood;
    probabilityTolerance = pairwise.diagnostics.probabilityTolerance;
    underflowed = pairwise.diagnostics.sequenceProbabilityUnderflowed;
    source = 'candidate_r_pairwise_single_call';
    if (possible) {
      if (pairwise.expectedTransitionCounts === null || originalLogLikelihood === null) return failure('internal_reestimation_inconsistency', 'Candidate R omitted expected counts or log likelihood for possible evidence');
      expectedTransitionCounts = pairwise.expectedTransitionCounts.map((entry) => ({ ...entry }));
      const firstPairwise = pairwise.steps[0]?.pairwiseDistribution;
      if (firstPairwise === null || firstPairwise === undefined) return failure('common_e_step_inconsistency', 'Candidate R omitted first pairwise posterior for possible evidence');
      const gamma0 = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
      for (const entry of firstPairwise) gamma0.set(entry.fromStateId, (gamma0.get(entry.fromStateId) ?? 0) + entry.probability);
      const checked0 = checkedGamma(stateIds, gamma0, 0, probabilityTolerance * 20);
      if ('failure' in checked0) return checked0;
      gammas.push(checked0);
      for (let step = 1; step < request.observations.length; step += 1) {
        const distribution = pairwise.steps[step - 1]?.pairwiseDistribution;
        if (distribution === null || distribution === undefined) return failure('common_e_step_inconsistency', 'Candidate R omitted pairwise posterior for possible evidence', { step: step - 1 });
        const gamma = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
        for (const entry of distribution) gamma.set(entry.toStateId, (gamma.get(entry.toStateId) ?? 0) + entry.probability);
        const checked = checkedGamma(stateIds, gamma, step, probabilityTolerance * 20);
        if ('failure' in checked) return checked;
        gammas.push(checked);
      }
    }
  } else {
    const smoothing = smoothFiniteHiddenStateObservationSequence(model, request, options);
    if (!smoothing.ok) return smoothing as JointResult;
    possible = smoothing.possible;
    originalLogLikelihood = smoothing.logLikelihood;
    probabilityTolerance = smoothing.diagnostics.probabilityTolerance;
    underflowed = smoothing.diagnostics.sequenceProbabilityUnderflowed;
    source = 'candidate_h_single_observation_single_call';
    if (possible) {
      const first = smoothing.steps[0]?.smoothedDistribution;
      if (first === null || first === undefined || originalLogLikelihood === null) return failure('common_e_step_inconsistency', 'Candidate H omitted posterior initial state or log likelihood for possible evidence');
      const gamma0 = new Map(first.map((entry) => [entry.stateId, entry.probability] as const));
      const checked0 = checkedGamma(stateIds, gamma0, 0, probabilityTolerance * 20);
      if ('failure' in checked0) return checked0;
      gammas = [checked0];
    }
  }

  const countToleranceResolved = resolvePositiveFinite(options.countTolerance, Math.max(1e-12, probabilityTolerance * 20), 'countTolerance');
  if (typeof countToleranceResolved !== 'number') return countToleranceResolved;
  const likelihoodToleranceResolved = resolvePositiveFinite(options.likelihoodTolerance, Math.max(1e-12, probabilityTolerance * 100), 'likelihoodTolerance');
  if (typeof likelihoodToleranceResolved !== 'number') return likelihoodToleranceResolved;
  const currentInitial = currentInitialDistribution(request, stateIds);

  if (!possible) {
    return { ok: true, possible: false, observations: [...request.observations], currentInitialDistribution: currentInitial, posteriorInitialStateProbabilities: null, updatedInitialDistribution: null, transitionRows: null, observationKernelRows: null, originalLogLikelihood: null, updatedLogLikelihood: null, likelihoodDelta: null, diagnostics: diagnostics(source, probabilityTolerance, countToleranceResolved, likelihoodToleranceResolved, underflowed, false) };
  }
  if (originalLogLikelihood === null || gammas.length !== request.observations.length) return failure('common_e_step_inconsistency', 'Common E-step did not produce a complete possible-sequence posterior');

  const gamma0 = gammas[0];
  if (gamma0 === undefined) return failure('common_e_step_inconsistency', 'Common E-step omitted gamma_0');
  const posteriorInitial = stateIds.map((stateId) => ({ stateId, probability: gamma0.get(stateId) ?? 0 }));
  const updatedInitial = posteriorInitial.map((entry) => ({ ...entry }));
  const initialTotal = updatedInitial.reduce((sum, entry) => sum + entry.probability, 0);
  if (!Number.isFinite(initialTotal) || Math.abs(initialTotal - 1) > probabilityTolerance) return failure('updated_initial_distribution_mass_violation', 'Updated initial distribution does not sum to one', { actual: initialTotal, expected: 1, tolerance: probabilityTolerance });

  const currentTransitionRows = aggregateCurrentRows(model, stateIds);
  const countByPair = new Map<string, number>();
  for (const entry of expectedTransitionCounts) countByPair.set(countKey(entry.fromStateId, entry.toStateId), entry.expectedCount);
  const updatedTransitionRows = new Map<StateId, AggregateTransitionRow>();
  const transitionRows: JointTransitionRow[] = [];

  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    const terminal = state !== undefined && isTerminalState(state);
    const currentRow = currentTransitionRows.get(stateId) ?? new Map<StateId, number>();
    const allowed = new Set(currentRow.keys());
    const expectedCounts = stateIds.map((toStateId) => ({ toStateId, expectedCount: countByPair.get(countKey(stateId, toStateId)) ?? 0 }));
    for (const entry of expectedCounts) {
      if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) return failure('non_finite_reestimation_result', 'Posterior expected transition count became invalid', { stateId, toStateId: entry.toStateId, actual: entry.expectedCount });
      if (!terminal && !allowed.has(entry.toStateId) && entry.expectedCount > countToleranceResolved) return failure('expected_count_topology_inconsistency', 'Posterior expected count assigns mass outside fixed transition topology', { stateId, toStateId: entry.toStateId, actual: entry.expectedCount, expected: 0, tolerance: countToleranceResolved });
    }
    const departure = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (terminal) {
      const row = new Map<StateId, number>([[stateId, 1]]);
      updatedTransitionRows.set(stateId, row);
      transitionRows.push({ stateId, terminal: true, expectedDepartureMass: departure, expectedCounts, currentRow: transitionRowEntries(currentRow), updatedRow: transitionRowEntries(row), status: 'structural_terminal_self_retention', uniqueByExpectedCounts: false });
      continue;
    }
    if (departure <= countToleranceResolved) {
      const retained = new Map(currentRow);
      updatedTransitionRows.set(stateId, retained);
      transitionRows.push({ stateId, terminal: false, expectedDepartureMass: departure, expectedCounts, currentRow: transitionRowEntries(currentRow), updatedRow: transitionRowEntries(retained), status: 'retained_zero_expected_departure', uniqueByExpectedCounts: false });
      continue;
    }
    const updated = new Map<StateId, number>();
    for (const toStateId of [...currentRow.keys()].sort(compareStrings)) updated.set(toStateId, (countByPair.get(countKey(stateId, toStateId)) ?? 0) / departure);
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > probabilityTolerance) return failure('updated_transition_row_mass_violation', 'Updated transition row does not sum to one', { stateId, actual: total, expected: 1, tolerance: probabilityTolerance });
    updatedTransitionRows.set(stateId, updated);
    transitionRows.push({ stateId, terminal: false, expectedDepartureMass: departure, expectedCounts, currentRow: transitionRowEntries(currentRow), updatedRow: transitionRowEntries(updated), status: 'updated_positive_expected_departure', uniqueByExpectedCounts: true });
  }

  const currentKernel = currentKernelRows(request, stateIds, symbols);
  const emissionCounts = new Map<StateId, Map<string, number>>();
  const occupancies = new Map<StateId, number>();
  for (const stateId of stateIds) {
    emissionCounts.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
    occupancies.set(stateId, 0);
  }
  for (let step = 0; step < gammas.length; step += 1) {
    const gamma = gammas[step];
    const symbol = request.observations[step];
    if (gamma === undefined || symbol === undefined || !symbols.includes(symbol)) return failure('expected_emission_count_inconsistency', 'Common E-step emission statistic references invalid step or symbol', { step, symbol });
    for (const stateId of stateIds) {
      const value = gamma.get(stateId) ?? 0;
      const row = emissionCounts.get(stateId);
      if (row === undefined) return failure('internal_reestimation_inconsistency', 'Missing expected emission-count row', { stateId });
      row.set(symbol, (row.get(symbol) ?? 0) + value);
      occupancies.set(stateId, (occupancies.get(stateId) ?? 0) + value);
    }
  }

  const updatedKernelRows = new Map<StateId, Map<string, number>>();
  const observationRows: JointObservationRow[] = [];
  for (const stateId of stateIds) {
    const counts = emissionCounts.get(stateId);
    const currentRow = currentKernel.get(stateId);
    const occupancy = occupancies.get(stateId) ?? 0;
    if (counts === undefined || currentRow === undefined || !Number.isFinite(occupancy) || occupancy < 0) return failure('non_finite_reestimation_result', 'Expected observation occupancy became invalid', { stateId, actual: occupancy });
    const expectedCounts = symbols.map((symbol) => ({ symbol, expectedCount: counts.get(symbol) ?? 0 }));
    const countTotal = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (!Number.isFinite(countTotal) || Math.abs(countTotal - occupancy) > countToleranceResolved) return failure('expected_emission_count_inconsistency', 'Expected emission counts do not sum to expected occupancy', { stateId, actual: countTotal, expected: occupancy, tolerance: countToleranceResolved });
    if (occupancy <= countToleranceResolved) {
      const retained = new Map(currentRow);
      updatedKernelRows.set(stateId, retained);
      observationRows.push({ stateId, expectedOccupancy: occupancy, expectedCounts, currentRow: observationRowEntries(currentRow, symbols), updatedRow: observationRowEntries(retained, symbols), status: 'retained_zero_expected_occupancy', uniqueByExpectedCounts: false });
      continue;
    }
    const updated = new Map<string, number>();
    for (const symbol of symbols) updated.set(symbol, (counts.get(symbol) ?? 0) / occupancy);
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > probabilityTolerance) return failure('updated_observation_kernel_row_mass_violation', 'Updated observation-kernel row does not sum to one', { stateId, actual: total, expected: 1, tolerance: probabilityTolerance });
    updatedKernelRows.set(stateId, updated);
    observationRows.push({ stateId, expectedOccupancy: occupancy, expectedCounts, currentRow: observationRowEntries(currentRow, symbols), updatedRow: observationRowEntries(updated, symbols), status: 'updated_positive_expected_occupancy', uniqueByExpectedCounts: true });
  }

  const updatedModel = buildUpdatedModel(model, updatedTransitionRows, currentTransitionRows);
  if ('failure' in updatedModel) return updatedModel;
  const updatedRequest = buildUpdatedRequest(request, updatedInitial, stateIds, symbols, updatedKernelRows);
  if ('failure' in updatedRequest) return updatedRequest;
  const updatedFiltering = filterFiniteHiddenStateObservationSequence(updatedModel, updatedRequest, options);
  if (!updatedFiltering.ok) return failure('internal_reestimation_inconsistency', `Joint updated model failed Candidate C validation/filtering: ${updatedFiltering.failure.code}`);
  if (!updatedFiltering.possible || updatedFiltering.logLikelihood === null) return failure('internal_reestimation_inconsistency', 'One-step joint update made previously possible evidence impossible');
  const updatedLogLikelihood = updatedFiltering.logLikelihood;
  const likelihoodDelta = updatedLogLikelihood - originalLogLikelihood;
  if (!Number.isFinite(originalLogLikelihood) || !Number.isFinite(updatedLogLikelihood) || !Number.isFinite(likelihoodDelta)) return failure('non_finite_reestimation_result', 'Joint likelihood comparison became non-finite');
  if (likelihoodDelta < -likelihoodToleranceResolved) return failure('likelihood_monotonicity_violation', 'One-step joint re-estimation decreased realized observation log likelihood beyond tolerance', { actual: likelihoodDelta, expected: 0, tolerance: likelihoodToleranceResolved });

  return { ok: true, possible: true, observations: [...request.observations], currentInitialDistribution: currentInitial, posteriorInitialStateProbabilities: posteriorInitial, updatedInitialDistribution: updatedInitial, transitionRows, observationKernelRows: observationRows, originalLogLikelihood, updatedLogLikelihood, likelihoodDelta, diagnostics: diagnostics(source, probabilityTolerance, countToleranceResolved, likelihoodToleranceResolved, underflowed || updatedFiltering.diagnostics.sequenceProbabilityUnderflowed, true) };
}

function assertFiniteDeep(value: unknown, path: string): void {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot serialize non-finite number at ${path}`);
    return;
  }
  if (value === null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteDeep(entry, `${path}[${index}]`));
    return;
  }
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) assertFiniteDeep(entry, `${path}.${key}`);
}

export function finiteHiddenStateJointParameterReestimationResultToJson(result: JointResult): string {
  assertFiniteDeep(result, 'result');
  return JSON.stringify(result);
}
