import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.55 },
    { from: 'a', to: 'b', probability: 0.45 },
    { from: 'b', to: 'a', probability: 0.35 },
    { from: 'b', to: 'b', probability: 0.65 }
  ]
};
const states = ['a', 'b'] as StateId[];
const pairs = [['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']] as const;

function request(): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  const monitorStates = ['cold', 'hot'];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }],
    horizon: 2,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'cold' },
      { stateId: 'b', monitorStateId: 'hot' }
    ],
    monitorTransitionByStep: Array.from({ length: 2 }, () =>
      monitorStates.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        nextMonitorStateId: q === 'hot' || toStateId === 'b' ? 'hot' : 'cold'
      })))
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.5 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: 2 }, (_, step) =>
      monitorStates.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        likelihood: step === 0
          ? q === 'cold' ? (toStateId === 'b' ? 0.9 : 0.4) : (toStateId === 'a' ? 0.3 : 0.75)
          : q === 'cold' ? (fromStateId === 'a' ? 0.7 : 0.2) : (fromStateId === 'a' ? 0.35 : 0.85)
      })))
    )
  };
}

function analysis(req = request()) {
  const result = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, req);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function conditioned(req: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest, target: string[]) {
  const result = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
    model,
    { ...req, targetMonitorStates: target }
  );
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

describe('Candidate AE authority metamorphics A', () => {
  it('preserves absolute full-layer evidence scale while normalized posteriors stay fixed', () => {
    const base = request();
    const scaled = structuredClone(base);
    scaled.monitorCoupledTransitionEvidenceLikelihoodsByStep[1] =
      scaled.monitorCoupledTransitionEvidenceLikelihoodsByStep[1]!.map((entry) => ({
        ...entry,
        likelihood: entry.likelihood * 0.5
      }));
    const a = analysis(base);
    const b = analysis(scaled);
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability! * 0.5, 14);
    for (const atom of a.finalEvidenceConditionedMonitorDistribution!) {
      const actual = b.finalEvidenceConditionedMonitorDistribution!.find(
        (entry) => entry.monitorStateId === atom.monitorStateId
      )!;
      expect(actual.probability).toBeCloseTo(atom.probability!, 14);
    }
    const ca = conditioned(base, ['hot']);
    const cb = conditioned(scaled, ['hot']);
    expect(cb.jointEventProbability).toBeCloseTo(ca.jointEventProbability! * 0.5, 14);
    expect(cb.targetConditionalProbabilityGivenEvidence).toBeCloseTo(
      ca.targetConditionalProbabilityGivenEvidence!, 14
    );
  });

  it('makes all-target conditioning evidence-neutral and disjoint targets additive', () => {
    const req = request();
    const a = analysis(req);
    const all = conditioned(req, req.monitorStates);
    const cold = conditioned(req, ['cold']);
    const hot = conditioned(req, ['hot']);
    expect(all.jointEventProbability).toBeCloseTo(a.evidenceProbability!, 14);
    expect(all.targetConditionalProbabilityGivenEvidence).toBeCloseTo(1, 14);
    expect((cold.jointEventProbability ?? 0) + (hot.jointEventProbability ?? 0)).toBeCloseTo(
      a.evidenceProbability!, 14
    );
  });

  it('is invariant to request-entry ordering and semantic hidden/monitor relabeling', () => {
    const base = request();
    const reversed: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      ...base,
      initialDistribution: [...base.initialDistribution].reverse(),
      monitorStates: [...base.monitorStates].reverse(),
      initialMonitorStateByHiddenState: [...base.initialMonitorStateByHiddenState].reverse(),
      monitorTransitionByStep: base.monitorTransitionByStep.map((row) => [...row].reverse()),
      initialEvidenceLikelihoods: [...base.initialEvidenceLikelihoods].reverse(),
      monitorCoupledTransitionEvidenceLikelihoodsByStep:
        base.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => [...row].reverse())
    };
    expect(analysis(reversed)).toEqual(analysis(base));

    const hidden: Record<string, string> = { a: 'x', b: 'y' };
    const monitor: Record<string, string> = { cold: 'q0', hot: 'q1' };
    const relabeledModel: DefinitionModel = {
      startState: hidden[model.startState]!,
      states: model.states.map((state) => ({ ...state, id: hidden[state.id]! })),
      transitions: model.transitions.map((edge) => ({
        ...edge,
        from: hidden[edge.from]!,
        to: hidden[edge.to]!
      }))
    };
    const relabeled: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: base.initialDistribution.map((entry) => ({ stateId: hidden[entry.stateId]!, probability: entry.probability })),
      horizon: base.horizon,
      monitorStates: base.monitorStates.map((q) => monitor[q]!),
      initialMonitorStateByHiddenState: base.initialMonitorStateByHiddenState.map((entry) => ({
        stateId: hidden[entry.stateId]!, monitorStateId: monitor[entry.monitorStateId]!
      })),
      monitorTransitionByStep: base.monitorTransitionByStep.map((row) => row.map((entry) => ({
        monitorStateId: monitor[entry.monitorStateId]!,
        fromStateId: hidden[entry.fromStateId]!,
        toStateId: hidden[entry.toStateId]!,
        nextMonitorStateId: monitor[entry.nextMonitorStateId]!
      }))),
      initialEvidenceLikelihoods: base.initialEvidenceLikelihoods.map((entry) => ({ stateId: hidden[entry.stateId]!, likelihood: entry.likelihood })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep:
        base.monitorCoupledTransitionEvidenceLikelihoodsByStep.map((row) => row.map((entry) => ({
          monitorStateId: monitor[entry.monitorStateId]!,
          fromStateId: hidden[entry.fromStateId]!,
          toStateId: hidden[entry.toStateId]!,
          likelihood: entry.likelihood
        })))
    };
    const original = analysis(base);
    const relabeledResult = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      relabeledModel,
      relabeled
    );
    expect(relabeledResult.ok).toBe(true);
    if (!relabeledResult.ok) throw new Error(relabeledResult.failure.message);
    expect(relabeledResult.evidenceProbability).toBeCloseTo(original.evidenceProbability!, 14);
    expect(relabeledResult.logEvidenceProbability).toBeCloseTo(original.logEvidenceProbability!, 14);
  });
});
