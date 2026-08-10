import { describe, expect, it } from 'vitest';
import { estimateExternalReverseInput } from '../src/reverse_external_methods';
import {
  formatReverseResultHandoffPlainText,
  toReverseResultHandoff
} from '../src/reverse_result_handoff';

function discreteEnvelope() {
  return {
    schemaVersion: 1,
    estimationKind: 'discrete_parameter_candidates',
    modelDocument: {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'success', terminal: true },
          { id: 'failure', terminal: true }
        ],
        parameters: [{ id: 'p' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: { type: 'parameter_ref', parameter: 'p' }
          },
          {
            from: 'start',
            to: 'failure',
            probability: {
              type: 'formula',
              operator: 'subtract',
              left: 1,
              right: { type: 'parameter_ref', parameter: 'p' }
            }
          }
        ]
      }
    },
    observationDataset: {
      schemaVersion: 1,
      observations: [
        { id: 'starts', type: 'state_count', state: 'start', count: 100 },
        {
          id: 'successes',
          type: 'transition_count',
          from: 'start',
          to: 'success',
          count: 60
        },
        {
          id: 'failures',
          type: 'transition_count',
          from: 'start',
          to: 'failure',
          count: 40
        }
      ]
    },
    request: {
      parameterId: 'p',
      candidates: [0.4, 0.6],
      constraints: [{ type: 'minimum', value: 0.3 }]
    }
  };
}

function scalarEnvelope() {
  return {
    schemaVersion: 1,
    estimationKind: 'scalar_gaussian_parameter_candidates',
    modelDocument: {
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
    },
    observationDataset: {
      schemaVersion: 1,
      observations: [
        {
          id: 'observed-total-cost',
          type: 'scalar',
          metric: 'total_cost',
          value: 20,
          unit: 'JPY'
        }
      ]
    },
    request: {
      parameterId: 'unitCost',
      candidates: [4, 5, 6],
      scalarLikelihoods: [
        {
          observationId: 'observed-total-cost',
          predictor: { type: 'reward_axis_expected_value', axisId: 'total_cost' },
          errorModel: { type: 'gaussian', standardDeviation: 2, unit: 'JPY' }
        }
      ]
    }
  };
}

function compositeEnvelope() {
  return {
    schemaVersion: 1,
    estimationKind: 'composite_parameter_candidates',
    modelDocument: {
      schemaVersion: 1,
      modelKind: 'reward_axes',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'success', terminal: true },
          { id: 'failure', terminal: true }
        ],
        parameters: [{ id: 'p' }],
        rewardAxes: [{ id: 'quality', unit: 'points', kind: 'benefit' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: { type: 'parameter_ref', parameter: 'p' },
            rewardsByAxis: { quality: 100 }
          },
          {
            from: 'start',
            to: 'failure',
            probability: {
              type: 'formula',
              operator: 'subtract',
              left: 1,
              right: { type: 'parameter_ref', parameter: 'p' }
            },
            rewardsByAxis: { quality: 0 }
          }
        ]
      }
    },
    observationDataset: {
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
          id: 'quality',
          type: 'scalar',
          metric: 'expected_quality',
          value: 60,
          unit: 'points'
        }
      ]
    },
    request: {
      parameterId: 'p',
      candidates: [0.4, 0.5, 0.6],
      transitionObservationIds: ['starts', 'successes', 'failures'],
      scalarLikelihoods: [
        {
          observationId: 'quality',
          predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
          errorModel: { type: 'gaussian', standardDeviation: 5, unit: 'points' }
        }
      ],
      independenceAssumption:
        'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    }
  };
}

function gridEnvelope(successes = 60) {
  return {
    schemaVersion: 1,
    estimationKind: 'multi_parameter_transition_grid',
    modelDocument: {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'success', terminal: true },
          { id: 'failure', terminal: true }
        ],
        parameters: [{ id: 'a' }, { id: 'b' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: {
              type: 'formula',
              operator: 'multiply',
              left: 0.5,
              right: {
                type: 'formula',
                operator: 'add',
                left: { type: 'parameter_ref', parameter: 'a' },
                right: { type: 'parameter_ref', parameter: 'b' }
              }
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
                type: 'formula',
                operator: 'multiply',
                left: 0.5,
                right: {
                  type: 'formula',
                  operator: 'add',
                  left: { type: 'parameter_ref', parameter: 'a' },
                  right: { type: 'parameter_ref', parameter: 'b' }
                }
              }
            }
          }
        ]
      }
    },
    observationDataset: {
      schemaVersion: 1,
      observations: [
        { id: 'starts', type: 'state_count', state: 'start', count: 100 },
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
          count: 100 - successes
        }
      ]
    },
    request: {
      parameters: [
        { parameterId: 'a', candidates: [0.2, 0.4] },
        {
          parameterId: 'b',
          candidates: [0.6, 0.8],
          constraints: [{ type: 'minimum', value: 0.6 }]
        }
      ],
      maxCombinations: 10
    }
  };
}

function handoffFor(input: unknown) {
  return toReverseResultHandoff(estimateExternalReverseInput(input));
}

describe('reverse result handoff', () => {
  it('summarizes transition likelihood without relabelling likelihood ratio as posterior', () => {
    const handoff = handoffFor(discreteEnvelope());
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.estimationKind).toBe('discrete_parameter_candidates');
    expect(handoff.methods.likelihoodMethod).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(handoff.selection).toMatchObject({
      parameterId: 'p',
      estimatedValue: 0.6,
      status: 'unique_best_candidate'
    });
    expect(handoff.constraints).toEqual({
      parameterId: 'p',
      constraints: [{ type: 'minimum', value: 0.3 }]
    });
    expect(handoff.priorUsed).toBe(false);
    expect(handoff.posteriorComputed).toBe(false);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'relative_likelihood_is_not_posterior_probability'
      )
    ).toBe(true);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'transition_multinomial_constant_omitted'
      )
    ).toBe(true);
  });

  it('keeps scalar likelihood assumptions and convergence diagnostics visible', () => {
    const handoff = handoffFor(scalarEnvelope());
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.estimationKind).toBe('scalar_gaussian_parameter_candidates');
    expect(handoff.assumptions).toEqual([
      'scalar_observations_conditionally_independent_given_candidate'
    ]);
    const first = handoff.ranking[0];
    expect(first).toHaveProperty('diagnostics');
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'scalar_units_require_exact_match_no_conversion'
      )
    ).toBe(true);
  });

  it('preserves composite component scores and explicit evidence blocks', () => {
    const handoff = handoffFor(compositeEnvelope());
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.estimationKind).toBe('composite_parameter_candidates');
    expect(handoff.methods).toMatchObject({
      compositeMethod: 'transition_plus_scalar_gaussian_composite_log_likelihood',
      transitionMethod: 'conditional_transition_log_likelihood_without_multinomial_constant',
      scalarMethod: 'conditionally_independent_gaussian_scalar_log_likelihood'
    });
    expect(handoff.evidence.blocks).toEqual({
      transition: ['starts', 'successes', 'failures'],
      scalar: ['quality']
    });
    expect(handoff.assumptions).toEqual([
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    ]);
    expect(handoff.ranking[0]).toHaveProperty('transitionLogLikelihoodScore');
    expect(handoff.ranking[0]).toHaveProperty('scalarGaussianLogLikelihoodScore');
    expect(handoff.ranking[0]).toHaveProperty('totalLogLikelihoodScore');
  });

  it('summarizes finite-grid search limits and finite-grid identifiability', () => {
    const handoff = handoffFor(gridEnvelope());
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.estimationKind).toBe('multi_parameter_transition_grid');
    expect(handoff.methods.searchMethod).toBe('finite_cartesian_parameter_grid');
    expect(handoff.searchLimits).toEqual({
      rawCombinationCount: 4,
      eligibleCombinationCount: 4,
      maxCombinations: 10
    });
    expect(handoff.selection).toMatchObject({
      estimatedAssignment: { a: 0.4, b: 0.8 },
      identifiability: 'unique_best_assignment'
    });
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'finite_grid_identifiability_only'
      )
    ).toBe(true);
  });

  it('warns on tied finite-grid results instead of inventing a unique assignment', () => {
    const handoff = handoffFor(gridEnvelope(50));
    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.selection).toMatchObject({
      estimatedAssignment: null,
      identifiability: 'tied_best_assignments'
    });
    expect(handoff.warnings.some((warning) => warning.code === 'estimate_not_unique')).toBe(true);
  });

  it('summarizes estimation failures without fabricating an estimate or statistical result', () => {
    const envelope = scalarEnvelope();
    envelope.request.scalarLikelihoods[0]!.errorModel.standardDeviation = 0;
    const handoff = handoffFor(envelope);

    expect(handoff).toMatchObject({
      status: 'failure',
      stage: 'estimation',
      estimationKind: 'scalar_gaussian_parameter_candidates',
      estimationStage: 'request'
    });
    if (handoff.status === 'failure') {
      expect(handoff.issues[0]?.code).toBe('invalid_gaussian_standard_deviation');
      expect(handoff).not.toHaveProperty('selection');
      expect(handoff).not.toHaveProperty('posteriorComputed');
    }
  });

  it('formats a concise plain-text handoff without hiding prior/posterior status', () => {
    const handoff = handoffFor(compositeEnvelope());
    const text = formatReverseResultHandoffPlainText(handoff);
    expect(text).toContain('reverse estimation: success');
    expect(text).toContain('prior used: false');
    expect(text).toContain('posterior computed: false');
    expect(text).toContain('transition_plus_scalar_gaussian_composite_log_likelihood');
  });
});
