import { describe, expect, it } from 'vitest';
import {
  FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace,
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import { DefinitionModel } from '../src/model';
import {
  authorityWitnessModel,
  authorityWitnessRequest,
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import { oneStateMonitorRecord } from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

function term(count: number, probability: number): number {
  if (count === 0) return 0;
  if (probability === 0) return Number.NEGATIVE_INFINITY;
  return count * Math.log(probability);
}

function binaryObjective(leftCount: number, rightCount: number, leftProbability: number): number {
  return term(leftCount, leftProbability) + term(rightCount, 1 - leftProbability);
}

function assertBinarySimplexMaximum(leftCount: number, rightCount: number, leftProbability: number): void {
  const optimum = binaryObjective(leftCount, rightCount, leftProbability);
  for (let n = 0; n <= 40; n += 1) {
    expect(optimum + 1e-11).toBeGreaterThanOrEqual(binaryObjective(leftCount, rightCount, n / 40));
  }
  const total = leftCount + rightCount;
  if (total > 0) expect(leftProbability).toBeCloseTo(leftCount / total, 11);
}

function assertTraceObjective(trace: FiniteObservedMonitorCoupledEvidenceIterativeIterationTrace): void {
  const initial = trace.aggregatedPosteriorInitialCounts;
  expect(initial).toHaveLength(2);
  const initialTotal = initial.reduce((sum, entry) => sum + entry.expectedCount, 0);
  const initialLeft = initial[0]!.expectedCount;
  assertBinarySimplexMaximum(initialLeft, initialTotal - initialLeft, initialLeft / initialTotal);

  for (const row of trace.transitionRows) {
    if (row.terminal || row.status === 'retained_zero_expected_departure') continue;
    expect(row.expectedCounts).toHaveLength(2);
    expect(row.updatedRow).toHaveLength(2);
    const counts = row.expectedCounts;
    const probability = row.updatedRow[0]!.probability;
    assertBinarySimplexMaximum(counts[0]!.expectedCount, counts[1]!.expectedCount, probability);
  }

  for (const row of trace.observationKernelRows) {
    if (row.status === 'retained_zero_expected_occupancy') continue;
    expect(row.expectedCounts).toHaveLength(2);
    expect(row.updatedRow).toHaveLength(2);
    const counts = row.expectedCounts;
    const probability = row.updatedRow[0]!.probability;
    assertBinarySimplexMaximum(counts[0]!.expectedCount, counts[1]!.expectedCount, probability);
  }
}

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AJ result');
  return result;
}

describe('Candidate AJ per-iteration expected-complete-data objective oracle', () => {
  it('independently verifies every positive-information pi/A/B block is a finite-simplex maximizer at every accepted witness iteration', () => {
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(
        authorityWitnessModel(),
        authorityWitnessRequest()
      )
    );
    expect(result.iterationTrace.length).toBe(2);
    for (const trace of result.iterationTrace) assertTraceObjective(trace);
  });

  it('retains zero-information A and B rows exactly instead of inventing a maximizer', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'a', probability: 0.25 },
        { from: 'b', to: 'b', probability: 0.75 }
      ]
    };
    const record = oneStateMonitorRecord(model, ['x', 'x'], { recordId: 'zero-info' });
    const result = requireSuccess(
      reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, iterativeRequest({
        initialDistribution: [
          { stateId: 'a', probability: 1 },
          { stateId: 'b', probability: 0 }
        ],
        alphabet: ['x', 'y'],
        kernel: [
          { stateId: 'a', symbol: 'x', probability: 1 },
          { stateId: 'a', symbol: 'y', probability: 0 },
          { stateId: 'b', symbol: 'x', probability: 0.3 },
          { stateId: 'b', symbol: 'y', probability: 0.7 }
        ],
        evidenceRecords: [record],
        maxIterations: 2,
        parameterConvergenceTolerance: 0,
        logLikelihoodConvergenceTolerance: 0,
        likelihoodNonDecreaseTolerance: 0
      }))
    );
    const trace = result.iterationTrace[0]!;
    const transition = trace.transitionRows.find((row) => row.stateId === 'b')!;
    const observation = trace.observationKernelRows.find((row) => row.stateId === 'b')!;
    expect(transition.status).toBe('retained_zero_expected_departure');
    expect(transition.updatedRow).toEqual(transition.currentRow);
    expect(observation.status).toBe('retained_zero_expected_occupancy');
    expect(observation.updatedRow).toEqual(observation.currentRow);
    expect(trace.retainedZeroDepartureStateIds).toContain('b');
    expect(trace.retainedZeroOccupancyStateIds).toContain('b');
  });
});
