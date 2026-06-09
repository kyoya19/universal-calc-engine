import { type DefinitionModel, stateIdFromProperties } from '../../src';

export function juoStateId(stage: string): string {
  return stateIdFromProperties({ machine: 'juo', stage });
}

export const juoPocAssumptions = [
  'This fixture is a machine-specific PoC stub only.',
  'State labels are placeholders until confirmed Juo inputs are available.',
  'Transition probabilities are placeholders and must not be treated as production values.',
  'Rewards are placeholders and must not be treated as production values.'
] as const;

export const juoPocUnknowns = [
  'Machine-specific state list',
  'Machine-specific terminal conditions',
  'Machine-specific transition graph',
  'Machine-specific probability values',
  'Machine-specific reward values',
  'Machine-specific validation rules',
  'Machine-specific expected report rows',
  'Machine-specific expected values'
] as const;

export const juoPocSeedModel: DefinitionModel = {
  startState: juoStateId('start'),
  states: [
    { id: juoStateId('start'), properties: { machine: 'juo', stage: 'start' } },
    { id: juoStateId('placeholder_terminal'), properties: { machine: 'juo', stage: 'placeholder_terminal' }, terminalCondition: { type: 'property_equals', property: 'stage', value: 'placeholder_terminal' } }
  ],
  transitions: [
    {
      from: juoStateId('start'),
      to: juoStateId('placeholder_terminal'),
      probability: 1,
      reward: 0,
      effects: [{ type: 'set_property', property: 'stage', value: 'placeholder_terminal' }]
    }
  ]
};
