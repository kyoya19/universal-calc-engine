import type { DefinitionModel } from '../src/model';

export const boundaryReportDefinitionModel: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start', properties: { step: 0 } },
    { id: 'state:{step=1}', terminal: true, properties: { step: 1 } }
  ],
  transitions: [
    {
      from: 'start',
      to: 'state:{step=1}',
      probability: 1,
      effects: [{ type: 'set_property', property: 'step', value: 1 }]
    }
  ]
};
