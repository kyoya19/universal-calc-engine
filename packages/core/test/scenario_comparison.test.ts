import { describe, expect, it } from 'vitest';
import { compareExternalModelScenarios } from '../src/scenario_comparison';

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
};

describe('scenario comparison', () => {
  it('compares two parameter sets on one model without claiming unique additive attribution', () => {
    const result = compareExternalModelScenarios(
      genericModel,
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

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'base') {
      return;
    }

    expect(result.comparisonKind).toBe('paired_scenario_difference');
    expect(result.contributionDeltaKind).toBe('difference_of_existing_contributions');
    expect(result.converged).toBe(true);
    expect(result.parameters.changedParameterIds).toEqual([
      'successProbability',
      'attemptMinutes'
    ]);
    expect(result.parameters.valuesByParameter.successProbability?.delta).toBeCloseTo(0.2);
    expect(result.parameters.valuesByParameter.successReward?.delta).toBe(0);
    expect(result.parameters.valuesByParameter.attemptMinutes?.delta).toBeCloseTo(-0.5);

    expect(result.delta.expectedReward).toBeCloseTo(40);
    expect(result.delta.expectedElapsedTimeSeconds).toBeCloseTo(-30);
    expect(result.delta.rewardPerHour).toBeCloseTo(2400);
    expect(result.delta.reachabilityProbabilityFromStart).toBeCloseTo(0.2);
    expect(
      result.contributionDelta.transitionContributionsByState.start?.[0]?.delta
    ).toBeCloseTo(40);
  });

  it('compares named reward axes and their existing contribution rows independently', () => {
    const result = compareExternalModelScenarios(
      {
        schemaVersion: 1,
        modelKind: 'reward_axes',
        model: {
          startState: 'start',
          states: [{ id: 'start' }, { id: 'done', terminal: true }],
          parameters: [
            { id: 'revenue', unit: 'JPY' },
            { id: 'cost', unit: 'JPY' }
          ],
          rewardAxes: [
            { id: 'revenue', unit: 'JPY', kind: 'benefit' },
            { id: 'cost', unit: 'JPY', kind: 'cost' }
          ],
          transitions: [
            {
              from: 'start',
              to: 'done',
              probability: 1,
              elapsedTime: { value: 1, unit: 'hours' },
              rewardsByAxis: {
                revenue: { type: 'parameter_ref', parameter: 'revenue' },
                cost: { type: 'parameter_ref', parameter: 'cost' }
              }
            }
          ]
        }
      },
      {
        baseline: { revenue: 1000, cost: 300 },
        candidate: { revenue: 1400, cost: 250 }
      }
    );

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'reward_axes') {
      return;
    }

    expect(result.rewardAxesDelta.expectedRewardByAxis).toEqual({
      revenue: 400,
      cost: -50
    });
    expect(
      result.rewardAxesContributionDelta.transitionContributionsByAxisByState.revenue
        ?.start?.[0]?.delta
    ).toBe(400);
    expect(
      result.rewardAxesContributionDelta.transitionContributionsByAxisByState.cost
        ?.start?.[0]?.delta
    ).toBe(-50);
  });

  it('identifies shared-input and candidate-resolution failures separately', () => {
    const sharedFailure = compareExternalModelScenarios(
      { schemaVersion: 2 },
      { baseline: {}, candidate: {} }
    );
    expect(sharedFailure.ok).toBe(false);
    if (!sharedFailure.ok) {
      expect(sharedFailure.stage).toBe('shared_input');
      expect(sharedFailure.issues[0]?.sourceStage).toBe('shape');
    }

    const candidateFailure = compareExternalModelScenarios(
      {
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [{ id: 'start' }, { id: 'done', terminal: true }],
          parameters: [{ id: 'payout' }],
          transitions: [
            {
              from: 'start',
              to: 'done',
              probability: 1,
              reward: { type: 'parameter_ref', parameter: 'payout' }
            }
          ]
        }
      },
      {
        baseline: { payout: 100 },
        candidate: {}
      }
    );

    expect(candidateFailure.ok).toBe(false);
    if (!candidateFailure.ok) {
      expect(candidateFailure.stage).toBe('candidate');
      expect(candidateFailure.issues[0]?.sourceStage).toBe('parameter_resolution');
    }
  });
});
