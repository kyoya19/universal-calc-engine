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
