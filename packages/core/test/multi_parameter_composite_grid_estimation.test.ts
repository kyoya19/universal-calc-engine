import { describe, expect, it } from 'vitest';
import { ExternalModelDocument } from '../src/external_input';
import {
  MultiParameterCompositeGridEstimationRequest,
  estimateMultiParameterCompositeGrid
} from '../src/multi_parameter_composite_grid_estimation';
import { ObservationDataset } from '../src/observations';

function qualityDocument(): ExternalModelDocument {
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
  };
}

function qualityObservations(successes = 60, expectedQuality = 72): ObservationDataset {
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
      },
      {
        id: 'quality-observation',
        type: 'scalar',
        metric: 'expected_quality',
        value: expectedQuality,
        unit: 'points'
      }
    ]
  };
}

function qualityRequest(): MultiParameterCompositeGridEstimationRequest {
  return {
    parameters: [
      { parameterId: 'p', candidates: [0.5, 0.6] },
      {
        parameterId: 'qualityOnSuccess',
        candidates: [80, 100, 120],
        constraints: [{ type: 'minimum', value: 100 }]
      }
    ],
    maxCombinations: 10,
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
  };
}

describe('finite multi-parameter composite grid estimation', () => {
  it('jointly identifies multiple unknowns from transition and scalar evidence through the existing composite scorer', () => {
    const result = estimateMultiParameterCompositeGrid(
      qualityDocument(),
      qualityObservations(),
      qualityRequest()
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.searchMethod).toBe('finite_cartesian_parameter_grid');
    expect(result.compositeMethod).toBe('transition_plus_scalar_gaussian_composite_log_likelihood');
    expect(result.transitionMethod).toBe(
      'conditional_transition_log_likelihood_without_multinomial_constant'
    );
    expect(result.scalarMethod).toBe('conditionally_independent_gaussian_scalar_log_likelihood');
    expect(result.rawCombinationCount).toBe(6);
    expect(result.eligibleCombinationCount).toBe(4);
    expect(result.excludedCandidatesByParameter[1]?.excludedCandidates.map((item) => item.value)).toEqual([
      80
    ]);
    expect(result.identifiability).toBe('unique_best_assignment');
    expect(result.estimatedAssignment).toEqual({ p: 0.6, qualityOnSuccess: 120 });
    expect(result.bestAssignments).toEqual([{ p: 0.6, qualityOnSuccess: 120 }]);
    expect(result.usedObservationIds).toEqual({
      transition: ['starts', 'successes', 'failures'],
      scalar: ['quality-observation'],
      all: ['starts', 'successes', 'failures', 'quality-observation']
    });
    expect(result.independenceAssumption).toBe(
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
    );
    expect(result.priorUsed).toBe(false);
    expect(result.posteriorComputed).toBe(false);

    const best = result.assignments[0];
    expect(best?.assignment).toEqual({ p: 0.6, qualityOnSuccess: 120 });
    expect(best?.relativeLikelihoodToBest).toBe(1);
    expect(best?.totalLogLikelihoodScore).toBeCloseTo(
      (best?.transitionLogLikelihoodScore ?? 0) + (best?.scalarGaussianLogLikelihoodScore ?? 0),
      10
    );
    expect(best?.scalarObservationScores[0]?.predictedValue).toBeCloseTo(72, 10);
  });

  it('reports tied best assignments instead of choosing one when the finite grid is not identifiable', () => {
    const request = qualityRequest();
    request.parameters = [
      { parameterId: 'p', candidates: [0.5] },
      { parameterId: 'qualityOnSuccess', candidates: [100, 120] }
    ];

    const result = estimateMultiParameterCompositeGrid(
      qualityDocument(),
      qualityObservations(50, 55),
      request
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.identifiability).toBe('tied_best_assignments');
      expect(result.estimatedAssignment).toBeNull();
      expect(result.bestAssignments).toEqual(
        expect.arrayContaining([
          { p: 0.5, qualityOnSuccess: 100 },
          { p: 0.5, qualityOnSuccess: 120 }
        ])
      );
      expect(result.bestAssignments).toHaveLength(2);
    }
  });

  it('refuses to materialize a Cartesian grid larger than maxCombinations', () => {
    const request = qualityRequest();
    request.parameters = [
      { parameterId: 'p', candidates: [0.4, 0.5, 0.6] },
      { parameterId: 'qualityOnSuccess', candidates: [80, 100, 120] }
    ];
    request.maxCombinations = 4;

    const result = estimateMultiParameterCompositeGrid(
      qualityDocument(),
      qualityObservations(),
      request
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('request');
      expect(result.issues[0]?.code).toBe('candidate_grid_limit_exceeded');
    }
  });

  it('keeps a transition-impossible assignment impossible even when its scalar score is finite', () => {
    const request = qualityRequest();
    request.parameters = [
      { parameterId: 'p', candidates: [0, 0.6] },
      { parameterId: 'qualityOnSuccess', candidates: [120] }
    ];

    const result = estimateMultiParameterCompositeGrid(
      qualityDocument(),
      qualityObservations(),
      request
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const impossible = result.assignments.find((item) => item.assignment.p === 0);
    expect(impossible?.possible).toBe(false);
    expect(impossible?.transitionLogLikelihoodScore).toBeNull();
    expect(impossible?.totalLogLikelihoodScore).toBeNull();
    expect(impossible?.rank).toBeNull();
    expect(impossible?.scalarGaussianLogLikelihoodScore).toEqual(expect.any(Number));
  });

  it('rejects an assignment whose scalar predictor does not converge instead of using it as evidence', () => {
    const document: ExternalModelDocument = {
      schemaVersion: 1,
      modelKind: 'reward_axes',
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [{ id: 'p' }, { id: 'scale' }],
        rewardAxes: [{ id: 'quality', unit: 'points', kind: 'benefit' }],
        transitions: [
          {
            from: 'start',
            to: 'start',
            probability: { type: 'parameter_ref', parameter: 'p' },
            rewardsByAxis: { quality: { type: 'parameter_ref', parameter: 'scale' } }
          },
          {
            from: 'start',
            to: 'done',
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
    };
    const observations: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        { id: 'starts', type: 'state_count', state: 'start', count: 100 },
        { id: 'loops', type: 'transition_count', from: 'start', to: 'start', count: 0 },
        { id: 'done', type: 'transition_count', from: 'start', to: 'done', count: 100 },
        { id: 'quality', type: 'scalar', metric: 'expected_quality', value: 0, unit: 'points' }
      ]
    };
    const request: MultiParameterCompositeGridEstimationRequest = {
      parameters: [
        { parameterId: 'p', candidates: [0, 0.5] },
        { parameterId: 'scale', candidates: [1] }
      ],
      maxCombinations: 2,
      transitionObservationIds: ['starts', 'loops', 'done'],
      scalarLikelihoods: [
        {
          observationId: 'quality',
          predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
          errorModel: { type: 'gaussian', standardDeviation: 1, unit: 'points' }
        }
      ],
      independenceAssumption:
        'transition_and_scalar_evidence_conditionally_independent_given_candidate',
      solver: { maxIterations: 1, tolerance: 1e-12 }
    };

    const result = estimateMultiParameterCompositeGrid(document, observations, request);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.estimatedAssignment).toEqual({ p: 0, scale: 1 });
    expect(result.rejectedAssignments).toHaveLength(1);
    expect(result.rejectedAssignments[0]?.assignment).toEqual({ p: 0.5, scale: 1 });
    expect(result.rejectedAssignments[0]?.componentStage).toBe('candidate_evaluation');
  });
});
