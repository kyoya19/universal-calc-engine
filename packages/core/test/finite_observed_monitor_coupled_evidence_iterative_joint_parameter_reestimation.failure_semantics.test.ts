import { describe, expect, it } from 'vitest';
import {
  finiteHiddenStateObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResultToJson,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import { DefinitionModel } from '../src/model';
import {
  authorityWitnessModel,
  authorityWitnessRequest,
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  oneStateMonitorRecord
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireFailure(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error('expected Candidate AJ hard failure');
  return result;
}

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

describe('Candidate AJ iterative failure and bounded-status semantics', () => {
  it('rejects invalid convergence and monotonicity tolerances without entering Candidate AI', () => {
    for (const patch of [
      { parameterConvergenceTolerance: -1 },
      { parameterConvergenceTolerance: Number.NaN },
      { logLikelihoodConvergenceTolerance: -1 },
      { likelihoodNonDecreaseTolerance: Number.POSITIVE_INFINITY }
    ]) {
      const result = requireFailure(
        reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
          authorityWitnessModel(),
          authorityWitnessRequest(patch)
        )
      );
      expect(result.failure.code).toBe('invalid_iterative_tolerance');
    }
  });

  it('rejects invalid maxIterations and explicit iteration-resource overflow', () => {
    for (const maxIterations of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      const result = requireFailure(
        reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
          authorityWitnessModel(),
          authorityWitnessRequest({ maxIterations })
        )
      );
      expect(result.failure.code).toBe('invalid_max_iterations');
    }
    const guarded = requireFailure(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest({ maxIterations: 3, maxIterationResourceGuard: 2 })
      )
    );
    expect(guarded.failure.code).toBe('candidate_aj_resource_limit_exceeded');
  });

  it('returns initial mathematical impossibility as an honest non-failure status with no fabricated update', () => {
    const model = authorityWitnessModel();
    const request = authorityWitnessRequest();
    const impossible = {
      ...request,
      evidenceRecords: request.evidenceRecords.map((record) => ({
        ...record,
        initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ ...entry, likelihood: 0 }))
      }))
    };
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, impossible)
    );
    expect(result.possible).toBe(false);
    expect(result.converged).toBe(false);
    expect(result.stopReason).toBe('INITIAL_DATASET_IMPOSSIBLE');
    expect(result.acceptedIterations).toBe(0);
    expect(result.iterationTrace).toEqual([]);
    expect(result.finalTheta).toEqual(result.initialTheta);
    expect(result.finalTotalLogLikelihood).toBeNull();
  });

  it('keeps positive-probability direct underflow distinct from impossibility', () => {
    const model: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only' }],
      transitions: [{ from: 'only', to: 'only', probability: 1 }]
    };
    const observations = Array.from({ length: 401 }, () => 'x');
    const record = oneStateMonitorRecord(model, observations, { recordId: 'underflow' });
    const underflowRecord = {
      ...record,
      monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) =>
        layer.map((entry) => ({ ...entry, likelihood: 0.1 }))
      )
    };
    const request = iterativeRequest({
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['x'],
      kernel: [{ stateId: 'only', symbol: 'x', probability: 1 }],
      evidenceRecords: [underflowRecord],
      maxIterations: 1,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0,
      likelihoodNonDecreaseTolerance: 1e-9,
      maxObservations: 500
    });
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request)
    );
    expect(result.possible).toBe(true);
    expect(result.iterationTrace[0]!.recordESteps[0]!.possible).toBe(true);
    expect(result.iterationTrace[0]!.recordESteps[0]!.eventProbabilityUnderflowed).toBe(true);
    expect(Number.isFinite(result.iterationTrace[0]!.currentTotalLogLikelihood)).toBe(true);
  });

  it('surfaces Candidate AI request/model failures as hard iterative failures with source provenance', () => {
    const model = authorityWitnessModel();
    const request = authorityWitnessRequest({ evidenceRecords: [] });
    const result = requireFailure(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request)
    );
    expect(result.failure.code).toBe('candidate_ai_iteration_failure');
    expect(result.failure.sourceFailureCode).toBe('empty_evidence_record_collection');
    expect(result.failure.iteration).toBe(1);
  });

  it('serializes deterministically and rejects non-finite result mutation', () => {
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest({ maxIterations: 1 })
      )
    );
    const first = finiteHiddenStateObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResultToJson(result);
    const second = finiteHiddenStateObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResultToJson(result);
    expect(first).toBe(second);
    expect(JSON.parse(first).stopReason).toBe('MAX_ITERATIONS_REACHED');

    const invalid = structuredClone(result);
    invalid.finalTheta.initialDistribution[0]!.probability = Number.NaN;
    expect(() => finiteHiddenStateObservedMonitorCoupledEvidenceIterativeJointParameterReestimationResultToJson(invalid)).toThrow(
      /Cannot serialize non-finite number/
    );
  });
});
