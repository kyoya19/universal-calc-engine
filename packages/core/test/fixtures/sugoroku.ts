import { DefinitionModel, stateIdFromProperties } from '../../src';

export function positionStateId(position: number): string {
  return stateIdFromProperties({ position });
}

export type LinearSugorokuFixtureStep = {
  from: number;
  to: number;
  probability: number;
  reward: number;
};

export type LinearSugorokuFixtureOptions = {
  startPosition: number;
  terminalPosition: number;
  steps: LinearSugorokuFixtureStep[];
};

export function buildLinearSugorokuFixture(options: LinearSugorokuFixtureOptions): DefinitionModel {
  const positions = new Set<number>([options.startPosition, options.terminalPosition]);
  for (const step of options.steps) {
    positions.add(step.from);
    positions.add(step.to);
  }

  const sortedPositions = [...positions].sort((left, right) => left - right);

  return {
    startState: positionStateId(options.startPosition),
    states: sortedPositions.map((position) => ({
      id: positionStateId(position),
      properties: { position },
      ...(position === options.terminalPosition
        ? { terminalCondition: { type: 'property_equals' as const, property: 'position', value: position } }
        : {})
    })),
    transitions: options.steps.map((step) => ({
      from: positionStateId(step.from),
      to: positionStateId(step.to),
      probability: step.probability,
      reward: step.reward,
      effects: [{ type: 'set_property', property: 'position', value: step.to }]
    }))
  };
}

export const representativeSugorokuExpectedRewardByState = {
  [positionStateId(0)]: 2.25,
  [positionStateId(1)]: 1.5,
  [positionStateId(2)]: 1,
  [positionStateId(3)]: 0
} as const;

export const representativeSugorokuStartExpectedReward = representativeSugorokuExpectedRewardByState[positionStateId(0)];

export const representativeSugorokuModel = buildLinearSugorokuFixture({
  startPosition: 0,
  terminalPosition: 3,
  steps: [
    { from: 0, to: 1, probability: 0.5, reward: 1 },
    { from: 0, to: 2, probability: 0.5, reward: 1 },
    { from: 1, to: 2, probability: 0.5, reward: 1 },
    { from: 1, to: 3, probability: 0.5, reward: 1 },
    { from: 2, to: 3, probability: 0.5, reward: 1 },
    { from: 2, to: 3, probability: 0.5, reward: 1 }
  ]
});
