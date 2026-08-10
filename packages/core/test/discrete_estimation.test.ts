import { describe, expect, it } from 'vitest';
import {
  DiscreteParameterEstimationRequest,
  estimateDiscreteParameterCandidates
} from '../src/discrete_estimation';
import { ExternalModelDocument } from '../src/external_input';
import { ObservationDataset } from '../src/observations';

function baseDocument(): ExternalModelDocument {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    model: {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'success', terminal: true },
        { id: 'failure', terminal: true }
      ],
      parameters: [{ id: 'successProbability' }],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: {
            type: 'parameter_ref',
            parameter: 'successProbability'
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
          }
        }
      ]
    }
  };
}

function observations(successes: number, failures: number): ObservationDataset {
  return {
    schemaVersion: 1,
    observations: [
      { id: 'start-count', type: 'state_count', state: 'start', count: successes + failures },
      {
        id: 'success-count',
        type: 'transition_count',
        from: 'start',
        to: 'success',
        count: successes
      },
      {
        id: 'failure-count',
        type: 'transition_count',
        from: 'start',
        to: 'failure',
        count: failures
      }
    ]
  };
}

function request(candidates: number[]): DiscreteParameterEstimationRequest {
  return { parameterId: 'successProbability', candidates };
}

describe('discrete parameter estimation', () => {
  it('ranks discrete candidates by transition-count log likelihood without introducing a prior', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(60, 40),
      request([0.4, 0.5, 0.6, 0.7])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.method).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(result.estimatedValue).toBe(0.6);
    expect(result.bestCandidateValues).toEqual([0.6]);
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);
    expect(result.usedObservationIds).toEqual([
      'start-count',
      'success-count',
      'failure-count'
    ]);

    const best = result.candidates.find((candidate) => candidate.value === 0.6);
    const lower = result.candidates.find((candidate) => candidate.value === 0.5);
    expect(best?.rank).toBe(1);
    expect(best?.relativeLikelihoodToBest).toBe(1);
    expect(best?.logLikelihoodScore).not.toBeNull();
    expect((best?.logLikelihoodScore ?? -Infinity) > (lower?.logLikelihoodScore ?? -Infinity)).toBe(
      true
    );
  });

  it('uses explicit constraints to exclude candidates and reports model-invalid candidates separately', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(60, 40),
      {
        parameterId: 'successProbability',
        candidates: [0.2, 0.6, 0.8, 1.2],
        constraints: [
          { type: 'minimum', value: 0.4 },
          { type: 'maximum', value: 1.5 }
        ]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.excludedCandidates.map((candidate) => candidate.value)).toEqual([0.2]);
    expect(result.rejectedCandidates.map((candidate) => candidate.value)).toEqual([1.2]);
    expect(result.rejectedCandidates[0]?.stage).toBe('model_validation');
    expect(result.estimatedValue).toBe(0.6);
  });

  it('marks candidates that assign zero probability to an observed transition as impossible', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(60, 40),
      request([0, 0.5, 1])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.estimatedValue).toBe(0.5);
    const zero = result.candidates.find((candidate) => candidate.value === 0);
    const one = result.candidates.find((candidate) => candidate.value === 1);
    expect(zero?.possible).toBe(false);
    expect(zero?.logLikelihoodScore).toBeNull();
    expect(zero?.relativeLikelihoodToBest).toBe(0);
    expect(one?.possible).toBe(false);
  });

  it('does not choose an arbitrary estimate when the best candidates tie', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(50, 50),
      request([0.4, 0.6])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.estimatedValue).toBeNull();
    expect(result.bestCandidateValues).toEqual([0.4, 0.6]);
  });

  it('requires transition counts to form a complete departure count for each likelihood state', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      {
        schemaVersion: 1,
        observations: [
          { id: 'start-count', type: 'state_count', state: 'start', count: 100 },
          {
            id: 'success-count',
            type: 'transition_count',
            from: 'start',
            to: 'success',
            count: 60
          }
        ]
      },
      request([0.5, 0.6])
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('observation_likelihood_contract');
    expect(result.issues.some((issue) => issue.code === 'incomplete_transition_counts')).toBe(true);
  });

  it('keeps scalar observations distinct instead of silently treating them as parameter evidence', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      {
        schemaVersion: 1,
        observations: [
          { id: 'start-count', type: 'state_count', state: 'start', count: 100 },
          {
            id: 'success-count',
            type: 'transition_count',
            from: 'start',
            to: 'success',
            count: 60
          },
          {
            id: 'failure-count',
            type: 'transition_count',
            from: 'start',
            to: 'failure',
            count: 40
          },
          {
            id: 'elapsed',
            type: 'scalar',
            metric: 'observed_elapsed_time',
            value: 120,
            unit: 'seconds'
          }
        ]
      },
      request([0.5, 0.6])
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.stage).toBe('observation_likelihood_contract');
    expect(
      result.issues.some(
        (issue) => issue.code === 'unsupported_scalar_observation_for_transition_likelihood'
      )
    ).toBe(true);
  });

  it('uses the same probability likelihood contract for named reward-axis models', () => {
    const document: ExternalModelDocument = {
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
        rewardAxes: [{ id: 'score', unit: 'points', kind: 'benefit' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: { type: 'parameter_ref', parameter: 'successProbability' },
            rewardsByAxis: { score: 10 }
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
            rewardsByAxis: { score: 0 }
          }
        ]
      }
    };

    const result = estimateDiscreteParameterCandidates(
      document,
      observations(70, 30),
      request([0.5, 0.7, 0.9])
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.estimatedValue).toBe(0.7);
  });
});
