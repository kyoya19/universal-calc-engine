import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence,
  conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue
} from '../src/finite_additive_trajectory_functional_calibrated_evidence';

type Dense = Map<StateId, Map<number, number>>;

const model: DefinitionModel = {
  startState: 'x', states: [{ id: 'x' }, { id: 'y' }],
  transitions: [
    { from: 'x', to: 'x', probability: 0.6 }, { from: 'x', to: 'y', probability: 0.4 },
    { from: 'y', to: 'x', probability: 0.2 }, { from: 'y', to: 'y', probability: 0.8 }
  ]
};

const request: FiniteAdditiveTrajectoryFunctionalCalibratedEvidenceRequest = {
  initialDistribution: [{ stateId: 'x', probability: 0.65 }, { stateId: 'y', probability: 0.35 }],
  horizon: 2,
  initialValueByState: [{ stateId: 'x', valueTicks: -1 }, { stateId: 'y', valueTicks: 2 }],
  transitionValueByStep: [
    [
      { fromStateId: 'x', toStateId: 'x', valueTicks: 0 }, { fromStateId: 'x', toStateId: 'y', valueTicks: 2 },
      { fromStateId: 'y', toStateId: 'x', valueTicks: -2 }, { fromStateId: 'y', toStateId: 'y', valueTicks: 1 }
    ],
    [
      { fromStateId: 'x', toStateId: 'x', valueTicks: 1 }, { fromStateId: 'x', toStateId: 'y', valueTicks: 3 },
      { fromStateId: 'y', toStateId: 'x', valueTicks: -1 }, { fromStateId: 'y', toStateId: 'y', valueTicks: 0 }
    ]
  ],
  evidenceLikelihoods: [
    [{ stateId: 'x', likelihood: 0.9 }, { stateId: 'y', likelihood: 0.4 }],
    [{ stateId: 'x', likelihood: 0.5 }, { stateId: 'y', likelihood: 0.8 }],
    [{ stateId: 'x', likelihood: 0.7 }, { stateId: 'y', likelihood: 0.3 }]
  ]
};

const states: StateId[] = ['x', 'y'];
function evidence(step: number, stateId: StateId): number {
  return request.evidenceLikelihoods[step]!.find((entry) => entry.stateId === stateId)!.likelihood;
}
function increment(step: number, from: StateId, to: StateId): number {
  return request.transitionValueByStep[step - 1]!.find((entry) => entry.fromStateId === from && entry.toStateId === to)!.valueTicks;
}
function transition(from: StateId, to: StateId): number {
  return model.transitions.filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + Number(entry.probability), 0);
}
function add(target: Map<number, number>, value: number, mass: number): void {
  target.set(value, (target.get(value) ?? 0) + mass);
}

function denseForward(): Dense[] {
  const result: Dense[] = [];
  const initial: Dense = new Map(states.map((stateId) => [stateId, new Map<number, number>()]));
  for (const entry of request.initialDistribution) {
    const value = request.initialValueByState.find((candidate) => candidate.stateId === entry.stateId)!.valueTicks;
    initial.get(entry.stateId)!.set(value, entry.probability * evidence(0, entry.stateId));
  }
  result.push(initial);
  for (let step = 1; step <= request.horizon; step += 1) {
    const next: Dense = new Map(states.map((stateId) => [stateId, new Map<number, number>()]));
    for (const from of states) for (const [value, mass] of result[step - 1]!.get(from)!) {
      for (const to of states) {
        const p = transition(from, to);
        if (p === 0) continue;
        add(next.get(to)!, value + increment(step, from, to), mass * p * evidence(step, to));
      }
    }
    result.push(next);
  }
  return result;
}

function denseBackward(forward: Dense[], target: number): Dense[] {
  const beta: Dense[] = Array.from({ length: request.horizon + 1 }, () => new Map(states.map((stateId) => [stateId, new Map<number, number>()])));
  for (const stateId of states) for (const value of forward[request.horizon]!.get(stateId)!.keys()) {
    if (value === target) beta[request.horizon]!.get(stateId)!.set(value, 1);
  }
  for (let step = request.horizon - 1; step >= 0; step -= 1) {
    for (const from of states) for (const value of forward[step]!.get(from)!.keys()) {
      let total = 0;
      for (const to of states) {
        const p = transition(from, to);
        if (p === 0) continue;
        const next = value + increment(step + 1, from, to);
        total += p * evidence(step + 1, to) * (beta[step + 1]!.get(to)!.get(next) ?? 0);
      }
      if (total > 0) beta[step]!.get(from)!.set(value, total);
    }
  }
  return beta;
}

describe('Candidate AB independent dense augmented-state oracle', () => {
  it('matches raw dense forward convolution for evidence and joint aggregate masses', () => {
    const forward = denseForward();
    const final = forward[request.horizon]!;
    let evidenceMass = 0;
    const byValue = new Map<number, number>();
    for (const stateId of states) for (const [value, mass] of final.get(stateId)!) {
      evidenceMass += mass;
      add(byValue, value, mass);
    }
    const actual = analyzeFiniteAdditiveTrajectoryFunctionalUnderCalibratedEvidence(model, request);
    expect(actual.ok).toBe(true);
    if (!actual.ok) throw new Error(actual.failure.message);
    expect(actual.evidenceProbability).toBeCloseTo(evidenceMass, 14);
    for (const [valueTicks, mass] of byValue) {
      const atom = actual.jointEvidenceAggregateDistribution!.find((entry) => entry.valueTicks === valueTicks)!;
      expect(atom.jointProbability).toBeCloseTo(mass, 14);
      expect(atom.conditionalProbability).toBeCloseTo(mass / evidenceMass, 14);
    }
  });

  it('matches independent dense target-value backward convolution for combined smoothing', () => {
    const forward = denseForward();
    const final = forward[request.horizon]!;
    const target = [...new Set(states.flatMap((stateId) => [...final.get(stateId)!.keys()]))].sort((a, b) => a - b)[2]!;
    const beta = denseBackward(forward, target);
    let jointMass = 0;
    for (const stateId of states) jointMass += final.get(stateId)!.get(target) ?? 0;
    const actual = conditionFiniteAdditiveTrajectoryFunctionalOnCalibratedEvidenceAndExactValue(model, { ...request, targetValueTicks: target });
    expect(actual.ok).toBe(true);
    if (!actual.ok) throw new Error(actual.failure.message);
    expect(actual.possible).toBe(true);
    expect(actual.jointEventProbability).toBeCloseTo(jointMass, 14);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const stateId of states) {
        let numerator = 0;
        for (const [value, alpha] of forward[step]!.get(stateId)!) numerator += alpha * (beta[step]!.get(stateId)!.get(value) ?? 0);
        const expected = numerator / jointMass;
        const observed = actual.smoothingSteps![step]!.smoothedDistribution.find((entry) => entry.stateId === stateId)!.probability;
        expect(observed).toBeCloseTo(expected, 13);
      }
    }
  });
});
