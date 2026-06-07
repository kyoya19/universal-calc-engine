import { DefinitionModel, stateIdFromProperties } from '../../src';

export function positionStateId(position: number): string {
  return stateIdFromProperties({ position });
}

export const representativeSugorokuExpectedRewardByState = {
  [positionStateId(0)]: 2.25,
  [positionStateId(1)]: 1.5,
  [positionStateId(2)]: 1,
  [positionStateId(3)]: 0
} as const;

export const representativeSugorokuStartExpectedReward = representativeSugorokuExpectedRewardByState[positionStateId(0)];

export const representativeSugorokuModel: DefinitionModel = {
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
