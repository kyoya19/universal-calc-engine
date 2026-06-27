import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('nt', () => {
  expect(f(7)).toBe('7');
});

it('formats a three-digit integer as plain text', () => {
  expect(f(123)).toBe('123');
});
