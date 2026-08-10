import { describe, expect, it } from 'vitest';
import {
  CompositeLikelihoodEstimationRequest,
  estimateCompositeParameterCandidates
} from '../src/composite_likelihood_estimation';
import { ExternalModelDocument } from '../src/external_input';
import { ObservationDataset } from '../src/observations';

function document(): ExternalModelDocument {
  return {
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
      rewardAxes: [{ id: 'quality', unit: 'points', kind: 'benefit' }],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: { type: 'parameter_ref', parameter: 'successProbability' },
          rewardsByAxis: { quality: 100 }
        },
        {
          from: 'start',
          to: 'failure',
          probability: {
            type: 'formula',
            operator: 'subtract',
            left: 1,
            right: { type: 'parameter_ref', parameter: 'successProbability' }
          },
          rewardsByAxis: { quality: 0 }
        }
      ]
    }
  };
}

function observations(scalarUnit = 'points'): ObservationDataset {
  return {
    schemaVersion: 1,
    observations: [
      { id: 'starts', type: 'state_count', state: 'start', count: 100 },
      {
        id: 'successes',
        type: 'transition_count',
        from: 'start',
        to: 'success',
        count: 55
      },
      {
        id: 'failures',
        type: 'transition_count',
        from: 'start',
        to: 'failure',
        count: 45
      },
      {
        id: 'observed-quality',
        type: 'scalar',
        metric: 'expected_quality',
        value: 60,
        unit: scalarUnit
      }
    ]
  };
}

function request(): CompositeLikelihoodEstimationRequest {
  return {
    parameterId: 'successProbability',
    candidates: [0.4, 0.5, 0.6],
    transitionObservationIds: ['starts', 'successes', 'failures'],
    scalarLikelihoods: [
      {
        observationId: 'observed-quality',
        predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
        errorModel: { type: 'gaussian', standardDeviation: 5, unit: 'points' }
      }
    ],
    independenceAssumption:
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
  };
}

describe('composite transition plus scalar Gaussian likelihood', () => {
  it('combines existing component scores only under the declared conditional-independence contract', () => {
    const result = estimateCompositeParameterCandidates(document(), observations(), request());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.method).toBe('transition_plus_scalar_gaussian_composite_log_likelihood');
    expect(result.transitionMethod).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(result.scalarMethod).toBe('conditionally_independent_gaussian_scalar_log_likelihood');
    expect(result.independenceAssumption).toBe(
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    );
    expect(result.transitionMultinomialConstantOmitted).toBe(true);
    expect(result.estimatedValue).toBe(0.6);
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);
    expect(result.usedObservationIds.transition).toEqual(['starts', 'successes', 'failures']);
    expect(result.usedObservationIds.scalar).toEqual(['observed-quality']);
    expect(result.usedObservationIds.all).toEqual([
      'starts',
      'successes',
      'failures',
      'observed-quality'
    ]);

    const best = result.candidates.find((candidate) => candidate.value === 0.6);
    expect(best?.rank).toBe(1);
    expect(best?.relativeLikelihoodToBest).toBe(1);
    expect(best?.scalarObservationScores[0]?.predictedValue).toBeCloseTo(60, 10);
    expect(best?.totalLogLikelihoodScore).toBeCloseTo(
      (best?.transitionLogLikelihoodScore ?? 0) +
        (best?.scalarGaussianLogLikelihoodScore ?? 0),
      10
    );
  });

  it('keeps a zero-probability transition candidate impossible even when its scalar component is finite', () => {
    const compositeRequest = request();
    compositeRequest.candidates = [0, 0.6];

    const result = estimateCompositeParameterCandidates(
      document(),
      observations(),
      compositeRequest
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const impossible = result.candidates.find((candidate) => candidate.value === 0);
    expect(impossible?.possible).toBe(false);
    expect(impossible?.transitionLogLikelihoodScore).toBeNull();
    expect(impossible?.totalLogLikelihoodScore).toBeNull();
    expect(impossible?.rank).toBeNull();
    expect(impossible?.scalarGaussianLogLikelihoodScore).toEqual(expect.any(Number));
  });

  it('rejects unassigned observations instead of silently ignoring evidence', () => {
    const dataset = observations();
    dataset.observations.push({
      id: 'unused-scalar',
      type: 'scalar',
      metric: 'unused',
      value: 1,
      unit: 'points'
    });

    const result = estimateCompositeParameterCandidates(document(), dataset, request());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('evidence_partition');
      expect(
        result.issues.some(
          (issue) => issue.code === 'unassigned_composite_evidence_observation'
        )
      ).toBe(true);
    }
  });

  it('rejects evidence block overlap and type misuse before component scoring', () => {
    const compositeRequest = request();
    compositeRequest.transitionObservationIds.push('observed-quality');

    const result = estimateCompositeParameterCandidates(
      document(),
      observations(),
      compositeRequest
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('evidence_observation_used_by_multiple_blocks');
    }
  });

  it('preserves scalar component contract failures instead of inventing unit conversion', () => {
    const result = estimateCompositeParameterCandidates(
      document(),
      observations('USD'),
      request()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('scalar_component');
      expect(result.componentStage).toBe('scalar_likelihood_contract');
      expect(
        result.issues.some(
          (issue) => issue.code === 'scalar_observation_predictor_unit_mismatch'
        )
      ).toBe(true);
    }
  });

  it('requires the evidence-block independence assumption explicitly at runtime', () => {
    const invalidRequest = {
      ...request(),
      independenceAssumption: 'none'
    } as unknown as CompositeLikelihoodEstimationRequest;

    const result = estimateCompositeParameterCandidates(
      document(),
      observations(),
      invalidRequest
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('missing_composite_independence_assumption');
    }
  });
});
