import { expect, it } from 'vitest';
import { formatRowCountPlainText } from '../src/row_count_text';

it('formats row count', () => {
  expect(formatRowCountPlainText(3)).toBe('rows: 3');
});

it('formats zero row count', () => {
  expect(formatRowCountPlainText(0)).toBe('rows: 0');
});
