import { describe, expect, it } from 'vitest';
import {
  evaluateExternalModelInput,
  evaluateExternalModelJson
} from '../src/forward_evaluation';

function genericScenario(parameterValues: Record<string, number>) {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    parameterValues,
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
}

describe('forward evaluation facade', () => {
  it('evaluates one external model repeatedly with different parameters across reward, reachability, time, rate, and contribution', () => {
    const baseline = evaluateExternalModelInput(
      genericScenario({
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      }),
      { reachabilityTargets: ['success'] }
    );
    const improved = evaluateExternalModelInput(
      genericScenario({
        successProbability: 0.6,
        successReward: 200,
        attemptMinutes: 1.5
      }),
      { reachabilityTargets: ['success'] }
    );

    expect(baseline.ok).toBe(true);
    expect(improved.ok).toBe(true);
    if (!baseline.ok || !improved.ok) {
      return;
    }

    expect(baseline.modelKind).toBe('base');
    expect(baseline.converged).toBe(true);
    expect(baseline.expectedReward.expectedReward).toBeCloseTo(80);
    expect(baseline.reachability?.probabilityFromStart).toBeCloseTo(0.4);
    expect(baseline.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(120);
    expect(baseline.rewardRate.rewardPerHour).toBeCloseTo(2400);
    expect(
      baseline.contribution.transitionContributionsByState.start?.[0]?.contribution
    ).toBeCloseTo(80);

    expect(improved.expectedReward.expectedReward).toBeCloseTo(120);
    expect(improved.reachability?.probabilityFromStart).toBeCloseTo(0.6);
    expect(improved.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(90);
    expect(improved.rewardRate.rewardPerHour).toBeCloseTo(4800);
    expect(improved.rewardRate.rateKind).toBe('ratio_of_expectations');
    expect(
      improved.contribution.transitionContributionsByState.start?.[0]?.contribution
    ).toBeCloseTo(120);
  });

  it('adds named reward-axis results and contributions without replacing legacy reward/time outputs', () => {
    const result = evaluateExternalModelInput({
      schemaVersion: 1,
      modelKind: 'reward_axes',
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'done', terminal: true }
        ],
        parameters: [],
        rewardAxes: [
          { id: 'revenue', label: 'Revenue', unit: 'JPY', kind: 'benefit' },
          { id: 'cost', label: 'Cost', unit: 'JPY', kind: 'cost' }
        ],
        transitions: [
          {
            from: 'start',
            to: 'done',
            probability: 1,
            reward: 5,
            elapsedTime: { value: 30, unit: 'minutes' },
            rewardsByAxis: { revenue: 1000, cost: 250 }
          }
        ]
      }
    });

    expect(result.ok).toBe(true);
    if (!result.ok || result.modelKind !== 'reward_axes') {
      return;
    }

    expect(result.expectedReward.expectedReward).toBe(5);
    expect(result.expectedElapsedTime.expectedElapsedTimeSeconds).toBe(1800);
    expect(result.rewardRate.rewardPerHour).toBe(10);
    expect(result.rewardAxes.expectedRewardByAxis).toEqual({ revenue: 1000, cost: 250 });
    expect(
      result.rewardAxesContribution.transitionContributionsByAxisByState.revenue?.start?.[0]
        ?.contribution
    ).toBe(1000);
    expect(result.diagnostics.rewardAxes?.revenue?.converged).toBe(true);
    expect(result.diagnostics.rewardAxes?.cost?.converged).toBe(true);
  });

  it('keeps input and facade-option failures machine-readable', () => {
    const syntaxFailure = evaluateExternalModelJson('{');
    expect(syntaxFailure.ok).toBe(false);
    if (!syntaxFailure.ok) {
      expect(syntaxFailure.stage).toBe('json_syntax');
    }

    const validationFailure = evaluateExternalModelInput({
      schemaVersion: 1,
      modelKind: 'base',
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [],
        transitions: [
          { from: 'start', to: 'done', probability: 0.5 }
        ]
      }
    });
    expect(validationFailure.ok).toBe(false);
    if (!validationFailure.ok) {
      expect(validationFailure.stage).toBe('model_validation');
      expect(validationFailure.issues.some((issue) => issue.code === 'transition_probability_total')).toBe(true);
    }

    const optionFailure = evaluateExternalModelInput(
      genericScenario({
        successProbability: 0.4,
        successReward: 200,
        attemptMinutes: 2
      }),
      { reachabilityTargets: ['missing'] }
    );
    expect(optionFailure.ok).toBe(false);
    if (!optionFailure.ok) {
      expect(optionFailure.stage).toBe('evaluation_options');
      expect(optionFailure.issues[0]?.code).toBe('unknown_reachability_target');
    }
  });

  it('returns explicit non-convergence diagnostics instead of hiding the last approximation', () => {
    const result = evaluateExternalModelInput(
      {
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'loop',
          states: [{ id: 'loop' }],
          parameters: [],
          transitions: [
            {
              from: 'loop',
              to: 'loop',
              probability: 1,
              reward: 1,
              elapsedTime: { value: 1, unit: 'seconds' }
            }
          ]
        }
      },
      { solver: { maxIterations: 3 } }
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.converged).toBe(false);
    expect(result.diagnostics.expectedReward.converged).toBe(false);
    expect(result.diagnostics.expectedReward.iterations).toBe(3);
    expect(result.diagnostics.expectedElapsedTime.converged).toBe(false);
    expect(result.expectedReward.expectedReward).toBe(3);
    expect(result.expectedElapsedTime.expectedElapsedTimeSeconds).toBe(3);
  });
});
