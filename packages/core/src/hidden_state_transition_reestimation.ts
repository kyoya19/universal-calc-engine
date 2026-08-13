import {
  DefinitionModel,
  ProbabilitySpec,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteHiddenStateObservationFailure,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteHiddenStatePairwiseSmoothingFailure,
  FiniteHiddenStatePairwiseSmoothingOptions,
  FiniteHiddenStatePairwiseSmoothingRequest,
  smoothFiniteHiddenStatePairwiseTransitions
} from './hidden_state_pairwise_smoothing';

export type FiniteHiddenStateTransitionReestimationRequest = FiniteHiddenStatePairwiseSmoothingRequest;

export type FiniteHiddenStateTransitionReestimationOptions = FiniteHiddenStatePairwiseSmoothingOptions & {
  countTolerance?: number;
  likelihoodTolerance?: number;
};

export type TransitionReestimationRowProbability = {
  toStateId: StateId;
  probability: number;
};

export type TransitionReestimationExpectedCount = {
  toStateId: StateId;
  expectedCount: number;
};

export type TransitionReestimationRowStatus =
  | 'updated_positive_expected_departure'
  | 'retained_zero_expected_departure'
  | 'structural_terminal_self_retention';

export type TransitionReestimationRow = {
  stateId: StateId;
  terminal: boolean;
  expectedDepartureMass: number;
  expectedCounts: TransitionReestimationExpectedCount[];
  currentRow: TransitionReestimationRowProbability[];
  updatedRow: TransitionReestimationRowProbability[];
  status: TransitionReestimationRowStatus;
  uniqueByExpectedCounts: boolean;
};

export type FiniteHiddenStateTransitionReestimationDiagnostics = {
  method: 'one_step_em_transition_m_step_from_candidate_r_expected_counts';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  candidateRExpectedCountsReused: true;
  observationKernelUpdated: false;
  initialDistributionUpdated: false;
  transitionTopologyChanged: false;
  terminalRowsLearned: false;
  iterativeBaumWelchUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  updatedPositiveDepartureRowCount: number;
  retainedZeroDepartureRowCount: number;
  structuralTerminalRowCount: number;
};

export type TransitionReestimationFailureCode =
  | 'invalid_reestimation_tolerance'
  | 'expected_count_topology_inconsistency'
  | 'updated_transition_row_mass_violation'
  | 'likelihood_monotonicity_violation'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

export type TransitionReestimationFailure = {
  code: TransitionReestimationFailureCode;
  message: string;
  stateId?: StateId;
  toStateId?: StateId;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteHiddenStateTransitionReestimationFailure = {
  ok: false;
  failure: TransitionReestimationFailure;
};

export type FiniteHiddenStateTransitionReestimationSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  rows: TransitionReestimationRow[] | null;
  originalLogLikelihood: number | null;
  updatedLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: FiniteHiddenStateTransitionReestimationDiagnostics;
};

export type FiniteHiddenStateTransitionReestimationResult =
  | FiniteHiddenStateTransitionReestimationSuccess
  | FiniteHiddenStateObservationFailure
  | FiniteHiddenStatePairwiseSmoothingFailure
  | FiniteHiddenStateTransitionReestimationFailure;

type AggregateTransitionRow = Map<StateId, number>;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: TransitionReestimationFailureCode,
  message: string,
  details: Omit<TransitionReestimationFailure, 'code' | 'message'> = {}
): FiniteHiddenStateTransitionReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'countTolerance' | 'likelihoodTolerance'
): number | FiniteHiddenStateTransitionReestimationFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, {
      actual: resolved
    });
  }
  return resolved;
}

function probabilitySpecWithValue(spec: ProbabilitySpec, value: number): ProbabilitySpec {
  return typeof spec === 'number' ? value : { type: 'constant', value };
}

function aggregateCurrentRows(
  model: DefinitionModel,
  stateIds: StateId[]
): Map<StateId, AggregateTransitionRow> {
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

function countKey(fromStateId: StateId, toStateId: StateId): string {
  return `${fromStateId}\u0000${toStateId}`;
}

function rowToEntries(row: AggregateTransitionRow): TransitionReestimationRowProbability[] {
  return [...row.entries()]
    .sort(([left], [right]) => compareStrings(left, right))
    .map(([toStateId, probability]) => ({ toStateId, probability }));
}

function buildUpdatedModel(
  model: DefinitionModel,
  updatedRows: Map<StateId, AggregateTransitionRow>,
  currentRows: Map<StateId, AggregateTransitionRow>
): DefinitionModel | FiniteHiddenStateTransitionReestimationFailure {
  const transitions = [] as DefinitionModel['transitions'];

  for (const transition of model.transitions) {
    const state = model.states.find((candidate) => candidate.id === transition.from);
    if (state !== undefined && isTerminalState(state)) {
      transitions.push({ ...transition });
      continue;
    }

    const currentAggregate = currentRows.get(transition.from)?.get(transition.to);
    const updatedAggregate = updatedRows.get(transition.from)?.get(transition.to);
    if (currentAggregate === undefined || updatedAggregate === undefined) {
      return failure(
        'internal_reestimation_inconsistency',
        'Missing aggregate transition row while applying re-estimation',
        { stateId: transition.from, toStateId: transition.to }
      );
    }

    const currentEdge = evaluateProbabilitySpec(transition.probability);
    let updatedEdge = 0;
    if (currentAggregate > 0) {
      updatedEdge = updatedAggregate * (currentEdge / currentAggregate);
    } else if (updatedAggregate !== 0) {
      return failure(
        'expected_count_topology_inconsistency',
        'Cannot assign positive updated mass through a zero-current aggregate transition support',
        {
          stateId: transition.from,
          toStateId: transition.to,
          actual: updatedAggregate,
          expected: 0
        }
      );
    }

    if (!Number.isFinite(updatedEdge) || updatedEdge < 0) {
      return failure('non_finite_reestimation_result', 'Updated transition edge probability became invalid', {
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedEdge
      });
    }

    transitions.push({
      ...transition,
      probability: probabilitySpecWithValue(transition.probability, updatedEdge)
    });
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

function diagnostics(
  probabilityTolerance: number,
  countTolerance: number,
  likelihoodTolerance: number,
  rows: TransitionReestimationRow[] | null
): FiniteHiddenStateTransitionReestimationDiagnostics {
  return {
    method: 'one_step_em_transition_m_step_from_candidate_r_expected_counts',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    candidateRExpectedCountsReused: true,
    observationKernelUpdated: false,
    initialDistributionUpdated: false,
    transitionTopologyChanged: false,
    terminalRowsLearned: false,
    iterativeBaumWelchUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance,
    countTolerance,
    likelihoodTolerance,
    updatedPositiveDepartureRowCount:
      rows?.filter((row) => row.status === 'updated_positive_expected_departure').length ?? 0,
    retainedZeroDepartureRowCount:
      rows?.filter((row) => row.status === 'retained_zero_expected_departure').length ?? 0,
    structuralTerminalRowCount:
      rows?.filter((row) => row.status === 'structural_terminal_self_retention').length ?? 0
  };
}

export function reestimateFiniteHiddenStateTransitionsOneStep(
  model: DefinitionModel,
  request: FiniteHiddenStateTransitionReestimationRequest,
  options: FiniteHiddenStateTransitionReestimationOptions = {}
): FiniteHiddenStateTransitionReestimationResult {
  const pairwise = smoothFiniteHiddenStatePairwiseTransitions(model, request, options);
  if (!pairwise.ok) return pairwise;

  const probabilityTolerance = pairwise.diagnostics.probabilityTolerance;
  const countToleranceResolved = resolvePositiveFinite(
    options.countTolerance,
    Math.max(1e-12, probabilityTolerance * 20),
    'countTolerance'
  );
  if (typeof countToleranceResolved !== 'number') return countToleranceResolved;
  const likelihoodToleranceResolved = resolvePositiveFinite(
    options.likelihoodTolerance,
    Math.max(1e-12, probabilityTolerance * 100),
    'likelihoodTolerance'
  );
  if (typeof likelihoodToleranceResolved !== 'number') return likelihoodToleranceResolved;

  if (!pairwise.possible) {
    return {
      ok: true,
      possible: false,
      observations: [...request.observations],
      rows: null,
      originalLogLikelihood: null,
      updatedLogLikelihood: null,
      likelihoodDelta: null,
      diagnostics: diagnostics(
        probabilityTolerance,
        countToleranceResolved,
        likelihoodToleranceResolved,
        null
      )
    };
  }

  if (pairwise.expectedTransitionCounts === null || pairwise.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'Candidate R did not provide expected counts and finite log likelihood for a possible sequence'
    );
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const currentRows = aggregateCurrentRows(model, stateIds);
  const countByPair = new Map<string, number>();
  for (const count of pairwise.expectedTransitionCounts) {
    countByPair.set(countKey(count.fromStateId, count.toStateId), count.expectedCount);
  }

  for (const fromStateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === fromStateId);
    const allowed = new Set(currentRows.get(fromStateId)?.keys() ?? []);
    if (state !== undefined && isTerminalState(state)) {
      allowed.clear();
      allowed.add(fromStateId);
    }
    for (const toStateId of stateIds) {
      const expectedCount = countByPair.get(countKey(fromStateId, toStateId)) ?? 0;
      if (!Number.isFinite(expectedCount) || expectedCount < 0) {
        return failure('non_finite_reestimation_result', 'Posterior expected transition count became invalid', {
          stateId: fromStateId,
          toStateId,
          actual: expectedCount
        });
      }
      if (!allowed.has(toStateId) && expectedCount > countToleranceResolved) {
        return failure(
          'expected_count_topology_inconsistency',
          'Posterior expected count assigns mass outside the fixed transition topology',
          {
            stateId: fromStateId,
            toStateId,
            actual: expectedCount,
            expected: 0,
            tolerance: countToleranceResolved
          }
        );
      }
    }
  }

  const updatedRows = new Map<StateId, AggregateTransitionRow>();
  const resultRows: TransitionReestimationRow[] = [];

  for (const stateId of stateIds) {
    const state = model.states.find((candidate) => candidate.id === stateId);
    const terminal = state !== undefined && isTerminalState(state);
    const currentRow = currentRows.get(stateId) ?? new Map<StateId, number>();
    const expectedCounts = stateIds.map((toStateId) => ({
      toStateId,
      expectedCount: countByPair.get(countKey(stateId, toStateId)) ?? 0
    }));
    const expectedDepartureMass = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);

    if (!Number.isFinite(expectedDepartureMass) || expectedDepartureMass < 0) {
      return failure('non_finite_reestimation_result', 'Expected departure mass became invalid', {
        stateId,
        actual: expectedDepartureMass
      });
    }

    if (terminal) {
      const row = new Map<StateId, number>([[stateId, 1]]);
      updatedRows.set(stateId, row);
      resultRows.push({
        stateId,
        terminal: true,
        expectedDepartureMass,
        expectedCounts,
        currentRow: rowToEntries(currentRow),
        updatedRow: rowToEntries(row),
        status: 'structural_terminal_self_retention',
        uniqueByExpectedCounts: false
      });
      continue;
    }

    if (expectedDepartureMass <= countToleranceResolved) {
      const retained = new Map(currentRow);
      updatedRows.set(stateId, retained);
      resultRows.push({
        stateId,
        terminal: false,
        expectedDepartureMass,
        expectedCounts,
        currentRow: rowToEntries(currentRow),
        updatedRow: rowToEntries(retained),
        status: 'retained_zero_expected_departure',
        uniqueByExpectedCounts: false
      });
      continue;
    }

    const updated = new Map<StateId, number>();
    for (const toStateId of [...currentRow.keys()].sort(compareStrings)) {
      const expectedCount = countByPair.get(countKey(stateId, toStateId)) ?? 0;
      updated.set(toStateId, expectedCount / expectedDepartureMass);
    }
    const total = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || Math.abs(total - 1) > probabilityTolerance) {
      return failure(
        'updated_transition_row_mass_violation',
        'Updated transition row does not sum to one',
        {
          stateId,
          actual: total,
          expected: 1,
          tolerance: probabilityTolerance
        }
      );
    }
    for (const [toStateId, value] of updated) {
      if (!Number.isFinite(value) || value < 0 || value > 1 + probabilityTolerance) {
        return failure('non_finite_reestimation_result', 'Updated aggregate transition probability became invalid', {
          stateId,
          toStateId,
          actual: value
        });
      }
    }
    updatedRows.set(stateId, updated);
    resultRows.push({
      stateId,
      terminal: false,
      expectedDepartureMass,
      expectedCounts,
      currentRow: rowToEntries(currentRow),
      updatedRow: rowToEntries(updated),
      status: 'updated_positive_expected_departure',
      uniqueByExpectedCounts: true
    });
  }

  const updatedModel = buildUpdatedModel(model, updatedRows, currentRows);
  if ('failure' in updatedModel) return updatedModel;

  const updatedFiltering = filterFiniteHiddenStateObservationSequence(updatedModel, request, options);
  if (!updatedFiltering.ok) {
    return failure(
      'internal_reestimation_inconsistency',
      `Updated transition model failed Candidate C validation/filtering: ${updatedFiltering.failure.code}`
    );
  }
  if (!updatedFiltering.possible || updatedFiltering.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'One-step transition update made previously possible evidence impossible'
    );
  }

  const originalLogLikelihood = pairwise.logLikelihood;
  const updatedLogLikelihood = updatedFiltering.logLikelihood;
  const likelihoodDelta = updatedLogLikelihood - originalLogLikelihood;
  if (
    !Number.isFinite(originalLogLikelihood) ||
    !Number.isFinite(updatedLogLikelihood) ||
    !Number.isFinite(likelihoodDelta)
  ) {
    return failure('non_finite_reestimation_result', 'Observation log-likelihood comparison became non-finite');
  }
  if (likelihoodDelta < -likelihoodToleranceResolved) {
    return failure(
      'likelihood_monotonicity_violation',
      'One-step transition re-estimation decreased the realized observation log likelihood beyond tolerance',
      {
        actual: likelihoodDelta,
        expected: 0,
        tolerance: likelihoodToleranceResolved
      }
    );
  }

  return {
    ok: true,
    possible: true,
    observations: [...request.observations],
    rows: resultRows,
    originalLogLikelihood,
    updatedLogLikelihood,
    likelihoodDelta,
    diagnostics: diagnostics(
      probabilityTolerance,
      countToleranceResolved,
      likelihoodToleranceResolved,
      resultRows
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

export function finiteHiddenStateTransitionReestimationResultToJson(
  result: FiniteHiddenStateTransitionReestimationResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state transition re-estimation result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}