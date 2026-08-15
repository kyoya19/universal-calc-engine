import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_calibrated_evidence';
import { conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods } from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const pairs = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) {
      pairs.add(`${state.id}\u0000${state.id}`);
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from === state.id && Number(transition.probability) > 0) pairs.add(`${transition.from}\u0000${transition.to}`);
    }
  }
  return [...pairs].sort().map((key) => key.split('\u0000') as [StateId, StateId]);
}

function buildRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId, step: number) => string
) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, (_, index) => monitorStates.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
    monitorStateId: q,
    fromStateId,
    toStateId,
    nextMonitorStateId: rule(q, fromStateId, toStateId, index + 1)
  }))));
}

function baseModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.2 }, { from: 'a', to: 'b', probability: 0.4 }, { from: 'a', to: 'c', probability: 0.4 },
      { from: 'b', to: 'a', probability: 0.5 }, { from: 'b', to: 'c', probability: 0.5 },
      { from: 'c', to: 'a', probability: 0.5 }, { from: 'c', to: 'b', probability: 0.5 }
    ]
  };
}

function orderRequest(model: DefinitionModel): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const monitorStates = ['none', 'b_first', 'c_first'];
  const horizon = 3;
  return {
    initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }, { stateId: 'c', probability: 0 }],
    horizon,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'none' },
      { stateId: 'b', monitorStateId: 'b_first' },
      { stateId: 'c', monitorStateId: 'c_first' }
    ],
    monitorTransitionByStep: buildRows(model, horizon, monitorStates, (q, _from, to) => {
      if (q !== 'none') return q;
      if (to === 'b') return 'b_first';
      if (to === 'c') return 'c_first';
      return q;
    }),
    evidenceLikelihoods: Array.from({ length: horizon + 1 }, () => [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.6 },
      { stateId: 'c', likelihood: 0.4 }
    ])
  };
}

function joint(result: ReturnType<typeof analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence>, q: string): number {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result.jointEvidenceMonitorDistribution?.find((entry) => entry.monitorStateId === q)?.jointProbability ?? 0;
}

describe('Candidate AC authority metamorphic qualification', () => {
  it('distinguishes order-sensitive paths that scalar zero-additive endpoint summaries cannot distinguish', () => {
    const model = baseModel();
    const result = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, orderRequest(model));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(joint(result, 'b_first')).toBeGreaterThan(0);
    expect(joint(result, 'c_first')).toBeGreaterThan(0);
    expect(result.finalEvidenceConditionedMonitorDistribution?.map((entry) => entry.monitorStateId)).toContain('b_first');
    expect(result.finalEvidenceConditionedMonitorDistribution?.map((entry) => entry.monitorStateId)).toContain('c_first');
  });

  it('preserves absolute evidence scale while normalized monitor and combined posteriors stay invariant', () => {
    const model = baseModel();
    const request = orderRequest(model);
    const scaled: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      ...request,
      evidenceLikelihoods: request.evidenceLikelihoods.map((row, step) => step === 1
        ? row.map((entry) => ({ ...entry, likelihood: entry.likelihood * 0.5 }))
        : row.map((entry) => ({ ...entry })))
    };
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, request);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, scaled);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability! * 0.5, 14);
    expect(b.finalEvidenceConditionedMonitorDistribution).toEqual(a.finalEvidenceConditionedMonitorDistribution);
    const ca = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['b_first'] });
    const cb = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...scaled, targetMonitorStates: ['b_first'] });
    expect(ca.ok).toBe(true);
    expect(cb.ok).toBe(true);
    if (!ca.ok || !cb.ok) throw new Error('conditioning failed');
    expect(cb.jointEventProbability).toBeCloseTo(ca.jointEventProbability! * 0.5, 14);
    expect(cb.targetConditionalProbabilityGivenEvidence).toBeCloseTo(ca.targetConditionalProbabilityGivenEvidence!, 14);
    expect(cb.smoothingSteps).toEqual(ca.smoothingSteps);
  });

  it('makes the all-monitor target evidence-neutral and reconstructs Candidate Z smoothing/pairwise quantities', () => {
    const model = baseModel();
    const request = orderRequest(model);
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, {
      initialDistribution: request.initialDistribution,
      evidenceLikelihoods: request.evidenceLikelihoods
    });
    const ac = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, {
      ...request,
      targetMonitorStates: [...request.monitorStates]
    });
    expect(z.ok).toBe(true);
    expect(ac.ok).toBe(true);
    if (!z.ok || !ac.ok) throw new Error('conditioning failed');
    expect(ac.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const stateId of ['a', 'b', 'c']) {
        const actual = ac.smoothingSteps![step]!.hiddenStateDistribution.find((entry) => entry.stateId === stateId)!.probability;
        const expected = z.smoothingSteps![step]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
        expect(actual).toBeCloseTo(expected, 12);
      }
    }
    for (let step = 0; step < request.horizon; step += 1) {
      for (const actual of ac.pairwiseSteps![step]!.pairwiseDistribution) {
        const expected = z.pairwiseSteps![step]!.pairwiseDistribution.find((entry) => entry.fromStateId === actual.fromStateId && entry.toStateId === actual.toStateId)!;
        expect(actual.probability).toBeCloseTo(expected.probability, 12);
      }
    }
  });

  it('is additive over disjoint target monitor sets', () => {
    const model = baseModel();
    const request = orderRequest(model);
    const bOnly = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['b_first'] });
    const cOnly = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['c_first'] });
    const union = conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(model, { ...request, targetMonitorStates: ['b_first', 'c_first'] });
    expect(bOnly.ok && cOnly.ok && union.ok).toBe(true);
    if (!bOnly.ok || !cOnly.ok || !union.ok) throw new Error('conditioning failed');
    expect(union.jointEventProbability).toBeCloseTo(bOnly.jointEventProbability! + cOnly.jointEventProbability!, 14);
  });

  it('is invariant to monitor-state relabeling and hidden/request entry ordering', () => {
    const model = baseModel();
    const request = orderRequest(model);
    const rename = new Map([['none', 'z0'], ['b_first', 'z1'], ['c_first', 'z2']]);
    const renamed: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      monitorStates: [...request.monitorStates].reverse().map((q) => rename.get(q)!),
      initialMonitorStateByHiddenState: [...request.initialMonitorStateByHiddenState].reverse().map((entry) => ({ ...entry, monitorStateId: rename.get(entry.monitorStateId)! })),
      monitorTransitionByStep: request.monitorTransitionByStep.map((row) => [...row].reverse().map((entry) => ({
        ...entry,
        monitorStateId: rename.get(entry.monitorStateId)!,
        nextMonitorStateId: rename.get(entry.nextMonitorStateId)!
      }))),
      evidenceLikelihoods: request.evidenceLikelihoods.map((row) => [...row].reverse())
    };
    const original = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, request);
    const relabeled = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, renamed);
    expect(original.ok).toBe(true);
    expect(relabeled.ok).toBe(true);
    if (!original.ok || !relabeled.ok) throw new Error('analysis failed');
    expect(relabeled.evidenceProbability).toBeCloseTo(original.evidenceProbability!, 14);
    for (const atom of original.jointEvidenceMonitorDistribution!) {
      const mapped = relabeled.jointEvidenceMonitorDistribution!.find((entry) => entry.monitorStateId === rename.get(atom.monitorStateId))!;
      expect(mapped.jointProbability).toBeCloseTo(atom.jointProbability!, 14);
    }
  });

  it('is invariant to splitting a parallel transition because the monitor sees only hidden state pairs', () => {
    const unsplit: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.4 },
        { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const split: DefinitionModel = {
      ...unsplit,
      transitions: [
        { from: 'a', to: 'a', probability: 0.6 }, { from: 'a', to: 'b', probability: 0.1 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const monitorStates = ['q0', 'q1'];
    const make = (source: DefinitionModel): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest => ({
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 'b', monitorStateId: 'q1' }],
      monitorTransitionByStep: buildRows(source, 2, monitorStates, (q, _from, to) => to === 'b' ? 'q1' : q),
      evidenceLikelihoods: Array.from({ length: 3 }, () => [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.5 }])
    });
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(unsplit, make(unsplit));
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(split, make(split));
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability!, 14);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });

  it('updates the monitor on every implicit terminal self-retention step and ignores unreachable monitor states', () => {
    const terminalModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [{ from: 'a', to: 't', probability: 1 }]
    };
    const monitorStates = ['q0', 'q1', 'q2', 'unreachable'];
    const request: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 't', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 't', monitorStateId: 'q0' }],
      monitorTransitionByStep: buildRows(terminalModel, 2, monitorStates, (q, from, to) => {
        if (q === 'unreachable') return 'unreachable';
        if (from === 'a' && to === 't') return 'q1';
        if (from === 't' && to === 't' && q === 'q1') return 'q2';
        return q;
      }),
      evidenceLikelihoods: Array.from({ length: 3 }, () => [{ stateId: 'a', likelihood: 1 }, { stateId: 't', likelihood: 1 }])
    };
    const result = analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(terminalModel, request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.finalEvidenceConditionedMonitorDistribution?.find((entry) => entry.monitorStateId === 'q2')?.probability).toBeCloseTo(1, 14);
    expect(result.finalEvidenceConditionedMonitorDistribution?.some((entry) => entry.monitorStateId === 'unreachable')).toBe(false);
  });
});
