import { describe, expect, it } from 'vitest';
import {
  reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories
} from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import {
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  aggregateTransitionProbability,
  completeBatchOracle,
  effectivePairs,
  initialDistribution,
  modelWithAggregateRows,
  oneStateMonitorRecord,
  pairKey,
  resultInitialProbability,
  resultTransitionProbability,
  stateIds,
  twoStateModel,
  updatedRowsFromCounts
} from './finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation.test_helpers';

function records() {
  const model = twoStateModel();
  const pairs = effectivePairs(model);
  const layer = (values: Record<string, number>) => Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), values[pairKey(from, to)] ?? 0.5]));
  return [
    oneStateMonitorRecord(model, {
      recordId: 'r1',
      initialLikelihoods: { a: 0.91, b: 0.24 },
      stepLikelihoods: [
        layer({ [pairKey('a', 'a')]: 0.83, [pairKey('a', 'b')]: 0.42, [pairKey('b', 'a')]: 0.71, [pairKey('b', 'b')]: 0.31 }),
        layer({ [pairKey('a', 'a')]: 0.46, [pairKey('a', 'b')]: 0.88, [pairKey('b', 'a')]: 0.37, [pairKey('b', 'b')]: 0.79 })
      ]
    }),
    oneStateMonitorRecord(model, {
      recordId: 'r2',
      initialLikelihoods: { a: 0.28, b: 0.86 },
      stepLikelihoods: [
        layer({ [pairKey('a', 'a')]: 0.35, [pairKey('a', 'b')]: 0.92, [pairKey('b', 'a')]: 0.63, [pairKey('b', 'b')]: 0.74 })
      ]
    })
  ];
}

function request(recordsOverride = records()) {
  return { initialDistribution: initialDistribution(), evidenceRecords: recordsOverride };
}

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

describe('Candidate AH core common-current batch qualification', () => {
  it('matches independent complete concrete-transition path enumeration for sufficient statistics, M-step, and likelihoods', () => {
    const model = twoStateModel();
    const req = request();
    const oracle = completeBatchOracle(model, req);
    expect(oracle.possible).toBe(true);
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, req));
    expect(result.possible).toBe(true);
    for (const stateId of stateIds(model)) {
      expect(resultInitialProbability(result, stateId)).toBeCloseTo(oracle.updatedInitial!.get(stateId) ?? 0, 11);
      for (const toStateId of oracle.updatedRows!.get(stateId)?.keys() ?? []) {
        expect(resultTransitionProbability(result, stateId, toStateId)).toBeCloseTo(oracle.updatedRows!.get(stateId)!.get(toStateId) ?? 0, 11);
      }
    }
    expect(result.currentTotalLogLikelihood).toBeCloseTo(oracle.currentTotalLogLikelihood!, 11);
    expect(result.updatedTotalLogLikelihood).toBeCloseTo(oracle.updatedTotalLogLikelihood!, 11);
    expect(result.likelihoodDelta).toBeCloseTo(oracle.updatedTotalLogLikelihood! - oracle.currentTotalLogLikelihood!, 11);
    expect(result.diagnostics.allRecordEStepsUseSameCurrentModel).toBe(true);
    expect(result.diagnostics.allRecordEStepsFrozenBeforeMstep).toBe(true);
    expect(result.diagnostics.sequentialRecordUpdatesUsed).toBe(false);
    expect(result.diagnostics.trajectoryConcatenationUsed).toBe(false);
  });

  it('preserves per-record Candidate AE posterior initial and expected-transition statistics', () => {
    const model = twoStateModel();
    const req = request();
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, req));
    expect(result.possible).toBe(true);
    for (let index = 0; index < req.evidenceRecords.length; index += 1) {
      const record = req.evidenceRecords[index]!;
      const ae = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        {
          initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
          horizon: record.horizon,
          monitorStates: [...record.monitorStates],
          initialMonitorStateByHiddenState: record.initialMonitorStateByHiddenState.map((entry) => ({ ...entry })),
          monitorTransitionByStep: record.monitorTransitionByStep.map((layer) => layer.map((entry) => ({ ...entry }))),
          initialEvidenceLikelihoods: record.initialEvidenceLikelihoods.map((entry) => ({ ...entry })),
          monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((layer) => layer.map((entry) => ({ ...entry }))),
          targetMonitorStates: [...record.monitorStates]
        }
      );
      expect(ae.ok).toBe(true);
      if (!ae.ok || !ae.possible) throw new Error('Expected possible Candidate AE result');
      const captured = result.recordESteps[index]!;
      expect(captured.posteriorInitialStateProbabilities).toEqual(ae.smoothingSteps![0]!.hiddenStateDistribution);
      expect(captured.expectedTransitionCounts).toEqual(ae.expectedTransitionCounts);
    }
  });

  it('is a common-current batch update rather than sequential per-record learning', () => {
    const model = twoStateModel();
    const req = request();
    const batch = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, req));
    const first = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request([req.evidenceRecords[0]!] as typeof req.evidenceRecords)));
    if (!first.possible || first.transitionRows === null || first.updatedInitialDistribution === null) throw new Error('Expected first record update');
    const firstRows = new Map(first.transitionRows.map((row) => [row.stateId, new Map(row.updatedRow.map((entry) => [entry.toStateId, entry.probability] as const))] as const));
    const sequentialModel = modelWithAggregateRows(model, firstRows);
    const second = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(
      sequentialModel,
      { initialDistribution: first.updatedInitialDistribution, evidenceRecords: [req.evidenceRecords[1]!] }
    ));
    expect(batch.possible).toBe(true);
    expect(second.possible).toBe(true);
    const delta = Math.abs(resultInitialProbability(batch, 'a') - resultInitialProbability(second, 'a')) +
      Math.abs(resultTransitionProbability(batch, 'a', 'a') - resultTransitionProbability(second, 'a', 'a'));
    expect(delta).toBeGreaterThan(1e-5);
  });

  it('does not invent a cross-record transition as trajectory concatenation would', () => {
    const model = twoStateModel();
    const shortRecords = records().map((record) => ({ ...record, horizon: 1, monitorTransitionByStep: record.monitorTransitionByStep.slice(0, 1), monitorCoupledTransitionEvidenceLikelihoodsByStep: record.monitorCoupledTransitionEvidenceLikelihoodsByStep.slice(0, 1) }));
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request(shortRecords)));
    expect(result.possible).toBe(true);
    const learnedDeparture = result.transitionRows!.filter((row) => !row.terminal).reduce((sum, row) => sum + row.expectedDepartureMass, 0);
    expect(learnedDeparture).toBeCloseTo(2, 11);
    expect(learnedDeparture).not.toBeCloseTo(3, 11);
    expect(result.diagnostics.trajectoryConcatenationUsed).toBe(false);
  });

  it('leaves mu and A unchanged under all-one evidence and all-target monitor semantics', () => {
    const model = twoStateModel();
    const pairs = effectivePairs(model);
    const allOne = oneStateMonitorRecord(model, {
      initialLikelihoods: { a: 1, b: 1 },
      stepLikelihoods: Array.from({ length: 3 }, () => Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), 1])))
    });
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request([allOne])));
    expect(result.possible).toBe(true);
    for (const stateId of stateIds(model)) {
      expect(resultInitialProbability(result, stateId)).toBeCloseTo(initialDistribution().find((entry) => entry.stateId === stateId)!.probability, 11);
      for (const toStateId of effectivePairs(model).filter(([from]) => from === stateId).map(([, to]) => to)) {
        expect(resultTransitionProbability(result, stateId, toStateId)).toBeCloseTo(aggregateTransitionProbability(model, stateId, toStateId), 11);
      }
    }
  });

  it('treats omitted targetMonitorStates exactly like targeting every declared monitor state', () => {
    const model = twoStateModel();
    const record = records()[0]!;
    const explicit = { ...record, targetMonitorStates: [...record.monitorStates] };
    const omitted = { ...record };
    delete omitted.targetMonitorStates;
    const a = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request([omitted])));
    const b = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request([explicit])));
    expect(a).toEqual(b);
  });
});
