import { describe, expect, test } from 'vitest';
import { StateDefinition, TransitionDefinition } from '../src/model';
import {
  expandOneStateStep,
  expandStateSpace,
  generateNextStateCandidate,
  generateNextStateCandidates,
  stateIdFromProperties,
  uniqueStateCandidates
} from '../src/state_generation';

describe('state generation helpers', () => {
  test('creates stable state ids by sorting property keys', () => {
    const left = stateIdFromProperties({ position: 2, last_roll: 2 });
    const right = stateIdFromProperties({ last_roll: 2, position: 2 });

    expect(left).toBe('state:{last_roll=2,position=2}');
    expect(right).toBe(left);
  });

  test('creates stable state ids with mixed property value types', () => {
    const left = stateIdFromProperties({ active: true, label: 'start', position: 0 });
    const right = stateIdFromProperties({ position: 0, active: true, label: 'start' });

    expect(left).toBe('state:{active=true,label=start,position=0}');
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

  test('keeps one state candidate for each id and sorts by id', () => {
    const candidates = uniqueStateCandidates([
      { id: 'state:{position=2}', properties: { position: 2 } },
      { id: 'state:{position=1}', properties: { position: 1 } },
      { id: 'state:{position=2}', properties: { position: 2, label: 'duplicate' } }
    ]);

    expect(candidates).toEqual([
      { id: 'state:{position=1}', properties: { position: 1 } },
      { id: 'state:{position=2}', properties: { position: 2 } }
    ]);
  });

  test('generates unique next state candidates from multiple transitions', () => {
    const currentState: StateDefinition = {
      id: 'pos_0',
      properties: { position: 0 }
    };

    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'pos_1',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      },
      {
        from: 'pos_0',
        to: 'pos_2',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 2 }]
      },
      {
        from: 'pos_0',
        to: 'pos_2_alt',
        probability: 0,
        effects: [{ type: 'set_property', property: 'position', value: 2 }]
      }
    ];

    expect(generateNextStateCandidates(currentState, transitions)).toEqual([
      { id: 'state:{position=1}', properties: { position: 1 } },
      { id: 'state:{position=2}', properties: { position: 2 } }
    ]);
  });

  test('expands one state step using only outgoing transitions', () => {
    const state: StateDefinition = {
      id: 'pos_0',
      properties: { position: 0 }
    };

    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'pos_1',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      },
      {
        from: 'pos_0',
        to: 'pos_2',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 2 }]
      },
      {
        from: 'pos_1',
        to: 'pos_3',
        probability: 1,
        effects: [{ type: 'set_property', property: 'position', value: 3 }]
      }
    ];

    expect(expandOneStateStep(state, transitions)).toEqual([
      { id: 'state:{position=1}', properties: { position: 1 } },
      { id: 'state:{position=2}', properties: { position: 2 } }
    ]);
  });

  test('expands state space from seed states without using solver semantics', () => {
    const seedStates: StateDefinition[] = [{ id: 'pos_0', properties: { position: 0 } }];
    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'pos_1',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      },
      {
        from: 'pos_0',
        to: 'pos_2',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 2 }]
      },
      {
        from: 'other',
        to: 'ignored',
        probability: 1,
        effects: [{ type: 'set_property', property: 'position', value: 99 }]
      }
    ];

    const graph = expandStateSpace(seedStates, transitions);

    expect(graph.states.map((state) => state.id)).toEqual([
      'pos_0',
      'state:{position=1}',
      'state:{position=2}'
    ]);
    expect(graph.generatedStates.map((state) => state.id)).toEqual([
      'state:{position=1}',
      'state:{position=2}'
    ]);
    expect(graph.edges.map((edge) => ({ from: edge.from, explicitTo: edge.explicitTo, generatedTo: edge.generatedTo }))).toEqual([
      { from: 'pos_0', explicitTo: 'pos_1', generatedTo: 'state:{position=1}' },
      { from: 'pos_0', explicitTo: 'pos_2', generatedTo: 'state:{position=2}' }
    ]);
  });

  test('reports explicit/generated mismatches without rewriting explicit targets', () => {
    const seedStates: StateDefinition[] = [{ id: 'pos_0', properties: { position: 0 } }];
    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'legacy_pos_1',
        probability: 1,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      }
    ];

    const graph = expandStateSpace(seedStates, transitions);

    expect(graph.edges[0]).toMatchObject({
      from: 'pos_0',
      explicitTo: 'legacy_pos_1',
      generatedTo: 'state:{position=1}'
    });
    expect(graph.diagnostics).toEqual([
      expect.objectContaining({ type: 'explicit_generated_mismatch', stateId: 'pos_0' })
    ]);
  });

  test('deduplicates generated states and reports duplicates', () => {
    const seedStates: StateDefinition[] = [{ id: 'pos_0', properties: { position: 0 } }];
    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'pos_1_a',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      },
      {
        from: 'pos_0',
        to: 'pos_1_b',
        probability: 0.5,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      }
    ];

    const graph = expandStateSpace(seedStates, transitions);

    expect(graph.generatedStates.map((state) => state.id)).toEqual(['state:{position=1}']);
    expect(graph.diagnostics.some((diagnostic) => diagnostic.type === 'duplicate_state_ignored')).toBe(true);
  });

  test('stops breadth first expansion at a configured depth limit', () => {
    const seedStates: StateDefinition[] = [{ id: 'pos_0', properties: { position: 0 } }];
    const transitions: TransitionDefinition[] = [
      {
        from: 'pos_0',
        to: 'state:{position=1}',
        probability: 1,
        effects: [{ type: 'set_property', property: 'position', value: 1 }]
      },
      {
        from: 'state:{position=1}',
        to: 'state:{position=2}',
        probability: 1,
        effects: [{ type: 'set_property', property: 'position', value: 2 }]
      }
    ];

    const graph = expandStateSpace(seedStates, transitions, { maxDepth: 1 });

    expect(graph.states.map((state) => state.id)).toEqual(['pos_0', 'state:{position=1}']);
    expect(graph.edges).toHaveLength(1);
    expect(graph.diagnostics.some((diagnostic) => diagnostic.type === 'depth_limit_reached')).toBe(true);
  });
});
