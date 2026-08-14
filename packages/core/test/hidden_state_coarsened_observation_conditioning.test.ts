import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  filterFiniteHiddenStateObservationSequence
} from '../src/hidden_state_observation';
import { smoothFiniteHiddenStateObservationSequence } from '../src/hidden_state_smoothing';
import { smoothFiniteHiddenStatePairwiseTransitions } from '../src/hidden_state_pairwise_smoothing';
import {
  FiniteHiddenStateCoarsenedObservationConditioningRequest,
  FiniteHiddenStateCoarsenedObservationConditioningResult,
  conditionFiniteHiddenStateOnCoarsenedObservationEvidence,
  finiteHiddenStateCoarsenedObservationConditioningResultToJson
} from '../src/hidden_state_coarsened_observation_conditioning';

type YSuccess = Extract<FiniteHiddenStateCoarsenedObservationConditioningResult, { ok: true }>;

type EnumerationOracle = {
  total: number;
  gamma: Array<Map<StateId, number>>;
  pairwise: Array<Map<string, number>>;
};

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.82 },
      { from: 'a', to: 'b', probability: 0.18 },
      { from: 'b', to: 'a', probability: 0.27 },
      { from: 'b', to: 'b', probability: 0.73 }
    ]
  };
}

function request(
  evidenceSets: string[][]
): FiniteHiddenStateCoarsenedObservationConditioningRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.63 },
      { stateId: 'b', probability: 0.37 }
    ],
    alphabet: ['red', 'blue', 'green'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: 0.68 },
      { stateId: 'a', symbol: 'blue', probability: 0.22 },
      { stateId: 'a', symbol: 'green', probability: 0.1 },
      { stateId: 'b', symbol: 'red', probability: 0.12 },
      { stateId: 'b', symbol: 'blue', probability: 0.28 },
      { stateId: 'b', symbol: 'green', probability: 0.6 }
    ],
    observationEvidenceSets: evidenceSets
  };
}

function requireSuccess(
  result: FiniteHiddenStateCoarsenedObservationConditioningResult
): YSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function init(
  req: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  stateId: StateId
): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emit(
  req: Pick<FiniteHiddenStateCoarsenedObservationConditioningRequest, 'kernel'>,
  stateId: StateId,
  symbol: string
): number {
  return req.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function trans(m: DefinitionModel, from: StateId, to: StateId): number {
  const source = m.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function pairKey(from: StateId, to: StateId): string {
  return `${from}\u0000${to}`;
}

function enumerateStatePaths(states: StateId[], length: number): StateId[][] {
  const paths: StateId[][] = [];
  const visit = (path: StateId[]): void => {
    if (path.length === length) {
      paths.push(path);
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  return paths;
}

function enumerateObservationPaths(evidenceSets: string[][]): string[][] {
  const paths: string[][] = [];
  const visit = (path: string[]): void => {
    if (path.length === evidenceSets.length) {
      paths.push(path);
      return;
    }
    for (const symbol of evidenceSets[path.length] ?? []) visit([...path, symbol]);
  };
  visit([]);
  return paths;
}

function completeHiddenAndObservationEnumeration(
  m: DefinitionModel,
  req: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  length = req.observationEvidenceSets.length
): EnumerationOracle | null {
  const states = m.states.map((state) => state.id);
  const evidenceSets = req.observationEvidenceSets.slice(0, length);
  const statePaths = enumerateStatePaths(states, length);
  const observationPaths = enumerateObservationPaths(evidenceSets);
  const weighted: Array<{ states: StateId[]; mass: number }> = [];
  let total = 0;

  for (const hiddenPath of statePaths) {
    for (const observationPath of observationPaths) {
      let mass = 1;
      for (let step = 0; step < length; step += 1) {
        const stateId = hiddenPath[step]!;
        const symbol = observationPath[step]!;
        if (step === 0) mass *= init(req, stateId) * emit(req, stateId, symbol);
        else mass *= trans(m, hiddenPath[step - 1]!, stateId) * emit(req, stateId, symbol);
      }
      total += mass;
      if (mass > 0) weighted.push({ states: hiddenPath, mass });
    }
  }

  if (total === 0) return null;
  const gamma = Array.from({ length }, () => new Map(states.map((stateId) => [stateId, 0])));
  const pairwise = Array.from(
    { length: Math.max(0, length - 1) },
    () => new Map<string, number>()
  );

  for (const entry of weighted) {
    const posterior = entry.mass / total;
    for (let step = 0; step < length; step += 1) {
      const stateId = entry.states[step]!;
      gamma[step]!.set(stateId, (gamma[step]!.get(stateId) ?? 0) + posterior);
      if (step > 0) {
        const key = pairKey(entry.states[step - 1]!, stateId);
        pairwise[step - 1]!.set(key, (pairwise[step - 1]!.get(key) ?? 0) + posterior);
      }
    }
  }
  return { total, gamma, pairwise };
}

function stateProbability(
  distribution: Array<{ stateId: StateId; probability: number }> | null | undefined,
  stateId: StateId
): number {
  return distribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function pairProbability(
  distribution:
    | Array<{ fromStateId: StateId; toStateId: StateId; probability: number }>
    | null
    | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return distribution?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.probability ?? 0;
}

function expectedCount(
  counts:
    | Array<{ fromStateId: StateId; toStateId: StateId; expectedCount: number }>
    | null
    | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return counts?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.expectedCount ?? 0;
}

function exactRequest(
  req: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  observations: string[]
): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    kernel: req.kernel.map((entry) => ({ ...entry })),
    observations
  };
}

function compareSingletonToCHR(
  m: DefinitionModel,
  req: FiniteHiddenStateCoarsenedObservationConditioningRequest,
  observations: string[]
): void {
  const y = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(m, req));
  expect(y.possible).toBe(true);
  const exact = exactRequest(req, observations);
  const c = filterFiniteHiddenStateObservationSequence(m, exact);
  const h = smoothFiniteHiddenStateObservationSequence(m, exact);
  const r = smoothFiniteHiddenStatePairwiseTransitions(m, exact);
  expect(c.ok && c.possible).toBe(true);
  expect(h.ok && h.possible).toBe(true);
  expect(r.ok && r.possible).toBe(true);
  if (!c.ok || !c.possible || !h.ok || !h.possible || !r.ok || !r.possible) {
    throw new Error('Expected possible Candidate C/H/R reductions');
  }
  expect(y.logLikelihood).toBeCloseTo(c.logLikelihood!, 12);
  expect(y.combinedEvidenceProbability).toBeCloseTo(c.sequenceProbability!, 12);
  for (let step = 0; step < observations.length; step += 1) {
    for (const stateId of m.states.map((state) => state.id)) {
      expect(stateProbability(y.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
        stateProbability(c.steps[step]?.filteredDistribution, stateId),
        12
      );
      expect(stateProbability(y.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
        stateProbability(h.steps[step]?.smoothedDistribution, stateId),
        12
      );
    }
  }
  for (let step = 0; step < observations.length - 1; step += 1) {
    for (const from of m.states.map((state) => state.id)) {
      for (const to of m.states.map((state) => state.id)) {
        expect(pairProbability(y.pairwiseSteps?.[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
          pairProbability(r.steps[step]?.pairwiseDistribution, from, to),
          12
        );
      }
    }
  }
  for (const from of m.states.map((state) => state.id)) {
    for (const to of m.states.map((state) => state.id)) {
      expect(expectedCount(y.expectedTransitionCounts, from, to)).toBeCloseTo(
        expectedCount(r.expectedTransitionCounts, from, to),
        12
      );
    }
  }
}

function compareSameLabels(left: YSuccess, right: YSuccess, stateIds: StateId[]): void {
  expect(left.possible).toBe(true);
  expect(right.possible).toBe(true);
  expect(left.logLikelihood).toBeCloseTo(right.logLikelihood!, 12);
  expect(left.combinedEvidenceProbability).toBeCloseTo(right.combinedEvidenceProbability!, 12);
  expect(left.filteringSteps).toHaveLength(right.filteringSteps.length);
  for (let step = 0; step < left.filteringSteps.length; step += 1) {
    for (const stateId of stateIds) {
      expect(stateProbability(left.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
        stateProbability(right.filteringSteps[step]?.filteredDistribution, stateId),
        12
      );
      expect(stateProbability(left.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
        stateProbability(right.smoothingSteps?.[step]?.smoothedDistribution, stateId),
        12
      );
    }
  }
}

describe('Candidate Y finite partial/coarsened observation conditioning', () => {
  it('matches complete hidden+exact-observation enumeration and independent prefix-only enumeration', () => {
    const req = request([
      ['red', 'blue'],
      ['green', 'blue'],
      ['red', 'green'],
      ['blue', 'red']
    ]);
    const result = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), req));
    expect(result.possible).toBe(true);
    const complete = completeHiddenAndObservationEnumeration(model(), req);
    expect(complete).not.toBeNull();
    if (complete === null || result.smoothingSteps === null || result.pairwiseSteps === null) {
      throw new Error('Expected possible Candidate Y posterior and primary oracle');
    }
    expect(result.logLikelihood).toBeCloseTo(Math.log(complete.total), 12);
    expect(result.combinedEvidenceProbability).toBeCloseTo(complete.total, 12);

    for (let step = 0; step < req.observationEvidenceSets.length; step += 1) {
      const prefix = completeHiddenAndObservationEnumeration(model(), req, step + 1);
      expect(prefix).not.toBeNull();
      if (prefix === null) throw new Error('Expected possible prefix enumeration');
      for (const stateId of ['a', 'b'] as const) {
        expect(stateProbability(result.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          prefix.gamma[step]!.get(stateId) ?? 0,
          12
        );
        expect(stateProbability(result.smoothingSteps[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          complete.gamma[step]!.get(stateId) ?? 0,
          12
        );
      }
    }
    for (let step = 0; step < req.observationEvidenceSets.length - 1; step += 1) {
      for (const from of ['a', 'b'] as const) {
        for (const to of ['a', 'b'] as const) {
          expect(pairProbability(result.pairwiseSteps[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
            complete.pairwise[step]!.get(pairKey(from, to)) ?? 0,
            12
          );
        }
      }
    }
    expect(result.diagnostics.setValuedObservationEvidenceUsed).toBe(true);
    expect(result.diagnostics.softEvidenceUsed).toBe(false);
    expect(result.diagnostics.missingnessMechanismUsed).toBe(false);
    expect(result.diagnostics.stateEvidenceMaskUsed).toBe(false);
    expect(result.diagnostics.candidateXCompositionUsed).toBe(false);
    expect(result.diagnostics.parameterLearningUsed).toBe(false);
    expect(result.diagnostics.candidateVModified).toBe(false);
    expect(result.diagnostics.candidateWModified).toBe(false);
  });

  it('reduces all-singleton evidence exactly to Candidate C/H/R semantics', () => {
    const observations = ['red', 'green', 'blue', 'red'];
    compareSingletonToCHR(model(), request(observations.map((symbol) => [symbol])), observations);
  });

  it('reduces fixed coarsening preimages to Candidate C/H/R under the induced coarse kernel', () => {
    const m = model();
    const underlying: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.63 },
        { stateId: 'b', probability: 0.37 }
      ],
      alphabet: ['r1', 'r2', 'b'],
      kernel: [
        { stateId: 'a', symbol: 'r1', probability: 0.45 },
        { stateId: 'a', symbol: 'r2', probability: 0.35 },
        { stateId: 'a', symbol: 'b', probability: 0.2 },
        { stateId: 'b', symbol: 'r1', probability: 0.08 },
        { stateId: 'b', symbol: 'r2', probability: 0.22 },
        { stateId: 'b', symbol: 'b', probability: 0.7 }
      ],
      observationEvidenceSets: [['r1', 'r2'], ['b'], ['r2', 'r1']]
    };
    const y = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(m, underlying));
    expect(y.possible).toBe(true);

    const coarse: FiniteHiddenStateObservationRequest = {
      initialDistribution: underlying.initialDistribution.map((entry) => ({ ...entry })),
      alphabet: ['warm', 'cool'],
      kernel: [
        { stateId: 'a', symbol: 'warm', probability: 0.8 },
        { stateId: 'a', symbol: 'cool', probability: 0.2 },
        { stateId: 'b', symbol: 'warm', probability: 0.3 },
        { stateId: 'b', symbol: 'cool', probability: 0.7 }
      ],
      observations: ['warm', 'cool', 'warm']
    };
    const c = filterFiniteHiddenStateObservationSequence(m, coarse);
    const h = smoothFiniteHiddenStateObservationSequence(m, coarse);
    const r = smoothFiniteHiddenStatePairwiseTransitions(m, coarse);
    expect(c.ok && c.possible && h.ok && h.possible && r.ok && r.possible).toBe(true);
    if (!c.ok || !c.possible || !h.ok || !h.possible || !r.ok || !r.possible) {
      throw new Error('Expected induced coarse-kernel reduction to be possible');
    }
    expect(y.logLikelihood).toBeCloseTo(c.logLikelihood!, 12);
    for (let step = 0; step < 3; step += 1) {
      for (const stateId of ['a', 'b'] as const) {
        expect(stateProbability(y.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          stateProbability(c.steps[step]?.filteredDistribution, stateId),
          12
        );
        expect(stateProbability(y.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          stateProbability(h.steps[step]?.smoothedDistribution, stateId),
          12
        );
      }
    }
    for (let step = 0; step < 2; step += 1) {
      for (const from of ['a', 'b'] as const) {
        for (const to of ['a', 'b'] as const) {
          expect(pairProbability(y.pairwiseSteps?.[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
            pairProbability(r.steps[step]?.pairwiseDistribution, from, to),
            12
          );
        }
      }
    }
  });

  it('treats the full alphabet as evidence-neutral and rejects divide-by-cardinality likelihood semantics', () => {
    const full = ['red', 'blue', 'green'];
    const req = request([full, [...full].reverse(), full]);
    const result = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), req));
    expect(result.possible).toBe(true);
    expect(result.logLikelihood).toBeCloseTo(0, 12);
    expect(result.combinedEvidenceProbability).toBeCloseTo(1, 12);
    for (const step of result.filteringSteps) {
      expect(step.evidenceProbability).toBeCloseTo(1, 12);
      for (const stateId of ['a', 'b'] as const) {
        expect(stateProbability(step.filteredDistribution, stateId)).toBeCloseTo(
          stateProbability(step.predictiveDistribution, stateId),
          12
        );
      }
    }
    expect(result.logLikelihood).not.toBeCloseTo(-3 * Math.log(3), 8);
  });

  it('rejects representative-symbol substitution for a non-singleton set', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const yReq: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 'a', symbol: 'red', probability: 0.8 },
        { stateId: 'a', symbol: 'blue', probability: 0.2 },
        { stateId: 'b', symbol: 'red', probability: 0.2 },
        { stateId: 'b', symbol: 'blue', probability: 0.8 }
      ],
      observationEvidenceSets: [['red', 'blue']]
    };
    const y = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(m, yReq));
    expect(stateProbability(y.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 12);
    for (const representative of ['red', 'blue']) {
      const c = filterFiniteHiddenStateObservationSequence(m, exactRequest(yReq, [representative]));
      expect(c.ok && c.possible).toBe(true);
      if (!c.ok || !c.possible) throw new Error('Expected representative exact observation to be possible');
      expect(stateProbability(c.steps[0]?.filteredDistribution, 'a')).not.toBeCloseTo(0.5, 8);
    }
  });

  it('keeps future coarsened evidence out of prefix filtering while propagating it through smoothing and pairwise posteriors', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.9 },
        { from: 'a', to: 'b', probability: 0.1 },
        { from: 'b', to: 'a', probability: 0.1 },
        { from: 'b', to: 'b', probability: 0.9 }
      ]
    };
    const req: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      alphabet: ['x', 'y', 'z'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.45 },
        { stateId: 'a', symbol: 'y', probability: 0.45 },
        { stateId: 'a', symbol: 'z', probability: 0.1 },
        { stateId: 'b', symbol: 'x', probability: 0.1 },
        { stateId: 'b', symbol: 'y', probability: 0.1 },
        { stateId: 'b', symbol: 'z', probability: 0.8 }
      ],
      observationEvidenceSets: [
        ['x', 'y', 'z'],
        ['z', 'y', 'x'],
        ['x', 'y']
      ]
    };
    const result = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(m, req));
    expect(result.possible).toBe(true);
    expect(stateProbability(result.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 12);
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 12);
    expect(stateProbability(result.smoothingSteps?.[0]?.smoothedDistribution, 'a')).toBeGreaterThan(0.5);
    expect(stateProbability(result.smoothingSteps?.[1]?.smoothedDistribution, 'a')).toBeGreaterThan(0.5);

    for (let step = 0; step < (result.pairwiseSteps?.length ?? 0); step += 1) {
      const pair = result.pairwiseSteps![step]!.pairwiseDistribution;
      for (const stateId of ['a', 'b'] as const) {
        const row = pair
          .filter((entry) => entry.fromStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        const column = pair
          .filter((entry) => entry.toStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        expect(row).toBeCloseTo(
          stateProbability(result.smoothingSteps?.[step]?.smoothedDistribution, stateId),
          12
        );
        expect(column).toBeCloseTo(
          stateProbability(result.smoothingSteps?.[step + 1]?.smoothedDistribution, stateId),
          12
        );
      }
    }
    const totalCounts = result.expectedTransitionCounts?.reduce(
      (sum, entry) => sum + entry.expectedCount,
      0
    );
    expect(totalCounts).toBeCloseTo(2, 12);
  });

  it('satisfies set-refinement monotonicity and disjoint-union event-probability additivity', () => {
    const red = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), request([['red']]))
    );
    const blue = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), request([['blue']]))
    );
    const union = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), request([['blue', 'red']]))
    );
    const full = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
        model(),
        request([['red', 'blue', 'green']])
      )
    );
    expect(red.combinedEvidenceProbability).not.toBeNull();
    expect(blue.combinedEvidenceProbability).not.toBeNull();
    expect(union.combinedEvidenceProbability).not.toBeNull();
    expect(full.combinedEvidenceProbability).not.toBeNull();
    expect(union.combinedEvidenceProbability!).toBeCloseTo(
      red.combinedEvidenceProbability! + blue.combinedEvidenceProbability!,
      12
    );
    expect(red.combinedEvidenceProbability!).toBeLessThanOrEqual(union.combinedEvidenceProbability! + 1e-12);
    expect(union.combinedEvidenceProbability!).toBeLessThanOrEqual(full.combinedEvidenceProbability! + 1e-12);
  });

  it('is invariant to symbol order in sets and initial/kernel/transition input order', () => {
    const base = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
        model(),
        request([['red', 'blue'], ['green', 'blue'], ['red']])
      )
    );
    const reorderedModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'b' }, { id: 'a' }],
      transitions: [...model().transitions].reverse()
    };
    const reordered = request([
      ['blue', 'red'],
      ['blue', 'green'],
      ['red']
    ]);
    reordered.initialDistribution.reverse();
    reordered.kernel.reverse();
    const result = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(reorderedModel, reordered)
    );
    compareSameLabels(base, result, ['a', 'b']);
    expect(result.observationEvidenceSets).toEqual([
      ['blue', 'red'],
      ['blue', 'green'],
      ['red']
    ]);
  });

  it('is invariant under hidden-state relabeling and bijective observation-symbol renaming', () => {
    const base = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
        model(),
        request([['red', 'blue'], ['green'], ['red', 'green']])
      )
    );
    const relabeledModel: DefinitionModel = {
      startState: 'u',
      states: [{ id: 'u' }, { id: 'v' }],
      transitions: [
        { from: 'u', to: 'u', probability: 0.82 },
        { from: 'u', to: 'v', probability: 0.18 },
        { from: 'v', to: 'u', probability: 0.27 },
        { from: 'v', to: 'v', probability: 0.73 }
      ]
    };
    const relabeled: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [
        { stateId: 'u', probability: 0.63 },
        { stateId: 'v', probability: 0.37 }
      ],
      alphabet: ['r', 'b', 'g'],
      kernel: [
        { stateId: 'u', symbol: 'r', probability: 0.68 },
        { stateId: 'u', symbol: 'b', probability: 0.22 },
        { stateId: 'u', symbol: 'g', probability: 0.1 },
        { stateId: 'v', symbol: 'r', probability: 0.12 },
        { stateId: 'v', symbol: 'b', probability: 0.28 },
        { stateId: 'v', symbol: 'g', probability: 0.6 }
      ],
      observationEvidenceSets: [['r', 'b'], ['g'], ['r', 'g']]
    };
    const other = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(relabeledModel, relabeled)
    );
    expect(base.logLikelihood).toBeCloseTo(other.logLikelihood!, 12);
    expect(base.combinedEvidenceProbability).toBeCloseTo(other.combinedEvidenceProbability!, 12);
    for (let step = 0; step < base.filteringSteps.length; step += 1) {
      expect(stateProbability(base.filteringSteps[step]?.filteredDistribution, 'a')).toBeCloseTo(
        stateProbability(other.filteringSteps[step]?.filteredDistribution, 'u'),
        12
      );
      expect(stateProbability(base.filteringSteps[step]?.filteredDistribution, 'b')).toBeCloseTo(
        stateProbability(other.filteringSteps[step]?.filteredDistribution, 'v'),
        12
      );
      expect(stateProbability(base.smoothingSteps?.[step]?.smoothedDistribution, 'a')).toBeCloseTo(
        stateProbability(other.smoothingSteps?.[step]?.smoothedDistribution, 'u'),
        12
      );
    }
  });

  it('preserves parallel-transition split/merge equivalence', () => {
    const merged = model();
    const split: DefinitionModel = {
      ...model(),
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'a', probability: 0.32 },
        { from: 'a', to: 'b', probability: 0.18 },
        { from: 'b', to: 'a', probability: 0.27 },
        { from: 'b', to: 'b', probability: 0.4 },
        { from: 'b', to: 'b', probability: 0.33 }
      ]
    };
    const req = request([['red', 'blue'], ['green'], ['red', 'green']]);
    const left = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(merged, req));
    const right = requireSuccess(conditionFiniteHiddenStateOnCoarsenedObservationEvidence(split, req));
    compareSameLabels(left, right, ['a', 'b']);
  });

  it('preserves terminal implicit self-retention and one-step zero-transition semantics', () => {
    const terminalModel: DefinitionModel = {
      startState: 'live',
      states: [{ id: 'live' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'live', to: 'done', probability: 1 }]
    };
    const terminalReq: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [{ stateId: 'live', probability: 1 }],
      alphabet: ['o'],
      kernel: [
        { stateId: 'live', symbol: 'o', probability: 1 },
        { stateId: 'done', symbol: 'o', probability: 1 }
      ],
      observationEvidenceSets: [['o'], ['o'], ['o']]
    };
    const result = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(terminalModel, terminalReq)
    );
    expect(result.possible).toBe(true);
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'done')).toBeCloseTo(1, 12);
    expect(stateProbability(result.filteringSteps[2]?.filteredDistribution, 'done')).toBeCloseTo(1, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'live', 'done')).toBeCloseTo(1, 12);
    expect(pairProbability(result.pairwiseSteps?.[1]?.pairwiseDistribution, 'done', 'done')).toBeCloseTo(1, 12);
    expect(expectedCount(result.expectedTransitionCounts, 'live', 'done')).toBeCloseTo(1, 12);
    expect(expectedCount(result.expectedTransitionCounts, 'done', 'done')).toBeCloseTo(1, 12);

    const one = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
        terminalModel,
        { ...terminalReq, observationEvidenceSets: [['o']] }
      )
    );
    expect(one.pairwiseSteps).toEqual([]);
    expect(one.expectedTransitionCounts?.every((entry) => entry.expectedCount === 0)).toBe(true);
  });

  it('treats empty and dynamically impossible set evidence as possible=false while keeping them distinct from hard failures', () => {
    const empty = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), request([[]]))
    );
    expect(empty.possible).toBe(false);
    expect(empty.combinedEvidenceProbability).toBe(0);
    expect(empty.smoothingSteps).toBeNull();
    expect(empty.pairwiseSteps).toBeNull();

    const impossibleModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const impossibleReq: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 'a', symbol: 'red', probability: 1 },
        { stateId: 'a', symbol: 'blue', probability: 0 },
        { stateId: 'b', symbol: 'red', probability: 0 },
        { stateId: 'b', symbol: 'blue', probability: 1 }
      ],
      observationEvidenceSets: [['blue']]
    };
    const impossible = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(impossibleModel, impossibleReq)
    );
    expect(impossible.possible).toBe(false);
    expect(impossible.diagnostics.impossibleAtStep).toBe(0);

    const unknown = conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
      model(),
      request([['not-in-alphabet']])
    );
    expect(unknown.ok).toBe(false);
    if (unknown.ok) throw new Error('Expected unknown symbol failure');
    expect(unknown.failure.code).toBe('unknown_observation_evidence_symbol');

    const duplicate = conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
      model(),
      request([['red', 'red']])
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('Expected duplicate symbol failure');
    expect(duplicate.failure.code).toBe('duplicate_observation_evidence_symbol');
  });

  it('keeps direct Float64 probability underflow separate from mathematical impossibility', () => {
    const rareModel: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const rareReq: FiniteHiddenStateCoarsenedObservationConditioningRequest = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      alphabet: ['rare', 'common'],
      kernel: [
        { stateId: 's', symbol: 'rare', probability: 1e-200 },
        { stateId: 's', symbol: 'common', probability: 1 - 1e-200 }
      ],
      observationEvidenceSets: [['rare'], ['rare'], ['rare'], ['rare']]
    };
    const result = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(rareModel, rareReq)
    );
    expect(result.possible).toBe(true);
    expect(result.logLikelihood).not.toBeNull();
    expect(Number.isFinite(result.logLikelihood!)).toBe(true);
    expect(result.combinedEvidenceProbability).toBeNull();
    expect(result.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(true);
    expect(stateProbability(result.smoothingSteps?.[3]?.smoothedDistribution, 's')).toBeCloseTo(1, 12);
  });

  it('uses checked deterministic serialization and rejects forged non-finite analytical values', () => {
    const result = requireSuccess(
      conditionFiniteHiddenStateOnCoarsenedObservationEvidence(
        model(),
        request([['blue', 'red'], ['green']])
      )
    );
    const json1 = finiteHiddenStateCoarsenedObservationConditioningResultToJson(result);
    const json2 = finiteHiddenStateCoarsenedObservationConditioningResultToJson(result);
    expect(json1).toBe(json2);
    const forged = structuredClone(result) as YSuccess;
    forged.filteringSteps[0]!.predictiveDistribution[0]!.probability = Number.NaN;
    expect(() => finiteHiddenStateCoarsenedObservationConditioningResultToJson(forged)).toThrow(
      /non-finite numeric value/
    );
  });
});
