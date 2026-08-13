import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteSameTrajectoryJointCandidate,
  FiniteSameTrajectoryJointInferenceResult,
  SameTrajectoryFirstPassageCondition,
  finiteSameTrajectoryHiddenFirstPassageInferenceResultToJson,
  inferFiniteSameTrajectoryHiddenFirstPassageCandidates
} from '../src/same_trajectory_hidden_first_passage_joint_inference';
import { inferFiniteHiddenObservationCandidates } from '../src/hidden_observation_candidate_inference';
import { inferFiniteFirstPassageCandidates } from '../src/first_passage_candidate_inference';

function model(p = 0.25, split = false): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: split
      ? [
          { from: 'a', to: 'a', probability: (1 - p) / 2 },
          { from: 'a', to: 'a', probability: (1 - p) / 2 },
          { from: 'a', to: 'b', probability: p },
          { from: 'b', to: 'a', probability: 0.2 },
          { from: 'b', to: 'b', probability: 0.8 }
        ]
      : [
          { from: 'a', to: 'a', probability: 1 - p },
          { from: 'a', to: 'b', probability: p },
          { from: 'b', to: 'a', probability: 0.2 },
          { from: 'b', to: 'b', probability: 0.8 }
        ]
  };
}

function candidate(
  candidateId: string,
  p: number,
  redA: number,
  redB: number,
  value?: number,
  candidateModel: DefinitionModel = model(p)
): FiniteSameTrajectoryJointCandidate {
  return {
    candidateId,
    model: candidateModel,
    initialDistribution: [{ stateId: 'a', probability: 1 }],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: redA },
      { stateId: 'a', symbol: 'blue', probability: 1 - redA },
      { stateId: 'b', symbol: 'red', probability: redB },
      { stateId: 'b', symbol: 'blue', probability: 1 - redB }
    ],
    targetStates: ['b'],
    ...(value !== undefined ? { value } : {})
  };
}

function requireSuccess(result: FiniteSameTrajectoryJointInferenceResult) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function initialProbability(c: FiniteSameTrajectoryJointCandidate, stateId: StateId): number {
  return c.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emissionProbability(c: FiniteSameTrajectoryJointCandidate, stateId: StateId, symbol: string): number {
  return c.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function transitionProbability(c: FiniteSameTrajectoryJointCandidate, from: StateId, to: StateId): number {
  const state = c.model.states.find((entry) => entry.id === from);
  if (state !== undefined && isTerminalState(state)) return from === to ? 1 : 0;
  return c.model.transitions
    .filter((edge) => edge.from === from && edge.to === to)
    .reduce((sum, edge) => sum + evaluateProbabilitySpec(edge.probability), 0);
}

function pathPassageSatisfied(
  path: StateId[],
  targets: Set<StateId>,
  condition: SameTrajectoryFirstPassageCondition
): boolean {
  const firstHit = path.findIndex((stateId) => targets.has(stateId));
  if (condition.kind === 'exact_hit_at_step') return firstHit === condition.step;
  return firstHit === -1;
}

function pathEnumerationJoint(
  c: FiniteSameTrajectoryJointCandidate,
  observations: string[],
  condition: SameTrajectoryFirstPassageCondition
): number {
  const stateIds = c.model.states.map((state) => state.id);
  const targets = new Set(c.targetStates);
  let total = 0;
  const visit = (path: StateId[]): void => {
    if (path.length === observations.length) {
      if (!pathPassageSatisfied(path, targets, condition)) return;
      let probability = initialProbability(c, path[0]!);
      probability *= emissionProbability(c, path[0]!, observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        probability *= transitionProbability(c, path[step - 1]!, path[step]!);
        probability *= emissionProbability(c, path[step]!, observations[step]!);
      }
      total += probability;
      return;
    }
    for (const stateId of stateIds) visit([...path, stateId]);
  };
  visit([]);
  return total;
}

function denseMaskedForwardJoint(
  c: FiniteSameTrajectoryJointCandidate,
  observations: string[],
  condition: SameTrajectoryFirstPassageCondition
): number {
  const stateIds = c.model.states.map((state) => state.id).sort();
  const index = new Map(stateIds.map((stateId, i) => [stateId, i] as const));
  const transition = stateIds.map(() => stateIds.map(() => 0));
  for (const fromState of c.model.states) {
    const from = index.get(fromState.id)!;
    if (isTerminalState(fromState)) {
      transition[from]![from] = 1;
      continue;
    }
    for (const edge of c.model.transitions.filter((item) => item.from === fromState.id)) {
      const to = index.get(edge.to)!;
      transition[from]![to] = transition[from]![to]! + evaluateProbabilitySpec(edge.probability);
    }
  }
  const targets = new Set(c.targetStates);
  let mass = stateIds.map((stateId) => initialProbability(c, stateId));
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
    mass = mass.map((probability, i) => {
      const stateId = stateIds[i]!;
      let allowed: boolean;
      if (condition.kind === 'not_hit_by_observation_horizon') allowed = !targets.has(stateId);
      else if (step < condition.step) allowed = !targets.has(stateId);
      else if (step === condition.step) allowed = targets.has(stateId);
      else allowed = true;
      return allowed ? probability * emissionProbability(c, stateId, symbol) : 0;
    });
  }
  return mass.reduce((sum, value) => sum + value, 0);
}

function toHiddenCandidate(c: FiniteSameTrajectoryJointCandidate) {
  return {
    candidateId: c.candidateId,
    model: c.model,
    initialDistribution: c.initialDistribution,
    alphabet: c.alphabet,
    kernel: c.kernel,
    ...(c.value !== undefined ? { value: c.value } : {})
  };
}

function toPassageCandidate(c: FiniteSameTrajectoryJointCandidate) {
  return {
    candidateId: c.candidateId,
    model: c.model,
    initialDistribution: c.initialDistribution,
    targetStates: c.targetStates,
    ...(c.value !== undefined ? { value: c.value } : {})
  };
}

function rareCertainHitCandidate(candidateId: string, rare: number) : FiniteSameTrajectoryJointCandidate {
  return {
    candidateId,
    model: { startState: 's', states: [{ id: 's', terminal: true }], transitions: [] },
    initialDistribution: [{ stateId: 's', probability: 1 }],
    alphabet: ['rare', 'other'],
    kernel: [
      { stateId: 's', symbol: 'rare', probability: rare },
      { stateId: 's', symbol: 'other', probability: 1 - rare }
    ],
    targetStates: ['s']
  };
}

describe('Candidate L same-trajectory hidden-observation + first-passage joint inference', () => {
  it('matches independent path-enumeration and dense masked-forward exact-hit oracles', () => {
    const observations = ['red', 'blue', 'red'];
    const condition = { kind: 'exact_hit_at_step', step: 1 } as const;
    const left = candidate('left', 0.35, 0.8, 0.3, 0.35);
    const right = candidate('right', 0.15, 0.5, 0.9, 0.15);
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [right, left], observations, passageCondition: condition
    }));
    for (const c of [left, right]) {
      const enumeration = pathEnumerationJoint(c, observations, condition);
      expect(enumeration).toBeCloseTo(denseMaskedForwardJoint(c, observations, condition), 14);
      const evaluation = result.evaluations.find((entry) => entry.candidateId === c.candidateId)!;
      expect(evaluation.jointProbability).toBeCloseTo(enumeration, 14);
      expect(evaluation.jointLogLikelihood).toBeCloseTo(Math.log(enumeration), 14);
    }
  });

  it('matches independent path-enumeration and dense masked-forward right-censored oracles', () => {
    const observations = ['red', 'red', 'blue'];
    const condition = { kind: 'not_hit_by_observation_horizon' } as const;
    const a = candidate('a', 0.1, 0.9, 0.2);
    const b = candidate('b', 0.4, 0.7, 0.8);
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [a, b], observations, passageCondition: condition
    }));
    for (const c of [a, b]) {
      const expected = pathEnumerationJoint(c, observations, condition);
      expect(expected).toBeCloseTo(denseMaskedForwardJoint(c, observations, condition), 14);
      expect(result.evaluations.find((entry) => entry.candidateId === c.candidateId)!.jointProbability)
        .toBeCloseTo(expected, 14);
    }
  });

  it('continues conditioning on observations after an earlier exact first hit', () => {
    const c = candidate('c', 0.4, 0.9, 0.1);
    const observations = ['red', 'red', 'blue', 'red'];
    const condition = { kind: 'exact_hit_at_step', step: 1 } as const;
    const expected = pathEnumerationJoint(c, observations, condition);
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [c], observations, passageCondition: condition
    }));
    expect(result.evaluations[0]!.jointProbability).toBeCloseTo(expected, 14);
    expect(result.diagnostics.sameTrajectoryJointLikelihoodComputed).toBe(true);
    expect(result.diagnostics.naiveMarginalProductUsed).toBe(false);
  });

  it('reduces to Candidate G ranking when emissions are uninformative', () => {
    const make = (id: string, p: number): FiniteSameTrajectoryJointCandidate => candidate(id, p, 0.5, 0.5, p);
    const candidates = [make('slow', 0.1), make('fast', 0.4)];
    const observations = ['red', 'blue', 'red'];
    const condition = { kind: 'exact_hit_at_step', step: 2 } as const;
    const joint = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({ candidates, observations, passageCondition: condition }));
    const passage = inferFiniteFirstPassageCandidates({
      candidates: candidates.map(toPassageCandidate),
      observation: { kind: 'exact_hit_at_step', step: 2 }
    });
    expect(passage.ok).toBe(true);
    if (!passage.ok) return;
    expect(joint.selectedCandidateIds).toEqual(passage.selectedCandidateIds);
    const constantEmissionFactor = Math.pow(0.5, observations.length);
    for (const evaluation of joint.evaluations) {
      const marginal = passage.evaluations.find((entry) => entry.candidateId === evaluation.candidateId)!;
      expect(evaluation.jointProbability).toBeCloseTo(marginal.eventProbability! * constantEmissionFactor, 14);
    }
  });

  it('reduces to Candidate F when the passage condition is certain', () => {
    const make = (id: string, red: number): FiniteSameTrajectoryJointCandidate => ({
      candidateId: id,
      model: { startState: 's', states: [{ id: 's', terminal: true }], transitions: [] },
      initialDistribution: [{ stateId: 's', probability: 1 }],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 's', symbol: 'red', probability: red },
        { stateId: 's', symbol: 'blue', probability: 1 - red }
      ],
      targetStates: ['s']
    });
    const candidates = [make('a', 0.7), make('b', 0.3)];
    const observations = ['red', 'red'];
    const joint = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates, observations, passageCondition: { kind: 'exact_hit_at_step', step: 0 }
    }));
    const hidden = inferFiniteHiddenObservationCandidates({ candidates: candidates.map(toHiddenCandidate), observations });
    expect(hidden.ok).toBe(true);
    if (!hidden.ok) return;
    expect(joint.selectedCandidateIds).toEqual(hidden.selectedCandidateIds);
    for (const evaluation of joint.evaluations) {
      const marginal = hidden.evaluations.find((entry) => entry.candidateId === evaluation.candidateId)!;
      expect(evaluation.jointLogLikelihood).toBeCloseTo(marginal.logLikelihood!, 14);
    }
  });

  it('does not replace dependent same-trajectory evidence with naive F-times-G marginal multiplication', () => {
    const c = candidate('dependent', 0.4, 0.95, 0.05);
    const observations = ['red', 'red'];
    const condition = { kind: 'exact_hit_at_step', step: 1 } as const;
    const joint = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({ candidates: [c], observations, passageCondition: condition }));
    const hidden = inferFiniteHiddenObservationCandidates({ candidates: [toHiddenCandidate(c)], observations });
    const passage = inferFiniteFirstPassageCandidates({ candidates: [toPassageCandidate(c)], observation: condition });
    expect(hidden.ok && passage.ok).toBe(true);
    if (!hidden.ok || !passage.ok) return;
    const naive = hidden.evaluations[0]!.sequenceProbability! * passage.evaluations[0]!.eventProbability!;
    expect(Math.abs(joint.evaluations[0]!.jointProbability! - naive)).toBeGreaterThan(1e-6);
  });

  it('uses finite joint log likelihood when direct joint probabilities underflow', () => {
    const observations = Array.from({ length: 1000 }, () => 'rare');
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [rareCertainHitCandidate('p005', 0.005), rareCertainHitCandidate('p01', 0.01)],
      observations,
      passageCondition: { kind: 'exact_hit_at_step', step: 0 }
    }));
    expect(result.evaluations.every((entry) => entry.possible)).toBe(true);
    expect(result.evaluations.every((entry) => entry.jointProbability === 0)).toBe(true);
    expect(result.evaluations.every((entry) => entry.jointProbabilityUnderflowed)).toBe(true);
    expect(result.selectedCandidateIds).toEqual(['p01']);
    expect(result.diagnostics.rankingBasis).toBe('finite_joint_log_likelihood');
  });

  it('preserves complete ties and candidate scalar values', () => {
    const left = candidate('left', 0.3, 0.8, 0.2, 0.6);
    const right = candidate('right', 0.3, 0.8, 0.2, 0.7);
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [right, left],
      observations: ['red', 'blue'],
      passageCondition: { kind: 'not_hit_by_observation_horizon' }
    }));
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['left', 'right']);
    expect(result.selectedCandidates).toEqual([
      { candidateId: 'left', value: 0.6 },
      { candidateId: 'right', value: 0.7 }
    ]);
  });

  it('classifies all candidates impossible without fabricating a winner', () => {
    const impossible = candidate('a', 0, 1, 1);
    const impossible2 = candidate('b', 0, 1, 1);
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [impossible2, impossible],
      observations: ['red', 'red'],
      passageCondition: { kind: 'exact_hit_at_step', step: 1 }
    }));
    expect(result.classification).toBe('all_candidates_impossible');
    expect(result.bestLogLikelihood).toBeNull();
    expect(result.selectedCandidateIds).toEqual([]);
    expect(result.evaluations.every((entry) => !entry.possible && entry.impossibleAtStep === 1)).toBe(true);
  });

  it('is invariant to candidate order and split-parallel-transition representation', () => {
    const sameUnsplit = candidate('same', 0.3, 0.8, 0.2, undefined, model(0.3, false));
    const sameSplit = candidate('same', 0.3, 0.8, 0.2, undefined, model(0.3, true));
    const other = candidate('other', 0.1, 0.4, 0.9);
    const request = {
      observations: ['red', 'blue', 'red'],
      passageCondition: { kind: 'exact_hit_at_step', step: 2 } as const
    };
    const first = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({ candidates: [other, sameUnsplit], ...request }));
    const second = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({ candidates: [sameSplit, other], ...request }));
    expect(first.selectedCandidateIds).toEqual(second.selectedCandidateIds);
    expect(first.evaluations.find((entry) => entry.candidateId === 'same')!.jointLogLikelihood)
      .toBeCloseTo(second.evaluations.find((entry) => entry.candidateId === 'same')!.jointLogLikelihood!, 14);
  });

  it('uses comparisonTolerance to preserve near-equal ambiguity', () => {
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates(
      {
        candidates: [rareCertainHitCandidate('a', 0.5), rareCertainHitCandidate('b', 0.5000000000001)],
        observations: ['rare'],
        passageCondition: { kind: 'exact_hit_at_step', step: 0 }
      },
      { comparisonTolerance: 1e-12 }
    ));
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['a', 'b']);
  });

  it('returns candidate-specific validation failure and rejects invalid request boundaries', () => {
    const invalid = candidate('invalid', 0.3, 0.8, 0.2);
    invalid.targetStates = ['missing'];
    const validation = inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [candidate('valid', 0.3, 0.8, 0.2), invalid],
      observations: ['red'],
      passageCondition: { kind: 'not_hit_by_observation_horizon' }
    });
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.failure.code).toBe('candidate_validation_failed');
      expect(validation.failure.candidateId).toBe('invalid');
    }
    expect(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [], observations: ['red'], passageCondition: { kind: 'not_hit_by_observation_horizon' }
    })).toMatchObject({ ok: false, failure: { code: 'invalid_candidate_family' } });
    expect(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [candidate('x', 0.3, 0.8, 0.2)], observations: [], passageCondition: { kind: 'not_hit_by_observation_horizon' }
    })).toMatchObject({ ok: false, failure: { code: 'invalid_observation_sequence' } });
    expect(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [candidate('x', 0.3, 0.8, 0.2)], observations: ['red'], passageCondition: { kind: 'exact_hit_at_step', step: 1 }
    })).toMatchObject({ ok: false, failure: { code: 'invalid_passage_condition' } });
  });

  it('serializes deterministically and rejects forged non-finite values', () => {
    const result = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [candidate('b', 0.1, 0.7, 0.2), candidate('a', 0.3, 0.8, 0.1)],
      observations: ['red', 'blue'],
      passageCondition: { kind: 'not_hit_by_observation_horizon' }
    }));
    const reversed = requireSuccess(inferFiniteSameTrajectoryHiddenFirstPassageCandidates({
      candidates: [candidate('a', 0.3, 0.8, 0.1), candidate('b', 0.1, 0.7, 0.2)],
      observations: ['red', 'blue'],
      passageCondition: { kind: 'not_hit_by_observation_horizon' }
    }));
    expect(finiteSameTrajectoryHiddenFirstPassageInferenceResultToJson(result))
      .toBe(finiteSameTrajectoryHiddenFirstPassageInferenceResultToJson(reversed));
    const forged = structuredClone(result);
    forged.diagnostics.comparisonTolerance = Number.NaN;
    expect(() => finiteSameTrajectoryHiddenFirstPassageInferenceResultToJson(forged)).toThrow(/non-finite/);
  });
});
