import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest,
  conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods
} from '../src/hidden_state_calibrated_evidence_likelihood_conditioning';
import { conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks } from '../src/hidden_state_evidence_mask_conditioning';

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

function baseModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.8 },
      { from: 'a', to: 'b', probability: 0.2 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function baseRequest(): FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.67 },
      { stateId: 'b', probability: 0.33 }
    ],
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.8 }, { stateId: 'b', likelihood: 0.3 }],
      [{ stateId: 'a', likelihood: 0.45 }, { stateId: 'b', likelihood: 0.9 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }]
    ]
  };
}

describe('Candidate Z authority-required metamorphic qualification', () => {
  it('is invariant under a bijective hidden-state relabeling', () => {
    const original = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(baseModel(), baseRequest());
    expect(original.ok && original.possible).toBe(true);
    if (!original.ok || !original.possible) throw new Error('Expected possible original Candidate Z result');

    const renamedModel: DefinitionModel = {
      startState: 'x',
      states: [{ id: 'x' }, { id: 'y' }],
      transitions: [
        { from: 'x', to: 'x', probability: 0.8 },
        { from: 'x', to: 'y', probability: 0.2 },
        { from: 'y', to: 'x', probability: 0.3 },
        { from: 'y', to: 'y', probability: 0.7 }
      ]
    };
    const renamedRequest: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: [
        { stateId: 'x', probability: 0.67 },
        { stateId: 'y', probability: 0.33 }
      ],
      evidenceLikelihoods: [
        [{ stateId: 'x', likelihood: 0.8 }, { stateId: 'y', likelihood: 0.3 }],
        [{ stateId: 'x', likelihood: 0.45 }, { stateId: 'y', likelihood: 0.9 }],
        [{ stateId: 'x', likelihood: 0.7 }, { stateId: 'y', likelihood: 0.2 }]
      ]
    };
    const renamed = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(renamedModel, renamedRequest);
    expect(renamed.ok && renamed.possible).toBe(true);
    if (!renamed.ok || !renamed.possible) throw new Error('Expected possible renamed Candidate Z result');

    expect(renamed.logLikelihood).toBeCloseTo(original.logLikelihood!, 12);
    expect(renamed.combinedEvidenceProbability).toBeCloseTo(original.combinedEvidenceProbability!, 12);
    for (let step = 0; step < 3; step += 1) {
      expect(probability(renamed.filteringSteps[step]?.filteredDistribution, 'x')).toBeCloseTo(
        probability(original.filteringSteps[step]?.filteredDistribution, 'a'),
        12
      );
      expect(probability(renamed.smoothingSteps?.[step]?.smoothedDistribution, 'y')).toBeCloseTo(
        probability(original.smoothingSteps?.[step]?.smoothedDistribution, 'b'),
        12
      );
    }
    for (let step = 0; step < 2; step += 1) {
      expect(pairProbability(renamed.pairwiseSteps?.[step]?.pairwiseDistribution, 'x', 'y')).toBeCloseTo(
        pairProbability(original.pairwiseSteps?.[step]?.pairwiseDistribution, 'a', 'b'),
        12
      );
    }
  });

  it('is invariant to transition entry ordering and explicitly satisfies pairwise/count conservation', () => {
    const original = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(baseModel(), baseRequest());
    const reversedModel: DefinitionModel = {
      ...baseModel(),
      transitions: [...baseModel().transitions].reverse()
    };
    const reversed = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(reversedModel, baseRequest());
    expect(original.ok && original.possible && reversed.ok && reversed.possible).toBe(true);
    if (!original.ok || !original.possible || !reversed.ok || !reversed.possible) {
      throw new Error('Expected possible transition-order results');
    }
    expect(reversed.logLikelihood).toBeCloseTo(original.logLikelihood!, 12);

    for (let step = 0; step < reversed.pairwiseSteps!.length; step += 1) {
      const pairwise = reversed.pairwiseSteps![step]!.pairwiseDistribution;
      for (const stateId of ['a', 'b']) {
        const row = pairwise
          .filter((entry) => entry.fromStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        const column = pairwise
          .filter((entry) => entry.toStateId === stateId)
          .reduce((sum, entry) => sum + entry.probability, 0);
        expect(row).toBeCloseTo(
          probability(reversed.smoothingSteps?.[step]?.smoothedDistribution, stateId),
          12
        );
        expect(column).toBeCloseTo(
          probability(reversed.smoothingSteps?.[step + 1]?.smoothedDistribution, stateId),
          12
        );
      }
      expect(pairwise.reduce((sum, entry) => sum + entry.probability, 0)).toBeCloseTo(1, 12);
    }
    expect(
      reversed.expectedTransitionCounts?.reduce((sum, entry) => sum + entry.expectedCount, 0)
    ).toBeCloseTo(baseRequest().evidenceLikelihoods.length - 1, 12);
  });

  it('makes all-one evidence exactly neutral and reduces to independent transition-only propagation', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.8 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'b', to: 'a', probability: 0.3 },
        { from: 'b', to: 'b', probability: 0.7 }
      ]
    };
    const request: FiniteHiddenStateCalibratedEvidenceLikelihoodConditioningRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'b', probability: 0.3 }
      ],
      evidenceLikelihoods: Array.from({ length: 3 }, () => [
        { stateId: 'a', likelihood: 1 },
        { stateId: 'b', likelihood: 1 }
      ])
    };
    const result = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, request);
    expect(result.ok && result.possible).toBe(true);
    if (!result.ok || !result.possible) throw new Error('Expected possible all-one Candidate Z result');

    expect(result.logLikelihood).toBeCloseTo(0, 15);
    expect(result.combinedEvidenceProbability).toBeCloseTo(1, 15);
    expect(probability(result.filteringSteps[0]?.filteredDistribution, 'a')).toBeCloseTo(0.7, 15);
    expect(probability(result.filteringSteps[1]?.filteredDistribution, 'a')).toBeCloseTo(0.65, 15);
    expect(probability(result.filteringSteps[2]?.filteredDistribution, 'a')).toBeCloseTo(0.625, 15);
    for (const step of result.filteringSteps) {
      expect(step.conditionalEvidenceProbability).toBeCloseTo(1, 15);
    }
  });

  it('qualifies the Candidate X versus C/Y direct-underflow semantic adapter explicitly', () => {
    const steps = 1100;
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }],
      transitions: []
    };
    const observations = Array.from({ length: steps }, () => 'o');
    const masks = Array.from({ length: steps }, () => ['a']);
    const x = conditionFiniteHiddenStateObservationSequenceWithStateEvidenceMasks(model, {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      alphabet: ['o', 'other'],
      kernel: [
        { stateId: 'a', symbol: 'o', probability: 0.5 },
        { stateId: 'a', symbol: 'other', probability: 0.5 }
      ],
      observations,
      stateEvidenceMasks: masks
    });
    const z = conditionFiniteHiddenStateOnCalibratedEvidenceLikelihoods(model, {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      evidenceLikelihoods: Array.from({ length: steps }, () => [
        { stateId: 'a', likelihood: 0.5 }
      ])
    });
    expect(x.ok && x.possible && z.ok && z.possible).toBe(true);
    if (!x.ok || !x.possible || !z.ok || !z.possible) {
      throw new Error('Expected possible X/Z underflow adapter fixture');
    }
    expect(x.logLikelihood).toBeCloseTo(z.logLikelihood!, 10);
    expect(x.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(true);
    expect(z.diagnostics.combinedEvidenceProbabilityUnderflowed).toBe(true);
    expect(x.sequenceProbability).toBe(0);
    expect(z.combinedEvidenceProbability).toBeNull();
  });
});
