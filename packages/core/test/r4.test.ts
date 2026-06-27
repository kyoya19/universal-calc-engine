import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('r4', () => {
  expect(typeof f).toBe('function');
});

it('formats a negative integer as plain text', () => {
  expect(f(-7)).toBe('-7');
});
