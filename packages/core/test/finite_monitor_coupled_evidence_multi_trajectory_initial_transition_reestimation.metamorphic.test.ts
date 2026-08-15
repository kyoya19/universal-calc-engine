import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import { reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories } from '../src/finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation';
import {
  completeBatchOracle,
  effectivePairs,
  initialDistribution,
  oneStateMonitorRecord,
  pairKey,
  resultInitialProbability,
  resultTransitionProbability,
  standardHmmRecord,
  stateIds,
  twoStateModel
} from './finite_monitor_coupled_evidence_multi_trajectory_initial_transition_reestimation.test_helpers';

function requireSuccess(result: ReturnType<typeof reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories>) {
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error(result.ok ? 'expected possible result' : result.failure.message);
  return result;
}

function monitorHistoryRecord(model: DefinitionModel) {
  const pairs = effectivePairs(model);
  const monitorStates = ['qA', 'qB'];
  const monitorLayer = monitorStates.flatMap((monitorStateId) =>
    pairs.map(([fromStateId, toStateId]) => ({ monitorStateId, fromStateId, toStateId, nextMonitorStateId: monitorStateId }))
  );
  const evidenceLayer1 = monitorStates.flatMap((monitorStateId) =>
    pairs.map(([fromStateId, toStateId]) => ({ monitorStateId, fromStateId, toStateId, likelihood: 0.8 }))
  );
  const evidenceLayer2 = monitorStates.flatMap((monitorStateId) =>
    pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      likelihood: fromStateId === 'a' && toStateId === 'a' ? (monitorStateId === 'qA' ? 0.9 : 0.1) : 0.55
    }))
  );
  return {
    horizon: 2,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'qA' },
      { stateId: 'b', monitorStateId: 'qB' }
    ],
    monitorTransitionByStep: [monitorLayer.map((entry) => ({ ...entry })), monitorLayer.map((entry) => ({ ...entry }))],
    initialEvidenceLikelihoods: [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: [evidenceLayer1, evidenceLayer2]
  };
}

describe('Candidate AH structural metamorphic qualification', () => {
  it('uses monitor-coupled history-sensitive evidence and matches the independent path oracle', () => {
    const model = twoStateModel();
    const request = { initialDistribution: initialDistribution(), evidenceRecords: [monitorHistoryRecord(model)] };
    const oracle = completeBatchOracle(model, request);
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, request));
    expect(resultInitialProbability(result, 'a')).toBeCloseTo(oracle.updatedInitial!.get('a') ?? 0, 11);
    expect(resultTransitionProbability(result, 'a', 'a')).toBeCloseTo(oracle.updatedRows!.get('a')!.get('a') ?? 0, 11);
    const qA = result.recordESteps[0]!.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === 'a')!.probability;
    expect(qA).toBeGreaterThan(0);
    expect(result.diagnostics.calibratedEvidenceKernelUpdated).toBe(false);
    expect(result.diagnostics.monitorTransitionUpdated).toBe(false);
  });

  it('is invariant to parallel-transition split versus merged hidden-pair mass', () => {
    const split: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.7 },
        { from: 'a', to: 'b', probability: 0.1 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const merged: DefinitionModel = {
      ...split,
      transitions: [
        { from: 'a', to: 'a', probability: 0.7 },
        { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.6 }
      ]
    };
    const make = (model: DefinitionModel) => ({
      initialDistribution: initialDistribution(),
      evidenceRecords: [oneStateMonitorRecord(model, {
        initialLikelihoods: { a: 0.8, b: 0.4 },
        stepLikelihoods: [Object.fromEntries(effectivePairs(model).map(([from, to]) => [pairKey(from, to), from === to ? 0.7 : 0.45]))]
      })]
    });
    const a = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(split, make(split)));
    const b = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(merged, make(merged)));
    for (const stateId of ['a', 'b']) {
      expect(resultInitialProbability(a, stateId)).toBeCloseTo(resultInitialProbability(b, stateId), 12);
      for (const toStateId of ['a', 'b']) expect(resultTransitionProbability(a, stateId, toStateId)).toBeCloseTo(resultTransitionProbability(b, stateId, toStateId), 12);
    }
    expect(a.currentTotalLogLikelihood).toBeCloseTo(b.currentTotalLogLikelihood!, 12);
  });

  it('excludes terminal implicit self-retention from learned counts while keeping the structural terminal row', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.4 },
        { from: 'a', to: 't', probability: 0.6 }
      ]
    };
    const pairs = effectivePairs(model);
    const allOne = Object.fromEntries(pairs.map(([from, to]) => [pairKey(from, to), 1]));
    const result = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(model, {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 't', probability: 0 }],
      evidenceRecords: [oneStateMonitorRecord(model, { initialLikelihoods: { a: 1, t: 1 }, stepLikelihoods: [allOne, allOne, allOne] })]
    }));
    const terminal = result.transitionRows!.find((row) => row.stateId === 't')!;
    expect(terminal.terminal).toBe(true);
    expect(terminal.expectedDepartureMass).toBe(0);
    expect(terminal.status).toBe('structural_terminal_self_retention');
    expect(terminal.updatedRow).toEqual([{ toStateId: 't', probability: 1 }]);
    expect(result.diagnostics.terminalImplicitSelfRetentionExcludedFromLearnedCounts).toBe(true);
  });

  it('is invariant under a hidden-state relabeling', () => {
    const original = twoStateModel();
    const renamed: DefinitionModel = {
      startState: 'x',
      states: [{ id: 'x' }, { id: 'y' }],
      transitions: [
        { from: 'x', to: 'x', probability: 0.72 },
        { from: 'x', to: 'y', probability: 0.28 },
        { from: 'y', to: 'x', probability: 0.31 },
        { from: 'y', to: 'y', probability: 0.69 }
      ]
    };
    const observations = ['red', 'blue', 'red'];
    const kernelA = [
      { stateId: 'a', symbol: 'red', probability: 0.85 }, { stateId: 'a', symbol: 'blue', probability: 0.15 },
      { stateId: 'b', symbol: 'red', probability: 0.25 }, { stateId: 'b', symbol: 'blue', probability: 0.75 }
    ];
    const kernelB = kernelA.map((entry) => ({ ...entry, stateId: entry.stateId === 'a' ? 'x' : 'y' }));
    const a = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(original, {
      initialDistribution: initialDistribution(), evidenceRecords: [standardHmmRecord(original, observations, kernelA)]
    }));
    const b = requireSuccess(reestimateFiniteHiddenStateInitialAndTransitionsOneStepFromMonitorCoupledCalibratedEvidenceTrajectories(renamed, {
      initialDistribution: [{ stateId: 'x', probability: 0.61 }, { stateId: 'y', probability: 0.39 }], evidenceRecords: [standardHmmRecord(renamed, observations, kernelB)]
    }));
    expect(resultInitialProbability(a, 'a')).toBeCloseTo(resultInitialProbability(b, 'x'), 12);
    expect(resultInitialProbability(a, 'b')).toBeCloseTo(resultInitialProbability(b, 'y'), 12);
    expect(resultTransitionProbability(a, 'a', 'b')).toBeCloseTo(resultTransitionProbability(b, 'x', 'y'), 12);
    expect(resultTransitionProbability(a, 'b', 'a')).toBeCloseTo(resultTransitionProbability(b, 'y', 'x'), 12);
  });
});
