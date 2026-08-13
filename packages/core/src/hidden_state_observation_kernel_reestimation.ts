import { DefinitionModel, StateId } from './model';
import {
  FiniteHiddenStateObservationFailure,
  FiniteHiddenStateObservationRequest,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence
} from './hidden_state_observation';
import {
  FiniteHiddenStateSmoothingOptions,
  smoothFiniteHiddenStateObservationSequence
} from './hidden_state_smoothing';

export type FiniteHiddenStateObservationKernelReestimationRequest = FiniteHiddenStateObservationRequest;

export type FiniteHiddenStateObservationKernelReestimationOptions = FiniteHiddenStateSmoothingOptions & {
  countTolerance?: number;
  likelihoodTolerance?: number;
};

export type ObservationKernelReestimationRowProbability = {
  symbol: string;
  probability: number;
};

export type ObservationKernelReestimationExpectedCount = {
  symbol: string;
  expectedCount: number;
};

export type ObservationKernelReestimationRowStatus =
  | 'updated_positive_expected_occupancy'
  | 'retained_zero_expected_occupancy';

export type ObservationKernelReestimationRow = {
  stateId: StateId;
  expectedOccupancy: number;
  expectedCounts: ObservationKernelReestimationExpectedCount[];
  currentRow: ObservationKernelReestimationRowProbability[];
  updatedRow: ObservationKernelReestimationRowProbability[];
  status: ObservationKernelReestimationRowStatus;
  uniqueByExpectedCounts: boolean;
};

export type FiniteHiddenStateObservationKernelReestimationDiagnostics = {
  method: 'one_step_em_observation_kernel_m_step_from_candidate_h_smoothed_occupancy';
  numericRepresentation: 'javascript_number_float64';
  simulationUsed: false;
  inputNormalizationApplied: false;
  candidateHSmoothedOccupancyReused: true;
  observationKernelRowsNormalizedFromExpectedCounts: boolean;
  zeroOccupancyRowsRetainCurrentRow: true;
  transitionModelUpdated: false;
  initialDistributionUpdated: false;
  observationAlphabetUpdated: false;
  iterativeBaumWelchUsed: false;
  bayesianPriorUsed: false;
  globalModelIdentificationClaimed: false;
  probabilityTolerance: number;
  countTolerance: number;
  likelihoodTolerance: number;
  sequenceProbabilityUnderflowed: boolean;
  updatedPositiveOccupancyRowCount: number;
  retainedZeroOccupancyRowCount: number;
};

export type ObservationKernelReestimationFailureCode =
  | 'invalid_reestimation_tolerance'
  | 'expected_emission_count_inconsistency'
  | 'updated_observation_kernel_row_mass_violation'
  | 'likelihood_monotonicity_violation'
  | 'non_finite_reestimation_result'
  | 'internal_reestimation_inconsistency';

export type ObservationKernelReestimationFailure = {
  code: ObservationKernelReestimationFailureCode;
  message: string;
  stateId?: StateId;
  symbol?: string;
  actual?: number;
  expected?: number;
  tolerance?: number;
};

export type FiniteHiddenStateObservationKernelReestimationFailure = {
  ok: false;
  failure: ObservationKernelReestimationFailure;
};

export type FiniteHiddenStateObservationKernelReestimationSuccess = {
  ok: true;
  possible: boolean;
  observations: string[];
  rows: ObservationKernelReestimationRow[] | null;
  originalLogLikelihood: number | null;
  updatedLogLikelihood: number | null;
  likelihoodDelta: number | null;
  diagnostics: FiniteHiddenStateObservationKernelReestimationDiagnostics;
};

export type FiniteHiddenStateObservationKernelReestimationResult =
  | FiniteHiddenStateObservationKernelReestimationSuccess
  | FiniteHiddenStateObservationFailure
  | FiniteHiddenStateObservationKernelReestimationFailure;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: ObservationKernelReestimationFailureCode,
  message: string,
  details: Omit<ObservationKernelReestimationFailure, 'code' | 'message'> = {}
): FiniteHiddenStateObservationKernelReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolvePositiveFinite(
  value: number | undefined,
  fallback: number,
  name: 'countTolerance' | 'likelihoodTolerance'
): number | FiniteHiddenStateObservationKernelReestimationFailure {
  const resolved = value ?? fallback;
  if (!Number.isFinite(resolved) || resolved <= 0) {
    return failure('invalid_reestimation_tolerance', `${name} must be a finite positive number`, {
      actual: resolved
    });
  }
  return resolved;
}

function currentKernelByState(
  request: FiniteHiddenStateObservationKernelReestimationRequest,
  stateIds: StateId[],
  symbols: string[]
): Map<StateId, Map<string, number>> {
  const result = new Map<StateId, Map<string, number>>();
  for (const stateId of stateIds) {
    result.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
  }
  for (const entry of request.kernel) {
    result.get(entry.stateId)?.set(entry.symbol, entry.probability);
  }
  return result;
}

function rowToEntries(
  row: Map<string, number>,
  symbols: string[]
): ObservationKernelReestimationRowProbability[] {
  return symbols.map((symbol) => ({ symbol, probability: row.get(symbol) ?? 0 }));
}

function buildUpdatedRequest(
  request: FiniteHiddenStateObservationKernelReestimationRequest,
  stateIds: StateId[],
  symbols: string[],
  updatedRows: Map<StateId, Map<string, number>>
): FiniteHiddenStateObservationKernelReestimationRequest | FiniteHiddenStateObservationKernelReestimationFailure {
  const kernel: HiddenObservationKernelEntry[] = [];
  for (const stateId of stateIds) {
    const row = updatedRows.get(stateId);
    if (row === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing updated observation-kernel row', { stateId });
    }
    for (const symbol of symbols) {
      const probability = row.get(symbol);
      if (probability === undefined) {
        return failure('internal_reestimation_inconsistency', 'Missing updated observation-kernel probability', {
          stateId,
          symbol
        });
      }
      if (!Number.isFinite(probability) || probability < 0) {
        return failure('non_finite_reestimation_result', 'Updated observation-kernel probability became invalid', {
          stateId,
          symbol,
          actual: probability
        });
      }
      kernel.push({ stateId, symbol, probability });
    }
  }
  return {
    initialDistribution: request.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel,
    observations: [...request.observations]
  };
}

function diagnostics(
  probabilityTolerance: number,
  countTolerance: number,
  likelihoodTolerance: number,
  sequenceProbabilityUnderflowed: boolean,
  rows: ObservationKernelReestimationRow[] | null
): FiniteHiddenStateObservationKernelReestimationDiagnostics {
  const updatedPositiveOccupancyRowCount =
    rows?.filter((row) => row.status === 'updated_positive_expected_occupancy').length ?? 0;
  return {
    method: 'one_step_em_observation_kernel_m_step_from_candidate_h_smoothed_occupancy',
    numericRepresentation: 'javascript_number_float64',
    simulationUsed: false,
    inputNormalizationApplied: false,
    candidateHSmoothedOccupancyReused: true,
    observationKernelRowsNormalizedFromExpectedCounts: updatedPositiveOccupancyRowCount > 0,
    zeroOccupancyRowsRetainCurrentRow: true,
    transitionModelUpdated: false,
    initialDistributionUpdated: false,
    observationAlphabetUpdated: false,
    iterativeBaumWelchUsed: false,
    bayesianPriorUsed: false,
    globalModelIdentificationClaimed: false,
    probabilityTolerance,
    countTolerance,
    likelihoodTolerance,
    sequenceProbabilityUnderflowed,
    updatedPositiveOccupancyRowCount,
    retainedZeroOccupancyRowCount:
      rows?.filter((row) => row.status === 'retained_zero_expected_occupancy').length ?? 0
  };
}

export function reestimateFiniteHiddenStateObservationKernelOneStep(
  model: DefinitionModel,
  request: FiniteHiddenStateObservationKernelReestimationRequest,
  options: FiniteHiddenStateObservationKernelReestimationOptions = {}
): FiniteHiddenStateObservationKernelReestimationResult {
  const smoothing = smoothFiniteHiddenStateObservationSequence(model, request, options);
  if (!smoothing.ok) return smoothing;

  const probabilityTolerance = smoothing.diagnostics.probabilityTolerance;
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

  if (!smoothing.possible) {
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
        smoothing.diagnostics.sequenceProbabilityUnderflowed,
        null
      )
    };
  }

  if (smoothing.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'Candidate H did not provide finite log likelihood for a possible observation sequence'
    );
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStrings);
  const symbols = [...request.alphabet].sort(compareStrings);
  const currentRows = currentKernelByState(request, stateIds, symbols);
  const expectedCountByState = new Map<StateId, Map<string, number>>();
  const expectedOccupancyByState = new Map<StateId, number>();
  for (const stateId of stateIds) {
    expectedCountByState.set(stateId, new Map(symbols.map((symbol) => [symbol, 0])));
    expectedOccupancyByState.set(stateId, 0);
  }

  for (const step of smoothing.steps) {
    if (step.smoothedDistribution === null) {
      return failure(
        'internal_reestimation_inconsistency',
        'Candidate H returned missing smoothed distribution for possible evidence'
      );
    }
    const symbol = step.observation;
    if (!symbols.includes(symbol)) {
      return failure('expected_emission_count_inconsistency', 'Smoothed step uses symbol outside fixed alphabet', {
        symbol
      });
    }
    for (const entry of step.smoothedDistribution) {
      if (!Number.isFinite(entry.probability) || entry.probability < 0) {
        return failure('non_finite_reestimation_result', 'Smoothed posterior state probability became invalid', {
          stateId: entry.stateId,
          actual: entry.probability
        });
      }
      const row = expectedCountByState.get(entry.stateId);
      if (row === undefined) {
        return failure('expected_emission_count_inconsistency', 'Candidate H returned unknown hidden state', {
          stateId: entry.stateId
        });
      }
      row.set(symbol, (row.get(symbol) ?? 0) + entry.probability);
      expectedOccupancyByState.set(
        entry.stateId,
        (expectedOccupancyByState.get(entry.stateId) ?? 0) + entry.probability
      );
    }
  }

  const updatedRows = new Map<StateId, Map<string, number>>();
  const resultRows: ObservationKernelReestimationRow[] = [];

  for (const stateId of stateIds) {
    const counts = expectedCountByState.get(stateId);
    const currentRow = currentRows.get(stateId);
    const expectedOccupancy = expectedOccupancyByState.get(stateId) ?? 0;
    if (counts === undefined || currentRow === undefined) {
      return failure('internal_reestimation_inconsistency', 'Missing observation-kernel re-estimation row', {
        stateId
      });
    }
    if (!Number.isFinite(expectedOccupancy) || expectedOccupancy < 0) {
      return failure('non_finite_reestimation_result', 'Expected hidden-state occupancy became invalid', {
        stateId,
        actual: expectedOccupancy
      });
    }

    const expectedCounts = symbols.map((symbol) => ({
      symbol,
      expectedCount: counts.get(symbol) ?? 0
    }));
    const countTotal = expectedCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
    if (!Number.isFinite(countTotal) || Math.abs(countTotal - expectedOccupancy) > countToleranceResolved) {
      return failure(
        'expected_emission_count_inconsistency',
        'Posterior expected emission counts do not sum to expected hidden-state occupancy',
        {
          stateId,
          actual: countTotal,
          expected: expectedOccupancy,
          tolerance: countToleranceResolved
        }
      );
    }

    if (expectedOccupancy <= countToleranceResolved) {
      const retained = new Map(currentRow);
      updatedRows.set(stateId, retained);
      resultRows.push({
        stateId,
        expectedOccupancy,
        expectedCounts,
        currentRow: rowToEntries(currentRow, symbols),
        updatedRow: rowToEntries(retained, symbols),
        status: 'retained_zero_expected_occupancy',
        uniqueByExpectedCounts: false
      });
      continue;
    }

    const updated = new Map<string, number>();
    for (const symbol of symbols) {
      updated.set(symbol, (counts.get(symbol) ?? 0) / expectedOccupancy);
    }
    const rowTotal = [...updated.values()].reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(rowTotal) || Math.abs(rowTotal - 1) > probabilityTolerance) {
      return failure(
        'updated_observation_kernel_row_mass_violation',
        'Updated observation-kernel row does not sum to one',
        {
          stateId,
          actual: rowTotal,
          expected: 1,
          tolerance: probabilityTolerance
        }
      );
    }
    for (const [symbol, probability] of updated) {
      if (!Number.isFinite(probability) || probability < 0 || probability > 1 + probabilityTolerance) {
        return failure('non_finite_reestimation_result', 'Updated observation-kernel probability became invalid', {
          stateId,
          symbol,
          actual: probability
        });
      }
    }
    updatedRows.set(stateId, updated);
    resultRows.push({
      stateId,
      expectedOccupancy,
      expectedCounts,
      currentRow: rowToEntries(currentRow, symbols),
      updatedRow: rowToEntries(updated, symbols),
      status: 'updated_positive_expected_occupancy',
      uniqueByExpectedCounts: true
    });
  }

  const updatedRequest = buildUpdatedRequest(request, stateIds, symbols, updatedRows);
  if ('failure' in updatedRequest) return updatedRequest;

  const updatedFiltering = filterFiniteHiddenStateObservationSequence(model, updatedRequest, options);
  if (!updatedFiltering.ok) {
    return failure(
      'internal_reestimation_inconsistency',
      `Updated observation kernel failed Candidate C validation/filtering: ${updatedFiltering.failure.code}`
    );
  }
  if (!updatedFiltering.possible || updatedFiltering.logLikelihood === null) {
    return failure(
      'internal_reestimation_inconsistency',
      'One-step observation-kernel update made previously possible evidence impossible'
    );
  }

  const originalLogLikelihood = smoothing.logLikelihood;
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
      'One-step observation-kernel re-estimation decreased the realized observation log likelihood beyond tolerance',
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
      smoothing.diagnostics.sequenceProbabilityUnderflowed,
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

export function finiteHiddenStateObservationKernelReestimationResultToJson(
  result: FiniteHiddenStateObservationKernelReestimationResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite hidden-state observation-kernel re-estimation result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
