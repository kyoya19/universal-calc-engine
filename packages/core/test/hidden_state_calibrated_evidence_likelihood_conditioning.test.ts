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
  conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks
} from '../src/hidden_state_evidence_mask_conditioning';
import {
  FiniteHiddenStateCoarsenedObservationConditioningRequest,
  conditionFiniteHiddenStateOnCoarsenedObservationEvidence
} from '../src/hidden_state_coarsened_observation_conditioning';
import {
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult,
  conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods,
  finiteHiddenStateCalibratedEvidenceLikelihoodConditioningResultToJson
} from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';

type ZSuccess = Extract<FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult, { ok: true }>;

type Oracle = {
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
  likelihoodRows: Array<[number, number]>
): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.63 },
      { stateId: 'b', probability: 0.37 }
    ],
    evidenceLikelihoods: likelihoodRows.map(([a, b]) => [
      { stateId: 'a', likelihood: a },
      { stateId: 'b', likelihood: b }
    ])
  };
}

function requireSuccess(
  result: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult
): ZSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initial(
  req: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateId: StateId
): number {
  return req.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function likelihood(
  req: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateId: StateId,
  step: number
): number {
  return req.evidenceLikelihoods[step]?.find((entry) => entry.stateId === stateId)?.likelihood ?? 0;
}

function transition(m: DefinitionModel, from: StateId, to: StateId): number {
  const state = m.states.find((entry) => entry.id === from);
  if (state !== undefined && isTerminalState(state)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function paths(states: StateId[], length: number): StateId[][] {
  const result: StateId[][] = [];
  const visit = (path: StateId[]): void => {
    if (path.length === length) {
      result.push(path);
      return;
    }
    for (const stateId of states) visit([...path, stateId]);
  };
  visit([]);
  return result;
}

function pairKey(from: StateId, to: StateId): string {
  return `${from}\u0000${to}`;
}

function enumerate(
  m: DefinitionModel,
  req: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  length = req.evidenceLikelihoods.length
): Oracle | null {
  const states = m.states.map((state) => state.id);
  const weighted: Array<{ path: StateId[]; mass: number }> = [];
  let total = 0;
  for (const path of paths(states, length)) {
    let mass = 1;
    for (let step = 0; step < length; step += 1) {
      const stateId = path[step]!;
      if (step === 0) mass *= initial(req, stateId) * likelihood(req, stateId, step);
      else mass *= transition(m, path[step - 1]!, stateId) * likelihood(req, stateId, step);
    }
    total += mass;
    if (mass > 0) weighted.push({ path, mass });
  }
  if (total === 0) return null;
  const gamma = Array.from({ length }, () => new Map(states.map((stateId) => [stateId, 0])));
  const pairwise = Array.from({ length: Math.max(0, length - 1) }, () => new Map<string, number>());
  for (const entry of weighted) {
    const posterior = entry.mass / total;
    for (let step = 0; step < length; step += 1) {
      const stateId = entry.path[step]!;
      gamma[step]!.set(stateId, (gamma[step]!.get(stateId) ?? 0) + posterior);
      if (step > 0) {
        const key = pairKey(entry.path[step - 1]!, stateId);
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
  distribution: Array<{ fromStateId: StateId; toStateId: StateId; probability: number }> | null | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return distribution?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.probability ?? 0;
}

function expectedCount(
  counts: Array<{ fromStateId: StateId; toStateId: StateId; expectedCount: number }> | null | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return counts?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.expectedCount ?? 0;
}

function kernelFixture(): {
  exact: FiniteHiddenStateObservationRequest;
  y: FiniteHiddenStateCoarsenedObservationConditioningRequest;
} {
  const initialDistribution = [
    { stateId: 'a', probability: 0.63 },
    { stateId: 'b', probability: 0.37 }
  ];
  const alphabet = ['r', 'g'];
  const kernel = [
    { stateId: 'a', symbol: 'r', probability: 0.8 },
    { stateId: 'a', symbol: 'g', probability: 0.2 },
    { stateId: 'b', symbol: 'r', probability: 0.25 },
    { stateId: 'b', symbol: 'g', probability: 0.75 }
  ];
  return {
    exact: {
      initialDistribution,
      alphabet,
      kernel,
      observations: ['r', 'g', 'r']
    },
    y: {
      initialDistribution,
      alphabet,
      kernel,
      observationEvidenceSets: [['r'], ['g', 'r'], ['g']]
    }
  };
}

function emission(req: FiniteHiddenStateObservationRequest, stateId: StateId, symbol: string): number {
  return req.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function compareZToCHR(): void {
  const fixture = kernelFixture();
  const zRequest: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
    initialDistribution: fixture.exact.initialDistribution.map((entry) => ({ ...entry })),
    evidenceLikelihoods: fixture.exact.observations.map((symbol) =>
      ['a', 'b'].map((stateId) => ({ stateId, likelihood: emission(fixture.exact, stateId, symbol) }))
    )
  };
  const z = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), zRequest));
  const c = filterFiniteHiddenStateObservationSequence(model(), fixture.exact);
  const h = smoothFiniteHiddenStateObservationSequence(model(), fixture.exact);
  const r = smoothFiniteHiddenStatePairwiseTransitions(model(), fixture.exact);
  expect(c.ok && c.possible && h.ok && h.possible && r.ok && r.possible).toBe(true);
  if (!c.ok || !c.possible || !h.ok || !h.possible || !r.ok || !r.possible) {
    throw new Error('Expected possible C/H/R reductions');
  }
  expect(z.logLikelihood).toBeCloseTo(c.logLikelihood!, 12);
  expect(z.combinedEvidenceProbability).toBeCloseTo(c.sequenceProbability!, 12);
  for (let step = 0; step < fixture.exact.observations.length; step += 1) {
    for (const stateId of ['a', 'b']) {
      expect(stateProbability(z.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
        stateProbability(c.steps[step]?.filteredDistribution, stateId),
        12
      );
      expect(stateProbability(z.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
        stateProbability(h.steps[step]?.smoothedDistribution, stateId),
        12
      );
    }
  }
  for (let step = 0; step < fixture.exact.observations.length - 1; step += 1) {
    for (const from of ['a', 'b']) {
      for (const to of ['a', 'b']) {
        expect(pairProbability(z.pairwiseSteps?.[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
          pairProbability(r.steps[step]?.pairwiseDistribution, from, to),
          12
        );
      }
    }
  }
}

describe('Candidate Z calibrated evidence-likelihood conditioning', () => {
  it('matches independent complete-hidden-path and prefix-only enumeration oracles', () => {
    const req = request([[0.7, 0.2], [0.35, 0.8], [0.9, 0.15], [0.4, 0.65]]);
    const result = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), req));
    expect(result.possible).toBe(true);
    const complete = enumerate(model(), req);
    expect(complete).not.toBeNull();
    if (complete === null || result.smoothingSteps === null || result.pairwiseSteps === null) {
      throw new Error('Expected possible Candidate Z posterior');
    }
    expect(result.logLikelihood).toBeCloseTo(Math.log(complete.total), 12);
    expect(result.combinedEvidenceProbability).toBeCloseTo(complete.total, 12);
    for (let step = 0; step < req.evidenceLikelihoods.length; step += 1) {
      const prefixReq = {
        ...req,
        evidenceLikelihoods: req.evidenceLikelihoods.slice(0, step + 1)
      };
      const prefix = enumerate(model(), prefixReq);
      expect(prefix).not.toBeNull();
      if (prefix === null) throw new Error('Expected possible prefix oracle');
      for (const stateId of ['a', 'b']) {
        expect(stateProbability(result.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          prefix.gamma[step]?.get(stateId) ?? 0,
          12
        );
        expect(stateProbability(result.smoothingSteps[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          complete.gamma[step]?.get(stateId) ?? 0,
          12
        );
      }
    }
    for (let step = 0; step < req.evidenceLikelihoods.length - 1; step += 1) {
      for (const from of ['a', 'b']) {
        for (const to of ['a', 'b']) {
          expect(pairProbability(result.pairwiseSteps[step]?.pairwiseDistribution, from, to)).toBeCloseTo(
            complete.pairwise[step]?.get(pairKey(from, to)) ?? 0,
            12
          );
        }
      }
    }
  });

  it('preserves absolute scale under anti-rescaling and constant-row discriminators', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const base = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(m, {
      initialDistribution: [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }],
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.2 }, { stateId: 'b', likelihood: 0.6 }]]
    }));
    const scaled = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(m, {
      initialDistribution: [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }],
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.1 }, { stateId: 'b', likelihood: 0.3 }]]
    }));
    expect(base.combinedEvidenceProbability).toBeCloseTo(0.4, 15);
    expect(scaled.combinedEvidenceProbability).toBeCloseTo(0.2, 15);
    expect(stateProbability(base.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.25, 15);
    expect(stateProbability(scaled.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.25, 15);
    expect(scaled.logLikelihood! - base.logLikelihood!).toBeCloseTo(Math.log(0.5), 15);

    const constant = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), request([[0.5, 0.5], [1, 1]])));
    const neutral = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), request([[1, 1], [1, 1]])));
    expect(constant.logLikelihood! - neutral.logLikelihood!).toBeCloseTo(Math.log(0.5), 12);
    for (const stateId of ['a', 'b']) {
      expect(stateProbability(constant.filteringSteps[0]?.filteredDistribution, stateId)).toBeCloseTo(
        stateProbability(neutral.filteringSteps[0]?.filteredDistribution, stateId),
        12
      );
    }
  });

  it('keeps future calibrated evidence out of prefix filtering while allowing smoothing revision', () => {
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
    const req: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: [{ stateId: 'a', probability: 0.5 }, { stateId: 'b', probability: 0.5 }],
      evidenceLikelihoods: [
        [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }],
        [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 1 }],
        [{ stateId: 'a', likelihood: 1 }, { stateId: 'b', likelihood: 0 }]
      ]
    };
    const result = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(m, req));
    expect(stateProbability(result.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 15);
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'a')).toBeCloseTo(0.5, 15);
    expect(stateProbability(result.smoothingSteps?.[0]?.smoothedDistribution, 'a')).toBeCloseTo(0.82, 15);
    expect(stateProbability(result.smoothingSteps?.[1]?.smoothedDistribution, 'a')).toBeCloseTo(0.9, 15);
    expect(stateProbability(result.smoothingSteps?.[2]?.smoothedDistribution, 'a')).toBeCloseTo(1, 15);
  });

  it('reduces mathematically to Candidate C/H/R exact-observation semantics', () => {
    compareZToCHR();
  });

  it('reduces mathematically to Candidate X and preserves the historical underflow adapter boundary', () => {
    const fixture = kernelFixture();
    const xRequest: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      ...fixture.exact,
      stateEvidenceMasks: [['a', 'b'], ['a'], ['a', 'b']]
    };
    const x = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model(), xRequest);
    expect(x.ok && x.possible).toBe(true);
    if (!x.ok || !x.possible) throw new Error('Expected possible Candidate X reduction');
    const zReq: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: fixture.exact.initialDistribution,
      evidenceLikelihoods: fixture.exact.observations.map((symbol, step) =>
        ['a', 'b'].map((stateId) => ({
          stateId,
          likelihood: (xRequest.stateEvidenceMasks[step]?.includes(stateId) ?? false)
            ? emission(fixture.exact, stateId, symbol)
            : 0
        }))
      )
    };
    const z = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), zReq));
    expect(z.logLikelihood).toBeCloseTo(x.logLikelihood!, 12);
    expect(z.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(x.diagnostics.combinedEvidenceProbabilityUnderflowed);
    for (let step = 0; step < zReq.evidenceLikelihoods.length; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateProbability(z.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          stateProbability(x.filteringSteps[step]?.filteredDistribution, stateId), 12
        );
        expect(stateProbability(z.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          stateProbability(x.smoothingSteps?.[step]?.smoothedDistribution, stateId), 12
        );
      }
    }
  });

  it('reduces mathematically to Candidate Y hard set-valued observation evidence', () => {
    const fixture = kernelFixture();
    const y = conditionFiniteHiddenStateOnCoarsenedObservationEvidence(model(), fixture.y);
    expect(y.ok && y.possible).toBe(true);
    if (!y.ok || !y.possible) throw new Error('Expected possible Candidate Y reduction');
    const zReq: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: fixture.y.initialDistribution,
      evidenceLikelihoods: fixture.y.observationEvidenceSets.map((set) =>
        ['a', 'b'].map((stateId) => ({
          stateId,
          likelihood: set.reduce((sum, symbol) => sum + emission(fixture.exact, stateId, symbol), 0)
        }))
      )
    };
    const z = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), zReq));
    expect(z.logLikelihood).toBeCloseTo(y.logLikelihood!, 12);
    expect(z.combinedEvidenceProbability).toBeCloseTo(y.combinedEvidenceProbability!, 12);
    for (let step = 0; step < zReq.evidenceLikelihoods.length; step += 1) {
      for (const stateId of ['a', 'b']) {
        expect(stateProbability(z.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(
          stateProbability(y.filteringSteps[step]?.filteredDistribution, stateId), 12
        );
        expect(stateProbability(z.smoothingSteps?.[step]?.smoothedDistribution, stateId)).toBeCloseTo(
          stateProbability(y.smoothingSteps?.[step]?.smoothedDistribution, stateId), 12
        );
      }
    }
  });

  it('represents X+Y hard composition exactly through calibrated local likelihoods', () => {
    const fixture = kernelFixture();
    const masks = [['a', 'b'], ['a'], ['a', 'b']];
    const sets = [['r'], ['r', 'g'], ['g']];
    const zReq: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: fixture.exact.initialDistribution,
      evidenceLikelihoods: sets.map((set, step) =>
        ['a', 'b'].map((stateId) => ({
          stateId,
          likelihood: (masks[step]?.includes(stateId) ?? false)
            ? set.reduce((sum, symbol) => sum + emission(fixture.exact, stateId, symbol), 0)
            : 0
        }))
      )
    };
    const z = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), zReq));
    const oracle = enumerate(model(), zReq);
    expect(oracle).not.toBeNull();
    if (oracle === null) throw new Error('Expected possible hard-composition oracle');
    expect(z.combinedEvidenceProbability).toBeCloseTo(oracle.total, 12);
    expect(z.logLikelihood).toBeCloseTo(Math.log(oracle.total), 12);
  });

  it('returns honest all-zero and dynamically impossible evidence without fabricating complete posteriors', () => {
    const zero = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), request([[1, 1], [0, 0], [1, 1]])));
    expect(zero.possible).toBe(false);
    expect(zero.diagnostics.impossibleAtStep).toBe(1);
    expect(zero.filteringSteps[0]?.filteredDistribution).not.toBeNull();
    expect(zero.filteringSteps[1]?.filteredDistribution).toBeNull();
    expect(zero.smoothingSteps).toBeNull();
    expect(zero.pairwiseSteps).toBeNull();
    expect(zero.expectedTransitionCounts).toBeNull();
    expect(zero.logLikelihood).toBeNull();
    expect(zero.combinedEvidenceProbability).toBe(0);

    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const dynamic = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(m, {
      initialDistribution: [{ stateId: 'a', probability: 1 }, { stateId: 'b', probability: 0 }],
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0 }, { stateId: 'b', likelihood: 0.8 }]]
    }));
    expect(dynamic.possible).toBe(false);
    expect(dynamic.diagnostics.impossibleAtStep).toBe(0);
  });

  it('separates positive-probability Float64 underflow using an independent closed form', () => {
    const m: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }],
      transitions: []
    };
    const steps = 1100;
    const req: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      evidenceLikelihoods: Array.from({ length: steps }, () => [{ stateId: 'a', likelihood: 0.5 }])
    };
    const result = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(m, req));
    expect(result.possible).toBe(true);
    expect(result.logLikelihood).toBeCloseTo(steps * Math.log(0.5), 10);
    expect(result.combinedEvidenceProbability).toBeNull();
    expect(result.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(true);
    expect(result.smoothingSteps).toHaveLength(steps);
  });

  it('requires complete explicit rows and rejects unknown, duplicate, non-finite, out-of-range and unnormalized substitutions', () => {
    const missing = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), {
      ...request([[0.4, 0.6]]),
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.4 }]]
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.code).toBe('missing_calibrated_evidence_likelihood_state');

    const unknown = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), {
      ...request([[0.4, 0.6]]),
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.4 }, { stateId: 'x', likelihood: 0.6 }]]
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.failure.code).toBe('unknown_calibrated_evidence_likelihood_state');

    const duplicate = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), {
      ...request([[0.4, 0.6]]),
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.4 }, { stateId: 'a', likelihood: 0.6 }]]
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.failure.code).toBe('duplicate_calibrated_evidence_likelihood_state');

    for (const bad of [Number.NaN, -1e-12, 1 + 1e-12]) {
      const invalid = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), {
        ...request([[0.4, 0.6]]),
        evidenceLikelihoods: [[{ stateId: 'a', likelihood: bad }, { stateId: 'b', likelihood: 0.6 }]]
      });
      expect(invalid.ok).toBe(false);
      if (!invalid.ok) expect(invalid.failure.code).toBe('invalid_calibrated_evidence_likelihood');
    }
  });

  it('is invariant to likelihood-row ordering and transition splitting while retaining terminal self-retention', () => {
    const base = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), request([[0.7, 0.2], [0.4, 0.9]])));
    const reorderedReq = request([[0.7, 0.2], [0.4, 0.9]]);
    reorderedReq.evidenceLikelihoods = reorderedReq.evidenceLikelihoods.map((row) => [...row].reverse());
    reorderedReq.initialDistribution = [...reorderedReq.initialDistribution].reverse();
    const reordered = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), reorderedReq));
    expect(reordered.logLikelihood).toBeCloseTo(base.logLikelihood!, 12);

    const split: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.4 },
        { from: 'a', to: 'a', probability: 0.42 },
        { from: 'a', to: 'b', probability: 0.18 },
        { from: 'b', to: 'a', probability: 0.27 },
        { from: 'b', to: 'b', probability: 0.73 }
      ]
    };
    const splitResult = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(split, request([[0.7, 0.2], [0.4, 0.9]])));
    expect(splitResult.logLikelihood).toBeCloseTo(base.logLikelihood!, 12);

    const terminalModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }],
      transitions: []
    };
    const terminal = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(terminalModel, {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      evidenceLikelihoods: [[{ stateId: 'a', likelihood: 0.8 }], [{ stateId: 'a', likelihood: 0.5 }]]
    }));
    expect(terminal.logLikelihood).toBeCloseTo(Math.log(0.4), 15);
    expect(expectedCount(terminal.expectedTransitionCounts, 'a', 'a')).toBeCloseTo(1, 15);
  });

  it('has no pairwise steps for one evidence time and rejects forged non-finite serialization', () => {
    const one = requireSuccess(conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model(), request([[0.7, 0.2]])));
    expect(one.pairwiseSteps).toEqual([]);
    expect(one.expectedTransitionCounts?.every((entry) => entry.expectedCount === 0)).toBe(true);

    const forged = {
      ...one,
      combinedEvidenceProbability: Number.NaN
    } as FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningResult;
    expect(() => finiteHiddenStateCalibratedEvidenceLikelihoodConditioningResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
