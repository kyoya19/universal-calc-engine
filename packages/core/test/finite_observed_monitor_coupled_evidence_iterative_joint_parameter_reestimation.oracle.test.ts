import { describe, expect, it } from 'vitest';
import {
  FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import {
  authorityWitnessModel,
  authorityWitnessRequest,
  completeIterativeOracle,
  independentParameterVector,
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  standardRequest,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function snapshotVector(snapshot: FiniteObservedMonitorCoupledEvidenceIterativeParameterSnapshot): number[] {
  return [
    ...snapshot.initialDistribution.map((entry) => entry.probability),
    ...snapshot.transitionRows.flatMap((row) => row.terminal ? [] : row.row.map((entry) => entry.probability)),
    ...snapshot.observationKernel.map((entry) => entry.probability)
  ];
}

function expectVectorsClose(left: number[], right: number[], digits = 10): void {
  expect(left).toHaveLength(right.length);
  for (let index = 0; index < left.length; index += 1) expect(left[index]).toBeCloseTo(right[index]!, digits);
}

function scaledEvidenceRequest(scale: number) {
  const base = iterativeRequest({ maxIterations: 3, parameterConvergenceTolerance: 0, logLikelihoodConvergenceTolerance: 0 });
  return {
    ...base,
    evidenceRecords: base.evidenceRecords.map((record) => ({
      ...record,
      initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ ...entry, likelihood: entry.likelihood * scale })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) =>
        layer.map((entry) => ({ ...entry, likelihood: entry.likelihood * scale }))
      )
    }))
  };
}

describe('Candidate AJ independent iterative oracles and reductions', () => {
  it('matches a complete hidden/concrete-transition path enumeration oracle at every authority-witness iteration', () => {
    const model = authorityWitnessModel();
    const request = authorityWitnessRequest();
    const oracle = completeIterativeOracle(model, request);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(result.possible).toBe(oracle.possible);
    expect(result.converged).toBe(oracle.converged);
    expect(result.stopReason).toBe(oracle.stopReason);
    expect(result.acceptedIterations).toBe(oracle.acceptedIterations);
    expect(result.iterationTrace).toHaveLength(oracle.trace.length);
    for (let index = 0; index < oracle.trace.length; index += 1) {
      const actual = result.iterationTrace[index]!;
      const expected = oracle.trace[index]!;
      expect(actual.currentTotalLogLikelihood).toBeCloseTo(expected.currentTotalLogLikelihood, 10);
      expect(actual.updatedTotalLogLikelihood).toBeCloseTo(expected.updatedTotalLogLikelihood, 10);
      expect(actual.logLikelihoodDelta).toBeCloseTo(expected.logLikelihoodDelta, 10);
      expect(actual.maxParameterDelta).toBeCloseTo(expected.maxParameterDelta, 10);
    }
    expectVectorsClose(
      snapshotVector(result.finalTheta),
      independentParameterVector(oracle.finalModel, oracle.finalInitialDistribution, oracle.finalKernel),
      10
    );
  });

  it('matches the independent complete-path iterative oracle on a multi-record monitor-coupled calibrated-evidence fixture', () => {
    const model = twoStateModel();
    const request = iterativeRequest({ maxIterations: 3, parameterConvergenceTolerance: 0, logLikelihoodConvergenceTolerance: 0 });
    const oracle = completeIterativeOracle(model, request);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(result.stopReason).toBe(oracle.stopReason);
    expect(result.acceptedIterations).toBe(oracle.acceptedIterations);
    for (let index = 0; index < oracle.trace.length; index += 1) {
      expect(result.iterationTrace[index]!.currentTotalLogLikelihood).toBeCloseTo(oracle.trace[index]!.currentTotalLogLikelihood, 9);
      expect(result.iterationTrace[index]!.updatedTotalLogLikelihood).toBeCloseTo(oracle.trace[index]!.updatedTotalLogLikelihood, 9);
      expect(result.iterationTrace[index]!.maxParameterDelta).toBeCloseTo(oracle.trace[index]!.maxParameterDelta, 9);
    }
    expectVectorsClose(
      snapshotVector(result.finalTheta),
      independentParameterVector(oracle.finalModel, oracle.finalInitialDistribution, oracle.finalKernel),
      9
    );
  });

  it('preserves the entire parameter trace under state-independent absolute evidence scaling while likelihood deltas remain scale-canceling', () => {
    const model = twoStateModel();
    const unscaled = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        model,
        scaledEvidenceRequest(1)
      )
    );
    const scaled = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        model,
        scaledEvidenceRequest(0.5)
      )
    );
    expect(scaled.acceptedIterations).toBe(unscaled.acceptedIterations);
    expect(scaled.stopReason).toBe(unscaled.stopReason);
    expectVectorsClose(snapshotVector(scaled.finalTheta), snapshotVector(unscaled.finalTheta), 10);
    for (let index = 0; index < unscaled.iterationTrace.length; index += 1) {
      expect(scaled.iterationTrace[index]!.maxParameterDelta).toBeCloseTo(unscaled.iterationTrace[index]!.maxParameterDelta, 10);
      expect(scaled.iterationTrace[index]!.logLikelihoodDelta).toBeCloseTo(unscaled.iterationTrace[index]!.logLikelihoodDelta, 10);
    }
  });

  it('is invariant to independent-record permutation', () => {
    const model = twoStateModel();
    const base = standardRequest();
    const forward = iterativeRequest({
      ...base,
      maxIterations: 3,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0
    });
    const reverse = { ...forward, evidenceRecords: [...forward.evidenceRecords].reverse() };
    const a = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, forward));
    const b = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, reverse));
    expect(a.stopReason).toBe(b.stopReason);
    expect(a.acceptedIterations).toBe(b.acceptedIterations);
    expectVectorsClose(snapshotVector(a.finalTheta), snapshotVector(b.finalTheta), 10);
    for (let index = 0; index < a.iterationTrace.length; index += 1) {
      expect(a.iterationTrace[index]!.updatedTotalLogLikelihood).toBeCloseTo(b.iterationTrace[index]!.updatedTotalLogLikelihood, 10);
      expect(a.iterationTrace[index]!.maxParameterDelta).toBeCloseTo(b.iterationTrace[index]!.maxParameterDelta, 10);
    }
  });

  it('is invariant to equal whole-dataset replication apart from disclosed floating summation tolerance', () => {
    const model = twoStateModel();
    const base = standardRequest();
    const single = iterativeRequest({
      ...base,
      maxIterations: 3,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0
    });
    const replicated = {
      ...single,
      evidenceRecords: [
        ...single.evidenceRecords.map((record, index) => ({ ...record, recordId: `a-${index}` })),
        ...single.evidenceRecords.map((record, index) => ({ ...record, recordId: `b-${index}` }))
      ]
    };
    const a = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, single));
    const b = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, replicated));
    expect(a.stopReason).toBe(b.stopReason);
    expectVectorsClose(snapshotVector(a.finalTheta), snapshotVector(b.finalTheta), 9);
    for (let index = 0; index < a.iterationTrace.length; index += 1) {
      expect(a.iterationTrace[index]!.maxParameterDelta).toBeCloseTo(b.iterationTrace[index]!.maxParameterDelta, 9);
      expect(b.iterationTrace[index]!.logLikelihoodDelta).toBeCloseTo(a.iterationTrace[index]!.logLikelihoodDelta * 2, 9);
    }
  });
});
