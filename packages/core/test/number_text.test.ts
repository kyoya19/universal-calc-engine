import { describe, expect, test } from 'vitest';
import { formatNumberPlainText } from '../src';

describe('formatNumberPlainText', () => {
  test('keeps number text formatting on the public entrypoint boundary', () => {
    expect(formatNumberPlainText(12.5)).toBe('12.5');
    expect(formatNumberPlainText(Number.NaN)).toBe('NaN');
    expect(formatNumberPlainText(Number.POSITIVE_INFINITY)).toBe('Infinity');
    expect(formatNumberPlainText(Number.NEGATIVE_INFINITY)).toBe('-Infinity');
  });
});
