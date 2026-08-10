import {
  estimateDiscreteParameterFromTransitions,
  type DiscreteParameterEstimationRequest
} from '../src/index';

const request: DiscreteParameterEstimationRequest = {
  document: {
    schemaVersion: 1,
    modelKind: 'base',
    parameterValues: {
      successReward: 200,
      attemptMinutes: 2
    },
    model: {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'success', terminal: true },
        { id: 'failure', terminal: true }
      ],
      parameters: [
        { id: 'successProbability', label: 'Success probability' },
        { id: 'successReward', unit: 'points' },
        { id: 'attemptMinutes', unit: 'minutes' }
      ],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: {
            type: 'parameter_ref',
            parameter: 'successProbability'
          },
          reward: {
            type: 'parameter_ref',
            parameter: 'successReward'
          },
          elapsedTime: {
            value: {
              type: 'parameter_ref',
              parameter: 'attemptMinutes'
            },
            unit: 'minutes'
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
          },
          elapsedTime: {
            value: {
              type: 'parameter_ref',
              parameter: 'attemptMinutes'
            },
            unit: 'minutes'
          }
        }
      ]
    }
  },
  observations: {
    schemaVersion: 1,
    observations: [
      {
        id: 'observed-successes',
        type: 'transition_count',
        from: 'start',
        to: 'success',
        count: 61
      },
      {
        id: 'observed-failures',
        type: 'transition_count',
        from: 'start',
        to: 'failure',
        count: 39
      }
    ]
  },
  unknownParameter: 'successProbability',
  candidateValues: [0.4, 0.5, 0.6, 0.7],
  constraint: {
    type: 'range',
    min: 0,
    max: 1
  }
};

const result = estimateDiscreteParameterFromTransitions(request);

if (!result.ok) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log({
    method: result.estimation.estimateKind,
    likelihood: result.estimation.likelihoodKind,
    estimatedValue: result.estimation.estimatedValue,
    bestCandidateValues: result.estimation.bestCandidateValues,
    candidates: result.estimation.candidates.map((candidate) =>
      candidate.status === 'scored'
        ? {
            value: candidate.candidateValue,
            logLikelihood: candidate.logLikelihood,
            relativeLikelihoodToBest: candidate.relativeLikelihoodToBest
          }
        : {
            value: candidate.candidateValue,
            rejected: candidate.issues
          }
    )
  });
}
