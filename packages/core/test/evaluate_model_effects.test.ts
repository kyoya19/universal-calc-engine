import { expect, test } from 'vitest';
import { DefinitionModel, evaluateModel, expandModel } from '../src/model';

const model: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start', properties: { position: 0 } },
    { id: 'explicit_target', properties: { position: 1 } }
  ],
  transitions: [
    {
      from: 'start',
      to: 'explicit_target',
      probability: { type: 'constant', value: 1 },
      reward: { type: 'constant', value: 3 },
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    }
  ]
};

test('keeps transition effects on evaluated transitions without rewriting targets', () => {
  const evaluated = evaluateModel(expandModel(model));

  expect(evaluated.transitions[0]).toEqual({
    from: 'start',
    to: 'explicit_target',
    probability: 1,
    reward: 3,
    effects: [{ type: 'set_property', property: 'position', value: 2 }]
  });
});
