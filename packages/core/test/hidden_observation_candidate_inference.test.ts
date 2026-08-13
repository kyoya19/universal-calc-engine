import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenObservationCandidate,
  FiniteHiddenObservationCandidateInferenceResult,
  HiddenObservationCandidateValue,
  finiteHiddenObservationCandidateInferenceResultToJson,
  inferFiniteHiddenObservationCandidates
} from '../src/hidden_observation_candidate_inference';

function model(split = false): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: split
      ? [
          { from: 'a', to: 'a', probability: 0.4 },
          { from: 'a', to: 'a', probability: 0.4 },
          { from: 'a', to: 'b', probability: 0.2 },
          { from: 'b', to: 'a', probability: 0.3 },
          { from: 'b', to: 'b', probability: 0.7 }
        ]
      : [
          { from: 'a', to: 'a', probability: 0.8 },
          { from: 'a', to: 'b', probability: 0.2 },
          { from: 'b', to: 'a', probability: 0.3 },
          { from: 'b', to: 'b', probability: 0.7 }
        ]
  };
}

function candidate(
  candidateId: string,
  redA: number,
  redB: number,
  value?: HiddenObservationCandidateValue,
  candidateModel: DefinitionModel = model()
): FiniteHiddenObservationCandidate {
  return {
    candidateId,
    model: candidateModel,
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: redA },
      { stateId: 'a', symbol: 'blue', probability: 1 - redA },
      { stateId: 'b', symbol: 'red', probability: redB },
      { stateId: 'b', symbol: 'blue', probability: 1 - redB }
    ],
    ...(value !== undefined ? { value } : {})
  };
}

function requireSuccess(result: FiniteHiddenObservationCandidateInferenceResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(candidateValue: FiniteHiddenObservationCandidate, stateId: StateId): number {
  return candidateValue.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emissionProbability(
  candidateValue: FiniteHiddenObservationCandidate,
  stateId: StateId,
  symbol: string
): number {
  return candidateValue.kernel.find(
    (entry) => entry.stateId === stateId && entry.symbol === symbol
  )?.probability ?? 0;
}

function transitionProbability(
  candidateValue: FiniteHiddenObservationCandidate,
  from: StateId,
  to: StateId
): number {
  const state = candidateValue.model.states.find((entry) => entry.id === from);
  if (state !== undefined && isTerminalState(state)) return from === to ? 1 : 0;
  return candidateValue.model.transitions
    .filter((edge) => edge.from === from && edge.to === to)
    .reduce((sum, edge) => sum + evaluateProbabilitySpec(edge.probability), 0);
}

function hiddenPathEnumerationProbability(
  candidateValue: FiniteHiddenObservationCandidate,
  observations: string[]
): number {
  const stateIds = candidateValue.model.states.map((state) => state.id);
  let total = 0;
  const visit = (path: StateId[]): void => {
    if (path.length === observations.length) {
      let probability = initialProbability(candidateValue, path[0]!);
      probability *= emissionProbability(candidateValue, path[0]!, observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        probability *= transitionProbability(candidateValue, path[step - 1]!, path[step]!);
        probability *= emissionProbability(candidateValue, path[step]!, observations[step]!);
      }
      total += probability;
      return;
    }
    for (const stateId of stateIds) visit([...path, stateId]);
  };
  visit([]);
  return total;
}

function denseForwardProbability(
  candidateValue: FiniteHiddenObservationCandidate,
  observations: string[]
): number {
  const stateIds = candidateValue.model.states.map((state) => state.id).sort();
  const index = new Map(stateIds.map((stateId, i) => [stateId, i]));
  const transition = stateIds.map(() => stateIds.map(() => 0));
  for (const fromState of candidateValue.model.states) {
    const from = index.get(fromState.id)!;
    if (isTerminalState(fromState)) {
      transition[from]![from] = 1;
      continue;
    }
    for (const edge of candidateValue.model.transitions.filter((item) => item.from === fromState.id)) {
      const to = index.get(edge.to)!;
      transition[from]![to] = transition[from]![to]! + evaluateProbabilitySpec(edge.probability);
    }
  }

  let mass = stateIds.map((stateId) => initialProbability(candidateValue, stateId));
  for (let step = 0; step < observations.length; step += 1) {
    if (step > 0) {
      const next = stateIds.map(() => 0);
      for (let from = 0; from < stateIds.length; from += 1) {
        for (let to = 0; to < stateIds.length; to += 1) {
          next[to] = next[to]! + mass[from]! * transition[from]![to]!;
        }
      }
      mass = next;
    }
    const symbol = observations[step]!;
    mass = mass.map(
      (probability, i) => probability * emissionProbability(candidateValue, stateIds[i]!, symbol)
    );
  }
  return mass.reduce((sum, probability) => sum + probability, 0);
}

function oneStateCandidate(candidateId: string, rareProbability: number): FiniteHiddenObservationCandidate {
  return {
    candidateId,
    model: {
      startState: 's',
      states: [{ id: 's', terminal: true }],
      transitions: []
    },
    initialDistribution: [{ stateId: 's', probability: 1 }],
    alphabet: ['rare', 'other'],
    kernel: [
      { stateId: 's', symbol: 'rare', probability: rareProbability },
      { stateId: 's', symbol: 'other', probability: 1 - rareProbability }
    ]
  };
}

describe('Candidate F hidden-observation finite-candidate inference', () => {
  it('matches independent hidden-path and dense-forward oracles and selects the maximum likelihood candidate', () => {
    const observations = ['red', 'blue', 'red'];
    const strong = candidate('strong', 0.9, 0.2, 0.9);
    const weak = candidate('weak', 0.4, 0.7, 0.4);
    const strongEnumeration = hiddenPathEnumerationProbability(strong, observations);
    const weakEnumeration = hiddenPathEnumerationProbability(weak, observations);
    expect(strongEnumeration).toBeCloseTo(denseForwardProbability(strong, observations), 14);
    expect(weakEnumeration).toBeCloseTo(denseForwardProbability(weak, observations), 14);

    const result = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [weak, strong],
      observations
    }));
    for (const evaluation of result.evaluations) {
      const expected = evaluation.candidateId === 'strong' ? strongEnumeration : weakEnumeration;
      expect(evaluation.sequenceProbability).toBeCloseTo(expected, 14);
      expect(evaluation.logLikelihood).toBeCloseTo(Math.log(expected), 14);
    }
    const expectedWinner = strongEnumeration > weakEnumeration ? 'strong' : 'weak';
    expect(result.classification).toBe('unique_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual([expectedWinner]);
  });

  it('preserves an exact likelihood tie and candidate scalar values', () => {
    const left = candidate('left', 0.8, 0.3, 0.6);
    const right = candidate('right', 0.8, 0.3, 0.7);
    const result = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [right, left],
      observations: ['red', 'red']
    }));
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['left', 'right']);
    expect(result.selectedCandidates).toEqual([
      { candidateId: 'left', value: 0.6 },
      { candidateId: 'right', value: 0.7 }
    ]);
    expect(result.diagnostics.candidatePosteriorComputed).toBe(false);
    expect(result.diagnostics.globalModelIdentificationClaimed).toBe(false);
  });

  it('classifies all candidates impossible without fabricating a winner', () => {
    const impossible = (candidateId: string): FiniteHiddenObservationCandidate => ({
      candidateId,
      model: { startState: 's', states: [{ id: 's', terminal: true }], transitions: [] },
      initialDistribution: [{ stateId: 's', probability: 1 }],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 's', symbol: 'red', probability: 0 },
        { stateId: 's', symbol: 'blue', probability: 1 }
      ]
    });
    const result = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [impossible('b'), impossible('a')],
      observations: ['red']
    }));
    expect(result.classification).toBe('all_candidates_impossible');
    expect(result.bestLogLikelihood).toBeNull();
    expect(result.selectedCandidateIds).toEqual([]);
    expect(result.evaluations.every((entry) => !entry.possible && entry.sequenceProbability === 0)).toBe(true);
  });

  it('uses log likelihood so direct probability underflow does not alter candidate ranking', () => {
    const observations = Array.from({ length: 1000 }, () => 'rare');
    const result = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [oneStateCandidate('p005', 0.005), oneStateCandidate('p01', 0.01)],
      observations
    }));
    expect(result.evaluations.every((entry) => entry.possible)).toBe(true);
    expect(result.evaluations.every((entry) => entry.sequenceProbability === null)).toBe(true);
    expect(result.evaluations.every((entry) => entry.sequenceProbabilityUnderflowed)).toBe(true);
    expect(result.selectedCandidateIds).toEqual(['p01']);
    expect(result.diagnostics.rankingBasis).toBe('finite_log_likelihood');
  });

  it('is invariant to candidate input order', () => {
    const candidates = [candidate('z', 0.3, 0.2), candidate('a', 0.8, 0.6), candidate('m', 0.5, 0.4)];
    const forward = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates,
      observations: ['red', 'blue']
    }));
    const reverse = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [...candidates].reverse(),
      observations: ['red', 'blue']
    }));
    expect(finiteHiddenObservationCandidateInferenceResultToJson(forward))
      .toBe(finiteHiddenObservationCandidateInferenceResultToJson(reverse));
  });

  it('is invariant to split parallel transitions with the same aggregate probability', () => {
    const unsplit = candidate('same', 0.8, 0.3, undefined, model(false));
    const split = candidate('same', 0.8, 0.3, undefined, model(true));
    const first = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [unsplit, candidate('other', 0.4, 0.4)],
      observations: ['red', 'blue', 'red']
    }));
    const second = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [split, candidate('other', 0.4, 0.4)],
      observations: ['red', 'blue', 'red']
    }));
    expect(first.selectedCandidateIds).toEqual(second.selectedCandidateIds);
    const a = first.evaluations.find((entry) => entry.candidateId === 'same')!;
    const b = second.evaluations.find((entry) => entry.candidateId === 'same')!;
    expect(a.logLikelihood).toBeCloseTo(b.logLikelihood!, 12);
  });

  it('uses comparisonTolerance to preserve near-equal maximum-likelihood ambiguity', () => {
    const result = requireSuccess(inferFiniteHiddenObservationCandidates(
      {
        candidates: [oneStateCandidate('a', 0.5), oneStateCandidate('b', 0.5000000000001)],
        observations: ['rare']
      },
      { comparisonTolerance: 1e-12 }
    ));
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['a', 'b']);
  });

  it('returns candidate-specific validation failure rather than dropping an invalid candidate', () => {
    const invalid = candidate('invalid', 0.8, 0.3);
    invalid.kernel = invalid.kernel.filter((entry) => !(entry.stateId === 'b' && entry.symbol === 'blue'));
    const result = inferFiniteHiddenObservationCandidates({
      candidates: [candidate('valid', 0.8, 0.3), invalid],
      observations: ['red']
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('candidate_evaluation_failed');
    expect(result.failure.candidateId).toBe('invalid');
    expect(result.failure.candidateFailure?.code).toBe('kernel_row_total');
  });

  it('rejects empty and duplicate candidate families plus invalid scalar values', () => {
    expect(inferFiniteHiddenObservationCandidates({ candidates: [], observations: ['red'] })).toMatchObject({
      ok: false,
      failure: { code: 'invalid_candidate_family' }
    });
    const duplicate = candidate('dup', 0.8, 0.3);
    expect(inferFiniteHiddenObservationCandidates({
      candidates: [duplicate, { ...duplicate }],
      observations: ['red']
    })).toMatchObject({ ok: false, failure: { code: 'duplicate_candidate_id' } });
    const bad = candidate('bad', 0.8, 0.3);
    bad.value = ({ bad: true } as unknown) as HiddenObservationCandidateValue;
    expect(inferFiniteHiddenObservationCandidates({ candidates: [bad], observations: ['red'] }))
      .toMatchObject({ ok: false, failure: { code: 'invalid_candidate_value' } });
  });

  it('enforces resource and option boundaries explicitly', () => {
    expect(inferFiniteHiddenObservationCandidates({
      candidates: [candidate('a', 0.8, 0.3), candidate('b', 0.7, 0.4)],
      observations: ['red']
    }, { maxCandidates: 1 })).toMatchObject({
      ok: false,
      failure: { code: 'candidate_count_exceeds_limit' }
    });
    expect(inferFiniteHiddenObservationCandidates({
      candidates: [candidate('a', 0.8, 0.3)],
      observations: ['red']
    }, { comparisonTolerance: Number.NaN })).toMatchObject({
      ok: false,
      failure: { code: 'invalid_options' }
    });
  });

  it('serializes deterministically and rejects forged non-finite results', () => {
    const result = requireSuccess(inferFiniteHiddenObservationCandidates({
      candidates: [candidate('a', 0.8, 0.3)],
      observations: ['red']
    }));
    const json = finiteHiddenObservationCandidateInferenceResultToJson(result);
    expect(JSON.parse(json)).toEqual(result);
    const forged = {
      ...result,
      bestLogLikelihood: Number.POSITIVE_INFINITY
    } as FiniteHiddenObservationCandidateInferenceResult;
    expect(() => finiteHiddenObservationCandidateInferenceResultToJson(forged)).toThrow(/non-finite/);
  });
});
