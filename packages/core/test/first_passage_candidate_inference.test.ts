import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteFirstPassageCandidate,
  FiniteFirstPassageCandidateInferenceResult,
  FiniteFirstPassageCandidateInferenceSuccess,
  FiniteFirstPassageCandidateObservation,
  finiteFirstPassageCandidateInferenceResultToJson,
  inferFiniteFirstPassageCandidates
} from '../src/first_passage_candidate_inference';

function requireSuccess(
  result: FiniteFirstPassageCandidateInferenceResult
): FiniteFirstPassageCandidateInferenceSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function scalarProbability(value: DefinitionModel['transitions'][number]['probability']): number {
  return typeof value === 'number' ? value : value.value;
}

function geometricCandidate(
  candidateId: string,
  stayProbability: number,
  value?: string | number | boolean | null,
  targetState = 'hit'
): FiniteFirstPassageCandidate {
  return {
    candidateId,
    model: {
      startState: 's',
      states: [{ id: 's' }, { id: targetState, terminal: true }],
      transitions: [
        { from: 's', to: 's', probability: stayProbability },
        { from: 's', to: targetState, probability: 1 - stayProbability }
      ]
    },
    initialDistribution: [{ stateId: 's', probability: 1 }],
    targetStates: [targetState],
    ...(value !== undefined ? { value } : {})
  };
}

function terminalStateIds(model: DefinitionModel): Set<StateId> {
  return new Set(model.states.filter((state) => state.terminal === true).map((state) => state.id));
}

function pathEnumerationEventProbability(
  candidate: FiniteFirstPassageCandidate,
  observation: FiniteFirstPassageCandidateObservation
): number {
  const targets = new Set(candidate.targetStates);
  const terminal = terminalStateIds(candidate.model);
  const horizon = observation.kind === 'exact_hit_at_step' ? observation.step : observation.horizon;
  let active: Array<{ stateId: StateId; probability: number }> = [];
  let hitAtHorizon = 0;

  for (const entry of candidate.initialDistribution) {
    if (targets.has(entry.stateId)) {
      if (observation.kind === 'exact_hit_at_step' && observation.step === 0) {
        hitAtHorizon += entry.probability;
      }
    } else {
      active.push({ ...entry });
    }
  }

  if (horizon === 0) {
    return observation.kind === 'exact_hit_at_step'
      ? hitAtHorizon
      : active.reduce((sum, path) => sum + path.probability, 0);
  }

  for (let step = 1; step <= horizon; step += 1) {
    const next: Array<{ stateId: StateId; probability: number }> = [];
    let stepHit = 0;
    for (const path of active) {
      if (terminal.has(path.stateId)) {
        next.push(path);
        continue;
      }
      for (const edge of candidate.model.transitions.filter((item) => item.from === path.stateId)) {
        const probability = path.probability * scalarProbability(edge.probability);
        if (targets.has(edge.to)) {
          stepHit += probability;
        } else {
          next.push({ stateId: edge.to, probability });
        }
      }
    }
    active = next;
    if (observation.kind === 'exact_hit_at_step' && step === observation.step) return stepHit;
  }

  return active.reduce((sum, path) => sum + path.probability, 0);
}

function denseKilledEventProbability(
  candidate: FiniteFirstPassageCandidate,
  observation: FiniteFirstPassageCandidateObservation
): number {
  const states = candidate.model.states
    .map((state) => state.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const index = new Map(states.map((stateId, position) => [stateId, position]));
  const targets = new Set(candidate.targetStates);
  const terminals = terminalStateIds(candidate.model);
  const matrix = states.map(() => states.map(() => 0));

  for (const stateId of states) {
    const from = index.get(stateId)!;
    if (targets.has(stateId)) continue;
    if (terminals.has(stateId)) {
      matrix[from]![from] = 1;
      continue;
    }
    for (const edge of candidate.model.transitions.filter((item) => item.from === stateId)) {
      if (targets.has(edge.to)) continue;
      const to = index.get(edge.to)!;
      matrix[from]![to] = matrix[from]![to]! + scalarProbability(edge.probability);
    }
  }

  let vector = states.map((stateId) =>
    targets.has(stateId)
      ? 0
      : candidate.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0
  );
  const initialTarget = candidate.initialDistribution
    .filter((entry) => targets.has(entry.stateId))
    .reduce((sum, entry) => sum + entry.probability, 0);

  if (observation.kind === 'exact_hit_at_step' && observation.step === 0) return initialTarget;
  if (observation.kind === 'not_hit_by_horizon' && observation.horizon === 0) {
    return vector.reduce((sum, value) => sum + value, 0);
  }

  const horizon = observation.kind === 'exact_hit_at_step' ? observation.step : observation.horizon;
  for (let step = 1; step <= horizon; step += 1) {
    let hitFlux = 0;
    for (let from = 0; from < states.length; from += 1) {
      const stateId = states[from]!;
      if (targets.has(stateId) || terminals.has(stateId)) continue;
      for (const edge of candidate.model.transitions.filter((item) => item.from === stateId)) {
        if (targets.has(edge.to)) {
          hitFlux += vector[from]! * scalarProbability(edge.probability);
        }
      }
    }

    const next = states.map(() => 0);
    for (let from = 0; from < states.length; from += 1) {
      for (let to = 0; to < states.length; to += 1) {
        next[to] = next[to]! + vector[from]! * matrix[from]![to]!;
      }
    }
    vector = next;

    if (observation.kind === 'exact_hit_at_step' && step === observation.step) return hitFlux;
  }

  return vector.reduce((sum, value) => sum + value, 0);
}

function evaluation(
  result: FiniteFirstPassageCandidateInferenceSuccess,
  candidateId: string
) {
  const found = result.evaluations.find((item) => item.candidateId === candidateId);
  if (found === undefined) throw new Error(`missing evaluation ${candidateId}`);
  return found;
}

describe('Candidate G finite first-passage candidate inference', () => {
  it('matches complete finite path enumeration and selects the exact-hit maximum-likelihood candidate', () => {
    const candidates = [geometricCandidate('slow', 0.8, 800), geometricCandidate('fast', 0.5, 500)];
    const observation = { kind: 'exact_hit_at_step', step: 4 } as const;
    const result = requireSuccess(inferFiniteFirstPassageCandidates({ candidates, observation }));

    for (const candidate of candidates) {
      const oracle = pathEnumerationEventProbability(candidate, observation);
      const actual = evaluation(result, candidate.candidateId);
      expect(actual.eventProbability).toBeCloseTo(oracle, 14);
      expect(actual.logLikelihood).toBeCloseTo(Math.log(oracle), 14);
    }
    expect(result.classification).toBe('unique_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['slow']);
    expect(result.selectedCandidates).toEqual([{ candidateId: 'slow', value: 800 }]);
  });

  it('matches an independently constructed dense killed-chain oracle for right censoring', () => {
    const candidates = [geometricCandidate('a', 0.7), geometricCandidate('b', 0.4)];
    const observation = { kind: 'not_hit_by_horizon', horizon: 5 } as const;
    const result = requireSuccess(inferFiniteFirstPassageCandidates({ candidates, observation }));

    for (const candidate of candidates) {
      const oracle = denseKilledEventProbability(candidate, observation);
      const actual = evaluation(result, candidate.candidateId);
      expect(actual.eventProbability).toBeCloseTo(oracle, 14);
      expect(actual.logLikelihood).toBeCloseTo(Math.log(oracle), 14);
    }
    expect(result.selectedCandidateIds).toEqual(['a']);
  });

  it('implements step-0 exact-hit and not-hit semantics from the initial distribution', () => {
    const base = geometricCandidate('base', 0.5);
    const targetHeavy: FiniteFirstPassageCandidate = {
      ...base,
      candidateId: 'target-heavy',
      initialDistribution: [
        { stateId: 's', probability: 0.2 },
        { stateId: 'hit', probability: 0.8 }
      ]
    };
    const survivorHeavy: FiniteFirstPassageCandidate = {
      ...base,
      candidateId: 'survivor-heavy',
      initialDistribution: [
        { stateId: 's', probability: 0.9 },
        { stateId: 'hit', probability: 0.1 }
      ]
    };

    const hit = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [targetHeavy, survivorHeavy],
        observation: { kind: 'exact_hit_at_step', step: 0 }
      })
    );
    expect(hit.selectedCandidateIds).toEqual(['target-heavy']);
    expect(evaluation(hit, 'target-heavy').eventProbability).toBeCloseTo(0.8, 14);

    const censored = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [targetHeavy, survivorHeavy],
        observation: { kind: 'not_hit_by_horizon', horizon: 0 }
      })
    );
    expect(censored.selectedCandidateIds).toEqual(['survivor-heavy']);
    expect(evaluation(censored, 'survivor-heavy').eventProbability).toBeCloseTo(0.9, 14);
  });

  it('preserves complete maximum-likelihood ties and caller scalar values', () => {
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [
          geometricCandidate('z', 0.75, 'right'),
          geometricCandidate('a', 0.75, 'left')
        ],
        observation: { kind: 'exact_hit_at_step', step: 3 }
      })
    );
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toEqual(['a', 'z']);
    expect(result.selectedCandidates).toEqual([
      { candidateId: 'a', value: 'left' },
      { candidateId: 'z', value: 'right' }
    ]);
  });

  it('returns analytical all-candidates-impossible without fabricating a winner', () => {
    const never = (candidateId: string): FiniteFirstPassageCandidate => ({
      candidateId,
      model: {
        startState: 's',
        states: [{ id: 's', terminal: true }, { id: 'hit', terminal: true }],
        transitions: []
      },
      initialDistribution: [{ stateId: 's', probability: 1 }],
      targetStates: ['hit']
    });
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [never('a'), never('b')],
        observation: { kind: 'exact_hit_at_step', step: 2 }
      })
    );
    expect(result.classification).toBe('all_candidates_impossible');
    expect(result.bestLogLikelihood).toBeNull();
    expect(result.selectedCandidateIds).toEqual([]);
    for (const item of result.evaluations) {
      expect(item.possible).toBe(false);
      expect(item.logLikelihood).toBeNull();
      expect(item.eventProbability).toBeNull();
    }
  });

  it('keeps ranking in finite log likelihood when both direct event probabilities underflow', () => {
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [geometricCandidate('p50', 0.5), geometricCandidate('p49', 0.49)],
        observation: { kind: 'exact_hit_at_step', step: 1100 }
      })
    );
    const p50 = evaluation(result, 'p50');
    const p49 = evaluation(result, 'p49');
    expect(p50.possible).toBe(true);
    expect(p49.possible).toBe(true);
    expect(p50.eventProbability).toBe(0);
    expect(p49.eventProbability).toBe(0);
    expect(p50.eventProbabilityUnderflowed).toBe(true);
    expect(p49.eventProbabilityUnderflowed).toBe(true);
    expect(p50.logLikelihood).toBeCloseTo(1100 * Math.log(0.5), 10);
    expect(p49.logLikelihood).toBeCloseTo(1099 * Math.log(0.49) + Math.log(0.51), 10);
    expect(result.selectedCandidateIds).toEqual(['p50']);
  });

  it('is invariant to candidate order and internal target-state renaming', () => {
    const left = geometricCandidate('left', 0.6, 1, 'hit-left');
    const right = geometricCandidate('right', 0.6, 2, 'hit-right');
    const observation = { kind: 'not_hit_by_horizon', horizon: 4 } as const;
    const forward = requireSuccess(
      inferFiniteFirstPassageCandidates({ candidates: [left, right], observation })
    );
    const reverse = requireSuccess(
      inferFiniteFirstPassageCandidates({ candidates: [right, left], observation })
    );
    expect(forward.selectedCandidateIds).toEqual(['left', 'right']);
    expect(reverse.selectedCandidateIds).toEqual(forward.selectedCandidateIds);
    expect(reverse.evaluations).toEqual(forward.evaluations);
  });

  it('preserves split-parallel-transition aggregate equivalence and comparison-tolerance ambiguity', () => {
    const aggregate = geometricCandidate('aggregate', 0.8);
    const split: FiniteFirstPassageCandidate = {
      ...geometricCandidate('split', 0.8),
      model: {
        startState: 's',
        states: [{ id: 's' }, { id: 'hit', terminal: true }],
        transitions: [
          { from: 's', to: 's', probability: 0.3 },
          { from: 's', to: 's', probability: 0.5 },
          { from: 's', to: 'hit', probability: 0.2 }
        ]
      }
    };
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates(
        {
          candidates: [aggregate, split, geometricCandidate('near', 0.80000000000001)],
          observation: { kind: 'exact_hit_at_step', step: 4 }
        },
        { comparisonTolerance: 1e-12 }
      )
    );
    expect(evaluation(result, 'aggregate').logLikelihood).toBeCloseTo(
      evaluation(result, 'split').logLikelihood!,
      14
    );
    expect(result.classification).toBe('tied_maximum_likelihood');
    expect(result.selectedCandidateIds).toContain('aggregate');
    expect(result.selectedCandidateIds).toContain('split');
    expect(result.selectedCandidateIds).toContain('near');
  });

  it('keeps Candidate B validation failures explicit instead of dropping invalid candidates', () => {
    const bad: FiniteFirstPassageCandidate = {
      ...geometricCandidate('bad', 0.5),
      targetStates: ['missing']
    };
    const result = inferFiniteFirstPassageCandidates({
      candidates: [geometricCandidate('good', 0.5), bad],
      observation: { kind: 'exact_hit_at_step', step: 2 }
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.failure.code).toBe('candidate_evaluation_failed');
    expect(result.failure.candidateId).toBe('bad');
    expect(result.failure.candidateFailure?.code).toBe('unknown_target_state');
  });

  it('rejects malformed candidate families, scalar values, observations, and resource limits', () => {
    expect(
      inferFiniteFirstPassageCandidates({
        candidates: [],
        observation: { kind: 'exact_hit_at_step', step: 1 }
      }).ok
    ).toBe(false);

    const duplicate = inferFiniteFirstPassageCandidates({
      candidates: [geometricCandidate('x', 0.5), geometricCandidate('x', 0.6)],
      observation: { kind: 'exact_hit_at_step', step: 1 }
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) expect(duplicate.failure.code).toBe('duplicate_candidate_id');

    const invalidValue = geometricCandidate('bad-value', 0.5);
    (invalidValue as { value?: unknown }).value = Number.NaN;
    const valueResult = inferFiniteFirstPassageCandidates({
      candidates: [invalidValue],
      observation: { kind: 'exact_hit_at_step', step: 1 }
    });
    expect(valueResult.ok).toBe(false);
    if (!valueResult.ok) expect(valueResult.failure.code).toBe('invalid_candidate_value');

    const badObservation = inferFiniteFirstPassageCandidates({
      candidates: [geometricCandidate('a', 0.5)],
      observation: { kind: 'exact_hit_at_step', step: -1 }
    });
    expect(badObservation.ok).toBe(false);
    if (!badObservation.ok) expect(badObservation.failure.code).toBe('invalid_observation');

    const limited = inferFiniteFirstPassageCandidates(
      {
        candidates: [geometricCandidate('a', 0.5), geometricCandidate('b', 0.6)],
        observation: { kind: 'not_hit_by_horizon', horizon: 2 }
      },
      { maxCandidates: 1 }
    );
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.failure.code).toBe('candidate_count_exceeds_limit');
  });

  it('reports diagnostics that forbid posterior, infinite-horizon, simulation, and global-identification claims', () => {
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [geometricCandidate('a', 0.7)],
        observation: { kind: 'not_hit_by_horizon', horizon: 3 }
      })
    );
    expect(result.diagnostics.method).toBe('finite_candidate_first_passage_log_likelihood_comparison');
    expect(result.diagnostics.stableLikelihoodMethod).toBe('log_domain_killed_probability_mass');
    expect(result.diagnostics.rankingBasis).toBe('finite_log_likelihood');
    expect(result.diagnostics.simulationUsed).toBe(false);
    expect(result.diagnostics.candidatePriorUsed).toBe(false);
    expect(result.diagnostics.candidatePosteriorComputed).toBe(false);
    expect(result.diagnostics.infiniteHorizonClaimed).toBe(false);
    expect(result.diagnostics.globalModelIdentificationClaimed).toBe(false);
  });

  it('serializes deterministically and rejects forged non-finite analytical values', () => {
    const result = requireSuccess(
      inferFiniteFirstPassageCandidates({
        candidates: [geometricCandidate('a', 0.7, true)],
        observation: { kind: 'exact_hit_at_step', step: 2 }
      })
    );
    expect(finiteFirstPassageCandidateInferenceResultToJson(result)).toBe(JSON.stringify(result));

    const forged = structuredClone(result);
    forged.evaluations[0]!.logLikelihood = Number.NaN;
    expect(() => finiteFirstPassageCandidateInferenceResultToJson(forged)).toThrow(
      /non-finite numeric value/
    );
  });
});
