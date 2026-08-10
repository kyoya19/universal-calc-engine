import { describe, expect, it } from 'vitest';
import { estimateExternalReverseInput } from '../src/reverse_external_methods';

describe('generic reverse dispatcher discrete compatibility', () => {
  it('runs the established discrete_parameter_candidates kind through the generic entry point', () => {
    const result = estimateExternalReverseInput({
      schemaVersion: 1,
      estimationKind: 'discrete_parameter_candidates',
      modelDocument: {
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [
            { id: 'start' },
            { id: 'success', terminal: true },
            { id: 'failure', terminal: true }
          ],
          parameters: [{ id: 'p' }],
          transitions: [
            {
              from: 'start',
              to: 'success',
              probability: { type: 'parameter_ref', parameter: 'p' }
            },
            {
              from: 'start',
              to: 'failure',
              probability: {
                type: 'formula',
                operator: 'subtract',
                left: 1,
                right: { type: 'parameter_ref', parameter: 'p' }
              }
            }
          ]
        }
      },
      observationDataset: {
        schemaVersion: 1,
        observations: [
          { id: 'starts', type: 'state_count', state: 'start', count: 10 },
          {
            id: 'successes',
            type: 'transition_count',
            from: 'start',
            to: 'success',
            count: 6
          },
          {
            id: 'failures',
            type: 'transition_count',
            from: 'start',
            to: 'failure',
            count: 4
          }
        ]
      },
      request: { parameterId: 'p', candidates: [0.4, 0.6] }
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.estimationKind !== 'discrete_parameter_candidates') {
      return;
    }
    expect(result.estimation.estimatedValue).toBe(0.6);
    expect(result.estimation.priorUsed).toBe(false);
    expect(result.estimation.posteriorComputed).toBe(false);
  });
});
