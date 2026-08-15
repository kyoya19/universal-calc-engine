import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  finiteAdditiveTrajectoryFunctionalCalibratedEvidenceResultToJson
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';

function model(): DefinitionModel {
  return {
    startState: 'a', states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.55 }, { from: 'a', to: 'b', probability: 0.45 },
      { from: 'b', to: 'a', probability: 0.3 }, { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function request(): FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest {
  const row = [
    { fromStateId: 'a', toStateId: 'a', valueTicks: -1 }, { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: 0 }, { fromStateId: 'b', toStateId: 'b', valueTicks: 3 }
  ];
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }], horizon: 2,
    initialValueByState: [{ stateId: 'a', valueTicks: 1 }, { stateId: 'b', valueTicks: -2 }],
    transitionValueByStep: [row.map((entry) => ({ ...entry })), row.map((entry) => ({ ...entry }))],
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.4 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.9 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }]
    ]
  };
}

function pmf(sourceModel: DefinitionModel, source: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest): Map<number, number> {
  const result = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(sourceModel, source);
  expect(result.ok).toBe(true);
  if (!result.ok || !result.possible) throw new Error('analysis failed');
  return new Map(result.finalEvidenceConditionedAggregateDistribution!.map((atom) => [atom.valueTicks, atom.probability ?? 0]));
}

function expectPmf(left: Map<number, number>, right: Map<number, number>): void {
  expect([...left.keys()].sort((a, b) => a - b)).toEqual([...right.keys()].sort((a, b) => a - b));
  for (const [value, probability] of left) expect(right.get(value)).toBeCloseTo(probability, 13);
}

describe('Candidate AB authority metamorphic qualification', () => {
  it('translates and scales exact aggregate support without changing evidence-conditioned probabilities', () => {
    const base = request();
    const original = pmf(model(), base);
    const shift = 5;
    const translated: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      ...base,
      initialValueByState: base.initialValueByState.map((entry) => ({ ...entry, valueTicks: entry.valueTicks + shift })),
      transitionValueByStep: base.transitionValueByStep.map((row) => row.map((entry) => ({ ...entry, valueTicks: entry.valueTicks + shift })))
    };
    const translatedPmf = pmf(model(), translated);
    const totalShift = shift * (base.horizon + 1);
    for (const [value, probability] of original) expect(translatedPmf.get(value + totalShift)).toBeCloseTo(probability, 13);

    const scale = -2;
    const scaled: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      ...base,
      initialValueByState: base.initialValueByState.map((entry) => ({ ...entry, valueTicks: entry.valueTicks * scale })),
      transitionValueByStep: base.transitionValueByStep.map((row) => row.map((entry) => ({ ...entry, valueTicks: entry.valueTicks * scale })))
    };
    const scaledPmf = pmf(model(), scaled);
    for (const [value, probability] of original) expect(scaledPmf.get(value * scale)).toBeCloseTo(probability, 13);
  });

  it('is invariant to state labels and all request/model entry ordering after mapping IDs', () => {
    const base = request();
    const renamedModel: DefinitionModel = {
      startState: 'x', states: [{ id: 'y' }, { id: 'x' }],
      transitions: [
        { from: 'y', to: 'y', probability: 0.7 }, { from: 'y', to: 'x', probability: 0.3 },
        { from: 'x', to: 'y', probability: 0.45 }, { from: 'x', to: 'x', probability: 0.55 }
      ]
    };
    const rename = (id: string): string => id === 'a' ? 'x' : 'y';
    const renamed: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
      initialDistribution: [...base.initialDistribution].reverse().map((entry) => ({ stateId: rename(entry.stateId), probability: entry.probability })),
      horizon: base.horizon,
      initialValueByState: [...base.initialValueByState].reverse().map((entry) => ({ stateId: rename(entry.stateId), valueTicks: entry.valueTicks })),
      transitionValueByStep: base.transitionValueByStep.map((row) => [...row].reverse().map((entry) => ({
        fromStateId: rename(entry.fromStateId), toStateId: rename(entry.toStateId), valueTicks: entry.valueTicks
      }))),
      evidenceLikelihoods: base.evidenceLikelihoods.map((row) => [...row].reverse().map((entry) => ({
        stateId: rename(entry.stateId), likelihood: entry.likelihood
      })))
    };
    expectPmf(pmf(model(), base), pmf(renamedModel, renamed));
  });

  it('hard-fails support guard exhaustion rather than approximating', () => {
    const result = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model(), request(), { maxSupportSize: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe('additive_calibrated_evidence_support_limit_exceeded');
    }
  });

  it('rejects forged non-finite analytical results during checked serialization', () => {
    const result = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model(), request());
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.failure.message);
    expect(() => finiteAdditiveTrajectoryFunctionalCalibratedEvidenceResultToJson({
      ...result,
      evidenceProbability: Number.NaN
    })).toThrow(/non-finite/);
  });
});
