import { describe, expect, it } from 'vitest';
import { evaluateModel, expandModel, solveExpectedReward } from '../src/model';
import {
  parseExternalModelDocumentJson,
  prepareExternalModelJson
} from '../src/external_input';
import {
  evaluateRewardAxesModel,
  expandRewardAxesModel,
  solveExpectedRewardAxes
} from '../src/reward_axes';

describe('external model input boundary', () => {
  it('parses, resolves, validates, and evaluates a parameterized base-model JSON document', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      modelKind: 'base',
      parameterValues: { hitRate: 0.4, payout: 200 },
      model: {
        startState: 'start',
        states: [
          { id: 'start' },
          { id: 'win', terminal: true },
          { id: 'lose', terminal: true }
        ],
        parameters: [
          { id: 'hitRate' },
          { id: 'payout' }
        ],
        transitions: [
          {
            from: 'start',
            to: 'win',
            probability: { type: 'parameter_ref', parameter: 'hitRate' },
            reward: { type: 'parameter_ref', parameter: 'payout' }
          },
          {
            from: 'start',
            to: 'lose',
            probability: {
              type: 'formula',
              operator: 'subtract',
              left: 1,
              right: { type: 'parameter_ref', parameter: 'hitRate' }
            }
          }
        ]
      }
    });

    const prepared = prepareExternalModelJson(json);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok || prepared.modelKind !== 'base') {
      throw new Error('Expected prepared base model');
    }

    expect(prepared.validation.valid).toBe(true);
    const evaluated = evaluateModel(expandModel(prepared.resolvedModel));
    expect(solveExpectedReward(evaluated).expectedRewardByState.get('start')).toBe(80);
  });

  it('supports named reward axes through the same external document boundary', () => {
    const json = JSON.stringify({
      schemaVersion: 1,
      modelKind: 'reward_axes',
      parameterValues: { revenue: 1000, cost: 250 },
      model: {
        startState: 'start',
        states: [{ id: 'start' }, { id: 'done', terminal: true }],
        parameters: [{ id: 'revenue' }, { id: 'cost' }],
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
              revenue: { type: 'parameter_ref', parameter: 'revenue' },
              cost: { type: 'parameter_ref', parameter: 'cost' }
            }
          }
        ]
      }
    });

    const prepared = prepareExternalModelJson(json);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok || prepared.modelKind !== 'reward_axes') {
      throw new Error('Expected prepared reward-axes model');
    }

    const evaluated = evaluateRewardAxesModel(expandRewardAxesModel(prepared.resolvedModel));
    const solved = solveExpectedRewardAxes(evaluated);
    expect(solved.expectedRewardByAxisByState.get('revenue')?.get('start')).toBe(1000);
    expect(solved.expectedRewardByAxisByState.get('cost')?.get('start')).toBe(250);
  });

  it('separates JSON syntax failures from shape failures', () => {
    const syntax = parseExternalModelDocumentJson('{');
    expect(syntax.ok).toBe(false);
    if (syntax.ok) {
      throw new Error('Expected JSON syntax failure');
    }
    expect(syntax.stage).toBe('json_syntax');
    expect(syntax.issues[0]?.code).toBe('invalid_json');

    const shape = prepareExternalModelJson(
      JSON.stringify({
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [{ id: 'start' }, { id: 'done', terminal: true }],
          parameters: [],
          transitions: [
            {
              from: 'start',
              to: 'done',
              probability: { type: 'formula', operator: 'pow', left: 1, right: 2 }
            }
          ]
        }
      })
    );

    expect(shape.ok).toBe(false);
    if (shape.ok) {
      throw new Error('Expected shape failure');
    }
    expect(shape.stage).toBe('shape');
    expect(shape.issues).toContainEqual(
      expect.objectContaining({
        stage: 'shape',
        code: 'invalid_formula_operator',
        path: '$.model.transitions[0].probability.operator'
      })
    );
  });

  it('separates parameter-resolution failures from model-validation failures', () => {
    const missingParameter = prepareExternalModelJson(
      JSON.stringify({
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [{ id: 'start' }, { id: 'done', terminal: true }],
          parameters: [{ id: 'p' }],
          transitions: [
            {
              from: 'start',
              to: 'done',
              probability: { type: 'parameter_ref', parameter: 'p' }
            }
          ]
        }
      })
    );

    expect(missingParameter.ok).toBe(false);
    if (missingParameter.ok) {
      throw new Error('Expected parameter-resolution failure');
    }
    expect(missingParameter.stage).toBe('parameter_resolution');
    expect(missingParameter.issues[0]?.code).toBe('parameter_resolution_failed');

    const invalidModel = prepareExternalModelJson(
      JSON.stringify({
        schemaVersion: 1,
        modelKind: 'base',
        model: {
          startState: 'start',
          states: [
            { id: 'start' },
            { id: 'a', terminal: true },
            { id: 'b', terminal: true }
          ],
          parameters: [],
          transitions: [
            { from: 'start', to: 'a', probability: 0.6 },
            { from: 'start', to: 'b', probability: 0.6 }
          ]
        }
      })
    );

    expect(invalidModel.ok).toBe(false);
    if (invalidModel.ok) {
      throw new Error('Expected model-validation failure');
    }
    expect(invalidModel.stage).toBe('model_validation');
    expect(invalidModel.issues).toContainEqual(
      expect.objectContaining({
        stage: 'model_validation',
        code: 'transition_probability_total',
        path: '$.model.states[id=start].transitions'
      })
    );
  });
});
