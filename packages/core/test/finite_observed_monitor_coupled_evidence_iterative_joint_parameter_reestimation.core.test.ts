import { describe, expect, it } from 'vitest';
import {
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import {
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import { DefinitionModel } from '../src/model';
import {
  authorityWitnessModel,
  authorityWitnessRequest,
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  oneStateMonitorRecord,
  standardKernel,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(result: ReturnType<typeof requireSuccess>, stateId: string): number {
  return result.finalTheta.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? Number.NaN;
}

function transitionProbability(result: ReturnType<typeof requireSuccess>, stateId: string, toStateId: string): number {
  return result.finalTheta.transitionRows.find((row) => row.stateId === stateId)?.row.find((entry) => entry.toStateId === toStateId)?.probability ?? Number.NaN;
}

function kernelProbability(result: ReturnType<typeof requireSuccess>, stateId: string, symbol: string): number {
  return result.finalTheta.observationKernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? Number.NaN;
}

describe('Candidate AJ core convergence-controlled iterative qualification', () => {
  it('reproduces the authority two-state witness and does not falsely stop after one Candidate AI step', () => {
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest()
      )
    );
    expect(result.possible).toBe(true);
    expect(result.converged).toBe(false);
    expect(result.stopReason).toBe('MAX_ITERATIONS_REACHED');
    expect(result.acceptedIterations).toBe(2);
    expect(result.iterationTrace).toHaveLength(2);

    expect(result.iterationTrace[0]!.currentTotalLogLikelihood).toBeCloseTo(-2.907721396231278, 11);
    expect(result.iterationTrace[0]!.updatedTotalLogLikelihood).toBeCloseTo(-2.6188508268794477, 11);
    expect(result.iterationTrace[0]!.maxParameterDelta).toBeCloseTo(0.24166666666666664, 11);
    expect(result.iterationTrace[0]!.maxParameterDelta).toBeGreaterThan(0.05);

    // The authority witness decimals are high-precision reference values. Production and
    // the independent complete-path oracle both use the qualified Float64 recurrence, so
    // this direct reference-display discriminator is intentionally checked at ~1e-7 while
    // the independent production-vs-oracle comparison remains materially tighter.
    expect(initialProbability(result, 'a')).toBeCloseTo(0.7840949279004514, 7);
    expect(transitionProbability(result, 'a', 'a')).toBeCloseTo(0.2998877669861661, 7);
    expect(transitionProbability(result, 'a', 'b')).toBeCloseTo(0.7001122330138339, 7);
    expect(transitionProbability(result, 'b', 'a')).toBeCloseTo(0.2325421855662136, 7);
    expect(kernelProbability(result, 'a', '0')).toBeCloseTo(0.7692965111377845, 7);
    expect(kernelProbability(result, 'b', '1')).toBeCloseTo(0.6719461953981515, 7);
    expect(result.iterationTrace[1]!.maxParameterDelta).toBeCloseTo(0.15844556634766722, 7);
    expect(result.finalTotalLogLikelihood).toBeCloseTo(-2.4110686033535313, 7);
  });

  it('with maxIterations=1 returns exactly the Candidate AI one-step updated parameters plus honest AJ stop metadata', () => {
    const model = authorityWitnessModel();
    const request = authorityWitnessRequest({ maxIterations: 1 });
    const ai = reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request);
    expect(ai.ok).toBe(true);
    if (!ai.ok || !ai.possible || ai.updatedInitialDistribution === null || ai.transitionRows === null || ai.observationKernelRows === null) {
      throw new Error('Candidate AI one-step witness failed');
    }
    const aj = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(aj.stopReason).toBe('MAX_ITERATIONS_REACHED');
    expect(aj.converged).toBe(false);
    expect(aj.acceptedIterations).toBe(1);
    expect(aj.finalTheta.initialDistribution).toEqual(ai.updatedInitialDistribution);
    for (const row of ai.transitionRows) {
      const ajRow = aj.finalTheta.transitionRows.find((entry) => entry.stateId === row.stateId)!;
      expect(ajRow.row).toEqual(row.updatedRow);
    }
    const expectedKernel = ai.observationKernelRows.flatMap((row) =>
      row.updatedRow.map((entry) => ({ stateId: row.stateId, symbol: entry.symbol, probability: entry.probability }))
    ).sort((left, right) => left.stateId.localeCompare(right.stateId) || left.symbol.localeCompare(right.symbol));
    expect(aj.finalTheta.observationKernel).toEqual(expectedKernel);
    expect(aj.iterationTrace[0]!.currentTotalLogLikelihood).toBe(ai.currentTotalLogLikelihood);
    expect(aj.iterationTrace[0]!.updatedTotalLogLikelihood).toBe(ai.updatedTotalLogLikelihood);
  });

  it('performs a fresh all-record E-step under theta1 instead of reusing iteration-0 sufficient statistics', () => {
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest()
      )
    );
    const first = result.iterationTrace[0]!;
    const second = result.iterationTrace[1]!;
    expect(second.currentTotalLogLikelihood).toBeCloseTo(first.updatedTotalLogLikelihood, 12);
    expect(second.aggregatedPosteriorInitialCounts[0]!.expectedCount).not.toBeCloseTo(
      first.aggregatedPosteriorInitialCounts[0]!.expectedCount,
      8
    );
    expect(first.freshAllRecordEStepPerformed).toBe(true);
    expect(second.freshAllRecordEStepPerformed).toBe(true);
    expect(result.diagnostics.staleSufficientStatisticReuseUsed).toBe(false);
  });

  it('requires both parameter and log-likelihood criteria, so a permissive likelihood criterion alone does not produce false convergence', () => {
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest({ maxIterations: 1, logLikelihoodConvergenceTolerance: 10, parameterConvergenceTolerance: 0.05 })
      )
    );
    expect(result.converged).toBe(false);
    expect(result.stopReason).toBe('MAX_ITERATIONS_REACHED');
    expect(result.iterationTrace[0]!.maxParameterDelta).toBeGreaterThan(0.05);
  });

  it('recognizes an exact one-state fixed point after the first accepted unchanged step', () => {
    const model: DefinitionModel = {
      startState: 'only',
      states: [{ id: 'only' }],
      transitions: [{ from: 'only', to: 'only', probability: 1 }]
    };
    const request = iterativeRequest({
      initialDistribution: [{ stateId: 'only', probability: 1 }],
      alphabet: ['x'],
      kernel: [{ stateId: 'only', symbol: 'x', probability: 1 }],
      evidenceRecords: [oneStateMonitorRecord(model, ['x', 'x'], { recordId: 'fixed' })],
      maxIterations: 5,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0,
      likelihoodNonDecreaseTolerance: 0
    });
    const result = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(result.possible).toBe(true);
    expect(result.converged).toBe(true);
    expect(result.stopReason).toBe('CONVERGED');
    expect(result.acceptedIterations).toBe(1);
    expect(result.iterationTrace[0]!.maxParameterDelta).toBe(0);
    expect(result.iterationTrace[0]!.logLikelihoodDelta).toBe(0);
  });

  it('keeps external evidence and monitor definitions byte-stable across iterations', () => {
    const model = twoStateModel();
    const request = iterativeRequest({
      initialDistribution: [
        { stateId: 'a', probability: 0.61 },
        { stateId: 'b', probability: 0.39 }
      ],
      kernel: standardKernel(),
      maxIterations: 3,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0
    });
    const before = JSON.stringify(request.evidenceRecords);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    expect(JSON.stringify(request.evidenceRecords)).toBe(before);
    expect(result.iterationTrace.every((entry) => entry.externalEvidenceAndMonitorDefinitionsFixed)).toBe(true);
    expect(result.diagnostics.externalEvidenceMutationUsed).toBe(false);
    expect(result.diagnostics.monitorMutationUsed).toBe(false);
  });
});
