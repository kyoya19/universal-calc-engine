import { describe, expect, it } from 'vitest';
import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  evaluateModel,
  expandModel,
  isTerminalState,
  solveExpectedReward
} from '../src/model';
import { propagateFiniteHorizonStateDistribution } from '../src/state_distribution';
import {
  AdditiveTransitionValueEntry,
  FiniteAdditiveTrajectoryFunctionalConditioningResult,
  FiniteAdditiveTrajectoryFunctionalDistributionResult,
  FiniteAdditiveTrajectoryFunctionalRequest,
  analyzeFiniteAdditiveTrajectoryFunctionalDistribution,
  conditionFiniteAdditiveTrajectoryFunctionalOnExactValue,
  finiteAdditiveTrajectoryFunctionalConditioningResultToJson,
  finiteAdditiveTrajectoryFunctionalDistributionResultToJson
} from '../src/finite_additive_trajectory_functional';

type ForwardSuccess = Extract<FiniteAdditiveTrajectoryFunctionalDistributionResult, { ok: true }>;
type ConditionSuccess = Extract<FiniteAdditiveTrajectoryFunctionalConditioningResult, { ok: true }>;

type ConcreteEdge = { from: StateId; to: StateId; probability: number };
type PathEntry = { states: StateId[]; probability: number; aggregate: number };

type Enumerated = {
  paths: PathEntry[];
  pmf: Map<number, number>;
};

function baseModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.5 },
      { from: 'a', to: 'b', probability: 0.5 },
      { from: 'b', to: 'a', probability: 0.25 },
      { from: 'b', to: 'b', probability: 0.75 }
    ]
  };
}

function baseRequest(horizon = 2): FiniteAdditiveTrajectoryFunctionalRequest {
  const row: AdditiveTransitionValueEntry[] = [
    { fromStateId: 'a', toStateId: 'a', valueTicks: 0 },
    { fromStateId: 'a', toStateId: 'b', valueTicks: 2 },
    { fromStateId: 'b', toStateId: 'a', valueTicks: -1 },
    { fromStateId: 'b', toStateId: 'b', valueTicks: 1 }
  ];
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    horizon,
    initialValueByState: [
      { stateId: 'a', valueTicks: 1 },
      { stateId: 'b', valueTicks: 2 }
    ],
    transitionValueByStep: Array.from({ length: horizon }, () => row.map((entry) => ({ ...entry })))
  };
}

function concreteEdges(model: DefinitionModel, from: StateId): ConcreteEdge[] {
  const state = model.states.find((entry) => entry.id === from);
  if (state === undefined) throw new Error(`missing state ${from}`);
  if (isTerminalState(state)) return [{ from, to: from, probability: 1 }];
  return model.transitions
    .filter((entry) => entry.from === from && evaluateProbabilitySpec(entry.probability) > 0)
    .map((entry) => ({ from, to: entry.to, probability: evaluateProbabilitySpec(entry.probability) }));
}

function transitionValue(
  request: FiniteAdditiveTrajectoryFunctionalRequest,
  step: number,
  from: StateId,
  to: StateId
): number {
  const entry = request.transitionValueByStep[step - 1]!.find(
    (value) => value.fromStateId === from && value.toStateId === to
  );
  if (entry === undefined) throw new Error(`missing increment ${step}:${from}->${to}`);
  return entry.valueTicks;
}

function initialValue(request: FiniteAdditiveTrajectoryFunctionalRequest, stateId: StateId): number {
  const entry = request.initialValueByState.find((value) => value.stateId === stateId);
  if (entry === undefined) throw new Error(`missing initial value ${stateId}`);
  return entry.valueTicks;
}

function enumerateConcretePaths(model: DefinitionModel, request: FiniteAdditiveTrajectoryFunctionalRequest): Enumerated {
  const paths: PathEntry[] = [];
  const visit = (
    states: StateId[],
    probability: number,
    aggregate: number,
    step: number
  ): void => {
    if (step > request.horizon) {
      paths.push({ states, probability, aggregate });
      return;
    }
    const from = states[states.length - 1]!;
    for (const edge of concreteEdges(model, from)) {
      visit(
        [...states, edge.to],
        probability * edge.probability,
        aggregate + transitionValue(request, step, edge.from, edge.to),
        step + 1
      );
    }
  };

  for (const initial of request.initialDistribution) {
    if (initial.probability <= 0) continue;
    visit([initial.stateId], initial.probability, initialValue(request, initial.stateId), 1);
  }

  const pmf = new Map<number, number>();
  for (const path of paths) pmf.set(path.aggregate, (pmf.get(path.aggregate) ?? 0) + path.probability);
  return { paths, pmf };
}

function conditionedOracle(
  enumerated: Enumerated,
  target: number,
  stateIds: StateId[],
  horizon: number
): {
  total: number;
  gamma: Array<Map<StateId, number>>;
  pairwise: Array<Map<string, number>>;
  counts: Map<string, number>;
} | null {
  const selected = enumerated.paths.filter((path) => path.aggregate === target);
  const total = selected.reduce((sum, path) => sum + path.probability, 0);
  if (total === 0) return null;
  const gamma = Array.from({ length: horizon + 1 }, () => new Map(stateIds.map((id) => [id, 0])));
  const pairwise = Array.from({ length: horizon }, () => new Map<string, number>());
  const counts = new Map<string, number>();
  for (const path of selected) {
    const posterior = path.probability / total;
    for (let step = 0; step <= horizon; step += 1) {
      const stateId = path.states[step]!;
      gamma[step]!.set(stateId, (gamma[step]!.get(stateId) ?? 0) + posterior);
      if (step < horizon) {
        const key = `${stateId}\u0000${path.states[step + 1]!}`;
        pairwise[step]!.set(key, (pairwise[step]!.get(key) ?? 0) + posterior);
        counts.set(key, (counts.get(key) ?? 0) + posterior);
      }
    }
  }
  return { total, gamma, pairwise, counts };
}

function requireForward(result: FiniteAdditiveTrajectoryFunctionalDistributionResult): ForwardSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(result: FiniteAdditiveTrajectoryFunctionalConditioningResult): ConditionSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function atomProbability(result: ForwardSuccess, valueTicks: number): number {
  const atom = result.finalAggregateDistribution.find((entry) => entry.valueTicks === valueTicks);
  if (atom === undefined || atom.probability === null) throw new Error(`missing direct atom ${valueTicks}`);
  return atom.probability;
}

function expectedFromPmf(result: ForwardSuccess): number {
  return result.finalAggregateDistribution.reduce((sum, atom) => {
    if (atom.probability === null) throw new Error('unexpected underflow in expectation fixture');
    return sum + atom.valueTicks * atom.probability;
  }, 0);
}

function stateProbability(
  distribution: Array<{ stateId: StateId; probability: number }>,
  stateId: StateId
): number {
  return distribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function pairProbability(
  distribution: Array<{ fromStateId: StateId; toStateId: StateId; probability: number }>,
  from: StateId,
  to: StateId
): number {
  return distribution.find((entry) => entry.fromStateId === from && entry.toStateId === to)?.probability ?? 0;
}

describe('Candidate AA finite additive trajectory-functional qualification', () => {
  it('matches an independent complete concrete-transition path enumeration for PMF and exact-value conditioning', () => {
    const model = baseModel();
    const request = baseRequest();
    const enumerated = enumerateConcretePaths(model, request);
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));

    expect(forward.finalAggregateDistribution.map((entry) => entry.valueTicks)).toEqual(
      [...enumerated.pmf.keys()].sort((a, b) => a - b)
    );
    for (const [value, expected] of enumerated.pmf) {
      expect(atomProbability(forward, value)).toBeCloseTo(expected, 14);
    }

    const target = [...enumerated.pmf.keys()].sort((a, b) => a - b)[2]!;
    const oracle = conditionedOracle(enumerated, target, ['a', 'b'], request.horizon)!;
    const conditioned = requireCondition(
      conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, { ...request, targetValueTicks: target })
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.eventProbability).toBeCloseTo(oracle.total, 14);
    expect(conditioned.logEventProbability).toBeCloseTo(Math.log(oracle.total), 14);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateProbability(conditioned.smoothingSteps![step]!.smoothedDistribution, stateId))
          .toBeCloseTo(oracle.gamma[step]!.get(stateId) ?? 0, 13);
      }
    }
    for (let step = 0; step < request.horizon; step += 1) {
      for (const from of ['a', 'b']) {
        for (const to of ['a', 'b']) {
          const key = `${from}\u0000${to}`;
          expect(pairProbability(conditioned.pairwiseSteps![step]!.pairwiseDistribution, from, to))
            .toBeCloseTo(oracle.pairwise[step]!.get(key) ?? 0, 13);
        }
      }
    }
    for (const entry of conditioned.expectedTransitionCounts!) {
      expect(entry.expectedCount).toBeCloseTo(
        oracle.counts.get(`${entry.fromStateId}\u0000${entry.toStateId}`) ?? 0,
        13
      );
    }
  });

  it('reduces the zero functional exactly to Candidate A state marginals and a point mass at zero', () => {
    const model = baseModel();
    const request = baseRequest(3);
    request.initialValueByState = request.initialValueByState.map((entry) => ({ ...entry, valueTicks: 0 }));
    request.transitionValueByStep = request.transitionValueByStep.map((row) =>
      row.map((entry) => ({ ...entry, valueTicks: 0 }))
    );
    const candidateA = propagateFiniteHorizonStateDistribution(model, {
      initialDistribution: request.initialDistribution,
      horizon: request.horizon
    });
    expect(candidateA.ok).toBe(true);
    if (!candidateA.ok) throw new Error(candidateA.failure.message);
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    expect(forward.finalAggregateDistribution).toHaveLength(1);
    expect(forward.finalAggregateDistribution[0]!.valueTicks).toBe(0);
    expect(forward.finalAggregateDistribution[0]!.probability).toBeCloseTo(1, 14);
    for (let step = 0; step <= request.horizon; step += 1) {
      for (const state of candidateA.trajectory[step]!.distribution) {
        const joint = forward.trajectory[step]!.jointStateValueDistribution.find(
          (entry) => entry.stateId === state.stateId && entry.valueTicks === 0
        );
        expect(joint?.probability).toBeCloseTo(state.probability, 14);
      }
    }
  });

  it('makes the visit-count expectation equal Candidate A occupancy sum', () => {
    const model = baseModel();
    const request = baseRequest(4);
    request.initialValueByState = [
      { stateId: 'a', valueTicks: 0 },
      { stateId: 'b', valueTicks: 1 }
    ];
    request.transitionValueByStep = request.transitionValueByStep.map((row) =>
      row.map((entry) => ({ ...entry, valueTicks: entry.toStateId === 'b' ? 1 : 0 }))
    );
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    const candidateA = propagateFiniteHorizonStateDistribution(model, {
      initialDistribution: request.initialDistribution,
      horizon: request.horizon
    });
    expect(candidateA.ok).toBe(true);
    if (!candidateA.ok) throw new Error(candidateA.failure.message);
    const occupancy = candidateA.expectedVisitCounts.find((entry) => entry.stateId === 'b')!.expectedVisitCount;
    expect(expectedFromPmf(forward)).toBeCloseTo(occupancy, 13);
  });

  it('satisfies Kiyotan-Seikatan mixture consistency for state and pairwise marginals', () => {
    const model = baseModel();
    const request = baseRequest();
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    const candidateA = propagateFiniteHorizonStateDistribution(model, {
      initialDistribution: request.initialDistribution,
      horizon: request.horizon
    });
    expect(candidateA.ok).toBe(true);
    if (!candidateA.ok) throw new Error(candidateA.failure.message);
    const enumerated = enumerateConcretePaths(model, request);

    for (let step = 0; step <= request.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        let mixture = 0;
        for (const atom of forward.finalAggregateDistribution) {
          if (atom.probability === null) throw new Error('unexpected underflow');
          const conditioned = requireCondition(
            conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, {
              ...request,
              targetValueTicks: atom.valueTicks
            })
          );
          mixture += atom.probability * stateProbability(conditioned.smoothingSteps![step]!.smoothedDistribution, stateId);
        }
        const expected = candidateA.trajectory[step]!.distribution.find((entry) => entry.stateId === stateId)!.probability;
        expect(mixture).toBeCloseTo(expected, 13);
      }
    }

    for (let step = 0; step < request.horizon; step += 1) {
      for (const from of ['a', 'b']) {
        for (const to of ['a', 'b']) {
          let mixture = 0;
          for (const atom of forward.finalAggregateDistribution) {
            const weight = atom.probability!;
            const conditioned = requireCondition(
              conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, {
                ...request,
                targetValueTicks: atom.valueTicks
              })
            );
            mixture += weight * pairProbability(conditioned.pairwiseSteps![step]!.pairwiseDistribution, from, to);
          }
          const unconditional = enumerated.paths
            .filter((path) => path.states[step] === from && path.states[step + 1] === to)
            .reduce((sum, path) => sum + path.probability, 0);
          expect(mixture).toBeCloseTo(unconditional, 13);
        }
      }
    }
  });

  it('treats an outside-support target as impossible without confusing it with request failure', () => {
    const model = baseModel();
    const request = baseRequest();
    const result = requireCondition(
      conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, { ...request, targetValueTicks: 999 })
    );
    expect(result.possible).toBe(false);
    expect(result.eventProbability).toBe(0);
    expect(result.logEventProbability).toBeNull();
    expect(result.smoothingSteps).toBeNull();
    expect(result.pairwiseSteps).toBeNull();
    expect(result.expectedTransitionCounts).toBeNull();
  });

  it('supports T=0 with no transition rows and exact aggregate conditioning', () => {
    const model = baseModel();
    const request: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.25 },
        { stateId: 'b', probability: 0.75 }
      ],
      horizon: 0,
      initialValueByState: [
        { stateId: 'a', valueTicks: -2 },
        { stateId: 'b', valueTicks: 5 }
      ],
      transitionValueByStep: []
    };
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    expect(atomProbability(forward, -2)).toBeCloseTo(0.25, 14);
    expect(atomProbability(forward, 5)).toBeCloseTo(0.75, 14);
    const conditioned = requireCondition(
      conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, { ...request, targetValueTicks: 5 })
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.pairwiseSteps).toEqual([]);
    expect(conditioned.expectedTransitionCounts?.every((entry) => entry.expectedCount === 0)).toBe(true);
    expect(stateProbability(conditioned.smoothingSteps![0]!.smoothedDistribution, 'b')).toBeCloseTo(1, 14);
  });

  it('uses explicit increments on terminal implicit self-retention steps', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't', terminal: true }],
      transitions: [{ from: 'a', to: 't', probability: 1 }]
    };
    const request: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon: 3,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 't', valueTicks: 0 }
      ],
      transitionValueByStep: [
        [
          { fromStateId: 'a', toStateId: 't', valueTicks: 4 },
          { fromStateId: 't', toStateId: 't', valueTicks: 7 }
        ],
        [
          { fromStateId: 'a', toStateId: 't', valueTicks: 4 },
          { fromStateId: 't', toStateId: 't', valueTicks: 7 }
        ],
        [
          { fromStateId: 'a', toStateId: 't', valueTicks: 4 },
          { fromStateId: 't', toStateId: 't', valueTicks: 7 }
        ]
      ]
    };
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    expect(forward.finalAggregateDistribution).toHaveLength(1);
    expect(forward.finalAggregateDistribution[0]!.valueTicks).toBe(18);
    expect(forward.finalAggregateDistribution[0]!.probability).toBeCloseTo(1, 14);
  });

  it('preserves mathematically positive support/event mass across direct Float64 underflow', () => {
    const p = 1e-4;
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 - p },
        { from: 'a', to: 'b', probability: p },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };
    const horizon = 200;
    const row: AdditiveTransitionValueEntry[] = [
      { fromStateId: 'a', toStateId: 'a', valueTicks: 0 },
      { fromStateId: 'a', toStateId: 'b', valueTicks: 1 },
      { fromStateId: 'b', toStateId: 'a', valueTicks: 0 }
    ];
    const request: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 'b', valueTicks: 0 }
      ],
      transitionValueByStep: Array.from({ length: horizon }, () => row.map((entry) => ({ ...entry })))
    };
    const expectedLog = 100 * Math.log(p) + Math.log(1 + 100 * (1 - p));
    const forward = requireForward(
      analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request, { maxSupportSize: 1_000_000 })
    );
    const atom = forward.finalAggregateDistribution.find((entry) => entry.valueTicks === 100)!;
    expect(atom.probability).toBeNull();
    expect(atom.probabilityUnderflowed).toBe(true);
    expect(atom.logProbability).toBeCloseTo(expectedLog, 10);

    const conditioned = requireCondition(
      conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(
        model,
        { ...request, targetValueTicks: 100 },
        { maxSupportSize: 1_000_000 }
      )
    );
    expect(conditioned.possible).toBe(true);
    expect(conditioned.eventProbability).toBeNull();
    expect(conditioned.diagnostics.eventProbabilityUnderflowed).toBe(true);
    expect(conditioned.logEventProbability).toBeCloseTo(expectedLog, 10);
    expect(stateProbability(conditioned.smoothingSteps![0]!.smoothedDistribution, 'a')).toBeCloseTo(1, 14);
  });

  it('cross-checks solveExpectedReward on the lossless safe-integer state-pair intersection', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 't1', terminal: true }, { id: 't2', terminal: true }],
      transitions: [
        { from: 'a', to: 't1', probability: 0.5, reward: 2 },
        { from: 'a', to: 't2', probability: 0.5, reward: 4 }
      ]
    };
    const request: FiniteAdditiveTrajectoryFunctionalRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      horizon: 1,
      initialValueByState: [
        { stateId: 'a', valueTicks: 0 },
        { stateId: 't1', valueTicks: 0 },
        { stateId: 't2', valueTicks: 0 }
      ],
      transitionValueByStep: [[
        { fromStateId: 'a', toStateId: 't1', valueTicks: 2 },
        { fromStateId: 'a', toStateId: 't2', valueTicks: 4 },
        { fromStateId: 't1', toStateId: 't1', valueTicks: 0 },
        { fromStateId: 't2', toStateId: 't2', valueTicks: 0 }
      ]]
    };
    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, request));
    const solved = solveExpectedReward(evaluateModel(expandModel(model)));
    expect(expectedFromPmf(forward)).toBeCloseTo(solved.expectedRewardByState.get('a')!, 14);
  });

  it('rejects malformed tick coverage, unsafe ticks, support overflow and forged non-finite serialization', () => {
    const model = baseModel();
    const missing = baseRequest();
    missing.transitionValueByStep[0] = missing.transitionValueByStep[0]!.slice(1);
    const missingResult = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, missing);
    expect(missingResult.ok).toBe(false);
    if (!missingResult.ok) expect(missingResult.failure.code).toBe('missing_additive_effective_state_pair_value');

    const unsafe = baseRequest();
    unsafe.initialValueByState[0] = { stateId: 'a', valueTicks: Number.MAX_SAFE_INTEGER + 1 };
    const unsafeResult = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, unsafe);
    expect(unsafeResult.ok).toBe(false);
    if (!unsafeResult.ok) expect(unsafeResult.failure.code).toBe('invalid_additive_tick_value');

    const supportResult = analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, baseRequest(3), { maxSupportSize: 1 });
    expect(supportResult.ok).toBe(false);
    if (!supportResult.ok) expect(supportResult.failure.code).toBe('additive_support_limit_exceeded');

    const forward = requireForward(analyzeFiniteAdditiveTrajectoryFunctionalDistribution(model, baseRequest()));
    const forgedForward = structuredClone(forward);
    forgedForward.diagnostics.maxLogMassDeviation = Number.NaN;
    expect(() => finiteAdditiveTrajectoryFunctionalDistributionResultToJson(forgedForward)).toThrow(/non-finite/);

    const conditioned = requireCondition(
      conditionFiniteAdditiveTrajectoryFunctionalOnExactValue(model, { ...baseRequest(), targetValueTicks: 3 })
    );
    const forgedCondition = structuredClone(conditioned);
    forgedCondition.diagnostics.expectedCountTolerance = Number.POSITIVE_INFINITY;
    expect(() => finiteAdditiveTrajectoryFunctionalConditioningResultToJson(forgedCondition)).toThrow(/non-finite/);
  });
});
