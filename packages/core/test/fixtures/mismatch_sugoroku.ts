import { DefinitionModel } from '../../src';
import { positionStateId } from './sugoroku';

export const explicitGeneratedMismatchSugorokuModel: DefinitionModel = {
  startState: positionStateId(0),
  states: [
    { id: positionStateId(0), properties: { position: 0 } },
    { id: positionStateId(1), properties: { position: 1 }, terminal: true },
    { id: positionStateId(2), properties: { position: 2 }, terminal: true }
  ],
  transitions: [
    {
      from: positionStateId(0),
      to: positionStateId(1),
      probability: 1,
      reward: 7,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    }
  ]
};
