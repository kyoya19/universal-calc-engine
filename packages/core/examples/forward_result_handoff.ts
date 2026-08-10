import {
  evaluateExternalModelJson,
  formatForwardResultHandoffPlainText,
  toForwardResultHandoff
} from '../src';

const externalInput = {
  schemaVersion: 1,
  modelKind: 'base',
  parameterValues: {
    successProbability: 0.6,
    successReward: 200,
    attemptMinutes: 1.5
  },
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
        probability: { type: 'parameter_ref', parameter: 'successProbability' },
        reward: { type: 'parameter_ref', parameter: 'successReward' },
        elapsedTime: {
          value: { type: 'parameter_ref', parameter: 'attemptMinutes' },
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
          right: { type: 'parameter_ref', parameter: 'successProbability' }
        },
        elapsedTime: {
          value: { type: 'parameter_ref', parameter: 'attemptMinutes' },
          unit: 'minutes'
        }
      }
    ]
  }
};

const result = evaluateExternalModelJson(JSON.stringify(externalInput), {
  reachabilityTargets: ['success']
});
const handoff = toForwardResultHandoff(result);
console.log(formatForwardResultHandoffPlainText(handoff));
