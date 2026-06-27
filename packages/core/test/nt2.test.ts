import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('nt2', () => {
  expect(f(0)).toBe('0');
});

it('formats a non-zero integer as plain text', () => {
  expect(f(42)).toBe('42');
});
