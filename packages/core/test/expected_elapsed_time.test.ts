import { describe, expect, it } from 'vitest';
import {
  DefinitionModel,
  evaluateModel,
  expandModel,
  solveExpectedElapsedTime
} from '../src/model';

function evaluateDefinitionModel(model: DefinitionModel) {
  return evaluateModel(expandModel(model));
}

describe('solveExpectedElapsedTime', () => {
  it('normalizes explicit time units to seconds before solving expected elapsed time', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'fast', terminal: true },
        { id: 'slow', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'fast',
          probability: 0.25,
          elapsedTime: { value: 500, unit: 'milliseconds' }
        },
        {
          from: 'start',
          to: 'slow',
          probability: 0.75,
          elapsedTime: { value: 2, unit: 'minutes' }
        }
      ]
    });

    const result = solveExpectedElapsedTime(model);

    expect(result.expectedElapsedTimeSecondsByState.get('start')).toBe(90.125);
    expect(result.expectedElapsedTimeSecondsByState.get('fast')).toBe(0);
    expect(result.expectedElapsedTimeSecondsByState.get('slow')).toBe(0);
  });

  it('includes downstream elapsed time across multiple transitions', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'mid' },
        { id: 'done', terminal: true },
        { id: 'fail', terminal: true }
      ],
      transitions: [
        {
          from: 'start',
          to: 'mid',
          probability: 1,
          elapsedTime: { value: { type: 'constant', value: 1 }, unit: 'minutes' }
        },
        {
          from: 'mid',
          to: 'done',
          probability: 0.5,
          elapsedTime: { value: 30, unit: 'seconds' }
        },
        {
          from: 'mid',
          to: 'fail',
          probability: 0.5,
          elapsedTime: { value: 1, unit: 'minutes' }
        }
      ]
    });

    const result = solveExpectedElapsedTime(model);

    expect(result.expectedElapsedTimeSecondsByState.get('mid')).toBe(45);
    expect(result.expectedElapsedTimeSecondsByState.get('start')).toBe(105);
  });

  it('supports hours as an input unit', () => {
    const model = evaluateDefinitionModel({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [
        {
          from: 'start',
          to: 'done',
          probability: 1,
          elapsedTime: { value: 2, unit: 'hours' }
        }
      ]
    });

    const result = solveExpectedElapsedTime(model);

    expect(result.expectedElapsedTimeSecondsByState.get('start')).toBe(7_200);
  });
});
