import { describe, expect, it } from 'vitest';
import { ExternalModelDocument } from '../src/external_input';
import { ObservationDataset } from '../src/observations';
import {
  MultiParameterGridEstimationRequest,
  estimateMultiParameterGrid
} from '../src/multi_parameter_grid_estimation';

function document(): ExternalModelDocument {
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
  };
}

function observations(successes: number): ObservationDataset {
  return {
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
  };
}

function request(): MultiParameterGridEstimationRequest {
  return {
    parameters: [
      { parameterId: 'a', candidates: [0.2, 0.4] },
      { parameterId: 'b', candidates: [0.6, 0.8] }
    ],
    maxCombinations: 10
  };
}

describe('multi-parameter grid estimation', () => {
  it('ranks the full Cartesian grid with the existing transition-count likelihood', () => {
    const result = estimateMultiParameterGrid(document(), observations(60), request());

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.searchMethod).toBe('finite_cartesian_parameter_grid');
    expect(result.likelihoodMethod).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(result.rawCombinationCount).toBe(4);
    expect(result.eligibleCombinationCount).toBe(4);
    expect(result.identifiability).toBe('unique_best_assignment');
    expect(result.estimatedAssignment).toEqual({ a: 0.4, b: 0.8 });
    expect(result.bestAssignments).toEqual([{ a: 0.4, b: 0.8 }]);
    expect(result.assignments[0]?.relativeLikelihoodToBest).toBe(1);
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);
  });

  it('reports tied assignments as non-identifiability instead of choosing an arbitrary estimate', () => {
    const result = estimateMultiParameterGrid(document(), observations(50), request());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identifiability).toBe('tied_best_assignments');
      expect(result.estimatedAssignment).toBeNull();
      expect(result.bestAssignments).toEqual(
        expect.arrayContaining([
          { a: 0.2, b: 0.8 },
          { a: 0.4, b: 0.6 }
        ])
      );
      expect(result.bestAssignments).toHaveLength(2);
    }
  });

  it('refuses to enumerate a grid larger than the explicit hard limit', () => {
    const result = estimateMultiParameterGrid(document(), observations(50), {
      parameters: [
        { parameterId: 'a', candidates: [0.1, 0.2, 0.3, 0.4] },
        { parameterId: 'b', candidates: [0.5, 0.6, 0.7, 0.8] }
      ],
      maxCombinations: 10
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('candidate_grid_limit_exceeded');
    }
  });

  it('applies per-parameter constraints before Cartesian expansion and reports excluded values', () => {
    const constrained = request();
    constrained.parameters[1] = {
      parameterId: 'b',
      candidates: [0.6, 0.8],
      constraints: [{ type: 'maximum', value: 0.6 }]
    };

    const result = estimateMultiParameterGrid(document(), observations(50), constrained);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rawCombinationCount).toBe(4);
      expect(result.eligibleCombinationCount).toBe(2);
      expect(result.excludedCandidatesByParameter[1]?.excludedCandidates).toHaveLength(1);
      expect(result.excludedCandidatesByParameter[1]?.excludedCandidates[0]?.value).toBe(0.8);
    }
  });

  it('requires at least two distinct declared unknown parameter dimensions', () => {
    const oneParameter = estimateMultiParameterGrid(document(), observations(50), {
      parameters: [{ parameterId: 'a', candidates: [0.2, 0.4] }],
      maxCombinations: 10
    });
    expect(oneParameter.ok).toBe(false);
    if (!oneParameter.ok) {
      expect(oneParameter.issues[0]?.code).toBe('insufficient_unknown_parameters');
    }

    const duplicated = estimateMultiParameterGrid(document(), observations(50), {
      parameters: [
        { parameterId: 'a', candidates: [0.2] },
        { parameterId: 'a', candidates: [0.4] }
      ],
      maxCombinations: 10
    });
    expect(duplicated.ok).toBe(false);
    if (!duplicated.ok) {
      expect(duplicated.issues[0]?.code).toBe('duplicate_estimation_parameter');
    }
  });

  it('preserves the transition-likelihood observation contract instead of absorbing scalar evidence', () => {
    const scalarDataset: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        { id: 'metric', type: 'scalar', metric: 'something', value: 1, unit: 'unit' }
      ]
    };

    const result = estimateMultiParameterGrid(document(), scalarDataset, request());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('observation_likelihood_contract');
      expect(
        result.issues.some(
          (issue) => issue.code === 'unsupported_scalar_observation_for_transition_likelihood'
        )
      ).toBe(true);
    }
  });

  it('keeps model-invalid assignments separate while ranking remaining assignments', () => {
    const invalidatingDocument: ExternalModelDocument = {
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'success', terminal: true },
          { id: 'failure', terminal: true }
        ],
        parameters: [{ id: 'p' }, { id: 'scale' }],
        transitions: [
          {
            from: 'start',
            to: 'success',
            probability: {
              type: 'formula',
              operator: 'multiply',
              left: { type: 'parameter_ref', parameter: 'p' },
              right: { type: 'parameter_ref', parameter: 'scale' }
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
                left: { type: 'parameter_ref', parameter: 'p' },
                right: { type: 'parameter_ref', parameter: 'scale' }
              }
            }
          }
        ]
      }
    };

    const result = estimateMultiParameterGrid(invalidatingDocument, observations(60), {
      parameters: [
        { parameterId: 'p', candidates: [0.6] },
        { parameterId: 'scale', candidates: [1, 2] }
      ],
      maxCombinations: 10
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.estimatedAssignment).toEqual({ p: 0.6, scale: 1 });
      expect(result.rejectedAssignments).toHaveLength(1);
      expect(result.rejectedAssignments[0]?.assignment).toEqual({ p: 0.6, scale: 2 });
    }
  });
});
