import { expect, test } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedReward,
  toContributionResult,
  toOutputResult
} from '../src/model';

const model: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start', properties: { position: 0 } },
    { id: 'explicit_target', properties: { position: 1 } },
    { id: 'state:{position=2}', properties: { position: 2 } },
    { id: 'done', terminal: true }
  ],
  transitions: [
    {
      from: 'start',
      to: 'explicit_target',
      probability: 1,
      reward: 0,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    },
    { from: 'explicit_target', to: 'done', probability: 1, reward: 7 },
    { from: 'state:{position=2}', to: 'done', probability: 1, reward: 99 }
  ]
};

test('keeps solver targets explicit when effects generate a different candidate', () => {
  const evaluated = evaluateModel(expandModel(model));
  const solved = solveExpectedReward(evaluated);

  expect(toOutputResult(model, solved).expectedReward).toBe(7);
  expect(toContributionResult(evaluated, solved).transitionContributionsByState.start).toEqual([
    {
      to: 'explicit_target',
      probability: 1,
      reward: 0,
      downstreamExpectedReward: 7,
      contribution: 7
    }
  ]);
});
