import { expect, test } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedReward,
  toContributionResult,
  toOutputResult
} from '../src';

const model: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start' },
    { id: 'win', terminal: true },
    { id: 'lose', terminal: true }
  ],
  transitions: [
    { from: 'start', to: 'win', probability: 0.25, reward: 10 },
    { from: 'start', to: 'lose', probability: 0.75, reward: 2 }
  ]
};

const effectModel: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start', properties: { step: 0 } },
    { id: 'explicit_win', terminal: true }
  ],
  transitions: [
    {
      from: 'start',
      to: 'explicit_win',
      probability: 1,
      reward: 7,
      effects: [{ type: 'set_property', property: 'step', value: 1 }]
    }
  ]
};

const omittedRewardModel: DefinitionModel = {
  startState: 'start',
  states: [{ id: 'start' }, { id: 'end', terminal: true }],
  transitions: [{ from: 'start', to: 'end', probability: 1 }]
};

test('serializes OutputResult as a public JSON boundary object', () => {
  const evaluated = evaluateModel(expandModel(model));
  const solved = solveExpectedReward(evaluated);
  const output = toOutputResult(model, solved);

  expect(JSON.parse(JSON.stringify(output))).toEqual({
    startState: 'start',
    expectedReward: 4,
    expectedRewardByState: {
      start: 4,
      win: 0,
      lose: 0
    }
  });
});

test('does not expose model internals in OutputResult JSON', () => {
  const evaluated = evaluateModel(expandModel(effectModel));
  const solved = solveExpectedReward(evaluated);
  const output = toOutputResult(effectModel, solved);
  const json = JSON.stringify(output);

  expect(JSON.parse(json)).toEqual({
    startState: 'start',
    expectedReward: 7,
    expectedRewardByState: {
      start: 7,
      explicit_win: 0
    }
  });
  expect(Object.keys(output).sort()).toEqual(['expectedReward', 'expectedRewardByState', 'startState']);
  expect(json).not.toContain('effects');
  expect(json).not.toContain('transitions');
  expect(json).not.toContain('stateById');
  expect(json).not.toContain('transitionsByState');
});

test('serializes ContributionResult with explicit public transition targets', () => {
  const evaluated = evaluateModel(expandModel(model));
  const solved = solveExpectedReward(evaluated);
  const contribution = toContributionResult(evaluated, solved);

  expect(JSON.parse(JSON.stringify(contribution))).toEqual({
    transitionContributionsByState: {
      start: [
        {
          to: 'win',
          probability: 0.25,
          reward: 10,
          downstreamExpectedReward: 0,
          contribution: 2.5
        },
        {
          to: 'lose',
          probability: 0.75,
          reward: 2,
          downstreamExpectedReward: 0,
          contribution: 1.5
        }
      ],
      win: [],
      lose: []
    }
  });
});

test('does not expose transition effects in ContributionResult JSON', () => {
  const evaluated = evaluateModel(expandModel(effectModel));
  const solved = solveExpectedReward(evaluated);
  const contribution = toContributionResult(evaluated, solved);

  expect(JSON.parse(JSON.stringify(contribution))).toEqual({
    transitionContributionsByState: {
      start: [
        {
          to: 'explicit_win',
          probability: 1,
          reward: 7,
          downstreamExpectedReward: 0,
          contribution: 7
        }
      ],
      explicit_win: []
    }
  });
  expect(JSON.stringify(contribution)).not.toContain('effects');
  expect(JSON.stringify(contribution)).not.toContain('from');
});

test('serializes omitted transition reward as zero in ContributionResult JSON', () => {
  const evaluated = evaluateModel(expandModel(omittedRewardModel));
  const solved = solveExpectedReward(evaluated);
  const contribution = toContributionResult(evaluated, solved);

  expect(JSON.parse(JSON.stringify(contribution))).toEqual({
    transitionContributionsByState: {
      start: [
        {
          to: 'end',
          probability: 1,
          reward: 0,
          downstreamExpectedReward: 0,
          contribution: 0
        }
      ],
      end: []
    }
  });
});
