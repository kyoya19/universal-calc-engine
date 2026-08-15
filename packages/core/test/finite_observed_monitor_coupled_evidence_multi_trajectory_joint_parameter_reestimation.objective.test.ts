import { describe, expect, it } from 'vitest';
import {
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  completeBatchOracle,
  modelWithAggregateRows,
  standardRequest,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function term(count: number, probability: number): number {
  if (count === 0) return 0;
  if (probability === 0) return Number.NEGATIVE_INFINITY;
  return count * Math.log(probability);
}

function binaryObjective(leftCount: number, rightCount: number, leftProbability: number): number {
  return term(leftCount, leftProbability) + term(rightCount, 1 - leftProbability);
}

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AI result');
  return result;
}

describe('Candidate AI expected-complete-data objective and simultaneous-update discrimination', () => {
  it('attains the independent finite-simplex optimum for pi, every positive A row, and every positive B row', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const oracle = completeBatchOracle(model, request);
    expect(oracle.possible).toBe(true);
    const result = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));

    const gA = oracle.initialCounts.get('a') ?? 0;
    const gB = oracle.initialCounts.get('b') ?? 0;
    const pMu = result.updatedInitialDistribution!.find((entry) => entry.stateId === 'a')!.probability;
    const qMu = binaryObjective(gA, gB, pMu);
    for (let n = 0; n <= 20; n += 1) expect(qMu + 1e-12).toBeGreaterThanOrEqual(binaryObjective(gA, gB, n / 20));

    for (const stateId of ['a', 'b']) {
      const nA = oracle.transitions.get(`${stateId}\u0000a`) ?? 0;
      const nB = oracle.transitions.get(`${stateId}\u0000b`) ?? 0;
      if (nA + nB > 1e-12) {
        const pA = result.transitionRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.toStateId === 'a')!.probability;
        const qA = binaryObjective(nA, nB, pA);
        for (let n = 0; n <= 20; n += 1) expect(qA + 1e-12).toBeGreaterThanOrEqual(binaryObjective(nA, nB, n / 20));
      }

      const mX = oracle.emissions.get(stateId)!.get('x') ?? 0;
      const mY = oracle.emissions.get(stateId)!.get('y') ?? 0;
      if (mX + mY > 1e-12) {
        const pX = result.observationKernelRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.symbol === 'x')!.probability;
        const qB = binaryObjective(mX, mY, pX);
        for (let n = 0; n <= 20; n += 1) expect(qB + 1e-12).toBeGreaterThanOrEqual(binaryObjective(mX, mY, n / 20));
      }
    }
    expect(result.likelihoodDelta!).toBeGreaterThanOrEqual(-result.diagnostics.likelihoodTolerance);
  });

  it('differs from an illegal sequential parameter-block scheme that recomputes the E-step after applying pi/A before B', () => {
    const model = twoStateModel();
    const request = standardRequest();
    const simultaneous = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, request));
    const firstRows = new Map(simultaneous.transitionRows!.map((row) => [
      row.stateId,
      new Map(row.updatedRow.map((entry) => [entry.toStateId, entry.probability] as const))
    ] as const));
    const intermediateModel = modelWithAggregateRows(model, firstRows);
    const illegalSecondEStep = requireSuccess(reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(intermediateModel, {
      ...request,
      initialDistribution: simultaneous.updatedInitialDistribution!,
      kernel: request.kernel.map((entry) => ({ ...entry }))
    }));
    let difference = 0;
    for (const stateId of ['a', 'b']) for (const symbol of ['x', 'y']) {
      const legal = simultaneous.observationKernelRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.symbol === symbol)!.probability;
      const illegal = illegalSecondEStep.observationKernelRows!.find((row) => row.stateId === stateId)!.updatedRow.find((entry) => entry.symbol === symbol)!.probability;
      difference += Math.abs(legal - illegal);
    }
    expect(difference).toBeGreaterThan(1e-5);
    expect(simultaneous.diagnostics.sequentialParameterBlockUpdatesUsed).toBe(false);
    expect(simultaneous.diagnostics.allRecordEStepsFrozenBeforeMstep).toBe(true);
  });
});
