import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import { reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories } from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import {
  completeBatchOracle,
  effectivePairs,
  initialDistribution,
  oneStateMonitorRecord,
  pairKey,
  resultInitialProbability,
  resultTransitionProbability,
  twoStateModel
} from './finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation.test_helpers';

function request(model = twoStateModel()) {
  const pairs = effectivePairs(model);
  const layer = (aa: number, ab: number, ba: number, bb: number) =>
    Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), from === 'a' ? (to === 'a' ? aa : ab) : (to === 'a' ? ba : bb)]));
  return {
    initialDistribution: initialDistribution(),
    evidenceRecords: [
      oneStateMonitorRecord(model, {
        initialLikelihoods: { a: 0.92, b: 0.27 },
        stepLikelihoods: [layer(0.85, 0.42, 0.71, 0.33), layer(0.43, 0.91, 0.38, 0.77)]
      }),
      oneStateMonitorRecord(model, {
        initialLikelihoods: { a: 0.31, b: 0.88 },
        stepLikelihoods: [layer(0.29, 0.87, 0.64, 0.81), layer(0.76, 0.36, 0.68, 0.55)]
      })
    ]
  };
}

function xLogXCount(count: number, probability: number): number {
  if (count === 0) return 0;
  if (probability <= 0) return Number.NEGATIVE_INFINITY;
  return count * Math.log(probability);
}

function qObjective(
  initialCounts: Map<string, number>,
  transitionCounts: Map<string, number>,
  muA: number,
  rowAA: number,
  rowBA: number
): number {
  return (
    xLogXCount(initialCounts.get('a') ?? 0, muA) +
    xLogXCount(initialCounts.get('b') ?? 0, 1 - muA) +
    xLogXCount(transitionCounts.get(pairKey('a', 'a')) ?? 0, rowAA) +
    xLogXCount(transitionCounts.get(pairKey('a', 'b')) ?? 0, 1 - rowAA) +
    xLogXCount(transitionCounts.get(pairKey('b', 'a')) ?? 0, rowBA) +
    xLogXCount(transitionCounts.get(pairKey('b', 'b')) ?? 0, 1 - rowBA)
  );
}

describe('Candidate AH independent expected-complete-data objective oracle', () => {
  it('analytic simultaneous M-step is at least as good as every checked finite simplex-grid alternative', () => {
    const model = twoStateModel();
    const req = request(model);
    const oracle = completeBatchOracle(model, req);
    expect(oracle.possible).toBe(true);
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, req);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error(result.ok ? 'expected possible result' : result.failure.message);
    const analytic = qObjective(
      oracle.initialCounts,
      oracle.transitions,
      resultInitialProbability(result, 'a'),
      resultTransitionProbability(result, 'a', 'a'),
      resultTransitionProbability(result, 'b', 'a')
    );
    for (let mu = 0.05; mu < 1; mu += 0.05) {
      for (let aa = 0.05; aa < 1; aa += 0.05) {
        for (let ba = 0.05; ba < 1; ba += 0.05) {
          const candidate = qObjective(oracle.initialCounts, oracle.transitions, mu, aa, ba);
          expect(analytic + 1e-10).toBeGreaterThanOrEqual(candidate);
        }
      }
    }
  });

  it('retains a current row when expected departure is zero because the Q objective is non-unique for that row', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'a', probability: 0.25 },
        { from: 'b', to: 'b', probability: 0.75 }
      ]
    };
    const pairs = effectivePairs(model);
    const allOne = Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), 1]));
    const result = reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      evidenceRecords: [oneStateMonitorRecord(model, { initialLikelihoods: { a: 1, b: 1 }, stepLikelihoods: [allOne, allOne] })]
    });
    if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
    expect(result.possible).toBe(true);
    if (!result.possible) throw new Error('expected possible result');
    const row = result.transitionRows!.find((entry) => entry.stateId === 'b')!;
    expect(row.expectedDepartureMass).toBeCloseTo(0, 12);
    expect(row.status).toBe('retained_zero_expected_departure');
    expect(row.uniqueByExpectedCounts).toBe(false);
    expect(resultTransitionProbability(result, 'b', 'a')).toBeCloseTo(0.25, 12);
    expect(resultTransitionProbability(result, 'b', 'b')).toBeCloseTo(0.75, 12);
  });
});
