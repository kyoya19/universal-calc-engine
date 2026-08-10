import { describe, expect, it } from 'vitest';
import {
  estimateExternalDiscreteParameterInput,
  estimateExternalDiscreteParameterJson,
  parseExternalDiscreteEstimationDocument
} from '../src/reverse_external_input';

function validEnvelope() {
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
    },
    observationDataset: {
      schemaVersion: 1,
      observations: [
        {
          id: 'starts',
          type: 'state_count',
          state: 'start',
          count: 100
        },
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
      parameterId: 'successProbability',
      candidates: [0.4, 0.5, 0.6, 0.7],
      constraints: [
        { type: 'minimum', value: 0 },
        { type: 'maximum', value: 1 }
      ]
    }
  };
}

describe('external reverse estimation input boundary', () => {
  it('shape-checks a complete external envelope and runs the existing estimator', () => {
    const result = estimateExternalDiscreteParameterInput(validEnvelope());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.document.schemaVersion).toBe(1);
    expect(result.document.estimationKind).toBe('discrete_parameter_candidates');
    expect(result.estimation.method).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(result.estimation.estimatedValue).toBe(0.6);
    expect(result.estimation.priorUsed).toBe(false);
    expect(result.estimation.posteriorComputed).toBe(false);
  });

  it('distinguishes JSON syntax failure from shape failure', () => {
    const syntax = estimateExternalDiscreteParameterJson('{');
    expect(syntax.ok).toBe(false);
    if (!syntax.ok) {
      expect(syntax.stage).toBe('json_syntax');
      expect(syntax.issues[0]?.code).toBe('invalid_json');
    }

    const shape = parseExternalDiscreteEstimationDocument({
      schemaVersion: 2,
      estimationKind: 'unknown',
      modelDocument: {},
      observationDataset: {},
      request: {}
    });
    expect(shape.ok).toBe(false);
    if (!shape.ok) {
      expect(shape.stage).toBe('shape');
      expect(shape.issues.some((issue) => issue.code === 'unsupported_schema_version')).toBe(true);
      expect(shape.issues.some((issue) => issue.code === 'unsupported_estimation_kind')).toBe(true);
    }
  });

  it('prefixes nested model and observation shape errors with envelope paths', () => {
    const input = validEnvelope();
    input.modelDocument.model.startState = 123 as unknown as string;
    input.observationDataset.observations[0] = {
      id: 'starts',
      type: 'state_count',
      state: 'start',
      count: '100' as unknown as number
    };

    const result = parseExternalDiscreteEstimationDocument(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (issue) =>
            issue.path === '$.modelDocument.model.startState' &&
            issue.code === 'expected_string'
        )
      ).toBe(true);
      expect(
        result.issues.some(
          (issue) =>
            issue.path === '$.observationDataset.observations[0].count' &&
            issue.code === 'expected_finite_number'
        )
      ).toBe(true);
    }
  });

  it('keeps semantic estimator failures in a separate estimation stage', () => {
    const input = validEnvelope();
    input.observationDataset.observations = [
      {
        id: 'starts',
        type: 'state_count',
        state: 'start',
        count: 100
      },
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
        count: 30
      }
    ];

    const result = estimateExternalDiscreteParameterInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationStage).toBe('observation_likelihood_contract');
      expect(result.issues.some((issue) => issue.code === 'incomplete_transition_counts')).toBe(true);
      expect(result.issues[0]?.path.startsWith('$.observationDataset')).toBe(true);
    }
  });

  it('leaves duplicate candidates to the estimator request contract rather than silently normalizing them', () => {
    const input = validEnvelope();
    input.request.candidates = [0.5, 0.5];

    const result = estimateExternalDiscreteParameterInput(input);
    expect(result.ok).toBe(false);
    if (!result.ok && result.stage === 'estimation') {
      expect(result.estimationStage).toBe('request');
      expect(result.issues[0]?.code).toBe('duplicate_candidate_value');
      expect(result.issues[0]?.path).toBe('$.request.candidates[1]');
    }
  });

  it('shape-checks constraint primitives before estimation semantics run', () => {
    const base = validEnvelope();
    const input = {
      ...base,
      request: {
        ...base.request,
        constraints: [
          { type: 'minimum', value: 0, inclusive: 'yes' }
        ]
      }
    };

    const result = parseExternalDiscreteEstimationDocument(input);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('shape');
      expect(result.issues[0]?.code).toBe('expected_boolean');
      expect(result.issues[0]?.path).toBe('$.request.constraints[0].inclusive');
    }
  });
});
