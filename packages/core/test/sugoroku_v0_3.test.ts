import { describe, expect, test } from 'vitest';
import {
  applyTransitionEffects,
  DefinitionModel,
  evaluateModel,
  expandModel,
  isTerminalState,
  StateDefinition,
  solveExpectedReward,
  toContributionResult,
  toOutputResult
} from '../src/model';

const dicePocModel: DefinitionModel = {
  startState: 'pos_0',
  states: [
    { id: 'pos_0', properties: { position: 0 } },
    { id: 'pos_1', properties: { position: 1 } },
    { id: 'pos_2', properties: { position: 2 } },
    { id: 'pos_3', terminal: true, properties: { position: 3 } }
  ],
  transitions: [
    { from: 'pos_0', to: 'pos_1', probability: 0.5, reward: 1 },
    { from: 'pos_0', to: 'pos_2', probability: 0.5, reward: 1 },
    { from: 'pos_1', to: 'pos_2', probability: 0.5, reward: 1 },
    { from: 'pos_1', to: 'pos_3', probability: 0.5, reward: 1 },
    { from: 'pos_2', to: 'pos_3', probability: 1.0, reward: 1 }
  ]
};

const terminalStateWithCondition: StateDefinition = {
  id: 'pos_3',
  terminalCondition: { type: 'property_equals', property: 'position', value: 3 },
  properties: { position: 3 }
};

const dicePocModelWithConstantSpecs: DefinitionModel = {
  startState: 'pos_0',
  states: [
    { id: 'pos_0', properties: { position: 0 } },
    { id: 'pos_1', properties: { position: 1 } },
    { id: 'pos_2', properties: { position: 2 } },
    terminalStateWithCondition
  ],
  transitions: [
    {
      from: 'pos_0',
      to: 'pos_1',
      probability: { type: 'constant', value: 0.5 },
      reward: { type: 'constant', value: 1 },
      effects: [
        { type: 'set_property', property: 'position', value: 1 },
        { type: 'set_property', property: 'last_roll', value: 1 }
      ]
    },
    {
      from: 'pos_0',
      to: 'pos_2',
      probability: { type: 'constant', value: 0.5 },
      reward: { type: 'constant', value: 1 },
      effects: [
        { type: 'set_property', property: 'position', value: 2 },
        { type: 'set_property', property: 'last_roll', value: 2 }
      ]
    },
    {
      from: 'pos_1',
      to: 'pos_2',
      probability: { type: 'constant', value: 0.5 },
      reward: { type: 'constant', value: 1 }
    },
    {
      from: 'pos_1',
      to: 'pos_3',
      probability: { type: 'constant', value: 0.5 },
      reward: { type: 'constant', value: 1 }
    },
    {
      from: 'pos_2',
      to: 'pos_3',
      probability: { type: 'constant', value: 1.0 },
      reward: { type: 'constant', value: 1 }
    }
  ]
};

describe('sugoroku/dice PoC v0.3', () => {
  test('passes DefinitionModel -> ExpandedModel -> EvaluatedModel -> SolvedModel -> OutputResult', () => {
    const expanded = expandModel(dicePocModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(dicePocModel, solved);

    expect(output.expectedRewardByState.pos_0).toBeCloseTo(2.25);
    expect(output.expectedRewardByState.pos_1).toBeCloseTo(1.5);
    expect(output.expectedRewardByState.pos_2).toBeCloseTo(1);
    expect(output.expectedRewardByState.pos_3).toBeCloseTo(0);
    expect(output.expectedReward).toBeCloseTo(2.25);
  });

  test('keeps ContributionResult separate from OutputResult', () => {
    const expanded = expandModel(dicePocModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const contribution = toContributionResult(evaluated, solved);

    expect(contribution.transitionContributionsByState.pos_0).toHaveLength(2);
    expect(contribution.transitionContributionsByState.pos_0?.[0]?.contribution).toBeCloseTo(1.25);
    expect(contribution.transitionContributionsByState.pos_0?.[1]?.contribution).toBeCloseTo(1.0);
  });

  test('supports constant ProbabilitySpec, RewardSpec, and TerminalCondition without changing the result', () => {
    const expanded = expandModel(dicePocModelWithConstantSpecs);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(dicePocModelWithConstantSpecs, solved);

    expect(isTerminalState(terminalStateWithCondition)).toBe(true);
    expect(output.expectedReward).toBeCloseTo(2.25);
    expect(output.expectedRewardByState.pos_0).toBeCloseTo(2.25);
    expect(output.expectedRewardByState.pos_1).toBeCloseTo(1.5);
    expect(output.expectedRewardByState.pos_2).toBeCloseTo(1);
    expect(output.expectedRewardByState.pos_3).toBeCloseTo(0);
  });

  test('applies multiple transition effects without mutating the original properties', () => {
    const currentProperties = { position: 0, label: 'start' };
    const nextProperties = applyTransitionEffects(currentProperties, [
      { type: 'set_property', property: 'position', value: 2 },
      { type: 'set_property', property: 'last_roll', value: 2 }
    ]);

    expect(currentProperties).toEqual({ position: 0, label: 'start' });
    expect(nextProperties).toEqual({ position: 2, label: 'start', last_roll: 2 });
  });

  test('keeps transition effects after evaluation', () => {
    const expanded = expandModel(dicePocModelWithConstantSpecs);
    const evaluated = evaluateModel(expanded);
    const transition = evaluated.transitionsByState.get('pos_0')?.[0];

    expect(transition?.effects).toEqual([
      { type: 'set_property', property: 'position', value: 1 },
      { type: 'set_property', property: 'last_roll', value: 1 }
    ]);
  });
});
