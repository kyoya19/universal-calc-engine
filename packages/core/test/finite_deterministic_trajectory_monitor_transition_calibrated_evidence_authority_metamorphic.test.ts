import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest,
  TransitionCalibratedEvidenceLikelihoodEntry,
  analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_transition_calibrated_evidence';

function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const pairs = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) {
      pairs.add(`${state.id}\u0000${state.id}`);
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from === state.id && Number(transition.probability) > 0) {
        pairs.add(`${transition.from}\u0000${transition.to}`);
      }
    }
  }
  return [...pairs].sort().map((key) => key.split('\u0000') as [StateId, StateId]);
}

function allPairs(
  stateIds: StateId[],
  rule: (fromStateId: StateId, toStateId: StateId) => number
): TransitionCalibratedEvidenceLikelihoodEntry[] {
  return stateIds.flatMap((fromStateId) => stateIds.map((toStateId) => ({
    fromStateId,
    toStateId,
    likelihood: rule(fromStateId, toStateId)
  })));
}

function monitorRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, fromStateId: StateId, toStateId: StateId, step: number) => string
) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, (_, index) => monitorStates.flatMap((q) =>
    pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId: q,
      fromStateId,
      toStateId,
      nextMonitorStateId: rule(q, fromStateId, toStateId, index + 1)
    }))
  ));
}

function model3(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.2 },
      { from: 'a', to: 'b', probability: 0.4 },
      { from: 'a', to: 'c', probability: 0.4 },
      { from: 'b', to: 'a', probability: 0.5 },
      { from: 'b', to: 'c', probability: 0.5 },
      { from: 'c', to: 'a', probability: 0.5 },
      { from: 'c', to: 'b', probability: 0.5 }
    ]
  };
}

function request3(model: DefinitionModel): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest {
  const stateIds = ['a', 'b', 'c'];
  const monitorStates = ['none', 'b_first', 'c_first'];
  const horizon = 3;
  return {
    initialDistribution: [
      { stateId: 'a', probability: 1 },
      { stateId: 'b', probability: 0 },
      { stateId: 'c', probability: 0 }
    ],
    horizon,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'none' },
      { stateId: 'b', monitorStateId: 'b_first' },
      { stateId: 'c', monitorStateId: 'c_first' }
    ],
    monitorTransitionByStep: monitorRows(model, horizon, monitorStates, (q, _from, to) => {
      if (q !== 'none') return q;
      if (to === 'b') return 'b_first';
      if (to === 'c') return 'c_first';
      return q;
    }),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.6 },
      { stateId: 'c', likelihood: 0.4 }
    ],
    transitionEvidenceLikelihoodsByStep: Array.from({ length: horizon }, (_, step) =>
      allPairs(stateIds, (from, to) => {
        const table = [
          [0.9, 0.6, 0.3],
          [0.5, 0.8, 0.4],
          [0.7, 0.2, 0.95]
        ];
        const fi = stateIds.indexOf(from);
        const ti = stateIds.indexOf(to);
        return Math.max(0.05, table[(fi + step) % 3]![ti]! - step * 0.03);
      })
    )
  };
}

function joint(
  result: ReturnType<typeof analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence>,
  q: string
): number {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result.jointEvidenceMonitorDistribution?.find((entry) => entry.monitorStateId === q)?.jointProbability ?? 0;
}

describe('Candidate AD authority metamorphic qualification', () => {
  it('preserves absolute transition-evidence scale while normalized posteriors remain invariant', () => {
    const model = model3();
    const request = request3(model);
    const scaled: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...request,
      transitionEvidenceLikelihoodsByStep: request.transitionEvidenceLikelihoodsByStep.map((row, step) =>
        step === 1
          ? row.map((entry) => ({ ...entry, likelihood: entry.likelihood * 0.5 }))
          : row.map((entry) => ({ ...entry }))
      )
    };
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, request);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, scaled);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability! * 0.5, 14);
    for (const atom of a.finalEvidenceConditionedMonitorDistribution!) {
      const actual = b.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === atom.monitorStateId)!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 12);
    }

    const ca = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...request, targetMonitorStates: ['b_first'] }
    );
    const cb = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...scaled, targetMonitorStates: ['b_first'] }
    );
    expect(ca.ok && cb.ok).toBe(true);
    if (!ca.ok || !cb.ok) throw new Error('conditioning failed');
    expect(cb.jointEventProbability).toBeCloseTo(ca.jointEventProbability! * 0.5, 14);
    expect(cb.targetConditionalProbabilityGivenEvidence).toBeCloseTo(ca.targetConditionalProbabilityGivenEvidence!, 12);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const atom of ca.smoothingSteps![step]!.jointHiddenMonitorDistribution) {
        const actual = cb.smoothingSteps![step]!.jointHiddenMonitorDistribution.find((entry) =>
          entry.stateId === atom.stateId && entry.monitorStateId === atom.monitorStateId
        )!;
        expect(actual.probability).toBeCloseTo(atom.probability, 11);
      }
    }
  });

  it('is additive over disjoint target monitor-state sets and all-target conditioning is evidence-neutral', () => {
    const model = model3();
    const request = request3(model);
    const bOnly = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...request, targetMonitorStates: ['b_first'] }
    );
    const cOnly = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...request, targetMonitorStates: ['c_first'] }
    );
    const union = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...request, targetMonitorStates: ['b_first', 'c_first'] }
    );
    const all = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model,
      { ...request, targetMonitorStates: request.monitorStates }
    );
    expect(bOnly.ok && cOnly.ok && union.ok && all.ok).toBe(true);
    if (!bOnly.ok || !cOnly.ok || !union.ok || !all.ok) throw new Error('conditioning failed');
    expect(union.jointEventProbability).toBeCloseTo(bOnly.jointEventProbability! + cOnly.jointEventProbability!, 14);
    expect(all.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect(all.jointEventProbability).toBeCloseTo(all.evidenceProbability!, 14);
  });

  it('is invariant to monitor relabeling and request/pair entry ordering', () => {
    const model = model3();
    const request = request3(model);
    const rename = new Map([['none', 'z0'], ['b_first', 'z1'], ['c_first', 'z2']]);
    const renamed: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      monitorStates: [...request.monitorStates].reverse().map((q) => rename.get(q)!),
      initialMonitorStateByHiddenState: [...request.initialMonitorStateByHiddenState].reverse().map((entry) => ({
        ...entry,
        monitorStateId: rename.get(entry.monitorStateId)!
      })),
      monitorTransitionByStep: request.monitorTransitionByStep.map((row) => [...row].reverse().map((entry) => ({
        ...entry,
        monitorStateId: rename.get(entry.monitorStateId)!,
        nextMonitorStateId: rename.get(entry.nextMonitorStateId)!
      }))),
      initialEvidenceLikelihoods: [...request.initialEvidenceLikelihoods].reverse(),
      transitionEvidenceLikelihoodsByStep: request.transitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    const original = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, request);
    const relabeled = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, renamed);
    expect(original.ok && relabeled.ok).toBe(true);
    if (!original.ok || !relabeled.ok) throw new Error('analysis failed');
    expect(relabeled.evidenceProbability).toBeCloseTo(original.evidenceProbability!, 14);
    for (const atom of original.jointEvidenceMonitorDistribution!) {
      const actual = relabeled.jointEvidenceMonitorDistribution!.find((entry) =>
        entry.monitorStateId === rename.get(atom.monitorStateId)
      )!;
      expect(actual.jointProbability).toBeCloseTo(atom.jointProbability!, 14);
    }
  });

  it('is invariant to parallel-transition split/merge because evidence observes only hidden pairs', () => {
    const unsplit: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.6 },
        { from: 'a', to: 'b', probability: 0.4 },
        { from: 'b', to: 'a', probability: 0.3 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const split: DefinitionModel = {
      ...unsplit,
      transitions: [
        { from: 'a', to: 'a', probability: 0.6 },
        { from: 'a', to: 'b', probability: 0.1 },
        { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.3 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const stateIds = ['a', 'b'];
    const monitorStates = ['q0', 'q1'];
    const make = (source: DefinitionModel): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest => ({
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 'b', monitorStateId: 'q1' }],
      monitorTransitionByStep: monitorRows(source, 2, monitorStates, (q, _from, to) => to === 'b' ? 'q1' : q),
      initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 0.8 })),
      transitionEvidenceLikelihoodsByStep: Array.from({ length: 2 }, () => allPairs(stateIds, (from, to) =>
        from === 'a' && to === 'b' ? 0.25 : 0.7
      ))
    });
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(unsplit, make(unsplit));
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(split, make(split));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability!, 14);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });

  it('applies pair evidence and monitor update on implicit terminal self-retention', () => {
    const terminalModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [{ from: 'a', to: 't', probability: 1 }]
    };
    const stateIds = ['a', 't'];
    const monitorStates = ['q0', 'q1', 'q2', 'unreachable'];
    const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 't', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 't', monitorStateId: 'q0' }],
      monitorTransitionByStep: monitorRows(terminalModel, 2, monitorStates, (q, from, to) => {
        if (q === 'unreachable') return q;
        if (from === 'a' && to === 't') return 'q1';
        if (from === 't' && to === 't' && q === 'q1') return 'q2';
        return q;
      }),
      initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
      transitionEvidenceLikelihoodsByStep: [
        allPairs(stateIds, (from, to) => from === 'a' && to === 't' ? 0.8 : 1),
        allPairs(stateIds, (from, to) => from === 't' && to === 't' ? 0.25 : 1)
      ]
    };
    const result = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(terminalModel, request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.evidenceProbability).toBeCloseTo(0.2, 14);
    expect(result.finalEvidenceConditionedMonitorDistribution?.find((entry) => entry.monitorStateId === 'q2')?.probability).toBeCloseTo(1, 14);
    expect(result.finalEvidenceConditionedMonitorDistribution?.some((entry) => entry.monitorStateId === 'unreachable')).toBe(false);
  });

  it('treats zero-model-mass ordered-pair likelihoods as semantically inert', () => {
    const sparse: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const states = ['a', 'b'];
    const monitorStates = ['q'];
    const base: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: states.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: monitorRows(sparse, 2, monitorStates, () => 'q'),
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      transitionEvidenceLikelihoodsByStep: Array.from({ length: 2 }, () => allPairs(states, () => 0.5))
    };
    const changed: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...base,
      transitionEvidenceLikelihoodsByStep: base.transitionEvidenceLikelihoodsByStep.map((row) => row.map((entry) => ({
        ...entry,
        likelihood: entry.fromStateId === 'a' && entry.toStateId === 'a' ? 0.999 : entry.likelihood
      })))
    };
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(sparse, base);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(sparse, changed);
    expect(a.ok && b.ok).toBe(true);
    expect(b).toEqual(a);
  });
});