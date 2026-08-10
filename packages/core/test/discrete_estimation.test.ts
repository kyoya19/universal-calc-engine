import { describe, expect, it } from 'vitest';
import { estimateDiscreteParameterCandidates } from '../src/discrete_estimation';
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
          probability: { type: 'parameter_ref', parameter: 'successProbability' }
        },
        {
          from: 'start',
          to: 'failure',
          probability: {
            type: 'formula',
            operator: 'subtract',
            left: 1,
            right: { type: 'parameter_ref', parameter: 'successProbability' }
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
      { id: 'success-count', type: 'transition_count', from: 'start', to: 'success', count: successes },
      { id: 'failure-count', type: 'transition_count', from: 'start', to: 'failure', count: failures }
    ]
  };
}

describe('discrete parameter estimation', () => {
  it('ranks candidates by transition-count log likelihood without a prior or posterior', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(60, 40),
      { parameterId: 'successProbability', candidates: [0.4, 0.5, 0.6, 0.7] }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.method).toBe('conditional_transition_log_likelihood_without_multinomial_constant');
    expect(result.estimatedValue).toBe(0.6);
    expect(result.bestCandidateValues).toEqual([0.6]);
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);
    const best = result.candidates.find((candidate) => candidate.value === 0.6);
    expect(best?.rank).toBe(1);
    expect(best?.relativeLikelihoodToBest).toBe(1);
  });

  it('separates constraint exclusions, invalid models, and impossible likelihood candidates', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(60, 40),
      {
        parameterId: 'successProbability',
        candidates: [-0.2, 0, 0.6, 1, 1.2],
        constraints: [{ type: 'minimum', value: 0 }]
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.excludedCandidates.map((candidate) => candidate.value)).toEqual([-0.2]);
    expect(result.rejectedCandidates.map((candidate) => candidate.value)).toEqual([1.2]);
    expect(result.candidates.find((candidate) => candidate.value === 0)?.possible).toBe(false);
    expect(result.candidates.find((candidate) => candidate.value === 1)?.possible).toBe(false);
    expect(result.estimatedValue).toBe(0.6);
  });

  it('does not choose arbitrarily when discrete best candidates tie', () => {
    const result = estimateDiscreteParameterCandidates(
      baseDocument(),
      observations(50, 50),
      { parameterId: 'successProbability', candidates: [0.4, 0.6] }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.estimatedValue).toBeNull();
    expect(result.bestCandidateValues).toEqual([0.4, 0.6]);
  });

  it('requires complete transition departure counts and keeps scalar evidence separate', () => {
    const incomplete = estimateDiscreteParameterCandidates(
      baseDocument(),
      {
        schemaVersion: 1,
        observations: [
          { id: 'start-count', type: 'state_count', state: 'start', count: 100 },
          { id: 'success-count', type: 'transition_count', from: 'start', to: 'success', count: 60 }
        ]
      },
      { parameterId: 'successProbability', candidates: [0.5, 0.6] }
    );
    expect(incomplete.ok).toBe(false);
    if (!incomplete.ok) {
      expect(incomplete.stage).toBe('observation_likelihood_contract');
      expect(incomplete.issues.some((issue) => issue.code === 'incomplete_transition_counts')).toBe(true);
    }

    const scalar = estimateDiscreteParameterCandidates(
      baseDocument(),
      {
        ...observations(60, 40),
        observations: [
          ...observations(60, 40).observations,
          { id: 'elapsed', type: 'scalar' as const, metric: 'elapsed', value: 120, unit: 'seconds' }
        ]
      },
      { parameterId: 'successProbability', candidates: [0.5, 0.6] }
    );
    expect(scalar.ok).toBe(false);
    if (!scalar.ok) {
      expect(scalar.stage).toBe('observation_likelihood_contract');
      expect(scalar.issues.some((issue) => issue.code === 'unsupported_scalar_observation_for_transition_likelihood')).toBe(true);
    }
  });

  it('applies the same probability likelihood contract to named reward-axis models', () => {
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
      { parameterId: 'successProbability', candidates: [0.5, 0.7, 0.9] }
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.estimatedValue).toBe(0.7);
  });
});
