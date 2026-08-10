import {
  ExternalModelDocument,
  ObservationDataset,
  estimateDiscreteParameterCandidates
} from '../src/index';

const model: ExternalModelDocument = {
  schemaVersion: 1,
  modelKind: 'base',
  model: {
    startState: 'attempt',
    states: [
      { id: 'attempt' },
      { id: 'success', terminal: true },
      { id: 'failure', terminal: true }
    ],
    parameters: [{ id: 'successProbability' }],
    transitions: [
      {
        from: 'attempt',
        to: 'success',
        probability: {
          type: 'parameter_ref',
          parameter: 'successProbability'
        }
      },
      {
        from: 'attempt',
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
};

const observed: ObservationDataset = {
  schemaVersion: 1,
  observations: [
    { id: 'attempts', type: 'state_count', state: 'attempt', count: 100 },
    {
      id: 'successes',
      type: 'transition_count',
      from: 'attempt',
      to: 'success',
      count: 60
    },
    {
      id: 'failures',
      type: 'transition_count',
      from: 'attempt',
      to: 'failure',
      count: 40
    }
  ]
};

const estimation = estimateDiscreteParameterCandidates(model, observed, {
  parameterId: 'successProbability',
  candidates: [0.4, 0.5, 0.6, 0.7, 0.8],
  constraints: [
    { type: 'minimum', value: 0 },
    { type: 'maximum', value: 1 }
  ]
});

console.log(JSON.stringify(estimation, null, 2));
