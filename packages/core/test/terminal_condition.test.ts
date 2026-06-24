import { describe, expect, test } from 'vitest';
import {
  evaluateTerminalCondition,
  getTerminalConditionKind,
  isTerminalState,
  serializeTerminalCondition,
  type TerminalCondition
} from '../src';

describe('TerminalCondition boundary', () => {
  test('keeps explicit terminal condition evaluation unchanged', () => {
    const condition: TerminalCondition = { type: 'explicit', value: true };

    expect(getTerminalConditionKind(condition)).toBe('explicit');
    expect(evaluateTerminalCondition(condition, undefined)).toBe(true);
    expect(serializeTerminalCondition(condition)).toEqual({ type: 'explicit', value: true });
  });

  test('keeps property_equals terminal condition evaluation unchanged', () => {
    const condition: TerminalCondition = {
      type: 'property_equals',
      property: 'position',
      value: 3
    };

    expect(getTerminalConditionKind(condition)).toBe('property_equals');
    expect(evaluateTerminalCondition(condition, { position: 3 })).toBe(true);
    expect(evaluateTerminalCondition(condition, { position: 2 })).toBe(false);
    expect(evaluateTerminalCondition(condition, undefined)).toBe(false);
    expect(serializeTerminalCondition(condition)).toEqual({
      type: 'property_equals',
      property: 'position',
      value: 3
    });
  });

  test('keeps terminal flag precedence unchanged', () => {
    expect(isTerminalState({
      id: 's0',
      terminal: false,
      terminalCondition: { type: 'explicit', value: true }
    })).toBe(false);

    expect(isTerminalState({
      id: 's1',
      terminal: true,
      terminalCondition: { type: 'explicit', value: false }
    })).toBe(true);
  });

  test('keeps state terminal condition fallback unchanged', () => {
    expect(isTerminalState({
      id: 's2',
      properties: { done: true },
      terminalCondition: { type: 'property_equals', property: 'done', value: true }
    })).toBe(true);

    expect(isTerminalState({ id: 's3' })).toBe(false);
  });
});
