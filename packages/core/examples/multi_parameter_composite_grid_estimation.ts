import {
  ExternalModelDocument,
  MultiParameterCompositeGridEstimationRequest,
  ObservationDataset,
  estimateMultiParameterCompositeGrid
} from '../src';

const modelDocument: ExternalModelDocument = {
  schemaVersion: 1,
  modelKind: 'reward_axes',
  model: {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'success', terminal: true },
      { id: 'failure', terminal: true }
    ],
    parameters: [{ id: 'successProbability' }, { id: 'qualityOnSuccess' }],
    rewardAxes: [{ id: 'quality', unit: 'points', kind: 'benefit' }],
    transitions: [
      {
        from: 'start',
        to: 'success',
        probability: { type: 'parameter_ref', parameter: 'successProbability' },
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
          right: { type: 'parameter_ref', parameter: 'successProbability' }
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
      id: 'observed-quality',
      type: 'scalar',
      metric: 'expected_quality',
      value: 72,
      unit: 'points'
    }
  ]
};

const request: MultiParameterCompositeGridEstimationRequest = {
  parameters: [
    { parameterId: 'successProbability', candidates: [0.5, 0.6, 0.7] },
    { parameterId: 'qualityOnSuccess', candidates: [100, 120, 140] }
  ],
  maxCombinations: 9,
  transitionObservationIds: ['starts', 'successes', 'failures'],
  scalarLikelihoods: [
    {
      observationId: 'observed-quality',
      predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
      errorModel: { type: 'gaussian', standardDeviation: 3, unit: 'points' }
    }
  ],
  independenceAssumption:
    'transition_and_scalar_evidence_conditionally_independent_given_candidate'
};

const result = estimateMultiParameterCompositeGrid(modelDocument, observations, request);
console.log(JSON.stringify(result, null, 2));
