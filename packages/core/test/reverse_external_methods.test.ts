import { describe, expect, it } from 'vitest';
import {
  estimateExternalReverseInput,
  estimateExternalReverseJson,
  parseExternalReverseEstimationDocument
} from '../src/reverse_external_methods';

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
          id: 'quality-observation',
          type: 'scalar',
          metric: 'expected_quality',
          value: 60,
          unit: 'points'
        }
      ]
    },
    request: {
      parameterId: 'successProbability',
      candidates: [0.4, 0.5, 0.6],
      transitionObservationIds: ['starts', 'successes', 'failures'],
      scalarLikelihoods: [
        {
          observationId: 'quality-observation',
          predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
          errorModel: { type: 'gaussian', standardDeviation: 5, unit: 'points' }
        }
      ],
      independenceAssumption:
        'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    }
  };
}

function gridEnvelope() {
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
      parameters: [
        { parameterId: 'a', candidates: [0.2, 0.4] },
        { parameterId: 'b', candidates: [0.6, 0.8] }
      ],
      maxCombinations: 10
    }
  };
}

describe('checked external reverse method dispatcher', () => {
  it('runs scalar Gaussian estimation from unknown input without inferring predictor, sigma or units', () => {
    const result = estimateExternalReverseInput(scalarEnvelope());
    expect(result.ok).toBe(true);
    if (!result.ok || result.estimationKind !== 'scalar_gaussian_parameter_candidates') {
      return;
    }
    expect(result.estimation.estimatedValue).toBe(5);
    expect(result.estimation.priorUsed).toBe(false);
    expect(result.estimation.posteriorComputed).toBe(false);
  });

  it('runs composite evidence estimation only with its explicit independence literal', () => {
    const result = estimateExternalReverseInput(compositeEnvelope());
    expect(result.ok).toBe(true);
    if (!result.ok || result.estimationKind !== 'composite_parameter_candidates') {
      return;
    }
    expect(result.estimation.estimatedValue).toBe(0.6);
    expect(result.estimation.independenceAssumption).toBe(
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    );
  });

  it('runs the full multi-parameter Cartesian grid without truncation', () => {
    const result = estimateExternalReverseInput(gridEnvelope());
    expect(result.ok).toBe(true);
    if (!result.ok || result.estimationKind !== 'multi_parameter_transition_grid') {
      return;
    }
    expect(result.estimation.rawCombinationCount).toBe(4);
    expect(result.estimation.eligibleCombinationCount).toBe(4);
    expect(result.estimation.estimatedAssignment).toEqual({ a: 0.4, b: 0.8 });
  });

  it('keeps semantic duplicate candidates out of the shape parser', () => {
    const envelope = scalarEnvelope();
    envelope.request.candidates = [5, 5];

    const parsed = parseExternalReverseEstimationDocument(envelope);
    expect(parsed.ok).toBe(true);

    const result = estimateExternalReverseInput(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationKind).toBe('scalar_gaussian_parameter_candidates');
      expect(result.estimationStage).toBe('request');
      expect(result.issues[0]?.code).toBe('duplicate_candidate_value');
    }
  });

  it('does not invent a positive sigma when zero is supplied', () => {
    const envelope = scalarEnvelope();
    envelope.request.scalarLikelihoods[0]!.errorModel.standardDeviation = 0;

    const parsed = parseExternalReverseEstimationDocument(envelope);
    expect(parsed.ok).toBe(true);

    const result = estimateExternalReverseInput(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationStage).toBe('request');
      expect(result.issues[0]?.code).toBe('invalid_gaussian_standard_deviation');
    }
  });

  it('keeps maxCombinations enforcement in estimator semantics instead of truncating the grid', () => {
    const envelope = gridEnvelope();
    envelope.request.maxCombinations = 2;

    const parsed = parseExternalReverseEstimationDocument(envelope);
    expect(parsed.ok).toBe(true);

    const result = estimateExternalReverseInput(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationKind).toBe('multi_parameter_transition_grid');
      expect(result.estimationStage).toBe('request');
      expect(result.issues[0]?.code).toBe('candidate_grid_limit_exceeded');
    }
  });

  it('rejects malformed predictor shape instead of guessing from the metric name', () => {
    const envelope = scalarEnvelope();
    envelope.request.scalarLikelihoods[0]!.predictor = {
      type: 'metric_name_lookup'
    } as unknown as { type: 'reward_axis_expected_value'; axisId: string };

    const result = parseExternalReverseEstimationDocument(envelope);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('shape');
      expect(result.issues.some((issue) => issue.code === 'unsupported_scalar_predictor')).toBe(true);
    }
  });

  it('keeps JSON syntax errors separate from shape and estimation failures', () => {
    const result = estimateExternalReverseJson('{');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('json_syntax');
      expect(result.issues[0]?.code).toBe('invalid_json');
    }
  });
});
