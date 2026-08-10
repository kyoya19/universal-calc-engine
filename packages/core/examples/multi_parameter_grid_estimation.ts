import {
  ExternalModelDocument,
  MultiParameterGridEstimationRequest,
  ObservationDataset,
  estimateMultiParameterGrid
} from '../src';

const modelDocument: ExternalModelDocument = {
  schemaVersion: 1,
  modelKind: 'base',
  model: {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'success', terminal: true },
      { id: 'failure', terminal: true }
    ],
    parameters: [{ id: 'componentA' }, { id: 'componentB' }],
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
            left: { type: 'parameter_ref', parameter: 'componentA' },
            right: { type: 'parameter_ref', parameter: 'componentB' }
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
              left: { type: 'parameter_ref', parameter: 'componentA' },
              right: { type: 'parameter_ref', parameter: 'componentB' }
            }
          }
        }
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
    }
  ]
};

const request: MultiParameterGridEstimationRequest = {
  parameters: [
    { parameterId: 'componentA', candidates: [0.2, 0.4] },
    { parameterId: 'componentB', candidates: [0.6, 0.8] }
  ],
  maxCombinations: 10
};

const result = estimateMultiParameterGrid(modelDocument, observations, request);
console.log(JSON.stringify(result, null, 2));
