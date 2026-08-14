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

type MultiTrajectoryJointParameterReestimationRequest =
  Omit<FiniteHiddenStateObservationRequest, 'observations'> & {
    trajectories: string[][];
  };

type MultiTrajectoryJointParameterReestimationOptions =
  FiniteHiddenStatePairwiseSmoothingOptions & {
    countTolerance?: number;
    likelihoodTolerance?: number;
  };

type StateProbability = { stateId: StateId; probability: number };
type StateExpectedCount = { stateId: StateId; expectedCount: number };
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

type MultiTrajectoryTransitionRow = {
  stateId: StateId;
  terminal: boolean;
  expectedDepartureMass: number;
  expectedCounts: TransitionExpectedCount[];
  currentRow: TransitionProbability[];
  updatedRow: TransitionProbability[];
  status: TransitionRowStatus;
  uniqueByExpectedCounts: boolean;
};

type MultiTrajectoryObservationRow = {
  stateId: StateId;
  expectedOccupancy: number;
  expectedCounts: ObservationExpectedCount[];
  currentRow: ObservationProbability[];
  updatedRow: ObservationProbability[];
  status: ObservationRowStatus;
  uniqueByExpectedCounts: boolean;
};

type MultiTrajectoryDiagnostics = {
  method: 'one_step_em_joint_m_step_from_common_current_model_multiple_independent_trajectory_e_steps';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  multipleIndependentTrajectoriesUsed: true;
  trajectoryCount: number;
  allTrajectoryEStepsUseSameCurrentModel: true;
  perTrajectoryParameterUpdatesUsed: false;
  sequentialCandidateVChainingUsed: false;
  trajectoryConcatenationUsed: false;
  sufficientStatisticsAggregatedBeforeMstep: true;
  jointSimultaneousApplication: true;
  initialDistributionUpdated: boolean;
  transitionModelUpdated: boolean;
  observationKernelUpdated: boolean;
  transitionTopologyChanged: false;
  observationAlphabetUpdated: false;
  terminalRowsLearned: false;
  zeroDepartureRowsRetainCurrentRow: true;
  zeroOccupancyRowsRetainCurrentRow: true;
  iterativeBaumWelchUsed: false;
  weightedTrajectoriesUsed: false;
  onlineOrStreamingEmUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  anySequenceProbabilityUnderflowed: boolean;
};

type MultiTrajectoryFailureCode =
  | 'empty_trajectory_collection'
  | 'empty_trajectory'
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

type MultiTrajectoryFailure = {
  ok: false;
  failure: {
    code: MultiTrajectoryFailureCode;
    message: string;
    trajectoryIndex?: number;
    stateId?: StateId;
    toStateId?: StateId;
    symbol?: string;
    step?: number;
    actual?: number;
    expected?: number;
    tolerance?: number;
  };
};

type MultiTrajectorySuccess = {
  ok: true;
  possible: boolean;
  trajectoryCount: number;
  trajectories: string[][];
  impossibleTrajectoryIndex: number | null;
  currentInitialDistribution: StateProbability[];
  aggregatedPosteriorInitialCounts: StateExpectedCount[] | null;
  updatedInitialDistribution: StateProbability[] | null;
  transitionRows: MultiTrajectoryTransitionRow[] | null;
  observationKernelRows: MultiTrajectoryObservationRow[] | null;
  originalTotalLogLikelihood: number | null;
  updatedTotalLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: MultiTrajectoryDiagnostics;
};

type MultiTrajectoryResult =
  | MultiTrajectorySuccess
  | MultiTrajectoryFailure
  | { ok: false; failure: { code: string; message: string; [key: string]: unknown }; validation?: unknown };

type AggregateTransitionRow = Map<StateId, number>;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: MultiTrajectoryFailureCode,
  message: string,
  details: Omit<MultiTrajectoryFailure['failure'], 'code' | 'message'> = {}
): MultiTrajectoryFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'countTolerance' | 'likelihoodTolerance'
): number | MultiTrajectoryFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, { actual: resolved });
  }
  return resolved;
}

function probabilitySpecWithValue(spec: ProbabilitySpec, value: number): ProbabilitySpec {
  return typeof spec === 'number' ? value : { type: 'constant', value };
}

function sharedRequest(
  request: MultiTrajectoryJointParameterReestimationRequest,
  observations: string[]
): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: request.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel: request.kernel.map((entry) => ({ ...entry })),
    observations: [...observations]
  };
}

function currentInitialDistribution(
  request: MultiTrajectoryJointParameterReestimationRequest,
  stateIds: StateId[]
): StateProbability[] {
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
  return [...row.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([toStateId, probability]) => ({ toStateId, probability }));
}

function currentKernelRows(
  request: MultiTrajectoryJointParameterReestimationRequest,
  stateIds: StateId[],
  symbols: string[]
): Map<StateId, Map<string, number>> {
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

function checkedGamma(
  stateIds: StateId[],
  mass: Map<StateId, number>,
  trajectoryIndex: number,
  step: number,
  tolerance: number
): Map<StateId, number> | MultiTrajectoryFailure {
  let total = 0;
  for (const stateId of stateIds) {
    const value = mass.get(stateId) ?? 0;
    if (!Number.isFinite(value) || value < 0) {
      return failure('non_finite_reestimation_result', 'Per-trajectory E-step posterior state probability became invalid', {
        trajectoryIndex,
        stateId,
        step,
        actual: value
      });
    }
    total += value;
  }
  if (!Number.isFinite(total) || total <= 0 || Math.abs(total - 1) > tolerance) {
    return failure('common_e_step_inconsistency', 'Per-trajectory E-step posterior state probabilities do not sum to one', {
      trajectoryIndex,
      step,
      actual: total,
      expected: 1,
      tolerance
    });
  }
  return new Map(stateIds.map((stateId) => [stateId, (mass.get(stateId) ?? 0) / total] as const));
}

function buildUpdatedModel(
  model: DefinitionModel,
  updatedRows: Map<StateId, AggregateTransitionRow>,
  currentRows: Map<StateId, AggregateTransitionRow>
): DefinitionModel | MultiTrajectoryFailure {
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
      return failure('internal_reestimation_inconsistency', 'Missing aggregate transition row while applying multi-trajectory joint update', {
        stateId: transition.from,
        toStateId: transition.to
      });
    }
    const currentEdge = evaluateProbabilitySpec(transition.probability);
    let updatedEdge = 0;
    if (currentAggregate > 0) updatedEdge = updatedAggregate * (currentEdge / currentAggregate);
    else if (updatedAggregate !== 0) {
      return failure('expected_count_topology_inconsistency', 'Cannot assign positive updated mass through zero-current aggregate support', {
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedAggregate,
        expected: 0
      });
    }
    if (!Number.isFinite(updatedEdge) || updatedEdge < 0) {
      return failure('non_finite_reestimation_result', 'Updated transition edge probability became invalid', {
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedEdge
      });
    }
    transitions.push({ ...transition, probability: probabilitySpecWithValue(transition.probability, updatedEdge) });
  }
  return {
    ...model,
    states: model.states.map((state) => ({
      ...state,
      ...(state.properties === undefined ? {} : { properties: { ...state.properties } })
    })),
    transitions
  };
}

function buildUpdatedRequest(
  request: MultiTrajectoryJointParameterReestimationRequest,
  observations: string[],
  updatedInitial: StateProbability[],
  stateIds: StateId[],
  symbols: string[],
  updatedKernelRows: Map<StateId, Map<string, number>>
): FiniteHiddenStateObservationRequest | MultiTrajectoryFailure {
  const kernel: HiddenObservationKernelEntry[] = [];
  for (const stateId of stateIds) {
    const row = updatedKernelRows.get(stateId);
    if (row === undefined) return failure('internal_reestimation_inconsistency', 'Missing updated observation-kernel row', { stateId });
    for (const symbol of symbols) {
      const probability = row.get(symbol);
      if (probability === undefined || !Number.isFinite(probability) || probability < 0) {
        return failure('non_finite_reestimation_result', 'Updated observation-kernel probability became invalid', {
          stateId,
          symbol,
          ...(probability === undefined ? {} : { actual: probability })
        });
      }
      kernel.push({ stateId, symbol, probability });
    }
  }
  return {
    initialDistribution: updatedInitial.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel,
    observations: [...observations]
  };
}

function diagnostics(
  trajectoryCount: number,
  probabilityTolerance: number,
  countTolerance: number,
  likelihoodTolerance: number,
  underflowed: boolean,
  updated: boolean
): MultiTrajectoryDiagnostics {
  return {
    method: 'one_step_em_joint_m_step_from_common_current_model_multiple_independent_trajectory_e_steps',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    multipleIndependentTrajectoriesUsed: true,
    trajectoryCount,
    allTrajectoryEStepsUseSameCurrentModel: true,
    perTrajectoryParameterUpdatesUsed: false,
    sequentialCandidateVChainingUsed: false,
    trajectoryConcatenationUsed: false,
    sufficientStatisticsAggregatedBeforeMstep: true,
    jointSimultaneousApplication: true,
    initialDistributionUpdated: updated,
    transitionModelUpdated: updated,
    observationKernelUpdated: updated,
    transitionTopologyChanged: false,
    observationAlphabetUpdated: false,
    terminalRowsLearned: false,
    zeroDepartureRowsRetainCurrentRow: true,
    zeroOccupancyRowsRetainCurrentRow: true,
    iterativeBaumWelchUsed: false,
    weightedTrajectoriesUsed: false,
    onlineOrStreamingEmUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance,
    countTolerance,
    likelihoodTolerance,
    anySequenceProbabilityUnderflowed: underflowed
  };
}

export function reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(
  model: DefinitionModel,
  request: MultiTrajectoryJointParameterReestimationRequest,
  options: MultiTrajectoryJointParameterReestimationOptions = {}
): MultiTrajectoryResult {
  const trajectoryCount = request.trajectories.length;
  if (trajectoryCount === 0) return failure('empty_trajectory_collection', 'Candidate W requires at least one observation trajectory');
  const emptyTrajectoryIndex = request.trajectories.findIndex((trajectory) => trajectory.length === 0);
  if (emptyTrajectoryIndex >= 0) {
    return failure('empty_trajectory', 'Candidate W trajectories must each be finite and non-empty', { trajectoryIndex: emptyTrajectoryIndex });
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const symbols = [...request.alphabet].sort(compareStrings);
  const currentInitial = currentInitialDistribution(request, stateIds);
  const initialCounts = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
  const transitionCounts = new Map<string, number>();
  const emissionCounts = new Map<StateId, Map<string, number>>();
  const occupancies = new Map<StateId, number>();
  for (const stateId of stateIds) {
    emissionCounts.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
    occupancies.set(stateId, 0);
  }

  let probabilityTolerance = 1e-12;
  let anyUnderflowed = false;
  let originalTotalLogLikelihood = 0;

  for (let trajectoryIndex = 0; trajectoryIndex < trajectoryCount; trajectoryIndex += 1) {
    const observations = request.trajectories[trajectoryIndex];
    if (observations === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing trajectory while aggregating Candidate W E-step', { trajectoryIndex });
    }
    const trajectoryRequest = sharedRequest(request, observations);
    const transitionCount = Math.max(0, observations.length - 1);
    let gammas: Array<Map<StateId, number>> = [];
    let expectedTransitionCounts: Array<{ fromStateId: StateId; toStateId: StateId; expectedCount: number }> = [];
    let possible: boolean;
    let logLikelihood: number | null;
    let trajectoryTolerance: number;
    let trajectoryUnderflowed: boolean;

    if (transitionCount > 0) {
      const pairwise = smoothFiniteHiddenStatePairwiseTransitions(model, trajectoryRequest, options);
      if (!pairwise.ok) return pairwise as MultiTrajectoryResult;
      possible = pairwise.possible;
      logLikelihood = pairwise.logLikelihood;
      trajectoryTolerance = pairwise.diagnostics.probabilityTolerance;
      trajectoryUnderflowed = pairwise.diagnostics.sequenceProbabilityUnderflowed;
      if (possible) {
        if (pairwise.expectedTransitionCounts === null || logLikelihood === null) {
          return failure('internal_reestimation_inconsistency', 'Candidate R omitted expected counts or log likelihood for possible trajectory', { trajectoryIndex });
        }
        expectedTransitionCounts = pairwise.expectedTransitionCounts.map((entry) => ({ ...entry }));
        const firstPairwise = pairwise.steps[0]?.pairwiseDistribution;
        if (firstPairwise === null || firstPairwise === undefined) {
          return failure('common_e_step_inconsistency', 'Candidate R omitted first pairwise posterior for possible trajectory', { trajectoryIndex });
        }
        const gamma0 = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
        for (const entry of firstPairwise) gamma0.set(entry.fromStateId, (gamma0.get(entry.fromStateId) ?? 0) + entry.probability);
        const checked0 = checkedGamma(stateIds, gamma0, trajectoryIndex, 0, trajectoryTolerance * 20);
        if ('failure' in checked0) return checked0;
        gammas.push(checked0);
        for (let step = 1; step < observations.length; step += 1) {
          const distribution = pairwise.steps[step - 1]?.pairwiseDistribution;
          if (distribution === null || distribution === undefined) {
            return failure('common_e_step_inconsistency', 'Candidate R omitted pairwise posterior for possible trajectory', { trajectoryIndex, step: step - 1 });
          }
          const gamma = new Map<StateId, number>(stateIds.map((stateId) => [stateId, 0]));
          for (const entry of distribution) gamma.set(entry.toStateId, (gamma.get(entry.toStateId) ?? 0) + entry.probability);
          const checked = checkedGamma(stateIds, gamma, trajectoryIndex, step, trajectoryTolerance * 20);
          if ('failure' in checked) return checked;
          gammas.push(checked);
        }
      }
    } else {
      const smoothing = smoothFiniteHiddenStateObservationSequence(model, trajectoryRequest, options);
      if (!smoothing.ok) return smoothing as MultiTrajectoryResult;
      possible = smoothing.possible;
      logLikelihood = smoothing.logLikelihood;
      trajectoryTolerance = smoothing.diagnostics.probabilityTolerance;
      trajectoryUnderflowed = smoothing.diagnostics.sequenceProbabilityUnderflowed;
      if (possible) {
        const first = smoothing.steps[0]?.smoothedDistribution;
        if (first === null || first === undefined || logLikelihood === null) {
          return failure('common_e_step_inconsistency', 'Candidate H omitted posterior initial state or log likelihood for possible trajectory', { trajectoryIndex });
        }
        const gamma0 = new Map(first.map((entry) => [entry.stateId, entry.probability] as const));
        const checked0 = checkedGamma(stateIds, gamma0, trajectoryIndex, 0, trajectoryTolerance * 20);
        if ('failure' in checked0) return checked0;
        gammas = [checked0];
      }
    }

    probabilityTolerance = Math.max(probabilityTolerance, trajectoryTolerance);
    anyUnderflowed = anyUnderflowed || trajectoryUnderflowed;

    if (!possible) {
      const countToleranceResolved = resolvePositiveFinite(options.countTolerance, Math.max(1e-12, probabilityTolerance * 20), 'countTolerance');
      if (typeof countToleranceResolved !== 'number') return countToleranceResolved;
      const likelihoodToleranceResolved = resolvePositiveFinite(options.likelihoodTolerance, Math.max(1e-12, probabilityTolerance * 100), 'likelihoodTolerance');
      if (typeof likelihoodToleranceResolved !== 'number') return likelihoodToleranceResolved;
      return {
        ok: true,
        possible: false,
        trajectoryCount,
        trajectories: request.trajectories.map((trajectory) => [...trajectory]),
        impossibleTrajectoryIndex: trajectoryIndex,
        currentInitialDistribution: currentInitial,
        aggregatedPosteriorInitialCounts: null,
        updatedInitialDistribution: null,
        transitionRows: null,
        observationKernelRows: null,
        originalTotalLogLikelihood: null,
        updatedTotalLogLikelihood: null,
        likelihoodDelta: null,
        diagnostics: diagnostics(trajectoryCount, probabilityTolerance, countToleranceResolved, likelihoodToleranceResolved, anyUnderflowed, false)
      };
    }

    if (logLikelihood === null || gammas.length !== observations.length) {
      return failure('common_e_step_inconsistency', 'Per-trajectory E-step did not produce a complete possible-trajectory posterior', { trajectoryIndex });
    }
    originalTotalLogLikelihood += logLikelihood;

    const gamma0 = gammas[0];
    if (gamma0 === undefined) return failure('common_e_step_inconsistency', 'Per-trajectory E-step omitted gamma_0', { trajectoryIndex });
    for (const stateId of stateIds) initialCounts.set(stateId, (initialCounts.get(stateId) ?? 0) + (gamma0.get(stateId) ?? 0));

    for (const entry of expectedTransitionCounts) {
      const key = countKey(entry.fromStateId, entry.toStateId);
      transitionCounts.set(key, (transitionCounts.get(key) ?? 0) + entry.expectedCount);
    }

    for (let step = 0; step < gammas.length; step += 1) {
      const gamma = gammas[step];
      const symbol = observations[step];
      if (gamma === undefined || symbol === undefined) {
        return failure('expected_emission_count_inconsistency', 'Per-trajectory E-step emission statistic references invalid step', { trajectoryIndex, step });
      }
      if (!symbols.includes(symbol)) {
        return failure('expected_emission_count_inconsistency', 'Per-trajectory E-step emission statistic references symbol outside fixed alphabet', { trajectoryIndex, step, symbol });
      }
      for (const stateId of stateIds) {
        const value = gamma.get(stateId) ?? 0;
        const row = emissionCounts.get(stateId);
        if (row === undefined) return failure('internal_reestimation_inconsistency', 'Missing expected emission-count row', { stateId });
        row.set(symbol, (row.get(symbol) ?? 0) + value);
        occupancies.set(stateId, (occupancies.get(stateId) ?? 0) + value);
      }
    }
  }

  const countToleranceResolved = resolvePositiveFinite(options.countTolerance, Math.max(1e-12, probabilityTolerance * 20), 'countTolerance');
  if (typeof countToleranceResolved !== 'number') return countToleranceResolved;
  const likelihoodToleranceResolved = resolvePositiveFinite(options.likelihoodTolerance, Math.max(1e-12, probabilityTolerance * 100), 'likelihoodTolerance');
  if (typeof likelihoodToleranceResolved !== 'number') return likelihoodToleranceResolved;

  const aggregatedPosteriorInitialCounts = stateIds.map((stateId) => ({ stateId, expectedCount: initialCounts.get(stateId) ?? 0 }));
  const updatedInitial = aggregatedPosteriorInitialCounts.map((entry) => ({ stateId: entry.stateId, probability: entry.expectedCount / trajectoryCount }));
  const initialTotal = updatedInitial.reduce((sum, entry) => sum + entry.probability, 0);
  if (!Number.isFinite(initialTotal) || Math.abs(initialTotal - 1) > probabilityTolerance) {
    return failure('updated_initial_distribution_mass_violation', 'Updated multi-trajectory initial distribution does not sum to one', { actual: initialTotal, expected: 1, tolerance: probabilityTolerance });
  }

  const currentTransitionRows = aggregateCurrentRows(model, stateIds);
  const updatedTransitionRows = new Map<StateId, AggregateTransitionRow>();
  const transitionRows: MultiTrajectoryTransitionRow[] = [];

  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    const terminal = state !== undefined && isTerminalState(state);
    const currentRow = currentTransitionRows.get(stateId) ?? new Map<StateId, number>();
    const allowed = new Set(currentRow.keys());
    const expectedCounts = stateIds.map((toStateId) => ({ toStateId, expectedCount: transitionCounts.get(countKey(stateId, toStateId)) ?? 0 }));
    for (const entry of expectedCounts) {
      if (!Number.isFinite(entry.expectedCount) || entry.expectedCount < 0) {
        return failure('non_finite_reestimation_result', 'Aggregated posterior expected transition count became invalid', { stateId, toStateId: entry.toStateId, actual: entry.expectedCount });
      }
      if (!terminal && !allowed.has(entry.toStateId) && entry.expectedCount > countToleranceResolved) {
        return failure('expected_count_topology_inconsistency', 'Aggregated posterior expected count assigns mass outside fixed transition topology', { stateId, toStateId: entry.toStateId, actual: entry.expectedCount, expected: 0, tolerance: countToleranceResolved });
      }
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
    for (const toStateId of [...currentRow.keys()].sort(compareStrings)) updated.set(toStateId, (transitionCounts.get(countKey(stateId, toStateId)) ?? 0) / departure);
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > probabilityTolerance) {
      return failure('updated_transition_row_mass_violation', 'Updated multi-trajectory transition row does not sum to one', { stateId, actual: total, expected: 1, tolerance: probabilityTolerance });
    }
    updatedTransitionRows.set(stateId, updated);
    transitionRows.push({ stateId, terminal: false, expectedDepartureMass: departure, expectedCounts, currentRow: transitionRowEntries(currentRow), updatedRow: transitionRowEntries(updated), status: 'updated_positive_expected_departure', uniqueByExpectedCounts: true });
  }

  const currentKernel = currentKernelRows(request, stateIds, symbols);
  const updatedKernelRows = new Map<StateId, Map<string, number>>();
  const observationRows: MultiTrajectoryObservationRow[] = [];

  for (const stateId of stateIds) {
    const counts = emissionCounts.get(stateId);
    const currentRow = currentKernel.get(stateId);
    const occupancy = occupancies.get(stateId) ?? 0;
    if (counts === undefined || currentRow === undefined || !Number.isFinite(occupancy) || occupancy < 0) {
      return failure('non_finite_reestimation_result', 'Aggregated expected observation occupancy became invalid', { stateId, actual: occupancy });
    }
    const expectedCounts = symbols.map((symbol) => ({ symbol, expectedCount: counts.get(symbol) ?? 0 }));
    const countTotal = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (!Number.isFinite(countTotal) || Math.abs(countTotal - occupancy) > countToleranceResolved) {
      return failure('expected_emission_count_inconsistency', 'Aggregated expected emission counts do not sum to expected occupancy', { stateId, actual: countTotal, expected: occupancy, tolerance: countToleranceResolved });
    }
    if (occupancy <= countToleranceResolved) {
      const retained = new Map(currentRow);
      updatedKernelRows.set(stateId, retained);
      observationRows.push({ stateId, expectedOccupancy: occupancy, expectedCounts, currentRow: observationRowEntries(currentRow, symbols), updatedRow: observationRowEntries(retained, symbols), status: 'retained_zero_expected_occupancy', uniqueByExpectedCounts: false });
      continue;
    }
    const updated = new Map<string, number>();
    for (const symbol of symbols) updated.set(symbol, (counts.get(symbol) ?? 0) / occupancy);
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > probabilityTolerance) {
      return failure('updated_observation_kernel_row_mass_violation', 'Updated multi-trajectory observation-kernel row does not sum to one', { stateId, actual: total, expected: 1, tolerance: probabilityTolerance });
    }
    updatedKernelRows.set(stateId, updated);
    observationRows.push({ stateId, expectedOccupancy: occupancy, expectedCounts, currentRow: observationRowEntries(currentRow, symbols), updatedRow: observationRowEntries(updated, symbols), status: 'updated_positive_expected_occupancy', uniqueByExpectedCounts: true });
  }

  const updatedModel = buildUpdatedModel(model, updatedTransitionRows, currentTransitionRows);
  if ('failure' in updatedModel) return updatedModel;

  let updatedTotalLogLikelihood = 0;
  let updatedUnderflowed = false;
  for (let trajectoryIndex = 0; trajectoryIndex < trajectoryCount; trajectoryIndex += 1) {
    const observations = request.trajectories[trajectoryIndex];
    if (observations === undefined) return failure('internal_reestimation_inconsistency', 'Missing trajectory during updated likelihood evaluation', { trajectoryIndex });
    const updatedRequest = buildUpdatedRequest(request, observations, updatedInitial, stateIds, symbols, updatedKernelRows);
    if ('failure' in updatedRequest) return updatedRequest;
    const updatedFiltering = filterFiniteHiddenStateObservationSequence(updatedModel, updatedRequest, options);
    if (!updatedFiltering.ok) {
      return failure('internal_reestimation_inconsistency', `Multi-trajectory updated model failed Candidate C validation/filtering: ${updatedFiltering.failure.code}`, { trajectoryIndex });
    }
    if (!updatedFiltering.possible || updatedFiltering.logLikelihood === null) {
      return failure('internal_reestimation_inconsistency', 'One-step multi-trajectory joint update made previously possible trajectory impossible', { trajectoryIndex });
    }
    updatedTotalLogLikelihood += updatedFiltering.logLikelihood;
    updatedUnderflowed = updatedUnderflowed || updatedFiltering.diagnostics.sequenceProbabilityUnderflowed;
  }

  const likelihoodDelta = updatedTotalLogLikelihood - originalTotalLogLikelihood;
  if (!Number.isFinite(originalTotalLogLikelihood) || !Number.isFinite(updatedTotalLogLikelihood) || !Number.isFinite(likelihoodDelta)) {
    return failure('non_finite_reestimation_result', 'Multi-trajectory likelihood comparison became non-finite');
  }
  if (likelihoodDelta < -likelihoodToleranceResolved) {
    return failure('likelihood_monotonicity_violation', 'One-step multi-trajectory joint re-estimation decreased total realized observation log likelihood beyond tolerance', { actual: likelihoodDelta, expected: 0, tolerance: likelihoodToleranceResolved });
  }

  return {
    ok: true,
    possible: true,
    trajectoryCount,
    trajectories: request.trajectories.map((trajectory) => [...trajectory]),
    impossibleTrajectoryIndex: null,
    currentInitialDistribution: currentInitial,
    aggregatedPosteriorInitialCounts,
    updatedInitialDistribution: updatedInitial,
    transitionRows,
    observationKernelRows: observationRows,
    originalTotalLogLikelihood,
    updatedTotalLogLikelihood,
    likelihoodDelta,
    diagnostics: diagnostics(trajectoryCount, probabilityTolerance, countToleranceResolved, likelihoodToleranceResolved, anyUnderflowed || updatedUnderflowed, true)
  };
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

export function finiteHiddenStateMultiTrajectoryJointParameterReestimationResultToJson(result: MultiTrajectoryResult): string {
  assertFiniteDeep(result, 'result');
  return JSON.stringify(result);
}
