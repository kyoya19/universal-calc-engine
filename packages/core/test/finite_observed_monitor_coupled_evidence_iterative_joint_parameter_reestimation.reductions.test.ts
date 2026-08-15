import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import { HiddenObservationKernelEntry } from '../src/hidden_state_observation';
import { reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep } from '../src/hidden_state_multi_trajectory_joint_parameter_reestimation';
import { reestimateFiniteHiddenStateParametersJointOneStep } from '../src/hidden_state_joint_parameter_reestimation';
import {
  FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import { iterativeRequest } from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  modelWithAggregateRows,
  oneStateMonitorRecord,
  standardKernel,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

type JointRows = {
  updatedInitialDistribution: Array<{ stateId: string; probability: number }> | null;
  transitionRows: Array<{ stateId: string; updatedRow: Array<{ toStateId: string; probability: number }> }> | null;
  observationKernelRows: Array<{ stateId: string; updatedRow: Array<{ symbol: string; probability: number }> }> | null;
};

function nextModel(model: DefinitionModel, rows: JointRows['transitionRows']): DefinitionModel {
  if (rows === null) throw new Error('Missing transition rows');
  return modelWithAggregateRows(model, new Map(rows.map((row) => [
    row.stateId,
    new Map(row.updatedRow.map((entry) => [entry.toStateId, entry.probability] as const))
  ] as const)));
}

function nextKernel(rows: JointRows['observationKernelRows']): HiddenObservationKernelEntry[] {
  if (rows === null) throw new Error('Missing observation rows');
  return rows.flatMap((row) => row.updatedRow.map((entry) => ({
    stateId: row.stateId,
    symbol: entry.symbol,
    probability: entry.probability
  })));
}

function compareAjTraceWithQualifiedJointStep(
  trace: FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace,
  joint: JointRows,
  recordCount: number
): void {
  if (joint.updatedInitialDistribution === null || joint.transitionRows === null || joint.observationKernelRows === null) {
    throw new Error('Qualified reduction step omitted updates');
  }
  const initialTotal = trace.aggregatedPosteriorInitialCounts.reduce((sum, entry) => sum + entry.expectedCount, 0);
  expect(initialTotal).toBeCloseTo(recordCount, 10);
  for (const expected of joint.updatedInitialDistribution) {
    const count = trace.aggregatedPosteriorInitialCounts.find((entry) => entry.stateId === expected.stateId)!.expectedCount;
    expect(count / recordCount).toBeCloseTo(expected.probability, 10);
  }
  for (const expectedRow of joint.transitionRows) {
    const actualRow = trace.transitionRows.find((row) => row.stateId === expectedRow.stateId)!;
    for (const expected of expectedRow.updatedRow) {
      expect(actualRow.updatedRow.find((entry) => entry.toStateId === expected.toStateId)!.probability)
        .toBeCloseTo(expected.probability, 10);
    }
  }
  for (const expectedRow of joint.observationKernelRows) {
    const actualRow = trace.observationKernelRows.find((row) => row.stateId === expectedRow.stateId)!;
    for (const expected of expectedRow.updatedRow) {
      expect(actualRow.updatedRow.find((entry) => entry.symbol === expected.symbol)!.probability)
        .toBeCloseTo(expected.probability, 10);
    }
  }
}

function expectFinalMatches(
  result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>,
  model: DefinitionModel,
  initial: Array<{ stateId: string; probability: number }>,
  kernel: HiddenObservationKernelEntry[]
): void {
  if (!result.ok || !result.possible) throw new Error('Expected possible AJ result');
  for (const expected of initial) {
    expect(result.finalTheta.initialDistribution.find((entry) => entry.stateId === expected.stateId)!.probability)
      .toBeCloseTo(expected.probability, 10);
  }
  for (const row of result.finalTheta.transitionRows.filter((entry) => !entry.terminal)) {
    for (const edge of row.row) {
      const expected = model.transitions
        .filter((entry) => entry.from === row.stateId && entry.to === edge.toStateId)
        .reduce((sum, entry) => sum + (typeof entry.probability === 'number' ? entry.probability : entry.probability.value), 0);
      expect(edge.probability).toBeCloseTo(expected, 10);
    }
  }
  for (const expected of kernel) {
    expect(result.finalTheta.observationKernel.find((entry) => entry.stateId === expected.stateId && entry.symbol === expected.symbol)!.probability)
      .toBeCloseTo(expected.probability, 10);
  }
}

describe('Candidate AJ reductions to qualified W and V iterative compositions', () => {
  it('one-state monitor plus all-one external evidence reduces iteration-by-iteration to repeated Candidate W common-dataset steps', () => {
    const trajectories = [['x', 'y', 'x'], ['y', 'x', 'y']];
    const originalModel = twoStateModel();
    const initial = [
      { stateId: 'a', probability: 0.61 },
      { stateId: 'b', probability: 0.39 }
    ];
    const kernel = standardKernel();
    const records = trajectories.map((observations, index) => oneStateMonitorRecord(originalModel, observations, { recordId: `w-${index}` }));
    const aj = reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(originalModel, iterativeRequest({
      initialDistribution: initial,
      alphabet: ['x', 'y'],
      kernel,
      evidenceRecords: records,
      maxIterations: 2,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0,
      likelihoodNonDecreaseTolerance: 1e-9
    }));
    expect(aj.ok).toBe(true);
    if (!aj.ok || !aj.possible) throw new Error('Expected possible AJ W-reduction result');

    let model = originalModel;
    let currentInitial = initial;
    let currentKernel = kernel;
    for (let iteration = 0; iteration < aj.iterationTrace.length; iteration += 1) {
      const w = reestimateFiniteHiddenStateParametersJointMultipleTrajectoriesOneStep(model, {
        initialDistribution: currentInitial,
        alphabet: ['x', 'y'],
        kernel: currentKernel,
        trajectories
      });
      expect(w.ok).toBe(true);
      if (!w.ok || !w.possible || w.updatedInitialDistribution === null || w.transitionRows === null || w.observationKernelRows === null) {
        throw new Error('Expected possible Candidate W reduction step');
      }
      compareAjTraceWithQualifiedJointStep(aj.iterationTrace[iteration]!, w, trajectories.length);
      expect(aj.iterationTrace[iteration]!.currentTotalLogLikelihood).toBeCloseTo(w.originalTotalLogLikelihood!, 9);
      expect(aj.iterationTrace[iteration]!.updatedTotalLogLikelihood).toBeCloseTo(w.updatedTotalLogLikelihood!, 9);
      model = nextModel(model, w.transitionRows);
      currentInitial = w.updatedInitialDistribution;
      currentKernel = nextKernel(w.observationKernelRows);
    }
    expectFinalMatches(aj, model, currentInitial, currentKernel);
  });

  it('K=1 plus all-one external evidence reduces iteration-by-iteration to repeated Candidate V soft-EM steps', () => {
    const observations = ['x', 'y', 'x', 'y'];
    const originalModel = twoStateModel();
    const initial = [
      { stateId: 'a', probability: 0.57 },
      { stateId: 'b', probability: 0.43 }
    ];
    const kernel = standardKernel();
    const record = oneStateMonitorRecord(originalModel, observations, { recordId: 'v-only' });
    const aj = reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(originalModel, iterativeRequest({
      initialDistribution: initial,
      alphabet: ['x', 'y'],
      kernel,
      evidenceRecords: [record],
      maxIterations: 2,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0,
      likelihoodNonDecreaseTolerance: 1e-9
    }));
    expect(aj.ok).toBe(true);
    if (!aj.ok || !aj.possible) throw new Error('Expected possible AJ V-reduction result');

    let model = originalModel;
    let currentInitial = initial;
    let currentKernel = kernel;
    for (let iteration = 0; iteration < aj.iterationTrace.length; iteration += 1) {
      const v = reestimateFiniteHiddenStateParametersJointOneStep(model, {
        initialDistribution: currentInitial,
        alphabet: ['x', 'y'],
        kernel: currentKernel,
        observations
      });
      expect(v.ok).toBe(true);
      if (!v.ok || !v.possible || v.updatedInitialDistribution === null || v.transitionRows === null || v.observationKernelRows === null) {
        throw new Error('Expected possible Candidate V reduction step');
      }
      compareAjTraceWithQualifiedJointStep(aj.iterationTrace[iteration]!, v, 1);
      model = nextModel(model, v.transitionRows);
      currentInitial = v.updatedInitialDistribution;
      currentKernel = nextKernel(v.observationKernelRows);
    }
    expectFinalMatches(aj, model, currentInitial, currentKernel);
  });
});
