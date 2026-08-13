import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  EvidenceBundleCandidateLikelihood,
  FiniteIndependentEvidenceBundleInferenceRequest,
  FiniteIndependentEvidenceBundleInferenceResult,
  FirstPassageEvidenceCandidateBinding,
  HiddenObservationEvidenceBlock,
  HiddenObservationEvidenceCandidateBinding,
  FirstPassageExactHitEvidenceBlock,
  finiteIndependentEvidenceBundleInferenceResultToJson,
  inferFiniteIndependentEvidenceBundleCandidates
} from '../src/independent_evidence_bundle_inference';

const INDEPENDENCE = 'evidence_blocks_conditionally_independent_given_candidate' as const;

function requireSuccess(result: FiniteIndependentEvidenceBundleInferenceResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function evaluation(
  result: ReturnType<typeof requireSuccess>,
  candidateId: string
): EvidenceBundleCandidateLikelihood {
  const found = result.evaluations.find((item) => item.candidateId === candidateId);
  if (found === undefined) throw new Error(`missing candidate evaluation ${candidateId}`);
  return found;
}

function transitionProbability(model: DefinitionModel, from: StateId, to: StateId): number {
  const state = model.states.find((entry) => entry.id === from);
  if (state !== undefined && isTerminalState(state)) return from === to ? 1 : 0;
  return model.transitions
    .filter((edge) => edge.from === from && edge.to === to)
    .reduce((sum, edge) => sum + evaluateProbabilitySpec(edge.probability), 0);
}

function hiddenBinding(
  candidateId: string,
  redA: number,
  redB: number
): HiddenObservationEvidenceCandidateBinding {
  return {
    candidateId,
    model: {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.8 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.3 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    },
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
    ]
  };
}

function hiddenInitialProbability(
  binding: HiddenObservationEvidenceCandidateBinding,
  stateId: StateId
): number {
  return binding.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function hiddenEmissionProbability(
  binding: HiddenObservationEvidenceCandidateBinding,
  stateId: StateId,
  symbol: string
): number {
  return binding.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function hiddenPathEnumerationProbability(
  binding: HiddenObservationEvidenceCandidateBinding,
  observations: string[]
): number {
  const stateIds = binding.model.states.map((state) => state.id);
  let total = 0;
  const visit = (path: StateId[]): void => {
    if (path.length === observations.length) {
      let probability = hiddenInitialProbability(binding, path[0]!);
      probability *= hiddenEmissionProbability(binding, path[0]!, observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        probability *= transitionProbability(binding.model, path[step - 1]!, path[step]!);
        probability *= hiddenEmissionProbability(binding, path[step]!, observations[step]!);
      }
      total += probability;
      return;
    }
    for (const stateId of stateIds) visit([...path, stateId]);
  };
  visit([]);
  return total;
}

function hiddenDenseForwardProbability(
  binding: HiddenObservationEvidenceCandidateBinding,
  observations: string[]
): number {
  const stateIds = binding.model.states.map((state) => state.id).sort();
  let mass = stateIds.map((stateId) => hiddenInitialProbability(binding, stateId));
  for (let step = 0; step < observations.length; step += 1) {
    if (step > 0) {
      const next = stateIds.map(() => 0);
      for (let from = 0; from < stateIds.length; from += 1) {
        for (let to = 0; to < stateIds.length; to += 1) {
          next[to] =
            next[to]! +
            mass[from]! * transitionProbability(binding.model, stateIds[from]!, stateIds[to]!);
        }
      }
      mass = next;
    }
    const symbol = observations[step]!;
    mass = mass.map(
      (probability, index) =>
        probability * hiddenEmissionProbability(binding, stateIds[index]!, symbol)
    );
  }
  return mass.reduce((sum, value) => sum + value, 0);
}

function geometricBinding(
  candidateId: string,
  stayProbability: number
): FirstPassageEvidenceCandidateBinding {
  return {
    candidateId,
    model: {
      startState: 's',
      states: [{ id: 's' }, { id: 'hit', terminal: true }],
      transitions: [
        { from: 's', to: 's', probability: stayProbability },
        { from: 's', to: 'hit', probability: 1 - stayProbability }
      ]
    },
    initialDistribution: [{ stateId: 's', probability: 1 }],
    targetStates: ['hit']
  };
}

function firstPassagePathProbability(
  binding: FirstPassageEvidenceCandidateBinding,
  observation:
    | { kind: 'exact_hit_at_step'; step: number }
    | { kind: 'not_hit_by_horizon'; horizon: number }
): number {
  const targets = new Set(binding.targetStates);
  const terminal = new Set(
    binding.model.states.filter((state) => state.terminal === true).map((state) => state.id)
  );
  const horizon = observation.kind === 'exact_hit_at_step' ? observation.step : observation.horizon;
  let active: Array<{ stateId: StateId; probability: number }> = [];
  let initialHit = 0;
  for (const entry of binding.initialDistribution) {
    if (targets.has(entry.stateId)) initialHit += entry.probability;
    else active.push({ ...entry });
  }
  if (horizon === 0) {
    return observation.kind === 'exact_hit_at_step'
      ? initialHit
      : active.reduce((sum, path) => sum + path.probability, 0);
  }
  for (let step = 1; step <= horizon; step += 1) {
    const next: Array<{ stateId: StateId; probability: number }> = [];
    let hit = 0;
    for (const path of active) {
      if (terminal.has(path.stateId)) {
        next.push(path);
        continue;
      }
      for (const edge of binding.model.transitions.filter((item) => item.from === path.stateId)) {
        const probability = path.probability * evaluateProbabilitySpec(edge.probability);
        if (targets.has(edge.to)) hit += probability;
        else next.push({ stateId: edge.to, probability });
      }
    }
    active = next;
    if (observation.kind === 'exact_hit_at_step' && step === observation.step) return hit;
  }
  return active.reduce((sum, path) => sum + path.probability, 0);
}

function firstPassageDenseKilledProbability(
  binding: FirstPassageEvidenceCandidateBinding,
  observation:
    | { kind: 'exact_hit_at_step'; step: number }
    | { kind: 'not_hit_by_horizon'; horizon: number }
): number {
  const states = binding.model.states.map((state) => state.id).sort();
  const targets = new Set(binding.targetStates);
  const terminal = new Set(
    binding.model.states.filter((state) => state.terminal === true).map((state) => state.id)
  );
  let mass = states.map((stateId) =>
    targets.has(stateId)
      ? 0
      : binding.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0
  );
  const initialHit = binding.initialDistribution
    .filter((entry) => targets.has(entry.stateId))
    .reduce((sum, entry) => sum + entry.probability, 0);
  const horizon = observation.kind === 'exact_hit_at_step' ? observation.step : observation.horizon;
  if (horizon === 0) {
    return observation.kind === 'exact_hit_at_step'
      ? initialHit
      : mass.reduce((sum, value) => sum + value, 0);
  }
  for (let step = 1; step <= horizon; step += 1) {
    let hit = 0;
    const next = states.map(() => 0);
    for (let from = 0; from < states.length; from += 1) {
      const fromId = states[from]!;
      if (targets.has(fromId)) continue;
      if (terminal.has(fromId)) {
        next[from] = next[from]! + mass[from]!;
        continue;
      }
      for (const edge of binding.model.transitions.filter((item) => item.from === fromId)) {
        const contribution = mass[from]! * evaluateProbabilitySpec(edge.probability);
        if (targets.has(edge.to)) hit += contribution;
        else {
          const to = states.indexOf(edge.to);
          next[to] = next[to]! + contribution;
        }
      }
    }
    mass = next;
    if (observation.kind === 'exact_hit_at_step' && step === observation.step) return hit;
  }
  return mass.reduce((sum, value) => sum + value, 0);
}

function oneStateHiddenBinding(
  candidateId: string,
  rareProbability: number
): HiddenObservationEvidenceCandidateBinding {
  return {
    candidateId,
    model: { startState: 's', states: [{ id: 's', terminal: true }], transitions: [] },
    initialDistribution: [{ stateId: 's', probability: 1 }],
    alphabet: ['rare', 'other'],
    kernel: [
      { stateId: 's', symbol: 'rare', probability: rareProbability },
      { stateId: 's', symbol: 'other', probability: 1 - rareProbability }
    ]
  };
}

function mixedRequest(): FiniteIndependentEvidenceBundleInferenceRequest {
  return {
    candidates: [
      { candidateId: 'b', value: 400 },
      { candidateId: 'a', value: 700 }
    ],
    evidenceBlocks: [
      {
        blockId: 'hidden-episode',
        kind: 'hidden_observation_sequence',
        observations: ['red', 'blue', 'red'],
        candidates: [hiddenBinding('b', 0.5, 0.6), hiddenBinding('a', 0.9, 0.2)]
      },
      {
        blockId: 'passage-episode',
        kind: 'first_passage_exact_hit',
        step: 3,
        candidates: [geometricBinding('b', 0.4), geometricBinding('a', 0.7)]
      }
    ],
    independenceAssumption: INDEPENDENCE
  };
}

function requireMixedBlocks(request: FiniteIndependentEvidenceBundleInferenceRequest): {
  hidden: HiddenObservationEvidenceBlock;
  passage: FirstPassageExactHitEvidenceBlock;
} {
  const hidden = request.evidenceBlocks.find(
    (block): block is HiddenObservationEvidenceBlock => block.kind === 'hidden_observation_sequence'
  );
  const passage = request.evidenceBlocks.find(
    (block): block is FirstPassageExactHitEvidenceBlock => block.kind === 'first_passage_exact_hit'
  );
  if (hidden === undefined || passage === undefined) throw new Error('mixed request blocks missing');
  return { hidden, passage };
}

describe('Candidate K finite independent evidence-bundle candidate inference', () => {
  it('matches independent path-enumeration and dense oracles for a mixed F/G evidence bundle', () => {
    const request = mixedRequest();
    const { hidden, passage } = requireMixedBlocks(request);
    const result = requireSuccess(inferFiniteIndependentEvidenceBundleCandidates(request));

    const oracleJoint = new Map<string, number>();
    for (const candidateId of ['a', 'b']) {
      const hiddenBindingValue = hidden.candidates.find((item) => item.candidateId === candidateId)!;
      const passageBindingValue = passage.candidates.find((item) => item.candidateId === candidateId)!;
      const hiddenPath = hiddenPathEnumerationProbability(hiddenBindingValue, hidden.observations);
      const hiddenDense = hiddenDenseForwardProbability(hiddenBindingValue, hidden.observations);
      const passageObservation = { kind: 'exact_hit_at_step', step: passage.step } as const;
      const passagePath = firstPassagePathProbability(passageBindingValue, passageObservation);
      const passageDense = firstPassageDenseKilledProbability(passageBindingValue, passageObservation);
      expect(hiddenPath).toBeCloseTo(hiddenDense, 14);
      expect(passagePath).toBeCloseTo(passageDense, 14);
      const joint = hiddenPath * passagePath;
      oracleJoint.set(candidateId, joint);
      const actual = evaluation(result, candidateId);
      expect(actual.jointProbability).toBeCloseTo(joint, 14);
      expect(actual.totalLogLikelihood).toBeCloseTo(Math.log(hiddenPath) + Math.log(passagePath), 14);
    }
    expect(result.selectedCandidateIds).toEqual([
      oracleJoint.get('a')! > oracleJoint.get('b')! ? 'a' : 'b'
    ]);
    expect(result.diagnostics.independenceEmpiricallyVerified).toBe(false);
    expect(result.diagnostics.posteriorNormalizationApplied).toBe(false);
  });

  it('is invariant to evidence-block, candidate-family, and block-binding order while preserving values', () => {
    const request = mixedRequest();
    const baseline = requireSuccess(inferFiniteIndependentEvidenceBundleCandidates(request));
    const reorderedBlocks = [...request.evidenceBlocks].reverse().map((block) => {
      if (block.kind === 'hidden_observation_sequence') {
        return { ...block, candidates: [...block.candidates].reverse() };
      }
      if (block.kind === 'first_passage_exact_hit') {
        return { ...block, candidates: [...block.candidates].reverse() };
      }
      return { ...block, candidates: [...block.candidates].reverse() };
    });
    const reordered = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        ...request,
        candidates: [...request.candidates].reverse(),
        evidenceBlocks: reorderedBlocks
      })
    );
    expect(reordered).toEqual(baseline);
  });

  it('treats a likelihood-one evidence block as neutral', () => {
    const request = mixedRequest();
    const baseline = requireSuccess(inferFiniteIndependentEvidenceBundleCandidates(request));
    const extended = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        ...request,
        evidenceBlocks: [
          ...request.evidenceBlocks,
          {
            blockId: 'neutral',
            kind: 'hidden_observation_sequence',
            observations: ['rare'],
            candidates: [oneStateHiddenBinding('a', 1), oneStateHiddenBinding('b', 1)]
          }
        ]
      })
    );
    expect(extended.selectedCandidateIds).toEqual(baseline.selectedCandidateIds);
    for (const candidateId of ['a', 'b']) {
      expect(evaluation(extended, candidateId).totalLogLikelihood).toBeCloseTo(
        evaluation(baseline, candidateId).totalLogLikelihood!,
        14
      );
    }
  });

  it('preserves selection when every candidate receives the same finite likelihood factor', () => {
    const request = mixedRequest();
    const baseline = requireSuccess(inferFiniteIndependentEvidenceBundleCandidates(request));
    const extended = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        ...request,
        evidenceBlocks: [
          ...request.evidenceBlocks,
          {
            blockId: 'common-factor',
            kind: 'hidden_observation_sequence',
            observations: ['rare'],
            candidates: [oneStateHiddenBinding('a', 0.5), oneStateHiddenBinding('b', 0.5)]
          }
        ]
      })
    );
    expect(extended.selectedCandidateIds).toEqual(baseline.selectedCandidateIds);
    for (const candidateId of ['a', 'b']) {
      expect(evaluation(extended, candidateId).totalLogLikelihood).toBeCloseTo(
        evaluation(baseline, candidateId).totalLogLikelihood! + Math.log(0.5),
        14
      );
    }
  });

  it('propagates mathematical impossibility with block provenance instead of silently dropping a candidate', () => {
    const result = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        candidates: [{ candidateId: 'a' }, { candidateId: 'b' }],
        evidenceBlocks: [
          {
            blockId: 'hidden-zero',
            kind: 'hidden_observation_sequence',
            observations: ['rare'],
            candidates: [oneStateHiddenBinding('a', 0), oneStateHiddenBinding('b', 0.5)]
          },
          {
            blockId: 'passage',
            kind: 'first_passage_exact_hit',
            step: 1,
            candidates: [geometricBinding('a', 0.5), geometricBinding('b', 0.5)]
          }
        ],
        independenceAssumption: INDEPENDENCE
      })
    );
    expect(result.selectedCandidateIds).toEqual(['b']);
    expect(evaluation(result, 'a').possible).toBe(false);
    expect(evaluation(result, 'a').impossibleBlockIds).toEqual(['hidden-zero']);
    expect(evaluation(result, 'a').totalLogLikelihood).toBeNull();
  });

  it('classifies all candidates impossible without fabricating a winner', () => {
    const result = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        candidates: [{ candidateId: 'a' }, { candidateId: 'b' }],
        evidenceBlocks: [
          {
            blockId: 'zero-a',
            kind: 'hidden_observation_sequence',
            observations: ['rare'],
            candidates: [oneStateHiddenBinding('a', 0), oneStateHiddenBinding('b', 0.5)]
          },
          {
            blockId: 'zero-b',
            kind: 'hidden_observation_sequence',
            observations: ['rare'],
            candidates: [oneStateHiddenBinding('a', 0.5), oneStateHiddenBinding('b', 0)]
          }
        ],
        independenceAssumption: INDEPENDENCE
      })
    );
    expect(result.classification).toBe('all_candidates_impossible');
    expect(result.selectedCandidateIds).toEqual([]);
    expect(result.bestLogLikelihood).toBeNull();
    expect(evaluation(result, 'a').impossibleBlockIds).toEqual(['zero-a']);
    expect(evaluation(result, 'b').impossibleBlockIds).toEqual(['zero-b']);
  });

  it('preserves a complete exact joint-likelihood tie and top-level candidate scalar values', () => {
    const result = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        candidates: [
          { candidateId: 'z', value: 'right' },
          { candidateId: 'a', value: 'left' }
        ],
        evidenceBlocks: [
          {
            blockId: 'h',
            kind: 'hidden_observation_sequence',
            observations: ['rare', 'rare'],
            candidates: [oneStateHiddenBinding('z', 0.75), oneStateHiddenBinding('a', 0.75)]
          },
          {
            blockId: 'p',
            kind: 'first_passage_not_hit_by_horizon',
            horizon: 4,
            candidates: [geometricBinding('z', 0.6), geometricBinding('a', 0.6)]
          }
        ],
        independenceAssumption: INDEPENDENCE
      })
    );
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['a', 'z']);
    expect(result.selectedCandidates).toEqual([
      { candidateId: 'a', value: 'left' },
      { candidateId: 'z', value: 'right' }
    ]);
  });

  it('keeps ranking in log space when direct joint probabilities underflow to zero', () => {
    const blocks = Array.from({ length: 10 }, (_, index) => ({
      blockId: `rare-${String(index).padStart(2, '0')}`,
      kind: 'hidden_observation_sequence' as const,
      observations: ['rare'],
      candidates: [oneStateHiddenBinding('a', 1e-100), oneStateHiddenBinding('b', 1e-110)]
    }));
    const result = requireSuccess(
      inferFiniteIndependentEvidenceBundleCandidates({
        candidates: [{ candidateId: 'b' }, { candidateId: 'a' }],
        evidenceBlocks: blocks,
        independenceAssumption: INDEPENDENCE
      })
    );
    expect(evaluation(result, 'a').jointProbability).toBe(0);
    expect(evaluation(result, 'b').jointProbability).toBe(0);
    expect(evaluation(result, 'a').jointProbabilityUnderflowed).toBe(true);
    expect(evaluation(result, 'b').jointProbabilityUnderflowed).toBe(true);
    expect(evaluation(result, 'a').totalLogLikelihood).toBeCloseTo(10 * Math.log(1e-100), 10);
    expect(evaluation(result, 'b').totalLogLikelihood).toBeCloseTo(10 * Math.log(1e-110), 10);
    expect(result.selectedCandidateIds).toEqual(['a']);
  });

  it('requires the explicit conditional-independence declaration', () => {
    const request = mixedRequest();
    const result = inferFiniteIndependentEvidenceBundleCandidates({
      ...request,
      independenceAssumption: 'wrong' as typeof INDEPENDENCE
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.failure.code).toBe('invalid_independence_assumption');
  });

  it('rejects missing, unknown, and duplicate candidate bindings in evidence blocks', () => {
    const base = mixedRequest();
    const { hidden } = requireMixedBlocks(base);
    const missing = inferFiniteIndependentEvidenceBundleCandidates({
      ...base,
      evidenceBlocks: [{ ...hidden, candidates: [hidden.candidates[0]!] }]
    });
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.failure.code).toBe('invalid_block_candidate_bindings');

    const unknown = inferFiniteIndependentEvidenceBundleCandidates({
      ...base,
      evidenceBlocks: [
        {
          ...hidden,
          candidates: [hidden.candidates[0]!, { ...hidden.candidates[1]!, candidateId: 'x' }]
        }
      ]
    });
    expect(unknown.ok).toBe(false);
    if (!unknown.ok) expect(unknown.failure.code).toBe('invalid_block_candidate_bindings');

    const duplicate = inferFiniteIndependentEvidenceBundleCandidates({
      ...base,
      evidenceBlocks: [{ ...hidden, candidates: [hidden.candidates[0]!, hidden.candidates[0]!] }]
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.failure.code).toBe('invalid_block_candidate_bindings');
  });

  it('propagates channel-specific validation failures explicitly', () => {
    const invalid = hiddenBinding('a', 0.8, 0.2);
    invalid.model = { ...invalid.model, transitions: [] };
    const result = inferFiniteIndependentEvidenceBundleCandidates({
      candidates: [{ candidateId: 'a' }],
      evidenceBlocks: [
        {
          blockId: 'bad-hidden',
          kind: 'hidden_observation_sequence',
          observations: ['red'],
          candidates: [invalid]
        }
      ],
      independenceAssumption: INDEPENDENCE
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.failure.code).toBe('block_evaluation_failed');
    expect(result.failure.blockId).toBe('bad-hidden');
    expect(result.failure.hiddenObservationFailure).toBeDefined();
  });

  it('enforces candidate/block resource limits and finite candidate scalar values', () => {
    const request = mixedRequest();
    const tooManyCandidates = inferFiniteIndependentEvidenceBundleCandidates(request, {
      maxCandidates: 1
    });
    expect(tooManyCandidates.ok).toBe(false);
    if (!tooManyCandidates.ok) {
      expect(tooManyCandidates.failure.code).toBe('candidate_count_exceeds_limit');
    }
    const tooManyBlocks = inferFiniteIndependentEvidenceBundleCandidates(request, {
      maxEvidenceBlocks: 1
    });
    expect(tooManyBlocks.ok).toBe(false);
    if (!tooManyBlocks.ok) {
      expect(tooManyBlocks.failure.code).toBe('evidence_block_count_exceeds_limit');
    }
    const nonFiniteValue = inferFiniteIndependentEvidenceBundleCandidates({
      ...request,
      candidates: [{ candidateId: 'a', value: Number.POSITIVE_INFINITY }, { candidateId: 'b' }]
    });
    expect(nonFiniteValue.ok).toBe(false);
    if (!nonFiniteValue.ok) expect(nonFiniteValue.failure.code).toBe('invalid_candidate_value');
  });

  it('produces deterministic JSON and rejects forged non-finite serialization', () => {
    const result = requireSuccess(inferFiniteIndependentEvidenceBundleCandidates(mixedRequest()));
    expect(finiteIndependentEvidenceBundleInferenceResultToJson(result)).toBe(JSON.stringify(result));
    expect(() =>
      finiteIndependentEvidenceBundleInferenceResultToJson({
        ...result,
        bestLogLikelihood: Number.NaN
      })
    ).toThrow(/non-finite numeric value/);
  });
});
