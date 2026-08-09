import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  ObservationDataset,
  parseObservationDatasetJson,
  validateObservationDataset
} from '../src/observations';

const model: DefinitionModel = {
  startState: 'start',
  states: [
    { id: 'start' },
    { id: 'win', terminal: true },
    { id: 'lose', terminal: true }
  ],
  transitions: [
    { from: 'start', to: 'win', probability: 0.4 },
    { from: 'start', to: 'lose', probability: 0.6 }
  ]
};

describe('observation input surface', () => {
  it('parses state counts, transition counts, and scalar metrics as observation data', () => {
    const parsed = parseObservationDatasetJson(
      JSON.stringify({
        schemaVersion: 1,
        observations: [
          { id: 'start-visits', type: 'state_count', state: 'start', count: 100 },
          {
            id: 'wins',
            type: 'transition_count',
            from: 'start',
            to: 'win',
            count: 40
          },
          {
            id: 'elapsed',
            type: 'scalar',
            metric: 'observed_elapsed_time',
            value: 3600,
            unit: 'seconds'
          }
        ]
      })
    );

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      throw new Error('Expected parsed observation dataset');
    }
    expect(validateObservationDataset(parsed.dataset, model)).toEqual({
      valid: true,
      issues: []
    });
  });

  it('keeps JSON syntax and shape failures separate from model-linked validation', () => {
    const syntax = parseObservationDatasetJson('{');
    expect(syntax.ok).toBe(false);
    if (syntax.ok) {
      throw new Error('Expected syntax failure');
    }
    expect(syntax.stage).toBe('json_syntax');
    expect(syntax.issues[0]?.code).toBe('invalid_json');

    const shape = parseObservationDatasetJson(
      JSON.stringify({
        schemaVersion: 1,
        observations: [{ id: 'x', type: 'unknown', value: 1 }]
      })
    );
    expect(shape.ok).toBe(false);
    if (shape.ok) {
      throw new Error('Expected shape failure');
    }
    expect(shape.stage).toBe('shape');
    expect(shape.issues[0]?.code).toBe('invalid_observation_type');
  });

  it('reports model-reference and count semantics without treating observations as parameters', () => {
    const dataset: ObservationDataset = {
      schemaVersion: 1,
      observations: [
        { id: 'bad-state', type: 'state_count', state: 'missing', count: 1.5 },
        {
          id: 'bad-transition',
          type: 'transition_count',
          from: 'win',
          to: 'start',
          count: -1
        },
        { id: 'metric', type: 'scalar', metric: '', value: 10, unit: '' },
        { id: 'metric', type: 'scalar', metric: 'duplicate', value: 20 }
      ]
    };

    const validation = validateObservationDataset(dataset, model);
    expect(validation.valid).toBe(false);
    expect(validation.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        'unknown_observation_state',
        'invalid_observation_count',
        'unknown_observation_transition',
        'empty_scalar_metric',
        'empty_scalar_unit',
        'duplicate_observation_id'
      ])
    );
  });
});
