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
    for (const edge of model.transitions) {
      if (edge.from === state.id && Number(edge.probability) > 0) pairs.add(`${edge.from}\u0000${edge.to}`);
    }
  }
  return [...pairs].sort().map((key) => key.split('\u0000') as [StateId, StateId]);
}

function allPairs(
  states: StateId[],
  rule: (from: StateId, to: StateId) => number
): TransitionCalibratedEvidenceLikelihoodEntry[] {
  return states.flatMap((fromStateId) => states.map((toStateId) => ({
    fromStateId,
    toStateId,
    likelihood: rule(fromStateId, toStateId)
  })));
}

function monitorRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId, step: number) => string
) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, (_, index) => monitorStates.flatMap((monitorStateId) =>
    pairs.map(([fromStateId, toStateId]) => ({
      monitorStateId,
      fromStateId,
      toStateId,
      nextMonitorStateId: rule(monitorStateId, fromStateId, toStateId, index + 1)
    }))
  ));
}

function baseModel(): DefinitionModel {
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

function baseRequest(model: DefinitionModel): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest {
  const states = ['a', 'b', 'c'];
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
      allPairs(states, (from, to) => {
        const f = states.indexOf(from);
        const t = states.indexOf(to);
        return 0.2 + 0.1 * ((f * 2 + t + step) % 7);
      })
    )
  };
}

describe('Candidate AD authority metamorphic qualification', () => {
  it('preserves absolute pair-evidence scale while normalized posteriors stay invariant', () => {
    const model = baseModel();
    const request = baseRequest(model);
    const scaled: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...request,
      transitionEvidenceLikelihoodsByStep: request.transitionEvidenceLikelihoodsByStep.map((row, step) =>
        step === 1 ? row.map((entry) => ({ ...entry, likelihood: entry.likelihood * 0.5 })) : row
      )
    };
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, request);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, scaled);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability! * 0.5, 14);
    for (const atom of a.finalEvidenceConditionedMonitorDistribution!) {
      expect(b.finalEvidenceConditionedMonitorDistribution!.find((entry) => entry.monitorStateId === atom.monitorStateId)!.probability)
        .toBeCloseTo(atom.probability!, 12);
    }
    const ca = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...request, targetMonitorStates: ['b_first'] }
    );
    const cb = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...scaled, targetMonitorStates: ['b_first'] }
    );
    expect(ca.ok && cb.ok).toBe(true);
    if (!ca.ok || !cb.ok) throw new Error('conditioning failed');
    expect(cb.jointEventProbability).toBeCloseTo(ca.jointEventProbability! * 0.5, 14);
    expect(cb.targetConditionalProbabilityGivenEvidence).toBeCloseTo(ca.targetConditionalProbabilityGivenEvidence!, 12);
  });

  it('is additive over disjoint targets and all-target conditioning is evidence-neutral', () => {
    const model = baseModel();
    const request = baseRequest(model);
    const b = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...request, targetMonitorStates: ['b_first'] }
    );
    const c = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...request, targetMonitorStates: ['c_first'] }
    );
    const union = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...request, targetMonitorStates: ['b_first', 'c_first'] }
    );
    const all = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      model, { ...request, targetMonitorStates: request.monitorStates }
    );
    expect(b.ok && c.ok && union.ok && all.ok).toBe(true);
    if (!b.ok || !c.ok || !union.ok || !all.ok) throw new Error('conditioning failed');
    expect(union.jointEventProbability).toBeCloseTo(b.jointEventProbability! + c.jointEventProbability!, 14);
    expect(all.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect(all.jointEventProbability).toBeCloseTo(all.evidenceProbability!, 14);
  });

  it('is invariant to monitor relabeling and request/pair ordering', () => {
    const model = baseModel();
    const request = baseRequest(model);
    const rename = new Map([['none', 'z0'], ['b_first', 'z1'], ['c_first', 'z2']]);
    const changed: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      ...request,
      initialDistribution: [...request.initialDistribution].reverse(),
      monitorStates: [...request.monitorStates].reverse().map((q) => rename.get(q)!),
      initialMonitorStateByHiddenState: [...request.initialMonitorStateByHiddenState].reverse().map((entry) => ({
        ...entry, monitorStateId: rename.get(entry.monitorStateId)!
      })),
      monitorTransitionByStep: request.monitorTransitionByStep.map((row) => [...row].reverse().map((entry) => ({
        ...entry,
        monitorStateId: rename.get(entry.monitorStateId)!,
        nextMonitorStateId: rename.get(entry.nextMonitorStateId)!
      }))),
      initialEvidenceLikelihoods: [...request.initialEvidenceLikelihoods].reverse(),
      transitionEvidenceLikelihoodsByStep: request.transitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, request);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, changed);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability!, 14);
    for (const atom of a.jointEvidenceMonitorDistribution!) {
      expect(b.jointEvidenceMonitorDistribution!.find((entry) => entry.monitorStateId === rename.get(atom.monitorStateId))!.jointProbability)
        .toBeCloseTo(atom.jointProbability!, 14);
    }
  });

  it('is invariant to parallel-transition split/merge', () => {
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
        { from: 'a', to: 'a', probability: 0.6 },
        { from: 'a', to: 'b', probability: 0.1 }, { from: 'a', to: 'b', probability: 0.3 },
        { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const states = ['a', 'b'];
    const make = (source: DefinitionModel): FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest => ({
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      horizon: 2,
      monitorStates: ['q0', 'q1'],
      initialMonitorStateByHiddenState: [{ stateId: 'a', monitorStateId: 'q0' }, { stateId: 'b', monitorStateId: 'q1' }],
      monitorTransitionByStep: monitorRows(source, 2, ['q0', 'q1'], (q, _from, to) => to === 'b' ? 'q1' : q),
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 0.8 })),
      transitionEvidenceLikelihoodsByStep: Array.from({ length: 2 }, () => allPairs(states, (from, to) => from === 'a' && to === 'b' ? 0.25 : 0.7))
    });
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(unsplit, make(unsplit));
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(split, make(split));
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability!, 14);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });

  it('applies pair evidence and monitor update on implicit terminal self-retention', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [{ from: 'a', to: 't', probability: 1 }]
    };
    const states = ['a', 't'];
    const monitorStates = ['q0', 'q1', 'q2', 'unreachable'];
    const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 't', probability: 0 }],
      horizon: 2,
      monitorStates,
      initialMonitorStateByHiddenState: states.map((stateId) => ({ stateId, monitorStateId: 'q0' })),
      monitorTransitionByStep: monitorRows(model, 2, monitorStates, (q, from, to) => {
        if (q === 'unreachable') return q;
        if (from === 'a' && to === 't') return 'q1';
        if (from === 't' && to === 't' && q === 'q1') return 'q2';
        return q;
      }),
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      transitionEvidenceLikelihoodsByStep: [
        allPairs(states, (from, to) => from === 'a' && to === 't' ? 0.8 : 1),
        allPairs(states, (from, to) => from === 't' && to === 't' ? 0.25 : 1)
      ]
    };
    const result = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(result.evidenceProbability).toBeCloseTo(0.2, 14);
    expect(result.finalEvidenceConditionedMonitorDistribution?.find((entry) => entry.monitorStateId === 'q2')?.probability).toBeCloseTo(1, 14);
    expect(result.finalEvidenceConditionedMonitorDistribution?.some((entry) => entry.monitorStateId === 'unreachable')).toBe(false);
  });

  it('treats zero-model-mass ordered-pair likelihoods as analytically inert', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }, { from: 'b', to: 'b', probability: 1 }]
    };
    const states = ['a', 'b'];
    const base: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      horizon: 2,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: states.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: monitorRows(model, 2, ['q'], () => 'q'),
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
    const a = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, base);
    const b = analyzeFiniteDeterministicTrajectoryMonitorUnderTransitionCalibratedEvidence(model, changed);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) throw new Error('analysis failed');
    expect(b.evidenceProbability).toBe(a.evidenceProbability);
    expect(b.logEvidenceProbability).toBe(a.logEvidenceProbability);
    expect(b.trajectory).toEqual(a.trajectory);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });
});