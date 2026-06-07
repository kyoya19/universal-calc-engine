import { describe, expect, test } from 'vitest';
import {
  ContributionResult,
  DefinitionModel,
  contributionResultToTex,
  evaluateModel,
  expandGraphFromModel,
  expandModel,
  outputResultToTex,
  outputResultToValueFunctionTex,
  solveExpectedReward,
  stateIdFromProperties,
  summarizeStateGraph,
  toContributionResult,
  toOutputResult
} from '../src';

function positionStateId(position: number): string {
  return stateIdFromProperties({ position });
}

const representativeSugorokuModel: DefinitionModel = {
  startState: positionStateId(0),
  states: [
    { id: positionStateId(0), properties: { position: 0 } },
    { id: positionStateId(1), properties: { position: 1 } },
    { id: positionStateId(2), properties: { position: 2 } },
    {
      id: positionStateId(3),
      properties: { position: 3 },
      terminalCondition: { type: 'property_equals', property: 'position', value: 3 }
    }
  ],
  transitions: [
    {
      from: positionStateId(0),
      to: positionStateId(1),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 1 }]
    },
    {
      from: positionStateId(0),
      to: positionStateId(2),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    },
    {
      from: positionStateId(1),
      to: positionStateId(2),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    },
    {
      from: positionStateId(1),
      to: positionStateId(3),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 3 }]
    },
    {
      from: positionStateId(2),
      to: positionStateId(3),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 3 }]
    },
    {
      from: positionStateId(2),
      to: positionStateId(3),
      probability: 0.5,
      reward: 1,
      effects: [{ type: 'set_property', property: 'position', value: 3 }]
    }
  ]
};

describe('Sugoroku PoC v0.3 completion checklist', () => {
  test('keeps the representative explicit-only solver pipeline complete', () => {
    const expanded = expandModel(representativeSugorokuModel);
    const evaluated = evaluateModel(expanded);
    const solved = solveExpectedReward(evaluated);
    const output = toOutputResult(representativeSugorokuModel, solved);
    const contributions: ContributionResult = toContributionResult(evaluated, solved);
    const graph = expandGraphFromModel(representativeSugorokuModel);
    const summary = summarizeStateGraph(graph);

    expect(output.expectedReward).toBe(2.25);
    expect(output.expectedRewardByState[positionStateId(0)]).toBe(2.25);
    expect(output.expectedRewardByState[positionStateId(1)]).toBe(1.5);
    expect(output.expectedRewardByState[positionStateId(2)]).toBe(1);
    expect(output.expectedRewardByState[positionStateId(3)]).toBe(0);

    expect(contributions.transitionContributionsByState[positionStateId(0)]).toEqual([
      {
        to: positionStateId(1),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1.5,
        contribution: 1.25
      },
      {
        to: positionStateId(2),
        probability: 0.5,
        reward: 1,
        downstreamExpectedReward: 1,
        contribution: 1
      }
    ]);

    expect(outputResultToTex(output)).toContain('E[\\mathrm{state:\\{position=0\\}}] &= 2.25');
    expect(outputResultToValueFunctionTex(output)).toContain('V(\\mathrm{state:\\{position=0\\}}) &= 2.25');
    expect(contributionResultToTex(contributions)).toContain('\\text{from} & \\text{to} & p & r');

    expect(summary.stateCount).toBe(4);
    expect(summary.generatedStateCount).toBe(3);
    expect(summary.edgeCount).toBe(6);
    expect(summary.edgeWithGeneratedTargetCount).toBe(6);
    expect(summary.explicitGeneratedMatchCount).toBe(6);
    expect(summary.explicitGeneratedMismatchCount).toBe(0);
    expect(summary.diagnosticCountsByType.explicit_generated_mismatch).toBe(0);
  });
});
