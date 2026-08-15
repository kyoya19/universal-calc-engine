import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import { propagateFiniteHorizonStateDistribution } from '../src/state_distribution';
import {
  AdditiveTransitionValueEntry,
  FiniteAdditiveTrajectoryFunctionalRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution,
  conditionFiniteAdditiveTrajectoryFunctionalOnExactValue
} from '../src/finite_additive_trajectory_functional';

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.55 },
      { from: 'a', to: 'b', probability: 0.45 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function request(horizon = 3): FiniteAdditiveTrajectoryFunctionalRequest {
  const row = (): AdditiveTransitionValueEntry[] => [
    { fromStateId: 'a', toStateId: 'a', valueTicks: -1 },
    { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: 0 },
    { fromStateId: 'b', toStateId: 'b', valueTicks: 3 }
  ];
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.7 },
      { stateId: 'b', probability: 0.3 }
    ],
    horizon,
    initialValueByState: [
      { stateId: 'a', valueTicks: 1 },
      { stateId: 'b', valueTicks: -2 }
    ],
    transitionValueByStep: Array.from({ length: horizon }, row)
  };
}

function pmf(modelValue: DefinitionModel, requestValue: FiniteAdditiveTrajectoryFunctionalRequest): Map<number, number> {
  const result = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(modelValue, requestValue);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return new Map(result.finalAggregateDistribution.map((atom) => [atom.valueTicks, atom.probability ?? 0]));
}

function expected(pmfValue: Map<number, number>): number {
  let value = 0;
  for (const [ticks, probability] of pmfValue) value += ticks * probability;
  return value;
}

function expectPmfClose(left: Map<number, number>, right: Map<number, number>): void {
  expect([...left.keys()].sort((a, b) => a - b)).toEqual([...right.keys()].sort((a, b) => a - b));
  for (const [ticks, probability] of left) expect(right.get(ticks)).toBeCloseTo(probability, 13);
}

function stateProbability(
  distribution: Array<{ stateId: StateId; probability: number }>,
  stateId: StateId
): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

describe('Candidate AA authority metamorphic qualification', () => {
  it('preserves probability under integer translation and nonzero safe-integer scaling', () => {
    const m = model();
    const req = request();
    const original = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(m, req);
    expect(original.ok).toBe(true);
    if (!original.ok) throw new Error(original.failure.message);

    const translated: FiniteAdditiveTrajectoryFunctionalRequest = {
      ...req,
      initialValueByState: req.initialValueByState.map((entry) => ({ ...entry, valueTicks: entry.valueTicks + 11 }))
    };
    const translatedPmf = pmf(m, translated);
    for (const atom of original.finalAggregateDistribution) {
      expect(translatedPmf.get(atom.valueTicks + 11)).toBeCloseTo(atom.probability ?? 0, 13);
    }

    const scale = -3;
    const scaled: FiniteAdditiveTrajectoryFunctionalRequest = {
      ...req,
      initialValueByState: req.initialValueByState.map((entry) => ({ ...entry, valueTicks: entry.valueTicks * scale })),
      transitionValueByStep: req.transitionValueByStep.map((row) =>
        row.map((entry) => ({ ...entry, valueTicks: entry.valueTicks * scale }))
      )
    };
    const scaledPmf = pmf(m, scaled);
    for (const atom of original.finalAggregateDistribution) {
      expect(scaledPmf.get(atom.valueTicks * scale)).toBeCloseTo(atom.probability ?? 0, 13);
    }

    const target = original.finalAggregateDistribution[1]!.valueTicks;
    const baseCondition = conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(m, { ...req, targetValueTicks: target });
    const translatedCondition = conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(m, {
      ...translated,
      targetValueTicks: target + 11
    });
    expect(baseCondition.ok && translatedCondition.ok).toBe(true);
    if (!baseCondition.ok || !translatedCondition.ok) throw new Error('conditioning failed');
    for (let step = 0; step <= req.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateProbability(translatedCondition.smoothingSteps![step]!.smoothedDistribution, stateId))
          .toBeCloseTo(stateProbability(baseCondition.smoothingSteps![step]!.smoothedDistribution, stateId), 13);
      }
    }
  });

  it('is invariant to model transition order, input entry order and functional row order', () => {
    const m = model();
    const req = request();
    const reorderedModel: DefinitionModel = {
      startState: m.startState,
      states: [...m.states].reverse(),
      transitions: [...m.transitions].reverse()
    };
    const reordered: FiniteAdditiveTrajectoryFunctionalRequest = {
      ...req,
      initialDistribution: [...req.initialDistribution].reverse(),
      initialValueByState: [...req.initialValueByState].reverse(),
      transitionValueByStep: req.transitionValueByStep.map((row) => [...row].reverse())
    };
    expectPmfClose(pmf(m, req), pmf(reorderedModel, reordered));
  });

  it('is invariant under a hidden-state label permutation after mapping state IDs back', () => {
    const m: DefinitionModel = {
      startState: 'x',
      states: [{ id: 'x' }, { id: 'y' }],
      transitions: [
        { from: 'x', to: 'x', probability: 0.55 },
        { from: 'x', to: 'y', probability: 0.45 },
        { from: 'y', to: 'x', probability: 0.3 },
        { from: 'y', to: 'y', probability: 0.7 }
      ]
    };
    const base = request();
    const renamed: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: base.initialDistribution.map((entry) => ({
        stateId: entry.stateId === 'a' ? 'x' : 'y', probability: entry.probability
      })),
      horizon: base.horizon,
      initialValueByState: base.initialValueByState.map((entry) => ({
        stateId: entry.stateId === 'a' ? 'x' : 'y', valueTicks: entry.valueTicks
      })),
      transitionValueByStep: base.transitionValueByStep.map((row) => row.map((entry) => ({
        fromStateId: entry.fromStateId === 'a' ? 'x' : 'y',
        toStateId: entry.toStateId === 'a' ? 'x' : 'y',
        valueTicks: entry.valueTicks
      })))
    };
    expectPmfClose(pmf(model(), base), pmf(m, renamed));
  });

  it('is invariant when parallel concrete transitions sharing one state pair are split or merged', () => {
    const split: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'a', to: 'b', probability: 0.3 }
      ]
    };
    const merged: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.5 }
      ]
    };
    const req: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon: 3,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 'b', valueTicks: 0 }
      ],
      transitionValueByStep: Array.from({ length: 3 }, () => [
        { fromStateId: 'a', toStateId: 'a', valueTicks: 1 },
        { fromStateId: 'a', toStateId: 'b', valueTicks: 5 },
        { fromStateId: 'b', toStateId: 'b', valueTicks: 2 }
      ])
    };
    expectPmfClose(pmf(split, req), pmf(merged, req));
  });

  it('makes a state-pair indicator PMF expectation equal unconditional finite-horizon pair occupancy', () => {
    const m = model();
    const req = request(4);
    req.initialValueByState = req.initialValueByState.map((entry) => ({ ...entry, valueTicks: 0 }));
    req.transitionValueByStep = req.transitionValueByStep.map((row) => row.map((entry) => ({
      ...entry,
      valueTicks: entry.fromStateId === 'a' && entry.toStateId === 'b' ? 1 : 0
    })));
    const candidateA = propagateFiniteHorizonStateDistribution(m, {
      initialDistribution: req.initialDistribution,
      horizon: req.horizon
    });
    expect(candidateA.ok).toBe(true);
    if (!candidateA.ok) throw new Error(candidateA.failure.message);
    let expectedCount = 0;
    for (let step = 0; step < req.horizon; step += 1) {
      const aMass = candidateA.trajectory[step]!.distribution.find((entry) => entry.stateId === 'a')!.probability;
      expectedCount += aMass * 0.45;
    }
    expect(expected(pmf(m, req))).toBeCloseTo(expectedCount, 13);
  });

  it('collapses a deterministic constant functional to one point mass', () => {
    const m = model();
    const req = request(5);
    req.initialValueByState = req.initialValueByState.map((entry) => ({ ...entry, valueTicks: 7 }));
    req.transitionValueByStep = req.transitionValueByStep.map((row) =>
      row.map((entry) => ({ ...entry, valueTicks: 0 }))
    );
    const result = pmf(m, req);
    expect([...result.keys()]).toEqual([7]);
    expect(result.get(7)).toBeCloseTo(1, 14);
  });
});
