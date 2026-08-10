import {
  estimateExternalReverseInput,
  formatReverseResultHandoffPlainText,
  reverseResultHandoffToJson,
  toReverseResultHandoff
} from '../src';

const externalCompositeInput = {
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
        id: 'observed-quality',
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
        observationId: 'observed-quality',
        predictor: { type: 'reward_axis_expected_value', axisId: 'quality' },
        errorModel: { type: 'gaussian', standardDeviation: 5, unit: 'points' }
      }
    ],
    independenceAssumption:
      'transition_and_scalar_evidence_conditionally_independent_given_candidate'
  }
};

const estimation = estimateExternalReverseInput(externalCompositeInput);
const handoff = toReverseResultHandoff(estimation);

console.log(formatReverseResultHandoffPlainText(handoff));
console.log(reverseResultHandoffToJson(handoff));
