import { describe, expect, test } from 'vitest';
import { StateDefinition, TransitionDefinition } from '../src/model';
import { generateNextStateCandidate, stateIdFromProperties } from '../src/state_generation';

describe('state generation helpers', () => {
  test('creates stable state ids by sorting property keys', () => {
    const left = stateIdFromProperties({ position: 2, last_roll: 2 });
    const right = stateIdFromProperties({ last_roll: 2, position: 2 });

    expect(left).toBe('state:{last_roll=2,position=2}');
    expect(right).toBe(left);
  });

  test('generates next state candidates from transition effects', () => {
    const currentState: StateDefinition = {
      id: 'pos_0',
      properties: { position: 0, label: 'start' }
    };

    const transition: TransitionDefinition = {
      from: 'pos_0',
      to: 'pos_2',
      probability: 0.5,
      reward: 1,
      effects: [
        { type: 'set_property', property: 'position', value: 2 },
        { type: 'set_property', property: 'last_roll', value: 2 }
      ]
    };

    const candidate = generateNextStateCandidate(currentState, transition);

    expect(candidate).toEqual({
      id: 'state:{label=start,last_roll=2,position=2}',
      properties: { position: 2, label: 'start', last_roll: 2 }
    });
    expect(currentState.properties).toEqual({ position: 0, label: 'start' });
  });

  test('keeps candidate generation separate from explicit transition.to', () => {
    const currentState: StateDefinition = {
      id: 'pos_0',
      properties: { position: 0 }
    };

    const transition: TransitionDefinition = {
      from: 'pos_0',
      to: 'pos_1',
      probability: 1,
      effects: [{ type: 'set_property', property: 'position', value: 2 }]
    };

    const candidate = generateNextStateCandidate(currentState, transition);

    expect(transition.to).toBe('pos_1');
    expect(candidate.id).toBe('state:{position=2}');
  });
});
