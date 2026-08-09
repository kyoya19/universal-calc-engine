import { describe, expect, it } from 'vitest';
import { analyzeParameterSensitivity } from '../src/parameter_sensitivity';

const genericModel = {
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

describe('parameter sensitivity', () => {
  it('changes exactly one selected parameter across multiple candidate values', () => {
    const result = analyzeParameterSensitivity(
      genericModel,
      {
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      },
      {
        parameterId: 'successProbability',
        candidateValues: [0.5, 0.6]
      },
      { reachabilityTargets: ['success'] }
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'base') {
      return;
    }

    expect(result.sensitivityKind).toBe('one_at_a_time');
    expect(result.baselineValue).toBeCloseTo(0.4);
    expect(result.converged).toBe(true);
    expect(result.points).toHaveLength(2);

    const first = result.points[0];
    const second = result.points[1];
    expect(first?.candidateValue).toBe(0.5);
    expect(first?.comparison.parameters.changedParameterIds).toEqual([
      'successProbability'
    ]);
    expect(first?.comparison.delta.expectedReward).toBeCloseTo(20);
    expect(first?.comparison.delta.expectedElapsedTimeSeconds).toBeCloseTo(0);
    expect(first?.comparison.delta.rewardPerHour).toBeCloseTo(600);
    expect(first?.comparison.delta.reachabilityProbabilityFromStart).toBeCloseTo(0.1);

    expect(second?.candidateValue).toBe(0.6);
    expect(second?.comparison.parameters.changedParameterIds).toEqual([
      'successProbability'
    ]);
    expect(second?.comparison.delta.expectedReward).toBeCloseTo(40);
    expect(second?.comparison.delta.rewardPerHour).toBeCloseTo(1200);
    expect(second?.comparison.delta.reachabilityProbabilityFromStart).toBeCloseTo(0.2);
  });

  it('supports named reward axes through the existing scenario comparison path', () => {
    const result = analyzeParameterSensitivity(
      {
        schemaVersion: 1,
        modelKind: 'reward_axes',
        model: {
          startState: 'start',
          states: [{ id: 'start' }, { id: 'done', terminal: true }],
          parameters: [{ id: 'revenue', defaultValue: 1000, unit: 'JPY' }],
          rewardAxes: [{ id: 'revenue', unit: 'JPY', kind: 'benefit' }],
          transitions: [
            {
              from: 'start',
              to: 'done',
              probability: 1,
              rewardsByAxis: {
                revenue: { type: 'parameter_ref', parameter: 'revenue' }
              }
            }
          ]
        }
      },
      {},
      { parameterId: 'revenue', candidateValues: [1200, 1500] }
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'reward_axes') {
      return;
    }

    expect(result.baselineValue).toBe(1000);
    expect(result.points[0]?.comparison.rewardAxesDelta.expectedRewardByAxis.revenue).toBe(200);
    expect(result.points[1]?.comparison.rewardAxesDelta.expectedRewardByAxis.revenue).toBe(500);
  });

  it('reports option, baseline, and candidate failures at distinct stages', () => {
    const unknownParameter = analyzeParameterSensitivity(
      genericModel,
      {
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      },
      { parameterId: 'missing', candidateValues: [1] }
    );
    expect(unknownParameter.ok).toBe(false);
    if (!unknownParameter.ok) {
      expect(unknownParameter.stage).toBe('sensitivity_options');
      expect(unknownParameter.issues[0]?.code).toBe('unknown_parameter_id');
    }

    const missingBaseline = analyzeParameterSensitivity(
      genericModel,
      { successProbability: 0.4, attemptMinutes: 2 },
      { parameterId: 'successProbability', candidateValues: [0.5] }
    );
    expect(missingBaseline.ok).toBe(false);
    if (!missingBaseline.ok) {
      expect(missingBaseline.stage).toBe('baseline_parameter_resolution');
    }

    const invalidCandidate = analyzeParameterSensitivity(
      genericModel,
      {
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      },
      { parameterId: 'successProbability', candidateValues: [1.2] }
    );
    expect(invalidCandidate.ok).toBe(false);
    if (!invalidCandidate.ok) {
      expect(invalidCandidate.stage).toBe('candidate');
      expect(invalidCandidate.issues[0]?.sourceStage).toBe('model_validation');
    }
  });
});
