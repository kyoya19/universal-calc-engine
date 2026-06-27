import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('n decimal', () => {
  expect(f(12.5)).toBe('12.5');
});

it('keeps the leading zero for a fractional decimal', () => {
  expect(f(0.5)).toBe('0.5');
});
