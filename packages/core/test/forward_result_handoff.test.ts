import { describe, expect, it } from 'vitest';
import { evaluateExternalModelInput, evaluateExternalModelJson } from '../src/forward_evaluation';
import {
  formatForwardResultHandoffPlainText,
  forwardResultHandoffToJson,
  toForwardResultHandoff
} from '../src/forward_result_handoff';

function baseScenario() {
  return {
    schemaVersion: 1,
    modelKind: 'base',
    parameterValues: {
      successProbability: 0.6,
      rewardOnSuccess: 200,
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
        { id: 'rewardOnSuccess', unit: 'points' },
        { id: 'attemptMinutes', unit: 'minutes' }
      ],
      transitions: [
        {
          from: 'start',
          to: 'success',
          probability: { type: 'parameter_ref', parameter: 'successProbability' },
          reward: { type: 'parameter_ref', parameter: 'rewardOnSuccess' },
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
}

describe('forward result handoff', () => {
  it('creates a versioned third-party handoff from a checked base forward result', () => {
    const result = evaluateExternalModelInput(baseScenario(), {
      reachabilityTargets: ['success']
    });
    const handoff = toForwardResultHandoff(result);

    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.schemaVersion).toBe(1);
    expect(handoff.kind).toBe('forward_evaluation_handoff');
    expect(handoff.modelKind).toBe('base');
    expect(handoff.converged).toBe(true);
    expect(handoff.expectedReward.expectedReward).toBeCloseTo(120);
    expect(handoff.expectedElapsedTime.expectedElapsedTimeSeconds).toBeCloseTo(90);
    expect(handoff.rewardRate.rateKind).toBe('ratio_of_expectations');
    expect(handoff.rewardRate.rewardPerHour).toBeCloseTo(4800);
    expect(handoff.reachability?.probabilityFromStart).toBeCloseTo(0.6);
    expect(handoff.warnings).toEqual([]);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'reward_rate_is_ratio_of_expectations'
      )
    ).toBe(true);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'contribution_is_descriptive_not_causal_attribution'
      )
    ).toBe(true);
    expect(
      handoff.limitations.some(
        (limitation) => limitation.code === 'reachability_is_generic_not_domain_win_probability'
      )
    ).toBe(true);
  });

  it('preserves named reward axes without netting or unit conversion', () => {
    const result = evaluateExternalModelInput({
      schemaVersion: 1,
      modelKind: 'reward_axes',
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [],
        rewardAxes: [
          { id: 'revenue', unit: 'JPY', kind: 'benefit' },
          { id: 'cost', unit: 'JPY', kind: 'cost' }
        ],
        transitions: [
          {
            from: 'start',
            to: 'done',
            probability: 1,
            elapsedTime: { value: 30, unit: 'minutes' },
            rewardsByAxis: { revenue: 1000, cost: 250 }
          }
        ]
      }
    });
    const handoff = toForwardResultHandoff(result);

    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success' || handoff.modelKind !== 'reward_axes') {
      return;
    }

    expect(handoff.rewardAxes.expectedRewardByAxis).toEqual({ revenue: 1000, cost: 250 });
    expect(handoff.rewardAxes.rewardAxes.map((axis) => axis.id)).toEqual(['revenue', 'cost']);
    expect(handoff.diagnostics.rewardAxes?.revenue?.converged).toBe(true);
    expect(
      handoff.limitations.some(
        (limitation) =>
          limitation.code === 'named_reward_axes_not_implicitly_netted_or_converted'
      )
    ).toBe(true);
  });

  it('keeps non-convergence explicit and warns that values are last approximations', () => {
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
    const handoff = toForwardResultHandoff(result);

    expect(handoff.status).toBe('success');
    if (handoff.status !== 'success') {
      return;
    }

    expect(handoff.converged).toBe(false);
    expect(handoff.expectedReward.expectedReward).toBe(3);
    expect(handoff.expectedElapsedTime.expectedElapsedTimeSeconds).toBe(3);
    expect(handoff.diagnostics.expectedReward.converged).toBe(false);
    expect(
      handoff.warnings.some(
        (warning) => warning.code === 'one_or_more_solvers_did_not_converge'
      )
    ).toBe(true);
  });

  it('preserves checked forward failure stage and machine-readable issues', () => {
    const result = evaluateExternalModelJson('{');
    const handoff = toForwardResultHandoff(result);

    expect(handoff.status).toBe('failure');
    if (handoff.status !== 'failure') {
      return;
    }

    expect(handoff.schemaVersion).toBe(1);
    expect(handoff.stage).toBe('json_syntax');
    expect(handoff.issues[0]?.code).toBe('invalid_json');
    expect('expectedReward' in handoff).toBe(false);
  });

  it('serializes the handoff and provides a concise plain-text consumer view', () => {
    const result = evaluateExternalModelInput(baseScenario(), {
      reachabilityTargets: ['success']
    });
    const handoff = toForwardResultHandoff(result);
    const json = JSON.parse(forwardResultHandoffToJson(handoff)) as {
      schemaVersion: number;
      kind: string;
    };
    const text = formatForwardResultHandoffPlainText(handoff);

    expect(json.schemaVersion).toBe(1);
    expect(json.kind).toBe('forward_evaluation_handoff');
    expect(text).toContain('forward evaluation: success');
    expect(text).toContain('converged: true');
    expect(text).toContain('reward per hour: 4800');
  });
});
