import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods
} from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';

function transition(m: DefinitionModel, from: StateId, to: StateId): number {
  const state = m.states.find((entry) => entry.id === from);
  if (state !== undefined && isTerminalState(state)) return from === to ? 1 : 0;
  return m.transitions
    .filter((entry) => entry.from === from && entry.to === to)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function initial(
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateId: StateId
): number {
  return request.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function factor(
  request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  stateId: StateId,
  step: number
): number {
  return request.evidenceLikelihoods[step]?.find((entry) => entry.stateId === stateId)?.likelihood ?? 0;
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

describe('Candidate Z independent raw-joint dense forward/backward oracle', () => {
  it('matches independently constructed alpha, beta, gamma and xi values', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.74 },
        { from: 'a', to: 'b', probability: 0.26 },
        { from: 'b', to: 'a', probability: 0.31 },
        { from: 'b', to: 'b', probability: 0.69 }
      ]
    };
    const request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.58 },
        { stateId: 'b', probability: 0.42 }
      ],
      evidenceLikelihoods: [
        [{ stateId: 'a', likelihood: 0.9 }, { stateId: 'b', likelihood: 0.4 }],
        [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.8 }],
        [{ stateId: 'a', likelihood: 0.75 }, { stateId: 'b', likelihood: 0.2 }],
        [{ stateId: 'a', likelihood: 0.45 }, { stateId: 'b', likelihood: 0.65 }]
      ]
    };

    const result = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible || result.smoothingSteps === null || result.pairwiseSteps === null) {
      throw new Error('Expected possible Candidate Z result');
    }

    const states = ['a', 'b'] as const;
    const steps = request.evidenceLikelihoods.length;
    const alpha = Array.from({ length: steps }, () => new Map<StateId, number>());
    for (const stateId of states) {
      alpha[0]!.set(stateId, initial(request, stateId) * factor(request, stateId, 0));
    }
    for (let step = 1; step < steps; step += 1) {
      for (const to of states) {
        let incoming = 0;
        for (const from of states) {
          incoming += (alpha[step - 1]!.get(from) ?? 0) * transition(model, from, to);
        }
        alpha[step]!.set(to, incoming * factor(request, to, step));
      }
    }
    const total = states.reduce((sum, stateId) => sum + (alpha[steps - 1]!.get(stateId) ?? 0), 0);
    expect(total).toBeGreaterThan(0);

    const beta = Array.from({ length: steps }, () => new Map<StateId, number>());
    for (const stateId of states) beta[steps - 1]!.set(stateId, 1);
    for (let step = steps - 2; step >= 0; step -= 1) {
      for (const from of states) {
        let value = 0;
        for (const to of states) {
          value +=
            transition(model, from, to) *
            factor(request, to, step + 1) *
            (beta[step + 1]!.get(to) ?? 0);
        }
        beta[step]!.set(from, value);
      }
    }

    expect(result.logLikelihood).toBeCloseTo(Math.log(total), 12);
    expect(result.combinedEvidenceProbability).toBeCloseTo(total, 12);

    for (let step = 0; step < steps; step += 1) {
      const prefixTotal = states.reduce(
        (sum, stateId) => sum + (alpha[step]!.get(stateId) ?? 0),
        0
      );
      for (const stateId of states) {
        const filtered = (alpha[step]!.get(stateId) ?? 0) / prefixTotal;
        const smoothed =
          ((alpha[step]!.get(stateId) ?? 0) * (beta[step]!.get(stateId) ?? 0)) / total;
        expect(probability(result.filteringSteps[step]?.filteredDistribution, stateId)).toBeCloseTo(filtered, 12);
        expect(probability(result.smoothingSteps[step]?.smoothedDistribution, stateId)).toBeCloseTo(smoothed, 12);
      }
    }

    for (let step = 0; step < steps - 1; step += 1) {
      for (const from of states) {
        for (const to of states) {
          const expected =
            ((alpha[step]!.get(from) ?? 0) *
              transition(model, from, to) *
              factor(request, to, step + 1) *
              (beta[step + 1]!.get(to) ?? 0)) /
            total;
          expect(pairProbability(result.pairwiseSteps[step]?.pairwiseDistribution, from, to)).toBeCloseTo(expected, 12);
        }
      }
    }
  });
});
