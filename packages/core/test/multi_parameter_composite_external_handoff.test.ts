import { describe, expect, it } from 'vitest';
import {
  estimateExternalReverseInput,
  estimateExternalReverseJson,
  parseExternalReverseEstimationDocument
} from '../src/reverse_external_methods';
import { toReverseResultHandoff } from '../src/reverse_result_handoff';

function envelope() {
  return {
    schemaVersion: 1,
    estimationKind: 'multi_parameter_composite_grid',
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
        parameters: [{ id: 'p' }, { id: 'qualityOnSuccess' }],
        rewardAxes: [{ id: 'quality', unit: 'points', kind: 'benefit' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: { type: 'parameter_ref', parameter: 'p' },
            rewardsByAxis: {
              quality: { type: 'parameter_ref', parameter: 'qualityOnSuccess' }
            }
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
          count: 60
        },
        {
          id: 'failures',
          type: 'transition_count',
          from: 'start',
          to: 'failure',
          count: 40
        },
        {
          id: 'quality-observation',
          type: 'scalar',
          metric: 'expected_quality',
          value: 72,
          unit: 'points'
        }
      ]
    },
    request: {
      parameters: [
        { parameterId: 'p', candidates: [0.5, 0.6] },
        {
          parameterId: 'qualityOnSuccess',
          candidates: [100, 120],
          constraints: [{ type: 'minimum', value: 100 }]
        }
      ],
      maxCombinations: 4,
      transitionObservationIds: ['starts', 'successes', 'failures'],
      scalarLikelihoods: [
        {
          observationId: 'quality-observation',
          predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
          errorModel: { type: 'gaussian', standardDeviation: 3, unit: 'points' }
        }
      ],
      independenceAssumption:
        'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    }
  };
}

describe('checked multi-parameter composite external input and handoff', () => {
  it('runs the fifth reverse kind from unknown input through the existing composite scorer', () => {
    const result = estimateExternalReverseInput(envelope());

    expect(result.ok).toBe(true);
    if (!result.ok || result.estimationKind !== 'multi_parameter_composite_grid') {
      return;
    }

    expect(result.document.estimationKind).toBe('multi_parameter_composite_grid');
    expect(result.estimation.searchMethod).toBe('finite_cartesian_parameter_grid');
    expect(result.estimation.compositeMethod).toBe(
      'transition_plus_scalar_gaussian_composite_log_likelihood'
    );
    expect(result.estimation.estimatedAssignment).toEqual({ p: 0.6, qualityOnSuccess: 120 });
    expect(result.estimation.priorUsed).toBe(false);
    expect(result.estimation.posteriorComputed).toBe(false);
  });

  it('runs the same fifth kind from JSON without a separate statistical path', () => {
    const result = estimateExternalReverseJson(JSON.stringify(envelope()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.estimationKind).toBe('multi_parameter_composite_grid');
    }
  });

  it('keeps maxCombinations enforcement in estimator semantics rather than truncating the grid', () => {
    const input = envelope();
    input.request.maxCombinations = 2;

    const parsed = parseExternalReverseEstimationDocument(input);
    expect(parsed.ok).toBe(true);

    const result = estimateExternalReverseInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('estimation');
      if (result.stage === 'estimation') {
        expect(result.estimationKind).toBe('multi_parameter_composite_grid');
        expect(result.estimationStage).toBe('request');
        expect(result.issues[0]?.code).toBe('candidate_grid_limit_exceeded');
      }
    }
  });

  it('does not deduplicate candidate values in the parser', () => {
    const input = envelope();
    input.request.parameters[0]!.candidates = [0.6, 0.6];

    const parsed = parseExternalReverseEstimationDocument(input);
    expect(parsed.ok).toBe(true);
    if (parsed.ok && parsed.document.estimationKind === 'multi_parameter_composite_grid') {
      expect(parsed.document.request.parameters[0]?.candidates).toEqual([0.6, 0.6]);
    }

    const result = estimateExternalReverseInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.issues[0]?.code).toBe('duplicate_candidate_value');
    }
  });

  it('does not repair zero Gaussian sigma in the parser', () => {
    const input = envelope();
    input.request.scalarLikelihoods[0]!.errorModel.standardDeviation = 0;

    const parsed = parseExternalReverseEstimationDocument(input);
    expect(parsed.ok).toBe(true);

    const result = estimateExternalReverseInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationKind).toBe('multi_parameter_composite_grid');
      expect(result.issues[0]?.code).toBe('invalid_gaussian_standard_deviation');
    }
  });

  it('requires the composite independence assumption explicitly at the checked shape boundary', () => {
    const input = envelope() as ReturnType<typeof envelope> & {
      request: ReturnType<typeof envelope>['request'] & { independenceAssumption: string };
    };
    input.request.independenceAssumption = 'none';

    const parsed = parseExternalReverseEstimationDocument(input);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.stage).toBe('shape');
      expect(parsed.issues[0]?.code).toBe('unsupported_independence_assumption');
    }
  });

  it('summarizes multi-composite assignment scores, evidence blocks and finite-grid limits in the common handoff', () => {
    const result = estimateExternalReverseInput(envelope());
    const handoff = toReverseResultHandoff(result);

    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.estimationKind).toBe('multi_parameter_composite_grid');
    expect(handoff.methods).toEqual({
      searchMethod: 'finite_cartesian_parameter_grid',
      compositeMethod: 'transition_plus_scalar_gaussian_composite_log_likelihood',
      transitionMethod: 'conditional_transition_log_likelihood_without_multinomial_constant',
      scalarMethod: 'conditionally_independent_gaussian_scalar_log_likelihood'
    });
    expect(handoff.selection).toMatchObject({
      estimatedAssignment: { p: 0.6, qualityOnSuccess: 120 },
      identifiability: 'unique_best_assignment'
    });
    expect(handoff.evidence.blocks).toEqual({
      transition: ['starts', 'successes', 'failures'],
      scalar: ['quality-observation']
    });
    expect(handoff.assumptions).toEqual([
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    ]);
    expect(handoff.searchLimits).toEqual({
      rawCombinationCount: 4,
      eligibleCombinationCount: 4,
      maxCombinations: 4
    });
    expect(handoff.ranking[0]).toHaveProperty('transitionLogLikelihoodScore');
    expect(handoff.ranking[0]).toHaveProperty('scalarGaussianLogLikelihoodScore');
    expect(handoff.ranking[0]).toHaveProperty('totalLogLikelihoodScore');
    expect(handoff.priorUsed).toBe(false);
    expect(handoff.posteriorComputed).toBe(false);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'finite_grid_identifiability_only'
      )
    ).toBe(true);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'scalar_units_require_exact_match_no_conversion'
      )
    ).toBe(true);
  });
});
