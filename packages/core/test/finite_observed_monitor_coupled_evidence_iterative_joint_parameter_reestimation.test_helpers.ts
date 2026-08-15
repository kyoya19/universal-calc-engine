import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest,
  FiniteObservedMonitorCoupledEvidenceIterativeStopReason
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import {
  completeBatchOracle,
  initialDistribution,
  kernelEntriesFromRows,
  oneStateMonitorRecord,
  standardKernel,
  standardRequest,
  stateIds,
  twoStateModel,
  aggregateTransitionProbability
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

export type IndependentIterativeOracleTrace = {
  iteration: number;
  currentTotalLogLikelihood: number;
  updatedTotalLogLikelihood: number;
  logLikelihoodDelta: number;
  maxParameterDelta: number;
  parameterVector: number[];
};

export type IndependentIterativeOracle = {
  possible: boolean;
  converged: boolean;
  stopReason: FiniteObservedMonitorCoupledEvidenceIterativeStopReason;
  acceptedIterations: number;
  finalModel: DefinitionModel;
  finalInitialDistribution: Array<{ stateId: StateId; probability: number }>;
  finalKernel: Array<{ stateId: StateId; symbol: string; probability: number }>;
  finalTotalLogLikelihood: number | null;
  trace: IndependentIterativeOracleTrace[];
};

export function iterativeRequest(
  overrides: Partial<FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest> = {}
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest {
  return {
    ...standardRequest(),
    maxIterations: 8,
    parameterConvergenceTolerance: 1e-10,
    logLikelihoodConvergenceTolerance: 1e-10,
    likelihoodNonDecreaseTolerance: 1e-9,
    ...overrides
  };
}

export function authorityWitnessModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.7 },
      { from: 'a', to: 'b', probability: 0.3 },
      { from: 'b', to: 'a', probability: 0.2 },
      { from: 'b', to: 'b', probability: 0.8 }
    ]
  };
}

export function authorityWitnessRequest(
  overrides: Partial<FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest> = {}
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest {
  const model = authorityWitnessModel();
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    alphabet: ['0', '1'],
    kernel: [
      { stateId: 'a', symbol: '0', probability: 0.8 },
      { stateId: 'a', symbol: '1', probability: 0.2 },
      { stateId: 'b', symbol: '0', probability: 0.3 },
      { stateId: 'b', symbol: '1', probability: 0.7 }
    ],
    evidenceRecords: [oneStateMonitorRecord(model, ['0', '1', '1', '0'], { recordId: 'authority-witness' })],
    maxIterations: 2,
    parameterConvergenceTolerance: 0.05,
    logLikelihoodConvergenceTolerance: 1e-12,
    likelihoodNonDecreaseTolerance: 1e-10,
    ...overrides
  };
}

function canonicalKernel(
  kernel: Array<{ stateId: StateId; symbol: string; probability: number }>
): Array<{ stateId: StateId; symbol: string; probability: number }> {
  return kernel
    .map((entry) => ({ ...entry }))
    .sort((left, right) => left.stateId.localeCompare(right.stateId) || left.symbol.localeCompare(right.symbol));
}

export function independentParameterVector(
  model: DefinitionModel,
  initial: Array<{ stateId: StateId; probability: number }>,
  kernel: Array<{ stateId: StateId; symbol: string; probability: number }>
): number[] {
  const states = stateIds(model);
  const initialMap = new Map(initial.map((entry) => [entry.stateId, entry.probability] as const));
  const values: number[] = states.map((stateId) => initialMap.get(stateId) ?? 0);
  for (const stateId of states) {
    const state = model.states.find((entry) => entry.id === stateId)!;
    if (state.terminal === true) continue;
    const destinations = [...new Set(model.transitions.filter((entry) => entry.from === stateId).map((entry) => entry.to))].sort();
    for (const toStateId of destinations) values.push(aggregateTransitionProbability(model, stateId, toStateId));
  }
  for (const entry of canonicalKernel(kernel)) values.push(entry.probability);
  return values;
}

function maximumDelta(left: number[], right: number[]): number {
  if (left.length !== right.length) throw new Error('independent oracle parameter topology changed');
  let maximum = 0;
  for (let index = 0; index < left.length; index += 1) {
    maximum = Math.max(maximum, Math.abs(right[index]! - left[index]!));
  }
  return maximum;
}

export function completeIterativeOracle(
  model: DefinitionModel,
  request: FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest
): IndependentIterativeOracle {
  let currentModel: DefinitionModel = {
    ...model,
    states: model.states.map((state) => ({ ...state })),
    transitions: model.transitions.map((transition) => ({ ...transition }))
  };
  let currentInitial = request.initialDistribution.map((entry) => ({ ...entry }));
  let currentKernel = request.kernel.map((entry) => ({ ...entry }));
  let currentVector = independentParameterVector(currentModel, currentInitial, currentKernel);
  const seen = new Map<string, number>([[JSON.stringify(currentVector), 0]]);
  const trace: IndependentIterativeOracleTrace[] = [];

  for (let index = 0; index < request.maxIterations; index += 1) {
    const batch = completeBatchOracle(currentModel, {
      initialDistribution: currentInitial,
      alphabet: [...request.alphabet],
      kernel: currentKernel,
      evidenceRecords: request.evidenceRecords,
      ...(request.probabilityTolerance === undefined ? {} : { probabilityTolerance: request.probabilityTolerance }),
      ...(request.countTolerance === undefined ? {} : { countTolerance: request.countTolerance }),
      ...(request.likelihoodTolerance === undefined ? {} : { likelihoodTolerance: request.likelihoodTolerance }),
      ...(request.maxEvidenceRecords === undefined ? {} : { maxEvidenceRecords: request.maxEvidenceRecords }),
      ...(request.maxObservations === undefined ? {} : { maxObservations: request.maxObservations }),
      ...(request.maxMonitorStates === undefined ? {} : { maxMonitorStates: request.maxMonitorStates }),
      ...(request.maxAugmentedStates === undefined ? {} : { maxAugmentedStates: request.maxAugmentedStates }),
      ...(request.maxMonitorCoupledEvidenceEntries === undefined
        ? {}
        : { maxMonitorCoupledEvidenceEntries: request.maxMonitorCoupledEvidenceEntries })
    });
    if (!batch.possible) {
      return {
        possible: false,
        converged: false,
        stopReason: 'INITIAL_DATASET_IMPOSSIBLE',
        acceptedIterations: 0,
        finalModel: currentModel,
        finalInitialDistribution: currentInitial,
        finalKernel: currentKernel,
        finalTotalLogLikelihood: null,
        trace: []
      };
    }
    if (
      batch.currentTotalLogLikelihood === null ||
      batch.updatedTotalLogLikelihood === null ||
      batch.updatedInitial === null ||
      batch.updatedRows === null ||
      batch.updatedKernel === null ||
      batch.updatedModel === null
    ) throw new Error('independent iterative oracle omitted an update');

    const states = stateIds(currentModel);
    const nextInitial = states.map((stateId) => ({ stateId, probability: batch.updatedInitial!.get(stateId) ?? 0 }));
    const nextKernel = kernelEntriesFromRows(states, [...request.alphabet].sort(), batch.updatedKernel);
    const nextModel = batch.updatedModel;
    const nextVector = independentParameterVector(nextModel, nextInitial, nextKernel);
    const delta = maximumDelta(currentVector, nextVector);
    const likelihoodDelta = batch.updatedTotalLogLikelihood - batch.currentTotalLogLikelihood;
    const iteration = index + 1;
    trace.push({
      iteration,
      currentTotalLogLikelihood: batch.currentTotalLogLikelihood,
      updatedTotalLogLikelihood: batch.updatedTotalLogLikelihood,
      logLikelihoodDelta: likelihoodDelta,
      maxParameterDelta: delta,
      parameterVector: [...nextVector]
    });

    const converged =
      delta <= request.parameterConvergenceTolerance &&
      Math.abs(likelihoodDelta) <= request.logLikelihoodConvergenceTolerance;
    if (converged) {
      return {
        possible: true,
        converged: true,
        stopReason: 'CONVERGED',
        acceptedIterations: iteration,
        finalModel: nextModel,
        finalInitialDistribution: nextInitial,
        finalKernel: nextKernel,
        finalTotalLogLikelihood: batch.updatedTotalLogLikelihood,
        trace
      };
    }

    const fingerprint = JSON.stringify(nextVector);
    if (seen.has(fingerprint)) {
      return {
        possible: true,
        converged: false,
        stopReason: 'EXACT_PARAMETER_CYCLE_DETECTED',
        acceptedIterations: iteration,
        finalModel: nextModel,
        finalInitialDistribution: nextInitial,
        finalKernel: nextKernel,
        finalTotalLogLikelihood: batch.updatedTotalLogLikelihood,
        trace
      };
    }
    seen.set(fingerprint, iteration);
    currentModel = nextModel;
    currentInitial = nextInitial;
    currentKernel = nextKernel;
    currentVector = nextVector;
  }

  return {
    possible: true,
    converged: false,
    stopReason: 'MAX_ITERATIONS_REACHED',
    acceptedIterations: request.maxIterations,
    finalModel: currentModel,
    finalInitialDistribution: currentInitial,
    finalKernel: currentKernel,
    finalTotalLogLikelihood: trace[trace.length - 1]?.updatedTotalLogLikelihood ?? null,
    trace
  };
}

export function neutralStandardIterativeRequest(
  maxIterations = 3
): FiniteObservedMonitorCoupledEvidenceIterativeJointParameterReestimationRequest {
  const model = twoStateModel();
  return iterativeRequest({
    initialDistribution: initialDistribution(),
    kernel: standardKernel(),
    evidenceRecords: [
      oneStateMonitorRecord(model, ['x', 'y', 'x'], { recordId: 'n1' }),
      oneStateMonitorRecord(model, ['y', 'x'], { recordId: 'n2' })
    ],
    maxIterations,
    parameterConvergenceTolerance: 0,
    logLikelihoodConvergenceTolerance: 0
  });
}
