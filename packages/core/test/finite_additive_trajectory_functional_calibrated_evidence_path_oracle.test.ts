import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';

const model: DefinitionModel = {
  startState: 'a', states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.5 }, { from: 'a', to: 'b', probability: 0.5 },
    { from: 'b', to: 'a', probability: 0.25 }, { from: 'b', to: 'b', probability: 0.75 }
  ]
};

const request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
  initialDistribution: [{ stateId: 'a', probability: 0.6 }, { stateId: 'b', probability: 0.4 }],
  horizon: 2,
  initialValueByState: [{ stateId: 'a', valueTicks: 1 }, { stateId: 'b', valueTicks: 2 }],
  transitionValueByStep: Array.from({ length: 2 }, () => [
    { fromStateId: 'a', toStateId: 'a', valueTicks: 0 }, { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: -1 }, { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
  ]),
  evidenceLikelihoods: [
    [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.4 }],
    [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.8 }],
    [{ stateId: 'a', likelihood: 0.9 }, { stateId: 'b', likelihood: 0.2 }]
  ]
};

function p(from: StateId, to: StateId): number {
  return Number(model.transitions.find((entry) => entry.from === from && entry.to === to)!.probability);
}
function l(step: number, stateId: StateId): number {
  return request.evidenceLikelihoods[step]!.find((entry) => entry.stateId === stateId)!.likelihood;
}
function r(step: number, from: StateId, to: StateId): number {
  return request.transitionValueByStep[step - 1]!.find((entry) => entry.fromStateId === from && entry.toStateId === to)!.valueTicks;
}
function r0(stateId: StateId): number {
  return request.initialValueByState.find((entry) => entry.stateId === stateId)!.valueTicks;
}

function enumeratePrefixes(step: number): Array<{ state: StateId; value: number; mass: number }> {
  let paths = request.initialDistribution.map((entry) => ({
    states: [entry.stateId], value: r0(entry.stateId), mass: entry.probability * l(0, entry.stateId)
  }));
  for (let t = 1; t <= step; t += 1) {
    const next: typeof paths = [];
    for (const path of paths) {
      const from = path.states[path.states.length - 1]!;
      for (const to of ['a', 'b'] as StateId[]) {
        next.push({
          states: [...path.states, to],
          value: path.value + r(t, from, to),
          mass: path.mass * p(from, to) * l(t, to)
        });
      }
    }
    paths = next;
  }
  return paths.map((path) => ({ state: path.states[step]!, value: path.value, mass: path.mass }));
}

function enumerateComplete(): Array<{ states: StateId[]; value: number; mass: number }> {
  let paths = request.initialDistribution.map((entry) => ({
    states: [entry.stateId], value: r0(entry.stateId), mass: entry.probability * l(0, entry.stateId)
  }));
  for (let step = 1; step <= request.horizon; step += 1) {
    const next: typeof paths = [];
    for (const path of paths) {
      const from = path.states[path.states.length - 1]!;
      for (const to of ['a', 'b'] as StateId[]) {
        next.push({
          states: [...path.states, to],
          value: path.value + r(step, from, to),
          mass: path.mass * p(from, to) * l(step, to)
        });
      }
    }
    paths = next;
  }
  return paths;
}

describe('Candidate AB independent path-oracle completeness', () => {
  it('matches independently enumerated prefix-only state/value distributions at every time', () => {
    const actual = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, request);
    expect(actual.ok).toBe(true);
    if (!actual.ok || !actual.possible) throw new Error('analysis failed');
    for (let step = 0; step <= request.horizon; step += 1) {
      const prefixes = enumeratePrefixes(step);
      const total = prefixes.reduce((sum, path) => sum + path.mass, 0);
      const oracle = new Map<string, number>();
      for (const path of prefixes) {
        const key = `${path.state}\u0000${path.value}`;
        oracle.set(key, (oracle.get(key) ?? 0) + path.mass / total);
      }
      for (const atom of actual.trajectory[step]!.jointStateValueDistribution) {
        expect(atom.probability).toBeCloseTo(oracle.get(`${atom.stateId}\u0000${atom.valueTicks}`) ?? 0, 13);
      }
    }
  });

  it('matches complete-path pairwise posteriors and posterior expected transition counts', () => {
    const paths = enumerateComplete();
    const targets = [...new Set(paths.map((path) => path.value))].sort((a, b) => a - b);
    const target = targets[Math.floor(targets.length / 2)]!;
    const selected = paths.filter((path) => path.value === target);
    const total = selected.reduce((sum, path) => sum + path.mass, 0);
    const actual = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, {
      ...request, targetValueTicks: target
    });
    expect(actual.ok).toBe(true);
    if (!actual.ok || !actual.possible) throw new Error('conditioning failed');
    const expectedCounts = new Map<string, number>();
    for (let step = 0; step < request.horizon; step += 1) {
      for (const from of ['a', 'b'] as StateId[]) for (const to of ['a', 'b'] as StateId[]) {
        const expected = selected
          .filter((path) => path.states[step] === from && path.states[step + 1] === to)
          .reduce((sum, path) => sum + path.mass, 0) / total;
        const observed = actual.pairwiseSteps![step]!.pairwiseDistribution
          .find((entry) => entry.fromStateId === from && entry.toStateId === to)?.probability ?? 0;
        expect(observed).toBeCloseTo(expected, 13);
        const key = `${from}\u0000${to}`;
        expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + expected);
      }
    }
    for (const entry of actual.expectedTransitionCounts!) {
      expect(entry.expectedCount).toBeCloseTo(
        expectedCounts.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0,
        13
      );
    }
  });

  it('makes the joint aggregate atoms sum exactly to complete evidence mass within tolerance', () => {
    const actual = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, request);
    expect(actual.ok).toBe(true);
    if (!actual.ok || !actual.possible) throw new Error('analysis failed');
    const sumJoint = actual.jointEvidenceAggregateDistribution!
      .reduce((sum, atom) => sum + (atom.jointProbability ?? Math.exp(atom.logJointProbability)), 0);
    expect(sumJoint).toBeCloseTo(actual.evidenceProbability!, 13);
  });
});
