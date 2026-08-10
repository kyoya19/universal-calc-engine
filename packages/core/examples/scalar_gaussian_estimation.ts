import {
  ExternalModelDocument,
  ObservationDataset,
  ScalarGaussianParameterEstimationRequest,
  estimateScalarGaussianParameterCandidates
} from '../src';

const modelDocument: ExternalModelDocument = {
  schemaVersion: 1,
  modelKind: 'reward_axes',
  model: {
    startState: 'start',
    states: [{ id: 'start' }, { id: 'done', terminal: true }],
    parameters: [{ id: 'unitCost', unit: 'JPY/item' }],
    rewardAxes: [{ id: 'total_cost', label: 'Total cost', unit: 'JPY', kind: 'cost' }],
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

const observations: ObservationDataset = {
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
};

const request: ScalarGaussianParameterEstimationRequest = {
  parameterId: 'unitCost',
  candidates: [4, 5, 6],
  scalarLikelihoods: [
    {
      observationId: 'observed-total-cost',
      predictor: { type: 'reward_axis_expected_value', axisId: 'total_cost' },
      errorModel: {
        type: 'gaussian',
        standardDeviation: 2,
        unit: 'JPY'
      }
    }
  ]
};

const result = estimateScalarGaussianParameterCandidates(
  modelDocument,
  observations,
  request
);

console.log(JSON.stringify(result, null, 2));
