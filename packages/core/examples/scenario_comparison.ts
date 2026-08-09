import { compareExternalModelScenarios } from '../src/scenario_comparison';

const model = {
  schemaVersion: 1,
  modelKind: 'base',
  model: {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'success', terminal: true },
      { id: 'failure', terminal: true }
    ],
    parameters: [
      { id: 'successProbability' },
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
} as const;

export function runScenarioComparisonExample() {
  return compareExternalModelScenarios(
    model,
    {
      baseline: {
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      },
      candidate: {
        successProbability: 0.6,
        successReward: 200,
        attemptMinutes: 1.5
      }
    },
    { reachabilityTargets: ['success'] }
  );
}
