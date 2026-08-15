import {
  DefinitionModel,
  ProbabilitySpec,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import {
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest,
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure,
  FiniteObservedMonitorCoupledEvidenceRecordEStep,
  FiniteObservedMonitorCoupledEvidenceStateExpectedCount,
  FiniteObservedMonitorCoupledEvidenceStateProbability,
  FiniteObservedMonitorCoupledEvidenceTransitionRow,
  FiniteObservedMonitorCoupledEvidenceObservationRow,
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import { HiddenObservationKernelEntry } from './hidden_state_observation';

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest =
  FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest & {
    maxIterations: number;
    parameterConvergenceTolerance: number;
    logLikelihoodConvergenceTolerance: number;
    likelihoodNonDecreaseTolerance: number;
    maxIterationResourceGuard?: number;
  };

export type FiniteObservedMonitorCoupledEvidenceIterativeStopReason =
  | 'CONVERGED'
  | 'MAX_ITERATIONS_REACHED'
  | 'EXACT_PARAMETER_CYCLE_DETECTED'
  | 'INITIAL_DATASET_IMPOSSIBLE';

export type FiniteObservedMonitorCoupledEvidenceIterativeTransitionRowSnapshot = {
  stateId: StateId;
  terminal: boolean;
  row: Array<{ toStateId: StateId; probability: number }>;
};

export type FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot = {
  initialDistribution: FiniteObservedMonitorCoupledEvidenceStateProbability[];
  transitionRows: FiniteObservedMonitorCoupledEvidenceIterativeTransitionRowSnapshot[];
  observationKernel: HiddenObservationKernelEntry[];
};

export type FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace = {
  iteration: number;
  currentTotalLogLikelihood: number;
  updatedTotalLogLikelihood: number;
  logLikelihoodDelta: number;
  maxParameterDelta: number;
  monotonicitySatisfied: true;
  allRecordEStepsUseSameCurrentModel: true;
  allRecordEStepsFrozenBeforeMstep: true;
  freshAllRecordEStepPerformed: true;
  externalEvidenceAndMonitorDefinitionsFixed: true;
  recordESteps: FiniteObservedMonitorCoupledEvidenceRecordEStep[];
  aggregatedPosteriorInitialCounts: FiniteObservedMonitorCoupledEvidenceStateExpectedCount[];
  transitionRows: FiniteObservedMonitorCoupledEvidenceTransitionRow[];
  observationKernelRows: FiniteObservedMonitorCoupledEvidenceObservationRow[];
  retainedZeroDepartureStateIds: StateId[];
  retainedZeroOccupancyStateIds: StateId[];
};

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationDiagnostics = {
  method: 'bounded_convergence_controlled_iterative_joint_pi_a_b_em_from_fresh_common_current_candidate_ai_e_steps';
  numericRepresentation: 'javascript_number_float64_with_candidate_ai_log_likelihood';
  simulationUsed: false;
  approximationUsed: false;
  candidateAIKernelUsed: true;
  freshAllRecordEStepsEachIteration: true;
  staleSufficientStatisticReuseUsed: false;
  sequentialParameterBlockUpdatesUsed: false;
  sequentialRecordUpdatesUsed: false;
  externalEvidenceMutationUsed: false;
  monitorMutationUsed: false;
  topologyLearningUsed: false;
  observationAlphabetLearningUsed: false;
  hardEmUsed: false;
  bayesianInferenceUsed: false;
  samplingUsed: false;
  globalOptimumClaimed: false;
  maxIterations: number;
  maxIterationResourceGuard: number;
  parameterConvergenceTolerance: number;
  logLikelihoodConvergenceTolerance: number;
  likelihoodNonDecreaseTolerance: number;
  acceptedIterations: number;
};

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailureCode =
  | 'invalid_iterative_tolerance'
  | 'invalid_max_iterations'
  | 'candidate_aj_resource_limit_exceeded'
  | 'candidate_ai_iteration_failure'
  | 'candidate_ai_iteration_inconsistency'
  | 'iterative_likelihood_monotonicity_violation'
  | 'later_dataset_became_impossible'
  | 'parameter_topology_inconsistency'
  | 'non_finite_iterative_result';

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure = {
  ok: false;
  failure: {
    code: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailureCode;
    message: string;
    iteration?: number;
    sourceFailureCode?: string;
    stateId?: StateId;
    toStateId?: StateId;
    symbol?: string;
    actual?: number;
    expected?: number;
    tolerance?: number;
  };
};

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationSuccess = {
  ok: true;
  possible: boolean;
  converged: boolean;
  stopReason: FiniteObservedMonitorCoupledEvidenceIterativeStopReason;
  acceptedIterations: number;
  initialTheta: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot;
  finalTheta: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot;
  initialImpossibleRecordIndex: number | null;
  initialImpossibleRecordId: string | null;
  finalTotalLogLikelihood: number | null;
  iterationTrace: FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace[];
  exactParameterCycle: {
    detected: boolean;
    repeatedFingerprintFirstAcceptedIteration: number | null;
    repeatedAtAcceptedIteration: number | null;
  };
  diagnostics: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationDiagnostics;
};

export type FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResult =
  | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationSuccess
  | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure;

type ResolvedIterativeControls = {
  maxIterations: number;
  maxIterationResourceGuard: number;
  parameterConvergenceTolerance: number;
  logLikelihoodConvergenceTolerance: number;
  likelihoodNonDecreaseTolerance: number;
};

const DEFAULT_MAX_ITERATION_RESOURCE_GUARD = 10_000;
const DEFAULT_CANDIDATE_AI_LIKELIHOOD_TOLERANCE = 1e-10;

function compareStrings(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function failure(
  code: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailureCode,
  message: string,
  details: Omit<FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure['failure'], 'code' | 'message'> = {}
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveFiniteNonnegative(
  value: number,
  name: 'parameterConvergenceTolerance' | 'logLikelihoodConvergenceTolerance' | 'likelihoodNonDecreaseTolerance'
): number | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure {
  if (!Number.isFinite(value) || value < 0) {
    return failure('invalid_iterative_tolerance', `${name} must be a finite nonnegative number`, { actual: value });
  }
  return value;
}

function resolveControls(
  request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest
): ResolvedIterativeControls | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure {
  const parameterConvergenceTolerance = resolveFiniteNonnegative(
    request.parameterConvergenceTolerance,
    'parameterConvergenceTolerance'
  );
  if (typeof parameterConvergenceTolerance !== 'number') return parameterConvergenceTolerance;
  const logLikelihoodConvergenceTolerance = resolveFiniteNonnegative(
    request.logLikelihoodConvergenceTolerance,
    'logLikelihoodConvergenceTolerance'
  );
  if (typeof logLikelihoodConvergenceTolerance !== 'number') return logLikelihoodConvergenceTolerance;
  const likelihoodNonDecreaseTolerance = resolveFiniteNonnegative(
    request.likelihoodNonDecreaseTolerance,
    'likelihoodNonDecreaseTolerance'
  );
  if (typeof likelihoodNonDecreaseTolerance !== 'number') return likelihoodNonDecreaseTolerance;

  if (!Number.isSafeInteger(request.maxIterations) || request.maxIterations <= 0) {
    return failure('invalid_max_iterations', 'maxIterations must be a positive safe integer', { actual: request.maxIterations });
  }
  const maxIterationResourceGuard = request.maxIterationResourceGuard ?? DEFAULT_MAX_ITERATION_RESOURCE_GUARD;
  if (!Number.isSafeInteger(maxIterationResourceGuard) || maxIterationResourceGuard <= 0) {
    return failure('candidate_aj_resource_limit_exceeded', 'maxIterationResourceGuard must be a positive safe integer', {
      actual: maxIterationResourceGuard
    });
  }
  if (request.maxIterations > maxIterationResourceGuard) {
    return failure('candidate_aj_resource_limit_exceeded', 'maxIterations exceeds maxIterationResourceGuard', {
      actual: request.maxIterations,
      expected: maxIterationResourceGuard
    });
  }
  return {
    maxIterations: request.maxIterations,
    maxIterationResourceGuard,
    parameterConvergenceTolerance,
    logLikelihoodConvergenceTolerance,
    likelihoodNonDecreaseTolerance
  };
}

function probabilitySpecWithValue(spec: ProbabilitySpec, value: number): ProbabilitySpec {
  return typeof spec === 'number' ? value : { type: 'constant', value };
}

function stateIds(model: DefinitionModel): StateId[] {
  return model.states.map((state) => state.id).sort(compareStrings);
}

function aggregateTransitionRows(
  model: DefinitionModel
): FiniteObservedMonitorCoupledEvidenceIterativeTransitionRowSnapshot[] {
  const ids = stateIds(model);
  return ids.map((stateId) => {
    const state = model.states.find((candidate) => candidate.id === stateId)!;
    if (isTerminalState(state)) {
      return { stateId, terminal: true, row: [{ toStateId: stateId, probability: 1 }] };
    }
    const aggregate = new Map<StateId, number>();
    for (const transition of model.transitions) {
      if (transition.from !== stateId) continue;
      const probability = evaluateProbabilitySpec(transition.probability);
      aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
    }
    return {
      stateId,
      terminal: false,
      row: [...aggregate.entries()]
        .sort(([left], [right]) => compareStrings(left, right))
        .map(([toStateId, probability]) => ({ toStateId, probability }))
    };
  });
}

function canonicalInitialDistribution(
  initialDistribution: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest['initialDistribution']
): FiniteObservedMonitorCoupledEvidenceStateProbability[] {
  return initialDistribution
    .map((entry) => ({ stateId: entry.stateId, probability: entry.probability }))
    .sort((left, right) => compareStrings(left.stateId, right.stateId));
}

function canonicalKernel(kernel: HiddenObservationKernelEntry[]): HiddenObservationKernelEntry[] {
  return kernel
    .map((entry) => ({ ...entry }))
    .sort((left, right) => compareStrings(left.stateId, right.stateId) || compareStrings(left.symbol, right.symbol));
}

function snapshot(
  model: DefinitionModel,
  initialDistribution: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest['initialDistribution'],
  kernel: HiddenObservationKernelEntry[]
): FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot {
  return {
    initialDistribution: canonicalInitialDistribution(initialDistribution),
    transitionRows: aggregateTransitionRows(model),
    observationKernel: canonicalKernel(kernel)
  };
}

function parameterVector(snapshotValue: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot): number[] {
  return [
    ...snapshotValue.initialDistribution.map((entry) => entry.probability),
    ...snapshotValue.transitionRows.flatMap((row) => row.terminal ? [] : row.row.map((entry) => entry.probability)),
    ...snapshotValue.observationKernel.map((entry) => entry.probability)
  ];
}

function parameterFingerprint(snapshotValue: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot): string {
  return JSON.stringify(parameterVector(snapshotValue));
}

function maxParameterDelta(
  current: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot,
  updated: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot
): number | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure {
  const currentVector = parameterVector(current);
  const updatedVector = parameterVector(updated);
  if (currentVector.length !== updatedVector.length) {
    return failure('parameter_topology_inconsistency', 'Candidate AJ parameter-vector length changed across an iteration', {
      actual: updatedVector.length,
      expected: currentVector.length
    });
  }
  let maximum = 0;
  for (let index = 0; index < currentVector.length; index += 1) {
    const left = currentVector[index]!;
    const right = updatedVector[index]!;
    if (!Number.isFinite(left) || !Number.isFinite(right)) {
      return failure('non_finite_iterative_result', 'Candidate AJ parameter vector contained a non-finite value');
    }
    maximum = Math.max(maximum, Math.abs(right - left));
  }
  return maximum;
}

function buildUpdatedModel(
  model: DefinitionModel,
  transitionRows: FiniteObservedMonitorCoupledEvidenceTransitionRow[],
  iteration: number
): DefinitionModel | FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationFailure {
  const byState = new Map(transitionRows.map((row) => [row.stateId, row] as const));
  const transitions: DefinitionModel['transitions'] = [];
  for (const transition of model.transitions) {
    const source = model.states.find((state) => state.id === transition.from);
    if (source === undefined) {
      return failure('parameter_topology_inconsistency', 'Candidate AJ transition references an unknown source state', {
        iteration,
        stateId: transition.from,
        toStateId: transition.to
      });
    }
    if (isTerminalState(source)) {
      transitions.push({ ...transition });
      continue;
    }
    const row = byState.get(transition.from);
    const currentAggregate = row?.currentRow.find((entry) => entry.toStateId === transition.to)?.probability;
    const updatedAggregate = row?.updatedRow.find((entry) => entry.toStateId === transition.to)?.probability;
    if (row === undefined || currentAggregate === undefined || updatedAggregate === undefined) {
      return failure('parameter_topology_inconsistency', 'Candidate AI omitted an aggregate transition probability required for the next AJ iteration', {
        iteration,
        stateId: transition.from,
        toStateId: transition.to
      });
    }
    const currentEdge = evaluateProbabilitySpec(transition.probability);
    let updatedEdge = 0;
    if (currentAggregate > 0) {
      updatedEdge = updatedAggregate * (currentEdge / currentAggregate);
    } else if (updatedAggregate !== 0) {
      return failure('parameter_topology_inconsistency', 'Candidate AJ cannot create positive mass through a zero-current aggregate transition support', {
        iteration,
        stateId: transition.from,
        toStateId: transition.to,
        actual: updatedAggregate,
        expected: 0
      });
    }
    if (!Number.isFinite(updatedEdge) || updatedEdge < 0) {
      return failure('non_finite_iterative_result', 'Candidate AJ updated concrete transition probability became invalid', {
        iteration,
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

function updatedKernelFromRows(
  rows: FiniteObservedMonitorCoupledEvidenceObservationRow[]
): HiddenObservationKernelEntry[] {
  return rows.flatMap((row) =>
    row.updatedRow.map((entry) => ({ stateId: row.stateId, symbol: entry.symbol, probability: entry.probability }))
  );
}

function candidateAiRequest(
  request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest,
  initialDistribution: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest['initialDistribution'],
  kernel: HiddenObservationKernelEntry[],
  likelihoodNonDecreaseTolerance: number
): FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationRequest {
  const aiLikelihoodTolerance = Math.max(
    request.likelihoodTolerance ?? DEFAULT_CANDIDATE_AI_LIKELIHOOD_TOLERANCE,
    likelihoodNonDecreaseTolerance,
    Number.EPSILON
  );
  return {
    initialDistribution: initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...request.alphabet],
    kernel: kernel.map((entry) => ({ ...entry })),
    evidenceRecords: request.evidenceRecords,
    ...(request.probabilityTolerance === undefined ? {} : { probabilityTolerance: request.probabilityTolerance }),
    ...(request.countTolerance === undefined ? {} : { countTolerance: request.countTolerance }),
    likelihoodTolerance: aiLikelihoodTolerance,
    ...(request.maxEvidenceRecords === undefined ? {} : { maxEvidenceRecords: request.maxEvidenceRecords }),
    ...(request.maxObservations === undefined ? {} : { maxObservations: request.maxObservations }),
    ...(request.maxMonitorStates === undefined ? {} : { maxMonitorStates: request.maxMonitorStates }),
    ...(request.maxAugmentedStates === undefined ? {} : { maxAugmentedStates: request.maxAugmentedStates }),
    ...(request.maxMonitorCoupledEvidenceEntries === undefined
      ? {}
      : { maxMonitorCoupledEvidenceEntries: request.maxMonitorCoupledEvidenceEntries })
  };
}

function diagnostics(
  controls: ResolvedIterativeControls,
  acceptedIterations: number
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationDiagnostics {
  return {
    method: 'bounded_convergence_controlled_iterative_joint_pi_a_b_em_from_fresh_common_current_candidate_ai_e_steps',
    numericRepresentation: 'javascript_number_float64_with_candidate_ai_log_likelihood',
    simulationUsed: false,
    approximationUsed: false,
    candidateAIKernelUsed: true,
    freshAllRecordEStepsEachIteration: true,
    staleSufficientStatisticReuseUsed: false,
    sequentialParameterBlockUpdatesUsed: false,
    sequentialRecordUpdatesUsed: false,
    externalEvidenceMutationUsed: false,
    monitorMutationUsed: false,
    topologyLearningUsed: false,
    observationAlphabetLearningUsed: false,
    hardEmUsed: false,
    bayesianInferenceUsed: false,
    samplingUsed: false,
    globalOptimumClaimed: false,
    maxIterations: controls.maxIterations,
    maxIterationResourceGuard: controls.maxIterationResourceGuard,
    parameterConvergenceTolerance: controls.parameterConvergenceTolerance,
    logLikelihoodConvergenceTolerance: controls.logLikelihoodConvergenceTolerance,
    likelihoodNonDecreaseTolerance: controls.likelihoodNonDecreaseTolerance,
    acceptedIterations
  };
}

function sourceFailureCode(
  source: FiniteObservedMonitorCoupledEvidenceMultiTrajectoryJointParameterReestimationFailure
): string {
  return source.failure.code;
}

export function reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
  model: DefinitionModel,
  request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResult {
  const controls = resolveControls(request);
  if ('failure' in controls) return controls;

  let currentModel: DefinitionModel = {
    ...model,
    states: model.states.map((state) => ({
      ...state,
      ...(state.properties === undefined ? {} : { properties: { ...state.properties } })
    })),
    transitions: model.transitions.map((transition) => ({ ...transition }))
  };
  let currentInitialDistribution = request.initialDistribution.map((entry) => ({ ...entry }));
  let currentKernel = request.kernel.map((entry) => ({ ...entry }));
  const initialTheta = snapshot(currentModel, currentInitialDistribution, currentKernel);
  let currentTheta = initialTheta;
  const iterationTrace: FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace[] = [];
  const seenFingerprints = new Map<string, number>([[parameterFingerprint(initialTheta), 0]]);

  for (let iterationIndex = 0; iterationIndex < controls.maxIterations; iterationIndex += 1) {
    const iteration = iterationIndex + 1;
    const ai = reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(
      currentModel,
      candidateAiRequest(request, currentInitialDistribution, currentKernel, controls.likelihoodNonDecreaseTolerance)
    );
    if (!ai.ok) {
      return failure('candidate_ai_iteration_failure', 'Candidate AI one-step kernel failed during Candidate AJ iteration', {
        iteration,
        sourceFailureCode: sourceFailureCode(ai)
      });
    }

    if (!ai.possible) {
      if (iteration === 1) {
        return {
          ok: true,
          possible: false,
          converged: false,
          stopReason: 'INITIAL_DATASET_IMPOSSIBLE',
          acceptedIterations: 0,
          initialTheta,
          finalTheta: initialTheta,
          initialImpossibleRecordIndex: ai.impossibleRecordIndex,
          initialImpossibleRecordId: ai.impossibleRecordId,
          finalTotalLogLikelihood: null,
          iterationTrace: [],
          exactParameterCycle: {
            detected: false,
            repeatedFingerprintFirstAcceptedIteration: null,
            repeatedAtAcceptedIteration: null
          },
          diagnostics: diagnostics(controls, 0)
        };
      }
      return failure('later_dataset_became_impossible', 'An internally generated Candidate AJ parameter update made the fixed dataset impossible', {
        iteration
      });
    }

    if (
      ai.updatedInitialDistribution === null ||
      ai.transitionRows === null ||
      ai.observationKernelRows === null ||
      ai.aggregatedPosteriorInitialCounts === null ||
      ai.currentTotalLogLikelihood === null ||
      ai.updatedTotalLogLikelihood === null ||
      ai.likelihoodDelta === null
    ) {
      return failure('candidate_ai_iteration_inconsistency', 'Possible Candidate AI iteration omitted required AJ update/statistic fields', {
        iteration
      });
    }

    if (
      !Number.isFinite(ai.currentTotalLogLikelihood) ||
      !Number.isFinite(ai.updatedTotalLogLikelihood) ||
      !Number.isFinite(ai.likelihoodDelta)
    ) {
      return failure('non_finite_iterative_result', 'Candidate AJ received a non-finite Candidate AI likelihood trace value', {
        iteration,
        actual: ai.likelihoodDelta
      });
    }
    if (ai.likelihoodDelta < -controls.likelihoodNonDecreaseTolerance) {
      return failure('iterative_likelihood_monotonicity_violation', 'Candidate AJ accepted-step likelihood would decrease beyond likelihoodNonDecreaseTolerance', {
        iteration,
        actual: ai.likelihoodDelta,
        expected: 0,
        tolerance: controls.likelihoodNonDecreaseTolerance
      });
    }

    const nextModel = buildUpdatedModel(currentModel, ai.transitionRows, iteration);
    if ('failure' in nextModel) return nextModel;
    const nextInitialDistribution = ai.updatedInitialDistribution.map((entry) => ({ ...entry }));
    const nextKernel = updatedKernelFromRows(ai.observationKernelRows);
    const nextTheta = snapshot(nextModel, nextInitialDistribution, nextKernel);
    const delta = maxParameterDelta(currentTheta, nextTheta);
    if (typeof delta !== 'number') return delta;

    const traceEntry: FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace = {
      iteration,
      currentTotalLogLikelihood: ai.currentTotalLogLikelihood,
      updatedTotalLogLikelihood: ai.updatedTotalLogLikelihood,
      logLikelihoodDelta: ai.likelihoodDelta,
      maxParameterDelta: delta,
      monotonicitySatisfied: true,
      allRecordEStepsUseSameCurrentModel: true,
      allRecordEStepsFrozenBeforeMstep: true,
      freshAllRecordEStepPerformed: true,
      externalEvidenceAndMonitorDefinitionsFixed: true,
      recordESteps: ai.recordESteps.map((record) => ({
        ...record,
        observations: [...record.observations],
        targetMonitorStates: [...record.targetMonitorStates],
        posteriorInitialStateProbabilities: record.posteriorInitialStateProbabilities?.map((entry) => ({ ...entry })) ?? null,
        expectedTransitionCounts: record.expectedTransitionCounts?.map((entry) => ({ ...entry })) ?? null,
        expectedEmissionCounts: record.expectedEmissionCounts?.map((entry) => ({ ...entry })) ?? null
      })),
      aggregatedPosteriorInitialCounts: ai.aggregatedPosteriorInitialCounts.map((entry) => ({ ...entry })),
      transitionRows: ai.transitionRows.map((row) => ({
        ...row,
        expectedCounts: row.expectedCounts.map((entry) => ({ ...entry })),
        currentRow: row.currentRow.map((entry) => ({ ...entry })),
        updatedRow: row.updatedRow.map((entry) => ({ ...entry }))
      })),
      observationKernelRows: ai.observationKernelRows.map((row) => ({
        ...row,
        expectedCounts: row.expectedCounts.map((entry) => ({ ...entry })),
        currentRow: row.currentRow.map((entry) => ({ ...entry })),
        updatedRow: row.updatedRow.map((entry) => ({ ...entry }))
      })),
      retainedZeroDepartureStateIds: ai.transitionRows
        .filter((row) => row.status === 'retained_zero_expected_departure')
        .map((row) => row.stateId)
        .sort(compareStrings),
      retainedZeroOccupancyStateIds: ai.observationKernelRows
        .filter((row) => row.status === 'retained_zero_expected_occupancy')
        .map((row) => row.stateId)
        .sort(compareStrings)
    };
    iterationTrace.push(traceEntry);

    const acceptedIterations = iteration;
    const converged =
      delta <= controls.parameterConvergenceTolerance &&
      Math.abs(ai.likelihoodDelta) <= controls.logLikelihoodConvergenceTolerance;
    if (converged) {
      return {
        ok: true,
        possible: true,
        converged: true,
        stopReason: 'CONVERGED',
        acceptedIterations,
        initialTheta,
        finalTheta: nextTheta,
        initialImpossibleRecordIndex: null,
        initialImpossibleRecordId: null,
        finalTotalLogLikelihood: ai.updatedTotalLogLikelihood,
        iterationTrace,
        exactParameterCycle: {
          detected: false,
          repeatedFingerprintFirstAcceptedIteration: null,
          repeatedAtAcceptedIteration: null
        },
        diagnostics: diagnostics(controls, acceptedIterations)
      };
    }

    const fingerprint = parameterFingerprint(nextTheta);
    const firstSeenAt = seenFingerprints.get(fingerprint);
    if (firstSeenAt !== undefined) {
      return {
        ok: true,
        possible: true,
        converged: false,
        stopReason: 'EXACT_PARAMETER_CYCLE_DETECTED',
        acceptedIterations,
        initialTheta,
        finalTheta: nextTheta,
        initialImpossibleRecordIndex: null,
        initialImpossibleRecordId: null,
        finalTotalLogLikelihood: ai.updatedTotalLogLikelihood,
        iterationTrace,
        exactParameterCycle: {
          detected: true,
          repeatedFingerprintFirstAcceptedIteration: firstSeenAt,
          repeatedAtAcceptedIteration: acceptedIterations
        },
        diagnostics: diagnostics(controls, acceptedIterations)
      };
    }
    seenFingerprints.set(fingerprint, acceptedIterations);

    currentModel = nextModel;
    currentInitialDistribution = nextInitialDistribution;
    currentKernel = nextKernel;
    currentTheta = nextTheta;
  }

  const finalTrace = iterationTrace[iterationTrace.length - 1];
  if (finalTrace === undefined) {
    return failure('candidate_ai_iteration_inconsistency', 'Candidate AJ exhausted maxIterations without an accepted iteration');
  }
  return {
    ok: true,
    possible: true,
    converged: false,
    stopReason: 'MAX_ITERATIONS_REACHED',
    acceptedIterations: controls.maxIterations,
    initialTheta,
    finalTheta: currentTheta === initialTheta
      ? snapshot(currentModel, currentInitialDistribution, currentKernel)
      : snapshot(currentModel, currentInitialDistribution, currentKernel),
    initialImpossibleRecordIndex: null,
    initialImpossibleRecordId: null,
    finalTotalLogLikelihood: finalTrace.updatedTotalLogLikelihood,
    iterationTrace,
    exactParameterCycle: {
      detected: false,
      repeatedFingerprintFirstAcceptedIteration: null,
      repeatedAtAcceptedIteration: null
    },
    diagnostics: diagnostics(controls, controls.maxIterations)
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

export function finiteHiddenStateObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResultToJson(
  result: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResult
): string {
  assertFiniteDeep(result, 'result');
  return JSON.stringify(result);
}
