import { describe, expect, it } from 'vitest';
import {
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  modelWithAggregateRows,
  resultInitialProbability,
  resultKernelProbability,
  resultTransitionProbability,
  standardRequest,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AI result');
  return result;
}

describe('Candidate AI batch and external-scale discriminators', () => {
  it('differs from an illegal sequential-record update that recomputes the second record E-step under the first record updated model', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const correctBatch = requireSuccess(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request)
    );

    const first = requireSuccess(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, {
        ...request,
        evidenceRecords: [request.evidenceRecords[0]!]
      })
    );
    const firstRows = new Map(first.transitionRows!.map((row) => [
      row.stateId,
      new Map(row.updatedRow.map((entry) => [entry.toStateId, entry.probability] as const))
    ] as const));
    const intermediateModel = modelWithAggregateRows(model, firstRows);
    const intermediateKernel = first.observationKernelRows!.flatMap((row) =>
      row.updatedRow.map((entry) => ({ stateId: row.stateId, symbol: entry.symbol, probability: entry.probability }))
    );

    const illegalSequential = requireSuccess(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(intermediateModel, {
        ...request,
        initialDistribution: first.updatedInitialDistribution!,
        kernel: intermediateKernel,
        evidenceRecords: [request.evidenceRecords[1]!]
      })
    );

    let totalDifference = 0;
    for (const stateId of ['a', 'b']) {
      totalDifference += Math.abs(resultInitialProbability(correctBatch, stateId) - resultInitialProbability(illegalSequential, stateId));
      for (const toStateId of ['a', 'b']) {
        totalDifference += Math.abs(resultTransitionProbability(correctBatch, stateId, toStateId) - resultTransitionProbability(illegalSequential, stateId, toStateId));
      }
      for (const symbol of ['x', 'y']) {
        totalDifference += Math.abs(resultKernelProbability(correctBatch, stateId, symbol) - resultKernelProbability(illegalSequential, stateId, symbol));
      }
    }
    expect(totalDifference).toBeGreaterThan(1e-4);
    expect(correctBatch.diagnostics.sequentialRecordUpdatesUsed).toBe(false);
    expect(correctBatch.diagnostics.allRecordEStepsUseSameCurrentModel).toBe(true);
  });

  it('preserves normalized sufficient statistics and the one-step update under a legal common positive rescaling of one external initial-evidence layer', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const scaledRecords = request.evidenceRecords.map((record, index) =>
      index === 0
        ? {
            ...record,
            initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({
              ...entry,
              likelihood: entry.likelihood * 0.5
            }))
          }
        : record
    );
    const base = requireSuccess(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request)
    );
    const scaled = requireSuccess(
      reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, {
        ...request,
        evidenceRecords: scaledRecords
      })
    );

    for (const stateId of ['a', 'b']) {
      expect(resultInitialProbability(scaled, stateId)).toBeCloseTo(resultInitialProbability(base, stateId), 11);
      for (const toStateId of ['a', 'b']) {
        expect(resultTransitionProbability(scaled, stateId, toStateId)).toBeCloseTo(resultTransitionProbability(base, stateId, toStateId), 11);
      }
      for (const symbol of ['x', 'y']) {
        expect(resultKernelProbability(scaled, stateId, symbol)).toBeCloseTo(resultKernelProbability(base, stateId, symbol), 11);
      }
    }
    expect(scaled.currentTotalLogLikelihood! - base.currentTotalLogLikelihood!).toBeCloseTo(Math.log(0.5), 11);
    expect(scaled.updatedTotalLogLikelihood! - base.updatedTotalLogLikelihood!).toBeCloseTo(Math.log(0.5), 11);
    expect(scaled.likelihoodDelta).toBeCloseTo(base.likelihoodDelta!, 11);
  });
});
