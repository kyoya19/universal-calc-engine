import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import { RewardAxesDefinitionModel } from '../src/reward_axes';
import {
  modelValidationResultToJson,
  validateDefinitionModel,
  validateRewardAxesDefinitionModel
} from '../src/validation';

describe('structured model validation', () => {
  it('returns machine-readable errors instead of requiring exception parsing', () => {
    const definition: DefinitionModel = {
      startState: 'missing',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 0.8,
          reward: Number.POSITIVE_INFINITY,
          elapsedTime: { value: -5, unit: 'seconds' }
        },
        {
          from: 'ghost',
          to: 'nowhere',
          probability: 1
        }
      ]
    };

    const result = validateDefinitionModel(definition);
    const codes = result.issues.map((issue) => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain('unknown_start_state');
    expect(codes).toContain('unknown_transition_from');
    expect(codes).toContain('unknown_transition_to');
    expect(codes).toContain('invalid_reward');
    expect(codes).toContain('invalid_elapsed_time');
    expect(codes).toContain('transition_probability_total');
    expect(result.errors.every((issue) => issue.severity === 'error')).toBe(true);
    expect(result.issues.find((issue) => issue.code === 'unknown_start_state')?.path).toBe(
      'startState'
    );
  });

  it('keeps non-fatal solver-semantic concerns as warnings', () => {
    const definition: DefinitionModel = {
      startState: 'done',
      states: [{ id: 'done', terminal: true }],
      transitions: [{ from: 'done', to: 'done', probability: 1 }]
    };

    const result = validateDefinitionModel(definition);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: 'terminal_state_has_transitions',
      severity: 'warning',
      path: 'states[id=done]'
    });
  });

  it('validates named reward-axis declarations and values with the same issue shape', () => {
    const definition: RewardAxesDefinitionModel = {
      startState: 'start',
      rewardAxes: [
        { id: 'cash', unit: '', kind: 'benefit' },
        { id: 'cash', unit: 'JPY', kind: 'cost' }
      ],
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          rewardsByAxis: {
            cash: Number.NaN,
            score: 10
          }
        }
      ]
    };

    const result = validateRewardAxesDefinitionModel(definition);
    const codes = result.issues.map((issue) => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain('empty_reward_axis_unit');
    expect(codes).toContain('duplicate_reward_axis_id');
    expect(codes).toContain('invalid_reward_axis_value');
    expect(codes).toContain('unknown_reward_axis');

    const parsed = JSON.parse(modelValidationResultToJson(result));
    expect(parsed.valid).toBe(false);
    expect(parsed.issues).toEqual(result.issues);
  });
});
