import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateEvidenceMaskConditioningRequest,
  conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks
} from '../src/hidden_state_evidence_mask_conditioning';

type DenseOracle = {
  total: number;
  logLikelihood: number;
  filtering: number[][];
  smoothing: number[][];
  pairwise: number[][][];
  expectedCounts: number[][];
};

function probabilityOfInitial(
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  stateId: StateId
): number {
  return request.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function probabilityOfEmission(
  request: FiniteHiddenStateEvidenceMaskConditioningRequest,
  stateId: StateId,
  symbol: string
): number {
  return request.kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)?.probability ?? 0;
}

function probabilityOfTransition(
  model: DefinitionModel,
  fromStateId: StateId,
  toStateId: StateId
): number {
  const source = model.states.find((state) => state.id === fromStateId);
  if (source !== undefined && isTerminalState(source)) {
    return fromStateId === toStateId ? 1 : 0;
  }
  return model.transitions
    .filter((entry) => entry.from === fromStateId && entry.to === toStateId)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function denseOracle(
  model: DefinitionModel,
  request: FiniteHiddenStateEvidenceMaskConditioningRequest
): DenseOracle {
  const stateIds = model.states.map((state) => state.id);
  const stateCount = stateIds.length;
  const timeCount = request.observations.length;
  const alpha = Array.from({ length: timeCount }, () => Array(stateCount).fill(0) as number[]);
  const beta = Array.from({ length: timeCount }, () => Array(stateCount).fill(0) as number[]);
  const filtering = Array.from({ length: timeCount }, () => Array(stateCount).fill(0) as number[]);

  for (let i = 0; i < stateCount; i += 1) {
    const stateId = stateIds[i]!;
    const allowed = request.stateEvidenceMasks[0]!.includes(stateId) ? 1 : 0;
    alpha[0]![i] =
      probabilityOfInitial(request, stateId) *
      probabilityOfEmission(request, stateId, request.observations[0]!) *
      allowed;
  }
  let prefixTotal = alpha[0]!.reduce((sum, value) => sum + value, 0);
  expect(prefixTotal).toBeGreaterThan(0);
  for (let i = 0; i < stateCount; i += 1) filtering[0]![i] = alpha[0]![i]! / prefixTotal;

  for (let t = 1; t < timeCount; t += 1) {
    for (let j = 0; j < stateCount; j += 1) {
      const toStateId = stateIds[j]!;
      const allowed = request.stateEvidenceMasks[t]!.includes(toStateId) ? 1 : 0;
      let predicted = 0;
      for (let i = 0; i < stateCount; i += 1) {
        predicted +=
          alpha[t - 1]![i]! *
          probabilityOfTransition(model, stateIds[i]!, toStateId);
      }
      alpha[t]![j] =
        predicted * probabilityOfEmission(request, toStateId, request.observations[t]!) * allowed;
    }
    prefixTotal = alpha[t]!.reduce((sum, value) => sum + value, 0);
    expect(prefixTotal).toBeGreaterThan(0);
    for (let j = 0; j < stateCount; j += 1) filtering[t]![j] = alpha[t]![j]! / prefixTotal;
  }

  const total = alpha[timeCount - 1]!.reduce((sum, value) => sum + value, 0);
  expect(total).toBeGreaterThan(0);

  for (let i = 0; i < stateCount; i += 1) beta[timeCount - 1]![i] = 1;
  for (let t = timeCount - 2; t >= 0; t -= 1) {
    for (let i = 0; i < stateCount; i += 1) {
      let value = 0;
      for (let j = 0; j < stateCount; j += 1) {
        const toStateId = stateIds[j]!;
        const allowed = request.stateEvidenceMasks[t + 1]!.includes(toStateId) ? 1 : 0;
        value +=
          probabilityOfTransition(model, stateIds[i]!, toStateId) *
          probabilityOfEmission(request, toStateId, request.observations[t + 1]!) *
          allowed *
          beta[t + 1]![j]!;
      }
      beta[t]![i] = value;
    }
  }

  const smoothing = Array.from({ length: timeCount }, () => Array(stateCount).fill(0) as number[]);
  for (let t = 0; t < timeCount; t += 1) {
    for (let i = 0; i < stateCount; i += 1) {
      smoothing[t]![i] = (alpha[t]![i]! * beta[t]![i]!) / total;
    }
  }

  const pairwise = Array.from(
    { length: Math.max(0, timeCount - 1) },
    () => Array.from({ length: stateCount }, () => Array(stateCount).fill(0) as number[])
  );
  const expectedCounts = Array.from({ length: stateCount }, () => Array(stateCount).fill(0) as number[]);
  for (let t = 0; t < timeCount - 1; t += 1) {
    for (let i = 0; i < stateCount; i += 1) {
      for (let j = 0; j < stateCount; j += 1) {
        const toStateId = stateIds[j]!;
        const allowed = request.stateEvidenceMasks[t + 1]!.includes(toStateId) ? 1 : 0;
        const joint =
          (alpha[t]![i]! *
            probabilityOfTransition(model, stateIds[i]!, toStateId) *
            probabilityOfEmission(request, toStateId, request.observations[t + 1]!) *
            allowed *
            beta[t + 1]![j]!) /
          total;
        pairwise[t]![i]![j] = joint;
        expectedCounts[i]![j] += joint;
      }
    }
  }

  return {
    total,
    logLikelihood: Math.log(total),
    filtering,
    smoothing,
    pairwise,
    expectedCounts
  };
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

describe('Candidate X independent raw-joint dense forward/backward oracle', () => {
  it('matches masked filtering, smoothing, pairwise posteriors and expected counts without using Candidate X/H/R as the oracle', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.6 },
        { from: 'a', to: 'b', probability: 0.3 },
        { from: 'a', to: 'c', probability: 0.1 },
        { from: 'b', to: 'a', probability: 0.2 },
        { from: 'b', to: 'b', probability: 0.5 },
        { from: 'b', to: 'c', probability: 0.3 },
        { from: 'c', to: 'a', probability: 0.15 },
        { from: 'c', to: 'b', probability: 0.25 },
        { from: 'c', to: 'c', probability: 0.6 }
      ]
    };
    const request: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.3 },
        { stateId: 'c', probability: 0.2 }
      ],
      alphabet: ['r', 's'],
      kernel: [
        { stateId: 'a', symbol: 'r', probability: 0.8 },
        { stateId: 'a', symbol: 's', probability: 0.2 },
        { stateId: 'b', symbol: 'r', probability: 0.35 },
        { stateId: 'b', symbol: 's', probability: 0.65 },
        { stateId: 'c', symbol: 'r', probability: 0.55 },
        { stateId: 'c', symbol: 's', probability: 0.45 }
      ],
      observations: ['r', 's', 'r', 's'],
      stateEvidenceMasks: [
        ['a', 'b', 'c'],
        ['a', 'c'],
        ['b', 'c'],
        ['a', 'b']
      ]
    };

    const expected = denseOracle(model, request);
    const actual = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model, request);
    expect(actual.ok).toBe(true);
    if (!actual.ok) throw new Error(`${actual.failure.code}: ${actual.failure.message}`);
    expect(actual.possible).toBe(true);
    if (!actual.possible || actual.smoothingSteps === null || actual.pairwiseSteps === null || actual.expectedTransitionCounts === null) {
      throw new Error('Expected possible Candidate X posterior outputs');
    }

    expect(actual.sequenceProbability).toBeCloseTo(expected.total, 12);
    expect(actual.logLikelihood).toBeCloseTo(expected.logLikelihood, 12);
    const stateIds = model.states.map((state) => state.id);
    for (let t = 0; t < request.observations.length; t += 1) {
      for (let i = 0; i < stateIds.length; i += 1) {
        const stateId = stateIds[i]!;
        expect(stateProbability(actual.filteringSteps[t]?.filteredDistribution, stateId)).toBeCloseTo(
          expected.filtering[t]![i]!,
          12
        );
        expect(stateProbability(actual.smoothingSteps[t]?.smoothedDistribution, stateId)).toBeCloseTo(
          expected.smoothing[t]![i]!,
          12
        );
      }
    }

    for (let t = 0; t < request.observations.length - 1; t += 1) {
      for (let i = 0; i < stateIds.length; i += 1) {
        for (let j = 0; j < stateIds.length; j += 1) {
          expect(
            pairProbability(actual.pairwiseSteps[t]?.pairwiseDistribution, stateIds[i]!, stateIds[j]!)
          ).toBeCloseTo(expected.pairwise[t]![i]![j]!, 12);
        }
      }
    }

    for (let i = 0; i < stateIds.length; i += 1) {
      for (let j = 0; j < stateIds.length; j += 1) {
        const actualCount = actual.expectedTransitionCounts.find(
          (entry) => entry.fromStateId === stateIds[i] && entry.toStateId === stateIds[j]
        )?.expectedCount;
        expect(actualCount).toBeCloseTo(expected.expectedCounts[i]![j]!, 12);
      }
    }
  });
});
