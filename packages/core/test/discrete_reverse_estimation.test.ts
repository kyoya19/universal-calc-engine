import { describe, expect, it } from 'vitest';
import type {
  ExternalBaseModelDocument,
  ExternalRewardAxesModelDocument
} from '../src/external_input';
import type { ObservationDataset } from '../src/observations';
import {
  estimateDiscreteParameterFromTransitions
} from '../src/discrete_reverse_estimation';

function baseDocument(): ExternalBaseModelDocument {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    parameterValues: {
      reward: 100,
      attemptMinutes: 2
    },
    model: {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'success', terminal: true },
        { id: 'failure', terminal: true }
      ],
      parameters: [
        { id: 'successProbability', label: 'Success probability' },
        { id: 'reward', unit: 'points' },
        { id: 'attemptMinutes', unit: 'minutes' }
      ],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: {
            type: 'parameter_ref',
            parameter: 'successProbability'
          },
          reward: {
            type: 'parameter_ref',
            parameter: 'reward'
          },
          elapsedTime: {
            value: {
              type: 'parameter_ref',
              parameter: 'attemptMinutes'
            },
            unit: 'minutes'
          }
        },
        {
          from: 'start',
          to: 'failure',
          probability: {
            type: 'formula',
            operator: 'subtract',
            left: 1,
            right: {
              type: 'parameter_ref',
              parameter: 'successProbability'
            }
          },
          elapsedTime: {
            value: {
              type: 'parameter_ref',
              parameter: 'attemptMinutes'
            },
            unit: 'minutes'
          }
        }
      ]
    }
  };
}

function observations(successes = 60, failures = 40): ObservationDataset {
  return {
    schemaVersion: 1,
    observations: [
      {
        id: 'start-visits',
        type: 'state_count',
        state: 'start',
        count: successes + failures
      },
      {
        id: 'successes',
        type: 'transition_count',
        from: 'start',
        to: 'success',
        count: successes
      },
      {
        id: 'failures',
        type: 'transition_count',
        from: 'start',
        to: 'failure',
        count: failures
      },
      {
        id: 'elapsed-sample',
        type: 'scalar',
        metric: 'observed_elapsed_time',
        value: 12_000,
        unit: 'seconds'
      }
    ]
  };
}

describe('discrete reverse estimation', () => {
  it('ranks finite candidates by transition multinomial likelihood without introducing a prior or posterior', () => {
    const result = estimateDiscreteParameterFromTransitions({
      document: baseDocument(),
      observations: observations(),
      unknownParameter: 'successProbability',
      candidateValues: [0.4, 0.5, 0.6, 0.7]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.estimation.estimateKind).toBe(
      'maximum_likelihood_over_discrete_candidates'
    );
    expect(result.estimation.likelihoodKind).toBe(
      'transition_multinomial_complete_categories'
    );
    expect(result.estimation.estimatedValue).toBe(0.6);
    expect(result.estimation.bestCandidateValues).toEqual([0.6]);
    expect(result.estimation.usedObservationIds).toEqual(['successes', 'failures']);
    expect(result.estimation.ignoredObservationIds).toEqual([
      'start-visits',
      'elapsed-sample'
    ]);

    const best = result.estimation.candidates.find(
      (candidate) => candidate.candidateValue === 0.6
    );
    expect(best?.status).toBe('scored');
    if (best?.status === 'scored') {
      expect(best.relativeLikelihoodToBest).toBeCloseTo(1);
      expect(best.logLikelihood).not.toBeNull();
      expect(best.terms[0]?.totalCount).toBe(100);
      expect(best.terms[0]?.categories).toEqual([
        { to: 'failure', count: 40, probability: 0.4 },
        { to: 'success', count: 60, probability: 0.6 }
      ]);
    }
  });

  it('represents impossible positive-count events as zero likelihood without JSON-incompatible negative infinity', () => {
    const result = estimateDiscreteParameterFromTransitions({
      document: baseDocument(),
      observations: observations(1, 99),
      unknownParameter: 'successProbability',
      candidateValues: [0, 0.01]
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const impossible = result.estimation.candidates[0];
    expect(impossible?.status).toBe('scored');
    if (impossible?.status === 'scored') {
      expect(impossible.zeroLikelihood).toBe(true);
      expect(impossible.logLikelihood).toBeNull();
      expect(impossible.relativeLikelihoodToBest).toBe(0);
    }
    expect(result.estimation.estimatedValue).toBe(0.01);
  });

  it('rejects candidates outside a declared numeric range while ranking the remaining candidates', () => {
    const result = estimateDiscreteParameterFromTransitions({
      document: baseDocument(),
      observations: observations(),
      unknownParameter: 'successProbability',
      candidateValues: [0.5, 0.6, 0.8],
      constraint: { type: 'range', min: 0, max: 0.7 }
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.estimation.estimatedValue).toBe(0.6);
    expect(result.estimation.scoredCandidateCount).toBe(2);
    expect(result.estimation.rejectedCandidateCount).toBe(1);
    expect(result.estimation.candidates[2]).toMatchObject({
      candidateValue: 0.8,
      status: 'rejected'
    });
  });

  it('requires complete observed outgoing categories so omitted zero counts are not silently assumed', () => {
    const incomplete: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        {
          id: 'successes',
          type: 'transition_count',
          from: 'start',
          to: 'success',
          count: 60
        }
      ]
    };

    const result = estimateDiscreteParameterFromTransitions({
      document: baseDocument(),
      observations: incomplete,
      unknownParameter: 'successProbability',
      candidateValues: [0.5, 0.6]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('likelihood_data');
      expect(result.issues[0]?.code).toBe('incomplete_transition_count_categories');
    }
  });

  it('keeps the unknown parameter distinct from fixed supplied parameter values', () => {
    const document = baseDocument();
    document.parameterValues = {
      ...(document.parameterValues ?? {}),
      successProbability: 0.6
    };

    const result = estimateDiscreteParameterFromTransitions({
      document,
      observations: observations(),
      unknownParameter: 'successProbability',
      candidateValues: [0.5, 0.6]
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('unknown_parameter_already_supplied');
    }
  });

  it('uses the same transition likelihood for reward-axis models without netting or using rewards as evidence', () => {
    const document: ExternalRewardAxesModelDocument = {
      schemaVersion: 1,
      modelKind: 'reward_axes',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'success', terminal: true },
          { id: 'failure', terminal: true }
        ],
        parameters: [{ id: 'successProbability' }],
        rewardAxes: [
          { id: 'revenue', unit: 'JPY', kind: 'benefit' },
          { id: 'cost', unit: 'JPY', kind: 'cost' }
        ],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: {
              type: 'parameter_ref',
              parameter: 'successProbability'
            },
            rewardsByAxis: { revenue: 1000, cost: 100 }
          },
          {
            from: 'start',
            to: 'failure',
            probability: {
              type: 'formula',
              operator: 'subtract',
              left: 1,
              right: {
                type: 'parameter_ref',
                parameter: 'successProbability'
              }
            },
            rewardsByAxis: { revenue: 0, cost: 100 }
          }
        ]
      }
    };

    const result = estimateDiscreteParameterFromTransitions({
      document,
      observations: observations(),
      unknownParameter: 'successProbability',
      candidateValues: [0.5, 0.6, 0.7]
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.estimation.estimatedValue).toBe(0.6);
    }
  });
});
