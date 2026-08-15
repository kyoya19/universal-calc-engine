import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec } from '../src/model';
import {
  FiniteObservedMonitorCoupledEvidenceReestimationRecord,
  reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  cartesianPairs,
  effectivePairs,
  pairKey,
  standardKernel,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

type Cell = Map<string, number>;

function cellKey(stateId: StateId, monitorStateId: string): string {
  return `${stateId}\u0000${monitorStateId}`;
}

function aggregateA(model: DefinitionModel, fromStateId: StateId, toStateId: StateId): number {
  return model.transitions
    .filter((entry) => entry.from === fromStateId && entry.to === toStateId)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function denseRecord(): FiniteObservedMonitorCoupledEvidenceReestimationRecord {
  const model = twoStateModel();
  const qs = ['q0', 'q1'];
  const monitorPairs = effectivePairs(model);
  const evidencePairs = cartesianPairs(model);
  const monitorLayer = qs.flatMap((q) => monitorPairs.map(([fromStateId, toStateId]) => ({
    monitorStateId: q,
    fromStateId,
    toStateId,
    nextMonitorStateId: q === 'q0' ? 'q1' : 'q0'
  })));
  const evidenceLayer = (step: number) => qs.flatMap((q) => evidencePairs.map(([fromStateId, toStateId]) => ({
    monitorStateId: q,
    fromStateId,
    toStateId,
    likelihood: step === 1
      ? (q === 'q0' ? 0.8 : 0.35) * (toStateId === 'a' ? 1 : 0.7)
      : (q === 'q0' ? 0.45 : 0.9) * (fromStateId === toStateId ? 0.8 : 1)
  })));
  return {
    recordId: 'dense-q',
    horizon: 2,
    observations: ['x', 'y', 'x'],
    monitorStates: qs,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: [monitorLayer, monitorLayer.map((entry) => ({ ...entry }))],
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.86 },
      { stateId: 'b', likelihood: 0.52 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: [evidenceLayer(1), evidenceLayer(2)],
    targetMonitorStates: qs
  };
}

function denseRawOracle(model: DefinitionModel, record: FiniteObservedMonitorCoupledEvidenceReestimationRecord) {
  const states = ['a', 'b'];
  const qs = record.monitorStates;
  const initial = new Map([['a', 0.61], ['b', 0.39]]);
  const kernel = standardKernel();
  const b = (stateId: string, symbol: string) => kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)!.probability;
  const l0 = (stateId: string) => record.initialEvidenceLikelihoods.find((entry) => entry.stateId === stateId)!.likelihood;
  const q0 = (stateId: string) => record.initialMonitorStateByHiddenState.find((entry) => entry.stateId === stateId)!.monitorStateId;
  const delta = (step: number, q: string, from: string, to: string) => record.monitorTransitionByStep[step - 1]!.find(
    (entry) => entry.monitorStateId === q && entry.fromStateId === from && entry.toStateId === to
  )!.nextMonitorStateId;
  const c = (step: number, q: string, from: string, to: string) => record.monitorCoupledTransitionEvidenceLikelihoodsByStep[step - 1]!.find(
    (entry) => entry.monitorStateId === q && entry.fromStateId === from && entry.toStateId === to
  )!.likelihood;

  const alpha: Cell[] = Array.from({ length: record.horizon + 1 }, () => new Map());
  for (const stateId of states) {
    alpha[0]!.set(cellKey(stateId, q0(stateId)), initial.get(stateId)! * b(stateId, record.observations[0]!) * l0(stateId));
  }
  for (let step = 1; step <= record.horizon; step += 1) {
    for (const from of states) for (const q of qs) {
      const previous = alpha[step - 1]!.get(cellKey(from, q)) ?? 0;
      if (previous === 0) continue;
      for (const to of states) {
        const a = aggregateA(model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step, q, from, to);
        const key = cellKey(to, nextQ);
        const weight = previous * a * b(to, record.observations[step]!) * c(step, q, from, to);
        alpha[step]!.set(key, (alpha[step]!.get(key) ?? 0) + weight);
      }
    }
  }

  const target = new Set(record.targetMonitorStates ?? qs);
  const beta: Cell[] = Array.from({ length: record.horizon + 1 }, () => new Map());
  for (const stateId of states) for (const q of qs) beta[record.horizon]!.set(cellKey(stateId, q), target.has(q) ? 1 : 0);
  for (let step = record.horizon - 1; step >= 0; step -= 1) {
    for (const from of states) for (const q of qs) {
      let value = 0;
      for (const to of states) {
        const a = aggregateA(model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step + 1, q, from, to);
        value += a * b(to, record.observations[step + 1]!) * c(step + 1, q, from, to) * (beta[step + 1]!.get(cellKey(to, nextQ)) ?? 0);
      }
      beta[step]!.set(cellKey(from, q), value);
    }
  }

  let event = 0;
  for (const stateId of states) for (const q of qs) if (target.has(q)) event += alpha[record.horizon]!.get(cellKey(stateId, q)) ?? 0;
  const gamma = alpha.map((layer, step) => new Map(states.map((stateId) => {
    let value = 0;
    for (const q of qs) value += (layer.get(cellKey(stateId, q)) ?? 0) * (beta[step]!.get(cellKey(stateId, q)) ?? 0);
    return [stateId, value / event] as const;
  })));
  const xi = new Map<string, number>();
  for (let step = 0; step < record.horizon; step += 1) {
    for (const from of states) for (const to of states) {
      let value = 0;
      for (const q of qs) {
        const a = aggregateA(model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step + 1, q, from, to);
        value += (alpha[step]!.get(cellKey(from, q)) ?? 0) * a * b(to, record.observations[step + 1]!) * c(step + 1, q, from, to) * (beta[step + 1]!.get(cellKey(to, nextQ)) ?? 0) / event;
      }
      xi.set(pairKey(from, to), (xi.get(pairKey(from, to)) ?? 0) + value);
    }
  }
  const emissions = new Map<string, number>();
  for (let step = 0; step <= record.horizon; step += 1) {
    for (const stateId of states) {
      const key = `${stateId}\u0000${record.observations[step]!}`;
      emissions.set(key, (emissions.get(key) ?? 0) + (gamma[step]!.get(stateId) ?? 0));
    }
  }
  return { event, gamma, xi, emissions };
}

describe('Candidate AI structurally separate dense raw-probability X-by-Q oracle', () => {
  it('matches dense forward/backward gamma, xi, emission sufficient statistics, and event mass', () => {
    const model = twoStateModel();
    const record = denseRecord();
    const oracle = denseRawOracle(model, record);
    const result = reestimateFiniteHiddenStateParametersJointOneStepFromObservedAndMonitorCoupledEvidenceTrajectories(model, {
      initialDistribution: [
        { stateId: 'a', probability: 0.61 },
        { stateId: 'b', probability: 0.39 }
      ],
      alphabet: ['x', 'y'],
      kernel: standardKernel(),
      evidenceRecords: [record]
    });
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AI result');
    const captured = result.recordESteps[0]!;
    expect(captured.eventProbability).toBeCloseTo(oracle.event, 12);
    for (const stateId of ['a', 'b']) {
      expect(captured.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === stateId)!.probability).toBeCloseTo(oracle.gamma[0]!.get(stateId)!, 12);
    }
    for (const [key, expectedCount] of oracle.xi) {
      const [fromStateId, toStateId] = key.split('\u0000');
      const actual = captured.expectedTransitionCounts!.find((entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId)?.expectedCount ?? 0;
      expect(actual).toBeCloseTo(expectedCount, 12);
    }
    for (const [key, expectedCount] of oracle.emissions) {
      const [stateId, symbol] = key.split('\u0000');
      const actual = captured.expectedEmissionCounts!.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.expectedCount ?? 0;
      expect(actual).toBeCloseTo(expectedCount, 12);
    }
  });
});
