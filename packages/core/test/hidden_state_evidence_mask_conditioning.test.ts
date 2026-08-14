import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  filterFiniteHiddenStateObservationSequence
} from '../src/hidden_state_observation';
import { smoothFiniteHiddenStateObservationSequence } from '../src/hidden_state_smoothing';
import { smoothFiniteHiddenStatePairwiseTransitions } from '../src/hidden_state_pairwise_smoothing';
import {
  FiniteHiddenStateEvidenceMaskConditioningRequest,
  FiniteHiddenStateEvidenceMaskConditioningResult,
  conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks,
  finiteHiddenStateEvidenceMaskConditioningResultToJson
} from '../src/hidden_state_evidence_mask_conditioning';

type XSuccess = Extract<FiniteHiddenStateEvidenceMaskConditioningResult, { ok: true }>;

type Oracle = {
  total: number;
  logLikelihood: number;
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
  observations: string[],
  masks?: StateId[][]
): FiniteHiddenStateEvidenceMaskConditioningRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.63 },
      { stateId: 'b', probability: 0.37 }
    ],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: 0.88 },
      { stateId: 'a', symbol: 'blue', probability: 0.12 },
      { stateId: 'b', symbol: 'red', probability: 0.21 },
      { stateId: 'b', symbol: 'blue', probability: 0.79 }
    ],
    observations,
    stateEvidenceMasks: masks ?? observations.map(() => ['a', 'b'])
  };
}

function baseRequest(req: FiniteHiddenStateEvidenceMaskConditioningRequest): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: req.initialDistribution.map((entry) => ({ ...entry })),
    alphabet: [...req.alphabet],
    kernel: req.kernel.map((entry) => ({ ...entry })),
    observations: [...req.observations]
  };
}

function requireSuccess(result: FiniteHiddenStateEvidenceMaskConditioningResult): XSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function init(req: FiniteHiddenStateObservationRequest, stateId: StateId): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emit(req: Pick<FiniteHiddenStateObservationRequest, 'kernel'>, stateId: StateId, symbol: string): number {
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

function enumerateOracle(
  m: DefinitionModel,
  req: FiniteHiddenStateEvidenceMaskConditioningRequest,
  length = req.observations.length
): Oracle | null {
  const states = m.states.map((state) => state.id);
  const paths: Array<{ path: StateId[]; mass: number }> = [];
  let total = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === length) {
      let mass = 1;
      for (let step = 0; step < length; step += 1) {
        const stateId = path[step]!;
        const observation = req.observations[step]!;
        if (!req.stateEvidenceMasks[step]!.includes(stateId)) {
          mass = 0;
          break;
        }
        if (step === 0) mass *= init(req, stateId) * emit(req, stateId, observation);
        else mass *= trans(m, path[step - 1]!, stateId) * emit(req, stateId, observation);
      }
      total += mass;
      if (mass > 0) paths.push({ path, mass });
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  if (total === 0) return null;

  const gamma = Array.from({ length }, () => new Map(states.map((stateId) => [stateId, 0])));
  const pairwise = Array.from({ length: Math.max(0, length - 1) }, () => new Map<string, number>());
  for (const { path, mass } of paths) {
    const posterior = mass / total;
    for (let step = 0; step < length; step += 1) {
      const stateId = path[step]!;
      gamma[step]!.set(stateId, (gamma[step]!.get(stateId) ?? 0) + posterior);
      if (step > 0) {
        const key = pairKey(path[step - 1]!, stateId);
        pairwise[step - 1]!.set(key, (pairwise[step - 1]!.get(key) ?? 0) + posterior);
      }
    }
  }
  return { total, logLikelihood: Math.log(total), gamma, pairwise };
}

function probability(
  distribution: Array<{ stateId: StateId; probability: number }> | null | undefined,
  stateId: StateId
): number {
  return distribution?.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function pairProbability(
  distribution: Array<{ fromStateId: StateId; toStateId: StateId; probability: number }> | null | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return distribution?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.probability ?? 0;
}

describe('Candidate X finite hidden-state evidence-mask conditioning', () => {
  it('matches independent complete-hidden-path and prefix-only enumeration oracles', () => {
    const req = request(
      ['red', 'blue', 'red', 'blue'],
      [['a', 'b'], ['a'], ['a', 'b'], ['b']]
    );
    const result = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model(), req)
    );
    expect(result.possible).toBe(true);
    const complete = enumerateOracle(model(), req);
    expect(complete).not.toBeNull();
    if (complete === null || result.smoothingSteps === null || result.pairwiseSteps === null) {
      throw new Error('Expected possible complete oracle and Candidate X posterior');
    }

    expect(result.logLikelihood).toBeCloseTo(complete.logLikelihood, 12);
    expect(result.sequenceProbability).toBeCloseTo(complete.total, 12);
    for (let step = 0; step < req.observations.length; step += 1) {
      const prefix = enumerateOracle(model(), req, step + 1);
      expect(prefix).not.toBeNull();
      if (prefix === null) throw new Error('Expected possible prefix oracle');
      for (const stateId of ['a', 'b'] as const) {
        expect(probability(result.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          prefix.gamma[step]!.get(stateId) ?? 0,
          12
        );
        expect(probability(result.smoothingSteps[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          complete.gamma[step]!.get(stateId) ?? 0,
          12
        );
      }
    }
    for (let step = 0; step < req.observations.length - 1; step += 1) {
      for (const from of ['a', 'b'] as const) {
        for (const to of ['a', 'b'] as const) {
          expect(pairProbability(result.pairwiseSteps[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
            complete.pairwise[step]!.get(pairKey(from, to)) ?? 0,
            12
          );
        }
      }
    }
    expect(result.diagnostics.softEvidenceUsed).toBe(false);
    expect(result.diagnostics.parameterLearningUsed).toBe(false);
    expect(result.diagnostics.candidateVModified).toBe(false);
    expect(result.diagnostics.candidateWModified).toBe(false);
  });

  it('keeps future masks out of prefix filtering while propagating them through smoothing and pairwise posteriors', () => {
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
    const req: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      alphabet: ['o'],
      kernel: [
        { stateId: 'a', symbol: 'o', probability: 1 },
        { stateId: 'b', symbol: 'o', probability: 1 }
      ],
      observations: ['o', 'o', 'o'],
      stateEvidenceMasks: [['b', 'a'], ['a', 'b'], ['a']]
    };
    const result = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(m, req)
    );
    expect(result.possible).toBe(true);
    expect(probability(result.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 12);
    expect(probability(result.filteringSteps[1]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 12);
    expect(probability(result.smoothingSteps?.[0]?.smoothedDistribution, 'a')).toBeCloseTo(0.82, 12);
    expect(probability(result.smoothingSteps?.[1]?.smoothedDistribution, 'a')).toBeCloseTo(0.9, 12);
    expect(probability(result.smoothingSteps?.[2]?.smoothedDistribution, 'a')).toBeCloseTo(1, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'a', 'a')).toBeCloseTo(0.81, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'a', 'b')).toBeCloseTo(0.01, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'b', 'a')).toBeCloseTo(0.09, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'b', 'b')).toBeCloseTo(0.09, 12);

    const unmasked = smoothFiniteHiddenStateObservationSequence(m, baseRequest({
      ...req,
      stateEvidenceMasks: req.observations.map(() => ['a', 'b'])
    }));
    expect(unmasked.ok).toBe(true);
    if (!unmasked.ok || !unmasked.possible) throw new Error('Expected possible unmasked smoothing');
    expect(probability(unmasked.steps[0]?.smoothedDistribution, 'a')).toBeCloseTo(0.5, 12);
    expect(probability(result.smoothingSteps?.[0]?.smoothedDistribution, 'a')).not.toBeCloseTo(0.5, 8);
  });

  it('reduces under all-full masks to Candidate C filtering, H smoothing and R pairwise smoothing', () => {
    const req = request(['red', 'blue', 'red', 'blue']);
    const base = baseRequest(req);
    const x = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model(), req)
    );
    const c = filterFiniteHiddenStateObservationSequence(model(), base);
    const h = smoothFiniteHiddenStateObservationSequence(model(), base);
    const r = smoothFiniteHiddenStatePairwiseTransitions(model(), base);
    expect(c.ok).toBe(true);
    expect(h.ok).toBe(true);
    expect(r.ok).toBe(true);
    if (!c.ok || !h.ok || !r.ok || !c.possible || !h.possible || !r.possible) {
      throw new Error('Expected possible C/H/R reductions');
    }
    expect(x.logLikelihood).toBeCloseTo(c.logLikelihood!, 12);
    expect(x.sequenceProbability).toBeCloseTo(c.sequenceProbability!, 12);
    for (let step = 0; step < req.observations.length; step += 1) {
      for (const stateId of ['a', 'b'] as const) {
        expect(probability(x.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          probability(c.steps[step]?.filteredDistribution, stateId),
          12
        );
        expect(probability(x.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          probability(h.steps[step]?.smoothedDistribution, stateId),
          12
        );
      }
    }
    for (let step = 0; step < req.observations.length - 1; step += 1) {
      for (const from of ['a', 'b'] as const) {
        for (const to of ['a', 'b'] as const) {
          expect(pairProbability(x.pairwiseSteps?.[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
            pairProbability(r.steps[step]?.pairwiseDistribution, from, to),
            12
          );
        }
      }
    }
    for (const expected of r.expectedTransitionCounts ?? []) {
      const actual = x.expectedTransitionCounts?.find(
        (entry) => entry.fromStateId === expected.fromStateId && entry.toStateId === expected.toStateId
      );
      expect(actual?.expectedCount).toBeCloseTo(expected.expectedCount, 12);
    }
  });

  it('preserves pairwise row/column marginals and expected-count conservation', () => {
    const req = request(
      ['red', 'blue', 'red', 'red'],
      [['a', 'b'], ['a'], ['a', 'b'], ['a', 'b']]
    );
    const x = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model(), req)
    );
    expect(x.possible).toBe(true);
    if (x.smoothingSteps === null || x.pairwiseSteps === null || x.expectedTransitionCounts === null) {
      throw new Error('Expected possible posterior outputs');
    }
    for (let step = 0; step < x.pairwiseSteps.length; step += 1) {
      const pairwise = x.pairwiseSteps[step]!.pairwiseDistribution;
      for (const stateId of ['a', 'b'] as const) {
        const row = pairwise
          .filter((entry) => entry.fromStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        const column = pairwise
          .filter((entry) => entry.toStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        expect(row).toBeCloseTo(probability(x.smoothingSteps[step]?.smoothedDistribution, stateId), 12);
        expect(column).toBeCloseTo(probability(x.smoothingSteps[step + 1]?.smoothedDistribution, stateId), 12);
      }
    }
    expect(x.expectedTransitionCounts.reduce((sum, entry) => sum + entry.expectedCount, 0)).toBeCloseTo(
      req.observations.length - 1,
      12
    );
  });

  it('treats empty and dynamically incompatible masks as possible=false without fabricating full posteriors', () => {
    const empty = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
        model(),
        request(['red', 'blue', 'red'], [['a', 'b'], [], ['a', 'b']])
      )
    );
    expect(empty.possible).toBe(false);
    expect(empty.filteringSteps).toHaveLength(2);
    expect(empty.filteringSteps[0]?.filteredDistribution).not.toBeNull();
    expect(empty.filteringSteps[1]?.filteredDistribution).toBeNull();
    expect(empty.smoothingSteps).toBeNull();
    expect(empty.pairwiseSteps).toBeNull();
    expect(empty.expectedTransitionCounts).toBeNull();
    expect(empty.logLikelihood).toBeNull();
    expect(empty.sequenceProbability).toBe(0);
    expect(empty.diagnostics.impossibleAtStep).toBe(1);

    const deterministic: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const incompatible = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(deterministic, {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        alphabet: ['o'],
        kernel: [
          { stateId: 'a', symbol: 'o', probability: 1 },
          { stateId: 'b', symbol: 'o', probability: 1 }
        ],
        observations: ['o', 'o'],
        stateEvidenceMasks: [['a'], ['b']]
      })
    );
    expect(incompatible.possible).toBe(false);
    expect(incompatible.diagnostics.impossibleAtStep).toBe(1);
  });

  it('is invariant to mask state ordering and returns zero expected counts for one observation', () => {
    const left = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
        model(),
        request(['red'], [['b', 'a']])
      )
    );
    const right = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
        model(),
        request(['red'], [['a', 'b']])
      )
    );
    expect(left).toEqual(right);
    expect(left.pairwiseSteps).toEqual([]);
    expect(left.expectedTransitionCounts).not.toBeNull();
    expect(left.expectedTransitionCounts?.every((entry) => entry.expectedCount === 0)).toBe(true);
  });

  it('separates direct probability underflow from mathematical impossibility', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }],
      transitions: [{ from: 'a', to: 'a', probability: 1 }]
    };
    const observations = Array.from({ length: 1000 }, () => 'rare');
    const result = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(m, {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        alphabet: ['rare', 'common'],
        kernel: [
          { stateId: 'a', symbol: 'rare', probability: 0.0001 },
          { stateId: 'a', symbol: 'common', probability: 0.9999 }
        ],
        observations,
        stateEvidenceMasks: observations.map(() => ['a'])
      })
    );
    expect(result.possible).toBe(true);
    expect(result.sequenceProbability).toBe(0);
    expect(result.logLikelihood).not.toBeNull();
    expect(Number.isFinite(result.logLikelihood)).toBe(true);
    expect(result.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(true);
    expect(result.diagnostics.impossibleAtStep).toBeNull();
    expect(probability(result.smoothingSteps?.[999]?.smoothedDistribution, 'a')).toBe(1);
  });

  it('rejects malformed masks, soft numeric evidence and forged non-finite serialization', () => {
    const lengthMismatch = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
      model(),
      { ...request(['red', 'blue']), stateEvidenceMasks: [['a', 'b']] }
    );
    expect(lengthMismatch.ok).toBe(false);
    if (lengthMismatch.ok) throw new Error('Expected length mismatch failure');
    expect(lengthMismatch.failure.code).toBe('state_evidence_mask_length_mismatch');

    const duplicate = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
      model(),
      { ...request(['red']), stateEvidenceMasks: [['a', 'a']] }
    );
    expect(duplicate.ok).toBe(false);
    if (duplicate.ok) throw new Error('Expected duplicate mask failure');
    expect(duplicate.failure.code).toBe('duplicate_state_evidence_mask_state');

    const soft = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
      model(),
      { ...request(['red']), stateEvidenceMasks: [[0.7]] } as unknown as FiniteHiddenStateEvidenceMaskConditioningRequest
    );
    expect(soft.ok).toBe(false);
    if (soft.ok) throw new Error('Expected soft evidence rejection');
    expect(soft.failure.code).toBe('invalid_state_evidence_mask_entry');

    const possible = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model(), request(['red']))
    );
    expect(() =>
      finiteHiddenStateEvidenceMaskConditioningResultToJson({
        ...possible,
        sequenceProbability: Number.POSITIVE_INFINITY
      })
    ).toThrow(/non-finite numeric value/);
    expect(finiteHiddenStateEvidenceMaskConditioningResultToJson(possible)).toBe(JSON.stringify(possible));
  });
});
