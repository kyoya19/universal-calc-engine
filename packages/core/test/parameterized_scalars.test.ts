import { describe, expect, it } from 'vitest';
import {
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime,
  solveExpectedReward,
  solveReachabilityProbability
} from '../src/model';
import {
  ParameterizedDefinitionModel,
  ParameterizedRewardAxesDefinitionModel,
  resolveParameterValues,
  resolveParameterizedDefinitionModel,
  resolveParameterizedRewardAxesDefinitionModel,
  resolveParameterizedScalarSpec
} from '../src/parameterized_scalars';
import {
  evaluateRewardAxesModel,
  expandRewardAxesModel,
  solveExpectedRewardAxes
} from '../src/reward_axes';

describe('parameterized scalar resolution', () => {
  it('resolves parameter references and formulas before the existing forward pipeline', () => {
    const parameterized: ParameterizedDefinitionModel = {
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      parameters: [
        { id: 'hitRate', defaultValue: 0.25 },
        { id: 'payout', defaultValue: 100, unit: 'JPY' },
        { id: 'durationSeconds', defaultValue: 30, unit: 'seconds' }
      ],
      transitions: [
        {
          from: 'start',
          to: 'win',
          probability: { type: 'parameter_ref', parameter: 'hitRate' },
          reward: { type: 'parameter_ref', parameter: 'payout' },
          elapsedTime: {
            value: { type: 'parameter_ref', parameter: 'durationSeconds' },
            unit: 'seconds'
          }
        },
        {
          from: 'start',
          to: 'lose',
          probability: {
            type: 'formula',
            operator: 'subtract',
            left: 1,
            right: { type: 'parameter_ref', parameter: 'hitRate' }
          },
          elapsedTime: {
            value: { type: 'parameter_ref', parameter: 'durationSeconds' },
            unit: 'seconds'
          }
        }
      ]
    };

    const definition = resolveParameterizedDefinitionModel(parameterized, {
      hitRate: 0.4,
      payout: 200,
      durationSeconds: 45
    });
    const evaluated = evaluateModel(expandModel(definition));

    expect(solveExpectedReward(evaluated).expectedRewardByState.get('start')).toBe(80);
    expect(
      solveReachabilityProbability(evaluated, ['win']).reachabilityProbabilityByState.get('start')
    ).toBe(0.4);
    expect(
      solveExpectedElapsedTime(evaluated).expectedElapsedTimeSecondsByState.get('start')
    ).toBe(45);
  });

  it('lets parameter defaults reference other parameters and formulas', () => {
    const parameters = [
      { id: 'base', defaultValue: 10 },
      {
        id: 'doubleBase',
        defaultValue: {
          type: 'formula' as const,
          operator: 'multiply' as const,
          left: { type: 'parameter_ref' as const, parameter: 'base' },
          right: 2
        }
      }
    ];

    expect(resolveParameterValues(parameters)).toEqual({ base: 10, doubleBase: 20 });
    expect(
      resolveParameterizedScalarSpec(
        {
          type: 'formula',
          operator: 'add',
          left: { type: 'parameter_ref', parameter: 'doubleBase' },
          right: 5
        },
        parameters
      )
    ).toBe(25);
  });

  it('can resolve the same model repeatedly with different supplied values', () => {
    const parameterized: ParameterizedDefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      parameters: [{ id: 'reward', defaultValue: 10 }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          reward: { type: 'parameter_ref', parameter: 'reward' }
        }
      ]
    };

    const first = evaluateModel(expandModel(resolveParameterizedDefinitionModel(parameterized)));
    const second = evaluateModel(
      expandModel(resolveParameterizedDefinitionModel(parameterized, { reward: 75 }))
    );

    expect(solveExpectedReward(first).expectedRewardByState.get('start')).toBe(10);
    expect(solveExpectedReward(second).expectedRewardByState.get('start')).toBe(75);
  });

  it('resolves parameter references inside named reward axes without combining axes', () => {
    const parameterized: ParameterizedRewardAxesDefinitionModel = {
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      parameters: [
        { id: 'revenueValue', defaultValue: 1000 },
        { id: 'costValue', defaultValue: 250 }
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
          rewardsByAxis: {
            revenue: { type: 'parameter_ref', parameter: 'revenueValue' },
            cost: { type: 'parameter_ref', parameter: 'costValue' }
          }
        }
      ]
    };

    const definition = resolveParameterizedRewardAxesDefinitionModel(parameterized, {
      revenueValue: 1400,
      costValue: 300
    });
    const evaluated = evaluateRewardAxesModel(expandRewardAxesModel(definition));
    const solved = solveExpectedRewardAxes(evaluated);

    expect(solved.expectedRewardByAxisByState.get('revenue')?.get('start')).toBe(1400);
    expect(solved.expectedRewardByAxisByState.get('cost')?.get('start')).toBe(300);
  });

  it('rejects missing, unknown, circular, and non-finite parameter resolutions', () => {
    expect(() =>
      resolveParameterizedScalarSpec(
        { type: 'parameter_ref', parameter: 'missing' },
        [{ id: 'missing' }]
      )
    ).toThrow('Missing parameter value: missing');

    expect(() =>
      resolveParameterizedScalarSpec(
        { type: 'parameter_ref', parameter: 'unknown' },
        [{ id: 'known', defaultValue: 1 }]
      )
    ).toThrow('Unknown parameter reference: unknown');

    expect(() =>
      resolveParameterValues([
        { id: 'a', defaultValue: { type: 'parameter_ref', parameter: 'b' } },
        { id: 'b', defaultValue: { type: 'parameter_ref', parameter: 'a' } }
      ])
    ).toThrow('Circular parameter reference');

    expect(() =>
      resolveParameterizedScalarSpec(
        { type: 'formula', operator: 'divide', left: 1, right: 0 },
        []
      )
    ).toThrow('Formula divide must resolve to a finite number');
  });
});
