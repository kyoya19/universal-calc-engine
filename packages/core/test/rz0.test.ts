import { expect, it } from 'vitest';
import { formatRowCountPlainText as f } from '../src/row_count_text';

it('rz0', () => {
  expect(f(0)).toBe('rows: 0');
});

it('formats a positive row count as plain text', () => {
  expect(f(12)).toBe('rows: 12');
});
