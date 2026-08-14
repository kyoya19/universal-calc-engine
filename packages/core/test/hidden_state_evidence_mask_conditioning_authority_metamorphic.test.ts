import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteHiddenStateEvidenceMaskConditioningRequest,
  FiniteHiddenStateEvidenceMaskConditioningResult,
  conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks
} from '../src/hidden_state_evidence_mask_conditioning';

type XSuccess = Extract<FiniteHiddenStateEvidenceMaskConditioningResult, { ok: true }>;

function requireSuccess(result: FiniteHiddenStateEvidenceMaskConditioningResult): XSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  expect(result.possible).toBe(true);
  if (!result.possible) throw new Error('Expected possible Candidate X evidence');
  return result;
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
  counts: Array<{ fromStateId: StateId; toStateId: StateId; expectedCount: number }> | null | undefined,
  fromStateId: StateId,
  toStateId: StateId
): number {
  return counts?.find(
    (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )?.expectedCount ?? 0;
}

function baseModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.7 },
      { from: 'a', to: 'b', probability: 0.3 },
      { from: 'b', to: 'a', probability: 0.2 },
      { from: 'b', to: 'b', probability: 0.8 }
    ]
  };
}

function baseRequest(): FiniteHiddenStateEvidenceMaskConditioningRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: 0.85 },
      { stateId: 'a', symbol: 'blue', probability: 0.15 },
      { stateId: 'b', symbol: 'red', probability: 0.25 },
      { stateId: 'b', symbol: 'blue', probability: 0.75 }
    ],
    observations: ['red', 'blue', 'red'],
    stateEvidenceMasks: [['a', 'b'], ['a'], ['a', 'b']]
  };
}

function compareMappedResults(
  left: XSuccess,
  right: XSuccess,
  mapping: ReadonlyArray<readonly [StateId, StateId]>
): void {
  expect(left.logLikelihood).toBeCloseTo(right.logLikelihood!, 12);
  expect(left.sequenceProbability).toBeCloseTo(right.sequenceProbability!, 12);
  expect(left.filteringSteps).toHaveLength(right.filteringSteps.length);
  expect(left.smoothingSteps).not.toBeNull();
  expect(right.smoothingSteps).not.toBeNull();
  expect(left.pairwiseSteps).not.toBeNull();
  expect(right.pairwiseSteps).not.toBeNull();
  expect(left.expectedTransitionCounts).not.toBeNull();
  expect(right.expectedTransitionCounts).not.toBeNull();

  for (let t = 0; t < left.filteringSteps.length; t += 1) {
    for (const [leftState, rightState] of mapping) {
      expect(stateProbability(left.filteringSteps[t]?.filteredDistribution, leftState)).toBeCloseTo(
        stateProbability(right.filteringSteps[t]?.filteredDistribution, rightState),
        12
      );
      expect(stateProbability(left.smoothingSteps?.[t]?.smoothedDistribution, leftState)).toBeCloseTo(
        stateProbability(right.smoothingSteps?.[t]?.smoothedDistribution, rightState),
        12
      );
    }
  }

  for (let t = 0; t < (left.pairwiseSteps?.length ?? 0); t += 1) {
    for (const [leftFrom, rightFrom] of mapping) {
      for (const [leftTo, rightTo] of mapping) {
        expect(
          pairProbability(left.pairwiseSteps?.[t]?.pairwiseDistribution, leftFrom, leftTo)
        ).toBeCloseTo(
          pairProbability(right.pairwiseSteps?.[t]?.pairwiseDistribution, rightFrom, rightTo),
          12
        );
      }
    }
  }

  for (const [leftFrom, rightFrom] of mapping) {
    for (const [leftTo, rightTo] of mapping) {
      expect(expectedCount(left.expectedTransitionCounts, leftFrom, leftTo)).toBeCloseTo(
        expectedCount(right.expectedTransitionCounts, rightFrom, rightTo),
        12
      );
    }
  }
}

describe('Candidate X authority-required metamorphic qualification', () => {
  it('makes a possible singleton mask revealing in both prefix filtering and full smoothing', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.5 },
        { from: 'a', to: 'b', probability: 0.5 },
        { from: 'b', to: 'a', probability: 0.5 },
        { from: 'b', to: 'b', probability: 0.5 }
      ]
    };
    const request: FiniteHiddenStateEvidenceMaskConditioningRequest = {
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
      stateEvidenceMasks: [['a', 'b'], ['b'], ['a', 'b']]
    };

    const result = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model, request)
    );
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'b')).toBeCloseTo(1, 12);
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'a')).toBeCloseTo(0, 12);
    expect(stateProbability(result.smoothingSteps?.[1]?.smoothedDistribution, 'b')).toBeCloseTo(1, 12);
    expect(stateProbability(result.smoothingSteps?.[1]?.smoothedDistribution, 'a')).toBeCloseTo(0, 12);
  });

  it('is invariant under a bijective hidden-state label permutation', () => {
    const left = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(baseModel(), baseRequest())
    );

    const relabeledModel: DefinitionModel = {
      startState: 'u',
      states: [{ id: 'u' }, { id: 'v' }],
      transitions: [
        { from: 'u', to: 'u', probability: 0.7 },
        { from: 'u', to: 'v', probability: 0.3 },
        { from: 'v', to: 'u', probability: 0.2 },
        { from: 'v', to: 'v', probability: 0.8 }
      ]
    };
    const relabeledRequest: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      initialDistribution: [
        { stateId: 'u', probability: 0.6 },
        { stateId: 'v', probability: 0.4 }
      ],
      alphabet: ['red', 'blue'],
      kernel: [
        { stateId: 'u', symbol: 'red', probability: 0.85 },
        { stateId: 'u', symbol: 'blue', probability: 0.15 },
        { stateId: 'v', symbol: 'red', probability: 0.25 },
        { stateId: 'v', symbol: 'blue', probability: 0.75 }
      ],
      observations: ['red', 'blue', 'red'],
      stateEvidenceMasks: [['u', 'v'], ['u'], ['u', 'v']]
    };
    const right = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(
        relabeledModel,
        relabeledRequest
      )
    );

    compareMappedResults(left, right, [
      ['a', 'u'],
      ['b', 'v']
    ]);
  });

  it('is invariant under a bijective observation-symbol rename', () => {
    const left = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(baseModel(), baseRequest())
    );
    const renamedRequest: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      alphabet: ['x', 'y'],
      kernel: [
        { stateId: 'a', symbol: 'x', probability: 0.85 },
        { stateId: 'a', symbol: 'y', probability: 0.15 },
        { stateId: 'b', symbol: 'x', probability: 0.25 },
        { stateId: 'b', symbol: 'y', probability: 0.75 }
      ],
      observations: ['x', 'y', 'x'],
      stateEvidenceMasks: [['a', 'b'], ['a'], ['a', 'b']]
    };
    const right = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(baseModel(), renamedRequest)
    );

    compareMappedResults(left, right, [
      ['a', 'a'],
      ['b', 'b']
    ]);
  });

  it('preserves terminal implicit self-retention in filtering, smoothing, pairwise posteriors and expected counts', () => {
    const model: DefinitionModel = {
      startState: 'live',
      states: [{ id: 'live' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'live', to: 'done', probability: 1 }]
    };
    const request: FiniteHiddenStateEvidenceMaskConditioningRequest = {
      initialDistribution: [{ stateId: 'live', probability: 1 }],
      alphabet: ['o'],
      kernel: [
        { stateId: 'live', symbol: 'o', probability: 1 },
        { stateId: 'done', symbol: 'o', probability: 1 }
      ],
      observations: ['o', 'o', 'o'],
      stateEvidenceMasks: [
        ['live', 'done'],
        ['live', 'done'],
        ['live', 'done']
      ]
    };

    const result = requireSuccess(
      conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model, request)
    );
    expect(stateProbability(result.filteringSteps[0]?.filteredDistribution, 'live')).toBeCloseTo(1, 12);
    expect(stateProbability(result.filteringSteps[1]?.filteredDistribution, 'done')).toBeCloseTo(1, 12);
    expect(stateProbability(result.filteringSteps[2]?.filteredDistribution, 'done')).toBeCloseTo(1, 12);
    expect(stateProbability(result.smoothingSteps?.[0]?.smoothedDistribution, 'live')).toBeCloseTo(1, 12);
    expect(stateProbability(result.smoothingSteps?.[1]?.smoothedDistribution, 'done')).toBeCloseTo(1, 12);
    expect(stateProbability(result.smoothingSteps?.[2]?.smoothedDistribution, 'done')).toBeCloseTo(1, 12);
    expect(pairProbability(result.pairwiseSteps?.[0]?.pairwiseDistribution, 'live', 'done')).toBeCloseTo(1, 12);
    expect(pairProbability(result.pairwiseSteps?.[1]?.pairwiseDistribution, 'done', 'done')).toBeCloseTo(1, 12);
    expect(expectedCount(result.expectedTransitionCounts, 'live', 'done')).toBeCloseTo(1, 12);
    expect(expectedCount(result.expectedTransitionCounts, 'done', 'done')).toBeCloseTo(1, 12);
  });
});
