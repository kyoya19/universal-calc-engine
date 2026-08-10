import { describe, expect, it } from 'vitest';
import { ExternalModelDocument } from '../src/external_input';
import { ObservationDataset } from '../src/observations';
import {
  ScalarGaussianParameterEstimationRequest,
  estimateScalarGaussianParameterCandidates
} from '../src/scalar_gaussian_estimation';

function rewardAxisDocument(): ExternalModelDocument {
  return {
    schemaVersion: 1,
    modelKind: 'reward_axes',
    model: {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      parameters: [{ id: 'unitCost' }],
      rewardAxes: [{ id: 'total_cost', unit: 'JPY', kind: 'cost' }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          rewardsByAxis: {
            total_cost: {
              type: 'formula',
              operator: 'multiply',
              left: 4,
              right: { type: 'parameter_ref', parameter: 'unitCost' }
            }
          }
        }
      ]
    }
  };
}

function scalarDataset(value = 20, unit = 'JPY'): ObservationDataset {
  return {
    schemaVersion: 1,
    observations: [
      {
        id: 'observed-total-cost',
        type: 'scalar',
        metric: 'total_cost',
        value,
        unit
      }
    ]
  };
}

function costRequest(): ScalarGaussianParameterEstimationRequest {
  return {
    parameterId: 'unitCost',
    candidates: [4, 5, 6],
    scalarLikelihoods: [
      {
        observationId: 'observed-total-cost',
        predictor: { type: 'reward_axis_expected_value', axisId: 'total_cost' },
        errorModel: { type: 'gaussian', standardDeviation: 2, unit: 'JPY' }
      }
    ]
  };
}

describe('scalar Gaussian parameter estimation', () => {
  it('ranks finite candidates through an explicit reward-axis predictor and Gaussian likelihood', () => {
    const result = estimateScalarGaussianParameterCandidates(
      rewardAxisDocument(),
      scalarDataset(),
      costRequest()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.method).toBe('conditionally_independent_gaussian_scalar_log_likelihood');
    expect(result.estimatedValue).toBe(5);
    expect(result.bestCandidateValues).toEqual([5]);
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);
    expect(result.independenceAssumption).toBe(
      'scalar_observations_conditionally_independent_given_candidate'
    );

    const best = result.candidates[0];
    expect(best?.value).toBe(5);
    expect(best?.relativeLikelihoodToBest).toBe(1);
    expect(best?.observationScores[0]).toMatchObject({
      observationId: 'observed-total-cost',
      metric: 'total_cost',
      observedValue: 20,
      predictedValue: 20,
      unit: 'JPY',
      standardDeviation: 2
    });
  });

  it('supports elapsed-time prediction only when seconds are explicit on observation and error model', () => {
    const document: ExternalModelDocument = {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [{ id: 'duration' }],
        transitions: [
          {
            from: 'start',
            to: 'done',
            probability: 1,
            elapsedTime: {
              value: { type: 'parameter_ref', parameter: 'duration' },
              unit: 'seconds'
            }
          }
        ]
      }
    };
    const observations: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        {
          id: 'duration-observation',
          type: 'scalar',
          metric: 'elapsed_time',
          value: 10,
          unit: 'seconds'
        }
      ]
    };
    const request: ScalarGaussianParameterEstimationRequest = {
      parameterId: 'duration',
      candidates: [8, 10, 12],
      scalarLikelihoods: [
        {
          observationId: 'duration-observation',
          predictor: { type: 'expected_elapsed_time_seconds' },
          errorModel: { type: 'gaussian', standardDeviation: 1, unit: 'seconds' }
        }
      ]
    };

    const result = estimateScalarGaussianParameterCandidates(document, observations, request);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.estimatedValue).toBe(10);
      expect(result.candidates[0]?.observationScores[0]?.predictedValue).toBe(10);
      expect(result.candidates[0]?.diagnostics.expectedElapsedTime?.converged).toBe(true);
    }
  });

  it('rejects zero or negative Gaussian standard deviation instead of inventing epsilon', () => {
    const request = costRequest();
    request.scalarLikelihoods[0] = {
      ...request.scalarLikelihoods[0]!,
      errorModel: { type: 'gaussian', standardDeviation: 0, unit: 'JPY' }
    };

    const result = estimateScalarGaussianParameterCandidates(
      rewardAxisDocument(),
      scalarDataset(),
      request
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('invalid_gaussian_standard_deviation');
    }
  });

  it('rejects unit mismatches between observation, predictor and Gaussian error model', () => {
    const result = estimateScalarGaussianParameterCandidates(
      rewardAxisDocument(),
      scalarDataset(20, 'USD'),
      costRequest()
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('scalar_likelihood_contract');
      expect(
        result.issues.some((issue) => issue.code === 'scalar_observation_predictor_unit_mismatch')
      ).toBe(true);
    }
  });

  it('does not silently ignore count observations or unbound scalar observations', () => {
    const observations: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        ...scalarDataset().observations,
        { id: 'another-scalar', type: 'scalar', metric: 'other', value: 1, unit: 'JPY' },
        { id: 'start-count', type: 'state_count', state: 'start', count: 1 }
      ]
    };

    const result = estimateScalarGaussianParameterCandidates(
      rewardAxisDocument(),
      observations,
      costRequest()
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('scalar_likelihood_contract');
      expect(
        result.issues.some(
          (issue) => issue.code === 'unsupported_non_scalar_observation_for_scalar_likelihood'
        )
      ).toBe(true);
      expect(result.issues.some((issue) => issue.code === 'unbound_scalar_observation')).toBe(true);
    }
  });

  it('reports symmetric best candidates as a tie instead of choosing one estimate', () => {
    const result = estimateScalarGaussianParameterCandidates(
      rewardAxisDocument(),
      scalarDataset(20),
      {
        ...costRequest(),
        candidates: [4, 6]
      }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.bestCandidateValues).toEqual([4, 6]);
      expect(result.estimatedValue).toBeNull();
    }
  });

  it('rejects reward-axis prediction on a base model as an explicit likelihood-contract error', () => {
    const document: ExternalModelDocument = {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [{ id: 'unitCost' }],
        transitions: [{ from: 'start', to: 'done', probability: 1 }]
      }
    };

    const result = estimateScalarGaussianParameterCandidates(document, scalarDataset(), costRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('scalar_likelihood_contract');
      expect(result.issues[0]?.code).toBe('unsupported_scalar_predictor_for_model');
    }
  });

  it('does not score a non-converged elapsed-time prediction as a valid estimate', () => {
    const document: ExternalModelDocument = {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'loop',
        states: [{ id: 'loop' }],
        parameters: [{ id: 'duration' }],
        transitions: [
          {
            from: 'loop',
            to: 'loop',
            probability: 1,
            elapsedTime: {
              value: { type: 'parameter_ref', parameter: 'duration' },
              unit: 'seconds'
            }
          }
        ]
      }
    };
    const observations: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        { id: 'duration-observation', type: 'scalar', metric: 'elapsed_time', value: 2, unit: 'seconds' }
      ]
    };
    const request: ScalarGaussianParameterEstimationRequest = {
      parameterId: 'duration',
      candidates: [1],
      solver: { maxIterations: 2, tolerance: 1e-12 },
      scalarLikelihoods: [
        {
          observationId: 'duration-observation',
          predictor: { type: 'expected_elapsed_time_seconds' },
          errorModel: { type: 'gaussian', standardDeviation: 1, unit: 'seconds' }
        }
      ]
    };

    const result = estimateScalarGaussianParameterCandidates(document, observations, request);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('candidate_evaluation');
      expect(result.issues[0]?.code).toBe('no_scorable_candidates');
    }
  });
});
