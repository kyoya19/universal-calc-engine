import { describe, expect, test } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandGraphFromModel,
  expandModel,
  selectGraphTarget,
  solveExpectedReward,
  toContributionResult,
  toOutputResult
} from '../src';
import { positionStateId } from './fixtures/sugoroku';

const explicitGeneratedMismatchModel: DefinitionModel = {
  startState: positionStateId(0),
  states: [
    { id: positionStateId(0), properties: { position: 0 } },
    {
      id: positionStateId(1),
      properties: { position: 1 },
      terminalCondition: { type: 'property_equals', property: 'position', value: 1 }
    },
    {
      id: positionStateId(2),
      properties: { position: 2 },
      terminalCondition: { type: 'property_equals', property: 'position', value: 2 }
    }
  ],
  transitions: [
    {
      from: positionStateId(0),
      to: positionStateId(1),
      probability: 1,
      reward: 10,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    }
  ]
};

describe('solver policy invariance', () => {
  test('keeps solver and contribution targets explicit when generated graph target differs', () => {
    const expanded = expandModel(explicitGeneratedMismatchModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(explicitGeneratedMismatchModel, solved);
    const contribution = toContributionResult(evaluated, solved);
    const graph = expandGraphFromModel(explicitGeneratedMismatchModel);
    const [edge] = graph.edges;

    expect(edge).toMatchObject({
      explicitTo: positionStateId(1),
      generatedTo: positionStateId(2)
    });
    expect(selectGraphTarget(edge!, 'diagnostics_only')).toBe(positionStateId(1));
    expect(output.expectedReward).toBe(10);
    expect(contribution.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 1,
        reward: 10,
        downstreamExpectedReward: 0,
        contribution: 10
      }
    ]);
  });
});
