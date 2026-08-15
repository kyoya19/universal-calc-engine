import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  AdditiveTransitionValueEntry,
  FiniteAdditiveTrajectoryFunctionalRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution,
  conditionFiniteAdditiveTrajectoryFunctionalOnExactValue
} from '../src/finite_additive_trajectory_functional';

type Edge = { from: StateId; to: StateId; probability: number };

type DenseOracle = {
  min: number;
  max: number;
  forward: number[][][];
  backward: number[][][];
  pmf: number[];
  eventProbability: number;
  gamma: number[][];
  pairwise: number[][][];
};

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.2 },
      { from: 'a', to: 'b', probability: 0.5 },
      { from: 'a', to: 'c', probability: 0.3 },
      { from: 'b', to: 'a', probability: 0.4 },
      { from: 'b', to: 'c', probability: 0.6 },
      { from: 'c', to: 'b', probability: 1 }
    ]
  };
}

function request(): FiniteAdditiveTrajectoryFunctionalRequest {
  const row = (): AdditiveTransitionValueEntry[] => [
    { fromStateId: 'a', toStateId: 'a', valueTicks: -1 },
    { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'a', toStateId: 'c', valueTicks: 4 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: -2 },
    { fromStateId: 'b', toStateId: 'c', valueTicks: 1 },
    { fromStateId: 'c', toStateId: 'b', valueTicks: 3 }
  ];
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.5 },
      { stateId: 'b', probability: 0.3 },
      { stateId: 'c', probability: 0.2 }
    ],
    horizon: 3,
    initialValueByState: [
      { stateId: 'a', valueTicks: -1 },
      { stateId: 'b', valueTicks: 0 },
      { stateId: 'c', valueTicks: 2 }
    ],
    transitionValueByStep: [row(), row(), row()]
  };
}

function stateIds(m: DefinitionModel): StateId[] {
  return m.states.map((state) => state.id).sort();
}

function edges(m: DefinitionModel, from: StateId): Edge[] {
  const state = m.states.find((entry) => entry.id === from)!;
  if (isTerminalState(state)) return [{ from, to: from, probability: 1 }];
  const aggregate = new Map<StateId, number>();
  for (const transition of m.transitions) {
    if (transition.from !== from) continue;
    const probability = evaluateProbabilitySpec(transition.probability);
    if (probability <= 0) continue;
    aggregate.set(transition.to, (aggregate.get(transition.to) ?? 0) + probability);
  }
  return [...aggregate.entries()].map(([to, probability]) => ({ from, to, probability }));
}

function increment(
  req: FiniteAdditiveTrajectoryFunctionalRequest,
  step: number,
  from: StateId,
  to: StateId
): number {
  return req.transitionValueByStep[step - 1]!.find(
    (entry) => entry.fromStateId === from && entry.toStateId === to
  )!.valueTicks;
}

function bounds(m: DefinitionModel, req: FiniteAdditiveTrajectoryFunctionalRequest): [number, number] {
  const ids = stateIds(m);
  let min = Math.min(...req.initialValueByState.map((entry) => entry.valueTicks));
  let max = Math.max(...req.initialValueByState.map((entry) => entry.valueTicks));
  let stepMin = 0;
  let stepMax = 0;
  for (let step = 1; step <= req.horizon; step += 1) {
    const values = ids.flatMap((from) => edges(m, from).map((edge) => increment(req, step, edge.from, edge.to)));
    stepMin += Math.min(...values);
    stepMax += Math.max(...values);
  }
  min += stepMin;
  max += stepMax;
  return [min, max];
}

function denseOracle(m: DefinitionModel, req: FiniteAdditiveTrajectoryFunctionalRequest, target: number): DenseOracle {
  const ids = stateIds(m);
  const index = new Map(ids.map((id, i) => [id, i]));
  const [min, max] = bounds(m, req);
  const width = max - min + 1;
  const offset = (value: number): number => value - min;
  const forward = Array.from({ length: req.horizon + 1 }, () =>
    Array.from({ length: ids.length }, () => Array<number>(width).fill(0))
  );
  for (const entry of req.initialDistribution) {
    const value = req.initialValueByState.find((item) => item.stateId === entry.stateId)!.valueTicks;
    const bucket = forward[0]![index.get(entry.stateId)!]!;
    const tickIndex = offset(value);
    bucket[tickIndex] = bucket[tickIndex]! + entry.probability;
  }
  for (let step = 1; step <= req.horizon; step += 1) {
    for (const from of ids) {
      const fromIndex = index.get(from)!;
      for (let tickIndex = 0; tickIndex < width; tickIndex += 1) {
        const mass = forward[step - 1]![fromIndex]![tickIndex]!;
        if (mass === 0) continue;
        const value = tickIndex + min;
        for (const edge of edges(m, from)) {
          const nextValue = value + increment(req, step, edge.from, edge.to);
          if (nextValue < min || nextValue > max) continue;
          const bucket = forward[step]![index.get(edge.to)!]!;
          const nextIndex = offset(nextValue);
          bucket[nextIndex] = bucket[nextIndex]! + mass * edge.probability;
        }
      }
    }
  }

  const pmf = Array<number>(width).fill(0);
  for (let tickIndex = 0; tickIndex < width; tickIndex += 1) {
    pmf[tickIndex] = ids.reduce((sum, id) => sum + forward[req.horizon]![index.get(id)!]![tickIndex]!, 0);
  }
  const eventProbability = target < min || target > max ? 0 : pmf[offset(target)]!;

  const backward = Array.from({ length: req.horizon + 1 }, () =>
    Array.from({ length: ids.length }, () => Array<number>(width).fill(0))
  );
  if (target >= min && target <= max) {
    for (const id of ids) backward[req.horizon]![index.get(id)!]![offset(target)] = 1;
  }
  for (let step = req.horizon - 1; step >= 0; step -= 1) {
    for (const from of ids) {
      for (let tickIndex = 0; tickIndex < width; tickIndex += 1) {
        const value = tickIndex + min;
        let probability = 0;
        for (const edge of edges(m, from)) {
          const nextValue = value + increment(req, step + 1, edge.from, edge.to);
          if (nextValue < min || nextValue > max) continue;
          probability += edge.probability * backward[step + 1]![index.get(edge.to)!]![offset(nextValue)]!;
        }
        backward[step]![index.get(from)!]![tickIndex] = probability;
      }
    }
  }

  const gamma = Array.from({ length: req.horizon + 1 }, () => Array<number>(ids.length).fill(0));
  const pairwise = Array.from({ length: req.horizon }, () =>
    Array.from({ length: ids.length }, () => Array<number>(ids.length).fill(0))
  );
  if (eventProbability > 0) {
    for (let step = 0; step <= req.horizon; step += 1) {
      for (const id of ids) {
        const i = index.get(id)!;
        let numerator = 0;
        for (let tickIndex = 0; tickIndex < width; tickIndex += 1) {
          numerator += forward[step]![i]![tickIndex]! * backward[step]![i]![tickIndex]!;
        }
        gamma[step]![i] = numerator / eventProbability;
      }
    }
    for (let step = 0; step < req.horizon; step += 1) {
      for (const from of ids) {
        const i = index.get(from)!;
        for (let tickIndex = 0; tickIndex < width; tickIndex += 1) {
          const alpha = forward[step]![i]![tickIndex]!;
          if (alpha === 0) continue;
          const value = tickIndex + min;
          for (const edge of edges(m, from)) {
            const nextValue = value + increment(req, step + 1, edge.from, edge.to);
            if (nextValue < min || nextValue > max) continue;
            const row = pairwise[step]![i]!;
            const toIndex = index.get(edge.to)!;
            const incrementValue =
              alpha * edge.probability * backward[step + 1]![toIndex]![offset(nextValue)]! / eventProbability;
            row[toIndex] = row[toIndex]! + incrementValue;
          }
        }
      }
    }
  }
  return { min, max, forward, backward, pmf, eventProbability, gamma, pairwise };
}

describe('Candidate AA independent dense augmented-state convolution oracle', () => {
  it('independently matches PMF, exact-event smoothing and pairwise posteriors', () => {
    const m = model();
    const req = request();
    const raw = denseOracle(m, req, 4);
    const forward = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(m, req);
    expect(forward.ok).toBe(true);
    if (!forward.ok) throw new Error(forward.failure.message);

    for (let value = raw.min; value <= raw.max; value += 1) {
      const expected = raw.pmf[value - raw.min]!;
      const atom = forward.finalAggregateDistribution.find((entry) => entry.valueTicks === value);
      if (expected === 0) expect(atom).toBeUndefined();
      else {
        expect(atom).toBeDefined();
        expect(atom!.probability).toBeCloseTo(expected, 13);
      }
    }

    const conditioned = conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(m, {
      ...req,
      targetValueTicks: 4
    });
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    expect(conditioned.possible).toBe(true);
    expect(conditioned.eventProbability).toBeCloseTo(raw.eventProbability, 13);
    const ids = stateIds(m);
    for (let step = 0; step <= req.horizon; step += 1) {
      for (let i = 0; i < ids.length; i += 1) {
        const actual = conditioned.smoothingSteps![step]!.smoothedDistribution.find(
          (entry) => entry.stateId === ids[i]
        )!.probability;
        expect(actual).toBeCloseTo(raw.gamma[step]![i]!, 12);
      }
    }
    for (let step = 0; step < req.horizon; step += 1) {
      for (let i = 0; i < ids.length; i += 1) {
        for (let j = 0; j < ids.length; j += 1) {
          const actual = conditioned.pairwiseSteps![step]!.pairwiseDistribution.find(
            (entry) => entry.fromStateId === ids[i] && entry.toStateId === ids[j]
          )?.probability ?? 0;
          expect(actual).toBeCloseTo(raw.pairwise[step]![i]![j]!, 12);
        }
      }
    }
  });
});
