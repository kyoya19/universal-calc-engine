import { describe, expect, it } from 'vitest';
import {
  evaluateExternalModelInput,
  forwardEvaluationResultToJson
} from '../src/forward_evaluation';

describe('forward evaluation non-finite analytical boundary', () => {
  it('rejects overflow before JSON serialization can silently convert Infinity to null', () => {
    const result = evaluateExternalModelInput(
      {
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [
            { id: 'start' },
            { id: 'middle' },
            { id: 'done', terminal: true }
          ],
          parameters: [],
          transitions: [
            { from: 'start', to: 'middle', probability: 1, reward: 1e308 },
            { from: 'middle', to: 'done', probability: 1, reward: 1e308 }
          ]
        }
      },
      { solver: { maxIterations: 5 } }
    );

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe('evaluation');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.code).toBe('non_finite_analytical_result');
    expect(result.issues[0]?.path).toContain('expectedReward');

    const parsed = JSON.parse(forwardEvaluationResultToJson(result)) as {
      ok: boolean;
      stage: string;
      issues: Array<{ code: string }>;
    };
    expect(parsed.ok).toBe(false);
    expect(parsed.stage).toBe('evaluation');
    expect(parsed.issues[0]?.code).toBe('non_finite_analytical_result');
  });

  it('defensively refuses manually supplied non-finite result values', () => {
    const fabricated = {
      ok: true,
      modelKind: 'base',
      converged: false,
      validation: { valid: true, errors: [], warnings: [] },
      expectedReward: {
        startState: 'start',
        expectedReward: Infinity,
        expectedRewardByState: { start: Infinity }
      },
      expectedElapsedTime: {
        startState: 'start',
        expectedElapsedTimeSeconds: 0,
        expectedElapsedTimeSecondsByState: { start: 0 }
      },
      rewardRate: {
        startState: 'start',
        expectedReward: Infinity,
        expectedElapsedTimeSeconds: 0,
        rewardPerSecond: null,
        rewardPerHour: null,
        rateKind: 'ratio_of_expectations'
      },
      contribution: { transitionContributionsByState: { start: [] } },
      diagnostics: {
        expectedReward: {
          solverKind: 'expected_reward',
          converged: false,
          iterations: 1,
          maxIterations: 1,
          tolerance: 1e-12,
          lastMaxDelta: Infinity
        },
        expectedElapsedTime: {
          solverKind: 'expected_elapsed_time',
          converged: true,
          iterations: 1,
          maxIterations: 1,
          tolerance: 1e-12,
          lastMaxDelta: 0
        }
      }
    } as Parameters<typeof forwardEvaluationResultToJson>[0];

    expect(() => forwardEvaluationResultToJson(fabricated)).toThrow(/non-finite numeric value Infinity/);
  });
});
